import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMoraDeFactura, sincronizarMorasEnBaseDeDatos } from "@/lib/cron-moras";
import { EstadoFactura } from "@prisma/client";

/**
 * GET /api/facturas/monitoreo
 * Retorna las facturas con análisis dinámico de moras, retrasos y métricas de cartera
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") || "TODAS";
    const q = searchParams.get("q")?.trim() || "";
    const sincronizar = searchParams.get("sync") === "true";

    // Si se solicita sincronización forzada en BD
    if (sincronizar) {
      await sincronizarMorasEnBaseDeDatos();
    }

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { numeroFactura: { contains: q } },
        { cliente: { nombre: { contains: q } } },
        { cliente: { documento: { contains: q } } },
        { cliente: { telefono: { contains: q } } },
      ];
    }

    // Traer todas las facturas relevantes para calcular métricas y filtrar
    const facturas = await prisma.factura.findMany({
      where,
      orderBy: [{ fechaDevolucionPactada: "asc" }, { fechaCreacion: "desc" }],
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
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            fecha: true,
          },
          orderBy: { fecha: "desc" },
        },
      },
    });

    const ahora = new Date();

    // Procesar cada factura con el motor de moras
    const facturasProcesadas = facturas.map((fac) => {
      const calculo = calcularMoraDeFactura(fac, ahora);

      // Si tiene mora detectada en tiempo real pero aún no estaba como EN_MORA en BD
      const estadoEfectivo =
        calculo.enMora && calculo.recargoMoraCalculado > 0 && fac.estado !== EstadoFactura.CERRADA
          ? EstadoFactura.EN_MORA
          : fac.estado;

      const saldoPendienteEfectivo = calculo.enMora
        ? calculo.saldoConMora
        : fac.saldoPendiente;

      // Obtener nombre de la prenda principal (para el mensaje de WhatsApp)
      const prendaPrincipal =
        fac.detalles.find((d) => d.producto)?.producto?.nombre ||
        fac.detalles.find((d) => d.esServicioLibre)?.descripcionLibre ||
        "Traje / Prenda de Alquiler";

      return {
        ...fac,
        estado: estadoEfectivo,
        saldoPendiente: saldoPendienteEfectivo,
        recargoMoraCalculado: calculo.recargoMoraCalculado,
        diasRetraso: calculo.diasRetraso,
        horasRetraso: calculo.horasRetraso,
        enMora: calculo.enMora && calculo.recargoMoraCalculado > 0,
        prendasEnMora: calculo.prendasEnMora,
        prendaPrincipal,
      };
    });

    // Calcular estadísticas globales de monitoreo
    const conteoActivas = facturasProcesadas.filter(
      (f) => (f.estado === EstadoFactura.ACTIVA || f.estado === EstadoFactura.EN_PROCESO) && !f.enMora
    ).length;

    const conteoEnMora = facturasProcesadas.filter((f) => f.enMora || f.estado === EstadoFactura.EN_MORA).length;

    const conteoCerradas = facturasProcesadas.filter((f) => f.estado === EstadoFactura.CERRADA).length;

    const totalCarteraMora = Math.round(
      facturasProcesadas
        .filter((f) => f.enMora || f.estado === EstadoFactura.EN_MORA)
        .reduce((acc, curr) => acc + curr.recargoMoraCalculado, 0) * 100
    ) / 100;

    const totalSaldoPendiente = Math.round(
      facturasProcesadas
        .filter((f) => f.estado !== EstadoFactura.CERRADA)
        .reduce((acc, curr) => acc + curr.saldoPendiente, 0) * 100
    ) / 100;

    // Aplicar filtro de pestaña solicitada
    let facturasFiltradas = facturasProcesadas;
    if (estado === "ACTIVAS" || estado === "ACTIVA") {
      facturasFiltradas = facturasProcesadas.filter(
        (f) => (f.estado === EstadoFactura.ACTIVA || f.estado === EstadoFactura.EN_PROCESO) && !f.enMora
      );
    } else if (estado === "EN_MORA") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.enMora || f.estado === EstadoFactura.EN_MORA);
    } else if (estado === "CERRADAS" || estado === "CERRADA") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.estado === EstadoFactura.CERRADA);
    }

    return NextResponse.json({
      success: true,
      estadisticas: {
        totalFacturas: facturasProcesadas.length,
        conteoActivas,
        conteoEnMora,
        conteoCerradas,
        totalCarteraMora,
        totalSaldoPendiente,
      },
      facturas: facturasFiltradas,
    });
  } catch (error: unknown) {
    console.error("Error al obtener monitoreo de facturas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el monitoreo de facturas" },
      { status: 500 }
    );
  }
}
