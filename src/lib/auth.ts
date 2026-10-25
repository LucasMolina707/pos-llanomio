import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface TokenPayload {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
}

export const NOMBRE_COOKIE_SESION = "llanomio_session";
const SECRET_JWT = new TextEncoder().encode(
  process.env.JWT_SECRET || "llanomio_jwt_secret_token_seguro_2026_local_pos_key"
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
export async function obtenerSesionDesdeRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  if (!token) return null;
  return await verificarTokenSesion(token);
}
