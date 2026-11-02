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
      nombreTienda: "Mi Empresa",
      nombreComercial: "Mi Empresa",
      eslogan: "Punto de Venta y Servicios",
      logoUrl: null,
      nit: "000.000.000-0",
      telefono: "000 000 0000",
      direccion: "Dirección de la empresa",
      ciudad: "Ciudad, Departamento",
      email: "contacto@miempresa.com",
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
          nombreTienda: "Mi Empresa",
          nombreComercial: "Mi Empresa",
          eslogan: "Punto de Venta y Servicios",
          logoUrl: null,
          nit: "000.000.000-0",
          telefono: "000 000 0000",
          direccion: "Dirección de la empresa",
          ciudad: "Ciudad, Departamento",
          email: "contacto@miempresa.com",
        },
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
