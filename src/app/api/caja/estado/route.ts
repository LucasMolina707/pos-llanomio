import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarEstadoCajaParaFacturacion } from "@/lib/caja-control";
import { MetodoPago } from "@prisma/client";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/caja/estado
 * Verifica el estado del turno de caja en tiempo real y valida la regla estricta de seguridad:
 * - Caso A: Sin turno abierto hoy => Bloqueo con modal de apertura y base inicial.
 * - Caso B: Turno abierto de un día anterior => Bloqueo crítico financiero con obligación de cierre y arqueo previo.
 * - Caso C: Turno abierto hoy => Habilitado para facturación normal.
 */
export async function GET(req: NextRequest) {
  try {
    const verificacion = await verificarEstadoCajaParaFacturacion(prisma);

    let arqueoTurno = null;

    if (verificacion.turnoAbierto) {
      const fechaApertura = new Date(verificacion.turnoAbierto.fechaApertura);

      // Calcular abonos recibidos en este turno
      const abonos = await prisma.abono.findMany({
        where: {
          fecha: {
            gte: fechaApertura,
          },
        },
        select: {
          id: true,
          monto: true,
          metodoPago: true,
        },
      });

      let totalEfectivo = 0;
      let totalDigital = 0;
      let totalNequi = 0;
      let totalDaviplata = 0;
      let totalTransferencia = 0;
      let totalConsignacion = 0;

      for (const a of abonos) {
        const m = Number(a.monto) || 0;
        if (a.metodoPago === MetodoPago.EFECTIVO) {
          totalEfectivo += m;
        } else {
          totalDigital += m;
          if (a.metodoPago === MetodoPago.NEQUI) totalNequi += m;
          else if (a.metodoPago === MetodoPago.DAVIPLATA) totalDaviplata += m;
          else if (a.metodoPago === MetodoPago.TRANSFERENCIA) totalTransferencia += m;
          else if (a.metodoPago === MetodoPago.CONSIGNACION) totalConsignacion += m;
        }
      }

      const base = Number(verificacion.turnoAbierto.baseInicialEfectivo) || 0;
      const totalRecaudado = Math.round((totalEfectivo + totalDigital) * 100) / 100;
      const esperadoEnGaveta = Math.round((base + totalEfectivo) * 100) / 100;

      const cantidadFacturas = await prisma.factura.count({
        where: {
          fechaCreacion: {
            gte: fechaApertura,
          },
        },
      });

      arqueoTurno = {
        baseInicialEfectivo: base,
        totalEfectivo: Math.round(totalEfectivo * 100) / 100,
        totalDigital: Math.round(totalDigital * 100) / 100,
        totalNequi: Math.round(totalNequi * 100) / 100,
        totalDaviplata: Math.round(totalDaviplata * 100) / 100,
        totalTransferencia: Math.round(totalTransferencia * 100) / 100,
        totalConsignacion: Math.round(totalConsignacion * 100) / 100,
        totalRecaudado,
        esperadoEnGaveta,
        cantidadAbonos: abonos.length,
        cantidadFacturas,
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
