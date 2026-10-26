import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { parsearCajerosParticipantes } from "@/lib/caja-control";
import { EstadoTurno } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Consulta Gerencial: Historial de Arqueos Multi-Periodo (Diario, Mensual, Anual)
 * Permite filtrar cierres y consolidar totales de recaudación, diferencias detectadas
 * y notas de novedad registradas.
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "Sesión requerida para consultar el historial de arqueos" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const periodo = (searchParams.get("periodo") || "DIARIO").toUpperCase(); // "DIARIO" | "MENSUAL" | "ANUAL"
    const fechaParam = searchParams.get("fecha"); // YYYY-MM-DD
    const mesParam = searchParams.get("mes"); // YYYY-MM
    const anioParam = searchParams.get("anio"); // YYYY
    const soloNovedades = searchParams.get("soloNovedades") === "true";
    const cajeroId = searchParams.get("cajeroId");

    const ahora = new Date();
    let fechaInicio: Date;
    let fechaFin: Date;
    let etiquetaPeriodo = "";

    if (periodo === "MENSUAL") {
      let anio = ahora.getFullYear();
      let mes = ahora.getMonth(); // 0 a 11

      if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
        const [a, m] = mesParam.split("-").map(Number);
        anio = a;
        mes = m - 1;
      }

      fechaInicio = new Date(anio, mes, 1, 0, 0, 0, 0);
      fechaFin = new Date(anio, mes + 1, 0, 23, 59, 59, 999);

      const nombreMes = fechaInicio.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
      etiquetaPeriodo = `Mes de ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}`;
    } else if (periodo === "ANUAL") {
      let anio = ahora.getFullYear();
      if (anioParam && /^\d{4}$/.test(anioParam)) {
        anio = Number(anioParam);
      }

      fechaInicio = new Date(anio, 0, 1, 0, 0, 0, 0);
      fechaFin = new Date(anio, 11, 31, 23, 59, 59, 999);
      etiquetaPeriodo = `Año ${anio}`;
    } else {
      // Periodo DIARIO por defecto
      let fechaBase = ahora;
      if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
        const [a, m, d] = fechaParam.split("-").map(Number);
        fechaBase = new Date(a, m - 1, d);
      }

      fechaInicio = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), 0, 0, 0, 0);
      fechaFin = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), 23, 59, 59, 999);

      etiquetaPeriodo = `Día ${fechaInicio.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;
    }

    // Construcción de cláusula where
    const whereClause: Record<string, unknown> = {
      estado: EstadoTurno.CERRADO,
      fechaCierre: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (soloNovedades) {
      whereClause.tieneDiferencia = true;
    }

    if (cajeroId) {
      whereClause.usuarioCajeroId = cajeroId;
    }

    // Consulta de turnos cerrados en el rango
    const turnos = await prisma.turnoCaja.findMany({
      where: whereClause,
      orderBy: { fechaCierre: "desc" },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true, rol: true },
        },
      },
    });

    // Calcular métricas consolidadas del periodo
    let totalEfectivo = 0;
    let totalDigital = 0;
    let totalRecaudado = 0;
    let totalBaseInicial = 0;
    let totalEsperado = 0;
    let totalContado = 0;
    let totalDiferencias = 0;
    let totalFaltantes = 0;
    let totalSobrantes = 0;
    let turnosConNovedad = 0;
    let turnosExactos = 0;

    const turnosFormateados = turnos.map((t) => {
      const base = Number(t.baseInicialEfectivo) || 0;
      const efectivo = Number(t.totalEfectivo) || 0;
      const digital =
        (Number(t.totalNequi) || 0) +
        (Number(t.totalBancolombia) || 0) +
        (Number(t.totalLlave) || 0) +
        (Number(t.totalDaviplata) || 0) +
        (Number(t.totalTransferencia) || 0) +
        (Number(t.totalConsignacion) || 0);
      const recaudado = Number(t.totalRecaudado) || efectivo + digital;

      // Usar campos explícitos de arqueo o retrocompatibles
      const esperado = Number(t.efectivoEsperado) || Math.round((base + efectivo) * 100) / 100;
      const contado = Number(t.efectivoContado) || Math.round((esperado + Number(t.diferenciaEfectivo || 0)) * 100) / 100;
      const diferencia = Number(t.diferencia !== undefined ? t.diferencia : t.diferenciaEfectivo) || 0;
      const tieneDiff = t.tieneDiferencia ?? Math.abs(diferencia) > 0.001;

      totalBaseInicial += base;
      totalEfectivo += efectivo;
      totalDigital += digital;
      totalRecaudado += recaudado;
      totalEsperado += esperado;
      totalContado += contado;
      totalDiferencias += diferencia;

      if (tieneDiff) {
        turnosConNovedad += 1;
        if (diferencia < 0) {
          totalFaltantes += Math.abs(diferencia);
        } else {
          totalSobrantes += diferencia;
        }
      } else {
        turnosExactos += 1;
      }

      return {
        id: t.id,
        nombreGabinete: t.nombreGabinete || "Gabinete Principal",
        modalidad: t.modalidad || "COMPARTIDA",
        fechaApertura: t.fechaApertura.toISOString(),
        fechaCierre: t.fechaCierre ? t.fechaCierre.toISOString() : null,
        baseInicialEfectivo: base,
        totalEfectivo: efectivo,
        totalDigital: digital,
        totalNequi: Number(t.totalNequi) || 0,
        totalBancolombia: Number(t.totalBancolombia) || 0,
        totalDaviplata: Number(t.totalDaviplata) || 0,
        totalTransferencia: Number(t.totalTransferencia) || 0,
        totalConsignacion: Number(t.totalConsignacion) || 0,
        totalRecaudado: recaudado,
        efectivoEsperado: esperado,
        efectivoContado: contado,
        diferencia,
        tieneDiferencia: tieneDiff,
        notaNovedad: t.notaNovedad,
        observaciones: t.observaciones,
        usuarioCajero: t.usuarioCajero,
        cajerosParticipantes: parsearCajerosParticipantes(t.cajerosParticipantes),
      };
    });

    return NextResponse.json({
      success: true,
      periodo: {
        tipo: periodo,
        etiqueta: etiquetaPeriodo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
      },
      resumen: {
        totalTurnos: turnos.length,
        totalBaseInicial: Math.round(totalBaseInicial * 100) / 100,
        totalEfectivo: Math.round(totalEfectivo * 100) / 100,
        totalDigital: Math.round(totalDigital * 100) / 100,
        totalRecaudado: Math.round(totalRecaudado * 100) / 100,
        totalEsperado: Math.round(totalEsperado * 100) / 100,
        totalContado: Math.round(totalContado * 100) / 100,
        totalDiferencias: Math.round(totalDiferencias * 100) / 100,
        totalFaltantes: Math.round(totalFaltantes * 100) / 100,
        totalSobrantes: Math.round(totalSobrantes * 100) / 100,
        turnosConNovedad,
        turnosExactos,
      },
      turnos: turnosFormateados,
    });
  } catch (error: unknown) {
    console.error("Error al consultar historial de arqueos de caja:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el historial de arqueos" },
      { status: 500 }
    );
  }
}
