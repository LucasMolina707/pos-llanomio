import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionDesdeRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { obtenerImpresorasWindows, dispararAperturaCajon } from "@/lib/cajon-impresora";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/caja/abrir-cajon
 * Devuelve la lista de impresoras instaladas en Windows y la configuración actual del cajón
 */
export async function GET() {
  try {
    const impresoras = await obtenerImpresorasWindows();
    const config = await prisma.configuracionEmpresa.findFirst({
      select: {
        nombreImpresoraPos: true,
        abrirCajonAutoEfectivo: true,
        pinCajon: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        impresoras,
        configuracion: {
          nombreImpresoraPos: config?.nombreImpresoraPos || "",
          abrirCajonAutoEfectivo: config?.abrirCajonAutoEfectivo ?? true,
          pinCajon: config?.pinCajon ?? 0,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener impresoras para cajón monedero:", error);
    return NextResponse.json(
      { ok: false, error: "Error al listar las impresoras del sistema.", impresoras: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/caja/abrir-cajon
 * Dispara el pulso de apertura manual o automático al cajón monedero mediante la impresora térmica
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    let body: { motivo?: string; nombreImpresora?: string; pin?: number } = {};

    try {
      body = await req.json();
    } catch {
      // Body opcional vacío
    }

    const { motivo = "APERTURA_MANUAL_MOSTRADOR", nombreImpresora, pin } = body;

    // Ejecutar el disparo local ESC/POS
    const resultado = await dispararAperturaCajon(nombreImpresora, pin);

    // Registro defensivo en consola/servidor para trazabilidad
    console.info(
      `[CAJON POS] Disparo ejecutado | Motivo: ${motivo} | Impresora: ${resultado.impresoraUsada} | Usuario: ${sesion?.username || "Sesión Terminal"}`
    );

    return NextResponse.json(
      {
        ok: true,
        mensaje: "Pulso de apertura enviado al cajón monedero exitosamente.",
        resultado,
        motivo,
        usuario: sesion?.nombre || sesion?.username || "Operador de Mostrador",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al procesar apertura de cajón";
    console.error("Error en POST /api/caja/abrir-cajon:", error);

    // Responder siempre de forma defensiva para no bloquear la operación de caja
    return NextResponse.json(
      {
        ok: true,
        mensaje: "Apertura tramitada en modo seguro.",
        error: errorMsg,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
