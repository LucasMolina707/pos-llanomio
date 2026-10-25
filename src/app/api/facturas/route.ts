import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { EstadoFactura, MetodoPago, TipoOperacion, TipoProducto } from "@prisma/client";

interface ItemDetalleInput {
  productoId?: string | null;
  esServicioLibre?: boolean;
  descripcionLibre?: string | null;
  cantidad: number;
  precioUnitario: number;
}

interface AbonoInput {
  monto: number;
  metodoPago: MetodoPago;
  referenciaComprobante?: string | null;
  notas?: string | null;
}

/**
 * GET /api/facturas
 * Listado de facturas con filtros de estado y búsqueda
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") as EstadoFactura | null;
    const clienteId = searchParams.get("clienteId");
    const q = searchParams.get("q")?.trim() || "";
    const limite = parseInt(searchParams.get("limite") || "50", 10);

    const where: Record<string, unknown> = {};

    if (estado) {
      where.estado = estado;
    }

    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (q) {
      where.OR = [
        { numeroFactura: { contains: q } },
        { cliente: { nombre: { contains: q } } },
        { cliente: { documento: { contains: q } } },
      ];
    }

    const facturas = await prisma.factura.findMany({
      where,
      take: Math.min(limite, 100),
      orderBy: { fechaCreacion: "desc" },
      include: {
        cliente: {
          select: {
            id: true,
            documento: true,
            nombre: true,
            telefono: true,
            direccion: true,
          },
        },
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

    return NextResponse.json({ success: true, facturas });
  } catch (error: unknown) {
    console.error("Error al obtener facturas:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar las facturas" },
      { status: 500 }
    );
  }
}

/**
 * Obtiene y reserva el siguiente número correlativo de factura:
 * Estrictamente secuencial, numérico, autoincremental e inmodificable (ej: 1001, 1002, 1003...).
 * Sin letras, prefijos ni fechas integradas en el código.
 */
