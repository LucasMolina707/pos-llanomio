import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/impresion/[id]
 * Retorna los datos estructurados en vivo de una factura junto con la última
 * configuración corporativa y logo de LLANOMIO para impresión 1:1 o descarga en PDF.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Obtener la factura por ID o por número correlativo
    const factura = await prisma.factura.findFirst({
      where: {
        OR: [{ id }, { numeroFactura: id }],
      },
      include: {
        cliente: {
          select: {
            id: true,
            documento: true,
            nombre: true,
            telefono: true,
            telefonoSecundario: true,
            email: true,
            direccion: true,
            esResponsableIVA: true,
            tipoIdentificacion: true,
            digitoVerificacion: true,
            razonSocial: true,
            responsabilidadFiscal: true,
            municipio: true,
            codigoDaneMunicipio: true,
          },
        },
        usuarioCajero: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                tipo: true,
                talla: true,
                color: true,
              },
            },
          },
        },
        abonos: {
          include: {
            cajero: {
              select: {
                id: true,
                nombre: true,
                username: true,
              },
            },
          },
          orderBy: { fecha: "asc" },
        },
      },
    });

    if (!factura) {
      return NextResponse.json(
        { success: false, error: "La factura solicitada no existe" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Obtener datos corporativos actualizados de LLANOMIO
    const empresa = await prisma.configuracionEmpresa.findFirst();

    const formatoEfectivo =
      empresa?.formatoPredeterminado || empresa?.formatoImpresionDefault || "MEDIA_CARTA";

    const datosEmpresa = {
      nombreTienda: empresa?.nombreTienda || "LLANOMIO",
      nombreComercial: empresa?.nombreComercial || "LLANOMIO",
      eslogan: empresa?.eslogan || "Trajes Típicos, Disfraces y Sastrería",
      nit: empresa?.nit || "900.123.456-7",
      regimenFiscal: empresa?.regimenFiscal || "No Responsable de IVA",
      direccion: empresa?.direccion || "Calle 15 # 22-30, Barrio Siete de Agosto",
      ciudad: empresa?.ciudad || "Villavicencio, Meta",
      telefono: empresa?.telefono || "310 123 4567",
      email: empresa?.email || "contacto@llanomio.com",
      logoUrl: empresa?.logoUrl || null,
      encabezadoFactura:
        empresa?.encabezadoFactura || "Ropa, Disfraces, Trajes Típicos y Sastrería Profesional",
      mostrarVendedorFactura:
        empresa?.mostrarVendedorFactura !== undefined ? empresa.mostrarVendedorFactura : true,
      politicasFactura:
        empresa?.politicasFactura ||
        "El cliente se compromete a devolver las prendas en la fecha pactada en el mismo estado en que las recibe. Todo retraso generará cobro de recargo de mora. Cuide su comprobante de pago.",
      piePaginaFactura:
        empresa?.piePaginaFactura || "¡Gracias por su preferencia! Sistema POS Local LLANOMIO",
      formatoPredeterminado: formatoEfectivo,
      formatoImpresionDefault: formatoEfectivo,
    };

    return NextResponse.json(
      {
        success: true,
        factura,
        empresa: datosEmpresa,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMensaje =
      error instanceof Error ? error.message : "Error interno al preparar datos de impresión";
    console.error("Error al obtener datos para impresión:", error);
    return NextResponse.json(
      { success: false, error: errorMensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
