import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verificarEstadoCajaParaFacturacion,
  calcularArqueoExactoTurno,
  ArqueoTurnoResultado,
} from "@/lib/caja-control";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

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

    let arqueoTurno: ArqueoTurnoResultado | null = null;

    if (verificacion.turnoAbierto) {
      arqueoTurno = await calcularArqueoExactoTurno(prisma, {
        id: verificacion.turnoAbierto.id,
        fechaApertura: verificacion.turnoAbierto.fechaApertura,
        baseInicialEfectivo: verificacion.turnoAbierto.baseInicialEfectivo,
      });
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
