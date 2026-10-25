import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/empresa
 * Obtiene la configuración global de la empresa para impresión y visualización
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
    const errorMensaje =
      error instanceof Error ? error.message : "Error al obtener configuración de empresa";
    return NextResponse.json(
      { ok: false, error: errorMensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT & POST /api/empresa
 * Actualiza la información fiscal, logo en Base64, políticas y formatos documentales
 */
export async function PUT(req: NextRequest) {
  return guardarConfiguracion(req);
}

export async function POST(req: NextRequest) {
  return guardarConfiguracion(req);
}

async function guardarConfiguracion(req: NextRequest) {
  try {
    // 1. Proteger con RBAC cuando exista sesión activa
    const sesion = await obtenerSesionDesdeRequest(req);
    if (sesion && sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      nombreTienda,
      nombreComercial,
      eslogan,
      nit,
      regimenFiscal,
      direccion,
      ciudad,
      telefono,
      email,
      logoUrl,
      encabezadoFactura,
      mostrarVendedorFactura,
      politicasFactura,
      piePaginaFactura,
      formatoPredeterminado,
      formatoImpresionDefault,
      rutaCarpetaRespaldo,
    } = body;

    // Normalizar formato
    const formatoNormalizado =
      formatoPredeterminado || formatoImpresionDefault || "MEDIA_CARTA";

    let config = await prisma.configuracionEmpresa.findFirst();

    if (config) {
      config = await prisma.configuracionEmpresa.update({
        where: { id: config.id },
        data: {
          nombreTienda: nombreTienda !== undefined ? String(nombreTienda).trim() : config.nombreTienda,
          nombreComercial:
            nombreComercial !== undefined
              ? String(nombreComercial).trim()
              : (nombreTienda !== undefined ? String(nombreTienda).trim() : config.nombreComercial),
          eslogan: eslogan !== undefined ? (eslogan ? String(eslogan).trim() : null) : config.eslogan,
          nit: nit !== undefined ? String(nit).trim() : config.nit,
          regimenFiscal:
            regimenFiscal !== undefined ? (regimenFiscal ? String(regimenFiscal).trim() : null) : config.regimenFiscal,
          direccion: direccion !== undefined ? String(direccion).trim() : config.direccion,
          ciudad: ciudad !== undefined ? (ciudad ? String(ciudad).trim() : null) : config.ciudad,
          telefono: telefono !== undefined ? String(telefono).trim() : config.telefono,
          email: email !== undefined ? (email ? String(email).trim() : null) : config.email,
          logoUrl: logoUrl !== undefined ? (logoUrl ? String(logoUrl) : null) : config.logoUrl,
          encabezadoFactura:
            encabezadoFactura !== undefined ? (encabezadoFactura ? String(encabezadoFactura).trim() : null) : config.encabezadoFactura,
          mostrarVendedorFactura:
            mostrarVendedorFactura !== undefined ? Boolean(mostrarVendedorFactura) : config.mostrarVendedorFactura,
          politicasFactura:
            politicasFactura !== undefined ? (politicasFactura ? String(politicasFactura).trim() : null) : config.politicasFactura,
          piePaginaFactura:
            piePaginaFactura !== undefined ? (piePaginaFactura ? String(piePaginaFactura).trim() : null) : config.piePaginaFactura,
          formatoPredeterminado: formatoNormalizado,
          formatoImpresionDefault: formatoNormalizado as "TIRILLA" | "MEDIA_CARTA" | "CARTA",
          rutaCarpetaRespaldo:
            rutaCarpetaRespaldo !== undefined
              ? String(rutaCarpetaRespaldo).trim()
              : config.rutaCarpetaRespaldo,
        },
      });
    } else {
      config = await prisma.configuracionEmpresa.create({
        data: {
          nombreTienda: String(nombreTienda || "LLANOMIO").trim(),
          nombreComercial: String(nombreComercial || nombreTienda || "LLANOMIO").trim(),
          eslogan: eslogan ? String(eslogan).trim() : "Trajes Típicos, Disfraces y Sastrería",
          nit: String(nit || "900.123.456-7").trim(),
          regimenFiscal: regimenFiscal ? String(regimenFiscal).trim() : "No Responsable de IVA",
          direccion: String(direccion || "Calle 15 # 22-30, Barrio Siete de Agosto").trim(),
          ciudad: ciudad ? String(ciudad).trim() : "Villavicencio, Meta",
          telefono: String(telefono || "310 123 4567").trim(),
          email: email ? String(email).trim() : "contacto@llanomio.com",
          logoUrl: logoUrl ? String(logoUrl) : null,
          encabezadoFactura: encabezadoFactura ? String(encabezadoFactura).trim() : null,
          mostrarVendedorFactura: mostrarVendedorFactura !== undefined ? Boolean(mostrarVendedorFactura) : true,
          politicasFactura: politicasFactura ? String(politicasFactura).trim() : null,
          piePaginaFactura: piePaginaFactura ? String(piePaginaFactura).trim() : null,
          formatoPredeterminado: formatoNormalizado,
          formatoImpresionDefault: formatoNormalizado as "TIRILLA" | "MEDIA_CARTA" | "CARTA",
          rutaCarpetaRespaldo: rutaCarpetaRespaldo || "C:\\POS_LLANOMIO_BACKUPS",
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje: "Configuración y plantilla de facturación actualizadas correctamente.",
        configuracion: config,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMensaje =
      error instanceof Error ? error.message : "Error al actualizar la configuración";
    return NextResponse.json(
      { ok: false, error: errorMensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
