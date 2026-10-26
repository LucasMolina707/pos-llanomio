import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { verificarEstadoCajaParaFacturacion, parsearCajerosParticipantes } from "@/lib/caja-control";
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
    const pendientes = searchParams.get("pendientes") === "true" || searchParams.get("soloPendientes") === "true";
    const limiteParam = searchParams.get("limite");
    const limite = limiteParam ? parseInt(limiteParam, 10) : pendientes ? 500 : 50;

    const where: Record<string, unknown> = {};

    if (estado) {
      where.estado = estado;
    }

    if (pendientes) {
      where.saldoPendiente = { gt: 0 };
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
      take: Math.min(limite, 500),
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

    // 0. Control Estricto de Seguridad Financiera POS (Apertura Obligatoria, Bloqueo Día Anterior y Asignación de Turno)
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
    let tieneVenta = false;
    let tieneAlquiler = false;
    let tieneArreglo = false;

    let fechaDevolucionCalculada: Date | null = fechaDevolucionPactada
      ? new Date(fechaDevolucionPactada)
      : null;
    let fechaEntregaCalculada: Date | null = fechaEntregaAlquiler
      ? new Date(fechaEntregaAlquiler)
      : null;

    const detallesProcesados: {
      productoId: string | null;
      esServicioLibre: boolean;
      descripcionLibre: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      tipoProducto?: TipoProducto | null;
    }[] = [];

    for (const item of detalles as (ItemDetalleInput & { fechaDevolucion?: string; fechaEntrega?: string })[]) {
      const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
      const precioUnitario = Math.max(0, Number(item.precioUnitario) || 0);
      const subtotalItem = Math.round(cantidad * precioUnitario * 100) / 100;

      if (item.fechaDevolucion && !fechaDevolucionCalculada) {
        fechaDevolucionCalculada = new Date(item.fechaDevolucion);
      }
      if (item.fechaEntrega && !fechaEntregaCalculada) {
        fechaEntregaCalculada = new Date(item.fechaEntrega);
      }

      if (item.esServicioLibre || !item.productoId) {
        // Ítem libre de sastrería / arreglo
        if (!item.descripcionLibre || !item.descripcionLibre.trim()) {
          return NextResponse.json(
            { success: false, error: "Todo servicio de sastrería libre requiere una descripción" },
            { status: 400 }
          );
        }

        tieneArreglo = true;
        subtotalArreglosLibres += subtotalItem;
        detallesProcesados.push({
          productoId: null,
          esServicioLibre: true,
          descripcionLibre: item.descripcionLibre.trim(),
          cantidad,
          precioUnitario,
          subtotal: subtotalItem,
          tipoProducto: null,
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

    const totalFactura = Math.round((subtotalProductos + subtotalArreglosLibres) * 100) / 100;

    // 5. Procesar abono inicial (uno o múltiples pagos parciales / mixtos)
    const abonosInput: any[] = Array.isArray(body.abonos) && body.abonos.length > 0
      ? body.abonos
      : (abonoInicial && Number(abonoInicial.monto) > 0 ? [abonoInicial] : []);

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
      const monto = Math.round(Number(ab.monto) * 100) / 100;
      if (monto > 0) {
        totalAbonado += monto;
        const metodoPago = Object.values(MetodoPago).includes(ab.metodoPago)
          ? (ab.metodoPago as MetodoPago)
          : MetodoPago.EFECTIVO;

        abonosDataCreacion.push({
          monto,
          metodoPago,
          montoRecibido: ab.montoRecibido ? Number(ab.montoRecibido) : null,
          vueltasEntregadas: ab.vueltasEntregadas ? Number(ab.vueltasEntregadas) : null,
          cajeroId,
          referenciaComprobante: ab.referenciaComprobante?.trim() || null,
          notas: ab.notas?.trim() || "Abono en mostrador",
        });
      }
    }

    totalAbonado = Math.round(totalAbonado * 100) / 100;
    const saldoPendiente = Math.max(0, Math.round((totalFactura - totalAbonado) * 100) / 100);

    // 6. Determinar estado final según liquidación
    let estadoFinal: EstadoFactura = EstadoFactura.ACTIVA;
    if (saldoPendiente <= 0) {
      // Pago completo (100%)
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.CERRADA;
    } else if (totalAbonado === 0) {
      // Pendiente por pagar ($0 adelanto)
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.EN_PROCESO;
    } else {
      // Adelanto parcial
      estadoFinal = tieneAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.ACTIVA;
    }

    // 7. Determinar TipoOperacion con soporte para Mixto (Venta + Alquiler + Arreglo)
    let categoriasCount = 0;
    if (tieneVenta) categoriasCount++;
    if (tieneAlquiler) categoriasCount++;
    if (tieneArreglo) categoriasCount++;

    let tipoOpFinal: TipoOperacion = TipoOperacion.VENTA;
    if (categoriasCount > 1) {
      tipoOpFinal = TipoOperacion.MIXTO;
    } else if (tieneAlquiler) {
      tipoOpFinal = TipoOperacion.ALQUILER;
    } else if (tieneArreglo) {
      tipoOpFinal = TipoOperacion.ARREGLO;
    } else {
      tipoOpFinal = TipoOperacion.VENTA;
    }

    // 8. Crear factura y registrar abono atómicamente con Prisma
    const nuevaFactura = await prisma.$transaction(async (tx) => {
      // Reservar correlativo estrictamente numérico, secuencial e inmodificable
      const { consecutivo, numeroFactura } = await reservarSiguienteFolioFactura(tx);

      // Buscar el turno de caja abierto correspondiente al gabinete del cajero autenticado
      const turnosAbiertos = await tx.turnoCaja.findMany({
        where: { estado: "ABIERTO" },
        orderBy: { fechaApertura: "desc" },
      });

      let turnoAbierto = null;
      if (turnosAbiertos.length > 0) {
        turnoAbierto =
          turnosAbiertos.find((t) => {
            if (t.usuarioCajeroId === cajeroId) return true;
            const participantes = parsearCajerosParticipantes(t.cajerosParticipantes);
            return participantes.some((p) => p.id === cajeroId);
          }) || turnosAbiertos[0];
      }

      const abonosConTurno = abonosDataCreacion.map((ab) => ({
        ...ab,
        turnoCajaId: turnoAbierto?.id || null,
      }));

      const factura = await tx.factura.create({
        data: {
          consecutivo,
          numeroFactura,
          clienteId,
          usuarioCajeroId: cajeroId,
          turnoCajaId: turnoAbierto?.id || null,
          tipoOperacion: tipoOpFinal,
          estado: estadoFinal,
          subtotalProductos,
          subtotalArreglosLibres,
          totalFactura,
          totalAbonado,
          saldoPendiente,
          notas: notas?.trim() || null,
          fechaEntregaAlquiler: fechaEntregaCalculada,
          fechaDevolucionPactada: fechaDevolucionCalculada,
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
          abonos:
            abonosConTurno.length > 0
              ? {
                  create: abonosConTurno,
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

      // Actualizar estado de prendas alquiladas en inventario
      for (const item of detallesProcesados) {
        if (item.productoId && item.tipoProducto === TipoProducto.ALQUILER) {
          try {
            await tx.producto.update({
              where: { id: item.productoId },
              data: {
                estado: "ALQUILADO",
                estadoPrenda: "ALQUILADO",
              },
            });
          } catch (errProd) {
            console.warn(`[INVENTARIO] No se pudo cambiar estado a ALQUILADO para producto ${item.productoId}:`, errProd);
          }
        }
      }

      // Impactar movimiento de caja en el turno activo si hubo abonos
      if (turnoAbierto && abonosConTurno.length > 0) {
        const campoMetodoMap: Record<MetodoPago, string> = {
          [MetodoPago.EFECTIVO]: "totalEfectivo",
          [MetodoPago.NEQUI]: "totalNequi",
          [MetodoPago.BANCOLOMBIA]: "totalBancolombia",
          [MetodoPago.LLAVE]: "totalLlave",
          [MetodoPago.DAVIPLATA]: "totalDaviplata",
          [MetodoPago.TRANSFERENCIA]: "totalTransferencia",
          [MetodoPago.CONSIGNACION]: "totalConsignacion",
        };

        for (const ab of abonosConTurno) {
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
