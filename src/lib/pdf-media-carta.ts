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
  tipoCopia?: string;
  numCopias?: 1 | 2;
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

// Helpers Defensivos Anti-Crash
const safeNum = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const formatCOP = (val: unknown): string => {
  return `$${Math.round(safeNum(val)).toLocaleString("es-CO")}`;
};

const safeDate = (val: unknown, withTime = false): string => {
  if (!val) return "—";
  const d = new Date(val as string | number | Date);
  if (isNaN(d.getTime())) return "—";
  return withTime
    ? d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("es-CO");
};

/**
 * Calcula con rigor técnico el estado general de orden, estado financiero y estado de tiempo/entrega
 */
export function obtenerInfoEstadosAlquiler(factura: DatosImpresionFactura["factura"]) {
  const saldoPendiente = safeNum(factura.saldoPendiente);
  const estaCerrada =
    factura.estado === "FINALIZADA" ||
    factura.estado === "CERRADA" ||
    Boolean(factura.fechaDevolucionReal);
  const textoEstadoOrden = estaCerrada
    ? "CERRADA (FINALIZADA / PAZ Y SALVO)"
    : "ABIERTA (EN CURSO / PENDIENTE)";

  const esPazYSalvo = saldoPendiente <= 0;
  const textoEstadoFinanciero = esPazYSalvo
    ? "PAGÓ COMPLETAMENTE ($0 Pendiente)"
    : `QUEDÓ FALTANDO PLATA (Saldo: ${formatCOP(saldoPendiente)})`;

  let textoTiempoYDevolucion = "ESTÁ EN PLAZO / AL DÍA";
  let estaEnMora = false;
  let diasRetraso = 0;
  let horasRetraso = 0;

  if (factura.fechaDevolucionReal) {
    textoTiempoYDevolucion = "PRENDAS DEVUELTAS A CONFORMIDAD";
  } else if (factura.fechaDevolucionPactada) {
    const ahora = new Date();
    const limite = new Date(factura.fechaDevolucionPactada);
    if (ahora > limite) {
      estaEnMora = true;
      const diffMs = ahora.getTime() - limite.getTime();
      diasRetraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      horasRetraso = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const detalle = diasRetraso > 0 ? `${diasRetraso}d ${horasRetraso}h` : `${horasRetraso}h`;
      textoTiempoYDevolucion = `YA SE PASÓ (EN MORA — ${detalle})`;
    } else {
      textoTiempoYDevolucion = esPazYSalvo
        ? "ESTÁ EN PLAZO / AL DÍA (Pago completo)"
        : "ESTÁ EN PLAZO / AL DÍA (Saldo pendiente)";
    }
  }

  return {
    estaCerrada,
    textoEstadoOrden,
    esPazYSalvo,
    textoEstadoFinanciero,
    textoTiempoYDevolucion,
    estaEnMora,
    diasRetraso,
    horasRetraso,
  };
}

/**
 * Dibuja un ejemplar completo de factura en formato Media Carta (Horizontal)
 */
