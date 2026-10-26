import { PrismaClient, EstadoTurno } from "@prisma/client";

/**
 * Obtiene la fecha local en formato YYYY-MM-DD bajo la zona horaria de Colombia (America/Bogota, UTC-5).
 */
export function obtenerFechaColombiaStr(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    // Fallback defensivo UTC-5 si la plataforma no soporta timeZone
    const offsetMs = 5 * 60 * 60 * 1000;
    const colombiaDate = new Date(date.getTime() - offsetMs);
    const y = colombiaDate.getUTCFullYear();
    const m = String(colombiaDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(colombiaDate.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

export type EstadoSeguridadCaja = "ABIERTO_HOY" | "BLOQUEADO_DIA_ANTERIOR" | "SIN_TURNO";

export interface ResultadoVerificacionCaja {
  estado: EstadoSeguridadCaja;
  bloqueadoParaFacturar: boolean;
  motivoBloqueo: string | null;
  fechaHoy: string;
  turnoAbierto: {
    id: string;
    fechaApertura: string;
    fechaAperturaLocal: string;
    baseInicialEfectivo: number;
    diasAbierto: number;
    usuarioCajero: {
      id: string;
      nombre: string;
      username: string;
    };
  } | null;
}

/**
 * Verifica el estado del turno de caja activo contra la fecha calendario actual de Colombia.
 * Implementa la regla estricta:
 * - Sin turno abierto => Bloqueado (requiere apertura con base)
 * - Turno abierto con fecha anterior a hoy => Bloqueado crítico (requiere arqueo y cierre del día anterior)
 * - Turno abierto con fecha de hoy => Habilitado para facturar
 */
export async function verificarEstadoCajaParaFacturacion(
  prisma: PrismaClient
): Promise<ResultadoVerificacionCaja> {
  const fechaHoy = obtenerFechaColombiaStr();

  const turnoAbierto = await prisma.turnoCaja.findFirst({
    where: { estado: EstadoTurno.ABIERTO },
    include: {
      usuarioCajero: {
        select: { id: true, nombre: true, username: true },
      },
    },
    orderBy: { fechaApertura: "desc" },
  });

  if (!turnoAbierto) {
    return {
      estado: "SIN_TURNO",
      bloqueadoParaFacturar: true,
      motivoBloqueo: "No existe un turno de caja iniciado para la jornada de hoy. Debe registrar la base de efectivo inicial antes de facturar.",
      fechaHoy,
      turnoAbierto: null,
    };
  }

  const fechaAperturaTurno = obtenerFechaColombiaStr(turnoAbierto.fechaApertura);

  // Comparación lexicográfica estricta YYYY-MM-DD
  if (fechaAperturaTurno < fechaHoy) {
    // Calcular días calendario transcurridos
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasTranscurridos = Math.max(
      1,
      Math.floor((new Date(fechaHoy).getTime() - new Date(fechaAperturaTurno).getTime()) / msPorDia)
    );

    return {
      estado: "BLOQUEADO_DIA_ANTERIOR",
      bloqueadoParaFacturar: true,
      motivoBloqueo: `ALERTA DE SEGURIDAD FINANCIERA: Existe un turno de caja anterior abierto correspondiente al ${fechaAperturaTurno} (${diasTranscurridos} día(s) sin cerrar) a cargo de ${turnoAbierto.usuarioCajero.nombre}. Por control financiero, debe realizar el arqueo y cierre formal de esa caja antes de poder iniciar el día de hoy y emitir nuevas facturas.`,
      fechaHoy,
      turnoAbierto: {
        id: turnoAbierto.id,
        fechaApertura: turnoAbierto.fechaApertura.toISOString(),
        fechaAperturaLocal: fechaAperturaTurno,
        baseInicialEfectivo: turnoAbierto.baseInicialEfectivo,
        diasAbierto: diasTranscurridos,
        usuarioCajero: turnoAbierto.usuarioCajero,
      },
    };
  }

  return {
    estado: "ABIERTO_HOY",
    bloqueadoParaFacturar: false,
    motivoBloqueo: null,
    fechaHoy,
    turnoAbierto: {
      id: turnoAbierto.id,
      fechaApertura: turnoAbierto.fechaApertura.toISOString(),
      fechaAperturaLocal: fechaAperturaTurno,
      baseInicialEfectivo: turnoAbierto.baseInicialEfectivo,
      diasAbierto: 0,
      usuarioCajero: turnoAbierto.usuarioCajero,
    },
  };
}
