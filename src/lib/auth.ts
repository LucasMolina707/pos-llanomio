import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface TokenPayload {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
  permisos?: string | null;
}

export const NOMBRE_COOKIE_SESION = "pos_session";

/**
 * Opciones para la cookie HttpOnly de sesión del POS local.
 * NOTA CRÍTICA LAN: 'secure' se mantiene en false para permitir conexiones HTTP
 * desde celulares, tablets y computadores conectados a la red Wi-Fi local sin HTTPS.
 */
export const OPCIONES_COOKIE_SESION = {
  httpOnly: true,
  secure: false, // Soporte estricto para HTTP en LAN (Android / iOS / PC)
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12, // 12 horas de duración
};

const SECRET_JWT = new TextEncoder().encode(
  process.env.JWT_SECRET || "pos_jwt_secret_token_seguro_2026_local_pos_key"
);

/**
 * Genera un token JWT firmado para la sesión activa del usuario
 */
export async function crearTokenSesion(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET_JWT);
}

/**
 * Verifica la validez y firma de un token JWT
 */
export async function verificarTokenSesion(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_JWT);
    if (!payload.userId || !payload.rol) {
      return null;
    }
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      nombre: payload.nombre as string,
      rol: payload.rol as "ADMIN" | "CAJERO",
      permisos: (payload.permisos as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las cookies del contexto del servidor
 */
export async function obtenerSesionActual(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(NOMBRE_COOKIE_SESION)?.value;
    if (!token) return null;
    return await verificarTokenSesion(token);
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión desde una solicitud HTTP entrante (útil para route handlers y middleware)
 */
export async function obtenerSesionDesdeRequest(req: NextRequest | Request): Promise<TokenPayload | null> {
  try {
    let token: string | undefined;
    if ("cookies" in req && typeof (req as { cookies?: { get?: (name: string) => { value?: string } } }).cookies?.get === "function") {
      token = (req as { cookies: { get: (name: string) => { value?: string } } }).cookies.get(NOMBRE_COOKIE_SESION)?.value;
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${NOMBRE_COOKIE_SESION}=([^;]*)`));
      token = match ? decodeURIComponent(match[1]) : undefined;
    }
    if (!token) return null;
    return await verificarTokenSesion(token);
  } catch {
    return null;
  }
}
