import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarEstadoCajaParaFacturacion } from "@/lib/caja-control";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import { MetodoPago } from "@prisma/client";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/caja/estado
 * Verifica el estado del turno de caja en tiempo real y valida la regla estricta de seguridad y multi-cajero:
 * - Caso A: Sin turno abierto hoy => Bloqueo con modal de apertura y base inicial.
 * - Caso B: Turno abierto de un día anterior => Bloqueo crítico financiero con obligación de cierre y arqueo previo.
 * - Caso C: Turno abierto hoy y usuario asignado => Habilitado para facturación normal en su gabinete.
 * - Caso D: Turno abierto hoy pero usuario no asignado => REQUIERE_DECISION_MODALIDAD (Caja Compartida vs Caja Dividida).
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    const usuarioId = sesion?.userId;
    const deviceId = req.nextUrl.searchParams.get("deviceId") || undefined;

    const verificacion = await verificarEstadoCajaParaFacturacion(prisma, usuarioId, deviceId);

    let arqueoTurno = null;

    if (verificacion.turnoAbierto) {
      const turnoId = verificacion.turnoAbierto.id;
      const fechaApertura = new Date(verificacion.turnoAbierto.fechaApertura);

      // Calcular abonos recibidos en este turno de gabinete
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
          cajeroId: true,
          cajero: {
            select: { id: true, nombre: true, username: true },
          },
        },
      });

      let totalEfectivo = 0;
      let totalDigital = 0;
      let totalNequi = 0;
      let totalDaviplata = 0;
      let totalTransferencia = 0;
      let totalConsignacion = 0;

      const desgloseCajerosMap = new Map<
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
        const m = Number(a.monto) || 0;
        const cId = a.cajeroId;
        const cNombre = a.cajero?.nombre || "Cajero";
        const cUser = a.cajero?.username || "cajero";

        if (!desgloseCajerosMap.has(cId)) {
          desgloseCajerosMap.set(cId, {
            cajeroId: cId,
            nombre: cNombre,
            username: cUser,
            efectivo: 0,
            digital: 0,
            total: 0,
            cantidadAbonos: 0,
          });
        }
        const cajeroStat = desgloseCajerosMap.get(cId)!;
        cajeroStat.cantidadAbonos += 1;
        cajeroStat.total += m;

        if (a.metodoPago === MetodoPago.EFECTIVO) {
          totalEfectivo += m;
          cajeroStat.efectivo += m;
        } else {
          totalDigital += m;
          cajeroStat.digital += m;
          if (a.metodoPago === MetodoPago.NEQUI) totalNequi += m;
          else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += m;
          else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += m;
          else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += m;
        }
      }

      // Consultar depósitos de alquiler vinculados al turno
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
      const base = Number(verificacion.turnoAbierto.baseInicialEfectivo) || 0;
      const saldoActualEnCajon = Math.round((base + totalEfectivo + netoDepositosEfectivo) * 100) / 100;
      const totalDigitalConDepositos = Math.round((totalDigital + depositosDigitalesRecibidos) * 100) / 100;
      const totalRecaudado = Math.round((totalEfectivo + netoDepositosEfectivo + totalDigitalConDepositos) * 100) / 100;
      const esperadoEnGaveta = saldoActualEnCajon;

      const cantidadFacturas = await prisma.factura.count({
        where: {
          OR: [
            { turnoCajaId: turnoId },
            { turnoCajaId: null, fechaCreacion: { gte: fechaApertura } },
          ],
        },
      });

      arqueoTurno = {
        baseInicialEfectivo: base,
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
        esperadoEnGaveta,
        cantidadAbonos: abonos.length,
        cantidadFacturas,
        desgloseCajeros: Array.from(desgloseCajerosMap.values()).map((c) => ({
          ...c,
          efectivo: Math.round(c.efectivo * 100) / 100,
          digital: Math.round(c.digital * 100) / 100,
          total: Math.round(c.total * 100) / 100,
        })),
      };
    }

    return NextResponse.json(
      {
        success: true,
        ...verificacion,
        arqueoTurno,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al consultar estado de seguridad de caja:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al verificar el estado de la caja",
        bloqueadoParaFacturar: true,
        motivoBloqueo: "Error de verificación de caja. Intente nuevamente.",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
