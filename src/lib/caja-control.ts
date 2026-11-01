import { PrismaClient, EstadoTurno, MetodoPago } from "@prisma/client";

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

export interface DesgloseCajeroArqueo {
  cajeroId: string;
  nombre: string;
  username: string;
  efectivo: number;
  digital: number;
  total: number;
  cantidadAbonos: number;
}

export interface ArqueoTurnoResultado {
  baseInicialEfectivo: number;
  efectivoAbonos: number;
  efectivoVentasYAbonos: number;
  depositosEfectivoRecibidos: number;
  depositosEfectivoDevueltos: number;
  depositosEfectivoNetos: number;
  efectivoDepositosCustodia: number;
  efectivoEsperado: number;
  esperadoEnGavetaEfectivo: number;
  saldoActualEnCajon: number;
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalBancolombia: number;
  totalLlave: number;
  totalTransferencia: number;
  totalConsignacion: number;
  totalDigital: number;
  totalRecaudado: number;
  cantidadAbonos: number;
  cantidadFacturas: number;
  desgloseCajeros: DesgloseCajeroArqueo[];
}

/**
 * Calcula el arqueo exacto para un turno de caja específico.
 * Fuente única de verdad matemática para GET /api/caja, GET /api/caja/estado,
 * POST /api/caja (cierre definitivo) y vistas de control de caja.
 *
 * Reglas de cálculo:
 * 1. Abonos del turno: Vinculados al turnoCajaId (o realizados desde turno.fechaApertura si turnoCajaId es null).
 * 2. Clasificación estricta de métodos de pago (EFECTIVO, NEQUI, DAVIPLATA, BANCOLOMBIA, LLAVE, TRANSFERENCIA, CONSIGNACION).
 * 3. Depósitos en custodia de alquileres: Depósitos en efectivo recibidos menos depósitos en efectivo devueltos en ese turno.
 * 4. Total Esperado en Gaveta Física = baseInicial + efectivoAbonos + depositosEfectivoNetos.
 */
