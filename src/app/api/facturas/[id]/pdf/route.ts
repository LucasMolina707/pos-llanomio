import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  crearDocumentoPdfMediaCarta,
  crearDocumentoPdfMediaCartaDoble,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
} from "@/lib/pdf-media-carta";
import { DatosImpresionFactura, FormatoImpresionTipo } from "@/components/impresion/PlantillaImpresion";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/facturas/[id]/pdf
 * Exporta y entrega la factura en formato binario PDF (TIRILLA 80mm, MEDIA_CARTA o CARTA)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Buscar factura por ID o número consecutivo
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

    // 2. Obtener datos corporativos de la empresa
    const empresaConfig = await prisma.configuracionEmpresa.findFirst();

    const { searchParams } = new URL(req.url);
    const formatoParam = searchParams.get("formato") as FormatoImpresionTipo | null;
    const formatoSeleccionado: FormatoImpresionTipo =
      formatoParam === "TIRILLA" ||
      formatoParam === "TIRILLA_58" ||
      formatoParam === "CARTA" ||
      formatoParam === "MEDIA_CARTA" ||
      formatoParam === "MEDIA_CARTA_DOBLE"
        ? formatoParam
        : factura.tipoOperacion === "ALQUILER"
        ? "MEDIA_CARTA_DOBLE"
        : "MEDIA_CARTA";

    const datosImpresion: DatosImpresionFactura = {
      factura: {
        id: factura.id,
        numeroFactura: factura.numeroFactura,
        fechaCreacion: factura.fechaCreacion.toISOString(),
        fechaEntregaAlquiler: factura.fechaEntregaAlquiler?.toISOString() || null,
        fechaDevolucionPactada: factura.fechaDevolucionPactada?.toISOString() || null,
        tipoOperacion: factura.tipoOperacion,
        estado: factura.estado,
        subtotalProductos: factura.subtotalProductos,
        subtotalArreglosLibres: factura.subtotalArreglosLibres,
        recargoMoraAcumulado: factura.recargoMoraAcumulado,
        totalFactura: factura.totalFactura,
        totalAbonado: factura.totalAbonado,
        saldoPendiente: factura.saldoPendiente,
        notas: factura.notas,
        cliente: {
          nombre: factura.cliente?.nombre || "Consumidor Final",
          documento: factura.cliente?.documento || "222222222222",
          telefono: factura.cliente?.telefono || null,
          direccion: factura.cliente?.direccion || null,
        },
        usuarioCajero: {
          nombre: factura.usuarioCajero?.nombre || "Cajero Principal",
          username: factura.usuarioCajero?.username || "cajero",
        },
        detalles: factura.detalles.map((d) => ({
          id: d.id,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
          esServicioLibre: d.esServicioLibre,
          descripcionLibre: d.descripcionLibre,
          producto: d.producto
            ? {
                codigo: d.producto.codigo,
                nombre: d.producto.nombre,
                talla: d.producto.talla,
                color: d.producto.color,
              }
            : null,
        })),
        abonos: factura.abonos.map((a) => ({
          id: a.id,
          fecha: a.fecha.toISOString(),
          monto: a.monto,
          metodoPago: a.metodoPago,
          referenciaComprobante: a.referenciaComprobante,
        })),
      },
      empresa: {
        nombreTienda: empresaConfig?.nombreTienda || "Mi Empresa",
        nombreComercial: empresaConfig?.nombreComercial || "Mi Empresa",
        eslogan: empresaConfig?.eslogan || "Punto de Venta y Servicios",
        nit: empresaConfig?.nit || "000.000.000-0",
        regimenFiscal: empresaConfig?.regimenFiscal || "No Responsable de IVA",
        direccion: empresaConfig?.direccion || "Dirección de la empresa",
        ciudad: empresaConfig?.ciudad || "Ciudad, Departamento",
        telefono: empresaConfig?.telefono || "000 000 0000",
        email: empresaConfig?.email || "contacto@miempresa.com",
        logoUrl: empresaConfig?.logoUrl || null,
        encabezadoFactura: empresaConfig?.encabezadoFactura || null,
        mostrarVendedorFactura:
          empresaConfig?.mostrarVendedorFactura !== undefined ? empresaConfig.mostrarVendedorFactura : true,
        politicasFactura:
          empresaConfig?.politicasFactura ||
          "El cliente se compromete a devolver las prendas en la fecha pactada en el mismo estado en que las recibe. Todo retraso generará cobro de tarifa de mora.",
        piePaginaFactura:
          empresaConfig?.piePaginaFactura || "¡Gracias por su compra y preferencia!",
        formatoPredeterminado: formatoSeleccionado,
        formatoImpresionDefault: formatoSeleccionado,
      },
    };

    // 3. Generar documento PDF según formato
    let doc;
    if (formatoSeleccionado === "TIRILLA_58") {
      doc = crearDocumentoPdfTirilla(datosImpresion, {}, 58);
    } else if (formatoSeleccionado === "TIRILLA") {
      doc = crearDocumentoPdfTirilla(datosImpresion, {}, 80);
    } else if (formatoSeleccionado === "CARTA") {
      doc = crearDocumentoPdfCarta(datosImpresion);
    } else if (formatoSeleccionado === "MEDIA_CARTA_DOBLE") {
      doc = crearDocumentoPdfMediaCartaDoble(datosImpresion);
    } else {
      doc = crearDocumentoPdfMediaCarta(datosImpresion);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const descargar = searchParams.get("descargar") === "true";
    const disposition = descargar ? "attachment" : "inline";

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="Factura_${factura.numeroFactura}_${formatoSeleccionado}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al generar PDF de la factura";
    console.error("[ERROR GET FACTURA PDF]", errorMsg);
    return NextResponse.json(
      { success: false, error: "Error al generar el documento PDF" },
      { status: 500 }
    );
  }
}
