import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, password, motivo } = body;

    const credencialIngresada = String(pin || password || "").trim();
    if (!credencialIngresada) {
      return NextResponse.json(
        { ok: false, error: "El PIN de 6 dígitos o la contraseña de supervisor es obligatoria." },
        { status: 400 }
      );
    }

    // Buscar usuarios con rol ADMIN activos
    const supervisores = await prisma.user.findMany({
      where: {
        rol: "ADMIN",
        activo: true,
      },
    });

    if (supervisores.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se encontraron cuentas de supervisor activas en el sistema." },
        { status: 404 }
      );
    }

    let supervisorAutorizado = null;

    for (const sup of supervisores) {
      // 1. Probar PIN de seguridad de 6 dígitos si aplica
      if (sup.pinSeguridadHash && /^\d{6}$/.test(credencialIngresada)) {
        const pinValido = await bcrypt.compare(credencialIngresada, sup.pinSeguridadHash);
        if (pinValido) {
          supervisorAutorizado = sup;
          break;
        }
      }

      // 2. Probar Contraseña de acceso
      if (sup.passwordHash) {
        const passwordValida = await bcrypt.compare(credencialIngresada, sup.passwordHash);
        if (passwordValida) {
          supervisorAutorizado = sup;
          break;
        }
      }
    }

    if (!supervisorAutorizado) {
      return NextResponse.json(
        { ok: false, error: "PIN o contraseña de supervisor incorrecta. Autorización denegada." },
        { status: 401 }
      );
    }

    // Registrar auditoría de la autorización especial
    try {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      const userAgent = req.headers.get("user-agent") || "Terminal POS";
      await prisma.auditoriaSesion.create({
        data: {
          userId: supervisorAutorizado.id,
          accion: "AUTORIZACION_SUPERVISOR",
          detalles: `Autorización de mostrador concedida: ${motivo || "Operación especial autorizada"}`,
          ip,
          userAgent,
        },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      mensaje: "Autorización de supervisor concedida.",
      supervisor: {
        id: supervisorAutorizado.id,
        nombre: supervisorAutorizado.nombre,
        username: supervisorAutorizado.username,
      },
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error interno";
    console.error("[ERROR VERIFICAR SUPERVISOR]", errorMensaje);
    return NextResponse.json(
      { ok: false, error: "Error al validar la autorización del supervisor." },
      { status: 500 }
    );
  }
}

