import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest, NOMBRE_COOKIE_SESION, OPCIONES_COOKIE_SESION } from "@/lib/auth";
import { ejecutarRespaldoEnCaliente, ResultadoRespaldo } from "@/lib/backup";

export async function POST(req: NextRequest) {
  let resultadoRespaldo: ResultadoRespaldo | null = null;
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Desconocido";
  const esBeacon = req.nextUrl.searchParams.get("beacon") === "1";

  try {
    // 1. Obtener sesión actual del usuario antes de cerrar
    const sesion = await obtenerSesionDesdeRequest(req);

    if (sesion?.userId) {
      // Liberar inmediatamente el candado de sesión única en SQLite
      try {
        await prisma.user.update({
          where: { id: sesion.userId },
          data: {
            sesionActivaToken: null,
            sesionDispositivoId: null,
            sesionIp: null,
            sesionUltimaActividad: null,
          },
        });
      } catch (errUser) {
        console.warn("[LOGOUT] Advertencia al liberar candado de sesión en BD:", errUser);
      }

      // Registrar auditoría de cierre de sesión
      try {
        await prisma.auditoriaSesion.create({
          data: {
            userId: sesion.userId,
            accion: "LOGOUT",
            detalles: `Cierre de sesión de ${sesion.username} (${sesion.rol})${esBeacon ? " [Beacon/Cierre Pestaña]" : ""}`,
            ip,
            userAgent,
          },
        });
      } catch (errAuditoria) {
        console.warn("[AUDITORIA LOGOUT] No se pudo guardar registro de auditoría:", errAuditoria);
      }
    }

    // 2. Disparar el respaldo en caliente SQLite (VACUUM INTO) hacia C:\POS_BACKUPS
    // Try/catch robusto: un fallo en el disco secundario NUNCA debe bloquear el logout del cajero
    if (!esBeacon) {
      try {
        const motivo = `LOGOUT_${sesion?.username || "DESCONOCIDO"}`;
        resultadoRespaldo = await ejecutarRespaldoEnCaliente(motivo);
      } catch (errBackup) {
        console.error("[RESPALDO LOGOUT] Fallo al ejecutar respaldo durante logout:", errBackup);
      }
    } else {
      // Si fue por cierre de pestaña/navegador (sendBeacon), ejecutar en segundo plano sin bloquear
      const motivo = `BEACON_${sesion?.username || "DESCONOCIDO"}`;
      ejecutarRespaldoEnCaliente(motivo).catch(() => {});
    }

    // 3. Preparar la respuesta y limpiar la cookie de sesión
    const respuesta = NextResponse.json({
      ok: true,
      mensaje: "Sesión cerrada exitosamente y cuenta liberada.",
      respaldo: resultadoRespaldo,
      redirectTo: "/login",
    });

    respuesta.cookies.set({
      name: NOMBRE_COOKIE_SESION,
      value: "",
      ...OPCIONES_COOKIE_SESION,
      maxAge: 0,
      expires: new Date(0),
    });

    return respuesta;
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error inesperado al cerrar sesión";
    console.error("[ERROR GENERAL LOGOUT]", errorMensaje);

    const respuestaEmergencia = NextResponse.json(
      {
        ok: true,
        mensaje: "Sesión cerrada con advertencias.",
        respaldo: resultadoRespaldo,
        error: errorMensaje,
        redirectTo: "/login",
      },
      { status: 200 }
    );

    respuestaEmergencia.cookies.set({
      name: NOMBRE_COOKIE_SESION,
      value: "",
      ...OPCIONES_COOKIE_SESION,
      maxAge: 0,
      expires: new Date(0),
    });

    return respuestaEmergencia;
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
