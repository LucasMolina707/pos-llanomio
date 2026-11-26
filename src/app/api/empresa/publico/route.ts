import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/empresa/publico
 * Endpoint público y sin restricciones de rol para exponer la identidad visual
 * (logoUrl, nombre comercial, contacto) hacia el Login, Terminal de Cajero y Shell.
 */
export async function GET() {
  try {
    const config = await prisma.configuracionEmpresa.findFirst({
      select: {
        nombreTienda: true,
        nombreComercial: true,
        eslogan: true,
        logoUrl: true,
        nit: true,
        telefono: true,
        direccion: true,
        ciudad: true,
        email: true,
      },
    });

    const empresaData = config || {
      nombreTienda: "Aurora POS",
      nombreComercial: "Aurora POS",
      eslogan: "Sistema Inteligente de Ventas, Alquileres y Control de Caja",
      logoUrl: "/iconos/aurora.png",
      nit: "901.450.890-1",
      telefono: "300 123 4567",
      direccion: "Centro Empresarial Aurora - Local 101",
      ciudad: "Bogotá D.C. - Colombia",
      email: "contacto@aurorapos.com",
    };

    return NextResponse.json(
      {
        ok: true,
        empresa: empresaData,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMensaje =
      error instanceof Error ? error.message : "Error al obtener identidad pública de la empresa";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
        empresa: {
          nombreTienda: "Aurora POS",
          nombreComercial: "Aurora POS",
          eslogan: "Sistema Inteligente de Ventas, Alquileres y Control de Caja",
          logoUrl: "/iconos/aurora.png",
          nit: "901.450.890-1",
          telefono: "300 123 4567",
          direccion: "Centro Empresarial Aurora - Local 101",
          ciudad: "Bogotá D.C. - Colombia",
          email: "contacto@aurorapos.com",
        },
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