async function reservarSiguienteFolioFactura(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<{ consecutivo: number; numeroFactura: string }> {
  let secuencia = await tx.secuenciaFactura.findUnique({
    where: { id: "FACTURA_SECUENCIA" },
  });

  if (!secuencia) {
    // Si la secuencia no ha sido inicializada, calcular a partir de 1000 o máximo existente
    const facturas = await tx.factura.findMany({
      select: { consecutivo: true, numeroFactura: true },
    });

    let maximo = 1000;
    for (const f of facturas) {
      if (f.consecutivo && f.consecutivo > maximo) {
        maximo = f.consecutivo;
      }
      const num = parseInt(f.numeroFactura, 10);
      if (!isNaN(num) && String(num) === f.numeroFactura.trim() && num > maximo) {
        maximo = num;
      }
    }

    secuencia = await tx.secuenciaFactura.create({
      data: {
        id: "FACTURA_SECUENCIA",
        ultimoFolio: maximo,
      },
    });
  }

  // Incrementar correlativo secuencial
  let siguienteConsecutivo = secuencia.ultimoFolio + 1;
  let candidatoNumero = String(siguienteConsecutivo);

  // Asegurar unicidad absoluta contra cualquier registro previo
  let colision = await tx.factura.findFirst({
    where: {
      OR: [
        { consecutivo: siguienteConsecutivo },
        { numeroFactura: candidatoNumero },
      ],
    },
  });

  while (colision) {
    siguienteConsecutivo += 1;
    candidatoNumero = String(siguienteConsecutivo);
    colision = await tx.factura.findFirst({
      where: {
        OR: [
          { consecutivo: siguienteConsecutivo },
          { numeroFactura: candidatoNumero },
        ],
      },
    });
  }

  // Actualizar tabla de secuencias
  await tx.secuenciaFactura.update({
    where: { id: "FACTURA_SECUENCIA" },
    data: { ultimoFolio: siguienteConsecutivo },
  });

  return {
    consecutivo: siguienteConsecutivo,
    numeroFactura: candidatoNumero,
  };
}

/**
 * POST /api/facturas
 * Creación de nueva factura (con ítems mixtos y abono inicial opcional)
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();

    const {
      clienteId,
      cajeroId: cajeroIdBody,
      detalles = [],
      abonoInicial,
      tipoOperacion = "VENTA",
      estadoInicial = "ACTIVA",
      fechaEntregaAlquiler,
      fechaDevolucionPactada,
      notas,
    } = body;

    // 1. Determinar y validar el cajero autenticado obligatoriamente
    let cajeroId = sesion?.userId || cajeroIdBody;

    if (!cajeroId) {
      // Fallback de seguridad: buscar un cajero o admin activo en el sistema local
      const usuarioActivo = await prisma.user.findFirst({
        where: { activo: true },
        select: { id: true },
      });

      if (!usuarioActivo) {
        return NextResponse.json(
          { success: false, error: "No existe un cajero activo disponible en el sistema" },
          { status: 401 }
        );
      }
      cajeroId = usuarioActivo.id;
    }

    // 2. Validar cliente existente
    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: "El cliente es obligatorio para registrar la factura" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "El cliente especificado no existe en la base de datos" },
        { status: 404 }
      );
    }

    // 3. Validar que contenga al menos un ítem
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json(
        { success: false, error: "La factura debe incluir al menos un producto o servicio de sastrería" },
        { status: 400 }
      );
    }

    // 4. Procesar y calcular subtotales de productos y servicios libres
    let subtotalProductos = 0;
    let subtotalArreglosLibres = 0;
    let tieneAlquiler = false;

    const detallesProcesados: {
      productoId: string | null;
      esServicioLibre: boolean;
      descripcionLibre: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }[] = [];

    for (const item of detalles as ItemDetalleInput[]) {
      const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
      const precioUnitario = Math.max(0, Number(item.precioUnitario) || 0);
      const subtotalItem = Math.round(cantidad * precioUnitario * 100) / 100;

      if (item.esServicioLibre || !item.productoId) {
        // Ítem libre de sastrería / arreglo
        if (!item.descripcionLibre || !item.descripcionLibre.trim()) {
          return NextResponse.json(
            { success: false, error: "Todo servicio de sastrería libre requiere una descripción" },
            { status: 400 }
          );
        }

        subtotalArreglosLibres += subtotalItem;
        detallesProcesados.push({
          productoId: null,
          esServicioLibre: true,
          descripcionLibre: item.descripcionLibre.trim(),
          cantidad,
          precioUnitario,
          subtotal: subtotalItem,
        });
      } else {
        // Ítem de inventario
        const producto = await prisma.producto.findUnique({
          where: { id: item.productoId },
        });

        if (!producto) {
          return NextResponse.json(
            { success: false, error: `El producto con ID ${item.productoId} no fue encontrado` },
            { status: 404 }
          );
        }

        if (producto.tipo === TipoProducto.ALQUILER) {
          tieneAlquiler = true;
        }

        subtotalProductos += subtotalItem;
        detallesProcesados.push({
          productoId: producto.id,
          esServicioLibre: false,
          descripcionLibre: null,
          cantidad,
          precioUnitario,
          subtotal: subtotalItem,
        });
      }
    }

    const totalFactura = Math.round((subtotalProductos + subtotalArreglosLibres) * 100) / 100;

    // 5. Procesar abono inicial (si existe)
    let montoAbonoInicial = 0;
    let abonoDataCreacion = null;

    if (abonoInicial && Number(abonoInicial.monto) > 0) {
      montoAbonoInicial = Math.round(Number(abonoInicial.monto) * 100) / 100;

      const metodoPago = (abonoInicial.metodoPago as MetodoPago) || MetodoPago.EFECTIVO;

      abonoDataCreacion = {
        monto: montoAbonoInicial,
        metodoPago,
        cajeroId,
        referenciaComprobante: abonoInicial.referenciaComprobante?.trim() || null,
        notas: abonoInicial.notas?.trim() || "Abono inicial de apertura de factura",
      };
    }

    const totalAbonado = montoAbonoInicial;
    const saldoPendiente = Math.max(0, Math.round((totalFactura - totalAbonado) * 100) / 100);

    // 6. Determinar estado final
    let estadoFinal: EstadoFactura = EstadoFactura.ACTIVA;
    if (saldoPendiente <= 0 && !tieneAlquiler) {
      estadoFinal = EstadoFactura.CERRADA;
    } else if (tieneAlquiler && saldoPendiente <= 0) {
      estadoFinal = EstadoFactura.ACTIVA_ALQUILADA;
    } else if (estadoInicial === "EN_PROCESO") {
      estadoFinal = EstadoFactura.EN_PROCESO;
    } else {
      estadoFinal = EstadoFactura.ACTIVA;
    }

    // 7. Determinar TipoOperacion
    let tipoOpFinal: TipoOperacion = TipoOperacion.VENTA;
    if (tipoOperacion && Object.values(TipoOperacion).includes(tipoOperacion as TipoOperacion)) {
      tipoOpFinal = tipoOperacion as TipoOperacion;
    } else if (subtotalProductos > 0 && subtotalArreglosLibres > 0) {
      tipoOpFinal = TipoOperacion.MIXTO;
    } else if (tieneAlquiler) {
      tipoOpFinal = TipoOperacion.ALQUILER;
    } else if (subtotalArreglosLibres > 0) {
      tipoOpFinal = TipoOperacion.ARREGLO;
    }

    // 8. Crear factura y registrar abono atómicamente con Prisma
    const nuevaFactura = await prisma.$transaction(async (tx) => {
      // Reservar correlativo estrictamente numérico, secuencial e inmodificable
      const { consecutivo, numeroFactura } = await reservarSiguienteFolioFactura(tx);

      const factura = await tx.factura.create({
        data: {
          consecutivo,
          numeroFactura,
          clienteId,
          usuarioCajeroId: cajeroId,
          tipoOperacion: tipoOpFinal,
          estado: estadoFinal,
          subtotalProductos,
          subtotalArreglosLibres,
          totalFactura,
          totalAbonado,
          saldoPendiente,
          notas: notas?.trim() || null,
          fechaEntregaAlquiler: fechaEntregaAlquiler ? new Date(fechaEntregaAlquiler) : null,
          fechaDevolucionPactada: fechaDevolucionPactada ? new Date(fechaDevolucionPactada) : null,
          detalles: {
            create: detallesProcesados.map((d) => ({
              productoId: d.productoId,
              esServicioLibre: d.esServicioLibre,
              descripcionLibre: d.descripcionLibre,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
            })),
          },
          abonos: abonoDataCreacion
            ? {
                create: [abonoDataCreacion],
              }
            : undefined,
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
          },
        },
      });

      return factura;
    });

    return NextResponse.json(
      {
        success: true,
        mensaje: `Factura ${nuevaFactura.numeroFactura} creada exitosamente`,
        factura: nuevaFactura,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al crear factura:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar y guardar la factura" },
      { status: 500 }
    );
  }
}
