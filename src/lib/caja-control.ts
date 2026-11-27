import { PrismaClient, EstadoTurno, MetodoPago, EstadoFactura } from "@prisma/client";

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
 * Helper universal e infalible para resolver el turno de caja abierto activo.
 * Prioriza:
 * 1. El turno explícito si se proporcionó y sigue abierto.
 * 2. El turno asignado al cajero preferido (titular o participante).
 * 3. El turno abierto más reciente en la base de datos.
 */
export async function obtenerTurnoAbiertoActivo(
  prismaClient: any,
  cajeroIdPreferido?: string,
  turnoCajaIdExplicito?: string
): Promise<any | null> {
  if (turnoCajaIdExplicito) {
    const turnoExplicito = await prismaClient.turnoCaja.findFirst({
      where: { id: turnoCajaIdExplicito, estado: EstadoTurno.ABIERTO },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true, rol: true },
        },
      },
    });
    if (turnoExplicito) return turnoExplicito;
  }

  // Buscar todos los turnos ABIERTOS ordenados del más reciente al más antiguo
  const turnosAbiertos = await prismaClient.turnoCaja.findMany({
    where: { estado: EstadoTurno.ABIERTO },
    include: {
      usuarioCajero: {
        select: { id: true, nombre: true, username: true, rol: true },
      },
    },
    orderBy: { fechaApertura: "desc" },
  });

  if (turnosAbiertos.length === 0) return null;

  // Si el cajero tiene uno propio o está en participantes, priorizarlo
  if (cajeroIdPreferido) {
    const propio = turnosAbiertos.find((t: any) => {
      if (t.usuarioCajeroId === cajeroIdPreferido) return true;
      const participantes = parsearCajerosParticipantes(t.cajerosParticipantes);
      return participantes.some((p) => p.id === cajeroIdPreferido);
    });
    if (propio) return propio;
  }

  // Por defecto, retornar el turno abierto principal más reciente
  return turnosAbiertos[0];
}

/**
 * Verifica el estado del turno de caja activo contra la fecha calendario actual de Colombia.
 * Implementa la REGLA DE NEGOCIO INQUEBRANTABLE:
 * - Si existe CUALQUIER turno con estado: "ABIERTO" en la tabla TurnoCaja,
 *   TODAS las terminales quedan 100% HABILITADAS (bloqueadoParaFacturar: false, yaConectado: true, estado: "ABIERTO_HOY").
 * - Solo si turnosAbiertos.length === 0 se retorna SIN_TURNO y bloqueadoParaFacturar: true.
 */
