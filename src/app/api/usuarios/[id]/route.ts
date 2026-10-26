import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { RolUsuario } from "@prisma/client";
import {
  parsearPermisos,
  sincronizarArchivoCredencialesMaestras,
  PermisosUsuario,
} from "@/lib/usuarios-sync";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/usuarios/[id]
 * Detalle completo de un usuario
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        activo: true,
        permisos: true,
        ultimaRestauracion: true,
        fechaCreacion: true,
        _count: {
          select: { facturas: true, abonos: true, turnos: true },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ ok: false, success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      usuario: {
        ...usuario,
        permisos: parsearPermisos(usuario.permisos, usuario.rol),
      },
    });
  } catch (error: unknown) {
    console.error("Error al obtener detalle de usuario:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al consultar el usuario" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/usuarios/[id]
 * Edición de datos generales, rol, permisos y estado activo/inactivo.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, username, rol, activo, permisos } = body;

    const usuarioExistente = await prisma.user.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    // Regla de Protección: No desactivar ni degradar al único ADMIN activo
    const seraInactivo = activo !== undefined && Boolean(activo) === false;
    const seraCajero = rol !== undefined && rol === "CAJERO";

    if (usuarioExistente.rol === RolUsuario.ADMIN && (seraInactivo || seraCajero)) {
      const otrosAdminsActivos = await prisma.user.count({
        where: {
          rol: RolUsuario.ADMIN,
          activo: true,
          id: { not: id },
        },
      });

      if (otrosAdminsActivos === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Acción denegada por seguridad: Este es el único Administrador activo del sistema. Debe designar otro Administrador antes de desactivar o degradar esta cuenta.",
          },
          { status: 400 }
        );
      }
    }

    // Validar username si se intenta cambiar
    let usernameFinal = usuarioExistente.username;
    if (username && username.trim() !== usuarioExistente.username) {
      const limpio = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
      if (limpio.length < 3) {
        return NextResponse.json(
          { success: false, error: "El nombre de usuario debe tener al menos 3 caracteres válidos" },
          { status: 400 }
        );
      }

      const dup = await prisma.user.findFirst({
        where: { username: limpio, id: { not: id } },
      });
      if (dup) {
        return NextResponse.json(
          { success: false, error: `El usuario '@${limpio}' ya está en uso por otra cuenta.` },
          { status: 409 }
        );
      }
      usernameFinal = limpio;
    }

    const rolFinal: RolUsuario =
      rol !== undefined
        ? rol === "ADMIN"
          ? RolUsuario.ADMIN
          : RolUsuario.CAJERO
        : usuarioExistente.rol;

    const permisosActuales = parsearPermisos(usuarioExistente.permisos, rolFinal);
    const permisosNuevos: PermisosUsuario = permisos
      ? { ...permisosActuales, ...permisos }
      : permisosActuales;

    const usuarioActualizado = await prisma.user.update({
      where: { id },
      data: {
        nombre: nombre?.trim() || usuarioExistente.nombre,
        username: usernameFinal,
        rol: rolFinal,
        activo: activo !== undefined ? Boolean(activo) : usuarioExistente.activo,
        permisos: JSON.stringify(permisosNuevos),
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

    await sincronizarArchivoCredencialesMaestras(prisma);

    return NextResponse.json({
      ok: true,
      success: true,
      mensaje: `Usuario @${usuarioActualizado.username} actualizado exitosamente`,
      usuario: {
        ...usuarioActualizado,
        permisos: parsearPermisos(usuarioActualizado.permisos, usuarioActualizado.rol),
      },
    });
  } catch (error: unknown) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al actualizar el usuario" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/usuarios/[id]
 * Restauración o cambio directo de contraseña por parte del Administrador (sin requerir clave previa).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nuevaPassword } = body;

    if (!nuevaPassword || nuevaPassword.trim().length < 4) {
      return NextResponse.json(
        { ok: false, success: false, error: "La nueva contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    const usuario = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, nombre: true },
    });

    if (!usuario) {
      return NextResponse.json({ ok: false, success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword.trim(), 10);
    const ahora = new Date();

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        ultimaRestauracion: ahora,
      },
    });

    await sincronizarArchivoCredencialesMaestras(prisma);

    return NextResponse.json({
      ok: true,
      success: true,
      mensaje: `Contraseña restablecida exitosamente para @${usuario.username} (${usuario.nombre}).`,
      username: usuario.username,
      nombre: usuario.nombre,
      ultimaRestauracion: ahora.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error al restaurar contraseña de usuario:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al restaurar la contraseña" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/[id]
 * Desactivación segura o eliminación si no tiene registros históricos enlazados.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const usuario = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { facturas: true, abonos: true, turnos: true },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ ok: false, success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    // Protección para el único admin
    if (usuario.rol === RolUsuario.ADMIN) {
      const otrosAdmins = await prisma.user.count({
        where: { rol: RolUsuario.ADMIN, activo: true, id: { not: id } },
      });
      if (otrosAdmins === 0) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: "No se puede eliminar ni desactivar al único Administrador activo del sistema.",
          },
          { status: 400 }
        );
      }
    }

    const tieneTransacciones =
      usuario._count.facturas > 0 || usuario._count.abonos > 0 || usuario._count.turnos > 0;

    if (tieneTransacciones) {
      // Soft-delete defensivo para preservar integridad referencial de SQLite
      await prisma.user.update({
        where: { id },
        data: { activo: false },
      });
      await sincronizarArchivoCredencialesMaestras(prisma);

      return NextResponse.json({
        ok: true,
        success: true,
        desactivado: true,
        mensaje: `El usuario @${usuario.username} tiene registros contables asociados (${usuario._count.facturas} facturas, ${usuario._count.abonos} abonos). Ha sido desactivado para preservar la integridad del historial.`,
      });
    }

    // Eliminación física si es un usuario sin historial
    await prisma.user.delete({ where: { id } });
    await sincronizarArchivoCredencialesMaestras(prisma);

    return NextResponse.json({
      ok: true,
      success: true,
      eliminado: true,
      mensaje: `Usuario @${usuario.username} eliminado definitivamente del sistema.`,
    });
  } catch (error: unknown) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { ok: false, success: false, error: "Error interno al eliminar el usuario" },
      { status: 500 }
    );
  }
}
