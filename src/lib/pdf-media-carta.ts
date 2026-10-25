import { jsPDF } from "jspdf";
import { DatosImpresionFactura, FormatoImpresionTipo } from "@/components/impresion/PlantillaImpresion";

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

  // Recuadro derecho: Factura Comercial N° Consecutivo o Comprobante Pago Final
  const anchoCajaFactura = 68;
  const altoCajaFactura = 17;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 8;
  const esPazYSalvo = factura.saldoPendiente <= 0;

  if (esPazYSalvo) {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(5, 150, 105);   // Emerald 600
  } else {
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(15, 23, 42);   // Slate 900
  }
  doc.setLineWidth(0.4);
  doc.roundedRect(xCajaFactura, yCajaFactura, anchoCajaFactura, altoCajaFactura, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
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
  if (factura.saldoPendiente <= 0) {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(16, 185, 129);  // Emerald 500
    doc.setLineWidth(0.3);
    doc.roundedRect(xTotales - 2, cursorTotY - 1, anchoTotales + 2, 6, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text("SALDO PENDIENTE:", xTotales, cursorTotY + 3.5);
    doc.text("$0 (PAZ Y SALVO)", margenDerecho - 1, cursorTotY + 3.5, { align: "right" });
  } else {
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
  }

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
 * Genera una instancia vectorial de jsPDF en formato Carta Completa (Letter Portrait)
 */
export function crearDocumentoPdfCarta(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const { factura, empresa } = datos;
  const tipoCopia = opciones.tipoCopia || "ORIGINAL CLIENTE";
  const anchoCartaMm = 215.9;
  const altoCartaMm = 279.4;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });

  const margenIzquierdo = 12;
  const margenDerecho = anchoCartaMm - 12;
  let cursorY = 14;

  // 1. ENCABEZADO
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(empresa.nombreComercial.toUpperCase(), margenIzquierdo, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  cursorY += 5;
  doc.text(`NIT: ${empresa.nit}`, margenIzquierdo, cursorY);
  cursorY += 4.5;
  doc.text(`${empresa.direccion} — Villavicencio, Meta`, margenIzquierdo, cursorY);
  cursorY += 4.5;
  doc.text(`Teléfono / WhatsApp: ${empresa.telefono}`, margenIzquierdo, cursorY);

  // Recuadro derecho de Factura
  const anchoCajaFactura = 74;
  const altoCajaFactura = 22;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 10;
  const esPazYSalvo = factura.saldoPendiente <= 0;

  if (esPazYSalvo) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(15, 23, 42);
  }
  doc.setLineWidth(0.4);
  doc.roundedRect(xCajaFactura, yCajaFactura, anchoCajaFactura, altoCajaFactura, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text("FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 13, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
  doc.text(`** ${tipoCopia} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 19, { align: "center" });

  // Fecha y cajero
  cursorY += 10;
  const fechaTexto = new Date(factura.fechaCreacion).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // 2. BANNER DE PAZ Y SALVO SI APLICA
  if (esPazYSalvo) {
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 7.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURA PAGADA AL 100% — PAZ Y SALVO DE OBLIGACIÓN — SALDO TOTAL: $0", anchoCartaMm / 2, cursorY + 5, { align: "center" });
    cursorY += 11;
  } else {
    cursorY += 2;
  }

  // 3. DATOS DE CLIENTE Y DETALLES
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("CLIENTE / ADQUIRIENTE:", margenIzquierdo + 4, cursorY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(factura.cliente.nombre.toUpperCase(), margenIzquierdo + 4, cursorY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cédula / NIT: ${factura.cliente.documento}`, margenIzquierdo + 4, cursorY + 15.5);
  doc.text(`Teléfono: ${factura.cliente.telefono || "N/A"}`, margenIzquierdo + 4, cursorY + 20);
  doc.text(`Dirección: ${factura.cliente.direccion || "N/A"}`, margenIzquierdo + 4, cursorY + 24);

  // Columna derecha cliente
  const colDerX = anchoCartaMm / 2 + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DETALLES DE LA OPERACIÓN:", colDerX, cursorY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Fecha Emisión: ${fechaTexto}`, colDerX, cursorY + 10.5);
  doc.text(`Tipo Operación: ${factura.tipoOperacion}`, colDerX, cursorY + 15.5);
  doc.text(`Atendido por: ${factura.usuarioCajero?.nombre || "Caja Mostrador"}`, colDerX, cursorY + 20);

  if (factura.fechaDevolucionPactada) {
    const fDev = new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(`Devolución Pactada: ${fDev}`, colDerX, cursorY + 24);
  }

  cursorY += 31;

  // 4. TABLA DE ÍTEMS
  const yCabeceraTabla = cursorY;
  const altoCabecera = 7;
  doc.setFillColor(30, 41, 59);
  doc.rect(margenIzquierdo, yCabeceraTabla, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 3, yCabeceraTabla + 4.8);
  doc.text("DESCRIPCIÓN DE LA PRENDA O SERVICIO", margenIzquierdo + 18, yCabeceraTabla + 4.8);
  doc.text("VALOR UNIT.", margenDerecho - 46, yCabeceraTabla + 4.8, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 4, yCabeceraTabla + 4.8, { align: "right" });

  cursorY += altoCabecera;

  factura.detalles.forEach((det, i) => {
    const esPar = i % 2 === 0;
    const altoFila = 7;
    if (esPar) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 6, cursorY + 4.8, { align: "center" });

    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio de Sastrería")
      : (det.producto?.nombre || "Prenda");
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    doc.text(desc.substring(0, 75), margenIzquierdo + 18, cursorY + 4.8);

    doc.text(`$${det.precioUnitario.toLocaleString("es-CO")}`, margenDerecho - 46, cursorY + 4.8, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDerecho - 4, cursorY + 4.8, { align: "right" });

    cursorY += altoFila;
  });

  // 5. TOTALES Y ABONOS
  cursorY += 6;
  const anchoTotales = 75;
  const xTotales = margenDerecho - anchoTotales;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL FACTURA:", xTotales, cursorY);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDerecho, cursorY, { align: "right" });

  cursorY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("Total Abonado:", xTotales, cursorY);
  doc.setTextColor(5, 150, 105);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDerecho, cursorY, { align: "right" });

  cursorY += 5;
  if (esPazYSalvo) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(xTotales - 2, cursorY - 1, anchoTotales + 2, 7.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text("SALDO PENDIENTE:", xTotales, cursorY + 4.5);
    doc.text("$0 (PAZ Y SALVO)", margenDerecho - 1, cursorY + 4.5, { align: "right" });
  } else {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(225, 29, 72);
    doc.roundedRect(xTotales - 2, cursorY - 1, anchoTotales + 2, 7.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72);
    doc.text("SALDO PENDIENTE:", xTotales, cursorY + 4.5);
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDerecho - 1, cursorY + 4.5, { align: "right" });
  }

  // 6. HISTORIAL DE ABONOS
  if (factura.abonos && factura.abonos.length > 0) {
    cursorY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("HISTORIAL DE ABONOS Y MÉTODOS DE PAGO:", margenIzquierdo, cursorY);

    cursorY += 3;
    factura.abonos.forEach((ab) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const fAb = new Date(ab.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
      const cajeroAb = ab.cajero?.nombre ? ` por ${ab.cajero.nombre}` : "";
      doc.text(`- ${fAb} | ${ab.metodoPago}${cajeroAb}: $${ab.monto.toLocaleString("es-CO")}`, margenIzquierdo + 3, cursorY);
      cursorY += 4;
    });
  }

  // Pie de página
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Comprobante Oficial LLANOMIO POS — Consecutivo ${factura.numeroFactura} — Impreso sin códigos QR externos`,
    anchoCartaMm / 2,
    altoCartaMm - 6,
    { align: "center" }
  );

  return doc;
}

/**
 * Genera una instancia vectorial de jsPDF en formato POS Tirilla Térmica (80mm)
 */
export function crearDocumentoPdfTirilla(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const { factura, empresa } = datos;
  const tipoCopia = opciones.tipoCopia || "ORIGINAL CLIENTE";
  const anchoMm = 80;
  const altoEstimadoMm = Math.max(160, 100 + factura.detalles.length * 8 + (factura.abonos?.length || 0) * 6);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [anchoMm, altoEstimadoMm],
    compress: true,
  });

  const margen = 4;
  const margenDer = anchoMm - 4;
  let cursorY = 6;

  // Cabecera Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(empresa.nombreComercial.toUpperCase(), anchoMm / 2, cursorY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  cursorY += 4;
  doc.text(`NIT: ${empresa.nit}`, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.5;
  doc.text(empresa.direccion, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.5;
  doc.text(`Tel: ${empresa.telefono}`, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.text(`** ${tipoCopia} **`, anchoMm / 2, cursorY, { align: "center" });

  cursorY += 4;
  doc.setLineWidth(0.2);
  doc.line(margen, cursorY, margenDer, cursorY);

  // Datos Factura
  cursorY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`FACTURA: ${factura.numeroFactura}`, margen, cursorY);
  cursorY += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Fecha: ${new Date(factura.fechaCreacion).toLocaleString("es-CO")}`, margen, cursorY);
  cursorY += 3.5;
  doc.text(`Cliente: ${factura.cliente.nombre.toUpperCase()}`, margen, cursorY);
  cursorY += 3.5;
  doc.text(`Cédula/NIT: ${factura.cliente.documento}`, margen, cursorY);
  if (factura.cliente.telefono) {
    cursorY += 3.5;
    doc.text(`Tel: ${factura.cliente.telefono}`, margen, cursorY);
  }

  cursorY += 4;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Tabla ítems
  cursorY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CANT  DESCRIPCIÓN", margen, cursorY);
  doc.text("TOTAL", margenDer, cursorY, { align: "right" });

  cursorY += 3.5;
  factura.detalles.forEach((det) => {
    doc.setFont("helvetica", "normal");
    const desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio")
      : (det.producto?.nombre || "Prenda");
    doc.text(`${det.cantidad}x ${desc.substring(0, 26)}`, margen, cursorY);
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
    cursorY += 3.5;
  });

  cursorY += 2;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Totales
  cursorY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TOTAL:", margen, cursorY);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  cursorY += 3.5;
  doc.text("TOTAL ABONADO:", margen, cursorY);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  cursorY += 4;
  doc.setFontSize(8.5);
  doc.text("SALDO PENDIENTE:", margen, cursorY);
  if (factura.saldoPendiente <= 0) {
    doc.text("$0 (PAZ Y SALVO)", margenDer, cursorY, { align: "right" });
  } else {
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
  }

  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("¡GRACIAS POR SU PREFERENCIA!", anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.5;
  doc.text("Sistema POS Local LLANOMIO — Cero QR", anchoMm / 2, cursorY, { align: "center" });

  return doc;
}

/**
 * Descarga directamente el archivo PDF de la factura en el navegador en formato Media Carta
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
 * Descarga el archivo PDF de la factura según el formato documental elegido (TIRILLA, MEDIA_CARTA o CARTA)
 */
export function descargarPdfSegunFormato(
  datos: DatosImpresionFactura,
  formato: FormatoImpresionTipo = "MEDIA_CARTA",
  nombreArchivo?: string
): void {
  let doc: jsPDF;
  if (formato === "TIRILLA") {
    doc = crearDocumentoPdfTirilla(datos);
  } else if (formato === "CARTA") {
    doc = crearDocumentoPdfCarta(datos);
  } else {
    doc = crearDocumentoPdfMediaCarta(datos);
  }

  const nombre =
    nombreArchivo || `Factura_${datos.factura.numeroFactura}_${formato}.pdf`;
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
