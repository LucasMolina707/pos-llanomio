import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as postFacturas } from "@/app/api/facturas/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/apartados
 * Retorna todos los apartados (SEPARE) existentes en la base de datos sin filtros restrictivos
 * de fecha ni estado (excepto ANULADA), para consulta directa y selector de alquileres.
 */
export async function GET(req: NextRequest) {
  try {
    const apartados = await prisma.factura.findMany({
      where: {
        tipoOperacion: "SEPARE",
      },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: true,
          },
        },
        abonos: {
          include: {
            cajero: {
              select: { id: true, nombre: true, username: true },
            },
          },
          orderBy: { fecha: "desc" },
        },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    const configEmpresa = await prisma.configuracionEmpresa.findFirst({
      select: {
        ultimoAbonoApartado: true,
        ultimoAbonoAlquiler: true,
      },
    });

    return NextResponse.json({
      success: true,
      ok: true,
      facturas: apartados,
      apartados,
      total: apartados.length,
      ultimoAbonoApartado: configEmpresa?.ultimoAbonoApartado ?? 20000,
      ultimoAbonoAlquiler: configEmpresa?.ultimoAbonoAlquiler ?? 20000,
      configuracion: configEmpresa,
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/apartados:", error);
    return NextResponse.json(
      { success: false, ok: false, error: "Error al consultar apartados." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/apartados
 * Crea una factura de tipo SEPARE / Apartado delegando a /api/facturas
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    body.tipoOperacion = "SEPARE";

    const url = new URL(req.url);
    const delegatedReq = new NextRequest(url.toString(), {
      headers: req.headers,
      method: "POST",
      body: JSON.stringify(body),
    });

    return await postFacturas(delegatedReq);
  } catch (error: unknown) {
    console.error("Error en POST /api/apartados:", error);
    return NextResponse.json(
      { ok: false, error: "Error al registrar apartado." },
      { status: 500 }
    );
  }
}
