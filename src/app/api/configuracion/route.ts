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
          nombreTienda: "Mi Empresa",
          nombreComercial: "Mi Empresa",
          eslogan: "Punto de Venta y Servicios",
          nit: "000.000.000-0",
          regimenFiscal: "No Responsable de IVA",
          direccion: "Dirección de la empresa",
          ciudad: "Ciudad, Departamento",
          telefono: "000 000 0000",
          email: "contacto@miempresa.com",
          logoUrl: null,
          encabezadoFactura: "Comprobante de Venta y Servicios",
          mostrarVendedorFactura: true,
          politicasFactura:
            "Términos y Condiciones de Alquiler: Las prendas deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de recargo por mora. Cuide su comprobante de pago.",
          piePaginaFactura: "¡Gracias por su preferencia! Lo atendemos con gusto.",
          formatoPredeterminado: "MEDIA_CARTA",
          formatoImpresionDefault: "MEDIA_CARTA",
          rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
          nombreImpresoraPos: "",
          abrirCajonAutoEfectivo: true,
          pinCajon: 0,
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
