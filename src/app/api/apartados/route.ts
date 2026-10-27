import { NextRequest, NextResponse } from "next/server";
import { GET as getFacturas, POST as postFacturas } from "@/app/api/facturas/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/apartados
 * Retorna las facturas de tipo apartado/separe delegando a /api/facturas
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    url.searchParams.set("modulo", "APARTADOS");
    url.searchParams.set("tipoOperacion", "SEPARE");

    const delegatedReq = new NextRequest(url.toString(), {
      headers: req.headers,
      method: "GET",
    });

    return await getFacturas(delegatedReq);
  } catch (error: unknown) {
    console.error("Error en GET /api/apartados:", error);
    return NextResponse.json(
      { ok: false, error: "Error al consultar apartados." },
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