export async function calcularArqueoExactoTurno(
  prismaClient: PrismaClient,
  turno: {
    id: string;
    fechaApertura: Date | string;
    baseInicialEfectivo?: number | null;
  }
): Promise<ArqueoTurnoResultado> {
  const fechaApertura =
    typeof turno.fechaApertura === "string" ? new Date(turno.fechaApertura) : turno.fechaApertura;
  const baseInicial = Math.round(Number(turno.baseInicialEfectivo || 0) * 100) / 100;

  // 1. Abonos asociados a este turno
  const abonos = await prismaClient.abono.findMany({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fecha: { gte: fechaApertura } },
      ],
    },
    select: {
      id: true,
      monto: true,
      metodoPago: true,
      fecha: true,
      facturaId: true,
      cajeroId: true,
      cajero: {
        select: { id: true, nombre: true, username: true },
      },
    },
  });

  let efectivoAbonos = 0;
  let totalNequi = 0;
  let totalDaviplata = 0;
  let totalBancolombia = 0;
  let totalLlave = 0;
  let totalTransferencia = 0;
  let totalConsignacion = 0;
  let totalDigitalAbonos = 0;

  const desgloseMap = new Map<string, DesgloseCajeroArqueo>();

  for (const a of abonos) {
    const monto = Number(a.monto) || 0;
    const cId = a.cajeroId;
    const cNom = a.cajero?.nombre || "Cajero";
    const cUser = a.cajero?.username || "cajero";

    if (!desgloseMap.has(cId)) {
      desgloseMap.set(cId, {
        cajeroId: cId,
        nombre: cNom,
        username: cUser,
        efectivo: 0,
        digital: 0,
        total: 0,
        cantidadAbonos: 0,
      });
    }

    const stat = desgloseMap.get(cId)!;
    stat.cantidadAbonos += 1;
    stat.total += monto;

    if (a.metodoPago === MetodoPago.EFECTIVO) {
      efectivoAbonos += monto;
      stat.efectivo += monto;
    } else {
      totalDigitalAbonos += monto;
      stat.digital += monto;
      if (a.metodoPago === MetodoPago.NEQUI) totalNequi += monto;
      else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += monto;
      else if (a.metodoPago === MetodoPago.BANCOLOMBIA) totalBancolombia += monto;
      else if (a.metodoPago === MetodoPago.LLAVE) totalLlave += monto;
      else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += monto;
      else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += monto;
    }
  }

  // 2. Facturas de alquiler vinculadas para depósitos en garantía
  const facturasAlquiler = await prismaClient.factura.findMany({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
      ],
      tipoOperacion: "ALQUILER",
    },
    select: {
      id: true,
      montoDeposito: true,
      metodoPagoDeposito: true,
      montoDevueltoDeposito: true,
      montoRetenidoDeposito: true,
      estadoDeposito: true,
    },
  });

  let depositosEfectivoRecibidos = 0;
  let depositosEfectivoDevueltos = 0;
  let depositosDigitalesRecibidos = 0;

  for (const f of facturasAlquiler) {
    const dep = Number(f.montoDeposito) || 0;
    const dev = Number(f.montoDevueltoDeposito) || 0;

    if (dep > 0) {
      if (f.metodoPagoDeposito === "EFECTIVO" || !f.metodoPagoDeposito) {
        depositosEfectivoRecibidos += dep;
      } else {
        depositosDigitalesRecibidos += dep;
      }
    }

    if (dev > 0) {
      depositosEfectivoDevueltos += dev;
    }
  }

  const depositosEfectivoNetos =
    Math.round((depositosEfectivoRecibidos - depositosEfectivoDevueltos) * 100) / 100;
  const efectivoDepositosCustodia = Math.max(0, depositosEfectivoNetos);

  // Efectivo físico esperado en gaveta:
  // Base Inicial + Efectivo de Abonos + Depósitos Netos en Efectivo
  const efectivoEsperadoEnGaveta =
    Math.round((baseInicial + efectivoAbonos + depositosEfectivoNetos) * 100) / 100;

  const totalDigitalConDepositos =
    Math.round((totalDigitalAbonos + depositosDigitalesRecibidos) * 100) / 100;

  const totalRecaudado =
    Math.round(
      (efectivoAbonos + depositosEfectivoNetos + totalDigitalConDepositos) * 100
    ) / 100;

  const cantidadFacturas = await prismaClient.factura.count({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
      ],
    },
  });

  return {
    baseInicialEfectivo: baseInicial,
    efectivoAbonos: Math.round(efectivoAbonos * 100) / 100,
    efectivoVentasYAbonos: Math.round(efectivoAbonos * 100) / 100,
    depositosEfectivoRecibidos: Math.round(depositosEfectivoRecibidos * 100) / 100,
    depositosEfectivoDevueltos: Math.round(depositosEfectivoDevueltos * 100) / 100,
    depositosEfectivoNetos,
    efectivoDepositosCustodia,
    efectivoEsperado: efectivoEsperadoEnGaveta,
    esperadoEnGavetaEfectivo: efectivoEsperadoEnGaveta,
    saldoActualEnCajon: efectivoEsperadoEnGaveta,
    totalEfectivo: Math.round(efectivoAbonos * 100) / 100,
    totalNequi: Math.round(totalNequi * 100) / 100,
    totalDaviplata: Math.round(totalDaviplata * 100) / 100,
    totalBancolombia: Math.round(totalBancolombia * 100) / 100,
    totalLlave: Math.round(totalLlave * 100) / 100,
    totalTransferencia: Math.round(totalTransferencia * 100) / 100,
    totalConsignacion: Math.round(totalConsignacion * 100) / 100,
    totalDigital: totalDigitalConDepositos,
    totalRecaudado,
    cantidadAbonos: abonos.length,
    cantidadFacturas,
    desgloseCajeros: Array.from(desgloseMap.values()).map((c) => ({
      ...c,
      efectivo: Math.round(c.efectivo * 100) / 100,
      digital: Math.round(c.digital * 100) / 100,
      total: Math.round(c.total * 100) / 100,
    })),
  };
}
