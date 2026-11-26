import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { obtenerTurnoAbiertoActivo } from "@/lib/caja-control";
import { MetodoPago, TipoMovimientoCartera, EstadoFactura, TipoProducto } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/clientes/[id]/cartera
 * Consulta consolidada del estado financiero de cartera, cupo y movimientos
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [{ id }, { documento: id }],
      },
      include: {
        movimientosCartera: {
          orderBy: { fecha: "desc" },
          take: 100,
          include: {
            factura: {
              select: {
                id: true,
                numeroFactura: true,
                totalFactura: true,
                saldoPendiente: true,
                tipoOperacion: true,
                fechaCreacion: true,
              },
            },
          },
        },
        facturas: {
          where: {
            saldoPendiente: { gt: 0 },
          },
          orderBy: { fechaCreacion: "asc" },
          select: {
            id: true,
            numeroFactura: true,
            fechaCreacion: true,
            totalFactura: true,
            totalAbonado: true,
            saldoPendiente: true,
            tipoOperacion: true,
            estado: true,
            esCredito: true,
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const saldoCartera = Math.round(
      cliente.facturas.reduce((acc, f) => acc + (f.saldoPendiente || 0), 0) * 100
    ) / 100;

    const cupoCredito = Math.max(0, cliente.cupoCredito || 0);
    const cupoDisponible = Math.max(0, Math.round((cupoCredito - saldoCartera) * 100) / 100);

    return NextResponse.json(
      {
        success: true,
        cartera: {
          clienteId: cliente.id,
          documento: cliente.documento,
          nombre: cliente.nombre,
          creditoHabilitado: Boolean(cliente.creditoHabilitado),
          cupoCredito,
          saldoCartera,
          cupoDisponible,
          diasCredito: cliente.diasCredito || 30,
          notasCredito: cliente.notasCredito,
          totalFacturasConSaldo: cliente.facturas.length,
        },
        facturasPendientes: cliente.facturas,
        movimientos: cliente.movimientosCartera,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al consultar cartera de cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar la cartera del cliente" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/clientes/[id]/cartera
 * Aperturar, ajustar cupo o modificar condiciones de crédito del cliente
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();

    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [{ id }, { documento: id }],
      },
      include: {
        facturas: {
          where: { saldoPendiente: { gt: 0 } },
          select: { saldoPendiente: true },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const creditoHabilitado = body.creditoHabilitado !== undefined ? Boolean(body.creditoHabilitado) : cliente.creditoHabilitado;
    const cupoCredito = body.cupoCredito !== undefined ? Math.max(0, Number(body.cupoCredito) || 0) : cliente.cupoCredito;
    const diasCredito = body.diasCredito !== undefined ? Math.max(1, Number(body.diasCredito) || 30) : cliente.diasCredito;
    const notasCredito = body.notasCredito !== undefined ? (body.notasCredito ? String(body.notasCredito).trim() : null) : cliente.notasCredito;
    const motivo = body.motivo ? String(body.motivo).trim() : null;

    const saldoCartera = Math.round(
      cliente.facturas.reduce((acc, f) => acc + (f.saldoPendiente || 0), 0) * 100
    ) / 100;

    const cajeroId = sesion?.userId || body.cajeroId || null;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Registrar movimiento de ajuste de cupo para auditoría financiera
      await tx.movimientoCartera.create({
        data: {
          clienteId: cliente.id,
          tipoMovimiento: TipoMovimientoCartera.AJUSTE_CUPO,
          monto: cupoCredito,
          saldoAnterior: saldoCartera,
          saldoNuevo: saldoCartera,
          usuarioCajeroId: cajeroId,
          descripcion:
            motivo ||
            (creditoHabilitado
              ? `Cupo fijado en $${cupoCredito.toLocaleString("es-CO")} (${diasCredito} días de plazo)`
              : "Línea de crédito suspendida o inhabilitada"),
        },
      });

      // 2. Actualizar cliente
      const actualizado = await tx.cliente.update({
        where: { id: cliente.id },
        data: {
          creditoHabilitado,
          cupoCredito,
          diasCredito,
          notasCredito,
        },
      });

      return actualizado;
    });

    return NextResponse.json({
      success: true,
      mensaje: "Condiciones de crédito y cupo de cartera actualizados exitosamente",
      cliente: resultado,
    });
  } catch (error: unknown) {
    console.error("Error al configurar cartera de cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al actualizar la cartera del cliente" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clientes/[id]/cartera
 * Registrar abono a cartera (amortiza facturas pendientes y libera cupo)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();

    const montoAbono = Math.max(0, Math.round((Number(body.monto) || 0) * 100) / 100);
    if (montoAbono <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto a abonar debe ser mayor a $0" },
        { status: 400 }
      );
    }

    let metodoPago: MetodoPago = MetodoPago.EFECTIVO;
    if (body.metodoPago && Object.values(MetodoPago).includes(body.metodoPago as MetodoPago)) {
      metodoPago = body.metodoPago as MetodoPago;
    }

    // 1. Obtener y validar cajero
    let cajeroId = sesion?.userId || body.cajeroId;
    let usuarioCajero = null;
    if (cajeroId) {
      usuarioCajero = await prisma.user.findFirst({
        where: { id: cajeroId, activo: true },
        select: { id: true, nombre: true },
      });
    }
    if (!usuarioCajero) {
      usuarioCajero = await prisma.user.findFirst({
        where: { activo: true },
        orderBy: { fechaCreacion: "asc" },
        select: { id: true, nombre: true },
      });
      if (!usuarioCajero) {
        return NextResponse.json(
          { success: false, error: "No hay cajero disponible para registrar el abono" },
          { status: 401 }
        );
      }
    }
    cajeroId = usuarioCajero.id;

    // 2. Control de Turno de Caja si entra dinero
    const turnoActivo = await obtenerTurnoAbiertoActivo(prisma, cajeroId, body.turnoCajaId);
    if (!turnoActivo) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe existir un turno de caja abierto para recibir abonos a cartera.",
          codigoSeguridad: "SIN_TURNO",
          requiereAperturaHoy: true,
        },
        { status: 409 }
      );
    }

    // 3. Obtener cliente y sus facturas con saldo pendiente
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [{ id }, { documento: id }],
      },
      include: {
        facturas: {
          where: {
            saldoPendiente: { gt: 0 },
          },
          orderBy: { fechaCreacion: "asc" },
          include: {
            detalles: {
              include: { producto: true },
            },
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const saldoCarteraAntes = Math.round(
      cliente.facturas.reduce((acc, f) => acc + (f.saldoPendiente || 0), 0) * 100
    ) / 100;

    if (saldoCarteraAntes <= 0) {
      return NextResponse.json(
        { success: false, error: "El cliente no tiene facturas con saldo pendiente por cobrar." },
        { status: 400 }
      );
    }

    const campoMetodoMap: Record<MetodoPago, string> = {
      [MetodoPago.EFECTIVO]: "totalEfectivo",
      [MetodoPago.NEQUI]: "totalNequi",
      [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
      [MetodoPago.LLAVE]: "totalLlave",
      [MetodoPago.DAVIPLATA]: "totalDaviplata",
      [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
      [MetodoPago.CONSIGNACION]: "totalConsignacion",
    };

    // 4. Distribuir el abono entre las facturas pendientes en cascada
    let remanentePorAplicar = montoAbono;
    const facturasImpactadas: Array<{ numeroFactura: string; montoAplicado: number }> = [];

    const resultado = await prisma.$transaction(async (tx) => {
      // Amortizar facturas en orden cronológico
      for (const fac of cliente.facturas) {
        if (remanentePorAplicar <= 0) break;

        const porCobrarFac = fac.saldoPendiente;
        const montoAplicadoAFactura = Math.min(porCobrarFac, remanentePorAplicar);

        // Crear registro en Abono
        await tx.abono.create({
          data: {
            facturaId: fac.id,
            cajeroId,
            turnoCajaId: turnoActivo.id,
            monto: montoAplicadoAFactura,
            metodoPago,
            montoRecibido: body.montoRecibido ? Number(body.montoRecibido) : null,
            vueltasEntregadas: body.vueltasEntregadas ? Number(body.vueltasEntregadas) : null,
            referenciaComprobante: body.referenciaComprobante?.trim() || null,
            notas: body.notas?.trim() || "Abono general a cartera de cliente",
          },
        });

        // Actualizar factura
        const nuevoTotalAbonado = Math.round((fac.totalAbonado + montoAplicadoAFactura) * 100) / 100;
        const nuevoSaldoPendiente = Math.max(0, Math.round((fac.saldoPendiente - montoAplicadoAFactura) * 100) / 100);

        let nuevoEstado: EstadoFactura = fac.estado;
        if (nuevoSaldoPendiente <= 0) {
          const tienePrendasAlquiler = fac.detalles.some(
            (d: any) => d.producto && d.producto.tipo === TipoProducto.ALQUILER
          );
          if (tienePrendasAlquiler && !fac.fechaDevolucionReal) {
            nuevoEstado = EstadoFactura.ACTIVA_ALQUILADA;
          } else {
            nuevoEstado = EstadoFactura.CERRADA;
          }
        }

        await tx.factura.update({
          where: { id: fac.id },
          data: {
            totalAbonado: nuevoTotalAbonado,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado,
          },
        });

        facturasImpactadas.push({
          numeroFactura: fac.numeroFactura,
          montoAplicado: montoAplicadoAFactura,
        });

        remanentePorAplicar = Math.round((remanentePorAplicar - montoAplicadoAFactura) * 100) / 100;
      }

      // Impactar turno de caja
      const campoAIncrementar = campoMetodoMap[metodoPago];
      if (campoAIncrementar) {
        await tx.turnoCaja.update({
          where: { id: turnoActivo.id },
          data: {
            [campoAIncrementar]: { increment: montoAbono },
            totalRecaudado: { increment: montoAbono },
          },
        });
      }

      // Registrar movimiento contable en MovimientoCartera
      const saldoCarteraDespues = Math.max(0, Math.round((saldoCarteraAntes - montoAbono) * 100) / 100);

      const resumenFacturas = facturasImpactadas
        .map((f) => `Fact. ${f.numeroFactura} ($${f.montoAplicado.toLocaleString("es-CO")})`)
        .join(", ");

      const movimiento = await tx.movimientoCartera.create({
        data: {
          clienteId: cliente.id,
          tipoMovimiento: TipoMovimientoCartera.ABONO_CUENTA,
          monto: montoAbono,
          saldoAnterior: saldoCarteraAntes,
          saldoNuevo: saldoCarteraDespues,
          metodoPago,
          referencia: body.referenciaComprobante?.trim() || null,
          descripcion: body.notas?.trim() || `Abono a cartera aplicado a: ${resumenFacturas}`,
          usuarioCajeroId: cajeroId,
        },
      });

      return {
        movimiento,
        saldoCarteraDespues,
        facturasImpactadas,
      };
    });

    return NextResponse.json({
      success: true,
      mensaje: `Abono de $${montoAbono.toLocaleString("es-CO")} registrado exitosamente a cartera`,
      resultado,
    });
  } catch (error: unknown) {
    console.error("Error al registrar abono a cartera:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el abono a cartera" },
      { status: 500 }
    );
  }
}
