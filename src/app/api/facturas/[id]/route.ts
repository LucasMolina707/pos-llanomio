import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { verificarEstadoCajaParaFacturacion, parsearCajerosParticipantes } from "@/lib/caja-control";
import { EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda, EstadoTurno, TipoOperacion } from "@prisma/client";

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

      const montoNuevo = Math.max(0, Math.round(Number(body.monto !== undefined ? body.monto : (body.nuevoAbono !== undefined ? body.nuevoAbono : 0)) * 100) / 100);
      
      // Control de caja si se recibe dinero en la entrega
      if (montoNuevo > 0) {
        const controlCaja = await verificarEstadoCajaParaFacturacion(prisma, cajeroId);
        if (controlCaja.bloqueadoParaFacturar) {
          const turnoAbiertoHoy = await prisma.turnoCaja.findFirst({
            where: { estado: EstadoTurno.ABIERTO },
            orderBy: { fechaApertura: "desc" },
          });

          if (!turnoAbiertoHoy || controlCaja.estado === "BLOQUEADO_DIA_ANTERIOR") {
            return NextResponse.json(
              {
                success: false,
                error: controlCaja.motivoBloqueo || "No existe un turno de caja iniciado para registrar el pago del saldo.",
                codigoSeguridad: controlCaja.estado,
              },
              { status: 409 }
            );
          }
        }
      }

      let metodoNuevo: MetodoPago = MetodoPago.EFECTIVO;
      if (body.metodoPago && Object.values(MetodoPago).includes(body.metodoPago as MetodoPago)) {
        metodoNuevo = body.metodoPago as MetodoPago;
      }

      const resultadoConversion = await prisma.$transaction(async (tx) => {
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

        // 2. Si hay nuevo abono, registrarlo
        let nuevoAbono = null;
        if (montoNuevo > 0) {
          nuevoAbono = await tx.abono.create({
            data: {
              facturaId: facturaPrevia.id,
              cajeroId,
              turnoCajaId: turnoAbierto?.id || null,
              monto: montoNuevo,
              metodoPago: metodoNuevo,
              montoRecibido: body.montoRecibido ? Number(body.montoRecibido) : null,
              vueltasEntregadas: body.vueltasEntregadas ? Number(body.vueltasEntregadas) : null,
              referenciaComprobante: body.referenciaComprobante?.trim() || null,
              notas: body.notas?.trim() || "Pago de saldo al retirar prendas del apartado",
            },
          });

          // Impactar turno activo
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
            const campo = campoMetodoMap[metodoNuevo];
            if (campo) {
              await tx.turnoCaja.update({
                where: { id: turnoAbierto.id },
                data: {
                  [campo]: { increment: montoNuevo },
                  totalRecaudado: { increment: montoNuevo },
                },
              });
            }
          }
        }

        // 3. Si se enviaron detalles re-vinculados (por ejemplo asignando prendas físicas del inventario)
        if (Array.isArray(body.detalles) && body.detalles.length > 0) {
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

        // 4. Calcular nuevos totales y saldo
        const totalAbonosActuales = await tx.abono.aggregate({
          where: { facturaId: facturaPrevia.id },
          _sum: { monto: true },
        });
        const nuevoTotalAbonado = Math.round((totalAbonosActuales._sum.monto || 0) * 100) / 100;
        const nuevoSaldo = Math.max(0, Math.round((facturaPrevia.totalFactura - nuevoTotalAbonado) * 100) / 100);

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
            } catch {}
          }
        }

        // 6. Fechas y Depósito
        const fechaEntrega = body.fechaEntregaAlquiler ? new Date(body.fechaEntregaAlquiler) : new Date();
        const fechaDevolucion = body.fechaDevolucionPactada
          ? new Date(body.fechaDevolucionPactada)
          : (facturaPrevia.fechaDevolucionEstimada || new Date(Date.now() + 3 * 86400000));

        const montoDep = body.montoDeposito !== undefined ? Math.max(0, Number(body.montoDeposito) || 0) : facturaPrevia.montoDeposito;
        const estadoDep = montoDep > 0 ? "RECIBIDO_EN_GARANTIA" : "SIN_DEPOSITO";

        const efRec = body.efectivoRecibido !== undefined
          ? Math.max(0, Number(body.efectivoRecibido) || 0)
          : (body.montoRecibido !== undefined ? Math.max(0, Number(body.montoRecibido) || 0) : undefined);
        const camEnt = body.cambioEntregado !== undefined
          ? Math.max(0, Number(body.cambioEntregado) || 0)
          : (body.vueltasEntregadas !== undefined ? Math.max(0, Number(body.vueltasEntregadas) || 0) : undefined);

        // 7. Actualizar factura a ALQUILER y ACTIVA_ALQUILADA
        const facturaConvertida = await tx.factura.update({
          where: { id: facturaPrevia.id },
          data: {
            tipoOperacion: TipoOperacion.ALQUILER,
            estado: EstadoFactura.ACTIVA_ALQUILADA,
            turnoCajaId: turnoAbierto?.id || facturaPrevia.turnoCajaId || null,
            totalAbonado: nuevoTotalAbonado,
            saldoPendiente: nuevoSaldo,
            tarifaMoraDiaria: body.tarifaMoraDiaria !== undefined ? Number(body.tarifaMoraDiaria) : (facturaPrevia.tarifaMoraDiaria || 3000),
            fechaEntregaAlquiler: fechaEntrega,
            fechaDevolucionPactada: fechaDevolucion,
            montoDeposito: montoDep,
            estadoDeposito: estadoDep,
            metodoPagoDeposito: montoDep > 0 ? "EFECTIVO" : null,
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

        return { facturaConvertida, nuevoAbono };
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

    // Control de Caja: Si ingresa dinero, la caja no puede estar bloqueada por día anterior ni sin turno
    if (montoNumerico > 0) {
      const controlCaja = await verificarEstadoCajaParaFacturacion(prisma, cajeroId);
      if (controlCaja.bloqueadoParaFacturar) {
        const turnoAbiertoHoy = await prisma.turnoCaja.findFirst({
          where: { estado: EstadoTurno.ABIERTO },
          orderBy: { fechaApertura: "desc" },
        });

        if (!turnoAbiertoHoy || controlCaja.estado === "BLOQUEADO_DIA_ANTERIOR") {
          return NextResponse.json(
            {
              success: false,
              error: controlCaja.motivoBloqueo || "No existe un turno de caja iniciado para la jornada de hoy.",
              codigoSeguridad: controlCaja.estado,
              requiereCierreAnterior: controlCaja.estado === "BLOQUEADO_DIA_ANTERIOR",
              requiereAperturaHoy: controlCaja.estado === "SIN_TURNO" && !turnoAbiertoHoy,
              requiereDecisionModalidad: false,
              turnoAbierto: controlCaja.turnoAbierto || (turnoAbiertoHoy ? { id: turnoAbiertoHoy.id, nombreGabinete: turnoAbiertoHoy.nombreGabinete } : null),
              turnoParaCompartir: controlCaja.turnoParaCompartir,
            },
            { status: 409 }
          );
        }
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
          .filter((d) => Boolean(d.productoId) && (d.producto?.tipo === TipoProducto.ALQUILER || !d.esServicioLibre))
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
        if (tienePrendasAlquiler && !fechaDevReal && !procesarDevolucion) {
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
    return NextResponse.json(
      { success: false, error: mensajeError },
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
    const efectivoRecibido = efectivoRecibidoInput !== undefined ? Math.max(0, Number(efectivoRecibidoInput) || 0) : facturaPrevia.efectivoRecibido;
    const cambioEntregado = cambioEntregadoInput !== undefined ? Math.max(0, Number(cambioEntregadoInput) || 0) : facturaPrevia.cambioEntregado;

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
    }[] = [];

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
        });
      }
    }

    totalAbonado = Math.round(totalAbonado * 100) / 100;
    const saldoPendiente = Math.max(0, Math.round((totalFactura - totalAbonado) * 100) / 100);

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

    // Ejecutar transacción atómica de reemplazo sobre la misma factura
    const facturaActualizada = await prisma.$transaction(async (tx) => {
      // 1. Restaurar prendas previas de alquiler a DISPONIBLE
      for (const d of facturaPrevia.detalles) {
        if (d.productoId && d.producto?.tipo === TipoProducto.ALQUILER) {
          try {
            await tx.producto.update({
              where: { id: d.productoId },
              data: { estado: "DISPONIBLE", estadoPrenda: "DISPONIBLE" },
            });
          } catch {}
        }
      }

      // 2. Eliminar detalles y abonos previos de esta factura en curso
      await tx.detalleFactura.deleteMany({ where: { facturaId: id } });
      await tx.abono.deleteMany({ where: { facturaId: id } });

      // 3. Buscar turno abierto
      const turnoAbierto = await tx.turnoCaja.findFirst({
        where: { estado: "ABIERTO" },
        orderBy: { fechaApertura: "desc" },
      });

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
          estadoDeposito: montoDeposito > 0 ? "RECIBIDO_EN_GARANTIA" : "SIN_DEPOSITO",
          metodoPagoDeposito: montoDeposito > 0 ? (tipoOpFinal === TipoOperacion.ALQUILER ? "EFECTIVO" : (metodoPagoDeposito || "EFECTIVO")) : null,
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

      // 7. Marcar nuevas prendas alquiladas como ALQUILADO (Únicamente si NO es SEPARE)
      if (tipoOpFinal !== TipoOperacion.SEPARE) {
        for (const item of detallesProcesados) {
          if (item.productoId && item.tipoProducto === TipoProducto.ALQUILER) {
            try {
              await tx.producto.update({
                where: { id: item.productoId },
                data: { estado: "ALQUILADO", estadoPrenda: "ALQUILADO" },
              });
            } catch {}
          }
        }
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
    return NextResponse.json(
      { success: false, error: mensajeError },
      { status: 500 }
    );
  }
}
