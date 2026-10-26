import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { verificarEstadoCajaParaFacturacion, parsearCajerosParticipantes } from "@/lib/caja-control";
import { EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/facturas/[id]
 * Obtiene la información completa de una factura
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const factura = await prisma.factura.findFirst({
      where: {
        OR: [{ id }, { numeroFactura: id }],
      },
      include: {
        cliente: true,
        usuarioCajero: {
          select: {
            id: true,
            username: true,
            nombre: true,
            rol: true,
          },
        },
        detalles: {
          include: {
            producto: true,
          },
        },
        abonos: {
          include: {
            cajero: {
              select: {
                id: true,
                username: true,
                nombre: true,
              },
            },
          },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!factura) {
      return NextResponse.json(
        { success: false, error: "La factura solicitada no existe" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, factura });
  } catch (error: unknown) {
    console.error("Error al obtener detalle de factura:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar la factura" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/facturas/[id]
 * Registro de cobro, abonos, liquidación de moras y devolución de prendas
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();

    const {
      monto,
      metodoPago = MetodoPago.EFECTIVO,
      montoRecibido,
      vueltasEntregadas,
      cajeroId: cajeroIdBody,
      referenciaComprobante,
      notas,
      recargoMora = 0,
      confirmarDevolucionPrendas = false,
      estadoDeposito,
      montoRetenidoDeposito,
      montoDevueltoDeposito,
      motivoRetencionDeposito,
      estadoPrendasDevueltas,
      turnoCajaId,
    } = body;

    // 1. Validar el monto del abono o cobro de saldo
    const valorEntrada = monto !== undefined ? monto : (body.cobroSaldo !== undefined ? body.cobroSaldo : 0);
    const montoNumerico = Math.round(Number(valorEntrada) * 100) / 100;
    const recargoMoraNumerico = Math.max(0, Math.round(Number(recargoMora || 0) * 100) / 100);

    if (isNaN(montoNumerico) || montoNumerico < 0) {
      return NextResponse.json(
        { success: false, error: "El monto a registrar debe ser un valor numérico válido." },
        { status: 400 }
      );
    }

    // 2. Determinar y validar el cajero autenticado
    let cajeroId = sesion?.userId || cajeroIdBody;
    if (!cajeroId) {
      const adminPorDefecto = await prisma.user.findFirst({
        where: { activo: true },
        orderBy: { fechaCreacion: "asc" },
      });
      cajeroId = adminPorDefecto?.id;
    }

    if (!cajeroId) {
      return NextResponse.json(
        { success: false, error: "No se identificó un cajero activo para procesar el cobro" },
        { status: 401 }
      );
    }

    // Control de Caja: Si ingresa dinero, la caja no puede estar bloqueada o sin turno
    if (montoNumerico > 0) {
      const controlCaja = await verificarEstadoCajaParaFacturacion(prisma, cajeroId);
      if (controlCaja.bloqueadoParaFacturar) {
        return NextResponse.json(
          {
            success: false,
            error: controlCaja.motivoBloqueo,
            codigoSeguridad: controlCaja.estado,
            requiereCierreAnterior: controlCaja.estado === "BLOQUEADO_DIA_ANTERIOR",
            requiereAperturaHoy: controlCaja.estado === "SIN_TURNO",
            requiereDecisionModalidad: controlCaja.estado === "REQUIERE_DECISION_MODALIDAD",
            turnoAbierto: controlCaja.turnoAbierto,
            turnoParaCompartir: controlCaja.turnoParaCompartir,
          },
          { status: 409 }
        );
      }
    }

    // 3. Buscar factura existente
    const facturaExistente = await prisma.factura.findFirst({
      where: {
        OR: [{ id }, { numeroFactura: id }],
      },
      include: {
        detalles: {
          include: {
            producto: true,
          },
        },
        abonos: true,
      },
    });

    if (!facturaExistente) {
      return NextResponse.json(
        { success: false, error: "La factura a la cual se intenta cobrar no existe" },
        { status: 404 }
      );
    }

    // 4. Normalizar método de pago
    let metodo: MetodoPago = MetodoPago.EFECTIVO;
    if (Object.values(MetodoPago).includes(metodoPago as MetodoPago)) {
      metodo = metodoPago as MetodoPago;
    }

    // 5. Transacción atómica en base de datos SQLite
    const resultado = await prisma.$transaction(async (tx) => {
      // Buscar el turno de caja abierto asignado a este cajero
      const turnosAbiertos = await tx.turnoCaja.findMany({
        where: { estado: "ABIERTO" },
        orderBy: { fechaApertura: "desc" },
      });

      let turnoAbierto = null;
      if (turnoCajaId) {
        turnoAbierto = turnosAbiertos.find((t) => t.id === turnoCajaId) || null;
      }
      if (!turnoAbierto && turnosAbiertos.length > 0) {
        turnoAbierto =
          turnosAbiertos.find((t) => {
            if (t.usuarioCajeroId === cajeroId) return true;
            const participantes = parsearCajerosParticipantes(t.cajerosParticipantes);
            return participantes.some((p) => p.id === cajeroId);
          }) || turnosAbiertos[0];
      }

      let nuevoTotalFactura = facturaExistente.totalFactura;
      let nuevoRecargoMora = facturaExistente.recargoMoraAcumulado;

      // A. Si se está cobrando mora adicional, registrarla de forma persistente en los detalles y total
      if (recargoMoraNumerico > 0) {
        nuevoRecargoMora += recargoMoraNumerico;
        nuevoTotalFactura += recargoMoraNumerico;

        await tx.detalleFactura.create({
          data: {
            facturaId: facturaExistente.id,
            esServicioLibre: true,
            descripcionLibre: "Recargo por Mora - Retraso en devolución de alquiler",
            cantidad: 1,
            precioUnitario: recargoMoraNumerico,
            subtotal: recargoMoraNumerico,
          },
        });
      }

      // B. Crear registro de abono si el monto es mayor a 0
      let nuevoAbono = null;
      if (montoNumerico > 0) {
        nuevoAbono = await tx.abono.create({
          data: {
            facturaId: facturaExistente.id,
            cajeroId,
            turnoCajaId: turnoAbierto?.id || null,
            monto: montoNumerico,
            metodoPago: metodo,
            montoRecibido: montoRecibido ? Number(montoRecibido) : null,
            vueltasEntregadas: vueltasEntregadas ? Number(vueltasEntregadas) : null,
            referenciaComprobante: referenciaComprobante?.trim() || null,
            notas:
              notas?.trim() ||
              (recargoMoraNumerico > 0
                ? "Cobro de mora y liquidación de factura"
                : "Abono / Pago de factura"),
          },
        });

        // Impactar movimiento en el turno activo si existe
        if (turnoAbierto) {
          const campoMetodoMap: Record<MetodoPago, string> = {
            [MetodoPago.EFECTIVO]: "totalEfectivo",
            [MetodoPago.NEQUI]: "totalNequi",
            [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
            [MetodoPago.LLAVE]: "totalLlave",
            [MetodoPago.DAVIPLATA]: "totalDaviplata",
            [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
            [MetodoPago.CONSIGNACION]: "totalConsignacion",
          };

          const campoAIncrementar = campoMetodoMap[metodo];
          if (campoAIncrementar) {
            await tx.turnoCaja.update({
              where: { id: turnoAbierto.id },
              data: {
                [campoAIncrementar]: { increment: montoNumerico },
                totalRecaudado: { increment: montoNumerico },
              },
            });
          }
        }
      }

      // C. Liberar prendas alquiladas y liquidar depósito si aplica
      let fechaDevReal = facturaExistente.fechaDevolucionReal;
      let nuevoEstadoDeposito = facturaExistente.estadoDeposito;
      let nuevoMontoRetenido = facturaExistente.montoRetenidoDeposito;
      let nuevoMontoDevuelto = facturaExistente.montoDevueltoDeposito;
      let nuevoMotivoRetencion = facturaExistente.motivoRetencionDeposito;

      const procesarDevolucion = Boolean(confirmarDevolucionPrendas || estadoDeposito);

      if (procesarDevolucion) {
        if (!fechaDevReal) {
          fechaDevReal = new Date();
        }

        if (estadoDeposito === "DEVUELTO_COMPLETO") {
          nuevoEstadoDeposito = "DEVUELTO_COMPLETO";
          nuevoMontoDevuelto = facturaExistente.montoDeposito;
          nuevoMontoRetenido = 0;
          nuevoMotivoRetencion = null;
        } else if (estadoDeposito === "RETENIDO_PARCIAL") {
          nuevoEstadoDeposito = "RETENIDO_PARCIAL";
          const ret = Math.min(facturaExistente.montoDeposito, Math.max(0, Number(montoRetenidoDeposito) || 0));
          nuevoMontoRetenido = ret;
          nuevoMontoDevuelto = Math.max(0, facturaExistente.montoDeposito - ret);
          nuevoMotivoRetencion = motivoRetencionDeposito?.trim() || "Daño o pérdida parcial";
        } else if (estadoDeposito === "RETENIDO_TOTAL") {
          nuevoEstadoDeposito = "RETENIDO_TOTAL";
          nuevoMontoRetenido = facturaExistente.montoDeposito;
          nuevoMontoDevuelto = 0;
          nuevoMotivoRetencion = motivoRetencionDeposito?.trim() || "Daño total o pérdida definitiva";
        } else if (facturaExistente.montoDeposito === 0) {
          nuevoEstadoDeposito = "SIN_DEPOSITO";
        }

        // Si sufrieron daño o se eligió EN_ARREGLO, actualizar estado a EN_ARREGLO; de lo contrario DISPONIBLE
        const esDaniado =
          estadoPrendasDevueltas === "EN_ARREGLO" ||
          nuevoEstadoDeposito === "RETENIDO_PARCIAL" ||
          nuevoEstadoDeposito === "RETENIDO_TOTAL";
        const estadoDestino = esDaniado ? EstadoPrenda.EN_ARREGLO : EstadoPrenda.DISPONIBLE;

        const productosAlquilerIds = facturaExistente.detalles
          .filter((d) => d.productoId && (d.producto?.tipo === TipoProducto.ALQUILER || !d.esServicioLibre))
          .map((d) => d.productoId as string);

        if (productosAlquilerIds.length > 0) {
          await tx.producto.updateMany({
            where: { id: { in: productosAlquilerIds } },
            data: {
              estado: estadoDestino,
              estadoPrenda: estadoDestino,
            },
          });
        }
      }

      // D. Calcular acumulado total de abonos
      const abonosActualizados = await tx.abono.findMany({
        where: { facturaId: facturaExistente.id },
      });

      const nuevoTotalAbonado = Math.round(
        abonosActualizados.reduce((acc, curr) => acc + curr.monto, 0) * 100
      ) / 100;

      const nuevoSaldoPendiente = Math.max(
        0,
        Math.round((nuevoTotalFactura - nuevoTotalAbonado) * 100) / 100
      );

      // E. Evaluar nuevo estado de la factura
      const tienePrendasAlquiler = facturaExistente.detalles.some(
        (d) => d.producto && d.producto.tipo === TipoProducto.ALQUILER
      );

      let nuevoEstado: EstadoFactura = facturaExistente.estado;
      if (nuevoSaldoPendiente <= 0) {
        if (tienePrendasAlquiler && !fechaDevReal) {
          nuevoEstado = EstadoFactura.ACTIVA_ALQUILADA;
        } else {
          nuevoEstado = EstadoFactura.CERRADA;
        }
      } else if (nuevoEstado === EstadoFactura.CERRADA) {
        nuevoEstado = EstadoFactura.ACTIVA;
      }

      // F. Actualizar factura
      const facturaActualizada = await tx.factura.update({
        where: { id: facturaExistente.id },
        data: {
          totalFactura: nuevoTotalFactura,
          recargoMoraAcumulado: nuevoRecargoMora,
          totalAbonado: nuevoTotalAbonado,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
          fechaDevolucionReal: fechaDevReal,
          estadoDeposito: nuevoEstadoDeposito,
          montoRetenidoDeposito: nuevoMontoRetenido,
          montoDevueltoDeposito: nuevoMontoDevuelto,
          motivoRetencionDeposito: nuevoMotivoRetencion,
        },
        include: {
          cliente: true,
          usuarioCajero: {
            select: {
              id: true,
              username: true,
              nombre: true,
            },
          },
          detalles: {
            include: {
              producto: true,
            },
          },
          abonos: {
            include: {
              cajero: {
                select: {
                  id: true,
                  username: true,
                  nombre: true,
                },
              },
            },
            orderBy: { fecha: "desc" },
          },
        },
      });

      return { nuevoAbono, facturaActualizada };
    });

    return NextResponse.json({
      success: true,
      mensaje: `Transacción registrada correctamente. Saldo restante: $${resultado.facturaActualizada.saldoPendiente.toLocaleString("es-CO")}`,
      abono: resultado.nuevoAbono,
      factura: resultado.facturaActualizada,
    });
  } catch (error: unknown) {
    console.error("Error al registrar cobro/abono:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el cobro a la factura" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/facturas/[id]
 * Alias para liquidar o registrar abonos a una factura existente
 */
export async function PATCH(req: NextRequest, ctx: Params) {
  return POST(req, ctx);
}

/**
 * PUT /api/facturas/[id]
 * Actualización general de la factura
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { estado, notas } = body;

    const dataUpdate: Record<string, unknown> = {};
    if (estado && Object.values(EstadoFactura).includes(estado)) {
      dataUpdate.estado = estado;
    }
    if (notas !== undefined) {
      dataUpdate.notas = notas;
    }

    const facturaActualizada = await prisma.factura.update({
      where: { id },
      data: dataUpdate,
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
        abonos: { include: { cajero: true } },
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: "Factura actualizada correctamente",
      factura: facturaActualizada,
    });
  } catch (error: unknown) {
    console.error("Error al actualizar factura:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al actualizar la factura" },
      { status: 500 }
    );
  }
}
