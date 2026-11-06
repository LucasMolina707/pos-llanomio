import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import {
  crearTokenSesion,
  NOMBRE_COOKIE_SESION,
  OPCIONES_COOKIE_SESION,
  TIEMPO_EXPIRACION_INACTIVIDAD_MS,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, deviceId } = body;

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "El usuario y la contraseña son obligatorios." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Desconocido";

    // 1. Buscar usuario en la base de datos local (tolerante a mayúsculas/minúsculas)
    const usernameBuscado = String(username || "").trim();
    let user = await prisma.user.findUnique({
      where: { username: usernameBuscado },
    });

    if (!user) {
      const todos = await prisma.user.findMany();
      user = todos.find((u) => u.username.toLowerCase() === usernameBuscado.toLowerCase()) || null;
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Credenciales de acceso incorrectas." },
        { status: 401 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { ok: false, error: "El usuario se encuentra inactivo en el sistema. Contacte al administrador." },
        { status: 403 }
      );
    }

    // Verificar si la cuenta está bloqueada temporalmente por intentos fallidos de recuperación
    if (user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date()) {
      const msRestantes = new Date(user.bloqueadoHasta).getTime() - Date.now();
      const minutosRestantes = Math.ceil(msRestantes / (60 * 1000));
      return NextResponse.json(
        {
          ok: false,
          error: `Esta cuenta se encuentra bloqueada por seguridad. Intente nuevamente en ${minutosRestantes} minuto(s).`,
        },
        { status: 423 }
      );
    }

    // 2. Comparar contraseña con el hash bcrypt
    const passwordValida = await bcrypt.compare(String(password), user.passwordHash);

    if (!passwordValida) {
      await prisma.auditoriaSesion.create({
        data: {
          userId: user.id,
          accion: "INTENTO_FALLIDO",
          detalles: "Contraseña incorrecta suministrada",
          ip,
          userAgent,
        },
      });

      return NextResponse.json(
        { ok: false, error: "Credenciales de acceso incorrectas." },
        { status: 401 }
      );
    }

    // 3. Regla de Sesión Única Activa por Usuario en Red Local (1 Cuenta = 1 Dispositivo a la vez)
    const AHORA = Date.now();
    const ultimaActividadMs = user.sesionUltimaActividad
      ? new Date(user.sesionUltimaActividad).getTime()
      : 0;

    const sesionSigueActiva = Boolean(
      user.sesionActivaToken &&
      ultimaActividadMs > 0 &&
      AHORA - ultimaActividadMs < TIEMPO_EXPIRACION_INACTIVIDAD_MS
    );

    const esMismoDispositivo = Boolean(
      deviceId && user.sesionDispositivoId && user.sesionDispositivoId === deviceId
    );

    // Si la sesión sigue activa en OTRO equipo diferente, rechazar con HTTP 409
    if (sesionSigueActiva && !esMismoDispositivo) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se puede iniciar sesión porque esta cuenta (@${user.username}) ya está abierta y activa en otro equipo o dispositivo. Cierre la sesión en el otro equipo primero o espere a que quede inactiva.`,
          sesionBloqueada: true,
        },
        { status: 409 }
      );
    }

    // 4. Generar nuevo identificador único de sesión y actualizar estado en SQLite
    const sessionToken = crypto.randomUUID();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        sesionActivaToken: sessionToken,
        sesionDispositivoId: deviceId || "dispositivo-web",
        sesionIp: ip,
        sesionUltimaActividad: new Date(),
        intentosFallidos: 0,
        bloqueadoHasta: null,
        requiereCambioClave: false,
      },
    });

    // 5. Registrar auditoría de inicio de sesión exitoso
    await prisma.auditoriaSesion.create({
      data: {
        userId: user.id,
        accion: "LOGIN",
        detalles: `Inicio de sesión exitoso como ${user.rol} (Dispositivo: ${deviceId || "web"})`,
        ip,
        userAgent,
      },
    });

    // 6. Generar token de sesión firmado incluyendo sessionToken
    const token = await crearTokenSesion({
      userId: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
      permisos: user.permisos,
      sessionToken,
    });

    // 7. Preparar respuesta con cookie HttpOnly segura (NUNCA pedir datos privados en login)
    const destinoRedireccion = user.rol === "ADMIN" ? "/" : "/caja/pos";
    const respuesta = NextResponse.json({
      ok: true,
      mensaje: "Inicio de sesión exitoso",
      requiereCambioClave: false,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
      },
      redirectTo: destinoRedireccion,
    });

    respuesta.cookies.set({
      name: NOMBRE_COOKIE_SESION,
      value: token,
      ...OPCIONES_COOKIE_SESION,
    });

    return respuesta;
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ERROR LOGIN]", errorMensaje);
    return NextResponse.json(
      { ok: false, error: "Ocurrió un error al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}
