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
 * Inserta de manera segura un logo corporativo en Base64 en el lienzo jsPDF
 */
function insertarLogoSeguro(
  doc: jsPDF,
  logoUrl: string | null | undefined,
  x: number,
  y: number,
  anchoMm: number,
  altoMm: number
): boolean {
  if (!logoUrl || !logoUrl.startsWith("data:image/")) {
    return false;
  }
  try {
    const esPng = logoUrl.includes("image/png");
    const esWebp = logoUrl.includes("image/webp");
    const formato = esPng ? "PNG" : esWebp ? "WEBP" : "JPEG";
    doc.addImage(logoUrl, formato, x, y, anchoMm, altoMm, undefined, "FAST");
    return true;
  } catch (err) {
    console.warn("Aviso: No se pudo renderizar el logo en el PDF, se usará tipografía vectorial:", err);
    return false;
  }
}

/**
 * Genera una instancia vectorial de jsPDF en formato Media Carta optimizada para 1 sola página
 */
export function crearDocumentoPdfMediaCarta(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const { factura, empresa } = datos;
  const tipoCopia = opciones.tipoCopia || "ORIGINAL CLIENTE";

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [ALTO_MEDIA_CARTA_MM, ANCHO_MEDIA_CARTA_MM],
    compress: true,
  });

  const margenIzquierdo = 8;
  const margenDerecho = ANCHO_MEDIA_CARTA_MM - 8;
  let cursorY = 8;

  // 1. ENCABEZADO: LOGO + DATOS DE EMPRESA + RECUADRO DE FACTURA
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, 20, 16);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + 23 : margenIzquierdo;

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(empresa.nombreComercial.toUpperCase(), textoEmpresaX, cursorY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  let yDetalle = cursorY + 7.5;
  if (empresa.eslogan) {
    doc.text(empresa.eslogan, textoEmpresaX, yDetalle);
    yDetalle += 3.2;
  }
  const regimenTexto = empresa.regimenFiscal ? ` | ${empresa.regimenFiscal}` : "";
  doc.text(`NIT: ${empresa.nit}${regimenTexto}`, textoEmpresaX, yDetalle);
  yDetalle += 3.2;
  doc.text(`${empresa.direccion} — ${empresa.ciudad || "Villavicencio, Meta"}`, textoEmpresaX, yDetalle);
  yDetalle += 3.2;
  doc.text(`Tel: ${empresa.telefono}${empresa.email ? ` | ${empresa.email}` : ""}`, textoEmpresaX, yDetalle);

  // Recuadro derecho de Factura
  const anchoCajaFactura = 68;
  const altoCajaFactura = 17;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 6;
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
  doc.setFontSize(7);
  const esAlquiler = factura.tipoOperacion === "ALQUILER";
  if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text(esAlquiler ? "PAZ Y SALVO DE ALQUILER" : "PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text(esAlquiler ? "CONTRATO DE ALQUILER" : "FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
  doc.text(`** ${tipoCopia} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 14.5, { align: "center" });

  cursorY = Math.max(yDetalle + 2, yCajaFactura + altoCajaFactura + 2);

  // 2. SECCIÓN DE CLIENTE Y OPERACIÓN
  const altoFichaCliente = 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFichaCliente, 1.5, 1.5, "FD");

  // Columna Izquierda: Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CLIENTE / ARRENDATARIO:", margenIzquierdo + 3, cursorY + 3.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const nombreCliente = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(nombreCliente.substring(0, 38), margenIzquierdo + 3, cursorY + 7.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const tipoDoc = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "CC");
  const docDv = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  const telSec = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
  const textoDocTel = `${tipoDoc}: ${factura.cliente.documento}${docDv}  |  Tel: ${factura.cliente.telefono || "N/A"}${telSec}`;
  doc.text(textoDocTel.substring(0, 52), margenIzquierdo + 3, cursorY + 11.5);

  if (factura.cliente.esResponsableIVA) {
    const infoFiscal = `Resp: ${factura.cliente.responsabilidadFiscal || "O-48"} | ${factura.cliente.email || ""}`.substring(0, 48);
    doc.text(infoFiscal, margenIzquierdo + 3, cursorY + 14.8);
  } else if (factura.cliente.direccion) {
    doc.text(`Dir: ${factura.cliente.direccion.substring(0, 45)}`, margenIzquierdo + 3, cursorY + 14.8);
  }

  // Columna Derecha: Operación & Vendedor
  const xColOp = ANCHO_MEDIA_CARTA_MM / 2 + 10;
  const fechaTexto = new Date(factura.fechaCreacion).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DATOS DE LA OPERACIÓN:", xColOp, cursorY + 3.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${fechaTexto}  |  Operación: ${factura.tipoOperacion}`, xColOp, cursorY + 7.8);

  const cajeroTexto =
    empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre
      ? `Cajero: ${factura.usuarioCajero.nombre}`
      : "Caja Principal LLANOMIO";
  doc.text(cajeroTexto, xColOp, cursorY + 11.5);

  if (factura.fechaDevolucionPactada) {
    const fDev = new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(`Devolución Pactada: ${fDev}`, xColOp, cursorY + 14.8);
  }

  cursorY += altoFichaCliente + 2.5;

  // 3. TABLA DE ÍTEMS
  const altoCabecera = 5.5;
  doc.setFillColor(15, 23, 42);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 3, cursorY + 3.8);
  doc.text("TIPO", margenIzquierdo + 14, cursorY + 3.8);
  doc.text("DESCRIPCIÓN DE LA PRENDA O SERVICIO", margenIzquierdo + 30, cursorY + 3.8);
  doc.text("PRECIO UNIT.", margenDerecho - 38, cursorY + 3.8, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 3, cursorY + 3.8, { align: "right" });

  cursorY += altoCabecera;

  const maxItemsMediaCarta = Math.min(factura.detalles.length, 5);
  for (let i = 0; i < maxItemsMediaCarta; i++) {
    const det = factura.detalles[i];
    const altoFila = 5.2;
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 5, cursorY + 3.6, { align: "center" });

    const esAlq = det.producto?.tipo === "ALQUILER" || factura.tipoOperacion === "ALQUILER";
    const tipoLabel = det.esServicioLibre ? "SERVICIO" : esAlq ? "ALQUILER" : "VENTA";
    doc.setFont("helvetica", "bold");
    doc.text(tipoLabel, margenIzquierdo + 14, cursorY + 3.6);

    doc.setFont("helvetica", "normal");
    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Arreglo de sastrería")
      : (det.producto?.nombre || "Prenda");
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    doc.text(desc.substring(0, 50), margenIzquierdo + 30, cursorY + 3.6);

    doc.text(`$${det.precioUnitario.toLocaleString("es-CO")}`, margenDerecho - 38, cursorY + 3.6, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDerecho - 3, cursorY + 3.6, { align: "right" });

    cursorY += altoFila;
  }

  // 4. RESUMEN FINANCIERO Y POLÍTICAS (LADO A LADO)
  cursorY += 2;
  const anchoTotales = 65;
  const xTotales = margenDerecho - anchoTotales;

  // Políticas a la izquierda
  const anchoPoliticas = xTotales - margenIzquierdo - 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margenIzquierdo, cursorY, anchoPoliticas, 22, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text("TÉRMINOS Y POLÍTICAS DE ALQUILER / VENTA:", margenIzquierdo + 2.5, cursorY + 3.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  const textoPol = empresa.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso genera recargo de mora.";
  const lineasPoliticas = doc.splitTextToSize(textoPol, anchoPoliticas - 5);
  doc.text(lineasPoliticas.slice(0, 4), margenIzquierdo + 2.5, cursorY + 6.2);

  // Firmas debajo de políticas
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.line(margenIzquierdo + 5, cursorY + 18, margenIzquierdo + 40, cursorY + 18);
  doc.text("Firma Autorizada LLANOMIO", margenIzquierdo + 8, cursorY + 20.5);

  doc.line(margenIzquierdo + 48, cursorY + 18, margenIzquierdo + 85, cursorY + 18);
  doc.text("Firma / Cédula del Cliente", margenIzquierdo + 52, cursorY + 20.5);

  // Cuadro de Totales a la derecha
  let yTot = cursorY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL FACTURA:", xTotales, yTot + 3.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDerecho, yTot + 3.5, { align: "right" });

  yTot += 4.5;
  doc.setTextColor(71, 85, 105);
  doc.text("Total Abonado:", xTotales, yTot + 3.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDerecho, yTot + 3.5, { align: "right" });

  yTot += 4.5;
  if (esPazYSalvo) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(xTotales - 1.5, yTot, anchoTotales + 1.5, 6, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text("SALDO PENDIENTE:", xTotales, yTot + 4);
    doc.text("$0 (PAZ Y SALVO)", margenDerecho - 1, yTot + 4, { align: "right" });
  } else {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(225, 29, 72);
    doc.roundedRect(xTotales - 1.5, yTot, anchoTotales + 1.5, 6, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(225, 29, 72);
    doc.text("SALDO PENDIENTE:", xTotales, yTot + 4);
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDerecho - 1, yTot + 4, { align: "right" });
  }

  // Pie de cortesía sin QR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  const pie = empresa.piePaginaFactura || "Sistema POS Local LLANOMIO — Impreso sin códigos QR externos";
  doc.text(pie, ANCHO_MEDIA_CARTA_MM / 2, ALTO_MEDIA_CARTA_MM - 3, { align: "center" });

  // Garantía estricta de 1 sola página
  if (doc.getNumberOfPages() > 1) {
    doc.deletePage(2);
  }

  return doc;
}

