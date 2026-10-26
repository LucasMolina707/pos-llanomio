import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import {
  verificarEstadoCajaParaFacturacion,
  obtenerFechaColombiaStr,
  parsearCajerosParticipantes,
  ModalidadCaja,
  CajeroParticipante,
} from "@/lib/caja-control";
import { EstadoTurno, MetodoPago, TipoCierre } from "@prisma/client";
import { ejecutarRespaldoEnCaliente } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Calcula el arqueo detallado para un turno específico, filtrando estrictamente
 * por su turnoCajaId y generando el desglose por cada cajero participante.
 */
async function calcularArqueoTurno(turnoId: string, fechaApertura: Date, baseInicial: number) {
  const abonos = await prisma.abono.findMany({
    where: {
      OR: [
        { turnoCajaId: turnoId },
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

  let totalEfectivo = 0;
  let totalNequi = 0;
  let totalDaviplata = 0;
  let totalTransferencia = 0;
  let totalConsignacion = 0;
  let totalDigital = 0;

  const desgloseMap = new Map<
    string,
    {
      cajeroId: string;
      nombre: string;
      username: string;
      efectivo: number;
      digital: number;
      total: number;
      cantidadAbonos: number;
    }
  >();

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
      totalEfectivo += monto;
      stat.efectivo += monto;
    } else {
      totalDigital += monto;
      stat.digital += monto;
      if (a.metodoPago === MetodoPago.NEQUI) totalNequi += monto;
      else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += monto;
      else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += monto;
      else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += monto;
    }
  }

  // Consultar facturas de alquiler vinculadas al turno para depósitos en garantía
  const facturasAlquiler = await prisma.factura.findMany({
    where: {
      OR: [
        { turnoCajaId: turnoId },
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

  const netoDepositosEfectivo = depositosEfectivoRecibidos - depositosEfectivoDevueltos;
  const saldoActualEnCajon = Math.round((baseInicial + totalEfectivo + netoDepositosEfectivo) * 100) / 100;
  const totalDigitalConDepositos = Math.round((totalDigital + depositosDigitalesRecibidos) * 100) / 100;

  const totalRecaudado =
    Math.round(
      (totalEfectivo + netoDepositosEfectivo + totalDigitalConDepositos) * 100
    ) / 100;
  const esperadoEnGavetaEfectivo = saldoActualEnCajon;

  const cantidadFacturas = await prisma.factura.count({
    where: {
      OR: [
        { turnoCajaId: turnoId },
        { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
      ],
    },
  });

  return {
    baseInicialEfectivo: baseInicial,
    totalEfectivo: Math.round(totalEfectivo * 100) / 100,
    totalDigital: totalDigitalConDepositos,
    totalNequi: Math.round(totalNequi * 100) / 100,
    totalDaviplata: Math.round(totalDaviplata * 100) / 100,
    totalTransferencia: Math.round(totalTransferencia * 100) / 100,
    totalConsignacion: Math.round(totalConsignacion * 100) / 100,
    depositosEfectivoRecibidos: Math.round(depositosEfectivoRecibidos * 100) / 100,
    depositosEfectivoDevueltos: Math.round(depositosEfectivoDevueltos * 100) / 100,
    netoDepositosEfectivo: Math.round(netoDepositosEfectivo * 100) / 100,
    saldoActualEnCajon,
    totalRecaudado,
    esperadoEnGavetaEfectivo,
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

/**
 * GET /api/caja
 * Retorna todos los turnos de gabinete abiertos hoy con sus arqueos independientes,
 * el turno activo del usuario autenticado, la verificación de seguridad estricta y el historial.
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const usuarioId = sesion?.userId;
    const deviceId = req.nextUrl.searchParams.get("deviceId") || undefined;

    const verificacionSeguridad = await verificarEstadoCajaParaFacturacion(prisma, usuarioId, deviceId);

    // Obtener todos los turnos abiertos
    const turnosAbiertosDb = await prisma.turnoCaja.findMany({
      where: { estado: EstadoTurno.ABIERTO },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true, rol: true },
        },
      },
      orderBy: { fechaApertura: "asc" },
    });

    const turnosAbiertosConArqueo = await Promise.all(
      turnosAbiertosDb.map(async (t) => {
        const base = Number(t.baseInicialEfectivo) || 0;
        const arqueo = await calcularArqueoTurno(t.id, t.fechaApertura, base);
        return {
          id: t.id,
          nombreGabinete: t.nombreGabinete,
          modalidad: (t.modalidad as ModalidadCaja) || "COMPARTIDA",
          fechaApertura: t.fechaApertura.toISOString(),
          fechaAperturaLocal: obtenerFechaColombiaStr(t.fechaApertura),
          baseInicialEfectivo: base,
          usuarioCajero: t.usuarioCajero,
          cajerosParticipantes: parsearCajerosParticipantes(t.cajerosParticipantes),
          arqueo,
        };
      })
    );

    // Determinar el turno activo para el usuario/dispositivo actual o el primero
    let turnoActivo = null;
    let arqueoActual = null;

    if (turnosAbiertosConArqueo.length > 0) {
      if (deviceId) {
        turnoActivo = turnosAbiertosConArqueo.find((t) =>
          t.cajerosParticipantes.some((c) => c.deviceId === deviceId)
        ) || null;
      }

      if (!turnoActivo && usuarioId) {
        turnoActivo =
          turnosAbiertosConArqueo.find(
            (t) =>
              t.usuarioCajero.id === usuarioId ||
              t.cajerosParticipantes.some((c) => c.id === usuarioId)
          ) || null;
      }

      if (!turnoActivo) {
        turnoActivo = turnosAbiertosConArqueo[0];
      }

      arqueoActual = turnoActivo.arqueo;
    }

    // Historial de turnos cerrados recientemente (hasta 50 para auditoría rápida)
    const historialTurnos = await prisma.turnoCaja.findMany({
      where: { estado: EstadoTurno.CERRADO },
      take: 50,
      orderBy: { fechaCierre: "desc" },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true },
        },
      },
    });

    const yaConectado = Boolean(verificacionSeguridad.yaConectado);
    const saldoActualEnCajon = arqueoActual?.saldoActualEnCajon ?? (turnoActivo?.baseInicialEfectivo || 0);
    const totalDigital = arqueoActual?.totalDigital || 0;

    return NextResponse.json({
      success: true,
      hayTurnoAbierto: turnosAbiertosConArqueo.length > 0,
      yaConectado,
      saldoActualEnCajon,
      totalDigital,
      turnoAbierto: turnoActivo,
      turnosAbiertos: turnosAbiertosConArqueo,
      arqueoActual,
      verificacionSeguridad,
      historialTurnos: historialTurnos.map((t) => ({
        ...t,
        cajerosParticipantes: parsearCajerosParticipantes(t.cajerosParticipantes),
      })),
    });
  } catch (error: unknown) {
    console.error("Error al consultar estado de caja:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el control de caja" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/caja
 * Apertura de gabinete (Compartido o Dividido), Unión a Caja Compartida y Cierre de Gabinete.
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();
    const {
      accion,
      turnoCajaId,
      modalidad = "COMPARTIDA",
      nombreGabinete,
      baseInicialEfectivo = 0,
      efectivoFisicoContado,
      efectivoContado,
      notaNovedad,
      observaciones,
      tipoCierre = "DIARIO",
      deviceId,
    } = body;

    // Identificar cajero o administrador responsable
    let usuarioId = sesion?.userId;
    let usuarioObj: { id: string; nombre: string; username: string } | null = null;

    if (usuarioId) {
      usuarioObj = await prisma.user.findUnique({
        where: { id: usuarioId },
        select: { id: true, nombre: true, username: true },
      });
    }

    if (!usuarioObj) {
      const usuarioActivo = await prisma.user.findFirst({
        where: { activo: true },
        select: { id: true, nombre: true, username: true },
      });
      if (!usuarioActivo) {
        return NextResponse.json(
          { success: false, error: "No se identificó un usuario activo para la operación de caja" },
          { status: 401 }
        );
      }
      usuarioObj = usuarioActivo;
    }

    const usuarioResponsableId: string = usuarioObj.id;
    const fechaHoy = obtenerFechaColombiaStr();

    // ==========================================
    // REGLA PREVIA INQUEBRANTABLE (DÍAS ANTERIORES)
    // ==========================================
    const turnosAbiertos = await prisma.turnoCaja.findMany({
      where: { estado: EstadoTurno.ABIERTO },
      include: {
        usuarioCajero: { select: { id: true, nombre: true, username: true } },
      },
    });

    const turnoDiaAnterior = turnosAbiertos.find(
      (t) => obtenerFechaColombiaStr(t.fechaApertura) < fechaHoy
    );

    // ==========================================
    // ACCIÓN: APERTURA DE TURNO (COMPARTIDA O DIVIDIDA)
    // ==========================================
    if (accion === "APERTURA") {
      // Bloqueo estricto si hay caja de día anterior sin cerrar
      if (turnoDiaAnterior) {
        const fechaAnt = obtenerFechaColombiaStr(turnoDiaAnterior.fechaApertura);
        return NextResponse.json(
          {
            success: false,
            error: `ALERTA DE SEGURIDAD FINANCIERA: Existe un turno de caja del día anterior (${fechaAnt} en ${turnoDiaAnterior.nombreGabinete}) que no fue cerrado. Por política de control estricto, debe realizar primero el arqueo y cierre formal de esa caja antes de aperturar hoy.`,
            esDiaAnterior: true,
            turno: turnoDiaAnterior,
          },
          { status: 409 }
        );
      }

      // Validar si el usuario ya está en un turno activo de hoy
      const turnoHoyDelUsuario = turnosAbiertos.find((t) => {
        if (obtenerFechaColombiaStr(t.fechaApertura) !== fechaHoy) return false;
        if (t.usuarioCajeroId === usuarioResponsableId) return true;
        const participantes = parsearCajerosParticipantes(t.cajerosParticipantes);
        return participantes.some((p) => p.id === usuarioResponsableId || (deviceId && p.deviceId === deviceId));
      });

      if (turnoHoyDelUsuario) {
        return NextResponse.json(
          {
            success: false,
            error: `Usted ya tiene un turno de caja activo en ${turnoHoyDelUsuario.nombreGabinete}.`,
            turno: turnoHoyDelUsuario,
          },
          { status: 409 }
        );
      }

      const modalidadFinal: ModalidadCaja = modalidad === "DIVIDIDA" ? "DIVIDIDA" : "COMPARTIDA";
      const baseNumerica = Math.max(0, Math.round(Number(baseInicialEfectivo) * 100) / 100);

      // Si no especificó nombre de gabinete, generar uno intuitivo
      let nombreGabineteFinal = nombreGabinete?.trim();
      if (!nombreGabineteFinal) {
        const cantidadHoy = turnosAbiertos.filter(
          (t) => obtenerFechaColombiaStr(t.fechaApertura) === fechaHoy
        ).length;
        if (cantidadHoy === 0) {
          nombreGabineteFinal = "Gabinete #1 - Principal";
        } else {
          nombreGabineteFinal = `Gabinete #${cantidadHoy + 1} - ${usuarioObj.nombre}`;
        }
      }

      const participantesIniciales: CajeroParticipante[] = [
        {
          id: usuarioObj.id,
          nombre: usuarioObj.nombre,
          username: usuarioObj.username,
          fechaUnion: new Date().toISOString(),
          deviceId: deviceId || undefined,
        },
      ];

      const nuevoTurno = await prisma.turnoCaja.create({
        data: {
          usuarioCajeroId: usuarioResponsableId,
          baseInicialEfectivo: baseNumerica,
          nombreGabinete: nombreGabineteFinal,
          modalidad: modalidadFinal,
          cajerosParticipantes: JSON.stringify(participantesIniciales),
          estado: EstadoTurno.ABIERTO,
          observaciones:
            observaciones?.trim() ||
            `Apertura de ${nombreGabineteFinal} (${modalidadFinal === "DIVIDIDA" ? "Caja Dividida Independiente" : "Caja Compartida"})`,
        },
        include: {
          usuarioCajero: {
            select: { id: true, nombre: true, username: true },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          mensaje: `${nombreGabineteFinal} abierto exitosamente con base de $${baseNumerica.toLocaleString("es-CO")}`,
          turno: {
            ...nuevoTurno,
            cajerosParticipantes: participantesIniciales,
          },
          yaConectado: true,
        },
        { status: 201 }
      );
    }

    // ==========================================
    // ACCIÓN: UNIRSE A CAJA COMPARTIDA
    // ==========================================
    if (accion === "UNIRSE_COMPARTIDA") {
      if (turnoDiaAnterior) {
        const fechaAnt = obtenerFechaColombiaStr(turnoDiaAnterior.fechaApertura);
        return NextResponse.json(
          {
            success: false,
            error: `ALERTA DE SEGURIDAD FINANCIERA: Existe una caja del día anterior (${fechaAnt}) sin cerrar. Debe cerrarse antes de operar hoy.`,
            esDiaAnterior: true,
          },
          { status: 409 }
        );
      }

      // Buscar el turno al que unirse
      let turnoDestino = null;
      if (turnoCajaId) {
        turnoDestino = turnosAbiertos.find((t) => t.id === turnoCajaId);
      } else {
        // Buscar el primer turno de hoy
        turnoDestino =
          turnosAbiertos.find(
            (t) =>
              obtenerFechaColombiaStr(t.fechaApertura) === fechaHoy &&
              t.modalidad === "COMPARTIDA"
          ) || turnosAbiertos.find((t) => obtenerFechaColombiaStr(t.fechaApertura) === fechaHoy);
      }

      if (!turnoDestino) {
        return NextResponse.json(
          {
            success: false,
            error: "No se encontró ningún turno de caja abierto hoy para unirse.",
          },
          { status: 404 }
        );
      }

      // Validar si ya está participando
      const participantes = parsearCajerosParticipantes(turnoDestino.cajerosParticipantes);
      let pExistente = participantes.find((p) => p.id === usuarioResponsableId);

      if (!pExistente) {
        participantes.push({
          id: usuarioObj.id,
          nombre: usuarioObj.nombre,
          username: usuarioObj.username,
          fechaUnion: new Date().toISOString(),
          deviceId: deviceId || undefined,
        });

        await prisma.turnoCaja.update({
          where: { id: turnoDestino.id },
          data: {
            modalidad: "COMPARTIDA",
            cajerosParticipantes: JSON.stringify(participantes),
          },
        });
      } else if (deviceId && pExistente.deviceId !== deviceId) {
        pExistente.deviceId = deviceId;
        await prisma.turnoCaja.update({
          where: { id: turnoDestino.id },
          data: {
            cajerosParticipantes: JSON.stringify(participantes),
          },
        });
      }

      return NextResponse.json({
        success: true,
        mensaje: `Te has vinculado exitosamente a ${turnoDestino.nombreGabinete} en modalidad Caja Compartida.`,
        turnoId: turnoDestino.id,
        nombreGabinete: turnoDestino.nombreGabinete,
        yaConectado: true,
      });
    }

    // ==========================================
    // ACCIÓN: VINCULAR DISPOSITIVO A TURNO ACTIVO
    // ==========================================
    if (accion === "VINCULAR_DISPOSITIVO") {
      const targetId =
        turnoCajaId ||
        turnosAbiertos.find((t) => obtenerFechaColombiaStr(t.fechaApertura) === fechaHoy)?.id;

      if (!targetId) {
        return NextResponse.json(
          { success: false, error: "No hay ningún turno de caja abierto para vincular." },
          { status: 404 }
        );
      }

      const turno = await prisma.turnoCaja.findUnique({ where: { id: targetId } });
      if (!turno || turno.estado !== EstadoTurno.ABIERTO) {
        return NextResponse.json(
          { success: false, error: "El turno seleccionado no está disponible o ya fue cerrado." },
          { status: 404 }
        );
      }

      const participantes = parsearCajerosParticipantes(turno.cajerosParticipantes);
      let p = participantes.find((part) => part.id === usuarioResponsableId);

      if (!p) {
        participantes.push({
          id: usuarioObj.id,
          nombre: usuarioObj.nombre,
          username: usuarioObj.username,
          fechaUnion: new Date().toISOString(),
          deviceId: deviceId || undefined,
        });
      } else if (deviceId) {
        p.deviceId = deviceId;
      }

      await prisma.turnoCaja.update({
        where: { id: turno.id },
        data: { cajerosParticipantes: JSON.stringify(participantes) },
      });

      return NextResponse.json({
        success: true,
        mensaje: `Dispositivo vinculado a ${turno.nombreGabinete}`,
        turnoId: turno.id,
        nombreGabinete: turno.nombreGabinete,
        yaConectado: true,
      });
    }

    // ==========================================
    // ACCIÓN: CIERRE Y ARQUEO DEFINITIVO DE GABINETE
    // ==========================================
    if (accion === "CIERRE") {
      let turnoACerrar = null;

      if (turnoCajaId) {
        turnoACerrar = await prisma.turnoCaja.findUnique({
          where: { id: turnoCajaId },
          include: {
            usuarioCajero: { select: { id: true, nombre: true, username: true } },
          },
        });
      } else {
        // Buscar el turno activo del usuario o el primero abierto
        const turnosActivos = await prisma.turnoCaja.findMany({
          where: { estado: EstadoTurno.ABIERTO },
          include: {
            usuarioCajero: { select: { id: true, nombre: true, username: true } },
          },
          orderBy: { fechaApertura: "desc" },
        });

        turnoACerrar =
          turnosActivos.find((t) => {
            if (t.usuarioCajeroId === usuarioResponsableId) return true;
            const p = parsearCajerosParticipantes(t.cajerosParticipantes);
            return p.some((c) => c.id === usuarioResponsableId);
          }) || turnosActivos[0];
      }

      if (!turnoACerrar || turnoACerrar.estado !== EstadoTurno.ABIERTO) {
        return NextResponse.json(
          { success: false, error: "No hay ningún turno de caja ABIERTO para cerrar con los datos suministrados" },
          { status: 404 }
        );
      }

      // Validar monto de efectivo físico en gaveta (acepta tanto efectivoFisicoContado como efectivoContado)
      const valorEntrada = efectivoFisicoContado !== undefined ? efectivoFisicoContado : efectivoContado;
      const efectivoFisico = Math.round(Number(valorEntrada) * 100) / 100;
      if (isNaN(efectivoFisico) || efectivoFisico < 0) {
        return NextResponse.json(
          { success: false, error: "Debe ingresar el valor de efectivo físico contado en la gaveta" },
          { status: 400 }
        );
      }

      // Calcular abonos asociados estrictamente a este turno de gabinete
      const abonos = await prisma.abono.findMany({
        where: {
          OR: [
            { turnoCajaId: turnoACerrar.id },
            { turnoCajaId: null, fecha: { gte: turnoACerrar.fechaApertura } },
          ],
        },
      });

      let totalEfectivo = 0;
      let totalNequi = 0;
      let totalDaviplata = 0;
      let totalTransferencia = 0;
      let totalConsignacion = 0;

      for (const a of abonos) {
        const m = Number(a.monto) || 0;
        if (a.metodoPago === MetodoPago.EFECTIVO) totalEfectivo += m;
        else if (a.metodoPago === MetodoPago.NEQUI) totalNequi += m;
        else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += m;
        else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += m;
        else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += m;
      }

      const base = Number(turnoACerrar.baseInicialEfectivo) || 0;
      const totalRecaudado =
        Math.round(
          (totalEfectivo + totalNequi + totalDaviplata + totalTransferencia + totalConsignacion) *
            100
        ) / 100;
      const esperadoGaveta = Math.round((base + totalEfectivo) * 100) / 100;
      const diferenciaEfectivo = Math.round((efectivoFisico - esperadoGaveta) * 100) / 100;
      const tieneDiferencia = Math.abs(diferenciaEfectivo) > 0.001;

      // REGLA DE ARQUEO SIN BLOQUEO PERO CON NOTA DE NOVEDAD OBLIGATORIA:
      // Si hay desviación, no se bloquea el cierre pero se exige documentar el motivo.
      const notaLimpia = typeof notaNovedad === "string" ? notaNovedad.trim() : "";
      if (tieneDiferencia && !notaLimpia) {
        const tipoDesv = diferenciaEfectivo > 0 ? "sobrante" : "faltante";
        return NextResponse.json(
          {
            success: false,
            error: `Se ha detectado una diferencia (${tipoDesv}) de $${Math.abs(diferenciaEfectivo).toLocaleString("es-CO")} en el arqueo. Debe registrar obligatoriamente la Nota de Novedad / Justificación de la Diferencia antes de confirmar.`,
            requiereNotaNovedad: true,
            diferencia: diferenciaEfectivo,
            efectivoEsperado: esperadoGaveta,
            efectivoContado: efectivoFisico,
          },
          { status: 400 }
        );
      }

      // Facturas generadas en este turno
      const facturasTurno = await prisma.factura.findMany({
        where: {
          OR: [
            { turnoCajaId: turnoACerrar.id },
            { turnoCajaId: null, fechaCreacion: { gte: turnoACerrar.fechaApertura } },
          ],
        },
      });

      let totalVentas = 0;
      let totalAlquileres = 0;
      let totalArreglos = 0;

      for (const fac of facturasTurno) {
        totalVentas += fac.subtotalProductos || 0;
        totalArreglos += fac.subtotalArreglosLibres || 0;
        if (fac.tipoOperacion === "ALQUILER") totalAlquileres += fac.totalFactura || 0;
      }

      const fechaCierre = new Date();

      // Transacción atómica: Cerrar turno y generar CierreCaja con campos inmutables
      const resultadoCierre = await prisma.$transaction(async (tx) => {
        const nuevoCierre = await tx.cierreCaja.create({
          data: {
            usuarioId: usuarioResponsableId,
            tipo:
              tipoCierre === "CONSOLIDADO_MENSUAL"
                ? TipoCierre.CONSOLIDADO_MENSUAL
                : TipoCierre.DIARIO,
            fechaInicio: turnoACerrar.fechaApertura,
            fechaFin: fechaCierre,
            totalBaseInicial: base,
            totalEfectivo: Math.round(totalEfectivo * 100) / 100,
            totalNequi: Math.round(totalNequi * 100) / 100,
            totalDaviplata: Math.round(totalDaviplata * 100) / 100,
            totalTransferencia: Math.round(totalTransferencia * 100) / 100,
            totalConsignacion: Math.round(totalConsignacion * 100) / 100,
            totalGeneral: totalRecaudado,
            // Auditoría y Novedades del Arqueo
            efectivoEsperado: esperadoGaveta,
            efectivoContado: efectivoFisico,
            diferencia: diferenciaEfectivo,
            tieneDiferencia,
            notaNovedad: notaLimpia || null,
            modalidad: turnoACerrar.modalidad || "COMPARTIDA",
            nombreGabinete: turnoACerrar.nombreGabinete || "Gabinete #1 - Principal",
            totalVentas: Math.round(totalVentas * 100) / 100,
            totalAlquileres: Math.round(totalAlquileres * 100) / 100,
            totalArreglos: Math.round(totalArreglos * 100) / 100,
            cantidadFacturas: facturasTurno.length,
            observaciones:
              observaciones?.trim() ||
              (tieneDiferencia
                ? `Cierre de ${turnoACerrar.nombreGabinete} con novedad/diferencia de $${diferenciaEfectivo}: ${notaLimpia}`
                : `Cierre de ${turnoACerrar.nombreGabinete} con cuadre exacto`),
          },
        });

        const turnoCerrado = await tx.turnoCaja.update({
          where: { id: turnoACerrar.id },
          data: {
            estado: EstadoTurno.CERRADO,
            fechaCierre,
            totalEfectivo: Math.round(totalEfectivo * 100) / 100,
            totalNequi: Math.round(totalNequi * 100) / 100,
            totalDaviplata: Math.round(totalDaviplata * 100) / 100,
            totalTransferencia: Math.round(totalTransferencia * 100) / 100,
            totalConsignacion: Math.round(totalConsignacion * 100) / 100,
            totalRecaudado,
            diferenciaEfectivo,
            efectivoEsperado: esperadoGaveta,
            efectivoContado: efectivoFisico,
            diferencia: diferenciaEfectivo,
            tieneDiferencia,
            notaNovedad: notaLimpia || null,
            cierreCajaId: nuevoCierre.id,
            observaciones: observaciones?.trim() || null,
          },
          include: {
            usuarioCajero: {
              select: { id: true, nombre: true, username: true },
            },
          },
        });

        return { turnoCerrado, nuevoCierre };
      });

      // Disparar respaldo automático SQLite VACUUM INTO
      try {
        await ejecutarRespaldoEnCaliente("CIERRE_CAJA");
      } catch (backupErr) {
        console.warn("[BACKUP] No se pudo completar el respaldo automático tras cierre:", backupErr);
      }

      return NextResponse.json({
        success: true,
        mensaje: `Cierre de ${turnoACerrar.nombreGabinete} completado exitosamente`,
        cierre: resultadoCierre.nuevoCierre,
        turno: resultadoCierre.turnoCerrado,
        cuadre: {
          nombreGabinete: turnoACerrar.nombreGabinete,
          baseInicial: base,
          totalEfectivo,
          esperadoGaveta,
          efectivoEsperado: esperadoGaveta,
          efectivoFisicoContado: efectivoFisico,
          efectivoContado: efectivoFisico,
          diferenciaEfectivo,
          diferencia: diferenciaEfectivo,
          tieneDiferencia,
          notaNovedad: notaLimpia || null,
          totalDigital: totalRecaudado - totalEfectivo,
          totalRecaudado,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida. Use 'APERTURA', 'UNIRSE_COMPARTIDA' o 'CIERRE'" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Error al procesar apertura/cierre de caja:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar la operación de caja" },
      { status: 500 }
    );
  }
}
