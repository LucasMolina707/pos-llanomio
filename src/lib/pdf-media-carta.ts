import { jsPDF } from "jspdf";
import { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";

/**
 * Dimensiones exactas de Media Carta (Half Letter) Horizontal:
 * Ancho: 215.9 mm (8.5 pulgadas)
 * Alto: 139.7 mm (5.5 pulgadas)
 */
export const ANCHO_MEDIA_CARTA_MM = 215.9;
export const ALTO_MEDIA_CARTA_MM = 139.7;

export interface OpcionesPdfMediaCarta {
  tipoCopia?: "ORIGINAL CLIENTE" | "COPIA ARCHIVO TIENDA" | "COPIA CONTABLE";
}

/**
 * Genera una instancia vectorial de jsPDF en formato Media Carta optimizada para mostrador
 */
export function crearDocumentoPdfMediaCarta(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const { factura, empresa } = datos;
  const tipoCopia = opciones.tipoCopia || "ORIGINAL CLIENTE";

  // Crear documento en orientación horizontal (Landscape), unidades mm, tamaño Media Carta
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [ALTO_MEDIA_CARTA_MM, ANCHO_MEDIA_CARTA_MM], // jsPDF toma [alto, ancho] en landscape
    compress: true,
  });

  const margenIzquierdo = 10;
  const margenDerecho = ANCHO_MEDIA_CARTA_MM - 10;
  let cursorY = 10;

  // ---------------------------------------------------------------------------
  // 1. ENCABEZADO: DATOS DE LA EMPRESA & RECUADRO DE FACTURA
  // ---------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(empresa.nombreComercial.toUpperCase(), margenIzquierdo, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600
  cursorY += 4;
  doc.text(`NIT: ${empresa.nit}`, margenIzquierdo, cursorY);
  cursorY += 3.5;
  doc.text(`${empresa.direccion} — Villavicencio, Meta`, margenIzquierdo, cursorY);
  cursorY += 3.5;
  doc.text(`Teléfono / WhatsApp: ${empresa.telefono}`, margenIzquierdo, cursorY);

  // Recuadro derecho: Factura Comercial N° Consecutivo
  const anchoCajaFactura = 62;
  const altoCajaFactura = 17;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 8;

  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(15, 23, 42); // Slate 900
  doc.setLineWidth(0.4);
  doc.roundedRect(xCajaFactura, yCajaFactura, anchoCajaFactura, altoCajaFactura, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(`** ${tipoCopia} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 14.5, { align: "center" });

  // Fecha y Cajero debajo del recuadro
  const fechaTexto = new Date(factura.fechaCreacion).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${fechaTexto}`, margenDerecho, yCajaFactura + altoCajaFactura + 3.5, { align: "right" });

  // Línea separadora superior
  cursorY += 6;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(margenIzquierdo, cursorY, margenDerecho, cursorY);
  cursorY += 3;

  // ---------------------------------------------------------------------------
  // 2. FICHA DEL CLIENTE Y DETALLES DE LA OPERACIÓN
  // ---------------------------------------------------------------------------
  const altoFicha = 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFicha, 1.5, 1.5, "FD");

  const col1X = margenIzquierdo + 3;
  const col2X = margenIzquierdo + 100;
  let filaY = cursorY + 4;

  // Columna 1: Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DATOS DEL CLIENTE:", col1X, filaY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(factura.cliente?.nombre || "Consumidor Final", col1X + 30, filaY);

  filaY += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cédula / NIT: ${factura.cliente?.documento || "N/A"}`, col1X, filaY);
  doc.text(`Tel: ${factura.cliente?.telefono || "N/A"}`, col1X + 45, filaY);

  filaY += 3.5;
  doc.text(`Dirección: ${factura.cliente?.direccion || "Villavicencio"}`, col1X, filaY);

  // Columna 2: Operación y Devolución
  let fila2Y = cursorY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DATOS DE LA OPERACIÓN:", col2X, fila2Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${factura.tipoOperacion} — ESTADO: ${factura.estado}`, col2X + 35, fila2Y);

  fila2Y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cajero Turno: ${factura.usuarioCajero?.nombre || "Caja Principal"}`, col2X, fila2Y);

  if (factura.fechaDevolucionPactada) {
    fila2Y += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 24, 93); // Rose 700
    const fecDev = new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
    doc.text(`Devolución Pactada: ${fecDev}`, col2X, fila2Y);
  }

  cursorY += altoFicha + 3;

  // ---------------------------------------------------------------------------
  // 3. TABLA DE ÍTEMS / REFERENCIAS
  // ---------------------------------------------------------------------------
  // Encabezados de tabla
  const altoEncabezadoTabla = 5;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoEncabezadoTabla, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  const colCantX = margenIzquierdo + 3;
  const colDescX = margenIzquierdo + 18;
  const colPrecioX = margenDerecho - 45;
  const colSubtX = margenDerecho - 3;

  doc.text("CANT.", colCantX, cursorY + 3.5);
  doc.text("DESCRIPCIÓN DE LA PRENDA / SERVICIO DE SASTRERÍA", colDescX, cursorY + 3.5);
  doc.text("PRECIO UNIT.", colPrecioX, cursorY + 3.5, { align: "right" });
  doc.text("SUBTOTAL", colSubtX, cursorY + 3.5, { align: "right" });

  cursorY += altoEncabezadoTabla + 1;

  // Filas de detalles
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const maxItemsPorPagina = 5;
  const detallesVisibles = factura.detalles.slice(0, maxItemsPorPagina);

  detallesVisibles.forEach((d, idx) => {
    const esFilaPar = idx % 2 === 0;
    if (esFilaPar) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margenIzquierdo, cursorY - 1, margenDerecho - margenIzquierdo, 4.5, "F");
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(d.cantidad), colCantX + 3, cursorY + 2.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    let descTexto = "";
    if (d.esServicioLibre) {
      descTexto = `[SASTRERÍA] ${d.descripcionLibre || "Arreglo / Costura"}`;
    } else {
      const nombrePrenda = d.producto?.nombre || "Prenda";
      const detallesExtras = [
        d.producto?.codigo ? `Cód: ${d.producto.codigo}` : null,
        d.producto?.talla ? `Talla: ${d.producto.talla}` : null,
        d.producto?.color ? `Color: ${d.producto.color}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      descTexto = detallesExtras ? `${nombrePrenda} (${detallesExtras})` : nombrePrenda;
    }

    // Truncar si es demasiado largo
    const descRecortada = doc.splitTextToSize(descTexto, 125)[0] || descTexto;
    doc.text(descRecortada, colDescX, cursorY + 2.5);

    doc.text(`$${d.precioUnitario.toLocaleString("es-CO")}`, colPrecioX, cursorY + 2.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`$${d.subtotal.toLocaleString("es-CO")}`, colSubtX, cursorY + 2.5, { align: "right" });

    cursorY += 4.5;
  });

  if (factura.detalles.length > maxItemsPorPagina) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `... y ${factura.detalles.length - maxItemsPorPagina} artículo(s) más registrados en sistema.`,
      colDescX,
      cursorY + 1.5
    );
    cursorY += 3.5;
  }

  // ---------------------------------------------------------------------------
  // 4. TOTALES, SALDOS Y FIRMAS
  // ---------------------------------------------------------------------------
  cursorY = Math.max(cursorY + 1, 98);

  // Línea divisoria
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(margenIzquierdo, cursorY, margenDerecho, cursorY);
  cursorY += 2;

  // Bloque izquierdo: Políticas y Espacios de Firmas
  const anchoBloqueIzquierdo = 120;
  let cursorIzqY = cursorY;

  if (empresa.politicasFactura) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("TÉRMINOS Y CONDICIONES DE ALQUILER:", margenIzquierdo, cursorIzqY + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    const politicasLines = doc.splitTextToSize(empresa.politicasFactura, anchoBloqueIzquierdo);
    doc.text(politicasLines.slice(0, 3), margenIzquierdo, cursorIzqY + 5);
  }

  // Espacios de firmas
  const yFirmas = 122;
  const anchoLineaFirma = 48;

  // Firma LLANOMIO
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.2);
  doc.line(margenIzquierdo + 5, yFirmas, margenIzquierdo + 5 + anchoLineaFirma, yFirmas);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma Autorizada LLANOMIO", margenIzquierdo + 5 + anchoLineaFirma / 2, yFirmas + 3, {
    align: "center",
  });

  // Firma Cliente
  doc.line(margenIzquierdo + 65, yFirmas, margenIzquierdo + 65 + anchoLineaFirma, yFirmas);
  doc.text("Firma y Cédula del Cliente", margenIzquierdo + 65 + anchoLineaFirma / 2, yFirmas + 3, {
    align: "center",
  });

  // Bloque derecho: Cuadro de Liquidación de Totales
  const xTotales = margenDerecho - 68;
  const anchoTotales = 68;
  let cursorTotY = cursorY + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text("Subtotal Prendas:", xTotales, cursorTotY);
  doc.text(`$${factura.subtotalProductos.toLocaleString("es-CO")}`, margenDerecho, cursorTotY, {
    align: "right",
  });
  cursorTotY += 3.5;

  if (factura.subtotalArreglosLibres > 0) {
    doc.text("Subtotal Sastrería:", xTotales, cursorTotY);
    doc.text(`$${factura.subtotalArreglosLibres.toLocaleString("es-CO")}`, margenDerecho, cursorTotY, {
      align: "right",
    });
    cursorTotY += 3.5;
  }

  if (factura.recargoMoraAcumulado > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 24, 93);
    doc.text("Recargo Mora:", xTotales, cursorTotY);
    doc.text(`+$${factura.recargoMoraAcumulado.toLocaleString("es-CO")}`, margenDerecho, cursorTotY, {
      align: "right",
    });
    cursorTotY += 3.5;
  }

  // TOTAL FACTURA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL FACTURA:", xTotales, cursorTotY);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDerecho, cursorTotY, { align: "right" });
  cursorTotY += 3.5;

  // ABONADO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text("Total Abonado:", xTotales, cursorTotY);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDerecho, cursorTotY, { align: "right" });
  cursorTotY += 4;

  // SALDO PENDIENTE (Recuadro destacado)
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.roundedRect(xTotales - 2, cursorTotY - 1, anchoTotales + 2, 6, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text("SALDO PENDIENTE:", xTotales, cursorTotY + 3.5);
  doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDerecho - 1, cursorTotY + 3.5, {
    align: "right",
  });

  // Pie de página de cortesía
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Comprobante Oficial LLANOMIO POS — Consecutivo ${factura.numeroFactura} — Impreso sin códigos QR externos`,
    ANCHO_MEDIA_CARTA_MM / 2,
    ALTO_MEDIA_CARTA_MM - 4,
    { align: "center" }
  );

  return doc;
}

/**
 * Descarga directamente el archivo PDF de la factura en el navegador
 */
export function descargarPdfMediaCarta(
  datos: DatosImpresionFactura,
  nombreArchivo?: string
): void {
  const doc = crearDocumentoPdfMediaCarta(datos);
  const nombre = nombreArchivo || `Factura_${datos.factura.numeroFactura}_MediaCarta.pdf`;
  doc.save(nombre);
}

/**
 * Abre el PDF en una pestaña nueva del navegador para visualización o impresión física directa
 */
export function abrirPdfMediaCarta(datos: DatosImpresionFactura): void {
  const doc = crearDocumentoPdfMediaCarta(datos);
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
