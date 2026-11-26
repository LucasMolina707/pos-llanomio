import { NextRequest, NextResponse } from "next/server";
import { prisma, ejecutarTransaccionConReintentos } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import {
  verificarEstadoCajaParaFacturacion,
  parsearCajerosParticipantes,
  obtenerTurnoAbiertoActivo,
  calcularArqueoExactoTurno,
} from "@/lib/caja-control";
import { EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda, EstadoTurno, TipoOperacion, TipoMovimientoCartera } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ id: string }>;
}

export interface AbonoEnCursoInput {
  monto?: number | string;
  metodoPago?: string;
  referenciaPago?: string | null;
  referenciaComprobante?: string | null;
  observaciones?: string | null;
  notas?: string | null;
  concepto?: string | null;
  montoRecibido?: number | string | null;
  vueltasEntregadas?: number | string | null;
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
      itemsDevolucion,
      itemsDevueltos,
      estadoDeposito,
      montoRetenidoDeposito,
      montoDevueltoDeposito,
      motivoRetencionDeposito,
      estadoPrendasDevueltas,
      turnoCajaId,
    } = body;

    const listaItemsDevolucion = Array.isArray(itemsDevolucion)
      ? itemsDevolucion
      : (Array.isArray(itemsDevueltos) ? itemsDevueltos : null);

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

    // 2. Determinar y validar el cajero autenticado (Blindaje Anti-P2003)
    let cajeroId = sesion?.userId || cajeroIdBody;
    let usuarioCajero = null;

    if (cajeroId) {
      usuarioCajero = await prisma.user.findFirst({
        where: { id: cajeroId, activo: true },
        select: { id: true, nombre: true, username: true },
      });
    }

    if (!usuarioCajero) {
      usuarioCajero = await prisma.user.findFirst({
        where: { activo: true },
        orderBy: { fechaCreacion: "asc" },
        select: { id: true, nombre: true, username: true },
      });
    }

    if (!usuarioCajero) {
      return NextResponse.json(
        { success: false, error: "No se identificó un cajero activo para procesar el cobro" },
        { status: 401 }
      );
    }
    cajeroId = usuarioCajero.id;

    // =========================================================================
    // ACCIÓN ESPECIAL: CONVERSIÓN DE APARTADO / SEPARE A ALQUILER ACTIVO
    // =========================================================================
    if (body.accion === "CONVERTIR_APARTADO_A_ALQUILER") {
      const facturaPrevia = await prisma.factura.findFirst({
        where: { OR: [{ id }, { numeroFactura: id }] },
        include: {
          detalles: { include: { producto: true } },
          abonos: true,
          cliente: true,
        },
      });

      if (!facturaPrevia) {
        return NextResponse.json(
          { success: false, error: "El apartado a convertir no existe" },
          { status: 404 }
        );
      }

      // Preparar lista de abonos a crear (soporta pago único o mixto, con clasificación de rubro)
      const abonosConversion: Array<{
        monto: number;
        metodoPago: MetodoPago;
        tipoAbono: "ALQUILER" | "DEPOSITO_GARANTIA";
        montoRecibido?: number | null;
        vueltasEntregadas?: number | null;
        referenciaComprobante?: string | null;
        notas?: string | null;
      }> = [];

      const listaPagosConv = Array.isArray(body.pagos) && body.pagos.length > 0
        ? body.pagos
        : (Array.isArray(body.abonos) && body.abonos.length > 0 ? body.abonos : null);

      if (listaPagosConv) {
        for (const ab of listaPagosConv) {
          const m = Math.max(0, Math.round(Number(ab.monto || 0) * 100) / 100);
          if (m > 0) {
            let met: MetodoPago = MetodoPago.EFECTIVO;
            if (ab.metodoPago && Object.values(MetodoPago).includes(ab.metodoPago as MetodoPago)) {
              met = ab.metodoPago as MetodoPago;
            }
            const tipoAb = ab.tipoAbono === "DEPOSITO_GARANTIA" ? "DEPOSITO_GARANTIA" : "ALQUILER";
            abonosConversion.push({
              monto: m,
              metodoPago: met,
              tipoAbono: tipoAb,
              montoRecibido: ab.montoRecibido ? Number(ab.montoRecibido) : null,
              vueltasEntregadas: ab.vueltasEntregadas ? Number(ab.vueltasEntregadas) : null,
              referenciaComprobante: ab.referenciaComprobante?.trim() || null,
              notas: ab.notas?.trim() || (tipoAb === "DEPOSITO_GARANTIA" ? "Depósito en custodia al retirar prendas" : "Pago de saldo al retirar prendas del apartado"),
            });
          }
        }
      } else {
        // Soporte para pagos separados por concepto
        const abonoAlq = Math.max(0, Math.round(Number(body.abonoAlquiler !== undefined ? body.abonoAlquiler : (body.monto !== undefined ? body.monto : (body.nuevoAbono !== undefined ? body.nuevoAbono : 0))) * 100) / 100);
        const abonoDep = Math.max(0, Math.round(Number(body.abonoDeposito !== undefined ? body.abonoDeposito : (body.depositoAbonadoHoy !== undefined ? body.depositoAbonadoHoy : 0)) * 100) / 100);

        if (abonoAlq > 0) {
          let metAlq: MetodoPago = MetodoPago.EFECTIVO;
          if (body.metodoPagoAlquiler && Object.values(MetodoPago).includes(body.metodoPagoAlquiler as MetodoPago)) {
            metAlq = body.metodoPagoAlquiler as MetodoPago;
          } else if (body.metodoPago && Object.values(MetodoPago).includes(body.metodoPago as MetodoPago)) {
            metAlq = body.metodoPago as MetodoPago;
          }
          abonosConversion.push({
            monto: abonoAlq,
            metodoPago: metAlq,
            tipoAbono: "ALQUILER",
            montoRecibido: body.montoRecibido ? Number(body.montoRecibido) : null,
            vueltasEntregadas: body.vueltasEntregadas ? Number(body.vueltasEntregadas) : null,
            referenciaComprobante: body.referenciaComprobante?.trim() || null,
            notas: body.notas?.trim() || "Pago de saldo al retirar prendas del apartado",
          });
        }

        if (abonoDep > 0) {
          let metDep: MetodoPago = MetodoPago.EFECTIVO;
          if (body.metodoPagoDeposito && Object.values(MetodoPago).includes(body.metodoPagoDeposito as MetodoPago)) {
            metDep = body.metodoPagoDeposito as MetodoPago;
          }
          abonosConversion.push({
            monto: abonoDep,
            metodoPago: metDep,
            tipoAbono: "DEPOSITO_GARANTIA",
            montoRecibido: body.montoRecibidoDeposito ? Number(body.montoRecibidoDeposito) : null,
            vueltasEntregadas: body.vueltasDeposito ? Number(body.vueltasDeposito) : null,
            referenciaComprobante: body.referenciaDeposito?.trim() || null,
            notas: "Depósito en custodia al retirar prendas del apartado",
          });
        }
      }

      const totalDineroEntregado = abonosConversion.reduce((acc, a) => acc + a.monto, 0);

      // Control de caja si se recibe dinero en la entrega
      if (totalDineroEntregado > 0) {
        const turnoActivo = await obtenerTurnoAbiertoActivo(prisma, cajeroId, body.turnoCajaId || turnoCajaId);
        if (!turnoActivo) {
          return NextResponse.json(
            {
              success: false,
              error: "No existe un turno de caja iniciado para registrar el pago del saldo. Abra la caja antes de registrar cobros.",
              codigoSeguridad: "SIN_TURNO",
            },
            { status: 409 }
          );
        }
      }

      const resultadoConversion = await ejecutarTransaccionConReintentos(prisma, async (tx) => {
        // 1. Obtener turno abierto para el nuevo abono
        const turnosAbiertos = await tx.turnoCaja.findMany({
          where: { estado: "ABIERTO" },
          orderBy: { fechaApertura: "desc" },
        });

        let turnoAbierto = null;
        if (turnoCajaId) {
          turnoAbierto = turnosAbiertos.find((t) => t.id === turnoCajaId) || null;
        }
        if (!turnoAbierto && turnosAbiertos.length > 0) {
          turnoAbierto = turnosAbiertos.find((t) => {
            if (t.usuarioCajeroId === cajeroId) return true;
            const participantes = parsearCajerosParticipantes(t.cajerosParticipantes);
            return participantes.some((p) => p.id === cajeroId);
          }) || turnosAbiertos[0];
        }

        // 2. Si hay abonos, registrarlos e impactar caja
        let primerAbono = null;
        const campoMetodoMap: Record<MetodoPago, string> = {
          [MetodoPago.EFECTIVO]: "totalEfectivo",
          [MetodoPago.NEQUI]: "totalNequi",
          [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
          [MetodoPago.LLAVE]: "totalLlave",
          [MetodoPago.DAVIPLATA]: "totalDaviplata",
          [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
          [MetodoPago.CONSIGNACION]: "totalConsignacion",
        };

        for (const ab of abonosConversion) {
          const abCreado = await tx.abono.create({
            data: {
              facturaId: facturaPrevia.id,
              cajeroId,
              turnoCajaId: turnoAbierto?.id || null,
              monto: ab.monto,
              metodoPago: ab.metodoPago,
              montoRecibido: ab.montoRecibido,
              vueltasEntregadas: ab.vueltasEntregadas,
              referenciaComprobante: ab.referenciaComprobante,
              notas: ab.notas,
              tipoAbono: ab.tipoAbono,
            },
          });
          if (!primerAbono) primerAbono = abCreado;

          if (turnoAbierto) {
            const campo = campoMetodoMap[ab.metodoPago];
            if (campo) {
              await tx.turnoCaja.update({
                where: { id: turnoAbierto.id },
                data: {
                  [campo]: { increment: ab.monto },
                  totalRecaudado: { increment: ab.monto },
                },
              });
            }
          }
        }

        // 3. Si se enviaron detalles re-vinculados (por ejemplo asignando prendas físicas del inventario)
        if (Array.isArray(body.detalles) && body.detalles.length > 0) {
          // Liberar previamente a DISPONIBLE las prendas asignadas al apartado original para evitar prendas huérfanas
          for (const detViejo of facturaPrevia.detalles) {
            if (detViejo.productoId) {
              try {
                await tx.producto.update({
                  where: { id: detViejo.productoId },
                  data: { estado: EstadoPrenda.DISPONIBLE, estadoPrenda: EstadoPrenda.DISPONIBLE },
                });
              } catch { }
            }
          }

          await tx.detalleFactura.deleteMany({ where: { facturaId: facturaPrevia.id } });
          for (const item of body.detalles) {
            const cant = Math.max(1, Math.round(Number(item.cantidad) || 1));
            const pUnit = Math.max(0, Number(item.precioUnitario) || 0);
            await tx.detalleFactura.create({
              data: {
                facturaId: facturaPrevia.id,
                productoId: item.productoId || null,
                esServicioLibre: !item.productoId || Boolean(item.esServicioLibre),
                descripcionLibre: item.descripcionLibre || item.nombre || "Prenda de alquiler",
                descripcionDetallada: item.descripcionDetallada ? String(item.descripcionDetallada).trim() : null,
                cantidad: cant,
                precioUnitario: pUnit,
                subtotal: Math.round(cant * pUnit * 100) / 100,
              },
            });
          }
        }

        // 4. Calcular nuevos totales y saldos desacoplados (Alquiler vs Depósito en Custodia)
        const abonosAlquilerPrevios = await tx.abono.findMany({
          where: {
            facturaId: facturaPrevia.id,
            tipoAbono: { not: "DEPOSITO_GARANTIA" },
          },
          select: { monto: true },
        });
        const nuevoTotalAbonadoAlquiler = Math.round(
          abonosAlquilerPrevios.reduce((acc, curr) => acc + curr.monto, 0) * 100
        ) / 100;
        const nuevoSaldoAlquiler = Math.max(0, Math.round((facturaPrevia.totalFactura - nuevoTotalAbonadoAlquiler) * 100) / 100);

        const abonosDepositoPrevios = await tx.abono.findMany({
          where: {
            facturaId: facturaPrevia.id,
            tipoAbono: "DEPOSITO_GARANTIA",
          },
          select: { monto: true },
        });
        const montoDep = body.montoDeposito !== undefined ? Math.max(0, Number(body.montoDeposito) || 0) : facturaPrevia.montoDeposito;
        const nuevoDepositoAbonado = Math.round(
          abonosDepositoPrevios.reduce((acc, curr) => acc + curr.monto, 0) * 100
        ) / 100;
        const nuevoSaldoDeposito = Math.max(0, Math.round((montoDep - nuevoDepositoAbonado) * 100) / 100);

        // 5. Marcar en inventario como ALQUILADO las prendas asignadas
        const detallesFinales = await tx.detalleFactura.findMany({
          where: { facturaId: facturaPrevia.id },
          include: { producto: true },
        });

        for (const det of detallesFinales) {
          if (det.productoId && det.producto?.tipo === TipoProducto.ALQUILER) {
            try {
              await tx.producto.update({
                where: { id: det.productoId },
                data: { estado: "ALQUILADO", estadoPrenda: "ALQUILADO" },
              });
            } catch { }
          }
        }

        // 6. Fechas y Depósito
        const fechaEntrega = body.fechaEntregaAlquiler ? new Date(body.fechaEntregaAlquiler) : new Date();
        const fechaDevolucion = body.fechaDevolucionPactada
          ? new Date(body.fechaDevolucionPactada)
          : (facturaPrevia.fechaDevolucionEstimada || new Date(Date.now() + 3 * 86400000));

        const estadoDep = montoDep > 0 ? (nuevoSaldoDeposito === 0 ? "RECIBIDO_EN_GARANTIA" : "ABONADO_PARCIAL") : "SIN_DEPOSITO";

        const efRec = body.efectivoRecibido !== undefined
          ? Math.max(0, Number(body.efectivoRecibido) || 0)
          : (body.montoRecibido !== undefined ? Math.max(0, Number(body.montoRecibido) || 0) : undefined);
        const camEnt = body.cambioEntregado !== undefined
          ? Math.max(0, Number(body.cambioEntregado) || 0)
          : (body.vueltasEntregadas !== undefined
              ? Math.max(0, Number(body.vueltasEntregadas) || 0)
              : (body.vueltasCambioFinal !== undefined ? Math.max(0, Number(body.vueltasCambioFinal) || 0) : undefined));

        // 7. Actualizar factura a ALQUILER y ACTIVA_ALQUILADA
        const facturaConvertida = await tx.factura.update({
          where: { id: facturaPrevia.id },
          data: {
            tipoOperacion: TipoOperacion.ALQUILER,
            estado: EstadoFactura.ACTIVA_ALQUILADA,
            turnoCajaId: turnoAbierto?.id || facturaPrevia.turnoCajaId || null,
            totalAbonado: nuevoTotalAbonadoAlquiler,
            saldoPendiente: nuevoSaldoAlquiler,
            esCredito: nuevoSaldoAlquiler > 0,
            montoDeposito: montoDep,
            depositoAbonado: nuevoDepositoAbonado,
            saldoDeposito: nuevoSaldoDeposito,
            tarifaMoraDiaria: body.tarifaMoraDiaria !== undefined ? Number(body.tarifaMoraDiaria) : (facturaPrevia.tarifaMoraDiaria || 3000),
            fechaEntregaAlquiler: fechaEntrega,
            fechaDevolucionPactada: fechaDevolucion,
            estadoDeposito: estadoDep,
            metodoPagoDeposito: montoDep > 0 ? (facturaPrevia.metodoPagoDeposito || "EFECTIVO") : null,
            efectivoRecibido: efRec !== undefined ? efRec : facturaPrevia.efectivoRecibido,
            cambioEntregado: camEnt !== undefined ? camEnt : facturaPrevia.cambioEntregado,
            observaciones: body.observaciones !== undefined ? body.observaciones : facturaPrevia.observaciones,
            notas: body.notas !== undefined ? body.notas : facturaPrevia.notas,
          },
          include: {
            cliente: true,
            usuarioCajero: {
              select: { id: true, username: true, nombre: true, rol: true },
            },
            detalles: { include: { producto: true } },
            abonos: {
              include: { cajero: { select: { id: true, username: true, nombre: true } } },
              orderBy: { fecha: "desc" },
            },
          },
        });

        return { facturaConvertida, nuevoAbono: primerAbono };
      });

      return NextResponse.json({
        success: true,
        ok: true,
        id: resultadoConversion.facturaConvertida.id,
        mensaje: `Apartado N° ${resultadoConversion.facturaConvertida.numeroFactura} convertido en Alquiler Activo exitosamente.`,
        factura: resultadoConversion.facturaConvertida,
        abono: resultadoConversion.nuevoAbono,
      });
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
        cliente: true,
      },
    });

    if (!facturaExistente) {
      return NextResponse.json(
        { success: false, error: "La factura a la cual se intenta cobrar no existe" },
        { status: 404 }
      );
    }

    // 4. Normalizar método de pago y preparar lista de abonos (único o mixto)
    let metodo: MetodoPago = MetodoPago.EFECTIVO;
    if (Object.values(MetodoPago).includes(metodoPago as MetodoPago)) {
      metodo = metodoPago as MetodoPago;
    }

    const abonosCobro: Array<{
      monto: number;
      metodoPago: MetodoPago;
      tipoAbono: string;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      referenciaComprobante?: string | null;
      notas?: string | null;
    }> = [];

    const listaPagosCobro = Array.isArray(body.pagos) && body.pagos.length > 0
      ? body.pagos
      : (Array.isArray(body.abonos) && body.abonos.length > 0 ? body.abonos : null);

    if (listaPagosCobro) {
      for (const ab of listaPagosCobro) {
        const m = Math.max(0, Math.round(Number(ab.monto || 0) * 100) / 100);
        if (m > 0) {
          let met: MetodoPago = MetodoPago.EFECTIVO;
          if (ab.metodoPago && Object.values(MetodoPago).includes(ab.metodoPago as MetodoPago)) {
            met = ab.metodoPago as MetodoPago;
          }
          const tipoAb = ab.tipoAbono === "DEPOSITO_GARANTIA" || body.tipoAbono === "DEPOSITO_GARANTIA"
            ? "DEPOSITO_GARANTIA"
            : "ALQUILER";
          abonosCobro.push({
            monto: m,
            metodoPago: met,
            tipoAbono: tipoAb,
            montoRecibido: ab.montoRecibido ? Number(ab.montoRecibido) : null,
            vueltasEntregadas: ab.vueltasEntregadas ? Number(ab.vueltasEntregadas) : null,
            referenciaComprobante: ab.referenciaComprobante?.trim() || null,
            notas: ab.notas?.trim() || (tipoAb === "DEPOSITO_GARANTIA" ? "Recaudo de Depósito en Custodia" : "Abono / Pago de factura"),
          });
        }
      }
    } else if (montoNumerico > 0) {
      const tipoAb = body.tipoAbono === "DEPOSITO_GARANTIA" || body.esAbonoDeposito
        ? "DEPOSITO_GARANTIA"
        : "ALQUILER";
      abonosCobro.push({
        monto: montoNumerico,
        metodoPago: metodo,
        tipoAbono: tipoAb,
        montoRecibido: montoRecibido ? Number(montoRecibido) : null,
        vueltasEntregadas: vueltasEntregadas ? Number(vueltasEntregadas) : null,
        referenciaComprobante: referenciaComprobante?.trim() || null,
        notas:
          notas?.trim() ||
          (tipoAb === "DEPOSITO_GARANTIA"
            ? "Recaudo de Depósito en Custodia"
            : recargoMoraNumerico > 0
              ? "Cobro de mora y liquidación de factura"
              : "Abono / Pago de factura"),
      });
    }

    const totalDineroCobro = abonosCobro.reduce((acc, a) => acc + a.monto, 0);

    // Control de Caja: Si ingresa dinero, resolver el turno abierto de forma universal
    if (totalDineroCobro > 0) {
      const turnoActivo = await obtenerTurnoAbiertoActivo(prisma, cajeroId, body.turnoCajaId || turnoCajaId);
      if (!turnoActivo) {
        return NextResponse.json(
          {
            success: false,
            error: "No existe un turno de caja iniciado para la jornada de hoy. Debe registrar la base de efectivo inicial antes de registrar cobros.",
            codigoSeguridad: "SIN_TURNO",
            requiereAperturaHoy: true,
          },
          { status: 409 }
        );
      }
    }

    // 5. Transacción atómica en base de datos SQLite con reintentos
    const resultado = await ejecutarTransaccionConReintentos(prisma, async (tx) => {
      // Buscar el turno de caja abierto asignado a este cajero de forma infalible
      const turnoAbierto = await obtenerTurnoAbiertoActivo(tx, cajeroId, body.turnoCajaId || turnoCajaId);

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

      // B. Crear registro de abono(s) si el monto es mayor a 0
      let nuevoAbono = null;
      if (abonosCobro.length > 0) {
        const campoMetodoMap: Record<MetodoPago, string> = {
          [MetodoPago.EFECTIVO]: "totalEfectivo",
          [MetodoPago.NEQUI]: "totalNequi",
          [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
          [MetodoPago.LLAVE]: "totalLlave",
          [MetodoPago.DAVIPLATA]: "totalDaviplata",
          [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
          [MetodoPago.CONSIGNACION]: "totalConsignacion",
        };

        for (const ab of abonosCobro) {
          const abCreado = await tx.abono.create({
            data: {
              facturaId: facturaExistente.id,
              cajeroId,
              turnoCajaId: turnoAbierto?.id || null,
              monto: ab.monto,
              metodoPago: ab.metodoPago,
              montoRecibido: ab.montoRecibido,
              vueltasEntregadas: ab.vueltasEntregadas,
              referenciaComprobante: ab.referenciaComprobante,
              notas: ab.notas,
              tipoAbono: ab.tipoAbono,
            },
          });
          if (!nuevoAbono) nuevoAbono = abCreado;

          // Impactar movimiento en el turno activo si existe
          if (turnoAbierto) {
            const campoAIncrementar = campoMetodoMap[ab.metodoPago];
            if (campoAIncrementar) {
              await tx.turnoCaja.update({
                where: { id: turnoAbierto.id },
                data: {
                  [campoAIncrementar]: { increment: ab.monto },
                  totalRecaudado: { increment: ab.monto },
                },
              });
            }
          }
        }

        // Registrar movimiento contable en cartera de cliente
        try {
          const facturasCliente = await tx.factura.findMany({
            where: {
              clienteId: facturaExistente.clienteId,
              saldoPendiente: { gt: 0 },
            },
            select: { saldoPendiente: true },
          });
          const saldoCarteraAntes = Math.round(
            facturasCliente.reduce((acc, f) => acc + (f.saldoPendiente || 0), 0) * 100
          ) / 100;
          const totalAbonadoAqui = abonosCobro.reduce((acc, a) => acc + a.monto, 0);
          const saldoCarteraDespues = Math.max(0, Math.round((saldoCarteraAntes - totalAbonadoAqui) * 100) / 100);

          await tx.movimientoCartera.create({
            data: {
              clienteId: facturaExistente.clienteId,
              facturaId: facturaExistente.id,
              tipoMovimiento: TipoMovimientoCartera.ABONO_CUENTA,
              monto: totalAbonadoAqui,
              saldoAnterior: saldoCarteraAntes,
              saldoNuevo: saldoCarteraDespues,
              metodoPago: abonosCobro[0]?.metodoPago || MetodoPago.EFECTIVO,
              referencia: abonosCobro[0]?.referenciaComprobante || null,
              descripcion: `Abono registrado a factura N° ${facturaExistente.numeroFactura}`,
              usuarioCajeroId: cajeroId,
            },
          });
        } catch (errMov) {
          console.warn("[CARTERA] Error al registrar abono en movimientoCartera:", errMov);
        }
      }

      // C. Liberar prendas alquiladas y liquidar depósito si aplica (Soporte Devolución Parcial por Prenda)
      let fechaDevReal = facturaExistente.fechaDevolucionReal;
      let nuevoEstadoDeposito = facturaExistente.estadoDeposito;
      let nuevoMontoRetenido = facturaExistente.montoRetenidoDeposito;
      let nuevoMontoDevuelto = facturaExistente.montoDevueltoDeposito;
      let nuevoMotivoRetencion = facturaExistente.motivoRetencionDeposito;

      let totalCargosAveriaItems = 0;
      let todosItemsDevueltos = false;

      const procesarDevolucion = Boolean(
        confirmarDevolucionPrendas ||
        estadoDeposito ||
        (listaItemsDevolucion && listaItemsDevolucion.length > 0)
      );

      if (procesarDevolucion) {
        if (listaItemsDevolucion && listaItemsDevolucion.length > 0) {
          // Procesar actualización granular de cada prenda individual
          for (const it of listaItemsDevolucion) {
            const idDetalle = it.detalleId || it.id;
            if (!idDetalle) continue;
            const esDevuelto = Boolean(it.devuelto);
            const cargo = Math.max(0, Number(it.cargoAveria || 0));
            totalCargosAveriaItems += cargo;

            await tx.detalleFactura.update({
              where: { id: idDetalle },
              data: {
                devuelto: esDevuelto,
                fechaDevolucionItem: esDevuelto ? new Date() : null,
                estadoDevolucionItem: it.estado || (esDevuelto ? "BUEN_ESTADO" : "PENDIENTE"),
                cargoAveria: cargo,
                notaAveria: it.notaAveria?.trim() || null,
              },
            });

            const detOriginal = facturaExistente.detalles.find((d) => d.id === idDetalle);
            if (detOriginal && detOriginal.productoId) {
              if (esDevuelto) {
                const esAveriada = it.estado === "EN_ARREGLO" || it.estado === "DANIADO" || cargo > 0;
                const nuevoEstadoPrenda = esAveriada ? EstadoPrenda.EN_ARREGLO : EstadoPrenda.DISPONIBLE;
                await tx.producto.update({
                  where: { id: detOriginal.productoId },
                  data: { estado: nuevoEstadoPrenda, estadoPrenda: nuevoEstadoPrenda },
                });
              } else {
                await tx.producto.update({
                  where: { id: detOriginal.productoId },
                  data: { estado: EstadoPrenda.ALQUILADO, estadoPrenda: EstadoPrenda.ALQUILADO },
                });
              }
            }
          }

          // Consultar estado actualizado de todos los ítems de alquiler de esta factura
          const detallesPost = await tx.detalleFactura.findMany({
            where: { facturaId: facturaExistente.id },
          });
          const prendasAlquiler = detallesPost.filter((d) => !d.esServicioLibre || d.productoId);
          todosItemsDevueltos = prendasAlquiler.length > 0
            ? prendasAlquiler.every((d) => d.devuelto)
            : true;
        } else {
          // Devolución total global tradicional
          todosItemsDevueltos = true;
          await tx.detalleFactura.updateMany({
            where: { facturaId: facturaExistente.id },
            data: {
              devuelto: true,
              fechaDevolucionItem: new Date(),
              estadoDevolucionItem: estadoPrendasDevueltas || "BUEN_ESTADO",
            },
          });

          const productosAlquilerIds = facturaExistente.detalles
            .filter((d) => Boolean(d.productoId) && (d.producto?.tipo === TipoProducto.ALQUILER || !d.esServicioLibre))
            .map((d) => d.productoId as string);

          if (productosAlquilerIds.length > 0) {
            const esDaniado =
              estadoPrendasDevueltas === "EN_ARREGLO" ||
              estadoDeposito === "RETENIDO_PARCIAL" ||
              estadoDeposito === "RETENIDO_TOTAL";
            const estadoDestino = esDaniado ? EstadoPrenda.EN_ARREGLO : EstadoPrenda.DISPONIBLE;

            await tx.producto.updateMany({
              where: { id: { in: productosAlquilerIds } },
              data: {
                estado: estadoDestino,
                estadoPrenda: estadoDestino,
              },
            });
          }
        }

        // Resolución de custodia del depósito
        const retencionDirecta = Math.max(0, Number(montoRetenidoDeposito || 0));
        const retencionTotalCalculada = Math.min(
          facturaExistente.montoDeposito,
          totalCargosAveriaItems > 0 ? (totalCargosAveriaItems + retencionDirecta) : retencionDirecta
        );

        if (facturaExistente.montoDeposito === 0) {
          nuevoEstadoDeposito = "SIN_DEPOSITO";
          nuevoMontoDevuelto = 0;
          nuevoMontoRetenido = 0;
        } else if (!todosItemsDevueltos) {
          // Si faltan prendas por entregar, el depósito queda en retención parcial preventiva
          nuevoEstadoDeposito = "RETENIDO_PARCIAL";
          nuevoMontoRetenido = Math.max(retencionTotalCalculada, Math.round(facturaExistente.montoDeposito * 0.5));
          nuevoMontoDevuelto = Math.max(0, facturaExistente.montoDeposito - nuevoMontoRetenido);
          nuevoMotivoRetencion = motivoRetencionDeposito?.trim() || "Devolución parcial: faltan prendas por entregar";
        } else if (retencionTotalCalculada >= facturaExistente.montoDeposito || estadoDeposito === "RETENIDO_TOTAL") {
          nuevoEstadoDeposito = "RETENIDO_TOTAL";
          nuevoMontoRetenido = facturaExistente.montoDeposito;
          nuevoMontoDevuelto = 0;
          nuevoMotivoRetencion = motivoRetencionDeposito?.trim() || "Daño irreparable o retención total pactada";
        } else if (retencionTotalCalculada > 0 || estadoDeposito === "RETENIDO_PARCIAL") {
          nuevoEstadoDeposito = "RETENIDO_PARCIAL";
          nuevoMontoRetenido = retencionTotalCalculada > 0 ? retencionTotalCalculada : Math.min(facturaExistente.montoDeposito, retencionDirecta);
          nuevoMontoDevuelto = Math.max(0, facturaExistente.montoDeposito - nuevoMontoRetenido);
          nuevoMotivoRetencion = motivoRetencionDeposito?.trim() || "Deducción por daños/lavandería en prendas";
        } else {
          nuevoEstadoDeposito = "DEVUELTO_COMPLETO";
          nuevoMontoDevuelto = facturaExistente.montoDeposito;
          nuevoMontoRetenido = 0;
          nuevoMotivoRetencion = null;
        }

        if (todosItemsDevueltos) {
          fechaDevReal = new Date();
        }

        // Trazabilidad de Devolución de Depósito en Custodia en el Turno Activo
        const porcionDevueltaAhora = Math.round((nuevoMontoDevuelto - (facturaExistente.montoDevueltoDeposito || 0)) * 100) / 100;
        if (porcionDevueltaAhora > 0) {
          await tx.abono.create({
            data: {
              facturaId: facturaExistente.id,
              cajeroId,
              turnoCajaId: turnoAbierto?.id || null,
              monto: porcionDevueltaAhora,
              metodoPago: MetodoPago.EFECTIVO,
              notas: "Devolución de depósito en garantía al entregar prendas",
              tipoAbono: "DEPOSITO_DEVUELTO",
            },
          });

          if (turnoAbierto) {
            await tx.turnoCaja.update({
              where: { id: turnoAbierto.id },
              data: {
                totalEfectivo: { decrement: porcionDevueltaAhora },
              },
            });
          }
        }
      }

      // D. Calcular acumulado total de abonos desacoplados (Alquiler vs Depósito en Custodia)
      const abonosAlquiler = await tx.abono.findMany({
        where: {
          facturaId: facturaExistente.id,
          tipoAbono: { not: "DEPOSITO_GARANTIA" },
        },
      });

      const nuevoTotalAbonado = Math.round(
        abonosAlquiler.reduce((acc, curr) => acc + curr.monto, 0) * 100
      ) / 100;

      const nuevoSaldoPendiente = Math.max(
        0,
        Math.round((nuevoTotalFactura - nuevoTotalAbonado) * 100) / 100
      );

      const abonosDeposito = await tx.abono.findMany({
        where: {
          facturaId: facturaExistente.id,
          tipoAbono: "DEPOSITO_GARANTIA",
        },
      });

      const nuevoDepositoAbonado = Math.round(
        abonosDeposito.reduce((acc, curr) => acc + curr.monto, 0) * 100
      ) / 100;

      const nuevoSaldoDeposito = Math.max(
        0,
        Math.round((facturaExistente.montoDeposito - nuevoDepositoAbonado) * 100) / 100
      );

      if (facturaExistente.montoDeposito > 0 && !procesarDevolucion) {
        if (nuevoDepositoAbonado >= facturaExistente.montoDeposito) {
          nuevoEstadoDeposito = "RECIBIDO_EN_GARANTIA";
        } else if (nuevoDepositoAbonado > 0) {
          nuevoEstadoDeposito = "ABONADO_PARCIAL";
        }
      }

      // E. Evaluar nuevo estado de la factura
      const tienePrendasAlquiler = facturaExistente.detalles.some(
        (d) => d.producto && d.producto.tipo === TipoProducto.ALQUILER
      );

      let nuevoEstado: EstadoFactura = facturaExistente.estado;
      if (nuevoSaldoPendiente <= 0) {
        if (tienePrendasAlquiler && (!todosItemsDevueltos || !fechaDevReal)) {
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
          depositoAbonado: nuevoDepositoAbonado,
          saldoDeposito: nuevoSaldoDeposito,
          estadoDeposito: nuevoEstadoDeposito,
          montoRetenidoDeposito: nuevoMontoRetenido,
          montoDevueltoDeposito: nuevoMontoDevuelto,
          motivoRetencionDeposito: nuevoMotivoRetencion,
          fechaDevolucionReal: fechaDevReal,
          metodoPagoPrincipal:
            body.metodoPagoPrincipal ||
            (body.esPagoMixto || abonosCobro.length > 1
              ? "MIXTO"
              : (abonosCobro[0]?.metodoPago || facturaExistente.metodoPagoPrincipal)),
          efectivoRecibido:
            body.efectivoRecibido !== undefined
              ? Math.max(0, Number(body.efectivoRecibido) || 0)
              : (body.montoRecibido !== undefined
                  ? Math.max(0, Number(body.montoRecibido) || 0)
                  : facturaExistente.efectivoRecibido),
          cambioEntregado:
            body.cambioEntregado !== undefined
              ? Math.max(0, Number(body.cambioEntregado) || 0)
              : (body.vueltasEntregadas !== undefined
                  ? Math.max(0, Number(body.vueltasEntregadas) || 0)
                  : (body.vueltasCambioFinal !== undefined
                      ? Math.max(0, Number(body.vueltasCambioFinal) || 0)
                      : facturaExistente.cambioEntregado)),
          estado: nuevoEstado,
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

      // Persistencia dinámica del último abono en apartados
      try {
        if (facturaExistente.tipoOperacion === TipoOperacion.SEPARE && montoNumerico > 0) {
          await tx.configuracionEmpresa.updateMany({
            data: { ultimoAbonoApartado: montoNumerico },
          });
        }
      } catch (errCfg) {
        console.warn("[EMPRESA] No se pudo actualizar ultimoAbonoApartado:", errCfg);
      }

      return { nuevoAbono, facturaActualizada };
    });

    return NextResponse.json({
      success: true,
      ok: true,
      id: resultado.facturaActualizada.id,
      mensaje: `Transacción registrada correctamente. Saldo restante: $${resultado.facturaActualizada.saldoPendiente.toLocaleString("es-CO")}`,
      abono: resultado.nuevoAbono,
      factura: resultado.facturaActualizada,
    });
  } catch (error: unknown) {
    console.error("Error al registrar cobro/abono:", error);
    const mensajeError = error instanceof Error ? error.message : "Error interno al procesar el cobro a la factura";
    const statusCode = (error as any)?.statusCode || ((error as any)?.codigoError === "STOCK_INSUFICIENTE" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: mensajeError },
      { status: statusCode }
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
 * Actualización general de la factura o sobrescritura completa idempotente
 * para transacciones en curso (evita duplicar registros al retroceder entre pasos).
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 1. Verificar si la factura existe
    const facturaPrevia = await prisma.factura.findUnique({
      where: { id },
      include: {
        detalles: { include: { producto: true } },
        abonos: true,
      },
    });

    if (!facturaPrevia) {
      return NextResponse.json(
        { success: false, error: "La factura a actualizar no existe en el sistema" },
        { status: 404 }
      );
    }

    const {
      detalles = body.items || body.productos,
      reemplazarEnCurso,
      clienteId,
      abonoInicial,
      notas,
      montoDeposito: montoDepositoInput,
      metodoPagoDeposito,
      efectivoRecibido: efectivoRecibidoInput,
      cambioEntregado: cambioEntregadoInput,
      fechaEntregaAlquiler,
      fechaDevolucionPactada,
      estado,
    } = body;

    // Si NO se envían detalles ni reemplazo en curso, realizar actualización simple de estado y notas
    if (!detalles && !reemplazarEnCurso) {
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
        ok: true,
        id: facturaActualizada.id,
        mensaje: "Factura actualizada correctamente",
        factura: facturaActualizada,
      });
    }

    // =========================================================================
    // ACTUALIZACIÓN INTEGRAL DE FACTURA EN CURSO (IDEMPOTENCIA TOTAL)
    // =========================================================================
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json(
        { success: false, error: "La factura debe incluir al menos un producto o servicio" },
        { status: 400 }
      );
    }

    const sesion = await obtenerSesionDesdeRequest(req);
    let cajeroId = sesion?.userId || facturaPrevia.usuarioCajeroId;

    const montoDeposito = montoDepositoInput !== undefined ? Math.max(0, Number(montoDepositoInput) || 0) : facturaPrevia.montoDeposito;
    const efectivoRecibido = efectivoRecibidoInput !== undefined
      ? Math.max(0, Number(efectivoRecibidoInput) || 0)
      : (body.montoRecibido !== undefined ? Math.max(0, Number(body.montoRecibido) || 0) : facturaPrevia.efectivoRecibido);
    const cambioEntregado = cambioEntregadoInput !== undefined
      ? Math.max(0, Number(cambioEntregadoInput) || 0)
      : (body.vueltasEntregadas !== undefined
          ? Math.max(0, Number(body.vueltasEntregadas) || 0)
          : (body.vueltasCambioFinal !== undefined ? Math.max(0, Number(body.vueltasCambioFinal) || 0) : facturaPrevia.cambioEntregado));

    // Procesar y calcular subtotales de ítems
    let subtotalProductos = 0;
    let subtotalArreglosLibres = 0;
    let tieneVenta = false;
    let tieneAlquiler = false;
    let tieneArreglo = false;

    const detallesProcesados: {
      productoId: string | null;
      esServicioLibre: boolean;
      descripcionLibre: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      tipoProducto?: TipoProducto | null;
    }[] = [];

    for (const item of detalles) {
      const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
      const precioUnitario = Math.max(0, Number(item.precioUnitario) || 0);
      const subtotalItem = Math.round(cantidad * precioUnitario * 100) / 100;

      if (item.esServicioLibre || !item.productoId) {
        const descripcionLibre = (item.descripcionLibre || item.nombre || "").trim();
        const esArreglo = item.esServicioLibre || body.tipoOperacion === "ARREGLO";
        if (esArreglo) {
          tieneArreglo = true;
          subtotalArreglosLibres += subtotalItem;
        } else {
          tieneVenta = true;
          subtotalProductos += subtotalItem;
        }

        detallesProcesados.push({
          productoId: null,
          esServicioLibre: esArreglo,
          descripcionLibre: descripcionLibre || "Servicio de sastrería",
          cantidad,
          precioUnitario,
          subtotal: subtotalItem,
          tipoProducto: null,
        });
      } else {
        const producto = await prisma.producto.findUnique({
          where: { id: item.productoId },
        });

        if (producto) {
          if (producto.tipo === TipoProducto.ALQUILER) {
            tieneAlquiler = true;
          } else {
            tieneVenta = true;
          }
          subtotalProductos += subtotalItem;
          detallesProcesados.push({
            productoId: producto.id,
            esServicioLibre: false,
            descripcionLibre: item.descripcionLibre?.trim() || null,
            cantidad,
            precioUnitario,
            subtotal: subtotalItem,
            tipoProducto: producto.tipo,
          });
        }
      }
    }

    const totalFactura = Math.round((subtotalProductos + subtotalArreglosLibres) * 100) / 100;

    // Procesar abono inicial corregido
    const abonosInput: AbonoEnCursoInput[] = Array.isArray(body.abonos) && body.abonos.length > 0
      ? (body.abonos as AbonoEnCursoInput[])
      : (typeof abonoInicial === "number" && abonoInicial > 0
        ? [{ monto: abonoInicial, metodoPago: body.metodoPagoAbono || MetodoPago.EFECTIVO }]
        : (abonoInicial && typeof abonoInicial === "object" && Number((abonoInicial as AbonoEnCursoInput).monto) > 0
          ? [abonoInicial as AbonoEnCursoInput]
          : []));

    const abonosDataCreacion: {
      monto: number;
      metodoPago: MetodoPago;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      cajeroId: string;
      referenciaComprobante?: string | null;
      notas?: string | null;
      tipoAbono?: string;
    }[] = [];

    let tipoOpFinal = facturaPrevia.tipoOperacion;
    if (body.tipoOperacion === TipoOperacion.SEPARE || body.tipoOperacion === "SEPARE" || facturaPrevia.tipoOperacion === TipoOperacion.SEPARE) {
      tipoOpFinal = TipoOperacion.SEPARE;
    } else {
      let categoriasCount = (tieneVenta ? 1 : 0) + (tieneAlquiler ? 1 : 0) + (tieneArreglo ? 1 : 0);
      if (categoriasCount > 1) {
        tipoOpFinal = TipoOperacion.MIXTO;
      } else if (tieneAlquiler) {
        tipoOpFinal = TipoOperacion.ALQUILER;
      } else if (tieneArreglo) {
        tipoOpFinal = TipoOperacion.ARREGLO;
      } else if (tieneVenta) {
        tipoOpFinal = TipoOperacion.VENTA;
      }
    }

    const tipoAbonoComercial =
      tipoOpFinal === TipoOperacion.SEPARE
        ? "RESERVA"
        : tieneAlquiler || tipoOpFinal === TipoOperacion.ALQUILER
        ? "ALQUILER"
        : "VENTA";

    let totalAbonado = 0;
    for (const ab of abonosInput) {
      const monto = Math.round((Number(ab.monto) || 0) * 100) / 100;
      if (monto > 0) {
        totalAbonado += monto;
        let metodoPago: MetodoPago = MetodoPago.EFECTIVO;
        if (ab.metodoPago && Object.values(MetodoPago).includes(ab.metodoPago as MetodoPago)) {
          metodoPago = ab.metodoPago as MetodoPago;
        }

        abonosDataCreacion.push({
          monto,
          metodoPago,
          montoRecibido: ab.montoRecibido ? Number(ab.montoRecibido) || null : null,
          vueltasEntregadas: ab.vueltasEntregadas ? Number(ab.vueltasEntregadas) || null : null,
          cajeroId,
          referenciaComprobante: ab.referenciaComprobante ? String(ab.referenciaComprobante).trim() : null,
          notas: ab.notas ? String(ab.notas).trim() : "Abono corregido en mostrador",
          tipoAbono: tipoAbonoComercial,
        });
      }
    }

    // Resolver custodia de deposito de forma exacta (sin perder DEPOSITO_GARANTIA)
    const depositoAbonadoResuelto =
      body.depositoAbonado !== undefined
        ? Math.max(0, Math.min(montoDeposito, Math.round((Number(body.depositoAbonado) || 0) * 100) / 100))
        : tipoOpFinal === TipoOperacion.ALQUILER || tieneAlquiler
        ? montoDeposito
        : Math.min(montoDeposito, Math.max(0, Number(facturaPrevia.depositoAbonado) || 0));

    const saldoDepositoResuelto = Math.max(0, Math.round((montoDeposito - depositoAbonadoResuelto) * 100) / 100);

    let metodoPagoDepValido: MetodoPago = MetodoPago.EFECTIVO;
    if (metodoPagoDeposito && Object.values(MetodoPago).includes(metodoPagoDeposito as MetodoPago)) {
      metodoPagoDepValido = metodoPagoDeposito as MetodoPago;
    }

    if (depositoAbonadoResuelto > 0) {
      abonosDataCreacion.push({
        monto: depositoAbonadoResuelto,
        metodoPago: metodoPagoDepValido,
        montoRecibido: body.montoRecibidoDeposito ? Number(body.montoRecibidoDeposito) || null : null,
        vueltasEntregadas: body.vueltasDeposito ? Number(body.vueltasDeposito) || null : null,
        cajeroId,
        referenciaComprobante: body.referenciaDeposito ? String(body.referenciaDeposito).trim() : null,
        notas: "Depósito en custodia (Garantía reembolsable)",
        tipoAbono: "DEPOSITO_GARANTIA",
      });
    }

    const estadoDepositoResuelto =
      montoDeposito <= 0
        ? "SIN_DEPOSITO"
        : depositoAbonadoResuelto <= 0
        ? "ESTIPULADO_PARA_ENTREGA"
        : depositoAbonadoResuelto < montoDeposito
        ? "ABONADO_PARCIAL"
        : "RECIBIDO_EN_GARANTIA";

    totalAbonado = Math.round(totalAbonado * 100) / 100;
    const saldoPendiente = Math.max(0, Math.round((totalFactura - totalAbonado) * 100) / 100);

    let estadoFinal: EstadoFactura = EstadoFactura.ACTIVA;
    if (tipoOpFinal === TipoOperacion.SEPARE) {
      estadoFinal = totalAbonado > 0 ? EstadoFactura.ACTIVA : EstadoFactura.EN_PROCESO;
    } else if (saldoPendiente <= 0) {
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.CERRADA;
    } else if (totalAbonado === 0) {
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.EN_PROCESO;
    } else {
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.ACTIVA;
    }

    // Ejecutar transacción atómica de reemplazo sobre la misma factura con reintentos
    const facturaActualizada = await ejecutarTransaccionConReintentos(prisma, async (tx) => {
      // 1. Restaurar prendas previas de alquiler a DISPONIBLE y reponer stock de ventas previas
      for (const d of facturaPrevia.detalles) {
        if (d.productoId) {
          if (d.producto?.tipo === TipoProducto.ALQUILER) {
            try {
              await tx.producto.update({
                where: { id: d.productoId },
                data: { estado: "DISPONIBLE", estadoPrenda: "DISPONIBLE" },
              });
            } catch { }
          } else if (d.producto?.tipo === TipoProducto.VENTA) {
            try {
              await tx.producto.update({
                where: { id: d.productoId },
                data: { stockActual: { increment: d.cantidad } },
              });
            } catch { }
          }
        }
      }

      // 2. Eliminar detalles y abonos previos de esta factura en curso
      await tx.detalleFactura.deleteMany({ where: { facturaId: id } });
      await tx.abono.deleteMany({ where: { facturaId: id } });

      // 3. Buscar turno abierto de forma infalible
      const turnoAbierto = await obtenerTurnoAbiertoActivo(tx, cajeroId, body.turnoCajaId);

      // 4. Crear los nuevos detalles
      await tx.detalleFactura.createMany({
        data: detallesProcesados.map((d) => ({
          facturaId: id,
          productoId: d.productoId,
          esServicioLibre: d.esServicioLibre,
          descripcionLibre: d.descripcionLibre,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        })),
      });

      // 5. Crear los nuevos abonos
      if (abonosDataCreacion.length > 0) {
        await tx.abono.createMany({
          data: abonosDataCreacion.map((ab) => ({
            ...ab,
            facturaId: id,
            turnoCajaId: turnoAbierto?.id || facturaPrevia.turnoCajaId || null,
          })),
        });
      }

      // 6. Actualizar la factura existente conservando id, consecutivo y numeroFactura
      const fUpd = await tx.factura.update({
        where: { id },
        data: {
          clienteId: clienteId || facturaPrevia.clienteId,
          subtotalProductos,
          subtotalArreglosLibres,
          totalFactura,
          totalAbonado,
          saldoPendiente,
          montoDeposito,
          depositoAbonado: depositoAbonadoResuelto,
          saldoDeposito: saldoDepositoResuelto,
          estadoDeposito: estadoDepositoResuelto,
          metodoPagoDeposito: montoDeposito > 0 ? metodoPagoDepValido : null,
          efectivoRecibido,
          cambioEntregado,
          tipoOperacion: tipoOpFinal,
          estado: estadoFinal,
          notas: notas !== undefined ? (notas?.trim() || null) : facturaPrevia.notas,
          observaciones: body.observaciones !== undefined ? (body.observaciones?.trim() || null) : facturaPrevia.observaciones,
          fechaRetiroApartado: body.fechaRetiroApartado ? new Date(body.fechaRetiroApartado) : facturaPrevia.fechaRetiroApartado,
          fechaDevolucionEstimada: body.fechaDevolucionEstimada ? new Date(body.fechaDevolucionEstimada) : facturaPrevia.fechaDevolucionEstimada,
        },
        include: {
          cliente: true,
          usuarioCajero: {
            select: { id: true, username: true, nombre: true, rol: true },
          },
          detalles: { include: { producto: true } },
          abonos: { include: { cajero: true }, orderBy: { fecha: "desc" } },
        },
      });

      // Sincronizar totales de TurnoCaja tras reemplazar abonos en curso
      const turnoSincId = turnoAbierto?.id || facturaPrevia.turnoCajaId;
      if (turnoSincId) {
        const turnoObj = await tx.turnoCaja.findUnique({ where: { id: turnoSincId } });
        if (turnoObj) {
          const arq = await calcularArqueoExactoTurno(tx as any, turnoObj);
          await tx.turnoCaja.update({
            where: { id: turnoSincId },
            data: {
              totalEfectivo: arq.totalEfectivo + arq.depositosEfectivoNetos,
              totalNequi: arq.totalNequi,
              totalBancolombia: arq.totalBancolombia,
              totalLlave: arq.totalLlave,
              totalDaviplata: arq.totalDaviplata,
              totalTransferencia: arq.totalTransferencia,
              totalConsignacion: arq.totalConsignacion,
              totalRecaudado: arq.totalRecaudado,
              efectivoEsperado: arq.efectivoEsperado,
            },
          });
        }
      }

      // 7. Marcar nuevas prendas alquiladas como ALQUILADO y descontar stock de venta
      for (const item of detallesProcesados) {
        if (item.productoId) {
          if (item.tipoProducto === TipoProducto.ALQUILER && tipoOpFinal !== TipoOperacion.SEPARE) {
            try {
              await tx.producto.update({
                where: { id: item.productoId },
                data: { estado: "ALQUILADO", estadoPrenda: "ALQUILADO" },
              });
            } catch { }
          } else if (item.tipoProducto === TipoProducto.VENTA) {
            const prodActual = await tx.producto.findUnique({
              where: { id: item.productoId },
              select: { id: true, nombre: true, stockActual: true },
            });

            if (!prodActual) {
              const errProd = new Error(`El producto con ID ${item.productoId} no existe en el inventario.`);
              (errProd as any).statusCode = 404;
              throw errProd;
            }

            if (prodActual.stockActual < item.cantidad) {
              const errStock = new Error(
                `Stock insuficiente para el producto "${prodActual.nombre}". Disponibles: ${prodActual.stockActual}, solicitadas: ${item.cantidad}.`
              );
              (errStock as any).statusCode = 400;
              (errStock as any).codigoError = "STOCK_INSUFICIENTE";
              throw errStock;
            }

            await tx.producto.update({
              where: { id: item.productoId },
              data: { stockActual: { decrement: item.cantidad } },
            });
          }
        }
      }

      // Persistencia dinámica del último abono/depósito en ConfiguracionEmpresa
      try {
        if (tipoOpFinal === TipoOperacion.ALQUILER || tieneAlquiler) {
          if (montoDeposito > 0) {
            await tx.configuracionEmpresa.updateMany({
              data: { ultimoAbonoAlquiler: montoDeposito },
            });
          }
        } else if (tipoOpFinal === TipoOperacion.SEPARE) {
          const abonoApt = totalAbonado > 0 ? totalAbonado : (montoDeposito > 0 ? montoDeposito : 0);
          if (abonoApt > 0) {
            await tx.configuracionEmpresa.updateMany({
              data: { ultimoAbonoApartado: abonoApt },
            });
          }
        }
      } catch (errCfg) {
        console.warn("[EMPRESA] No se pudo actualizar ultimoAbono dinámico:", errCfg);
      }

      return fUpd;
    });

    return NextResponse.json({
      success: true,
      ok: true,
      id: facturaActualizada.id,
      mensaje: `Factura N° ${facturaActualizada.numeroFactura} actualizada en curso exitosamente (sin duplicar).`,
      factura: facturaActualizada,
    });
  } catch (error: unknown) {
    console.error("Error al actualizar factura en curso:", error);
    const mensajeError = error instanceof Error ? error.message : "Error interno al actualizar la factura";
    const statusCode = (error as any)?.statusCode || ((error as any)?.codigoError === "STOCK_INSUFICIENTE" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: mensajeError },
      { status: statusCode }
    );
  }
}

