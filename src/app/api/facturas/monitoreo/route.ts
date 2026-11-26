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
    const pestanaParam = searchParams.get("pestana") || searchParams.get("estado");
    const pestana = (pestanaParam || (searchParams.get("modulo") ? "TODOS" : "EN_ALQUILER")).toUpperCase();
    const soloMoraFiltro = searchParams.get("soloMora") === "true";
    const subfiltro = (searchParams.get("subfiltro") || searchParams.get("filtro") || "").toUpperCase();
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

    if (tipoParam === "ALQUILER" || (moduloParam === "ALQUILERES" && pestana !== "TODOS" && pestana !== "APARTADOS")) {
      where.tipoOperacion = "ALQUILER";
    } else if (tipoParam === "SEPARE" || (moduloParam === "APARTADOS" && pestana !== "TODOS")) {
      where.tipoOperacion = "SEPARE";
    } else if (tipoParam === "VENTA" || tipoParam === "VENTA_ARREGLO") {
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
      const esAnulada = fac.estado === EstadoFactura.ANULADA;
      const calculo = esAnulada
        ? { enMora: false, recargoMoraCalculado: 0, diasRetraso: 0, horasRetraso: 0, prendasEnMora: [] }
        : calcularMoraDeFactura(fac, ahora);

      const saldoBase = esAnulada
        ? 0
        : Math.max(
            0,
            Math.round(((fac.totalFactura || 0) - (fac.totalAbonado || 0)) * 100) / 100
          );
      const recargoMora = esAnulada ? 0 : Math.round(calculo.recargoMoraCalculado * 100) / 100;
      const totalExigible = esAnulada ? 0 : Math.round((saldoBase + recargoMora) * 100) / 100;

      const esAlquilerOp = fac.tipoOperacion === "ALQUILER";
      const esSepareOp = fac.tipoOperacion === "SEPARE" || (fac.tipoOperacion as string) === "APARTADO";
      const esVentaOp = !esAlquilerOp && !esSepareOp;

      // 1. Alquileres finalizados / cerrados: el traje ya regresó a la tienda (y no está anulada)
      const esAlquilerFinalizado =
        !esAnulada &&
        esAlquilerOp &&
        (fac.estado === EstadoFactura.CERRADA || Boolean(fac.fechaDevolucionReal));

      // 2. Alquileres activos ("En Alquiler"): trajes que actualmente están en poder del cliente
      const esCajaAlquiler =
        !esAnulada &&
        esAlquilerOp &&
        !fac.fechaDevolucionReal &&
        fac.estado !== EstadoFactura.CERRADA;

      // 3. Apartados activos: prendas reservadas en tienda esperando retiro
      const esApartado =
        !esAnulada &&
        esSepareOp &&
        fac.estado !== EstadoFactura.CERRADA;

      // Apartado vencido (fecha de retiro ya expiró)
      const fechaRetiroDate = fac.fechaRetiroApartado || fac.fechaDevolucionEstimada;
      const esApartadoVencido =
        esApartado &&
        Boolean(fechaRetiroDate) &&
        new Date(fechaRetiroDate!) < ahora;

      // Alquiler con fecha pactada vencida y traje aún sin regresar
      const prendaSinEntregar =
        esCajaAlquiler &&
        Boolean(fac.fechaDevolucionPactada) &&
        new Date(fac.fechaDevolucionPactada!) < ahora;

      // En mora activa con días corriendo
      const enMora =
        !esAnulada &&
        !esAlquilerFinalizado &&
        (calculo.enMora || prendaSinEntregar || calculo.diasRetraso > 0 || recargoMora > 0);

      // Venta saldada (100% pagada)
      const esPazYSalvoVenta =
        !esAnulada &&
        esVentaOp &&
        (fac.estado === EstadoFactura.CERRADA || saldoBase === 0);

      // Paz y Salvo general:
      // Si es alquiler: debe tener traje devuelto y estar sin saldo de mora ni canon
      // Si es venta: saldoBase === 0
      const esPazYSalvo =
        !esAnulada &&
        ((esAlquilerOp && esAlquilerFinalizado && saldoBase === 0 && recargoMora === 0) ||
          (esVentaOp && esPazYSalvoVenta));

      const estaCerrada =
        esAnulada ||
        fac.estado === EstadoFactura.CERRADA ||
        (esAlquilerFinalizado && saldoBase === 0) ||
        (esVentaOp && saldoBase === 0);

      // Retrocompatibilidad
      const esPendienteAlDia = esCajaAlquiler && !enMora;
      const esMoraYSaldo = esCajaAlquiler && enMora && saldoBase > 0;
      const esSoloMora = esCajaAlquiler && enMora && saldoBase === 0;

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
        enMora,
        esAnulada,
        prendasEnMora: calculo.prendasEnMora,
        prendaPrincipal,
        // Flags principales unificados
        esCajaAlquiler,
        esApartado,
        esApartadoVencido,
        esAlquilerFinalizado,
        esPazYSalvoVenta,
        esPazYSalvo,
        estaCerrada,
        // Flags retrocompatibles
        esPendienteAlDia,
        esMoraYSaldo,
        esSoloMora,
      };
    });

    // Conteos exactos para las vistas oficiales
    const conteoCajaAlquiler = facturasProcesadas.filter((f) => f.esCajaAlquiler).length;
    const conteoCajaAlquilerMora = facturasProcesadas.filter(
      (f) => f.esCajaAlquiler && (f.enMora || f.diasRetraso > 0)
    ).length;
    const conteoCajaAlquilerAlDia = Math.max(0, conteoCajaAlquiler - conteoCajaAlquilerMora);
    const conteoApartados = facturasProcesadas.filter((f) => f.esApartado).length;
    const conteoApartadosMora = facturasProcesadas.filter(
      (f) => f.esApartado && f.esApartadoVencido
    ).length;
    const conteoApartadosVigentes = Math.max(0, conteoApartados - conteoApartadosMora);
    const conteoAlquileresFinalizados = facturasProcesadas.filter((f) => f.esAlquilerFinalizado).length;
    const conteoPazYSalvos = facturasProcesadas.filter((f) => f.esPazYSalvo || f.esPazYSalvoVenta || f.esAlquilerFinalizado).length;
    const conteoPazYSalvoVentas = facturasProcesadas.filter((f) => f.esPazYSalvoVenta).length;
    const conteoAnuladas = facturasProcesadas.filter((f) => f.esAnulada).length;

    // Conteos legados
    const conteoPendientesAlDia = conteoCajaAlquilerAlDia;
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

    // Filtrar según la pestaña activa seleccionada
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
        if (soloMoraFiltro || subfiltro === "MORA" || subfiltro === "EN_MORA") {
          return f.enMora || f.diasRetraso > 0;
        }
        if (subfiltro === "AL_DIA" || subfiltro === "ALDIA") {
          return !f.enMora && f.diasRetraso <= 0;
        }
        return true;
      });
    } else if (
      pestana === "APARTADOS" ||
      pestana === "APARTADO" ||
      pestana === "SEPARE"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => {
        if (!f.esApartado) return false;
        if (subfiltro === "MORA" || subfiltro === "VENCIDOS") {
          return f.esApartadoVencido;
        }
        if (subfiltro === "VIGENTES" || subfiltro === "AL_DIA") {
          return !f.esApartadoVencido;
        }
        return true;
      });
    } else if (
      pestana === "PAZ_Y_SALVOS" ||
      pestana === "PAZ_Y_SALVO" ||
      pestana === "SALDADOS"
    ) {
      facturasFiltradas = facturasProcesadas.filter((f) => {
        if (subfiltro === "DEVUELTOS" || subfiltro === "ALQUILERES_DEVUELTOS") {
          return f.esAlquilerFinalizado;
        }
        if (subfiltro === "VENTAS" || subfiltro === "VENTAS_SALDADAS") {
          return f.esPazYSalvoVenta;
        }
        return f.esPazYSalvo || f.esAlquilerFinalizado || f.esPazYSalvoVenta;
      });
    } else if (
      pestana === "ALQUILERES_FINALIZADOS" ||
      pestana === "FINALIZADOS" ||
      pestana === "DEVUELTOS" ||
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
    } else if (pestana === "ANULADAS" || pestana === "ANULADA") {
      facturasFiltradas = facturasProcesadas.filter((f) => f.esAnulada);
    } else if (pestana === "TODOS" || pestana === "ALL") {
      facturasFiltradas = facturasProcesadas;
    }

    return NextResponse.json(
      {
        success: true,
        estadisticas: {
          totalFacturas: facturasProcesadas.length,
          conteoCajaAlquiler,
          conteoCajaAlquilerMora,
          conteoCajaAlquilerAlDia,
          conteoApartados,
          conteoApartadosMora,
          conteoApartadosVigentes,
          conteoPazYSalvos,
          conteoAlquileresFinalizados,
          conteoPazYSalvoVentas,
          conteoAnuladas,
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
