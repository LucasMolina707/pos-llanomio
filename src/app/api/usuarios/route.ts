import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { RolUsuario } from "@prisma/client";
import {
  parsearPermisos,
  sincronizarArchivoCredencialesMaestras,
  PermisosUsuario,
  PERMISOS_DEFAULT_CAJERO,
  PERMISOS_DEFAULT_ADMIN,
} from "@/lib/usuarios-sync";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/usuarios
 * Retorna todos los usuarios registrados con sus roles, estado, permisos y conteos de actividad.
 */
export async function GET() {
  try {
    const usuarios = await prisma.user.findMany({
      where: {
        NOT: {
          username: {
            startsWith: "eliminado_",
          },
        },
      },
      orderBy: [{ rol: "asc" }, { fechaCreacion: "asc" }],
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        activo: true,
        permisos: true,
        documentoIdentidad: true,
        preguntaSeguridad: true,
        pinSeguridadHash: true,
        intentosFallidos: true,
        bloqueadoHasta: true,
        ultimaRestauracion: true,
        fechaCreacion: true,
        _count: {
          select: {
            facturas: true,
            abonos: true,
            turnos: true,
          },
        },
      },
    });

    const usuariosFormateados = usuarios.map((u) => ({
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      documentoIdentidad: u.documentoIdentidad,
      preguntaSeguridad: u.preguntaSeguridad,
      tienePin: Boolean(u.pinSeguridadHash),
      intentosFallidos: u.intentosFallidos,
      bloqueadoHasta: u.bloqueadoHasta,
      permisos: parsearPermisos(u.permisos, u.rol),
      ultimaRestauracion: u.ultimaRestauracion,
      fechaCreacion: u.fechaCreacion,
      conteoFacturas: u._count.facturas,
      conteoAbonos: u._count.abonos,
      conteoTurnos: u._count.turnos,
    }));

    return NextResponse.json(
      {
        ok: true,
        success: true,
        total: usuarios.length,
        usuarios: usuariosFormateados,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener listado de usuarios:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al consultar los usuarios" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/usuarios
 * Registra un nuevo cajero o administrador en el sistema.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nombre,
      username,
      password,
      rol = "CAJERO",
      activo = true,
      permisos,
      documentoIdentidad,
    } = body;

    // 1. Validaciones de campos obligatorios
    if (!nombre?.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre completo del usuario es obligatorio" },
        { status: 400 }
      );
    }

    if (!username?.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre de usuario (username) es obligatorio" },
        { status: 400 }
      );
    }

    const usernameLimpio = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (usernameLimpio.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre de usuario debe tener al menos 3 caracteres alfanuméricos válidos",
        },
        { status: 400 }
      );
    }

    if (!password || password.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "La contraseña inicial debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    // 2. Verificar duplicidad de username
    const usuarioExistente = await prisma.user.findUnique({
      where: { username: usernameLimpio },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { success: false, error: `El nombre de usuario '@${usernameLimpio}' ya se encuentra registrado.` },
        { status: 409 }
      );
    }

    // 3. Determinar rol y permisos
    const rolFinal: RolUsuario = rol === "ADMIN" ? RolUsuario.ADMIN : RolUsuario.CAJERO;
    const basePermisos: PermisosUsuario =
      rolFinal === RolUsuario.ADMIN ? PERMISOS_DEFAULT_ADMIN : PERMISOS_DEFAULT_CAJERO;

    const permisosFinales: PermisosUsuario = permisos
      ? { ...basePermisos, ...permisos }
      : { ...basePermisos };

    // 4. Hashear contraseña con bcryptjs
    const passwordHash = await bcrypt.hash(password.trim(), 10);

    const nuevoUsuario = await prisma.user.create({
      data: {
        nombre: nombre.trim(),
        username: usernameLimpio,
        passwordHash,
        rol: rolFinal,
        activo: Boolean(activo),
        permisos: JSON.stringify(permisosFinales),
        documentoIdentidad: documentoIdentidad ? String(documentoIdentidad).trim() : null,
        ultimaRestauracion: new Date(),
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        activo: true,
        permisos: true,
        fechaCreacion: true,
      },
    });

    // Auto-sincronizar el archivo maestro en la raíz
    await sincronizarArchivoCredencialesMaestras(prisma);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        mensaje: `Usuario @${nuevoUsuario.username} creado exitosamente con rol ${nuevoUsuario.rol}`,
        usuario: {
          ...nuevoUsuario,
          permisos: parsearPermisos(nuevoUsuario.permisos, nuevoUsuario.rol),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al crear el usuario en el servidor" },
      { status: 500 }
    );
  }
}
