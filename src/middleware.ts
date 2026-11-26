import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const NOMBRE_COOKIE_SESION = "pos_session";
const JWT_SECRET_STRING = process.env.JWT_SECRET || "pos_jwt_secret_token_seguro_2026_local_pos_key";
const SECRET_JWT = new TextEncoder().encode(JWT_SECRET_STRING);

// Cabeceras estrictas antifatiga de caché exclusivas para APIs y mutaciones
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Rutas administrativas exclusivas que un CAJERO no puede acceder.
 * El middleware lo redirigirá silenciosamente a /caja/pos sin mostrar /acceso-denegado.
 */
const RUTAS_EXCLUSIVAS_ADMIN = [
  "/admin/configuracion",
  "/admin/usuarios",
  "/admin/dashboard",
  "/admin/inventario",
  "/api/usuarios",
  "/api/backup",
  "/api/admin",
];

function construirUrlPublica(req: NextRequest, destinoPath: string): URL {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.nextUrl.protocol.replace(":", "") || "http";

  if (host && !host.startsWith("0.0.0.0")) {
    return new URL(destinoPath, `${proto}://${host}`);
  }

  const clone = req.nextUrl.clone();
  clone.pathname = destinoPath;
  clone.search = "";
  return clone;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Excluir recursos estáticos, manuales HTML públicos e imágenes directas de inmediato
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/iconos") ||
    pathname.startsWith("/manual") ||
    pathname === "/aurora.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js|html|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Rutas públicas de autenticación y datos básicos de empresa
  const esRutaPublica =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/recuperar") ||
    pathname.startsWith("/api/empresa/publico") ||
    pathname.startsWith("/api/sistema/ventana");

  const token = req.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  let sesionValida: { userId: string; username: string; rol: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_JWT);
      if (payload?.userId && payload?.rol) {
        sesionValida = {
          userId: String(payload.userId),
          username: String(payload.username || ""),
          rol: String(payload.rol),
        };
      }
    } catch {
      sesionValida = null;
    }
  }

  // 3. Manejo de la pantalla /login
  if (pathname === "/login") {
    // Si ya tiene sesión activa y válida, redirigir según su rol
    if (sesionValida) {
      const destino = sesionValida.rol === "ADMIN" ? "/" : "/caja/pos";
      return NextResponse.redirect(construirUrlPublica(req, destino));
    }
    // Si no está autenticado, permitir ver la pantalla de login
    const res = NextResponse.next();
    Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // Si es otra ruta pública, permitir acceso
  if (esRutaPublica) {
    return NextResponse.next();
  }

  // 4. Bloqueo estricto para rutas privadas: Si no hay sesión válida
  if (!sesionValida) {
    const esPeticionApiOJson =
      pathname.startsWith("/api/") ||
      req.headers.get("accept")?.includes("application/json");

    if (esPeticionApiOJson) {
      return NextResponse.json(
        { ok: false, error: "No autenticado. Inicie sesión para continuar." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }
    const loginUrl = construirUrlPublica(req, "/login");
    const redirectRes = NextResponse.redirect(loginUrl);
    Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => redirectRes.headers.set(k, v));
    return redirectRes;
  }

  // 5. Control de Acceso por Roles (RBAC):
  // Si el usuario es CAJERO y pretende ingresar a una ruta exclusiva de ADMIN:
  // REDIRIGIR SILENCIOSAMENTE a /caja/pos sin pantallas de error ni /acceso-denegado
  if (sesionValida.rol === "CAJERO") {
    const esRutaProhibida = RUTAS_EXCLUSIVAS_ADMIN.some(
      (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
    );

    if (esRutaProhibida) {
      const esPeticionApiOJson =
        pathname.startsWith("/api/") ||
        req.headers.get("accept")?.includes("application/json");

      if (esPeticionApiOJson) {
        return NextResponse.json(
          { ok: false, error: "Acceso restringido para perfil cajero." },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }
      // Redirección silenciosa sin fricción
      const posUrl = construirUrlPublica(req, "/caja/pos");
      const redirectPos = NextResponse.redirect(posUrl);
      Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => redirectPos.headers.set(k, v));
      return redirectPos;
    }
  }

  // 6. Permitir paso optimizado: Solo aplicar cabeceras no-cache a llamadas API
  const respuesta = NextResponse.next();
  if (pathname.startsWith("/api/")) {
    Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => respuesta.headers.set(k, v));
  }
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|iconos|manual|aurora.ico|api/auth/login|api/auth/recuperar|api/empresa/publico).*)",
  ],
};
