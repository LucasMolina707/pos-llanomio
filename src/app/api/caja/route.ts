import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { verificarEstadoCajaParaFacturacion, obtenerFechaColombiaStr } from "@/lib/caja-control";
import { EstadoTurno, MetodoPago, TipoCierre } from "@prisma/client";

/**
 * GET /api/caja
 * Retorna el turno de caja abierto actual con su arqueo en tiempo real,
 * la verificación de seguridad estricta de fecha y el historial de turnos recientes.
 */
export async function GET(req: NextRequest) {
  try {
    const verificacionSeguridad = await verificarEstadoCajaParaFacturacion(prisma);

    const turnoAbierto = await prisma.turnoCaja.findFirst({
      where: { estado: EstadoTurno.ABIERTO },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true, rol: true },
        },
      },
      orderBy: { fechaApertura: "desc" },
    });

    let arqueoActual = null;

    if (turnoAbierto) {
      // Obtener todos los abonos registrados desde la fecha de apertura del turno
      const abonos = await prisma.abono.findMany({
        where: {
          fecha: {
            gte: turnoAbierto.fechaApertura,
          },
        },
        select: {
          id: true,
          monto: true,
          metodoPago: true,
          fecha: true,
          facturaId: true,
        },
      });

      let totalEfectivo = 0;
      let totalNequi = 0;
      let totalDaviplata = 0;
      let totalTransferencia = 0;
      let totalConsignacion = 0;

      for (const a of abonos) {
        const monto = Number(a.monto) || 0;
        if (a.metodoPago === MetodoPago.EFECTIVO) totalEfectivo += monto;
        else if (a.metodoPago === MetodoPago.NEQUI) totalNequi += monto;
        else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += monto;
        else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += monto;
        else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += monto;
      }

      const baseInicial = Number(turnoAbierto.baseInicialEfectivo) || 0;
      const totalRecaudado = Math.round((totalEfectivo + totalNequi + totalDaviplata + totalTransferencia + totalConsignacion) * 100) / 100;
      const esperadoEnGavetaEfectivo = Math.round((baseInicial + totalEfectivo) * 100) / 100;

      // Conteo de facturas creadas en este turno
      const cantidadFacturasTurno = await prisma.factura.count({
        where: {
          fechaCreacion: {
            gte: turnoAbierto.fechaApertura,
          },
        },
      });

      arqueoActual = {
        baseInicialEfectivo: baseInicial,
        totalEfectivo: Math.round(totalEfectivo * 100) / 100,
        totalNequi: Math.round(totalNequi * 100) / 100,
        totalDaviplata: Math.round(totalDaviplata * 100) / 100,
        totalTransferencia: Math.round(totalTransferencia * 100) / 100,
        totalConsignacion: Math.round(totalConsignacion * 100) / 100,
        totalRecaudado,
        esperadoEnGavetaEfectivo,
        cantidadAbonos: abonos.length,
        cantidadFacturas: cantidadFacturasTurno,
      };
    }

    // Historial de turnos cerrados recientemente
    const historialTurnos = await prisma.turnoCaja.findMany({
      where: { estado: EstadoTurno.CERRADO },
      take: 15,
      orderBy: { fechaCierre: "desc" },
      include: {
        usuarioCajero: {
          select: { id: true, nombre: true, username: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      hayTurnoAbierto: !!turnoAbierto,
      turnoAbierto,
      arqueoActual,
      verificacionSeguridad,
      historialTurnos,
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
 * Apertura y Cierre de turno de caja
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const body = await req.json();
    const { accion, baseInicialEfectivo = 0, efectivoFisicoContado, observaciones, tipoCierre = "DIARIO" } = body;

    // 1. Identificar cajero o administrador responsable
    let usuarioId = sesion?.userId;
    if (!usuarioId) {
      const usuarioActivo = await prisma.user.findFirst({
        where: { activo: true },
        select: { id: true },
      });
      if (!usuarioActivo) {
        return NextResponse.json(
          { success: false, error: "No se identificó un usuario activo para la operación de caja" },
          { status: 401 }
        );
      }
      usuarioId = usuarioActivo.id;
    }

    // ==========================================
    // ACCIÓN: APERTURA DE TURNO
    // ==========================================
    if (accion === "APERTURA") {
      // Verificar que no haya un turno ya abierto
      const turnoExistente = await prisma.turnoCaja.findFirst({
        where: { estado: EstadoTurno.ABIERTO },
      });

      if (turnoExistente) {
        const fechaAperturaTurno = obtenerFechaColombiaStr(turnoExistente.fechaApertura);
        const fechaHoy = obtenerFechaColombiaStr();
        const esDiaAnterior = fechaAperturaTurno < fechaHoy;

        const mensajeError = esDiaAnterior
          ? `ALERTA DE SEGURIDAD FINANCIERA: Existe un turno de caja del día anterior (${fechaAperturaTurno}) que no fue cerrado. Por política de control estricto, debe realizar primero el arqueo y cierre formal de esa caja antes de aperturar el día de hoy.`
          : "Ya existe un turno de caja actualmente ABIERTO para el día de hoy. No puede abrir otro turno simultáneo.";

        return NextResponse.json(
          {
            success: false,
            error: mensajeError,
            esDiaAnterior,
            turno: turnoExistente,
          },
          { status: 409 }
        );
      }

      const baseNumerica = Math.max(0, Math.round(Number(baseInicialEfectivo) * 100) / 100);

      const nuevoTurno = await prisma.turnoCaja.create({
        data: {
          usuarioCajeroId: usuarioId,
          baseInicialEfectivo: baseNumerica,
          estado: EstadoTurno.ABIERTO,
          observaciones: observaciones?.trim() || "Apertura regular de turno",
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
          mensaje: `Turno de caja abierto exitosamente con base de $${baseNumerica.toLocaleString("es-CO")}`,
          turno: nuevoTurno,
        },
        { status: 201 }
      );
    }

    // ==========================================
    // ACCIÓN: CIERRE Y ARQUEO DEFINITIVO
    // ==========================================
    if (accion === "CIERRE") {
      const turnoAbierto = await prisma.turnoCaja.findFirst({
        where: { estado: EstadoTurno.ABIERTO },
      });

      if (!turnoAbierto) {
        return NextResponse.json(
          { success: false, error: "No hay ningún turno de caja ABIERTO para cerrar" },
          { status: 404 }
        );
      }

      // Validar monto de efectivo físico en gaveta
      const efectivoFisico = Math.round(Number(efectivoFisicoContado) * 100) / 100;
      if (isNaN(efectivoFisico) || efectivoFisico < 0) {
        return NextResponse.json(
          { success: false, error: "Debe ingresar el valor de efectivo físico contado en la gaveta" },
          { status: 400 }
        );
      }

      // Calcular abonos desde la apertura
      const abonos = await prisma.abono.findMany({
        where: {
          fecha: {
            gte: turnoAbierto.fechaApertura,
          },
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

      const base = Number(turnoAbierto.baseInicialEfectivo) || 0;
      const totalRecaudado = Math.round((totalEfectivo + totalNequi + totalDaviplata + totalTransferencia + totalConsignacion) * 100) / 100;
      const esperadoGaveta = Math.round((base + totalEfectivo) * 100) / 100;
      const diferenciaEfectivo = Math.round((efectivoFisico - esperadoGaveta) * 100) / 100;

      // Calcular facturas creadas en este periodo para el desglose consolidado
      const facturasTurno = await prisma.factura.findMany({
        where: {
          fechaCreacion: {
            gte: turnoAbierto.fechaApertura,
          },
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

      // Transacción atómica: Cerrar turno y generar CierreCaja inmutable
      const resultadoCierre = await prisma.$transaction(async (tx) => {
        // Crear registro en CierreCaja
        const nuevoCierre = await tx.cierreCaja.create({
          data: {
            usuarioId,
            tipo: tipoCierre === "CONSOLIDADO_MENSUAL" ? TipoCierre.CONSOLIDADO_MENSUAL : TipoCierre.DIARIO,
            fechaInicio: turnoAbierto.fechaApertura,
            fechaFin: fechaCierre,
            totalBaseInicial: base,
            totalEfectivo: Math.round(totalEfectivo * 100) / 100,
            totalNequi: Math.round(totalNequi * 100) / 100,
            totalDaviplata: Math.round(totalDaviplata * 100) / 100,
            totalTransferencia: Math.round(totalTransferencia * 100) / 100,
            totalConsignacion: Math.round(totalConsignacion * 100) / 100,
            totalGeneral: totalRecaudado,
            totalVentas: Math.round(totalVentas * 100) / 100,
            totalAlquileres: Math.round(totalAlquileres * 100) / 100,
            totalArreglos: Math.round(totalArreglos * 100) / 100,
            cantidadFacturas: facturasTurno.length,
            observaciones: observaciones?.trim() || `Cierre con diferencia de $${diferenciaEfectivo}`,
          },
        });

        // Actualizar el turno de caja
        const turnoCerrado = await tx.turnoCaja.update({
          where: { id: turnoAbierto.id },
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

      return NextResponse.json({
        success: true,
        mensaje: "Cierre de caja completado exitosamente",
        cierre: resultadoCierre.nuevoCierre,
        turno: resultadoCierre.turnoCerrado,
        cuadre: {
          baseInicial: base,
          totalEfectivo,
          esperadoGaveta,
          efectivoFisicoContado: efectivoFisico,
          diferenciaEfectivo,
          totalDigital: totalRecaudado - totalEfectivo,
          totalRecaudado,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida. Use 'APERTURA' o 'CIERRE'" },
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
