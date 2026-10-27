import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
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
      },
    });

    if (!usuarioBD || !usuarioBD.activo) {
      return NextResponse.json(
        { ok: false, error: "Usuario inactivo o no encontrado.", user: null },
        { status: 401 }
      );
    }

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