export async function verificarEstadoCajaParaFacturacion(
  prisma: PrismaClient,
  usuarioId?: string,
  deviceId?: string
): Promise<ResultadoVerificacionCaja> {
  const fechaHoy = obtenerFechaColombiaStr();

  // 1. Obtener todos los turnos ABIERTOS en la base de datos ordenados del más reciente al más antiguo
  const turnosAbiertos = await prisma.turnoCaja.findMany({
    where: { estado: EstadoTurno.ABIERTO },
    include: {
      usuarioCajero: {
        select: { id: true, nombre: true, username: true },
      },
    },
    orderBy: { fechaApertura: "desc" },
  });

  if (turnosAbiertos.length === 0) {
    return {
      estado: "SIN_TURNO",
      bloqueadoParaFacturar: true,
      motivoBloqueo:
        "No existe un turno de caja iniciado. Debe registrar la base de efectivo inicial antes de registrar cobros.",
      fechaHoy,
      turnoAbierto: null,
      turnosAbiertosHoy: [],
      turnoParaCompartir: null,
      yaConectado: false,
    };
  }

  // 2. Mapear todos los turnos abiertos existentes a InfoTurnoAbierto
  const turnosMapeados: InfoTurnoAbierto[] = turnosAbiertos.map((t) => {
    const fechaAperturaLocal = obtenerFechaColombiaStr(t.fechaApertura);
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasTranscurridos = Math.max(
      0,
      Math.floor((new Date(fechaHoy).getTime() - new Date(fechaAperturaLocal).getTime()) / msPorDia)
    );

    return {
      id: t.id,
      nombreGabinete: t.nombreGabinete,
      modalidad: (t.modalidad as ModalidadCaja) || "COMPARTIDA",
      fechaApertura: t.fechaApertura.toISOString(),
      fechaAperturaLocal,
      baseInicialEfectivo: t.baseInicialEfectivo,
      diasAbierto: diasTranscurridos,
      usuarioCajero: t.usuarioCajero,
      cajerosParticipantes: parsearCajerosParticipantes(t.cajerosParticipantes),
    };
  });

  // 3. Determinar el turno más adecuado para este usuario o dispositivo
  let turnoSeleccionado: InfoTurnoAbierto | undefined = undefined;

  if (deviceId) {
    turnoSeleccionado = turnosMapeados.find((t) =>
      t.cajerosParticipantes.some((c) => c.deviceId === deviceId)
    );
  }

  if (!turnoSeleccionado && usuarioId) {
    turnoSeleccionado = turnosMapeados.find(
      (t) =>
        t.usuarioCajero.id === usuarioId ||
        t.cajerosParticipantes.some((c) => c.id === usuarioId)
    );
  }

  // Si no hay vinculación específica, asignar el turno abierto principal más reciente
  if (!turnoSeleccionado) {
    turnoSeleccionado = turnosMapeados[0];
  }

  // 4. Retornar siempre habilitado para facturar si hay un turno abierto
  return {
    estado: "ABIERTO_HOY",
    bloqueadoParaFacturar: false,
    motivoBloqueo: null,
    fechaHoy,
    turnoAbierto: turnoSeleccionado,
    turnosAbiertosHoy: turnosMapeados,
    turnoParaCompartir: turnosMapeados[0] || null,
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
  dineroTienda: number;
  dineroTiendaEfectivo: number;
  dineroTiendaDigital: number;
  totalIngresosRealesDia: number;
  dineroCustodia: number;
  custodiaHeredadaEfectivo: number;
  custodiaHeredadaDigital: number;
  custodiaVigenteEfectivo: number;
  custodiaVigenteDigital: number;
  custodiaVigenteTotal: number;
  depositosEfectivoRecibidos: number;
  depositosDigitalesRecibidos: number;
  depositosEfectivoDevueltos: number;
  depositosDigitalesDevueltos: number;
  depositosRetenidosEfectivo: number;
  depositosRetenidosDigital: number;
  depositosRetenidosTotal: number;
  depositosEfectivoNetos: number;
  efectivoDepositosCustodia: number;
  fondoPermanenteCaja: number;
  efectivoARetirarCierre: number;
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
 * Reglas contables estrictas:
 * 1. Flujo de caja real: Solo suman los abonos efectivamente recibidos en este turno
 *    (ventas, pagos parciales de apartados, saldos al retirar y retenciones de depósito por mora/daño).
 * 2. Depósitos en garantía como fondo constante (NO son ingresos):
 *    - Se arrastra la custodia vigente de turnos anteriores (`custodiaHeredadaEfectivo` / `custodiaHeredadaDigital`).
 *    - Suman únicamente los depósitos efectivamente recibidos hoy.
 *    - Restan de custodia cuando se devuelven al cliente (`DEPOSITO_DEVUELTO`) o cuando se retienen por mora/daño (`DEPOSITO_RETENIDO`).
 *    - Si se retienen por mora/daño, pasan automáticamente a Ingresos Reales de la Tienda del turno actual.
 * 3. Cierre de caja:
 *    - Fondo Permanente que se queda en gaveta = Base Inicial + Custodia Vigente en Efectivo.
 *    - Efectivo Esperado en Gaveta = Fondo Permanente + Ingresos Efectivo Tienda del turno.
 *    - Efectivo a Retirar al Cierre = Ingresos Efectivo Tienda del turno.
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

  // 0. Custodia heredada de turnos/días anteriores (depósitos vigentes antes de este turno en facturas no anuladas)
  const abonosCustodiaPrevios = await prismaClient.abono.findMany({
    where: {
      tipoAbono: { in: ["DEPOSITO_GARANTIA", "DEPOSITO_DEVUELTO", "DEPOSITO_RETENIDO"] },
      OR: [
        { turnoCajaId: { not: turno.id }, fecha: { lt: fechaApertura } },
        { turnoCajaId: null, fecha: { lt: fechaApertura } },
      ],
      factura: {
        estado: { not: EstadoFactura.ANULADA },
      },
    },
    select: {
      monto: true,
      metodoPago: true,
      tipoAbono: true,
    },
  });

  let custodiaHeredadaEfectivo = 0;
  let custodiaHeredadaDigital = 0;

  for (const abPrev of abonosCustodiaPrevios) {
    const monto = Number(abPrev.monto) || 0;
    const esEfectivo = abPrev.metodoPago === MetodoPago.EFECTIVO;
    if (abPrev.tipoAbono === "DEPOSITO_GARANTIA") {
      if (esEfectivo) custodiaHeredadaEfectivo += monto;
      else custodiaHeredadaDigital += monto;
    } else if (abPrev.tipoAbono === "DEPOSITO_DEVUELTO" || abPrev.tipoAbono === "DEPOSITO_RETENIDO") {
      if (esEfectivo) custodiaHeredadaEfectivo -= monto;
      else custodiaHeredadaDigital -= monto;
    }
  }

  custodiaHeredadaEfectivo = Math.max(0, Math.round(custodiaHeredadaEfectivo * 100) / 100);
  custodiaHeredadaDigital = Math.max(0, Math.round(custodiaHeredadaDigital * 100) / 100);

  // 1. Abonos asociados a este turno (excluyendo facturas anuladas para cero ingresos fantasma)
  const abonos = await prismaClient.abono.findMany({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fecha: { gte: fechaApertura } },
      ],
      factura: {
        estado: { not: EstadoFactura.ANULADA },
      },
    },
    select: {
      id: true,
      monto: true,
      metodoPago: true,
      fecha: true,
      facturaId: true,
      cajeroId: true,
      tipoAbono: true,
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

  let depositosEfectivoRecibidos = 0;
  let depositosDigitalesRecibidos = 0;
  let depositosEfectivoDevueltos = 0;
  let depositosDigitalesDevueltos = 0;
  let depositosRetenidosEfectivo = 0;
  let depositosRetenidosDigital = 0;
  const facturasConAbonoDeposito = new Set<string>();
  const facturasConAbonoDevuelto = new Set<string>();

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
    const esDepositoGarantia = a.tipoAbono === "DEPOSITO_GARANTIA";
    const esDepositoDevuelto = a.tipoAbono === "DEPOSITO_DEVUELTO";
    const esDepositoRetenido = a.tipoAbono === "DEPOSITO_RETENIDO";

    if (esDepositoDevuelto) {
      // Salida de custodia hacia el cliente (NO es ingreso ni egreso operativo de ventas)
      if (a.facturaId) facturasConAbonoDevuelto.add(a.facturaId);
      if (a.metodoPago === MetodoPago.EFECTIVO) {
        depositosEfectivoDevueltos += monto;
      } else {
        depositosDigitalesDevueltos += monto;
      }
    } else if (esDepositoGarantia) {
      // Entrada al fondo constante de custodia (NO suma a ingresos de la tienda)
      if (a.facturaId) facturasConAbonoDeposito.add(a.facturaId);
      if (a.metodoPago === MetodoPago.EFECTIVO) {
        depositosEfectivoRecibidos += monto;
      } else {
        depositosDigitalesRecibidos += monto;
      }
    } else if (esDepositoRetenido) {
      // Retención por mora o daño en prenda: sale de custodia y SE CONVIERTE en ingreso real de la tienda
      stat.cantidadAbonos += 1;
      stat.total += monto;
      if (a.metodoPago === MetodoPago.EFECTIVO) {
        depositosRetenidosEfectivo += monto;
        efectivoAbonos += monto;
        stat.efectivo += monto;
      } else {
        depositosRetenidosDigital += monto;
        totalDigitalAbonos += monto;
        stat.digital += monto;
        if (a.metodoPago === MetodoPago.NEQUI) totalNequi += monto;
        else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += monto;
        else if (a.metodoPago === MetodoPago.BANCOLOMBIA) totalBancolombia += monto;
        else if (a.metodoPago === MetodoPago.LLAVE) totalLlave += monto;
        else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += monto;
        else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += monto;
      }
    } else {
      // Ingreso real de la tienda (Venta, Alquiler, Abono Parcial de Apartado, Saldo al Retirar, Mora)
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
  }

  // 2. Respaldo legacy SOLO para facturas sin abonos de depósito explícitos (nunca sumar depósitos no pagados)
  const facturasAlquiler = await prismaClient.factura.findMany({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
      ],
      depositoAbonado: { gt: 0 },
      estado: { not: EstadoFactura.ANULADA },
    },
    select: {
      id: true,
      depositoAbonado: true,
      metodoPagoDeposito: true,
      montoDevueltoDeposito: true,
    },
  });

  for (const f of facturasAlquiler) {
    if (!facturasConAbonoDeposito.has(f.id)) {
      const depRecaudado = Number(f.depositoAbonado) || 0;
      if (depRecaudado > 0) {
        if (f.metodoPagoDeposito === "EFECTIVO" || !f.metodoPagoDeposito) {
          depositosEfectivoRecibidos += depRecaudado;
        } else {
          depositosDigitalesRecibidos += depRecaudado;
        }
      }
    }

    if (!facturasConAbonoDevuelto.has(f.id)) {
      const dev = Number(f.montoDevueltoDeposito) || 0;
      if (dev > 0) {
        depositosEfectivoDevueltos += dev;
      }
    }
  }

  // Cálculos consolidados de Custodia (Fondo Constante) vs Ingresos Reales de Tienda
  const depositosEfectivoNetos =
    Math.round((depositosEfectivoRecibidos - depositosEfectivoDevueltos - depositosRetenidosEfectivo) * 100) / 100;
  const custodiaVigenteEfectivo = Math.max(
    0,
    Math.round((custodiaHeredadaEfectivo + depositosEfectivoNetos) * 100) / 100
  );
  const custodiaVigenteDigital = Math.max(
    0,
    Math.round((custodiaHeredadaDigital + depositosDigitalesRecibidos - depositosDigitalesDevueltos - depositosRetenidosDigital) * 100) / 100
  );
  const custodiaVigenteTotal = Math.round((custodiaVigenteEfectivo + custodiaVigenteDigital) * 100) / 100;
  const depositosRetenidosTotal = Math.round((depositosRetenidosEfectivo + depositosRetenidosDigital) * 100) / 100;

  const dineroTiendaEfectivo = Math.round(efectivoAbonos * 100) / 100;
  const dineroTiendaDigital = Math.round(totalDigitalAbonos * 100) / 100;
  const totalIngresosRealesDia = Math.round((dineroTiendaEfectivo + dineroTiendaDigital) * 100) / 100;

  // Fondo Permanente que debe permanecer en gaveta = Base Fija + Custodia Vigente en Efectivo
  const fondoPermanenteCaja = Math.round((baseInicial + custodiaVigenteEfectivo) * 100) / 100;

  // Efectivo físico total esperado en gaveta = Fondo Permanente + Ingresos Efectivo Tienda de hoy
  const efectivoEsperadoEnGaveta = Math.round((fondoPermanenteCaja + dineroTiendaEfectivo) * 100) / 100;

  // Efectivo de ganancia/ingreso del día a retirar al cerrar caja
  const efectivoARetirarCierre = dineroTiendaEfectivo;

  const cantidadFacturas = await prismaClient.factura.count({
    where: {
      OR: [
        { turnoCajaId: turno.id },
        { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
      ],
      estado: { not: EstadoFactura.ANULADA },
    },
  });

  const cantidadAbonosIngresos = abonos.filter(
    (a) => a.tipoAbono !== "DEPOSITO_GARANTIA" && a.tipoAbono !== "DEPOSITO_DEVUELTO"
  ).length;

  return {
    baseInicialEfectivo: baseInicial,
    efectivoAbonos: dineroTiendaEfectivo,
    efectivoVentasYAbonos: dineroTiendaEfectivo,
    dineroTienda: totalIngresosRealesDia,
    dineroTiendaEfectivo,
    dineroTiendaDigital,
    totalIngresosRealesDia,
    dineroCustodia: custodiaVigenteEfectivo,
    custodiaHeredadaEfectivo,
    custodiaHeredadaDigital,
    custodiaVigenteEfectivo,
    custodiaVigenteDigital,
    custodiaVigenteTotal,
    depositosEfectivoRecibidos: Math.round(depositosEfectivoRecibidos * 100) / 100,
    depositosDigitalesRecibidos: Math.round(depositosDigitalesRecibidos * 100) / 100,
    depositosEfectivoDevueltos: Math.round(depositosEfectivoDevueltos * 100) / 100,
    depositosDigitalesDevueltos: Math.round(depositosDigitalesDevueltos * 100) / 100,
    depositosRetenidosEfectivo: Math.round(depositosRetenidosEfectivo * 100) / 100,
    depositosRetenidosDigital: Math.round(depositosRetenidosDigital * 100) / 100,
    depositosRetenidosTotal,
    depositosEfectivoNetos,
    efectivoDepositosCustodia: custodiaVigenteEfectivo,
    fondoPermanenteCaja,
    efectivoARetirarCierre,
    efectivoEsperado: efectivoEsperadoEnGaveta,
    esperadoEnGavetaEfectivo: efectivoEsperadoEnGaveta,
    saldoActualEnCajon: efectivoEsperadoEnGaveta,
    totalEfectivo: dineroTiendaEfectivo,
    totalNequi: Math.round(totalNequi * 100) / 100,
    totalDaviplata: Math.round(totalDaviplata * 100) / 100,
    totalBancolombia: Math.round(totalBancolombia * 100) / 100,
    totalLlave: Math.round(totalLlave * 100) / 100,
    totalTransferencia: Math.round(totalTransferencia * 100) / 100,
    totalConsignacion: Math.round(totalConsignacion * 100) / 100,
    totalDigital: dineroTiendaDigital,
    totalRecaudado: totalIngresosRealesDia,
    cantidadAbonos: cantidadAbonosIngresos,
    cantidadFacturas,
    desgloseCajeros: Array.from(desgloseMap.values())
      .filter((c) => c.cantidadAbonos > 0)
      .map((c) => ({
        ...c,
        efectivo: Math.round(c.efectivo * 100) / 100,
        digital: Math.round(c.digital * 100) / 100,
        total: Math.round(c.total * 100) / 100,
      })),
  };
}
