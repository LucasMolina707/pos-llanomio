import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const NOMBRE_COOKIE_SESION = "pos_session";
const SECRET_JWT = new TextEncoder().encode(
  process.env.JWT_SECRET || "pos_jwt_secret_token_seguro_2026_local_pos_key"
);

// Cabeceras estrictas antifatiga de caché para evitar retrocesos sin sesión
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Excluir recursos estáticos e imágenes directas
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js)$/)
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
      return NextResponse.redirect(new URL(destino, req.url));
    }
    // Si no está autenticado, permitir ver la pantalla de login
    const res = NextResponse.next();
    Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // Si es otra ruta pública (como /api/auth/login o /api/auth/recuperar), permitir acceso
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
    const loginUrl = new URL("/login", req.url);
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
      const posUrl = new URL("/caja/pos", req.url);
      const redirectPos = NextResponse.redirect(posUrl);
      Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => redirectPos.headers.set(k, v));
      return redirectPos;
    }
  }

  // 6. Permitir paso con cabeceras de seguridad
  const respuesta = NextResponse.next();
  Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => respuesta.headers.set(k, v));
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/recuperar|api/empresa/publico).*)",
  ],
};
