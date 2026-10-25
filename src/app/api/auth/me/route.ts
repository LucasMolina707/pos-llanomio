import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sesion = await obtenerSesionDesdeRequest(req);
  if (!sesion) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: sesion,
  });
}