/**
 * DELETE /api/facturas/[id]
 * Anula / elimina una factura del historial con doble verificación de seguridad.
 * Restituye automáticamente el stock y estado de las prendas a DISPONIBLE,
 * y descuenta el dinero recaudado del arqueo de caja.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { pinSeguridad, motivo = "Anulación autorizada en historial" } = body;

    // 1. Validar que la factura exista con sus detalles y abonos
    const factura = await prisma.factura.findFirst({
      where: { OR: [{ id }, { numeroFactura: id }] },
      include: {
        detalles: { include: { producto: true } },
        abonos: true,
      },
    });

    if (!factura) {
      return NextResponse.json(
        { success: false, error: "La factura no fue encontrada en la base de datos." },
        { status: 404 }
      );
    }

    // 2. Idempotencia: rechazar anulación si ya está anulada
    if (factura.estado === EstadoFactura.ANULADA) {
      return NextResponse.json(
        { success: false, error: `La factura N° ${factura.numeroFactura} ya se encuentra ANULADA en el sistema.` },
        { status: 400 }
      );
    }

    // 3. Motivo obligatorio estricto
    const motivoLimpio = String(motivo || "").trim();
    if (!motivoLimpio || motivoLimpio.length < 5) {
      return NextResponse.json(
        { success: false, error: "Debe indicar un motivo explícito de al menos 5 caracteres para anular la transacción." },
        { status: 400 }
      );
    }

    // 4. Doble validación de seguridad (PIN de Supervisor / Administrador o Contraseña)
    const credencialIngresada = String(pinSeguridad || "").trim();
    if (!credencialIngresada) {
      return NextResponse.json(
        { success: false, error: "El PIN o contraseña de supervisor es obligatorio para anular." },
        { status: 400 }
      );
    }

    const supervisores = await prisma.user.findMany({
      where: { rol: "ADMIN", activo: true },
    });

    let supervisorAutorizado = null;
    const bcrypt = await import("bcryptjs");
    for (const sup of supervisores) {
      if (sup.pinSeguridadHash && /^\d{6}$/.test(credencialIngresada)) {
        if (await bcrypt.compare(credencialIngresada, sup.pinSeguridadHash)) {
          supervisorAutorizado = sup;
          break;
        }
      }
      if (sup.passwordHash) {
        if (await bcrypt.compare(credencialIngresada, sup.passwordHash)) {
          supervisorAutorizado = sup;
          break;
        }
      }
    }

    if (!supervisorAutorizado) {
      return NextResponse.json(
        { success: false, error: "PIN o clave de supervisor incorrecta. Operación denegada." },
        { status: 403 }
      );
    }

    // 5. Reversión atómica en base de datos SQLite con reintentos (Inventario, Caja, Cartera y Estado ANULADA)
    await ejecutarTransaccionConReintentos(prisma, async (tx) => {
      // A. Revertir prendas e inventario a DISPONIBLE (y stock físico si es venta)
      for (const det of factura.detalles) {
        if (det.productoId && det.producto) {
          if (det.producto.tipo === TipoProducto.VENTA) {
            await tx.producto.update({
              where: { id: det.productoId },
              data: {
                stockActual: { increment: det.cantidad },
                estado: EstadoPrenda.DISPONIBLE,
                estadoPrenda: EstadoPrenda.DISPONIBLE,
              },
            });
          } else {
            await tx.producto.update({
              where: { id: det.productoId },
              data: {
                estado: EstadoPrenda.DISPONIBLE,
                estadoPrenda: EstadoPrenda.DISPONIBLE,
              },
            });
          }
        }
      }

      // B. Reversión de caja: descontar del turno respectivo cada abono recaudado
      const campoMetodoMap: Record<MetodoPago, string> = {
        [MetodoPago.EFECTIVO]: "totalEfectivo",
        [MetodoPago.NEQUI]: "totalNequi",
        [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
        [MetodoPago.LLAVE]: "totalLlave",
        [MetodoPago.DAVIPLATA]: "totalDaviplata",
        [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
        [MetodoPago.CONSIGNACION]: "totalConsignacion",
      };

      for (const ab of factura.abonos) {
        if (ab.turnoCajaId) {
          const campo = campoMetodoMap[ab.metodoPago];
          if (campo) {
            try {
              await tx.turnoCaja.update({
                where: { id: ab.turnoCajaId },
                data: {
                  [campo]: { decrement: ab.monto },
                  totalRecaudado: { decrement: ab.monto },
                },
              });
            } catch (errT) {
              console.warn("[ANULACION] Error al descontar del turno:", errT);
            }
          }
        }
      }

      // C. Reversión de cartera y créditos del cliente si tenía saldo o era a crédito
      if (factura.clienteId && (factura.saldoPendiente > 0 || factura.esCredito)) {
        try {
          await tx.movimientoCartera.create({
            data: {
              clienteId: factura.clienteId,
              facturaId: factura.id,
              tipoMovimiento: TipoMovimientoCartera.ABONO_CUENTA,
              monto: factura.saldoPendiente || 0,
              saldoAnterior: factura.saldoPendiente || 0,
              saldoNuevo: 0,
              metodoPago: MetodoPago.EFECTIVO,
              descripcion: `Reversión contable por anulación de comprobante N° ${factura.numeroFactura}`,
              usuarioCajeroId: supervisorAutorizado.id,
            },
          });
        } catch (errCart) {
          console.warn("[ANULACION] Error al registrar movimientoCartera:", errCart);
        }
      }

      // D. Marcar la factura como ANULADA (conservando histórico inmutable sin registros huérfanos)
      await tx.factura.update({
        where: { id: factura.id },
        data: {
          estado: EstadoFactura.ANULADA,
          saldoPendiente: 0,
          montoDeposito: 0,
          estadoDeposito: "ANULADA",
          observaciones: `${factura.observaciones ? factura.observaciones + " | " : ""}ANULADA por ${supervisorAutorizado.nombre || supervisorAutorizado.username} el ${new Date().toLocaleString("es-CO")}. Motivo: ${motivoLimpio}`,
        },
      });

      // E. Registro inmutable de auditoría
      try {
        await tx.auditoriaSesion.create({
          data: {
            userId: supervisorAutorizado.id,
            accion: "FACTURA_ANULADA",
            detalles: `Factura N° ${factura.numeroFactura} anulada. Motivo: ${motivoLimpio}. Prendas y valores de caja restituidos.`,
            ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "POS Terminal",
          },
        });
      } catch { }
    });

    return NextResponse.json({
      success: true,
      ok: true,
      mensaje: `Factura N° ${factura.numeroFactura} anulada exitosamente. El inventario físico y los saldos de caja han sido restablecidos.`,
    });
  } catch (err: unknown) {
    console.error("Error al anular factura:", err);
    const msg = err instanceof Error ? err.message : "Error interno al anular factura";
    const statusCode = (err as any)?.statusCode || 500;
    return NextResponse.json({ success: false, error: msg }, { status: statusCode });
  }
}
