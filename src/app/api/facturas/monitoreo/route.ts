import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMoraDeFactura, sincronizarMorasEnBaseDeDatos } from "@/lib/cron-moras";
import { EstadoFactura } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/facturas/monitoreo
 * Retorna las facturas con análisis dinámico de moras, retrasos y clasificación
 * en las 4 pestañas de cartera: Pendientes al día, Mora + Saldo, Solo Mora (prendas sin devolver), y Paz y Salvos.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pestana = (searchParams.get("pestana") || searchParams.get("estado") || "CAJA_ALQUILER").toUpperCase();
    const soloMoraFiltro = searchParams.get("soloMora") === "true";
    const q = searchParams.get("q")?.trim() || "";
    const clienteId = searchParams.get("clienteId")?.trim() || "";
    const sincronizar = searchParams.get("sync") === "true";

    const moduloParam = searchParams.get("modulo");
    const tipoParam = searchParams.get("tipo") || searchParams.get("tipoOperacion");

    // Si se solicita sincronización forzada en BD
    if (sincronizar) {
      await sincronizarMorasEnBaseDeDatos();
    }

    const where: Record<string, unknown> = {};

    if (moduloParam === "ALQUILERES" || tipoParam === "ALQUILER") {
      where.tipoOperacion = "ALQUILER";
    } else if (moduloParam === "APARTADOS" || tipoParam === "SEPARE") {
      where.tipoOperacion = "SEPARE";
    } else if (
      moduloParam === "POS" ||
      tipoParam === "VENTA" ||
      tipoParam === "POS" ||
      tipoParam === "VENTA_ARREGLO"
    ) {
      where.tipoOperacion = { not: "ALQUILER" };
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

    // Traer todas las facturas con sus relaciones
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
          include: {
            cajero: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: { fecha: "desc" },
        },
      },
    });

    const ahora = new Date();

    // Procesar cada factura con el motor dinámico de moras
    const facturasProcesadas = facturas.map((fac) => {
      const calculo = calcularMoraDeFactura(fac, ahora);

      const saldoBase = Math.max(
        0,
        Math.round(((fac.totalFactura || 0) - (fac.totalAbonado || 0)) * 100) / 100
      );
      const recargoMora = Math.round(calculo.recargoMoraCalculado * 100) / 100;
      const totalExigible = Math.round((saldoBase + recargoMora) * 100) / 100;

      const prendaSinEntregar =
        (fac.tipoOperacion === "ALQUILER" || fac.tipoOperacion === "MIXTO") &&
        !fac.fechaDevolucionReal &&
        !!fac.fechaDevolucionPactada &&
        new Date(fac.fechaDevolucionPactada) < ahora;

      const estaCerrada =
        fac.estado === EstadoFactura.CERRADA ||
        (saldoBase === 0 && recargoMora === 0 && !prendaSinEntregar);

      // Clasificación en las 4 Vistas Oficiales del Sistema
      const esCajaAlquiler =
        fac.tipoOperacion === "ALQUILER" &&
        !fac.fechaDevolucionReal &&
        fac.estado !== EstadoFactura.CERRADA;

      const esApartado =
        (fac.tipoOperacion === "SEPARE" || (fac.tipoOperacion as string) === "APARTADO") &&
        fac.estado !== EstadoFactura.CERRADA;

      const esAlquilerFinalizado =
        fac.tipoOperacion === "ALQUILER" &&
        (fac.estado === EstadoFactura.CERRADA || Boolean(fac.fechaDevolucionReal));

      const esPazYSalvoVenta =
        fac.tipoOperacion !== "ALQUILER" &&
        fac.tipoOperacion !== "SEPARE";

      // Clasificación retrocompatible anterior
      const esSoloMora =
        !estaCerrada && saldoBase === 0 && (recargoMora > 0 || prendaSinEntregar);
      const esMoraYSaldo =
        !estaCerrada && saldoBase > 0 && recargoMora > 0;
      const esPendienteAlDia =
        !estaCerrada && saldoBase > 0 && recargoMora === 0;
      const esPazYSalvo = estaCerrada || (saldoBase === 0 && recargoMora === 0 && !prendaSinEntregar);

      // Prenda principal para mensajes y resúmenes
      const prendaPrincipal =
        fac.detalles.find((d) => d.producto)?.producto?.nombre ||
        fac.detalles.find((d) => d.esServicioLibre)?.descripcionLibre ||
        "Traje / Prenda de Alquiler";

      return {
        ...fac,
        saldoBase,
        recargoMora,
        totalExigible,
        diasRetraso: calculo.diasRetraso,
        horasRetraso: calculo.horasRetraso,
        enMora: calculo.enMora && (recargoMora > 0 || calculo.diasRetraso > 0),
        prendasEnMora: calculo.prendasEnMora,
        prendaPrincipal,
        // Flags de las 4 Vistas Oficiales
        esCajaAlquiler,
        esApartado,
        esAlquilerFinalizado,
        esPazYSalvoVenta,
        // Flags retrocompatibles
        esPendienteAlDia,
        esMoraYSaldo,
        esSoloMora,
        esPazYSalvo,
      };
    });

    // Conteos exactos para las 4 Vistas Oficiales
    const conteoCajaAlquiler = facturasProcesadas.filter((f) => f.esCajaAlquiler).length;
    const conteoCajaAlquilerMora = facturasProcesadas.filter(
      (f) => f.esCajaAlquiler && (f.enMora || f.diasRetraso > 0)
    ).length;
    const conteoApartados = facturasProcesadas.filter((f) => f.esApartado).length;
    const conteoPazYSalvos = facturasProcesadas.filter((f) => f.esPazYSalvoVenta || f.esPazYSalvo).length;
    const conteoAlquileresFinalizados = facturasProcesadas.filter((f) => f.esAlquilerFinalizado).length;

    // Conteos legados
    const conteoPendientesAlDia = facturasProcesadas.filter((f) => f.esPendienteAlDia).length;
    const conteoMoraYSaldo = facturasProcesadas.filter((f) => f.esMoraYSaldo).length;
    const conteoSoloMora = facturasProcesadas.filter((f) => f.esSoloMora).length;

    const totalCarteraMora = Math.round(
      facturasProcesadas
        .filter((f) => f.enMora)
        .reduce((acc, curr) => acc + curr.recargoMora, 0) * 100
    ) / 100;

    const totalSaldoPendiente = Math.round(
      facturasProcesadas
        .filter((f) => !f.esPazYSalvo)
        .reduce((acc, curr) => acc + curr.totalExigible, 0) * 100
    ) / 100;

    // Filtrar según la pestaña activa seleccionada (4 Vistas Oficiales)
    let facturasFiltradas = facturasProcesadas;
    if (
      pestana === "CAJA_ALQUILER" ||
      pestana === "ALQUILER" ||
      pestana === "EN_ALQUILER" ||
      pestana === "ACTIVAS" ||
      pestana === "ACTIVA"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => {
        if (!f.esCajaAlquiler) return false;
        if (soloMoraFiltro) return f.enMora || f.diasRetraso > 0;
        return true;
      });
    } else if (
      pestana === "APARTADOS" ||
      pestana === "APARTADO" ||
      pestana === "SEPARE"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esApartado);
    } else if (
      pestana === "PAZ_Y_SALVOS" ||
      pestana === "PAZ_Y_SALVO" ||
      pestana === "VENTAS" ||
      pestana === "VENDIDOS"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esPazYSalvoVenta || f.esPazYSalvo);
    } else if (
      pestana === "ALQUILERES_FINALIZADOS" ||
      pestana === "FINALIZADOS" ||
      pestana === "CERRADAS" ||
      pestana === "CERRADA"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esAlquilerFinalizado);
    } else if (pestana === "PENDIENTES_AL_DIA" || pestana === "PENDIENTES") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esPendienteAlDia);
    } else if (pestana === "MORA_Y_SALDO" || pestana === "EN_MORA") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esMoraYSaldo);
    } else if (pestana === "SOLO_MORA") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esSoloMora);
    }

    return NextResponse.json(
      {
        success: true,
        estadisticas: {
          totalFacturas: facturasProcesadas.length,
          conteoCajaAlquiler,
          conteoCajaAlquilerMora,
          conteoApartados,
          conteoPazYSalvos,
          conteoAlquileresFinalizados,
          conteoPendientesAlDia,
          conteoMoraYSaldo,
          conteoSoloMora,
          totalCarteraMora,
          totalSaldoPendiente,
          totalAlertas: conteoCajaAlquilerMora,
          totalEnMora: conteoCajaAlquilerMora,
        },
        facturas: facturasFiltradas,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener monitoreo de facturas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el monitoreo de facturas" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
