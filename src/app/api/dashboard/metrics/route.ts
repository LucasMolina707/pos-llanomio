import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda } from "@prisma/client";
import { obtenerFechaColombiaStr } from "@/lib/caja-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/dashboard/metrics
 * Endpoint optimizado sin caché para telemetría gerencial en tiempo real.
 * Procesa en milisegundos los ingresos, cartera, moras, prendas y rendimiento en SQLite.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    const fechaHoyLocal = obtenerFechaColombiaStr();

    // Rango por defecto: últimos 30 días en hora Colombia
    let fechaDesde: Date;
    let fechaHasta: Date;

    if (desdeStr) {
      fechaDesde = new Date(`${desdeStr}T00:00:00.000`);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fechaDesde = new Date(`${obtenerFechaColombiaStr(d)}T00:00:00.000`);
    }

    if (hastaStr) {
      fechaHasta = new Date(`${hastaStr}T23:59:59.999`);
    } else {
      fechaHasta = new Date(`${fechaHoyLocal}T23:59:59.999`);
    }

    // 1. Consultar facturas en el rango seleccionado
    const facturas = await prisma.factura.findMany({
      where: {
        fechaCreacion: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            documento: true,
            telefono: true,
          },
        },
        usuarioCajero: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                tipo: true,
                nombre: true,
              },
            },
          },
        },
        abonos: {
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            fecha: true,
          },
        },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    // 2. Consultar abonos registrados en el rango
    const abonos = await prisma.abono.findMany({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      select: {
        id: true,
        monto: true,
        metodoPago: true,
        fecha: true,
      },
    });

    // 3. Consultar turno de caja activo en el momento
    const turnoActivo = await prisma.turnoCaja.findFirst({
      where: { estado: "ABIERTO" },
      include: {
        usuarioCajero: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
      },
      orderBy: { fechaApertura: "desc" },
    });

    // 4. Cálculos precisos de ingresos por método de pago
    let ingresosNetos = 0;
    let totalEfectivo = 0;
    let totalNequi = 0;
    let totalDaviplata = 0;
    let totalBancolombia = 0;
    let totalLlave = 0;
    let totalTransferencia = 0;
    let totalConsignacion = 0;

    for (const a of abonos) {
      const m = Number(a.monto) || 0;
      ingresosNetos += m;

      switch (a.metodoPago) {
        case MetodoPago.EFECTIVO:
          totalEfectivo += m;
          break;
        case MetodoPago.NEQUI:
          totalNequi += m;
          break;
        case MetodoPago.DAVIPLATA:
          totalDaviplata += m;
          break;
        case MetodoPago.BANCOLOMBIA:
          totalBancolombia += m;
          break;
        case MetodoPago.LLAVE:
          totalLlave += m;
          break;
        case MetodoPago.TRANSFERENCIA:
          totalTransferencia += m;
          break;
        case MetodoPago.CONSIGNACION:
          totalConsignacion += m;
          break;
        default:
          totalEfectivo += m;
          break;
      }
    }

    // 5. Cálculos de líneas de negocio y cartera
    let cuentasPorCobrar = 0;
    let morasRecaudadas = 0;
    let totalPrendasAlquiladas = 0;
    let rendimientoSastreria = 0;
    let rendimientoVentas = 0;
    let rendimientoAlquileres = 0;

    for (const f of facturas) {
      if (f.estado !== EstadoFactura.CERRADA) {
        cuentasPorCobrar += f.saldoPendiente || 0;
      }

      morasRecaudadas += f.recargoMoraAcumulado || 0;
      rendimientoSastreria += f.subtotalArreglosLibres || 0;

      for (const d of f.detalles) {
        const cantidad = d.cantidad || 1;
        const subtotal = d.subtotal || 0;

        if (d.producto && d.producto.tipo === TipoProducto.ALQUILER) {
          totalPrendasAlquiladas += cantidad;
          rendimientoAlquileres += subtotal;
        } else if (d.producto && d.producto.tipo === TipoProducto.VENTA) {
          rendimientoVentas += subtotal;
        } else if (d.esServicioLibre) {
          // Arreglo o servicio libre ya sumado
        }
      }
    }

    // Prendas actualmente alquiladas fuera de la tienda (en general)
    const prendasAlquiladasActivas = await prisma.producto.count({
      where: {
        tipo: TipoProducto.ALQUILER,
        estadoPrenda: EstadoPrenda.ALQUILADO,
      },
    });

    const totalDigital = totalNequi + totalDaviplata + totalBancolombia + totalLlave + totalTransferencia + totalConsignacion;

    const desgloseMetodos = {
      totalEfectivo: Math.round(totalEfectivo * 100) / 100,
      totalNequi: Math.round(totalNequi * 100) / 100,
      totalDaviplata: Math.round(totalDaviplata * 100) / 100,
      totalBancolombia: Math.round(totalBancolombia * 100) / 100,
      totalLlave: Math.round(totalLlave * 100) / 100,
      totalTransferencia: Math.round((totalTransferencia + totalConsignacion) * 100) / 100,
      totalDigital: Math.round(totalDigital * 100) / 100,
    };

    const desgloseLineas = {
      alquileres: Math.round(rendimientoAlquileres * 100) / 100,
      ventas: Math.round(rendimientoVentas * 100) / 100,
      sastreria: Math.round(rendimientoSastreria * 100) / 100,
    };

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        rango: {
          desde: fechaDesde.toISOString(),
          hasta: fechaHasta.toISOString(),
          desdeLocal: desdeStr || obtenerFechaColombiaStr(fechaDesde),
          hastaLocal: hastaStr || obtenerFechaColombiaStr(fechaHasta),
        },
        metricas: {
          ingresosNetos: Math.round(ingresosNetos * 100) / 100,
          cuentasPorCobrar: Math.round(cuentasPorCobrar * 100) / 100,
          morasRecaudadas: Math.round(morasRecaudadas * 100) / 100,
          totalPrendasAlquiladas,
          prendasAlquiladasActivas,
          rendimientoSastreria: Math.round(rendimientoSastreria * 100) / 100,
          rendimientoVentas: Math.round(rendimientoVentas * 100) / 100,
          rendimientoAlquileres: Math.round(rendimientoAlquileres * 100) / 100,
          totalFacturas: facturas.length,
          totalAbonos: abonos.length,
        },
        desgloseMetodos,
        desgloseMetodosPago: desgloseMetodos,
        desgloseLineas,
        desgloseLineasNegocio: desgloseLineas,
        turnoActual: turnoActivo
          ? {
              id: turnoActivo.id,
              fechaApertura: turnoActivo.fechaApertura.toISOString(),
              baseInicial: turnoActivo.baseInicialEfectivo,
              cajero: turnoActivo.usuarioCajero.nombre,
            }
          : null,
        ultimasFacturas: facturas.slice(0, 10).map((f) => ({
          id: f.id,
          numeroFactura: f.numeroFactura,
          clienteNombre: f.cliente?.nombre || "Consumidor Final",
          tipoOperacion: f.tipoOperacion,
          estado: f.estado,
          totalFactura: f.totalFactura,
          totalAbonado: f.totalAbonado,
          saldoPendiente: f.saldoPendiente,
          fechaCreacion: f.fechaCreacion.toISOString(),
        })),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al calcular métricas en tiempo real:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al calcular telemetría gerencial",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