function dibujarPaginaMediaCarta(
  doc: jsPDF,
  datos: DatosImpresionFactura,
  tipoCopiaTexto: string
): void {
  const { factura, empresa } = datos;
  const margenIzquierdo = 8;
  const margenDerecho = ANCHO_MEDIA_CARTA_MM - 8;
  let cursorY = 7;

  const esSepare = factura.tipoOperacion === "SEPARE";
  const esAlquiler = !esSepare && factura.tipoOperacion === "ALQUILER";
  const esPazYSalvo = factura.saldoPendiente <= 0;

  // 1. ENCABEZADO: LOGO + DATOS DE EMPRESA + RECUADRO DE FACTURA
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, 20, 15);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + 23 : margenIzquierdo;

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(empresa.nombreComercial.toUpperCase(), textoEmpresaX, cursorY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  let yDetalle = cursorY + 7.2;
  if (empresa.eslogan) {
    doc.text(empresa.eslogan, textoEmpresaX, yDetalle);
    yDetalle += 3;
  }
  const regimenTexto = empresa.regimenFiscal ? ` | ${empresa.regimenFiscal}` : "";
  doc.text(`NIT: ${empresa.nit}${regimenTexto}`, textoEmpresaX, yDetalle);
  yDetalle += 3;
  doc.text(`${empresa.direccion} — ${empresa.ciudad || "Villavicencio, Meta"}`, textoEmpresaX, yDetalle);
  yDetalle += 3;
  doc.text(`Tel: ${empresa.telefono}${empresa.email ? ` | ${empresa.email}` : ""}`, textoEmpresaX, yDetalle);

  // Recuadro derecho de Factura / Contrato
  const anchoCajaFactura = 70;
  const altoCajaFactura = 17;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 6;

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
  doc.setFontSize(6.5);
  if (esSepare) {
    doc.setTextColor(15, 23, 42);
    doc.text("FORMATO DE APARTADO", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  } else if (esAlquiler) {
    const infoEst = obtenerInfoEstadosAlquiler(factura);
    if (infoEst.estaCerrada) {
      doc.setTextColor(5, 150, 105);
      doc.text("PAZ Y SALVO ALQUILER Y DEPÓSITO", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
    } else if (infoEst.esPazYSalvo) {
      doc.setTextColor(15, 23, 42);
      doc.text("FACTURA ALQUILER (PAGO COMPLETO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text(`ALQUILER - FALTANDO: $${factura.saldoPendiente.toLocaleString("es-CO")}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
    }
  } else if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text("FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 9.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
  doc.text(`** ${tipoCopiaTexto} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 14.5, { align: "center" });

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
  doc.text(esAlquiler ? "CLIENTE / ARRENDATARIO:" : "CLIENTE / ADQUIRIENTE:", margenIzquierdo + 3, cursorY + 3.8);

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
    doc.text(`Dir: ${factura.cliente.direccion.substring(0, 48)}`, margenIzquierdo + 3, cursorY + 14.8);
  }

  // Columna Derecha: Operación & Fechas
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
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha Emisión: ${fechaTexto}  |  Op: ${factura.tipoOperacion}`, xColOp, cursorY + 7.6);

  const cajeroTexto =
    empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre
      ? `Cajero: ${factura.usuarioCajero.nombre}`
      : "Caja Principal";
  doc.text(cajeroTexto, xColOp, cursorY + 11.2);

  if (esAlquiler) {
    const infoEstados = obtenerInfoEstadosAlquiler(factura);
    doc.setFont("helvetica", "bold");
    if (infoEstados.estaEnMora) {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(5, 150, 105);
    }
    const textoEntrega = infoEstados.textoTiempoYDevolucion;
    doc.text(textoEntrega.substring(0, 48), xColOp, cursorY + 14.8);
  }

  cursorY += altoFichaCliente + 2;

  // 3. TABLA DE ÍTEMS
  const altoCabecera = 5.2;
  doc.setFillColor(15, 23, 42);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 3, cursorY + 3.6);
  doc.text("TIPO", margenIzquierdo + 14, cursorY + 3.6);
  doc.text("DESCRIPCIÓN DE LA PRENDA O SERVICIO", margenIzquierdo + 30, cursorY + 3.6);
  doc.text("PRECIO UNIT.", margenDerecho - 38, cursorY + 3.6, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 3, cursorY + 3.6, { align: "right" });

  cursorY += altoCabecera;

  const maxItemsMediaCarta = Math.min(factura.detalles.length, 4);
  for (let i = 0; i < maxItemsMediaCarta; i++) {
    const det = factura.detalles[i];
    const altoFila = 5;
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 5, cursorY + 3.5, { align: "center" });

    const esAlq = det.producto?.tipo === "ALQUILER" || factura.tipoOperacion === "ALQUILER";
    const tipoLabel = det.esServicioLibre ? "SERVICIO" : esAlq ? "ALQUILER" : "VENTA";
    doc.setFont("helvetica", "bold");
    doc.text(tipoLabel, margenIzquierdo + 14, cursorY + 3.5);

    doc.setFont("helvetica", "normal");
    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Arreglo de sastrería")
      : (det.producto?.nombre || "Prenda");
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    doc.text(desc.substring(0, 52), margenIzquierdo + 30, cursorY + 3.5);

    doc.text(`$${det.precioUnitario.toLocaleString("es-CO")}`, margenDerecho - 38, cursorY + 3.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDerecho - 3, cursorY + 3.5, { align: "right" });

    cursorY += altoFila;
  }

  // 4. RECUADRO DE DEPÓSITO EN GARANTÍA (SI APLICA)
  if (esAlquiler || (factura.montoDeposito && factura.montoDeposito > 0)) {
    cursorY += 1.5;
    const altoDep = 10;
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(217, 119, 6); // Amber 600
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoDep, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text("CONSTANCIA DE COBRO SEPARADO (EFECTIVO):", margenIzquierdo + 3, cursorY + 3.2);
    doc.text(`$${(factura.montoDeposito || 0).toLocaleString("es-CO")}`, margenDerecho - 3, cursorY + 3.2, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(15, 23, 42);
    const constanciaTxt = `Se recibió en EFECTIVO la suma de $${(factura.montoDeposito || 0).toLocaleString("es-CO")} por concepto de Abono / Depósito establecido en este documento.`;
    doc.text(constanciaTxt, margenIzquierdo + 3, cursorY + 5.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    const estadoDepTxt = factura.estadoDeposito === "DEVUELTO_COMPLETO"
      ? `Estado: DEPÓSITO DEVUELTO 100% AL CLIENTE ($${(factura.montoDevueltoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")})`
      : factura.estadoDeposito === "RETENIDO_PARCIAL"
      ? `Estado: RETENCIÓN POR DAÑO: $${(factura.montoRetenidoDeposito || 0).toLocaleString("es-CO")} | DEVUELTO: $${(factura.montoDevueltoDeposito || 0).toLocaleString("es-CO")}`
      : factura.estadoDeposito === "RETENIDO_TOTAL"
      ? "Estado: RETENCIÓN TOTAL POR DAÑO / PÉRDIDA"
      : "Estado: RECIBIDO EN CUSTODIA (Reembolsable al devolver las prendas completas y sin daños)";
    doc.text(estadoDepTxt.substring(0, 95), margenIzquierdo + 3, cursorY + 8.4);

    cursorY += altoDep;
  }

  // 5. RESUMEN FINANCIERO Y FIRMAS (LADO A LADO)
  cursorY += 2;
  const anchoTotales = 68;
  const xTotales = margenDerecho - anchoTotales;

  // Políticas y Firmas a la izquierda
  const anchoPoliticas = xTotales - margenIzquierdo - 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margenIzquierdo, cursorY, anchoPoliticas, 24, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(esAlquiler ? "TÉRMINOS Y CONDICIONES DE ALQUILER:" : "TÉRMINOS Y POLÍTICAS COMERCIALES:", margenIzquierdo + 2.5, cursorY + 3.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  const textoPol = empresa.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso genera recargo de mora.";
  const lineasPoliticas = doc.splitTextToSize(textoPol, anchoPoliticas - 5);
  doc.text(lineasPoliticas.slice(0, 3), margenIzquierdo + 2.5, cursorY + 6.2);

  // Firmas debajo de políticas
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.line(margenIzquierdo + 4, cursorY + 19, margenIzquierdo + 46, cursorY + 19);
  doc.text("Firma Vendedor / Cajero Responsable", margenIzquierdo + 6, cursorY + 22);

  doc.line(margenIzquierdo + 52, cursorY + 19, margenIzquierdo + 110, cursorY + 19);
  doc.text("Firma y C.C. Cliente (Aceptación de Términos)", margenIzquierdo + 54, cursorY + 22);

  // Cuadro de Totales a la derecha
  let yTot = cursorY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
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
    doc.setFontSize(7.2);
    doc.setTextColor(5, 150, 105);
    doc.text("SALDO:", xTotales, yTot + 4);
    doc.text("$0 (PAZ Y SALVO)", margenDerecho - 1, yTot + 4, { align: "right" });
  } else {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(225, 29, 72);
    doc.roundedRect(xTotales - 1.5, yTot, anchoTotales + 1.5, 6, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(225, 29, 72);
    doc.text("SALDO PENDIENTE:", xTotales, yTot + 4);
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDerecho - 1, yTot + 4, { align: "right" });
  }

  // Pie de cortesía sin QR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  const pie = empresa.piePaginaFactura || "Sistema POS Local — Impreso sin códigos QR externos";
  doc.text(pie, ANCHO_MEDIA_CARTA_MM / 2, ALTO_MEDIA_CARTA_MM - 3, { align: "center" });
}

/**
 * Genera una instancia vectorial de jsPDF en formato Media Carta optimizada
 */
export function crearDocumentoPdfMediaCarta(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [ALTO_MEDIA_CARTA_MM, ANCHO_MEDIA_CARTA_MM],
    compress: true,
  });

  if (opciones.numCopias === 2) {
    dibujarPaginaMediaCarta(doc, datos, "EJEMPLAR 1: COPIA CLIENTE");
    doc.addPage([ALTO_MEDIA_CARTA_MM, ANCHO_MEDIA_CARTA_MM], "landscape");
    dibujarPaginaMediaCarta(doc, datos, "EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO");
  } else {
    dibujarPaginaMediaCarta(doc, datos, opciones.tipoCopia || "COPIA CLIENTE");
    if (doc.getNumberOfPages() > 1) {
      doc.deletePage(2);
    }
  }

  return doc;
}

/**
 * Dibuja un ejemplar completo de factura en formato Carta Completa (Vertical)
 */
function dibujarPaginaCarta(
  doc: jsPDF,
  datos: DatosImpresionFactura,
  tipoCopiaTexto: string
): void {
  const { factura, empresa } = datos;
  const anchoCartaMm = 215.9;
  const altoCartaMm = 279.4;
  const margenIzquierdo = 12;
  const margenDerecho = anchoCartaMm - 12;
  let cursorY = 12;

  const esSepare = factura.tipoOperacion === "SEPARE";
  const esAlquiler = !esSepare && factura.tipoOperacion === "ALQUILER";
  const esPazYSalvo = factura.saldoPendiente <= 0;

  // 1. ENCABEZADO: LOGO + DATOS FISCALES + RECUADRO DE FACTURA
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, 26, 20);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + 29 : margenIzquierdo;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  doc.text(empresa.nombreComercial.toUpperCase(), textoEmpresaX, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  let yDet = cursorY + 9;
  if (empresa.eslogan) {
    doc.text(empresa.eslogan, textoEmpresaX, yDet);
    yDet += 3.8;
  }
  const reg = empresa.regimenFiscal ? `  |  ${empresa.regimenFiscal}` : "";
  doc.text(`NIT: ${empresa.nit}${reg}`, textoEmpresaX, yDet);
  yDet += 3.8;
  doc.text(`${empresa.direccion} — ${empresa.ciudad || "Villavicencio, Meta"}`, textoEmpresaX, yDet);
  yDet += 3.8;
  doc.text(`Teléfono / WhatsApp: ${empresa.telefono}${empresa.email ? ` | ${empresa.email}` : ""}`, textoEmpresaX, yDet);

  // Recuadro derecho de Factura
  const anchoCajaFactura = 76;
  const altoCajaFactura = 22;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 10;

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
  doc.setFontSize(7.5);
  if (esSepare) {
    doc.setTextColor(15, 23, 42);
    doc.text("FORMATO DE APARTADO - PRODUCTOS SEPARADOS", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else if (esAlquiler) {
    if (factura.estado === "CERRADA") {
      doc.setTextColor(5, 150, 105);
      doc.text("CERTIFICADO DE PAZ Y SALVO FINAL DE ALQUILER Y DEPÓSITO", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
    } else if (factura.saldoPendiente <= 0) {
      doc.setTextColor(15, 23, 42);
      doc.text("FACTURA DE ALQUILER - PAGO COMPLETO (PRENDA EN ALQUILER)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text("COMPROBANTE DE ALQUILER - SALDO PENDIENTE / ABONO PARCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
    }
  } else if (esPazYSalvo) {
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO FINAL (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text("FACTURA COMERCIAL", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 12.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(esPazYSalvo ? 5 : 37, esPazYSalvo ? 150 : 99, esPazYSalvo ? 105 : 235);
  doc.text(`** ${tipoCopiaTexto} **`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 18.5, { align: "center" });

  cursorY = Math.max(yDet + 3, yCajaFactura + altoCajaFactura + 3);

  // 2. BANNER DE ESTADO GENERAL DE LA OPERACIÓN (CARTA)
  if (esAlquiler) {
    const infoCarta = obtenerInfoEstadosAlquiler(factura);
    if (infoCarta.estaCerrada) {
      doc.setFillColor(5, 150, 105);
    } else {
      doc.setFillColor(15, 23, 42);
    }
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 9.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ORDEN: ${infoCarta.textoEstadoOrden}   |   FINANCIERO: ${infoCarta.textoEstadoFinanciero}`, anchoCartaMm / 2, cursorY + 4, { align: "center" });
    doc.setFontSize(6.8);
    doc.text(`PLAZO Y ENTREGA: ${infoCarta.textoTiempoYDevolucion}`, anchoCartaMm / 2, cursorY + 7.8, { align: "center" });
    cursorY += 12.5;
  } else if (esPazYSalvo) {
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURA PAGADA AL 100% — PAZ Y SALVO DE OBLIGACIÓN — SALDO TOTAL: $0", anchoCartaMm / 2, cursorY + 4.8, { align: "center" });
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
  doc.text(esAlquiler ? "CLIENTE / ARRENDATARIO:" : "CLIENTE / ADQUIRIENTE:", margenIzquierdo + 4, cursorY + 5);

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

  if (esAlquiler && factura.fechaDevolucionPactada) {
    const devTexto = new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(`Devolución Pactada: ${devTexto}`, colDerX, cursorY + 17.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
  } else {
    const cajeroNom =
      empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre
        ? factura.usuarioCajero.nombre
        : "Caja Principal";
    doc.text(`Atendido por: ${cajeroNom}`, colDerX, cursorY + 17.5);
  }

  cursorY += 27;

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

  const maxItemsCarta = Math.min(factura.detalles.length, 7);
  for (let i = 0; i < maxItemsCarta; i++) {
    const det = factura.detalles[i];
    const altoFila = 6.2;
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 7, cursorY + 4.3, { align: "center" });

    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio de Sastrería")
      : (det.producto?.nombre || "Prenda");
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    doc.text(desc.substring(0, 65), margenIzquierdo + 18, cursorY + 4.3);

    doc.text(`$${det.precioUnitario.toLocaleString("es-CO")}`, margenDerecho - 46, cursorY + 4.3, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDerecho - 4, cursorY + 4.3, { align: "right" });

    cursorY += altoFila;
  }

  // 5. RECUADRO DE DEPÓSITO EN GARANTÍA (SI APLICA)
  if (esAlquiler || (factura.montoDeposito && factura.montoDeposito > 0)) {
    cursorY += 2.5;
    const altoDepCarta = 14;
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.roundedRect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoDepCarta, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("CONSTANCIA DE COBRO SEPARADO (EFECTIVO):", margenIzquierdo + 4, cursorY + 4);
    doc.text(`$${(factura.montoDeposito || 0).toLocaleString("es-CO")}`, margenDerecho - 4, cursorY + 4, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const constanciaTxt = `Se recibió en EFECTIVO la suma de $${(factura.montoDeposito || 0).toLocaleString("es-CO")} por concepto de Abono / Depósito establecido en este documento.`;
    doc.text(constanciaTxt, margenIzquierdo + 4, cursorY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const estadoDepTxt = factura.estadoDeposito === "DEVUELTO_COMPLETO"
      ? `Estado: DEPÓSITO DEVUELTO 100% AL CLIENTE ($${(factura.montoDevueltoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")}) — Prendas recibidas a conformidad`
      : factura.estadoDeposito === "RETENIDO_PARCIAL"
      ? `Estado: DEPÓSITO RETENIDO ($${(factura.montoRetenidoDeposito || 0).toLocaleString("es-CO")} Retenido / $${(factura.montoDevueltoDeposito || 0).toLocaleString("es-CO")} Devuelto)`
      : factura.estadoDeposito === "RETENIDO_TOTAL"
      ? "Estado: DEPÓSITO RETENIDO 100% POR DAÑO O PÉRDIDA"
      : "Estado: RECIBIDO EN CUSTODIA (Reembolsable al devolver las prendas completas y en perfecto estado)";
    doc.text(estadoDepTxt.substring(0, 115), margenIzquierdo + 4, cursorY + 11.2);

    cursorY += altoDepCarta;
  }

  // 6. TOTALES Y POLÍTICAS
  cursorY += 3;
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
  doc.text(esAlquiler ? "TÉRMINOS Y CONDICIONES DEL CONTRATO DE ALQUILER:" : "TÉRMINOS Y CONDICIONES COMERCIALES:", margenIzquierdo + 3, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const polTexto = empresa.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de mora. Cuide su comprobante.";
  const lineasPol = doc.splitTextToSize(polTexto, anchoPol - 6);
  doc.text(lineasPol.slice(0, 3), margenIzquierdo + 3, cursorY + 8.5);

  // Firmas
  doc.setFontSize(6.2);
  doc.line(margenIzquierdo + 6, cursorY + 22, margenIzquierdo + 52, cursorY + 22);
  doc.text("Firma Vendedor / Cajero Responsable", margenIzquierdo + 8, cursorY + 25.5);

  doc.line(margenIzquierdo + 60, cursorY + 22, margenIzquierdo + 120, cursorY + 22);
  doc.text("Firma y C.C. del Cliente (Aceptación de Términos)", margenIzquierdo + 62, cursorY + 25.5);

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
    doc.text("SALDO:", xTotales, cursorY + 19);
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

  // 7. HISTORIAL DE ABONOS (SI HAY ESPACIO)
  if (factura.abonos && factura.abonos.length > 0) {
    cursorY += 31;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text("HISTORIAL DE ABONOS Y MÉTODOS DE PAGO:", margenIzquierdo, cursorY);

    cursorY += 3.5;
    const maxAbonos = Math.min(factura.abonos.length, 3);
    for (let a = 0; a < maxAbonos; a++) {
      const ab = factura.abonos[a];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const fAb = new Date(ab.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
      const cajeroAb = ab.cajero?.nombre ? ` (Cajero: ${ab.cajero.nombre})` : "";
      doc.text(`• ${fAb} | ${ab.metodoPago}${cajeroAb}: $${ab.monto.toLocaleString("es-CO")}`, margenIzquierdo + 3, cursorY);
      cursorY += 3.8;
    }
  }

  // Pie de página oficial
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const pieFinal = empresa.piePaginaFactura || `Comprobante Oficial POS — Consecutivo ${factura.numeroFactura} — Impreso sin códigos QR externos`;
  doc.text(pieFinal, anchoCartaMm / 2, altoCartaMm - 6, { align: "center" });
}

/**
 * Genera una instancia vectorial de jsPDF en formato Carta Completa (Letter Portrait)
 */
export function crearDocumentoPdfCarta(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });

  if (opciones.numCopias === 2) {
    dibujarPaginaCarta(doc, datos, "EJEMPLAR 1: COPIA CLIENTE");
    doc.addPage("letter", "portrait");
    dibujarPaginaCarta(doc, datos, "EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO");
  } else {
    dibujarPaginaCarta(doc, datos, opciones.tipoCopia || "COPIA CLIENTE");
    if (doc.getNumberOfPages() > 1) {
      doc.deletePage(2);
    }
  }

  return doc;
}

/**
 * Dibuja un ejemplar de tirilla térmica 80mm en el lienzo
 */
function dibujarContenidoTirilla(
  doc: jsPDF,
  datos: DatosImpresionFactura,
  startY: number,
  tipoCopiaTexto: string
): number {
  const { factura, empresa } = datos;
  const anchoMm = 80;
  const margen = 4;
  const margenDer = anchoMm - 4;
  const esSepare = factura.tipoOperacion === "SEPARE";
  const esAlquiler = !esSepare && factura.tipoOperacion === "ALQUILER";
  const esPazYSalvo = factura.saldoPendiente <= 0;
  let cursorY = startY;

  // Logo centrado si existe
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, (anchoMm - 24) / 2, cursorY, 24, 14);
  if (tieneLogo) {
    cursorY += 15;
  }

  // Cabecera Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(empresa.nombreComercial.toUpperCase(), anchoMm / 2, cursorY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  if (empresa.eslogan) {
    cursorY += 3.2;
    doc.text(empresa.eslogan, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += 3.2;
  doc.text(`NIT: ${empresa.nit}`, anchoMm / 2, cursorY, { align: "center" });
  if (empresa.regimenFiscal) {
    cursorY += 2.8;
    doc.text(empresa.regimenFiscal, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += 2.8;
  doc.text(empresa.direccion, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 2.8;
  doc.text(`Tel: ${empresa.telefono}`, anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3.2;
  doc.setFont("helvetica", "bold");
  doc.text(`** ${tipoCopiaTexto} **`, anchoMm / 2, cursorY, { align: "center" });

  cursorY += 3.2;
  doc.setLineWidth(0.2);
  doc.line(margen, cursorY, margenDer, cursorY);

  // Datos Factura / Contrato
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  let tituloTirilla = "FACTURA:";
  if (esSepare) {
    tituloTirilla = "FORMATO APARTADO:";
  } else if (esAlquiler) {
    if (factura.estado === "CERRADA") {
      tituloTirilla = "CERTIFICADO PAZ Y SALVO ALQUILER:";
    } else if (factura.saldoPendiente <= 0) {
      tituloTirilla = "FACTURA ALQUILER (PAGO COMPLETO):";
    } else {
      tituloTirilla = "COMPROBANTE ALQUILER (CON SALDO):";
    }
  } else if (esPazYSalvo) {
    tituloTirilla = "PAGO FINAL (PAZ Y SALVO):";
  }
  doc.text(`${tituloTirilla} ${factura.numeroFactura}`, margen, cursorY);

  cursorY += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Fecha: ${new Date(factura.fechaCreacion).toLocaleString("es-CO")}`, margen, cursorY);

  if (empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre) {
    cursorY += 2.8;
    doc.text(`Cajero: ${factura.usuarioCajero.nombre}`, margen, cursorY);
  }

  cursorY += 2.8;
  const nomTirilla = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(`Cliente: ${nomTirilla.substring(0, 26)}`, margen, cursorY);

  cursorY += 2.8;
  const tipoTirilla = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "Doc");
  const dvTirilla = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  doc.text(`${tipoTirilla}: ${factura.cliente.documento}${dvTirilla}`, margen, cursorY);

  if (factura.cliente.telefono) {
    cursorY += 2.8;
    const telSecTirilla = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
    doc.text(`Tel: ${factura.cliente.telefono}${telSecTirilla}`, margen, cursorY);
  }

  // Fechas y Estados de Alquiler en Tirilla
  if (esAlquiler) {
    const infoTir = obtenerInfoEstadosAlquiler(factura);
    cursorY += 2.8;
    doc.setFont("helvetica", "bold");
    doc.text(`ORDEN: ${infoTir.textoEstadoOrden}`, margen, cursorY);
    cursorY += 2.8;
    doc.text(`FINANCIERO: ${infoTir.textoEstadoFinanciero}`, margen, cursorY);
    cursorY += 2.8;
    doc.setFont("helvetica", "normal");
    doc.text(`Salida: ${new Date(factura.fechaEntregaAlquiler || factura.fechaCreacion).toLocaleDateString("es-CO")}`, margen, cursorY);
    cursorY += 2.8;
    doc.setFont("helvetica", "bold");
    if (infoTir.estaEnMora) {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(`Llegada: ${infoTir.textoTiempoYDevolucion.substring(0, 38)}`, margen, cursorY);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  cursorY += 3.2;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Tabla ítems
  cursorY += 3.2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("CANT  DESCRIPCIÓN", margen, cursorY);
  doc.text("TOTAL", margenDer, cursorY, { align: "right" });

  cursorY += 2.8;
  factura.detalles.forEach((det) => {
    doc.setFont("helvetica", "normal");
    const desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio")
      : (det.producto?.nombre || "Prenda");
    doc.text(`${det.cantidad}x ${desc.substring(0, 24)}`, margen, cursorY);
    doc.setFont("helvetica", "bold");
    doc.text(`$${det.subtotal.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
    cursorY += 3;
  });

  cursorY += 1.5;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Totales
  cursorY += 3.2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("TOTAL:", margen, cursorY);
  doc.text(`$${factura.totalFactura.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  cursorY += 3;
  doc.text("TOTAL ABONADO:", margen, cursorY);
  doc.text(`-$${factura.totalAbonado.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });

  cursorY += 3.2;
  doc.setFontSize(7.5);
  doc.text("SALDO PENDIENTE:", margen, cursorY);
  if (esPazYSalvo) {
    doc.text("$0 (PAZ Y SALVO)", margenDer, cursorY, { align: "right" });
  } else {
    doc.text(`$${factura.saldoPendiente.toLocaleString("es-CO")}`, margenDer, cursorY, { align: "right" });
  }

  // Constancia de Cobro Separado de Depósito (Efectivo)
  if (esAlquiler || (factura.montoDeposito && factura.montoDeposito > 0)) {
    cursorY += 3.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text("CONSTANCIA COBRO SEPARADO (EFECTIVO):", margen, cursorY);
    cursorY += 2.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(`Depósito en Efectivo: $${(factura.montoDeposito || 0).toLocaleString("es-CO")}`, margen, cursorY);

    cursorY += 2.6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    const estadoDepTir = factura.estadoDeposito === "DEVUELTO_COMPLETO"
      ? "(Devuelto 100% al cliente)"
      : factura.estadoDeposito === "RETENIDO_PARCIAL"
      ? "(Retención parcial por daño)"
      : factura.estadoDeposito === "RETENIDO_TOTAL"
      ? "(Retenido por reposición)"
      : "(En custodia — Reembolsable al devolver)";
    doc.text(estadoDepTir, margen, cursorY);
  }

  // Firmas en Tirilla
  cursorY += 4.5;
  doc.setLineWidth(0.2);
  doc.line(margen + 2, cursorY, margen + 34, cursorY);
  doc.line(margenDer - 34, cursorY, margenDer - 2, cursorY);
  cursorY += 2.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("Firma Cajero", margen + 8, cursorY);
  doc.text("Firma Cliente", margenDer - 26, cursorY);

  // Pie
  cursorY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("¡GRACIAS POR SU PREFERENCIA!", anchoMm / 2, cursorY, { align: "center" });
  cursorY += 2.8;
  doc.text(empresa.piePaginaFactura || "Sistema POS Local — Cero QR", anchoMm / 2, cursorY, { align: "center" });

  return cursorY + 4;
}

/**
 * Genera una instancia vectorial de jsPDF en formato POS Tirilla Térmica (80mm)
 */
export function crearDocumentoPdfTirilla(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const altoBaseMm = Math.max(160, 110 + datos.factura.detalles.length * 8 + (datos.factura.abonos?.length || 0) * 7);
  const numCopias = opciones.numCopias || 1;
  const altoTotalMm = numCopias === 2 ? altoBaseMm * 2 + 15 : altoBaseMm;
  const anchoMm = 80;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [anchoMm, altoTotalMm],
    compress: true,
  });

  if (numCopias === 2) {
    const yFin1 = dibujarContenidoTirilla(doc, datos, 4, "EJEMPLAR 1: COPIA CLIENTE");

    // Línea de corte
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(4, yFin1 + 3, 76, yFin1 + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("- - - - - CORTE DE COPIA - - - - -", anchoMm / 2, yFin1 + 6, { align: "center" });
    doc.setLineDashPattern([], 0);

    dibujarContenidoTirilla(doc, datos, yFin1 + 10, "EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO");
  } else {
    dibujarContenidoTirilla(doc, datos, 4, opciones.tipoCopia || "COPIA CLIENTE");
  }

  return doc;
}

/**
 * Descarga el archivo PDF de la factura según el formato documental elegido (TIRILLA, MEDIA_CARTA o CARTA)
 */
export function descargarPdfSegunFormato(
  datos: DatosImpresionFactura,
  formato: FormatoImpresionTipo = "MEDIA_CARTA",
  nombreArchivo?: string,
  opciones: OpcionesPdfMediaCarta = {}
): void {
  let doc: jsPDF;
  if (formato === "TIRILLA") {
    doc = crearDocumentoPdfTirilla(datos, opciones);
  } else if (formato === "CARTA") {
    doc = crearDocumentoPdfCarta(datos, opciones);
  } else {
    doc = crearDocumentoPdfMediaCarta(datos, opciones);
  }

  const esSepare = datos.factura.tipoOperacion === "SEPARE";
  const esAlquiler = datos.factura.tipoOperacion === "ALQUILER";
  const prefijo = esSepare ? "Formato_Apartado" : (esAlquiler ? "Comprobante_Alquiler" : "Factura");
  const clienteLimpio = (datos.factura.cliente.nombre || "Cliente")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 20);

  const nombre =
    nombreArchivo || `${prefijo}_${datos.factura.numeroFactura}_${clienteLimpio}_${formato}.pdf`;
  doc.save(nombre);
}

/**
 * Descarga directamente el archivo PDF de la factura en el navegador en formato Media Carta
 */
export function descargarPdfMediaCarta(
  datos: DatosImpresionFactura,
  nombreArchivo?: string,
  opciones: OpcionesPdfMediaCarta = {}
): void {
  descargarPdfSegunFormato(datos, "MEDIA_CARTA", nombreArchivo, opciones);
}

/**
 * Abre el PDF en una pestaña nueva del navegador para visualización o impresión física directa
 */
export function abrirPdfMediaCarta(
  datos: DatosImpresionFactura,
  formato: FormatoImpresionTipo = "MEDIA_CARTA",
  opciones: OpcionesPdfMediaCarta = {}
): void {
  let doc: jsPDF;
  if (formato === "TIRILLA") {
    doc = crearDocumentoPdfTirilla(datos, opciones);
  } else if (formato === "CARTA") {
    doc = crearDocumentoPdfCarta(datos, opciones);
  } else {
    doc = crearDocumentoPdfMediaCarta(datos, opciones);
  }

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
