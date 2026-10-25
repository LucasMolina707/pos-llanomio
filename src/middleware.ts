import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const NOMBRE_COOKIE_SESION = "llanomio_session";
const SECRET_JWT = new TextEncoder().encode(
  process.env.JWT_SECRET || "llanomio_jwt_secret_token_seguro_2026_local_pos_key"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo interceptar rutas bajo /admin o /api/admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = req.cookies.get(NOMBRE_COOKIE_SESION)?.value;

    // 1. Si no hay token de sesión
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, error: "No autenticado. Inicie sesión para continuar." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Verificar firma y validez del token JWT
    try {
      const { payload } = await jwtVerify(token, SECRET_JWT);

      if (!payload?.userId || !payload?.rol) {
        throw new Error("Token con formato inválido");
      }

      // 3. Control de Acceso Basado en Roles (RBAC):
      // Si el rol es CAJERO y pretende ingresar a /admin, denegar acceso
      if (payload.rol !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { ok: false, error: "Acceso denegado: Se requieren privilegios de Administrador General." },
            { status: 403 }
          );
        }

        // Redirigir a pantalla amigable de acceso denegado (Error 403)
        const accesoDenegadoUrl = new URL("/acceso-denegado", req.url);
        accesoDenegadoUrl.searchParams.set("origen", pathname);
        return NextResponse.redirect(accesoDenegadoUrl, { status: 307 });
      }

      // 4. Si es ADMIN, permitir el paso
      return NextResponse.next();
    } catch {
      // Token expirado o manipulado
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, error: "Sesión vencida o inválida." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("motivo", "sesion_expirada");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
