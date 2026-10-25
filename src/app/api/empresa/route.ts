import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export async function GET() {
  try {
    let config = await prisma.configuracionEmpresa.findFirst();

    if (!config) {
      config = await prisma.configuracionEmpresa.create({
        data: {
          nombreTienda: "LLANOMIO",
          nombreComercial: "LLANOMIO",
          nit: "900.123.456-7",
          direccion: "Calle Principal #10-20, Villavicencio, Meta",
          telefono: "3101234567",
          logoUrl: null,
          politicasFactura:
            "Términos y Condiciones: Las prendas en alquiler deben devolverse en las mismas condiciones recibidas. El retraso en la entrega genera recargo por mora según la tarifa establecida. Cuide su comprobante de pago.",
          rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
        },
      });
    }

    return NextResponse.json({ ok: true, configuracion: config });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al obtener configuración";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 1. Proteger con RBAC: solo administradores pueden modificar los datos de empresa
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    if (sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Acceso denegado: Se requieren permisos de Administrador General." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      nit,
      nombreTienda,
      direccion,
      telefono,
      logoUrl,
      politicasFactura,
      formatoImpresionDefault,
      rutaCarpetaRespaldo,
    } = body;

    let config = await prisma.configuracionEmpresa.findFirst();

    if (config) {
      config = await prisma.configuracionEmpresa.update({
        where: { id: config.id },
        data: {
          nit: nit ? String(nit).trim() : config.nit,
          nombreTienda: nombreTienda ? String(nombreTienda).trim() : config.nombreTienda,
          nombreComercial: nombreTienda ? String(nombreTienda).trim() : config.nombreComercial,
          direccion: direccion !== undefined ? String(direccion).trim() : config.direccion,
          telefono: telefono !== undefined ? String(telefono).trim() : config.telefono,
          logoUrl: logoUrl !== undefined ? logoUrl : config.logoUrl,
          politicasFactura: politicasFactura !== undefined ? String(politicasFactura).trim() : config.politicasFactura,
          formatoImpresionDefault: formatoImpresionDefault || config.formatoImpresionDefault,
          rutaCarpetaRespaldo: rutaCarpetaRespaldo ? String(rutaCarpetaRespaldo).trim() : config.rutaCarpetaRespaldo,
        },
      });
    } else {
      config = await prisma.configuracionEmpresa.create({
        data: {
          nit: String(nit || "900.123.456-7").trim(),
          nombreTienda: String(nombreTienda || "LLANOMIO").trim(),
          nombreComercial: String(nombreTienda || "LLANOMIO").trim(),
          direccion: String(direccion || "").trim(),
          telefono: String(telefono || "").trim(),
          logoUrl: logoUrl || null,
          politicasFactura: String(politicasFactura || "").trim(),
          formatoImpresionDefault: formatoImpresionDefault || "TIRILLA",
          rutaCarpetaRespaldo: rutaCarpetaRespaldo || "C:\\POS_LLANOMIO_BACKUPS",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Configuración actualizada correctamente.",
      configuracion: config,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al actualizar configuración";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}
