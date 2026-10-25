import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { EstadoFactura, MetodoPago, TipoProducto } from "@prisma/client";

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
 * Registro de nuevo abono a una factura existente
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();

    const {
      monto,
      metodoPago = MetodoPago.EFECTIVO,
      cajeroId: cajeroIdBody,
      referenciaComprobante,
      notas,
    } = body;

    // 1. Validar el monto del abono
    const montoNumerico = Math.round(Number(monto) * 100) / 100;
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto del abono debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // 2. Determinar y validar el cajero autenticado obligatoriamente
    let cajeroId = sesion?.userId || cajeroIdBody;
    if (!cajeroId) {
      const usuarioActivo = await prisma.user.findFirst({
        where: { activo: true },
        select: { id: true },
      });
      if (!usuarioActivo) {
        return NextResponse.json(
          { success: false, error: "No hay un cajero activo identificado para registrar el abono" },
          { status: 401 }
        );
      }
      cajeroId = usuarioActivo.id;
    }

    // 3. Obtener la factura actual
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
        { success: false, error: "La factura a la cual desea abonar no existe" },
        { status: 404 }
      );
    }

    if (facturaExistente.estado === EstadoFactura.CERRADA && facturaExistente.saldoPendiente <= 0) {
      return NextResponse.json(
        { success: false, error: "Esta factura ya se encuentra totalmente cancelada y CERRADA" },
        { status: 400 }
      );
    }

    // 4. Validar método de pago válido
    const metodo = Object.values(MetodoPago).includes(metodoPago)
      ? (metodoPago as MetodoPago)
      : MetodoPago.EFECTIVO;

    // 5. Transacción atómica: Crear abono, actualizar caja del turno y totales de factura
    const resultado = await prisma.$transaction(async (tx) => {
      // Buscar turno de caja abierto actual
      const turnoAbierto = await tx.turnoCaja.findFirst({
        where: { estado: "ABIERTO" },
        orderBy: { fechaApertura: "desc" },
      });

      // Crear el registro de abono
      const nuevoAbono = await tx.abono.create({
        data: {
          facturaId: facturaExistente.id,
          cajeroId,
          turnoCajaId: turnoAbierto?.id || null,
          monto: montoNumerico,
          metodoPago: metodo,
          referenciaComprobante: referenciaComprobante?.trim() || null,
          notas: notas?.trim() || "Abono a saldo pendiente",
        },
      });

      // Impactar movimiento de caja en el turno activo si existe
      if (turnoAbierto) {
        const campoMetodoMap: Record<MetodoPago, string> = {
          [MetodoPago.EFECTIVO]: "totalEfectivo",
          [MetodoPago.NEQUI]: "totalNequi",
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

      // Calcular nuevo acumulado de abonos
      const abonosActualizados = await tx.abono.findMany({
        where: { facturaId: facturaExistente.id },
      });

      const nuevoTotalAbonado = Math.round(
        abonosActualizados.reduce((acc, curr) => acc + curr.monto, 0) * 100
      ) / 100;

      const nuevoSaldoPendiente = Math.max(
        0,
        Math.round((facturaExistente.totalFactura - nuevoTotalAbonado) * 100) / 100
      );

      // Evaluar si tiene prendas de alquiler pendientes de entrega o devolución
      const tienePrendasAlquiler = facturaExistente.detalles.some(
        (d) => d.producto && d.producto.tipo === TipoProducto.ALQUILER
      );

      let nuevoEstado: EstadoFactura = facturaExistente.estado;
      if (nuevoSaldoPendiente <= 0) {
        if (tienePrendasAlquiler && !facturaExistente.fechaDevolucionReal) {
          nuevoEstado = EstadoFactura.ACTIVA_ALQUILADA;
        } else {
          nuevoEstado = EstadoFactura.CERRADA;
        }
      }

      // Actualizar factura
      const facturaActualizada = await tx.factura.update({
        where: { id: facturaExistente.id },
        data: {
          totalAbonado: nuevoTotalAbonado,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
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
      mensaje: `Abono de $${montoNumerico.toLocaleString("es-CO")} registrado correctamente`,
      abono: resultado.nuevoAbono,
      factura: resultado.facturaActualizada,
    });
  } catch (error: unknown) {
    console.error("Error al registrar abono:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el abono a la factura" },
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
 * Actualización general de la factura (estado, notas, adición de ítems)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { estado, notas, nuevosDetalles = [] } = body;

    const factura = await prisma.factura.findFirst({
      where: {
        OR: [{ id }, { numeroFactura: id }],
      },
      include: {
        detalles: true,
        abonos: true,
      },
    });

    if (!factura) {
      return NextResponse.json(
        { success: false, error: "La factura especificada no existe" },
        { status: 404 }
      );
    }

    // Si se están agregando nuevos detalles a la factura existente
    if (Array.isArray(nuevosDetalles) && nuevosDetalles.length > 0) {
      return await prisma.$transaction(async (tx) => {
        let nuevoSubtotalProductos = factura.subtotalProductos;
        let nuevoSubtotalArreglos = factura.subtotalArreglosLibres;

        for (const item of nuevosDetalles) {
          const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
          const precioUnitario = Math.max(0, Number(item.precioUnitario) || 0);
          const subtotalItem = Math.round(cantidad * precioUnitario * 100) / 100;

          if (item.esServicioLibre || !item.productoId) {
            nuevoSubtotalArreglos += subtotalItem;
            await tx.detalleFactura.create({
              data: {
                facturaId: factura.id,
                esServicioLibre: true,
                descripcionLibre: item.descripcionLibre || "Arreglo adicional de sastrería",
                cantidad,
                precioUnitario,
                subtotal: subtotalItem,
              },
            });
          } else {
            nuevoSubtotalProductos += subtotalItem;
            await tx.detalleFactura.create({
              data: {
                facturaId: factura.id,
                productoId: item.productoId,
                esServicioLibre: false,
                cantidad,
                precioUnitario,
                subtotal: subtotalItem,
              },
            });
          }
        }

        const nuevoTotalFactura = Math.round((nuevoSubtotalProductos + nuevoSubtotalArreglos) * 100) / 100;
        const nuevoSaldoPendiente = Math.max(
          0,
          Math.round((nuevoTotalFactura - factura.totalAbonado) * 100) / 100
        );

        let nuevoEstado = estado || factura.estado;
        if (nuevoSaldoPendiente > 0 && nuevoEstado === EstadoFactura.CERRADA) {
          nuevoEstado = EstadoFactura.ACTIVA;
        }

        const facturaActualizada = await tx.factura.update({
          where: { id: factura.id },
          data: {
            subtotalProductos: nuevoSubtotalProductos,
            subtotalArreglosLibres: nuevoSubtotalArreglos,
            totalFactura: nuevoTotalFactura,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado,
            notas: notas !== undefined ? notas : factura.notas,
          },
          include: {
            cliente: true,
            detalles: {
              include: { producto: true },
            },
            abonos: {
              include: { cajero: true },
            },
          },
        });

        return NextResponse.json({
          success: true,
          mensaje: "Factura actualizada exitosamente con los nuevos ítems",
          factura: facturaActualizada,
        });
      });
    }

    // Actualización simple de estado o notas
    const dataUpdate: Record<string, unknown> = {};
    if (estado && Object.values(EstadoFactura).includes(estado)) {
      dataUpdate.estado = estado;
    }
    if (notas !== undefined) {
      dataUpdate.notas = notas;
    }

    const facturaActualizada = await prisma.factura.update({
      where: { id: factura.id },
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
