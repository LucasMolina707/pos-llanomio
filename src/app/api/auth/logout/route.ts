import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest, NOMBRE_COOKIE_SESION, OPCIONES_COOKIE_SESION } from "@/lib/auth";
import { ejecutarRespaldoEnCaliente, ResultadoRespaldo } from "@/lib/backup";

export async function POST(req: NextRequest) {
  let resultadoRespaldo: ResultadoRespaldo | null = null;
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Desconocido";

  try {
    // 1. Obtener sesión actual del usuario antes de cerrar
    const sesion = await obtenerSesionDesdeRequest(req);

    if (sesion?.userId) {
      // Registrar auditoría de cierre de sesión
      try {
        await prisma.auditoriaSesion.create({
          data: {
            userId: sesion.userId,
            accion: "LOGOUT",
            detalles: `Cierre de sesión de ${sesion.username} (${sesion.rol})`,
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
    try {
      const motivo = `LOGOUT_${sesion?.username || "DESCONOCIDO"}`;
      resultadoRespaldo = await ejecutarRespaldoEnCaliente(motivo);
    } catch (errBackup) {
      console.error("[RESPALDO LOGOUT] Fallo crítico al ejecutar respaldo durante logout:", errBackup);
    }

    // 3. Preparar la respuesta y limpiar la cookie de sesión
    const respuesta = NextResponse.json({
      ok: true,
      mensaje: "Sesión cerrada exitosamente.",
      respaldo: resultadoRespaldo,
      redirectTo: "/login",
    });

    respuesta.cookies.set({
      name: NOMBRE_COOKIE_SESION,
      value: "",
      ...OPCIONES_COOKIE_SESION,
      maxAge: 0,
    });

    return respuesta;
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error inesperado al cerrar sesión";
    console.error("[ERROR GENERAL LOGOUT]", errorMensaje);

    // Incluso si algo inesperado falla, garantizar que la cookie se elimine
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
    });

    return respuestaEmergencia;
  }
}