/**
 * Genera una instancia vectorial de jsPDF en formato Carta Completa (Letter Portrait)
 * con garantía estricta de 1 sola página (Anti-Hoja en Blanco).
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
  let cursorY = 12;

  // 1. ENCABEZADO: LOGO + DATOS FISCALES + RECUADRO DE FACTURA
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, 26, 20);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + 29 : margenIzquierdo;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(empresa.nombreComercial.toUpperCase(), textoEmpresaX, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  let yDet = cursorY + 9;
  if (empresa.eslogan) {
    doc.text(empresa.eslogan, textoEmpresaX, yDet);
    yDet += 4;
  }
  const reg = empresa.regimenFiscal ? `  |  ${empresa.regimenFiscal}` : "";
  doc.text(`NIT: ${empresa.nit}${reg}`, textoEmpresaX, yDet);
  yDet += 4;
  doc.text(`${empresa.direccion} — ${empresa.ciudad || "Villavicencio, Meta"}`, textoEmpresaX, yDet);
  yDet += 4;
  doc.text(`Teléfono / WhatsApp: ${empresa.telefono}${empresa.email ? ` | ${empresa.email}` : ""}`, textoEmpresaX, yDet);

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
  const esAlquilerCarta = factura.tipoOperacion === "ALQUILER";
  if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text(esAlquilerCarta ? "PAZ Y SALVO DE ALQUILER" : "PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text(esAlquilerCarta ? "CONTRATO DE ALQUILER" : "FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 13, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
  doc.text(`** ${tipoCopia} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 18.5, { align: "center" });

  cursorY = Math.max(yDet + 3, yCajaFactura + altoCajaFactura + 3);

  // 2. BANNER DE PAZ Y SALVO SI APLICA
  if (esPazYSalvo) {
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(esAlquilerCarta ? "CONTRATO LIQUIDADO AL 100% — PAZ Y SALVO DE ALQUILER" : "FACTURA PAGADA AL 100% — PAZ Y SALVO DE OBLIGACIÓN — SALDO TOTAL: $0", anchoCartaMm / 2, cursorY + 4.8, { align: "center" });
    cursorY += 10;
  }

  // 3. DATOS DE CLIENTE Y DETALLES
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("CLIENTE / ARRENDATARIO:", margenIzquierdo + 4, cursorY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const nomCarta = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(nomCarta, margenIzquierdo + 4, cursorY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const tipoIdCarta = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "CC");
  const docDvCarta = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  doc.text(`${tipoIdCarta}: ${factura.cliente.documento}${docDvCarta}  |  Resp: ${factura.cliente.responsabilidadFiscal || "O-99"}`, margenIzquierdo + 4, cursorY + 14.5);
  const telSecCarta = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
  if (factura.cliente.esResponsableIVA) {
    doc.text(`Email: ${factura.cliente.email || "N/A"}  |  Tel: ${factura.cliente.telefono || "N/A"}${telSecCarta}`, margenIzquierdo + 4, cursorY + 19);
  } else {
    doc.text(`Tel: ${factura.cliente.telefono || "N/A"}${telSecCarta}  |  Dir: ${factura.cliente.direccion || "N/A"}`, margenIzquierdo + 4, cursorY + 19);
  }

  // Columna derecha detalles
  const colDerX = anchoCartaMm / 2 + 5;
  const fechaTexto = new Date(factura.fechaCreacion).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("DETALLES DE LA OPERACIÓN:", colDerX, cursorY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Fecha Emisión: ${fechaTexto}`, colDerX, cursorY + 9.5);
  doc.text(`Tipo Operación: ${factura.tipoOperacion}`, colDerX, cursorY + 13.5);

  if (factura.fechaDevolucionPactada) {
    const devTexto = new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(`Devolución Pactada: ${devTexto}`, colDerX, cursorY + 17.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const cajeroNom =
      empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre
        ? factura.usuarioCajero.nombre
        : "Caja Principal LLANOMIO";
    doc.text(`Atendido por: ${cajeroNom}`, colDerX, cursorY + 17.5);
  }

  cursorY += 28;

  // 4. TABLA DE ÍTEMS
  const altoCabecera = 6.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 4, cursorY + 4.5);
  doc.text("DESCRIPCIÓN DE LA PRENDA O SERVICIO", margenIzquierdo + 18, cursorY + 4.5);
  doc.text("VALOR UNIT.", margenDerecho - 46, cursorY + 4.5, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 4, cursorY + 4.5, { align: "right" });

  cursorY += altoCabecera;

  const maxItemsCarta = Math.min(factura.detalles.length, 10);
  for (let i = 0; i < maxItemsCarta; i++) {
    const det = factura.detalles[i];
    const altoFila = 6.5;
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 7, cursorY + 4.5, { align: "center" });

    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio de Sastrería")
      : (det.producto?.nombre || "Prenda");
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    doc.text(desc.substring(0, 65), margenIzquierdo + 18, cursorY + 4.5);

    doc.text(`$${det.precioUnitario.toLocaleString("es-CO")}`, margenDerecho - 46, cursorY + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDerecho - 4, cursorY + 4.5, { align: "right" });

    cursorY += altoFila;
  }

  // 5. TOTALES Y POLÍTICAS
  cursorY += 5;
  const anchoTotales = 75;
  const xTotales = margenDerecho - anchoTotales;

  // Políticas a la izquierda
  const anchoPol = xTotales - margenIzquierdo - 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margenIzquierdo, cursorY, anchoPol, 28, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("TÉRMINOS, CONDICIONES Y POLÍTICAS DE ALQUILER:", margenIzquierdo + 3, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const polTexto = empresa.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de mora. Cuide su comprobante.";
  const lineasPol = doc.splitTextToSize(polTexto, anchoPol - 6);
  doc.text(lineasPol.slice(0, 4), margenIzquierdo + 3, cursorY + 8.5);

  // Firmas
  doc.line(margenIzquierdo + 6, cursorY + 23, margenIzquierdo + 46, cursorY + 23);
  doc.text("Firma Autorizada LLANOMIO", margenIzquierdo + 8, cursorY + 26);

  doc.line(margenIzquierdo + 58, cursorY + 23, margenIzquierdo + 98, cursorY + 23);
  doc.text("Firma y Cédula del Cliente", margenIzquierdo + 62, cursorY + 26);

  // Cuadro de Totales
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL FACTURA:", xTotales, cursorY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDerecho, cursorY + 4.5, { align: "right" });

  doc.setTextColor(71, 85, 105);
  doc.text("Total Abonado:", xTotales, cursorY + 10);
  doc.setTextColor(5, 150, 105);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDerecho, cursorY + 10, { align: "right" });

  if (esPazYSalvo) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(xTotales - 2, cursorY + 14, anchoTotales + 2, 7.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text("SALDO PENDIENTE:", xTotales, cursorY + 19);
    doc.text("$0 (PAZ Y SALVO)", margenDerecho - 1, cursorY + 19, { align: "right" });
  } else {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(225, 29, 72);
    doc.roundedRect(xTotales - 2, cursorY + 14, anchoTotales + 2, 7.5, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(225, 29, 72);
    doc.text("SALDO PENDIENTE:", xTotales, cursorY + 19);
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDerecho - 1, cursorY + 19, { align: "right" });
  }

  // 6. HISTORIAL DE ABONOS
  if (factura.abonos && factura.abonos.length > 0) {
    cursorY += 32;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("HISTORIAL DE ABONOS Y MÉTODOS DE PAGO:", margenIzquierdo, cursorY);

    cursorY += 3.5;
    const maxAbonos = Math.min(factura.abonos.length, 3);
    for (let a = 0; a < maxAbonos; a++) {
      const ab = factura.abonos[a];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const fAb = new Date(ab.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
      const cajeroAb = ab.cajero?.nombre ? ` (Cajero: ${ab.cajero.nombre})` : "";
      doc.text(`• ${fAb} | ${ab.metodoPago}${cajeroAb}: $${ab.monto.toLocaleString("es-CO")}`, margenIzquierdo + 3, cursorY);
      cursorY += 4;
    }
  }

  // Pie de página oficial
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const pieFinal = empresa.piePaginaFactura || `Comprobante Oficial LLANOMIO POS — Consecutivo ${factura.numeroFactura} — Impreso sin códigos QR externos`;
  doc.text(pieFinal, anchoCartaMm / 2, altoCartaMm - 6, { align: "center" });

  // CORRECCIÓN ANTI-HOJA EN BLANCO: Si se generó una segunda página accidental, eliminarla
  if (doc.getNumberOfPages() > 1) {
    doc.deletePage(2);
  }

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
  const altoEstimadoMm = Math.max(160, 100 + factura.detalles.length * 8 + (factura.abonos?.length || 0) * 7);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [anchoMm, altoEstimadoMm],
    compress: true,
  });

  const margen = 4;
  const margenDer = anchoMm - 4;
  let cursorY = 4;

  // Logo centrado si existe
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, (anchoMm - 24) / 2, cursorY, 24, 14);
  if (tieneLogo) {
    cursorY += 16;
  }

  // Cabecera Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(empresa.nombreComercial.toUpperCase(), anchoMm / 2, cursorY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  if (empresa.eslogan) {
    cursorY += 3.5;
    doc.text(empresa.eslogan, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += 3.5;
  doc.text(`NIT: ${empresa.nit}`, anchoMm / 2, cursorY, { align: "center" });
  if (empresa.regimenFiscal) {
    cursorY += 3;
    doc.text(empresa.regimenFiscal, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += 3;
  doc.text(empresa.direccion, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3;
  doc.text(`Tel: ${empresa.telefono}`, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.text(`** ${tipoCopia} **`, anchoMm / 2, cursorY, { align: "center" });

  cursorY += 3.5;
  doc.setLineWidth(0.2);
  doc.line(margen, cursorY, margenDer, cursorY);

  // Datos Factura
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const esAlquilerTirilla = factura.tipoOperacion === "ALQUILER";
  const tituloTirilla = esAlquilerTirilla
    ? (factura.saldoPendiente <= 0 ? "PAZ Y SALVO DE ALQUILER" : "CONTRATO DE ALQUILER")
    : `FACTURA: ${factura.numeroFactura}`;
  doc.text(tituloTirilla, margen, cursorY);
  if (esAlquilerTirilla) {
    cursorY += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`N° ${factura.numeroFactura}`, margen, cursorY);
  }
  cursorY += 3.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Fecha: ${new Date(factura.fechaCreacion).toLocaleString("es-CO")}`, margen, cursorY);

  if (empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre) {
    cursorY += 3;
    doc.text(`Cajero: ${factura.usuarioCajero.nombre}`, margen, cursorY);
  }

  cursorY += 3;
  const nomTirilla = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(`Cliente: ${nomTirilla.substring(0, 26)}`, margen, cursorY);
  cursorY += 3;
  const tipoTirilla = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "Doc");
  const dvTirilla = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  doc.text(`${tipoTirilla}: ${factura.cliente.documento}${dvTirilla}`, margen, cursorY);
  if (factura.cliente.esResponsableIVA) {
    cursorY += 3;
    doc.text(`Resp: ${factura.cliente.responsabilidadFiscal || "O-48"}`, margen, cursorY);
  }
  if (factura.cliente.telefono) {
    cursorY += 3;
    const telSecTirilla = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
    doc.text(`Tel: ${factura.cliente.telefono}${telSecTirilla}`, margen, cursorY);
  }
  if (factura.fechaDevolucionPactada) {
    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.text(`Devolución: ${new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`, margen, cursorY);
    doc.setFont("helvetica", "normal");
  }

  cursorY += 3.5;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Tabla ítems
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("CANT  DESCRIPCIÓN", margen, cursorY);
  doc.text("TOTAL", margenDer, cursorY, { align: "right" });

  cursorY += 3;
  factura.detalles.forEach((det) => {
    doc.setFont("helvetica", "normal");
    const desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio")
      : (det.producto?.nombre || "Prenda");
    doc.text(`${det.cantidad}x ${desc.substring(0, 24)}`, margen, cursorY);
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
    cursorY += 3.2;
  });

  cursorY += 1.5;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Totales
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("TOTAL:", margen, cursorY);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  cursorY += 3.2;
  doc.text("TOTAL ABONADO:", margen, cursorY);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  if (factura.montoDeposito && factura.montoDeposito > 0) {
    cursorY += 3.2;
    doc.text("DEPÓSITO GARANTÍA:", margen, cursorY);
    const estadoDepTir = factura.estadoDeposito === "DEVUELTO_COMPLETO"
      ? "(Devuelto)"
      : factura.estadoDeposito === "RETENIDO_PARCIAL"
      ? "(Ret. Parcial)"
      : factura.estadoDeposito === "RETENIDO_TOTAL"
      ? "(Retenido)"
      : "(En Custodia)";
    doc.text(`$${factura.montoDeposito.toLocaleString("es-CO")} ${estadoDepTir}`, margenDer, cursorY, { align: "right" });
  }

  cursorY += 3.5;
  doc.setFontSize(8);
  doc.text("SALDO PENDIENTE:", margen, cursorY);
  if (factura.saldoPendiente <= 0) {
    doc.text("$0 (PAZ Y SALVO)", margenDer, cursorY, { align: "right" });
  } else {
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
  }

  // Políticas
  if (empresa.politicasFactura) {
    cursorY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("TÉRMINOS Y CONDICIONES:", anchoMm / 2, cursorY, { align: "center" });
    cursorY += 2.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    const polLineas = doc.splitTextToSize(empresa.politicasFactura, anchoMm - 8);
    doc.text(polLineas.slice(0, 5), anchoMm / 2, cursorY, { align: "center" });
    cursorY += polLineas.slice(0, 5).length * 2.8;
  }

  cursorY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("¡GRACIAS POR SU PREFERENCIA!", anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3;
  doc.text(empresa.piePaginaFactura || "Sistema POS Local LLANOMIO — Cero QR", anchoMm / 2, cursorY, { align: "center" });

  return doc;
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
 * Descarga directamente el archivo PDF de la factura en el navegador en formato Media Carta
 */
export function descargarPdfMediaCarta(
  datos: DatosImpresionFactura,
  nombreArchivo?: string
): void {
  descargarPdfSegunFormato(datos, "MEDIA_CARTA", nombreArchivo);
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
