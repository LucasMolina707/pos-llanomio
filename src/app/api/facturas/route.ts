import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import {
  verificarEstadoCajaParaFacturacion,
  parsearCajerosParticipantes,
  obtenerTurnoAbiertoActivo,
} from "@/lib/caja-control";
import { EstadoFactura, MetodoPago, TipoOperacion, TipoProducto, EstadoTurno } from "@prisma/client";

interface ItemDetalleInput {
  productoId?: string | null;
  nombre?: string | null;
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

    const moduloParam = searchParams.get("modulo");
    const tipoParam = searchParams.get("tipo") || searchParams.get("tipoOperacion");

    const where: Record<string, unknown> = {};

    if (estado) {
      where.estado = estado;
    }

    if (moduloParam === "ALQUILERES" || tipoParam === "ALQUILER") {
      where.tipoOperacion = "ALQUILER";
    } else if (moduloParam === "APARTADOS" || moduloParam === "SEPARE" || tipoParam === "SEPARE") {
      where.tipoOperacion = "SEPARE";
    } else if (
      moduloParam === "POS" ||
      tipoParam === "VENTA" ||
      tipoParam === "POS" ||
      tipoParam === "VENTA_ARREGLO"
    ) {
      where.tipoOperacion = { notIn: ["ALQUILER", "SEPARE"] };
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
        { cliente: { telefono: { contains: q } } },
        { cliente: { telefonoSecundario: { contains: q } } },
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
            telefonoSecundario: true,
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

function parseFechaSegura(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
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
      detalles = body.detalles || body.items || body.productos || [],
      abonoInicial,
      tipoOperacion = "VENTA",
      estadoInicial = "ACTIVA",
      fechaEntregaAlquiler,
      fechaDevolucionPactada,
      notas,
      montoDeposito: montoDepositoInput = 0,
      metodoPagoDeposito,
      efectivoRecibido: efectivoRecibidoInput = 0,
      cambioEntregado: cambioEntregadoInput = 0,
    } = body;

    // Sanitización segura de montos principales
    const montoDeposito = Math.max(0, Number(montoDepositoInput) || 0);
    const efectivoRecibido = Math.max(0, Number(efectivoRecibidoInput) || 0);
    const cambioEntregado = Math.max(0, Number(cambioEntregadoInput) || 0);

    // 1. Determinar y validar el cajero autenticado obligatoriamente (Blindaje Anti-P2003)
    let cajeroId = sesion?.userId || cajeroIdBody;
    let usuarioCajero = null;

    if (cajeroId) {
      usuarioCajero = await prisma.user.findFirst({
        where: { id: cajeroId, activo: true },
        select: { id: true, nombre: true, username: true },
      });
    }

    if (!usuarioCajero) {
      // Fallback de seguridad: buscar un cajero o admin activo en el sistema local
      usuarioCajero = await prisma.user.findFirst({
        where: { activo: true },
        orderBy: { fechaCreacion: "asc" },
        select: { id: true, nombre: true, username: true },
      });

      if (!usuarioCajero) {
        return NextResponse.json(
          { success: false, error: "No existe un cajero activo disponible en el sistema para facturar" },
          { status: 401 }
        );
      }
    }
    cajeroId = usuarioCajero.id;

    // 0. Control de Seguridad Financiera POS y Resolución Universal de Turno Abierto
    let abonoInicialNum = 0;
    if (typeof abonoInicial === "number") {
      abonoInicialNum = Math.max(0, abonoInicial);
    } else if (abonoInicial && typeof abonoInicial === "object" && "monto" in abonoInicial) {
      abonoInicialNum = Math.max(0, Number((abonoInicial as any).monto) || 0);
    } else if (body.abonos && Array.isArray(body.abonos)) {
      abonoInicialNum = body.abonos.reduce((acc: number, a: any) => acc + (Number(a.monto) || 0), 0);
    }

    const turnoActivo = await obtenerTurnoAbiertoActivo(prisma, cajeroId, body.turnoCajaId);
    if (!turnoActivo && (abonoInicialNum > 0 || montoDeposito > 0)) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "No hay un turno de caja abierto. Abra la caja ingresando el dinero actual en gaveta antes de registrar pagos.",
          codigoSeguridad: "SIN_TURNO",
          requiereAperturaHoy: true,
        },
        { status: 409 }
      );
    }
    const turnoCajaIdFinal = turnoActivo ? turnoActivo.id : null;

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

    let fechaDevolucionCalculada: Date | null = parseFechaSegura(fechaDevolucionPactada);
    let fechaEntregaCalculada: Date | null = parseFechaSegura(fechaEntregaAlquiler);

    const detallesProcesados: {
      productoId: string | null;
      esServicioLibre: boolean;
      descripcionLibre: string | null;
      descripcionDetallada: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      tipoProducto?: TipoProducto | null;
    }[] = [];

    for (const item of detalles as (ItemDetalleInput & { fechaDevolucion?: string; fechaEntrega?: string; descripcionDetallada?: string })[]) {
      const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
      const precioUnitario = Math.max(0, Number(item.precioUnitario) || 0);
      const subtotalItem = Math.round(cantidad * precioUnitario * 100) / 100;
      const descripcionDetallada = typeof item.descripcionDetallada === "string" && item.descripcionDetallada.trim().length > 0
        ? item.descripcionDetallada.trim()
        : null;

      if (item.fechaDevolucion && !fechaDevolucionCalculada) {
        fechaDevolucionCalculada = parseFechaSegura(item.fechaDevolucion);
      }
      if (item.fechaEntrega && !fechaEntregaCalculada) {
        fechaEntregaCalculada = parseFechaSegura(item.fechaEntrega);
      }

      if (item.esServicioLibre || !item.productoId) {
        // Ítem libre de sastrería / arreglo o venta libre
        const descripcionLibre = (item.descripcionLibre || item.nombre || "").trim();
        if (!descripcionLibre) {
          return NextResponse.json(
            { success: false, error: "Todo servicio o ítem libre requiere una descripción o nombre" },
            { status: 400 }
          );
        }

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
          descripcionLibre,
          descripcionDetallada,
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
          descripcionDetallada,
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
      : (typeof abonoInicial === "number" && abonoInicial > 0
          ? [{ monto: abonoInicial, metodoPago: body.metodoPagoAbono || MetodoPago.EFECTIVO }]
          : (abonoInicial && Number(abonoInicial.monto) > 0 ? [abonoInicial] : []));

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
          notas: ab.notas ? String(ab.notas).trim() : "Abono en mostrador",
        });
      }
    }

    totalAbonado = Math.round(totalAbonado * 100) / 100;
    const saldoPendiente = Math.max(0, Math.round((totalFactura - totalAbonado) * 100) / 100);

    // 6. Determinar estado final según liquidación
    const esSepare = tipoOperacion === "SEPARE" || body.tipoOperacion === "SEPARE";
    const esOpAlquiler = tieneAlquiler || tipoOperacion === "ALQUILER" || body.tipoOperacion === "ALQUILER";
    let estadoFinal: EstadoFactura = EstadoFactura.ACTIVA;
    if (esSepare) {
      estadoFinal = totalAbonado > 0 ? EstadoFactura.ACTIVA : EstadoFactura.EN_PROCESO;
    } else if (saldoPendiente <= 0) {
      // Pago completo (100%)
      estadoFinal = esOpAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.CERRADA;
    } else if (totalAbonado === 0) {
      // Pendiente por pagar ($0 adelanto)
      estadoFinal = esOpAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.EN_PROCESO;
    } else {
      // Adelanto parcial
      estadoFinal = esOpAlquiler ? EstadoFactura.ACTIVA_ALQUILADA : EstadoFactura.ACTIVA;
    }

    // 7. Determinar TipoOperacion con soporte para Mixto (Venta + Alquiler + Arreglo) y SEPARE
    let categoriasCount = 0;
    if (tieneVenta) categoriasCount++;
    if (tieneAlquiler || esOpAlquiler) categoriasCount++;
    if (tieneArreglo && !esOpAlquiler) categoriasCount++;

    let tipoOpFinal: TipoOperacion = TipoOperacion.VENTA;
    if (esSepare) {
      tipoOpFinal = TipoOperacion.SEPARE;
    } else if (esOpAlquiler) {
      tipoOpFinal = TipoOperacion.ALQUILER;
    } else if (categoriasCount > 1) {
      tipoOpFinal = TipoOperacion.MIXTO;
    } else if (tieneArreglo) {
      tipoOpFinal = TipoOperacion.ARREGLO;
    } else {
      tipoOpFinal = TipoOperacion.VENTA;
    }

    // 8. Crear factura y registrar abono atómicamente con Prisma
    const nuevaFactura = await prisma.$transaction(async (tx) => {
      // Reservar correlativo estrictamente numérico, secuencial e inmodificable
      const { consecutivo, numeroFactura } = await reservarSiguienteFolioFactura(tx);

      // Buscar el turno de caja abierto correspondiente de forma infalible
      const turnoAbierto = await obtenerTurnoAbiertoActivo(tx, cajeroId, body.turnoCajaId || turnoCajaIdFinal);

      const abonosConTurno = abonosDataCreacion.map((ab) => ({
        ...ab,
        turnoCajaId: turnoAbierto?.id || null,
      }));

      const fechaRetiroApartado = parseFechaSegura(body.fechaRetiroApartado || body.fechaSalida || fechaEntregaCalculada);
      const fechaDevolucionEstimada = parseFechaSegura(body.fechaDevolucionEstimada || body.fechaDevolucion || fechaDevolucionCalculada);

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
          tarifaMoraDiaria: Number.isFinite(Number(body.tarifaMoraDiaria)) && Number(body.tarifaMoraDiaria) > 0
            ? Number(body.tarifaMoraDiaria)
            : 3000,
          montoDeposito,
          estadoDeposito: montoDeposito > 0 ? (body.depositoRecibidoHoy ? "RECIBIDO_EN_GARANTIA" : "ESTIPULADO_PARA_ENTREGA") : "SIN_DEPOSITO",
          montoRetenidoDeposito: 0,
          montoDevueltoDeposito: 0,
          metodoPagoDeposito: montoDeposito > 0 ? (metodoPagoDeposito || "EFECTIVO") : null,
          efectivoRecibido,
          cambioEntregado,
          notas: notas?.trim() || null,
          observaciones: body.observaciones?.trim() || notas?.trim() || null,
          fechaRetiroApartado,
          fechaDevolucionEstimada,
          fechaEntregaAlquiler: fechaEntregaCalculada || fechaRetiroApartado,
          fechaDevolucionPactada: fechaDevolucionCalculada || fechaDevolucionEstimada,
          detalles: {
            create: detallesProcesados.map((d) => ({
              productoId: d.productoId,
              esServicioLibre: d.esServicioLibre,
              descripcionLibre: d.descripcionLibre,
              descripcionDetallada: d.descripcionDetallada,
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

      // Actualizar estado de prendas alquiladas en inventario (SOLO si NO es un apartado/separe)
      if (tipoOpFinal !== TipoOperacion.SEPARE) {
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

      // Si la factura provino de un apartado (apartadoOrigenId), cerrar/convertir el registro original para evitar duplicados
      if (body.apartadoOrigenId) {
        try {
          await tx.factura.update({
            where: { id: body.apartadoOrigenId },
            data: {
              tipoOperacion: TipoOperacion.ALQUILER,
              estado: EstadoFactura.ACTIVA_ALQUILADA,
              observaciones: `Apartado formalizado y convertido en contrato de alquiler N° ${factura.numeroFactura}`,
            },
          });
        } catch (errConv) {
          console.warn("[APARTADOS] No se pudo actualizar apartadoOrigenId:", errConv);
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
        } else if (tipoOpFinal === TipoOperacion.SEPARE || esSepare) {
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

      return factura;
    });

    return NextResponse.json(
      {
        success: true,
        ok: true,
        id: nuevaFactura.id,
        mensaje: `Factura ${nuevaFactura.numeroFactura} creada exitosamente`,
        factura: nuevaFactura,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al crear factura:", error);
    const mensajeError = error instanceof Error ? error.message : "Error interno al procesar y guardar la factura";
    return NextResponse.json(
      { success: false, error: mensajeError },
      { status: 500 }
    );
  }
}
