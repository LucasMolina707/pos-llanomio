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

export type ModalidadCaja = "COMPARTIDA" | "DIVIDIDA";

export interface CajeroParticipante {
  id: string;
  nombre: string;
  username: string;
  fechaUnion: string;
  deviceId?: string;
}

export function parsearCajerosParticipantes(jsonStr: string | null | undefined): CajeroParticipante[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type EstadoSeguridadCaja =
  | "ABIERTO_HOY"
  | "BLOQUEADO_DIA_ANTERIOR"
  | "SIN_TURNO"
  | "REQUIERE_DECISION_MODALIDAD";

export interface InfoTurnoAbierto {
  id: string;
  nombreGabinete: string;
  modalidad: ModalidadCaja;
  fechaApertura: string;
  fechaAperturaLocal: string;
  baseInicialEfectivo: number;
  diasAbierto: number;
  usuarioCajero: {
    id: string;
    nombre: string;
    username: string;
  };
  cajerosParticipantes: CajeroParticipante[];
}

export interface ResultadoVerificacionCaja {
  estado: EstadoSeguridadCaja;
  bloqueadoParaFacturar: boolean;
  motivoBloqueo: string | null;
  fechaHoy: string;
  turnoAbierto: InfoTurnoAbierto | null;
  turnosAbiertosHoy: InfoTurnoAbierto[];
  turnoParaCompartir: InfoTurnoAbierto | null;
  yaConectado?: boolean;
}

/**
 * Verifica el estado del turno de caja activo contra la fecha calendario actual de Colombia.
 * Implementa las reglas estrictas de control financiero y multi-cajero por dispositivo:
 * 1. Si existe CUALQUIER turno abierto de un día anterior => BLOQUEADO_DIA_ANTERIOR (exige arqueo previo).
 * 2. Si no hay turnos abiertos hoy => SIN_TURNO (exige apertura con base inicial).
 * 3. Si hay turnos abiertos hoy:
 *    a. Si el usuario O dispositivo ya está asignado a un turno (creador o participante) => ABIERTO_HOY (yaConectado = true).
 *    b. Si el usuario/dispositivo no está asignado => REQUIERE_DECISION_MODALIDAD (permite elegir Compartida o Dividida).
 */
export async function verificarEstadoCajaParaFacturacion(
  prisma: PrismaClient,
  usuarioId?: string,
  deviceId?: string
): Promise<ResultadoVerificacionCaja> {
  const fechaHoy = obtenerFechaColombiaStr();

  // 1. Verificar si existen turnos abiertos en la base de datos
  const turnosAbiertos = await prisma.turnoCaja.findMany({
    where: { estado: EstadoTurno.ABIERTO },
    include: {
      usuarioCajero: {
        select: { id: true, nombre: true, username: true },
      },
    },
    orderBy: { fechaApertura: "asc" },
  });

  if (turnosAbiertos.length === 0) {
    return {
      estado: "SIN_TURNO",
      bloqueadoParaFacturar: true,
      motivoBloqueo:
        "No existe un turno de caja iniciado para la jornada de hoy. Debe registrar la base de efectivo inicial antes de facturar.",
      fechaHoy,
      turnoAbierto: null,
      turnosAbiertosHoy: [],
      turnoParaCompartir: null,
      yaConectado: false,
    };
  }

  // 2. Regla inquebrantable: Si hay al menos un turno de un día anterior abierto, bloquear inmediatamente
  const turnoDiaAnterior = turnosAbiertos.find((t) => {
    const fechaAperturaLocal = obtenerFechaColombiaStr(t.fechaApertura);
    return fechaAperturaLocal < fechaHoy;
  });

  if (turnoDiaAnterior) {
    const fechaAperturaLocal = obtenerFechaColombiaStr(turnoDiaAnterior.fechaApertura);
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasTranscurridos = Math.max(
      1,
      Math.floor((new Date(fechaHoy).getTime() - new Date(fechaAperturaLocal).getTime()) / msPorDia)
    );

    return {
      estado: "BLOQUEADO_DIA_ANTERIOR",
      bloqueadoParaFacturar: true,
      motivoBloqueo: `ALERTA DE SEGURIDAD FINANCIERA: Existe un turno de caja anterior abierto correspondiente al ${fechaAperturaLocal} (${diasTranscurridos} día(s) sin cerrar) en ${turnoDiaAnterior.nombreGabinete} a cargo de ${turnoDiaAnterior.usuarioCajero.nombre}. Por control financiero, debe realizar el arqueo y cierre formal de esa caja antes de poder operar hoy.`,
      fechaHoy,
      turnoAbierto: {
        id: turnoDiaAnterior.id,
        nombreGabinete: turnoDiaAnterior.nombreGabinete,
        modalidad: (turnoDiaAnterior.modalidad as ModalidadCaja) || "COMPARTIDA",
        fechaApertura: turnoDiaAnterior.fechaApertura.toISOString(),
        fechaAperturaLocal,
        baseInicialEfectivo: turnoDiaAnterior.baseInicialEfectivo,
        diasAbierto: diasTranscurridos,
        usuarioCajero: turnoDiaAnterior.usuarioCajero,
        cajerosParticipantes: parsearCajerosParticipantes(turnoDiaAnterior.cajerosParticipantes),
      },
      turnosAbiertosHoy: [],
      turnoParaCompartir: null,
      yaConectado: false,
    };
  }

  // 3. Mapear todos los turnos abiertos de hoy
  const turnosHoyMapeados: InfoTurnoAbierto[] = turnosAbiertos
    .filter((t) => obtenerFechaColombiaStr(t.fechaApertura) === fechaHoy)
    .map((t) => {
      const fechaLocal = obtenerFechaColombiaStr(t.fechaApertura);
      return {
        id: t.id,
        nombreGabinete: t.nombreGabinete,
        modalidad: (t.modalidad as ModalidadCaja) || "COMPARTIDA",
        fechaApertura: t.fechaApertura.toISOString(),
        fechaAperturaLocal: fechaLocal,
        baseInicialEfectivo: t.baseInicialEfectivo,
        diasAbierto: 0,
        usuarioCajero: t.usuarioCajero,
        cajerosParticipantes: parsearCajerosParticipantes(t.cajerosParticipantes),
      };
    });

  if (turnosHoyMapeados.length === 0) {
    return {
      estado: "SIN_TURNO",
      bloqueadoParaFacturar: true,
      motivoBloqueo: "No existe un turno de caja iniciado para la jornada de hoy.",
      fechaHoy,
      turnoAbierto: null,
      turnosAbiertosHoy: [],
      turnoParaCompartir: null,
      yaConectado: false,
    };
  }

  // 4. Verificar vinculación por deviceId o usuarioId
  let turnoAsignado: InfoTurnoAbierto | undefined = undefined;

  // Primero verificar por deviceId si se suministró
  if (deviceId) {
    turnoAsignado = turnosHoyMapeados.find(
      (t) => t.cajerosParticipantes.some((c) => c.deviceId === deviceId)
    );
  }

  // Si no se encontró por deviceId, verificar por usuarioId
  if (!turnoAsignado && usuarioId) {
    turnoAsignado = turnosHoyMapeados.find(
      (t) =>
        t.usuarioCajero.id === usuarioId ||
        t.cajerosParticipantes.some((c) => c.id === usuarioId)
    );
  }

  if (turnoAsignado) {
    return {
      estado: "ABIERTO_HOY",
      bloqueadoParaFacturar: false,
      motivoBloqueo: null,
      fechaHoy,
      turnoAbierto: turnoAsignado,
      turnosAbiertosHoy: turnosHoyMapeados,
      turnoParaCompartir: null,
      yaConectado: true,
    };
  }

  // Si hay turnos abiertos hoy y la modalidad es COMPARTIDA o hay un solo turno, conectar automáticamente sin bloquear
  const turnoCompartible =
    turnosHoyMapeados.find((t) => t.modalidad === "COMPARTIDA") || turnosHoyMapeados[0];

  if (turnoCompartible && (turnoCompartible.modalidad === "COMPARTIDA" || turnosHoyMapeados.length === 1)) {
    return {
      estado: "ABIERTO_HOY",
      bloqueadoParaFacturar: false,
      motivoBloqueo: null,
      fechaHoy,
      turnoAbierto: turnoCompartible,
      turnosAbiertosHoy: turnosHoyMapeados,
      turnoParaCompartir: null,
      yaConectado: true,
    };
  }

  // Si existen múltiples turnos en modalidad dividida y no se ha asignado este usuario/dispositivo
  return {
    estado: "REQUIERE_DECISION_MODALIDAD",
    bloqueadoParaFacturar: false, // Permitir facturación asociando al turno principal
    motivoBloqueo: null,
    fechaHoy,
    turnoAbierto: turnoCompartible,
    turnosAbiertosHoy: turnosHoyMapeados,
    turnoParaCompartir: turnoCompartible,
    yaConectado: true,
  };
}
