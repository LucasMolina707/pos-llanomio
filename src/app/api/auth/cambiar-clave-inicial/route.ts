import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sincronizarArchivoCredencialesMaestras } from "@/lib/usuarios-sync";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      nuevaPassword,
      documentoIdentidad,
      pinSeguridad,
      preguntaSeguridad,
      respuestaSeguridad,
    } = body;

    // Obtener usuario por ID o sesión activa
    let targetUserId = userId;
    if (!targetUserId) {
      const sesion = await obtenerSesionDesdeRequest(req);
      if (sesion?.userId) {
        targetUserId = sesion.userId;
      }
    }

    if (!targetUserId) {
      const admin = await prisma.user.findFirst({ where: { username: "admin" } });
      if (admin) targetUserId = admin.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuario no identificado para cambio de credenciales." },
        { status: 400 }
      );
    }

    if (!nuevaPassword || String(nuevaPassword).trim().length < 6) {
      return NextResponse.json(
        { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const docLimpio = String(documentoIdentidad || "").trim();
    if (!docLimpio) {
      return NextResponse.json(
        { ok: false, error: "El documento de identidad es obligatorio." },
        { status: 400 }
      );
    }

    const pinLimpio = String(pinSeguridad || "").trim();
    if (!pinLimpio || pinLimpio.length !== 6 || !/^\d{6}$/.test(pinLimpio)) {
      return NextResponse.json(
        { ok: false, error: "El PIN de seguridad debe contener exactamente 6 dígitos numéricos." },
        { status: 400 }
      );
    }

    const pregLimpia = String(preguntaSeguridad || "").trim();
    const respLimpia = String(respuestaSeguridad || "").trim().toLowerCase();
    if (!pregLimpia || !respLimpia) {
      return NextResponse.json(
        { ok: false, error: "La pregunta y respuesta secreta de seguridad son obligatorias." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(nuevaPassword).trim(), 10);
    const pinSeguridadHash = await bcrypt.hash(pinLimpio, 10);
    const respuestaSeguridadHash = await bcrypt.hash(respLimpia, 10);

    const usuarioActualizado = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        documentoIdentidad: docLimpio,
        pinSeguridadHash,
        preguntaSeguridad: pregLimpia,
        respuestaSeguridadHash,
        requiereCambioClave: false,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimaRestauracion: new Date(),
      },
    });

    try {
      await sincronizarArchivoCredencialesMaestras(prisma);
    } catch {}

    return NextResponse.json({
      ok: true,
      mensaje: "Credenciales de seguridad actualizadas exitosamente.",
      user: {
        id: usuarioActualizado.id,
        username: usuarioActualizado.username,
        nombre: usuarioActualizado.nombre,
        rol: usuarioActualizado.rol,
      },
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error interno";
    console.error("[ERROR CAMBIAR CLAVE INICIAL]", errorMensaje);
    return NextResponse.json(
      { ok: false, error: "Ocurrió un error al actualizar las credenciales iniciales." },
      { status: 500 }
    );
  }
}

