import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/impresion/[id]
 * Retorna los datos estructurados de una factura junto con la configuración
 * corporativa de LLANOMIO para impresión en Tirilla, Media Carta o Carta.
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
            direccion: true,
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
        { status: 404 }
      );
    }

    // 2. Obtener datos corporativos de LLANOMIO
    const empresa = await prisma.configuracionEmpresa.findFirst();

    const datosEmpresa = {
      nombreComercial: empresa?.nombreComercial || "LLANOMIO",
      nit: empresa?.nit || "900.123.456-7",
      direccion: empresa?.direccion || "Calle Principal #10-20, Villavicencio, Meta",
      telefono: empresa?.telefono || "3101234567",
      logoUrl: empresa?.logoUrl || null,
      politicasFactura:
        empresa?.politicasFactura ||
        "El cliente se compromete a devolver las prendas en la fecha pactada en el mismo estado en que las recibe. Todo retraso generara cobro de tarifa de mora por dia o por fraccion de hora segun corresponda.",
      formatoImpresionDefault: empresa?.formatoImpresionDefault || "TIRILLA",
    };

    return NextResponse.json({
      success: true,
      factura,
      empresa: datosEmpresa,
    });
  } catch (error: unknown) {
    console.error("Error al obtener datos para impresión:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al preparar los datos de impresión" },
      { status: 500 }
    );
  }
}
