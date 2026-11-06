import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionDesdeRequest, NOMBRE_COOKIE_SESION, OPCIONES_COOKIE_SESION } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsearPermisos, PERMISOS_DEFAULT_ADMIN } from "@/lib/usuarios-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    // Validación estricta contra base de datos local SQLite
    const usuarioBD = await prisma.user.findUnique({
      where: { id: sesion.userId },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        activo: true,
        permisos: true,
        documentoIdentidad: true,
        bloqueadoHasta: true,
        sesionActivaToken: true,
        sesionUltimaActividad: true,
      },
    });

    if (!usuarioBD || !usuarioBD.activo) {
      const resp = NextResponse.json(
        { ok: false, error: "Usuario inactivo o no encontrado.", user: null },
        { status: 401 }
      );
      resp.cookies.set({
        name: NOMBRE_COOKIE_SESION,
        value: "",
        ...OPCIONES_COOKIE_SESION,
        maxAge: 0,
        expires: new Date(0),
      });
      return resp;
    }

    // Verificar si la sesión activa en BD pertenece a otro token (sesión reemplazada en otro equipo)
    if (
      usuarioBD.sesionActivaToken &&
      sesion.sessionToken &&
      usuarioBD.sesionActivaToken !== sesion.sessionToken
    ) {
      const resp = NextResponse.json(
        {
          ok: false,
          error: "Esta sesión ha sido cerrada porque la cuenta fue abierta en otro dispositivo.",
          sesionReemplazada: true,
          user: null,
        },
        { status: 401 }
      );
      resp.cookies.set({
        name: NOMBRE_COOKIE_SESION,
        value: "",
        ...OPCIONES_COOKIE_SESION,
        maxAge: 0,
        expires: new Date(0),
      });
      return resp;
    }

    // Actualizar latido / heartbeat en SQLite para mantener viva la sesión activa
    await prisma.user.update({
      where: { id: usuarioBD.id },
      data: {
        sesionUltimaActividad: new Date(),
        ...(sesion.sessionToken && !usuarioBD.sesionActivaToken ? { sesionActivaToken: sesion.sessionToken } : {}),
      },
    }).catch(() => {});

    // Verificar si la cuenta se encuentra bloqueada por intentos fallidos
    if (usuarioBD.bloqueadoHasta && new Date(usuarioBD.bloqueadoHasta) > new Date()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cuenta temporalmente bloqueada por seguridad.",
          bloqueadoHasta: usuarioBD.bloqueadoHasta,
          user: null,
        },
        { status: 423 }
      );
    }

    const esAdmin = usuarioBD.rol === "ADMIN" || usuarioBD.username === "admin";
    const permisosParsed = esAdmin
      ? { ...PERMISOS_DEFAULT_ADMIN }
      : parsearPermisos(usuarioBD.permisos, usuarioBD.rol);

    return NextResponse.json({
      ok: true,
      user: {
        id: usuarioBD.id,
        userId: usuarioBD.id,
        username: usuarioBD.username,
        nombre: usuarioBD.nombre,
        rol: usuarioBD.rol,
        esAdmin,
        permisos: permisosParsed,
        documentoIdentidad: usuarioBD.documentoIdentidad,
      },
    });
  } catch (error) {
    console.error("Error en /api/auth/me:", error);
    return NextResponse.json({ ok: false, user: null }, { status: 500 });
  }
}
