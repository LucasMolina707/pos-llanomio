import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoOperacion, MetodoPago, EstadoFactura, TipoProducto } from "@prisma/client";

/**
 * GET /api/admin/dashboard
 * Retorna las métricas gerenciales filtradas por rango de fechas
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    const fechaDesde = desdeStr ? new Date(`${desdeStr}T00:00:00.000`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaHasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : new Date();

    // 1. Consultar facturas en el rango de fechas
    const facturas = await prisma.factura.findMany({
      where: {
        fechaCreacion: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        cliente: true,
        usuarioCajero: true,
        detalles: {
          include: {
            producto: true,
          },
        },
        abonos: true,
      },
      orderBy: { fechaCreacion: "desc" },
    });

    // 2. Consultar todos los abonos registrados en el rango
    const abonos = await prisma.abono.findMany({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
    });

    // 3. Cálculos de métricas gerenciales
    let ingresosNetos = 0;
    let totalEfectivo = 0;
    let totalNequi = 0;
    let totalDaviplata = 0;
    let totalTransferencia = 0;

    for (const a of abonos) {
      const m = Number(a.monto) || 0;
      ingresosNetos += m;
      if (a.metodoPago === MetodoPago.EFECTIVO) totalEfectivo += m;
      else if (a.metodoPago === MetodoPago.NEQUI) totalNequi += m;
      else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += m;
      else if (a.metodoPago === MetodoPago.TRANSFERENCIA || a.metodoPago === MetodoPago.CONSIGNACION) totalTransferencia += m;
    }

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
      rendimientoVentas += f.subtotalProductos || 0;

      for (const d of f.detalles) {
        if (d.producto && d.producto.tipo === TipoProducto.ALQUILER) {
          totalPrendasAlquiladas += d.cantidad || 1;
          rendimientoAlquileres += d.subtotal || 0;
        }
      }
    }

    return NextResponse.json({
      success: true,
      rango: {
        desde: fechaDesde.toISOString(),
        hasta: fechaHasta.toISOString(),
      },
      metricas: {
        ingresosNetos: Math.round(ingresosNetos * 100) / 100,
        cuentasPorCobrar: Math.round(cuentasPorCobrar * 100) / 100,
        morasRecaudadas: Math.round(morasRecaudadas * 100) / 100,
        totalPrendasAlquiladas,
        rendimientoSastreria: Math.round(rendimientoSastreria * 100) / 100,
        totalFacturas: facturas.length,
      },
      desgloseMetodosPago: {
        totalEfectivo: Math.round(totalEfectivo * 100) / 100,
        totalNequi: Math.round(totalNequi * 100) / 100,
        totalDaviplata: Math.round(totalDaviplata * 100) / 100,
        totalTransferencia: Math.round(totalTransferencia * 100) / 100,
      },
      desgloseLineasNegocio: {
        alquileres: Math.round(rendimientoAlquileres * 100) / 100,
        ventas: Math.round((rendimientoVentas - rendimientoAlquileres) * 100) / 100,
        sastreria: Math.round(rendimientoSastreria * 100) / 100,
      },
      ultimasFacturas: facturas.slice(0, 10).map((f) => ({
        id: f.id,
        numeroFactura: f.numeroFactura,
        clienteNombre: f.cliente?.nombre,
        tipoOperacion: f.tipoOperacion,
        estado: f.estado,
        totalFactura: f.totalFactura,
        totalAbonado: f.totalAbonado,
        saldoPendiente: f.saldoPendiente,
        fechaCreacion: f.fechaCreacion,
      })),
    });
  } catch (error: unknown) {
    console.error("Error al obtener métricas del dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al calcular métricas gerenciales" },
      { status: 500 }
    );
  }
}
