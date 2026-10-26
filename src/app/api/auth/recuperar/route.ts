import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { sincronizarArchivoCredencialesMaestras } from "@/lib/usuarios-sync";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/auth/recuperar
 * Retorna la lista de usuarios activos para facilitar la selección en el modal de recuperación.
 */
export async function GET() {
  try {
    const usuarios = await prisma.user.findMany({
      where: { activo: true },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
      },
      orderBy: { username: "asc" },
    });

    return NextResponse.json({ ok: true, success: true, usuarios }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    console.error("Error al consultar usuarios para recuperación:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al consultar usuarios" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/auth/recuperar
 * Restablece la contraseña de cualquier usuario validando la Llave Maestra Local de Recuperación.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, masterKey, nuevaPassword } = body;

    if (!username?.trim()) {
      return NextResponse.json(
        { success: false, error: "Debe especificar el nombre de usuario a restaurar" },
        { status: 400 }
      );
    }

    if (!masterKey?.trim()) {
      return NextResponse.json(
        { success: false, error: "Debe ingresar la Llave Maestra de Recuperación Local" },
        { status: 400 }
      );
    }

    if (!nuevaPassword || nuevaPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "La nueva contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    // Validar Llave Maestra Local (desde .env o fallback oficial de tienda)
    const masterKeyEsperada = (process.env.MASTER_RECOVERY_KEY || "LLANOMIO-ADMIN-2026").trim();
    if (masterKey.trim() !== masterKeyEsperada) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Llave Maestra de Recuperación inválida. Consulte el archivo USUARIOS_Y_CREDENCIALES_MAESTRAS.md en el servidor.",
        },
        { status: 401 }
      );
    }

    // Buscar el usuario a restaurar
    const usuarioTarget = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
        },
      },
    });

    if (!usuarioTarget) {
      return NextResponse.json(
        {
          success: false,
          error: `El usuario '${username}' no se encuentra registrado en el sistema local.`,
        },
        { status: 404 }
      );
    }

    // Hashear la nueva contraseña con bcryptjs (saltRounds: 10)
    const nuevoHash = await bcrypt.hash(nuevaPassword.trim(), 10);
    const ahora = new Date();

    await prisma.user.update({
      where: { id: usuarioTarget.id },
      data: {
        passwordHash: nuevoHash,
        ultimaRestauracion: ahora,
      },
    });

    // Auto-sincronizar el archivo maestro de credenciales en la raíz
    await sincronizarArchivoCredencialesMaestras(prisma);

    return NextResponse.json({
      ok: true,
      success: true,
      mensaje: `Contraseña restablecida exitosamente para @${usuarioTarget.username} (${usuarioTarget.nombre}). Ya puede iniciar sesión con su nueva clave.`,
      username: usuarioTarget.username,
      nombre: usuarioTarget.nombre,
    });
  } catch (error: unknown) {
    console.error("Error en recuperación de contraseña:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al procesar la restauración de contraseña" },
      { status: 500 }
    );
  }
}
