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
 * GET /api/configuracion
 * Alias directo de configuración de empresa para compatibilidad
 */
export async function GET() {
  try {
    let config = await prisma.configuracionEmpresa.findFirst();

    if (!config) {
      config = await prisma.configuracionEmpresa.create({
        data: {
          nombreTienda: "LLANOMIO",
          nombreComercial: "LLANOMIO",
          eslogan: "Trajes Típicos, Disfraces y Sastrería",
          nit: "900.123.456-7",
          regimenFiscal: "No Responsable de IVA",
          direccion: "Calle 15 # 22-30, Barrio Siete de Agosto",
          ciudad: "Villavicencio, Meta",
          telefono: "310 123 4567",
          email: "contacto@llanomio.com",
          logoUrl: null,
          encabezadoFactura: "Ropa, Disfraces, Trajes Típicos y Sastrería Profesional",
          mostrarVendedorFactura: true,
          politicasFactura:
            "Términos y Condiciones de Alquiler: Las prendas deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de recargo por mora. Cuide su comprobante de pago.",
          piePaginaFactura: "¡Gracias por preferir a LLANOMIO! Tradición, elegancia y distinción en cada ocasión.",
          formatoPredeterminado: "MEDIA_CARTA",
          formatoImpresionDefault: "MEDIA_CARTA",
          rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
        },
      });
    }

    return NextResponse.json(
      { ok: true, configuracion: config },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener configuracion:", error);
    return NextResponse.json(
      { ok: false, error: "Error al consultar la configuración de empresa." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
