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
  comprimir?: boolean;
}

/**
 * Inserta de manera segura un logo corporativo en Base64 en el lienzo jsPDF
 * Optimizado para marco cuadrado contenedor proporcional sin estirar ni deformar la imagen
 */
function insertarLogoSeguro(
  doc: jsPDF,
  logoUrl: string | null | undefined,
  x: number,
  y: number,
  ladoCuadroMm: number
): boolean {
  if (!logoUrl || !logoUrl.startsWith("data:image/")) {
    return false;
  }
  try {
    const esPng = logoUrl.includes("image/png");
    const esWebp = logoUrl.includes("image/webp");
    const formato = esPng ? "PNG" : esWebp ? "WEBP" : "JPEG";
    // Margen sutil de recuadro limpio
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(x, y, ladoCuadroMm, ladoCuadroMm, "S");
    // Insertar imagen preservando aspecto dentro del contenedor cuadrado
    doc.addImage(logoUrl, formato, x + 0.5, y + 0.5, ladoCuadroMm - 1, ladoCuadroMm - 1, undefined, "FAST");
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
 * Dibuja un ejemplar completo de factura en formato Media Carta con soporte para offset vertical
 */
function dibujarPaginaMediaCarta(
  doc: jsPDF,
  datos: DatosImpresionFactura,
  tipoCopiaTexto: string,
  offsetY: number = 0
): void {
  const { factura, empresa } = datos;
  const margenIzquierdo = 8;
  const margenDerecho = ANCHO_MEDIA_CARTA_MM - 8;
  let cursorY = 5.5 + offsetY;

  const saldoPendiente = safeNum(factura.saldoPendiente);
  const esAlquiler = factura.tipoOperacion === "ALQUILER";
  const esApartado = factura.tipoOperacion === "SEPARE" || factura.tipoOperacion === "APARTADO";
  const esVenta = !esAlquiler && !esApartado;
  const esPazYSalvo = saldoPendiente <= 0;
  const montoDepositoEfectivo = safeNum(factura.montoDeposito);
  const mostrarSeccionDeposito = esAlquiler; // En alquiler se destaca depósito, entrega y cobros adicionales

  const totalOperacionPrincipal = safeNum(factura.totalFactura);
  const totalAbonado = safeNum(factura.totalAbonado);
  const depositoPagadoHoyApartado = factura.estadoDeposito === "RECIBIDO_EN_GARANTIA";
  const saldoDepositoAlRetirar = depositoPagadoHoyApartado ? 0 : montoDepositoEfectivo;
  const saldoPendienteTotalApartado = Math.max(0, (totalOperacionPrincipal + saldoDepositoAlRetirar) - totalAbonado);

  const metodosAbonos = Array.from(
    new Set((factura.abonos || []).map((a) => (a.metodoPago || "EFECTIVO").toUpperCase()))
  );
  const textoMedioPagoPrincipal =
    metodosAbonos.length > 0
      ? metodosAbonos.join(" / ")
      : (factura.metodoPagoPrincipal || factura.formaPago || "EFECTIVO").toUpperCase();

  const tarifaMoraDiariaOficial =
    safeNum(factura.tarifaMoraDiaria) > 0
      ? safeNum(factura.tarifaMoraDiaria)
      : ((factura.detalles || []).reduce(
          (acc, d) => acc + (safeNum(d.producto?.tarifaMoraDiaria) || 0),
          0
        ) || 3000);
  const recargoMora = esAlquiler ? safeNum(factura.recargoMoraAcumulado) : 0;
  const vueltasEntregadas = safeNum(factura.cambioEntregado);
  const efectivoRecibidoCliente = safeNum(factura.efectivoRecibido);

  const totalAlquilerConDeposito = totalOperacionPrincipal + montoDepositoEfectivo;
  const totalPagadoOperacionAlquiler = totalAbonado + (montoDepositoEfectivo > 0 ? montoDepositoEfectivo : 0);

  const abonoPrevioApartado =
    safeNum((factura as any).abonoPrevioApartado) > 0
      ? safeNum((factura as any).abonoPrevioApartado)
      : (Array.isArray(factura.abonos) && factura.abonos.length > 1
          ? factura.abonos.slice(1).reduce((acc: number, a: { monto?: number | string | null }) => acc + (safeNum(a.monto) || 0), 0)
          : 0);

  const efectivoRecibidoAlquiler =
    efectivoRecibidoCliente > 0 ? efectivoRecibidoCliente : totalPagadoOperacionAlquiler;

  const vueltasAlquiler =
    vueltasEntregadas > 0
      ? vueltasEntregadas
      : Math.max(0, efectivoRecibidoAlquiler - Math.max(0, totalPagadoOperacionAlquiler - abonoPrevioApartado));

  // 1. ENCABEZADO: LOGO + DATOS DE EMPRESA + RECUADRO DE FACTURA
  const ladoLogo = offsetY > 0 ? 19 : 21;
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, ladoLogo);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + ladoLogo + 3.5 : margenIzquierdo;

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(empresa.nombreComercial.toUpperCase(), textoEmpresaX, cursorY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
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
  const anchoCajaFactura = 68;
  const altoCajaFactura = 17;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 5 + offsetY;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(15, 23, 42); // Borde sobrio negro/slate
  doc.setLineWidth(0.4);
  doc.rect(xCajaFactura, yCajaFactura, anchoCajaFactura, altoCajaFactura, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  let tituloCajaSuperior = "FACTURA DE VENTA";
  if (esApartado) {
    tituloCajaSuperior = "FORMATO DE APARTADO";
  } else if (esAlquiler) {
    tituloCajaSuperior = esPazYSalvo
      ? "FACTURA / COMPROBANTE DE ALQUILER — PAGO COMPLETO"
      : "FACTURA / COMPROBANTE DE ALQUILER — SALDO PENDIENTE";
  } else if (esPazYSalvo) {
    tituloCajaSuperior = "FACTURA DE VENTA (PAZ Y SALVO)";
  }
  doc.text(tituloCajaSuperior, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 4, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 9.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tipoCopiaTexto.toUpperCase(), xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 14, { align: "center" });

  cursorY = Math.max(yDetalle + 2, yCajaFactura + altoCajaFactura + 2);

  // 2. SECCIÓN DE CLIENTE Y OPERACIÓN
  const altoFichaCliente = 16.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFichaCliente, "FD");

  // Columna Izquierda: Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const labelCliente = esAlquiler
    ? "CLIENTE / ARRENDATARIO:"
    : esApartado
    ? "CLIENTE / APARTANTE:"
    : "CLIENTE / ADQUIRIENTE:";
  doc.text(labelCliente, margenIzquierdo + 3, cursorY + 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const nombreCliente = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(nombreCliente.substring(0, 38), margenIzquierdo + 3, cursorY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const tipoDoc = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "CC");
  const docDv = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  const telSec = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
  const textoDocTel = `${tipoDoc}: ${factura.cliente.documento}${docDv}  |  Tel: ${factura.cliente.telefono || "N/A"}${telSec}`;
  doc.text(textoDocTel.substring(0, 52), margenIzquierdo + 3, cursorY + 11.8);

  if (factura.cliente.esResponsableIVA) {
    const infoFiscal = `Resp: ${factura.cliente.responsabilidadFiscal || "O-48"} | ${factura.cliente.email || ""}`.substring(0, 48);
    doc.text(infoFiscal, margenIzquierdo + 3, cursorY + 15);
  } else if (factura.cliente.direccion) {
    doc.text(`Dir: ${factura.cliente.direccion.substring(0, 48)}`, margenIzquierdo + 3, cursorY + 15);
  }

  // Columna Derecha: Operación & Fechas
  const xColOp = ANCHO_MEDIA_CARTA_MM / 2 + 8;
  const fechaTexto = new Date(factura.fechaCreacion).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DATOS DE LA OPERACIÓN:", xColOp, cursorY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha Emisión: ${fechaTexto}  |  Op: ${factura.tipoOperacion}`, xColOp, cursorY + 7.8);

  const cajeroTexto =
    empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre
      ? `Cajero: ${factura.usuarioCajero.nombre}`
      : "Caja Principal";
  doc.text(cajeroTexto, xColOp, cursorY + 11.4);

  if (esAlquiler) {
    const infoEstados = obtenerInfoEstadosAlquiler(factura);
    doc.setFont("helvetica", "bold");
    if (infoEstados.estaEnMora) {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(5, 150, 105);
    }
    const textoEntrega = infoEstados.textoTiempoYDevolucion;
    doc.text(textoEntrega.substring(0, 48), xColOp, cursorY + 15);
  }

  cursorY += altoFichaCliente + 2;

  // 3. TABLA DE ÍTEMS
  const altoCabecera = 5.2;
  doc.setFillColor(15, 23, 42);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 3, cursorY + 3.6);
  doc.text("TIPO", margenIzquierdo + 13, cursorY + 3.6);
  const labelColDescMC = esAlquiler
    ? "TIPO DE TRAJE / DETALLE"
    : esApartado
    ? "TIPO DE TRAJE / PRENDA"
    : "DESCRIPCIÓN DE LA PRENDA O SERVICIO";
  doc.text(labelColDescMC, margenIzquierdo + 28, cursorY + 3.6);
  doc.text("PRECIO UNIT.", margenDerecho - 36, cursorY + 3.6, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 3, cursorY + 3.6, { align: "right" });

  cursorY += altoCabecera;

  const maxItemsMediaCarta = Math.min(factura.detalles.length, 5);
  for (let i = 0; i < maxItemsMediaCarta; i++) {
    const det = factura.detalles[i];
    const altoFila = 4.8;
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoFila, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 5, cursorY + 3.4, { align: "center" });

    const tipoLabel = det.esServicioLibre
      ? "SERVICIO"
      : esAlquiler
      ? "ALQUILER"
      : esApartado
      ? "APARTADO"
      : "VENTA";
    doc.setFont("helvetica", "bold");
    doc.text(tipoLabel, margenIzquierdo + 13, cursorY + 3.4);

    doc.setFont("helvetica", "normal");
    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Arreglo de sastrería")
      : (det.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje"));
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    if (det.descripcionDetallada && det.descripcionDetallada.trim()) {
      desc = `${desc} [Det: ${det.descripcionDetallada.trim()}]`;
    }
    doc.text(desc.substring(0, 56), margenIzquierdo + 28, cursorY + 3.4);

    doc.text(formatCOP(det.precioUnitario), margenDerecho - 36, cursorY + 3.4, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatCOP(det.subtotal), margenDerecho - 3, cursorY + 3.4, { align: "right" });

    cursorY += altoFila;
  }

  // 4. RESUMEN CONTABLE, POLÍTICAS Y FIRMAS SEGÚN OPERACIÓN (ALQUILER / APARTADO / VENTA)
  if (esAlquiler) {
    cursorY += 1.5;
    const anchoCol = (margenDerecho - margenIzquierdo - 3) / 2;
    const altoBloque = 28;
    const xIzq = margenIzquierdo;
    const xDer = margenIzquierdo + anchoCol + 3;
    const yBloque = cursorY;

    // COLUMNA 1: DEPÓSITO EN GARANTÍA (EN CUSTODIA)
    doc.setFillColor(254, 252, 232); // Amber 50
    doc.setDrawColor(217, 119, 6);   // Amber 600
    doc.setLineWidth(0.3);
    doc.rect(xIzq, yBloque, anchoCol, altoBloque, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text("DEPÓSITO EN GARANTÍA (EN CUSTODIA)", xIzq + 2.5, yBloque + 3.8);
    doc.setDrawColor(217, 119, 6);
    doc.line(xIzq, yBloque + 5.2, xIzq + anchoCol, yBloque + 5.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("Depósito en Garantía:", xIzq + 2.5, yBloque + 9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(montoDepositoEfectivo), xIzq + anchoCol - 2.5, yBloque + 9.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(146, 64, 14);
    doc.text("Custodia: Dinero en garantía a devolver al entregar las prendas completas.", xIzq + 2.5, yBloque + 14);

    // Sub-recuadro Fecha Límite Entrega
    const ySub = yBloque + 17;
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(xIzq + 2, ySub, anchoCol - 4, 8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text("FECHA LÍMITE ENTREGA:", xIzq + 3.5, ySub + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    const devTexto = factura.fechaDevolucionPactada
      ? `${new Date(factura.fechaDevolucionPactada).toLocaleDateString("es-CO")} hasta 8:00 p.m. (20:00)`
      : "SEGÚN CONTRATO";
    doc.text(devTexto, xIzq + anchoCol - 3.5, ySub + 5, { align: "right" });

    // COLUMNA 2: TOTALES DE PAGO DE ALQUILER
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(148, 163, 184); // Slate 400
    doc.rect(xDer, yBloque, anchoCol, altoBloque, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTALES DE PAGO DE ALQUILER", xDer + 2.5, yBloque + 3.8);
    doc.setDrawColor(203, 213, 225);
    doc.line(xDer, yBloque + 5.2, xDer + anchoCol, yBloque + 5.2);

    let yTotAlq = yBloque + 8.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text("Total Valor Alquiler:", xDer + 2.5, yTotAlq);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(totalOperacionPrincipal), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });

    yTotAlq += 3.2;
    doc.setTextColor(71, 85, 105);
    doc.text("Depósito en Garantía:", xDer + 2.5, yTotAlq);
    doc.setTextColor(146, 64, 14);
    doc.text(formatCOP(montoDepositoEfectivo), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });

    // Franja resaltada Total (Alquiler + Depósito)
    yTotAlq += 3.4;
    doc.setFillColor(226, 232, 240); // Slate 200
    doc.rect(xDer + 1, yTotAlq - 2.5, anchoCol - 2, 4.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("Total (Alquiler + Depósito):", xDer + 2.5, yTotAlq + 0.6);
    doc.text(formatCOP(totalAlquilerConDeposito), xDer + anchoCol - 2.5, yTotAlq + 0.6, { align: "right" });

    if (abonoPrevioApartado > 0) {
      yTotAlq += 3.4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(67, 56, 202);
      doc.text("Abono Previo en Apartado:", xDer + 2.5, yTotAlq);
      doc.text(`-${formatCOP(abonoPrevioApartado)}`, xDer + anchoCol - 2.5, yTotAlq, { align: "right" });
    }

    yTotAlq += 3.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Recibido:", xDer + 2.5, yTotAlq);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(efectivoRecibidoAlquiler), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });

    yTotAlq += 3.1;
    doc.setTextColor(5, 150, 105);
    doc.text(`Valor Pagado (${textoMedioPagoPrincipal}):`, xDer + 2.5, yTotAlq);
    doc.text(formatCOP(totalPagadoOperacionAlquiler), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });

    yTotAlq += 3.1;
    doc.setTextColor(5, 150, 105);
    doc.text("Vueltas:", xDer + 2.5, yTotAlq);
    doc.text(formatCOP(vueltasAlquiler), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });

    if (saldoPendiente > 0) {
      yTotAlq += 3.2;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(225, 29, 72);
      doc.text("Falta por pagar:", xDer + 2.5, yTotAlq);
      doc.text(formatCOP(saldoPendiente), xDer + anchoCol - 2.5, yTotAlq, { align: "right" });
    }

    // BANNER OFICIAL DE OBSERVACIONES Y MORA (ANCHO COMPLETO)
    const yStrip = yBloque + altoBloque + 1.2;
    doc.setFillColor(254, 252, 232); // Amber 50
    doc.setDrawColor(217, 119, 6);   // Amber 600
    doc.rect(margenIzquierdo, yStrip, margenDerecho - margenIzquierdo, 5.8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(146, 64, 14);
    const obsMora = `OBSERVACIÓN: A partir del día siguiente de la fecha de entrega se descontará ${formatCOP(tarifaMoraDiariaOficial)} pesos por día de mora del depósito en garantía.`;
    doc.text(obsMora, (margenIzquierdo + margenDerecho) / 2, yStrip + 3.8, { align: "center" });

    // FIRMAS PARALELAS AL PIE DE PÁGINA
    const yFirmas = yStrip + 10.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    // Firma Cliente
    doc.line(margenIzquierdo + 15, yFirmas, margenIzquierdo + 80, yFirmas);
    doc.text("Firma y C.C. del Cliente", margenIzquierdo + 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text("(Acepto estado de prendas y condiciones)", margenIzquierdo + 47.5, yFirmas + 5.8, { align: "center" });

    // Firma Cajero
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 80, yFirmas, margenDerecho - 15, yFirmas);
    doc.text("Firma Vendedor / Cajero Responsable", margenDerecho - 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 47.5, yFirmas + 5.8, { align: "center" });

  } else if (esApartado) {
    cursorY += 1.5;
    const numCols = saldoPendienteTotalApartado > 0 ? 4 : 3;
    const gap = 2;
    const anchoCaja = (margenDerecho - margenIzquierdo - (numCols - 1) * gap) / numCols;
    const altoCaja = 13;
    const yCajas = cursorY;

    // Caja 1: Valor Alquiler
    let curX = margenIzquierdo;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text("1. VALOR ALQUILER", curX + anchoCaja / 2, yCajas + 3.5, { align: "center" });
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(totalOperacionPrincipal), curX + anchoCaja / 2, yCajas + 9, { align: "center" });

    // Caja 2: Saldo Depósito (Custodia)
    curX += anchoCaja + gap;
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(217, 119, 6);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(146, 64, 14);
    doc.text("2. SALDO DEPÓSITO", curX + anchoCaja / 2, yCajas + 3.5, { align: "center" });
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(formatCOP(saldoDepositoAlRetirar), curX + anchoCaja / 2, yCajas + 8.5, { align: "center" });
    doc.setFontSize(5);
    doc.text(depositoPagadoHoyApartado ? "Abonado hoy" : "Pagar al retirar", curX + anchoCaja / 2, yCajas + 11.2, { align: "center" });

    // Caja 3: Abono hoy
    curX += anchoCaja + gap;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(5, 150, 105);
    doc.text("3. ABONO (HOY)", curX + anchoCaja / 2, yCajas + 3.5, { align: "center" });
    doc.setFontSize(8.5);
    doc.text(`-${formatCOP(totalAbonado)}`, curX + anchoCaja / 2, yCajas + 9, { align: "center" });

    // Caja 4: Falta por pagar al retirar
    if (saldoPendienteTotalApartado > 0) {
      curX += anchoCaja + gap;
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(225, 29, 72);
      doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(190, 18, 60);
      doc.text("4. FALTA AL RETIRAR", curX + anchoCaja / 2, yCajas + 3.5, { align: "center" });
      doc.setFontSize(8.5);
      doc.text(formatCOP(saldoPendienteTotalApartado), curX + anchoCaja / 2, yCajas + 9, { align: "center" });
    }

    // Franja Leyenda Oficial Apartados
    const yStripAp = yCajas + altoCaja + 1.5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.rect(margenIzquierdo, yStripAp, margenDerecho - margenIzquierdo, 5.8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PLATA DE TRAJES APARTADOS NO SE DEVUELVEN", (margenIzquierdo + margenDerecho) / 2, yStripAp + 3.8, { align: "center" });

    // FIRMAS PARALELAS AL PIE DE PÁGINA
    const yFirmas = yStripAp + 10.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    // Firma Cliente
    doc.line(margenIzquierdo + 15, yFirmas, margenIzquierdo + 80, yFirmas);
    doc.text("Firma del Cliente", margenIzquierdo + 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`C.C. ${factura.cliente.documento || "____________________"}`, margenIzquierdo + 47.5, yFirmas + 5.8, { align: "center" });

    // Firma Cajero
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 80, yFirmas, margenDerecho - 15, yFirmas);
    doc.text("Cajero Responsable", margenDerecho - 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 47.5, yFirmas + 5.8, { align: "center" });

  } else {
    // Venta Comercial: Totales a la derecha, Franja de Políticas, Firmas paralelas
    cursorY += 1.5;
    const anchoTotVenta = 76;
    const xTotVenta = margenDerecho - anchoTotVenta;
    const altoTotVenta = 23;
    const yTotVenta = cursorY;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(xTotVenta, yTotVenta, anchoTotVenta, altoTotVenta, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTALES DE VENTA", xTotVenta + 2.5, yTotVenta + 3.8);
    doc.setDrawColor(203, 213, 225);
    doc.line(xTotVenta, yTotVenta + 5.2, margenDerecho, yTotVenta + 5.2);

    let yRowVenta = yTotVenta + 8.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Total Cobro de Venta:", xTotVenta + 2.5, yRowVenta);
    doc.text(formatCOP(totalOperacionPrincipal), margenDerecho - 2.5, yRowVenta, { align: "right" });

    yRowVenta += 3.6;
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105);
    doc.text(`Cobro Recibido (${textoMedioPagoPrincipal}):`, xTotVenta + 2.5, yRowVenta);
    doc.text(formatCOP(totalAbonado), margenDerecho - 2.5, yRowVenta, { align: "right" });

    if (vueltasEntregadas > 0 || efectivoRecibidoCliente > 0) {
      yRowVenta += 3.4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Efectivo Recibido Cliente:", xTotVenta + 2.5, yRowVenta);
      doc.text(formatCOP(efectivoRecibidoCliente > 0 ? efectivoRecibidoCliente : totalAbonado), margenDerecho - 2.5, yRowVenta, { align: "right" });
    }

    if (vueltasEntregadas > 0) {
      yRowVenta += 3.4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(5, 150, 105);
      doc.text("Vueltos / Cambio Final Entregado:", xTotVenta + 2.5, yRowVenta);
      doc.text(formatCOP(vueltasEntregadas), margenDerecho - 2.5, yRowVenta, { align: "right" });
    }

    if (saldoPendiente > 0) {
      yRowVenta += 3.4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(225, 29, 72);
      doc.text("Falta por pagar:", xTotVenta + 2.5, yRowVenta);
      doc.text(formatCOP(saldoPendiente), margenDerecho - 2.5, yRowVenta, { align: "right" });
    }

    // Franja de Normas y Políticas ancho completo
    const yPolVenta = yTotVenta + altoTotVenta + 1.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margenIzquierdo, yPolVenta, margenDerecho - margenIzquierdo, 5.8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(15, 23, 42);
    doc.text("NORMAS Y POLÍTICAS:", margenIzquierdo + 2, yPolVenta + 3.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    const textoPolVenta = "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.";
    doc.text(textoPolVenta, margenIzquierdo + 30, yPolVenta + 3.8);

    // FIRMAS PARALELAS AL PIE DE PÁGINA
    const yFirmas = yPolVenta + 10.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    // Firma Cliente
    doc.line(margenIzquierdo + 15, yFirmas, margenIzquierdo + 80, yFirmas);
    doc.text("Firma y C.C. del Cliente", margenIzquierdo + 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text("(Aceptación y recibido a conformidad)", margenIzquierdo + 47.5, yFirmas + 5.8, { align: "center" });

    // Firma Cajero
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 80, yFirmas, margenDerecho - 15, yFirmas);
    doc.text("Firma Vendedor / Cajero Responsable", margenDerecho - 47.5, yFirmas + 3.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 47.5, yFirmas + 5.8, { align: "center" });
  }

  // Pie de cortesía sin QR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  const pie = empresa.piePaginaFactura || "Sistema POS Local — Impreso sin códigos QR externos";
  const yPie = offsetY > 0 ? offsetY + 130 : ALTO_MEDIA_CARTA_MM - 3.5;
  doc.text(pie, ANCHO_MEDIA_CARTA_MM / 2, yPie, { align: "center" });
}

/**
 * Genera un documento PDF en una única hoja Carta Vertical (Letter Portrait)
 * con dos ejemplares completos de Media Carta apilados y línea central de corte.
 */
export function crearDocumentoPdfMediaCartaDoble(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 mm ancho x 279.4 mm alto
    compress: opciones.comprimir !== undefined ? opciones.comprimir : true,
  });

  // 1. Mitad Superior (Y = 4mm a ~134mm): EJEMPLAR 1: ORIGINAL CLIENTE
  dibujarPaginaMediaCarta(doc, datos, "EJEMPLAR 1: ORIGINAL CLIENTE", 4);

  // 2. Línea Central de Corte en Y = 139.7 mm (centro exacto de 279.4mm)
  const yCorte = 139.7;
  doc.setLineDashPattern([2.5, 2], 0);
  doc.setDrawColor(148, 163, 184); // Slate 400
  doc.setLineWidth(0.35);
  doc.line(8, yCorte, ANCHO_MEDIA_CARTA_MM - 8, yCorte);

  // Etiqueta central de corte sin emojis
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.rect(56, yCorte - 2.5, 104, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "-- CORTAR POR ESTA LÍNEA (2 MEDIAS CARTAS EN 1 HOJA) --",
    ANCHO_MEDIA_CARTA_MM / 2,
    yCorte + 0.9,
    { align: "center" }
  );
  doc.setLineDashPattern([], 0); // Restaurar línea sólida

  // 3. Mitad Inferior (Y = 143.5mm a ~274mm): EJEMPLAR 2: COPIA ARCHIVO / TIENDA
  dibujarPaginaMediaCarta(doc, datos, "EJEMPLAR 2: COPIA ARCHIVO / TIENDA", 143.5);

  // Garantizar 1 sola página estricta sin desborde
  if (doc.getNumberOfPages() > 1) {
    doc.deletePage(2);
  }

  return doc;
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
    compress: opciones.comprimir !== undefined ? opciones.comprimir : true,
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

  const saldoPendiente = safeNum(factura.saldoPendiente);
  const esAlquiler = factura.tipoOperacion === "ALQUILER";
  const esApartado = factura.tipoOperacion === "SEPARE" || factura.tipoOperacion === "APARTADO";
  const esVenta = !esAlquiler && !esApartado;
  const esPazYSalvo = saldoPendiente <= 0;
  const montoDepositoEfectivo = safeNum(factura.montoDeposito);
  const mostrarSeccionDeposito = esAlquiler; // En alquiler se destaca depósito, entrega y cobros adicionales

  const totalOperacionPrincipal = safeNum(factura.totalFactura);
  const totalAbonado = safeNum(factura.totalAbonado);
  const depositoPagadoHoyApartado = factura.estadoDeposito === "RECIBIDO_EN_GARANTIA";
  const saldoDepositoAlRetirar = depositoPagadoHoyApartado ? 0 : montoDepositoEfectivo;
  const saldoPendienteTotalApartado = Math.max(0, (totalOperacionPrincipal + saldoDepositoAlRetirar) - totalAbonado);

  const metodosAbonos = Array.from(
    new Set((factura.abonos || []).map((a) => (a.metodoPago || "EFECTIVO").toUpperCase()))
  );
  const textoMedioPagoPrincipal =
    metodosAbonos.length > 0
      ? metodosAbonos.join(" / ")
      : (factura.metodoPagoPrincipal || factura.formaPago || "EFECTIVO").toUpperCase();

  const tarifaMoraDiariaOficial =
    safeNum(factura.tarifaMoraDiaria) > 0
      ? safeNum(factura.tarifaMoraDiaria)
      : ((factura.detalles || []).reduce(
          (acc, d) => acc + (safeNum(d.producto?.tarifaMoraDiaria) || 0),
          0
        ) || 3000);
  const recargoMora = esAlquiler ? safeNum(factura.recargoMoraAcumulado) : 0;
  const vueltasEntregadas = safeNum(factura.cambioEntregado);
  const efectivoRecibidoCliente = safeNum(factura.efectivoRecibido);

  const totalAlquilerConDeposito = totalOperacionPrincipal + montoDepositoEfectivo;
  const totalPagadoOperacionAlquiler = totalAbonado + (montoDepositoEfectivo > 0 ? montoDepositoEfectivo : 0);

  const abonoPrevioApartado =
    safeNum((factura as any).abonoPrevioApartado) > 0
      ? safeNum((factura as any).abonoPrevioApartado)
      : (Array.isArray(factura.abonos) && factura.abonos.length > 1
          ? factura.abonos.slice(1).reduce((acc: number, a: { monto?: number | string | null }) => acc + (safeNum(a.monto) || 0), 0)
          : 0);

  const efectivoRecibidoAlquiler =
    efectivoRecibidoCliente > 0 ? efectivoRecibidoCliente : totalPagadoOperacionAlquiler;

  const vueltasAlquiler =
    vueltasEntregadas > 0
      ? vueltasEntregadas
      : Math.max(0, efectivoRecibidoAlquiler - Math.max(0, totalPagadoOperacionAlquiler - abonoPrevioApartado));

  // 1. ENCABEZADO: LOGO + DATOS FISCALES + RECUADRO DE FACTURA
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, margenIzquierdo, cursorY, 26);
  const textoEmpresaX = tieneLogo ? margenIzquierdo + 30 : margenIzquierdo;

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
    yDet += 3.8;
  }
  const reg = empresa.regimenFiscal ? `  |  ${empresa.regimenFiscal}` : "";
  doc.text(`NIT: ${empresa.nit}${reg}`, textoEmpresaX, yDet);
  yDet += 3.8;
  doc.text(`${empresa.direccion} — ${empresa.ciudad || "Villavicencio, Meta"}`, textoEmpresaX, yDet);
  yDet += 3.8;
  doc.text(`Teléfono / WhatsApp: ${empresa.telefono}${empresa.email ? ` | ${empresa.email}` : ""}`, textoEmpresaX, yDet);

  // Recuadro derecho de Factura
  const anchoCajaFactura = 78;
  const altoCajaFactura = 22;
  const xCajaFactura = margenDerecho - anchoCajaFactura;
  const yCajaFactura = 10;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(xCajaFactura, yCajaFactura, anchoCajaFactura, altoCajaFactura, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  if (esApartado) {
    doc.text("FORMATO DE APARTADO", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else if (esAlquiler) {
    const titAlq = esPazYSalvo
      ? "FACTURA / COMPROBANTE DE ALQUILER — PAGO COMPLETO"
      : `ALQUILER — SALDO PENDIENTE: ${formatCOP(saldoPendiente)}`;
    doc.text(titAlq, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else if (esPazYSalvo) {
    doc.text("FACTURA DE VENTA (PAZ Y SALVO)", xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  } else {
    doc.text(`COMPROBANTE DE VENTA — SALDO: ${formatCOP(saldoPendiente)}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${factura.numeroFactura}`, xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 12.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tipoCopiaTexto.toUpperCase(), xCajaFactura + anchoCajaFactura / 2, yCajaFactura + 18.5, { align: "center" });

  cursorY = Math.max(yDet + 3, yCajaFactura + altoCajaFactura + 3);

  // 2. BANNER DE ESTADO GENERAL DE LA OPERACIÓN (CARTA)
  if (esAlquiler) {
    const infoCarta = obtenerInfoEstadosAlquiler(factura);
    if (infoCarta.estaCerrada) {
      doc.setFillColor(5, 150, 105);
    } else {
      doc.setFillColor(15, 23, 42);
    }
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 9.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ORDEN: ${infoCarta.textoEstadoOrden}   |   FINANCIERO: ${infoCarta.textoEstadoFinanciero}`, anchoCartaMm / 2, cursorY + 4, { align: "center" });
    doc.setFontSize(6.8);
    doc.text(`PLAZO Y ENTREGA: ${infoCarta.textoTiempoYDevolucion}`, anchoCartaMm / 2, cursorY + 7.8, { align: "center" });
    cursorY += 12.5;
  } else if (esPazYSalvo) {
    doc.setFillColor(5, 150, 105);
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURA DE VENTA PAGADA AL 100% — PAZ Y SALVO — SALDO TOTAL: $0", anchoCartaMm / 2, cursorY + 5, { align: "center" });
    cursorY += 10.5;
  } else {
    doc.setFillColor(15, 23, 42);
    doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`VENTA CON SALDO PENDIENTE POR COBRAR — SALDO: ${formatCOP(saldoPendiente)}`, anchoCartaMm / 2, cursorY + 5, { align: "center" });
    cursorY += 10.5;
  }

  // 3. DATOS DE CLIENTE Y DETALLES
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, 24, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const labelClienteCarta = esAlquiler
    ? "CLIENTE / ARRENDATARIO:"
    : esApartado
    ? "CLIENTE / APARTANTE:"
    : "CLIENTE / ADQUIRIENTE:";
  doc.text(labelClienteCarta, margenIzquierdo + 4, cursorY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const nomCarta = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  doc.text(nomCarta, margenIzquierdo + 4, cursorY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
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
  doc.setFontSize(8.5);
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
  const altoCabecera = 6.8;
  doc.setFillColor(30, 41, 59);
  doc.rect(margenIzquierdo, cursorY, margenDerecho - margenIzquierdo, altoCabecera, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT", margenIzquierdo + 4, cursorY + 4.8);
  doc.text("TIPO", margenIzquierdo + 18, cursorY + 4.8);
  const labelColCarta = esAlquiler
    ? "TIPO DE TRAJE / DETALLE"
    : esApartado
    ? "TIPO DE TRAJE / PRENDA"
    : "DESCRIPCIÓN DE LA PRENDA O SERVICIO";
  doc.text(labelColCarta, margenIzquierdo + 38, cursorY + 4.8);
  doc.text("VALOR UNIT.", margenDerecho - 46, cursorY + 4.8, { align: "right" });
  doc.text("SUBTOTAL", margenDerecho - 4, cursorY + 4.8, { align: "right" });

  cursorY += altoCabecera;

  const maxItemsCarta = Math.min(factura.detalles.length, 10);
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
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(det.cantidad), margenIzquierdo + 7, cursorY + 4.3, { align: "center" });

    const tipoDet = det.esServicioLibre
      ? "SERVICIO"
      : esAlquiler
      ? "ALQUILER"
      : esApartado
      ? "APARTADO"
      : "VENTA";
    doc.setFont("helvetica", "bold");
    doc.text(tipoDet, margenIzquierdo + 18, cursorY + 4.3);

    doc.setFont("helvetica", "normal");
    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio de Sastrería")
      : (det.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje"));
    if (det.producto?.codigo) desc = `[${det.producto.codigo}] ${desc}`;
    if (det.descripcionDetallada && det.descripcionDetallada.trim()) {
      desc = `${desc} [Detalle: ${det.descripcionDetallada.trim()}]`;
    }
    doc.text(desc.substring(0, 68), margenIzquierdo + 38, cursorY + 4.3);

    doc.text(formatCOP(det.precioUnitario), margenDerecho - 46, cursorY + 4.3, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatCOP(det.subtotal), margenDerecho - 4, cursorY + 4.5, { align: "right" });

    cursorY += altoFila;
  }

  // 5. RESUMEN CONTABLE, POLÍTICAS Y FIRMAS SEGÚN OPERACIÓN (CARTA COMPLETA)
  if (esAlquiler) {
    cursorY += 3;
    const anchoCol = (margenDerecho - margenIzquierdo - 5) / 2;
    const altoBloque = 36;
    const xIzq = margenIzquierdo;
    const xDer = margenIzquierdo + anchoCol + 5;
    const yBloque = cursorY;

    // COLUMNA 1: DEPÓSITO EN GARANTÍA (EN CUSTODIA)
    doc.setFillColor(254, 252, 232); // Amber 50
    doc.setDrawColor(217, 119, 6);   // Amber 600
    doc.setLineWidth(0.3);
    doc.rect(xIzq, yBloque, anchoCol, altoBloque, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text("DEPÓSITO EN GARANTÍA (EN CUSTODIA)", xIzq + 3.5, yBloque + 4.8);
    doc.setDrawColor(217, 119, 6);
    doc.line(xIzq, yBloque + 6.5, xIzq + anchoCol, yBloque + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text("Depósito en Garantía:", xIzq + 3.5, yBloque + 12);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(montoDepositoEfectivo), xIzq + anchoCol - 3.5, yBloque + 12, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(146, 64, 14);
    doc.text("Custodia: Dinero en garantía a devolver al entregar las prendas completas.", xIzq + 3.5, yBloque + 18);

    // Sub-recuadro Fecha Límite Entrega
    const ySub = yBloque + 22;
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(xIzq + 2.5, ySub, anchoCol - 5, 10, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("FECHA LÍMITE ENTREGA:", xIzq + 4.5, ySub + 6.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    const devTexto = factura.fechaDevolucionPactada
      ? `${new Date(factura.fechaDevolucionPactada).toLocaleDateString("es-CO")} hasta 8:00 p.m. (20:00)`
      : "SEGÚN CONTRATO";
    doc.text(devTexto, xIzq + anchoCol - 4.5, ySub + 6.2, { align: "right" });

    // COLUMNA 2: TOTALES DE PAGO DE ALQUILER
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(148, 163, 184); // Slate 400
    doc.rect(xDer, yBloque, anchoCol, altoBloque, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTALES DE PAGO DE ALQUILER", xDer + 3.5, yBloque + 4.8);
    doc.setDrawColor(203, 213, 225);
    doc.line(xDer, yBloque + 6.5, xDer + anchoCol, yBloque + 6.5);

    let yTotAlq = yBloque + 11.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Total Valor Alquiler:", xDer + 3.5, yTotAlq);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(totalOperacionPrincipal), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });

    yTotAlq += 4;
    doc.setTextColor(71, 85, 105);
    doc.text("Depósito en Garantía:", xDer + 3.5, yTotAlq);
    doc.setTextColor(146, 64, 14);
    doc.text(formatCOP(montoDepositoEfectivo), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });

    // Franja resaltada Total (Alquiler + Depósito)
    yTotAlq += 4.2;
    doc.setFillColor(226, 232, 240); // Slate 200
    doc.rect(xDer + 1.5, yTotAlq - 3.2, anchoCol - 3, 5.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("Total (Alquiler + Depósito):", xDer + 3.5, yTotAlq + 0.6);
    doc.text(formatCOP(totalAlquilerConDeposito), xDer + anchoCol - 3.5, yTotAlq + 0.6, { align: "right" });

    if (abonoPrevioApartado > 0) {
      yTotAlq += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(67, 56, 202);
      doc.text("Abono Previo en Apartado:", xDer + 3.5, yTotAlq);
      doc.text(`-${formatCOP(abonoPrevioApartado)}`, xDer + anchoCol - 3.5, yTotAlq, { align: "right" });
    }

    yTotAlq += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text("Recibido:", xDer + 3.5, yTotAlq);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(efectivoRecibidoAlquiler), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });

    yTotAlq += 3.8;
    doc.setTextColor(5, 150, 105);
    doc.text(`Valor Pagado (${textoMedioPagoPrincipal}):`, xDer + 3.5, yTotAlq);
    doc.text(formatCOP(totalPagadoOperacionAlquiler), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });

    yTotAlq += 3.8;
    doc.setTextColor(5, 150, 105);
    doc.text("Vueltas:", xDer + 3.5, yTotAlq);
    doc.text(formatCOP(vueltasAlquiler), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });

    if (saldoPendiente > 0) {
      yTotAlq += 4;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(225, 29, 72);
      doc.text("Falta por pagar:", xDer + 3.5, yTotAlq);
      doc.text(formatCOP(saldoPendiente), xDer + anchoCol - 3.5, yTotAlq, { align: "right" });
    }

    // BANNER OBSERVACIONES Y MORA
    const yStrip = yBloque + altoBloque + 2;
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(217, 119, 6);
    doc.rect(margenIzquierdo, yStrip, margenDerecho - margenIzquierdo, 7.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(146, 64, 14);
    const obsMora = `OBSERVACIÓN: A partir del día siguiente de la fecha de entrega se descontará ${formatCOP(tarifaMoraDiariaOficial)} pesos por día de mora del depósito en garantía.`;
    doc.text(obsMora, (margenIzquierdo + margenDerecho) / 2, yStrip + 4.8, { align: "center" });

    // FIRMAS PARALELAS
    const yFirmas = yStrip + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    doc.line(margenIzquierdo + 20, yFirmas, margenIzquierdo + 95, yFirmas);
    doc.text("Firma y C.C. del Cliente", margenIzquierdo + 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("(Acepto estado de prendas y condiciones)", margenIzquierdo + 57.5, yFirmas + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 95, yFirmas, margenDerecho - 20, yFirmas);
    doc.text("Firma Vendedor / Cajero Responsable", margenDerecho - 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 57.5, yFirmas + 7.5, { align: "center" });

  } else if (esApartado) {
    cursorY += 3;
    const numCols = saldoPendienteTotalApartado > 0 ? 4 : 3;
    const gap = 3;
    const anchoCaja = (margenDerecho - margenIzquierdo - (numCols - 1) * gap) / numCols;
    const altoCaja = 16;
    const yCajas = cursorY;

    // Caja 1: Valor Alquiler
    let curX = margenIzquierdo;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text("1. VALOR ALQUILER", curX + anchoCaja / 2, yCajas + 4.5, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCOP(totalOperacionPrincipal), curX + anchoCaja / 2, yCajas + 11.5, { align: "center" });

    // Caja 2: Saldo Depósito (Custodia)
    curX += anchoCaja + gap;
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(217, 119, 6);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(146, 64, 14);
    doc.text("2. SALDO DEPÓSITO", curX + anchoCaja / 2, yCajas + 4.5, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text(formatCOP(saldoDepositoAlRetirar), curX + anchoCaja / 2, yCajas + 10.5, { align: "center" });
    doc.setFontSize(6);
    doc.text(depositoPagadoHoyApartado ? "Abonado hoy" : "Pagar al retirar", curX + anchoCaja / 2, yCajas + 14, { align: "center" });

    // Caja 3: Abono hoy
    curX += anchoCaja + gap;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(5, 150, 105);
    doc.text("3. ABONO (HOY)", curX + anchoCaja / 2, yCajas + 4.5, { align: "center" });
    doc.setFontSize(10);
    doc.text(`-${formatCOP(totalAbonado)}`, curX + anchoCaja / 2, yCajas + 11.5, { align: "center" });

    // Caja 4: Falta por pagar al retirar
    if (saldoPendienteTotalApartado > 0) {
      curX += anchoCaja + gap;
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(225, 29, 72);
      doc.rect(curX, yCajas, anchoCaja, altoCaja, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(190, 18, 60);
      doc.text("4. FALTA AL RETIRAR", curX + anchoCaja / 2, yCajas + 4.5, { align: "center" });
      doc.setFontSize(10);
      doc.text(formatCOP(saldoPendienteTotalApartado), curX + anchoCaja / 2, yCajas + 11.5, { align: "center" });
    }

    // Franja Leyenda Oficial Apartados
    const yStripAp = yCajas + altoCaja + 2;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.rect(margenIzquierdo, yStripAp, margenDerecho - margenIzquierdo, 7.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PLATA DE TRAJES APARTADOS NO SE DEVUELVEN", (margenIzquierdo + margenDerecho) / 2, yStripAp + 4.8, { align: "center" });

    // FIRMAS PARALELAS
    const yFirmas = yStripAp + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    doc.line(margenIzquierdo + 20, yFirmas, margenIzquierdo + 95, yFirmas);
    doc.text("Firma del Cliente", margenIzquierdo + 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`C.C. ${factura.cliente.documento || "____________________"}`, margenIzquierdo + 57.5, yFirmas + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 95, yFirmas, margenDerecho - 20, yFirmas);
    doc.text("Cajero Responsable", margenDerecho - 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 57.5, yFirmas + 7.5, { align: "center" });

  } else {
    // Venta Comercial Carta
    cursorY += 3;
    const anchoTotVenta = 90;
    const xTotVenta = margenDerecho - anchoTotVenta;
    const altoTotVenta = 28;
    const yTotVenta = cursorY;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(xTotVenta, yTotVenta, anchoTotVenta, altoTotVenta, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTALES DE VENTA", xTotVenta + 3.5, yTotVenta + 4.8);
    doc.setDrawColor(203, 213, 225);
    doc.line(xTotVenta, yTotVenta + 6.5, margenDerecho, yTotVenta + 6.5);

    let yRowVenta = yTotVenta + 11.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Total Cobro de Venta:", xTotVenta + 3.5, yRowVenta);
    doc.text(formatCOP(totalOperacionPrincipal), margenDerecho - 3.5, yRowVenta, { align: "right" });

    yRowVenta += 4.5;
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(`Cobro Recibido (${textoMedioPagoPrincipal}):`, xTotVenta + 3.5, yRowVenta);
    doc.text(formatCOP(totalAbonado), margenDerecho - 3.5, yRowVenta, { align: "right" });

    if (vueltasEntregadas > 0 || efectivoRecibidoCliente > 0) {
      yRowVenta += 4.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Efectivo Recibido Cliente:", xTotVenta + 3.5, yRowVenta);
      doc.text(formatCOP(efectivoRecibidoCliente > 0 ? efectivoRecibidoCliente : totalAbonado), margenDerecho - 3.5, yRowVenta, { align: "right" });
    }

    if (vueltasEntregadas > 0) {
      yRowVenta += 4.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      doc.text("Vueltos / Cambio Final Entregado:", xTotVenta + 3.5, yRowVenta);
      doc.text(formatCOP(vueltasEntregadas), margenDerecho - 3.5, yRowVenta, { align: "right" });
    }

    if (saldoPendiente > 0) {
      yRowVenta += 4.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72);
      doc.text("Falta por pagar:", xTotVenta + 3.5, yRowVenta);
      doc.text(formatCOP(saldoPendiente), margenDerecho - 3.5, yRowVenta, { align: "right" });
    }

    // Franja de Normas y Políticas ancho completo
    const yPolVenta = yTotVenta + altoTotVenta + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margenIzquierdo, yPolVenta, margenDerecho - margenIzquierdo, 7.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("NORMAS Y POLÍTICAS:", margenIzquierdo + 3, yPolVenta + 4.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const textoPolVenta = "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.";
    doc.text(textoPolVenta, margenIzquierdo + 40, yPolVenta + 4.8);

    // FIRMAS PARALELAS AL PIE DE PÁGINA
    const yFirmas = yPolVenta + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);

    doc.line(margenIzquierdo + 20, yFirmas, margenIzquierdo + 95, yFirmas);
    doc.text("Firma y C.C. del Cliente", margenIzquierdo + 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("(Aceptación y recibido a conformidad)", margenIzquierdo + 57.5, yFirmas + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.line(margenDerecho - 95, yFirmas, margenDerecho - 20, yFirmas);
    doc.text("Firma Vendedor / Cajero Responsable", margenDerecho - 57.5, yFirmas + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(factura.usuarioCajero?.nombre || "Atención en Mostrador", margenDerecho - 57.5, yFirmas + 7.5, { align: "center" });
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
    compress: opciones.comprimir !== undefined ? opciones.comprimir : true,
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
 * Dibuja un ejemplar de tirilla térmica (80mm o 58mm) en el lienzo con proporciones vectoriales exactas
 */
function dibujarContenidoTirilla(
  doc: jsPDF,
  datos: DatosImpresionFactura,
  startY: number,
  tipoCopiaTexto: string,
  anchoMm: number = 80
): number {
  const { factura, empresa } = datos;
  const es58 = anchoMm <= 60;
  const margen = es58 ? 2.5 : 4;
  const margenDer = anchoMm - margen;
  const saldoPendiente = safeNum(factura.saldoPendiente);
  const esAlquiler = factura.tipoOperacion === "ALQUILER";
  const esApartado = factura.tipoOperacion === "SEPARE" || factura.tipoOperacion === "APARTADO";
  const esVenta = !esAlquiler && !esApartado;
  const esPazYSalvo = saldoPendiente <= 0;
  const montoDepositoEfectivo = safeNum(factura.montoDeposito);
  const mostrarSeccionDeposito = esAlquiler; // En alquiler se destaca depósito, entrega y cobros adicionales

  const totalOperacionPrincipal = safeNum(factura.totalFactura);
  const totalAbonado = safeNum(factura.totalAbonado);
  const depositoPagadoHoyApartado = factura.estadoDeposito === "RECIBIDO_EN_GARANTIA";
  const saldoDepositoAlRetirar = depositoPagadoHoyApartado ? 0 : montoDepositoEfectivo;
  const saldoPendienteTotalApartado = Math.max(0, (totalOperacionPrincipal + saldoDepositoAlRetirar) - totalAbonado);

  const metodosAbonos = Array.from(
    new Set((factura.abonos || []).map((a) => (a.metodoPago || "EFECTIVO").toUpperCase()))
  );
  const textoMedioPagoPrincipal =
    metodosAbonos.length > 0
      ? metodosAbonos.join(" / ")
      : (factura.metodoPagoPrincipal || factura.formaPago || "EFECTIVO").toUpperCase();

  const tarifaMoraDiariaOficial =
    safeNum(factura.tarifaMoraDiaria) > 0
      ? safeNum(factura.tarifaMoraDiaria)
      : ((factura.detalles || []).reduce(
          (acc, d) => acc + (safeNum(d.producto?.tarifaMoraDiaria) || 0),
          0
        ) || 3000);
  const recargoMora = esAlquiler ? safeNum(factura.recargoMoraAcumulado) : 0;
  const vueltasEntregadas = safeNum(factura.cambioEntregado);
  const efectivoRecibidoCliente = safeNum(factura.efectivoRecibido);

  const totalAlquilerConDeposito = totalOperacionPrincipal + montoDepositoEfectivo;
  const totalPagadoOperacionAlquiler = totalAbonado + (montoDepositoEfectivo > 0 ? montoDepositoEfectivo : 0);

  const abonoPrevioApartado =
    safeNum((factura as any).abonoPrevioApartado) > 0
      ? safeNum((factura as any).abonoPrevioApartado)
      : (Array.isArray(factura.abonos) && factura.abonos.length > 1
          ? factura.abonos.slice(1).reduce((acc: number, a: { monto?: number | string | null }) => acc + (safeNum(a.monto) || 0), 0)
          : 0);

  const efectivoRecibidoAlquiler =
    efectivoRecibidoCliente > 0 ? efectivoRecibidoCliente : totalPagadoOperacionAlquiler;

  const vueltasAlquiler =
    vueltasEntregadas > 0
      ? vueltasEntregadas
      : Math.max(0, efectivoRecibidoAlquiler - Math.max(0, totalPagadoOperacionAlquiler - abonoPrevioApartado));
  let cursorY = startY;

  // Logo centrado si existe (recuadro cuadrado sin estirar)
  const ladoLogo = es58 ? 16 : 22;
  const tieneLogo = insertarLogoSeguro(doc, empresa.logoUrl, (anchoMm - ladoLogo) / 2, cursorY, ladoLogo);
  if (tieneLogo) {
    cursorY += ladoLogo + 2;
  }

  // Cabecera Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(es58 ? 9.5 : 11);
  doc.setTextColor(0, 0, 0);
  doc.text(empresa.nombreComercial.toUpperCase(), anchoMm / 2, cursorY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(es58 ? 6.5 : 7.5);
  if (empresa.eslogan) {
    cursorY += es58 ? 3 : 3.5;
    doc.text(empresa.eslogan, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += es58 ? 3 : 3.5;
  doc.text(`NIT: ${empresa.nit}`, anchoMm / 2, cursorY, { align: "center" });
  if (empresa.regimenFiscal) {
    cursorY += es58 ? 2.6 : 3;
    doc.text(empresa.regimenFiscal, anchoMm / 2, cursorY, { align: "center" });
  }
  cursorY += es58 ? 2.6 : 3;
  doc.text(empresa.direccion, anchoMm / 2, cursorY, { align: "center" });
  cursorY += es58 ? 2.6 : 3;
  doc.text(`Tel: ${empresa.telefono}`, anchoMm / 2, cursorY, { align: "center" });
  cursorY += es58 ? 3 : 3.5;
  doc.setFont("helvetica", "bold");
  doc.text(`** ${tipoCopiaTexto} **`, anchoMm / 2, cursorY, { align: "center" });

  cursorY += 3.5;
  doc.setLineWidth(0.2);
  doc.line(margen, cursorY, margenDer, cursorY);

  // Datos Factura / Contrato
  cursorY += 3.8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  let tituloTirilla = "FACTURA DE VENTA:";
  if (esApartado) {
    tituloTirilla = "FORMATO APARTADO:";
  } else if (esAlquiler) {
    if (factura.estado === "CERRADA") {
      tituloTirilla = "CERTIFICADO PAZ Y SALVO ALQUILER:";
    } else if (esPazYSalvo) {
      tituloTirilla = "FACTURA ALQUILER (PAGO COMPLETO):";
    } else {
      tituloTirilla = "COMPROBANTE ALQUILER (CON SALDO):";
    }
  } else if (esPazYSalvo) {
    tituloTirilla = "FACTURA DE VENTA (PAZ Y SALVO):";
  } else {
    tituloTirilla = "COMPROBANTE DE VENTA (CON SALDO):";
  }
  doc.text(`${tituloTirilla} ${factura.numeroFactura}`, margen, cursorY);

  cursorY += 3.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(`Fecha: ${new Date(factura.fechaCreacion).toLocaleString("es-CO")}`, margen, cursorY);

  if (empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre) {
    cursorY += 3;
    doc.text(`Cajero: ${factura.usuarioCajero.nombre}`, margen, cursorY);
  }

  cursorY += 3;
  const nomTirilla = (factura.cliente.esResponsableIVA && factura.cliente.razonSocial
    ? factura.cliente.razonSocial
    : factura.cliente.nombre).toUpperCase();
  const labelCliTir = esAlquiler ? "Arrendatario" : esApartado ? "Apartante" : "Cliente";
  doc.text(`${labelCliTir}: ${nomTirilla.substring(0, 26)}`, margen, cursorY);

  cursorY += 3;
  const tipoTirilla = factura.cliente.tipoIdentificacion || (factura.cliente.esResponsableIVA ? "NIT" : "Doc");
  const dvTirilla = factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : "";
  doc.text(`${tipoTirilla}: ${factura.cliente.documento}${dvTirilla}`, margen, cursorY);

  if (factura.cliente.telefono) {
    cursorY += 3;
    const telSecTirilla = factura.cliente.telefonoSecundario ? ` | 2°: ${factura.cliente.telefonoSecundario}` : "";
    doc.text(`Tel: ${factura.cliente.telefono}${telSecTirilla}`, margen, cursorY);
  }

  // Fechas y Estados de Alquiler en Tirilla (EXCLUSIVO DE ALQUILER)
  if (esAlquiler) {
    const infoTir = obtenerInfoEstadosAlquiler(factura);
    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.text(`ORDEN: ${infoTir.textoEstadoOrden}`, margen, cursorY);
    cursorY += 3;
    doc.text(`FINANCIERO: ${infoTir.textoEstadoFinanciero}`, margen, cursorY);
    cursorY += 3;
    doc.setFont("helvetica", "normal");
    doc.text(`Salida: ${new Date(factura.fechaEntregaAlquiler || factura.fechaCreacion).toLocaleDateString("es-CO")}`, margen, cursorY);
    cursorY += 3;
    doc.setFont("helvetica", "bold");
    if (infoTir.estaEnMora) {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(`Llegada: ${infoTir.textoTiempoYDevolucion.substring(0, 38)}`, margen, cursorY);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  cursorY += 3.5;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Tabla ítems
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  const labelTirCol = esAlquiler ? "CANT  TIPO DE TRAJE / DETALLE" : "CANT  DESCRIPCIÓN";
  doc.text(labelTirCol, margen, cursorY);
  doc.text("TOTAL", margenDer, cursorY, { align: "right" });

  cursorY += 3;
  factura.detalles.forEach((det) => {
    doc.setFont("helvetica", "normal");
    let desc = det.esServicioLibre
      ? (det.descripcionLibre || "Servicio")
      : (det.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje"));
    doc.text(`${det.cantidad}x ${desc.substring(0, 26)}`, margen, cursorY);
    doc.setFont("helvetica", "bold");
    doc.text(formatCOP(det.subtotal), margenDer, cursorY, { align: "right" });
    cursorY += 3.2;

    if (det.descripcionDetallada && det.descripcionDetallada.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`[Det: ${det.descripcionDetallada.trim().substring(0, 32)}]`, margen + 4, cursorY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.2);
      cursorY += 2.8;
    }
  });

  cursorY += 1.8;
  doc.line(margen, cursorY, margenDer, cursorY);

  // Bloques Contables Segregados: Alquiler (Garantía + Totales) vs Apartado (4 conceptos) vs Venta
  if (esApartado) {
    // 4 Conceptos de Apartados en orden estricto
    cursorY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("1. Valor Alquiler:", margen, cursorY);
    doc.text(formatCOP(totalOperacionPrincipal), margenDer, cursorY, { align: "right" });

    cursorY += 3.2;
    doc.text("2. Saldo Depósito (Custodia):", margen, cursorY);
    doc.text(formatCOP(saldoDepositoAlRetirar), margenDer, cursorY, { align: "right" });

    cursorY += 3.2;
    doc.text("3. Abono (Consigna hoy):", margen, cursorY);
    doc.text(`-${formatCOP(totalAbonado)}`, margenDer, cursorY, { align: "right" });

    if (saldoPendienteTotalApartado > 0) {
      cursorY += 3.6;
      doc.setFontSize(8);
      doc.text("FALTA POR PAGAR AL RETIRAR:", margen, cursorY);
      doc.text(formatCOP(saldoPendienteTotalApartado), margenDer, cursorY, { align: "right" });
    }
  } else if (esAlquiler) {
    // RECUADRO LIMPIO DE DEPÓSITO EN GARANTÍA (CUSTODIA) Y ENTREGA
    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.text("DEPÓSITO EN GARANTÍA (EN CUSTODIA):", margen, cursorY);

    cursorY += 3;
    doc.text(`• Depósito en Garantía: ${formatCOP(montoDepositoEfectivo)}`, margen, cursorY);

    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    const devTextoTir = factura.fechaDevolucionPactada
      ? `• FECHA LÍMITE DE ENTREGA: ${new Date(factura.fechaDevolucionPactada).toLocaleDateString("es-CO")} hasta 8:00 p.m. (20:00)`
      : "• FECHA LÍMITE DE ENTREGA: SEGÚN CONTRATO";
    doc.text(devTextoTir, margen, cursorY);
    doc.setTextColor(0, 0, 0);

    cursorY += 2.8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text("• Custodia reembolsable al entregar prendas completas y sin daños", margen, cursorY);

    cursorY += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(146, 64, 14);
    doc.text(`OBSERVACIÓN: Se descontará ${formatCOP(tarifaMoraDiariaOficial)}/día de mora del depósito.`, margen, cursorY);
    doc.setTextColor(0, 0, 0);

    cursorY += 2;
    doc.line(margen, cursorY, margenDer, cursorY);

    // TOTALES DE PAGO DE ALQUILER
    cursorY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("TOTAL VALOR ALQUILER:", margen, cursorY);
    doc.text(formatCOP(totalOperacionPrincipal), margenDer, cursorY, { align: "right" });

    cursorY += 3.2;
    doc.text("DEPÓSITO EN GARANTÍA:", margen, cursorY);
    doc.text(formatCOP(montoDepositoEfectivo), margenDer, cursorY, { align: "right" });

    cursorY += 3.6;
    doc.setFontSize(8);
    doc.text("TOTAL (ALQUILER + DEPÓSITO):", margen, cursorY);
    doc.text(formatCOP(totalAlquilerConDeposito), margenDer, cursorY, { align: "right" });

    if (abonoPrevioApartado > 0) {
      cursorY += 3.2;
      doc.setFontSize(7.2);
      doc.text("ABONO PREVIO APARTADO:", margen, cursorY);
      doc.text(`-${formatCOP(abonoPrevioApartado)}`, margenDer, cursorY, { align: "right" });
    }

    // 5. RECIBIDO (Anterior a Valor Pagado)
    cursorY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("RECIBIDO:", margen, cursorY);
    doc.text(formatCOP(efectivoRecibidoAlquiler), margenDer, cursorY, { align: "right" });

    // 6. VALOR PAGADO (Suma alquiler + depósito)
    cursorY += 3.4;
    doc.setFontSize(7.5);
    const labelPagTir = `VALOR PAGADO (${textoMedioPagoPrincipal}):`;
    doc.text(labelPagTir.substring(0, 26), margen, cursorY);
    doc.text(formatCOP(totalPagadoOperacionAlquiler), margenDer, cursorY, { align: "right" });

    // 7. VUELTAS
    cursorY += 3.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("VUELTAS:", margen, cursorY);
    doc.text(formatCOP(vueltasAlquiler), margenDer, cursorY, { align: "right" });

    if (saldoPendiente > 0) {
      cursorY += 3.5;
      doc.setFontSize(8.2);
      doc.text("FALTA POR PAGAR:", margen, cursorY);
      doc.text(formatCOP(saldoPendiente), margenDer, cursorY, { align: "right" });
    }
  } else {
    // Venta Comercial: Cero Sección A y B, Totales directos
    cursorY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL VENTA:", margen, cursorY);
    doc.text(formatCOP(totalOperacionPrincipal), margenDer, cursorY, { align: "right" });

    cursorY += 3.2;
    const labelCobTir = `COBRO RECIBIDO (${textoMedioPagoPrincipal}):`;
    doc.text(labelCobTir.substring(0, 26), margen, cursorY);
    doc.text(formatCOP(totalAbonado), margenDer, cursorY, { align: "right" });

    if (vueltasEntregadas > 0) {
      cursorY += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.text("Vueltos / Cambio Final:", margen, cursorY);
      doc.text(formatCOP(vueltasEntregadas), margenDer, cursorY, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
    }

    if (saldoPendiente > 0) {
      cursorY += 3.5;
      doc.setFontSize(8.2);
      doc.text("FALTA POR PAGAR:", margen, cursorY);
      doc.text(formatCOP(saldoPendiente), margenDer, cursorY, { align: "right" });
    }
  }

  // Políticas segregadas en Tirilla (Omitidas estrictamente en Alquiler por regla de negocio)
  if (!esAlquiler) {
    cursorY += 3.5;
    if (esApartado) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(185, 28, 28);
      doc.text("PLATA DE TRAJES APARTADOS NO SE DEVUELVEN", anchoMm / 2, cursorY, { align: "center" });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      const textoPolTir = "Gracias por su compra. Conserve esta factura para reclamos según políticas de garantía.";
      const lineasPolTir = doc.splitTextToSize(textoPolTir, anchoMm - 8);
      doc.text(lineasPolTir.slice(0, 2), anchoMm / 2, cursorY, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }
  }

  // Firmas en Tirilla
  cursorY += 5;
  doc.setLineWidth(0.2);
  doc.line(margen + 2, cursorY, margen + 34, cursorY);
  doc.line(margenDer - 34, cursorY, margenDer - 2, cursorY);
  cursorY += 2.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Firma Cajero", margen + 8, cursorY);
  doc.text("Firma Cliente", margenDer - 26, cursorY);

  // Pie
  cursorY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("¡GRACIAS POR SU PREFERENCIA!", anchoMm / 2, cursorY, { align: "center" });
  cursorY += 3;
  doc.text(empresa.piePaginaFactura || "Sistema POS Local — Cero QR", anchoMm / 2, cursorY, { align: "center" });

  return cursorY + 4;
}

/**
 * Genera una instancia vectorial de jsPDF en formato POS Tirilla Térmica (80mm o 58mm)
 */
export function crearDocumentoPdfTirilla(
  datos: DatosImpresionFactura,
  opciones: OpcionesPdfMediaCarta = {},
  anchoMm: number = 80
): jsPDF {
  const es58 = anchoMm <= 60;
  const altoBaseMm = Math.max(160, (es58 ? 120 : 110) + datos.factura.detalles.length * 8 + (datos.factura.abonos?.length || 0) * 7);
  const numCopias = opciones.numCopias || 1;
  const altoTotalMm = numCopias === 2 ? altoBaseMm * 2 + 15 : altoBaseMm;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [anchoMm, altoTotalMm],
    compress: opciones.comprimir !== undefined ? opciones.comprimir : true,
  });

  if (numCopias === 2) {
    const yFin1 = dibujarContenidoTirilla(doc, datos, 4, "EJEMPLAR 1: COPIA CLIENTE", anchoMm);

    // Línea de corte
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(anchoMm * 0.05, yFin1 + 3, anchoMm * 0.95, yFin1 + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(es58 ? 5.5 : 6);
    doc.text("- - - - - CORTE DE COPIA - - - - -", anchoMm / 2, yFin1 + 6, { align: "center" });
    doc.setLineDashPattern([], 0);

    dibujarContenidoTirilla(doc, datos, yFin1 + 10, "EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO", anchoMm);
  } else {
    dibujarContenidoTirilla(doc, datos, 4, opciones.tipoCopia || "COPIA CLIENTE", anchoMm);
  }

  return doc;
}

/**
 * Determina el formato documental predeterminado según el tipo de operación:
 * - Ventas (VENTA, ARREGLO): 1 sola impresión en Media Carta ("MEDIA_CARTA").
 * - Alquileres (ALQUILER): 2 impresiones Media Carta en una sola hoja ("MEDIA_CARTA_DOBLE").
 * - Apartados (SEPARE, APARTADO): 1 sola impresión en Media Carta ("MEDIA_CARTA").
 */
export function resolverFormatoPdfPredeterminado(tipoOperacion?: string): FormatoImpresionTipo {
  const tipo = (tipoOperacion || "").toUpperCase();
  if (tipo === "ALQUILER") return "MEDIA_CARTA_DOBLE";
  if (tipo === "SEPARE" || tipo === "APARTADO") return "MEDIA_CARTA";
  return "MEDIA_CARTA";
}

/**
 * Descarga el archivo PDF de la factura según el formato documental elegido (TIRILLA, MEDIA_CARTA, MEDIA_CARTA_DOBLE o CARTA)
 */
export function descargarPdfSegunFormato(
  datos: DatosImpresionFactura,
  formato?: FormatoImpresionTipo,
  nombreArchivo?: string,
  opciones: OpcionesPdfMediaCarta = {}
): void {
  const formatoEfectivo = formato || resolverFormatoPdfPredeterminado(datos.factura.tipoOperacion);
  let doc: jsPDF;
  if (formatoEfectivo === "TIRILLA_58") {
    doc = crearDocumentoPdfTirilla(datos, opciones, 58);
  } else if (formatoEfectivo === "TIRILLA") {
    doc = crearDocumentoPdfTirilla(datos, opciones, 80);
  } else if (formatoEfectivo === "CARTA") {
    doc = crearDocumentoPdfCarta(datos, opciones);
  } else if (formatoEfectivo === "MEDIA_CARTA_DOBLE") {
    doc = crearDocumentoPdfMediaCartaDoble(datos, opciones);
  } else {
    doc = crearDocumentoPdfMediaCarta(datos, opciones);
  }

  const esSepare = datos.factura.tipoOperacion === "SEPARE" || datos.factura.tipoOperacion === "APARTADO";
  const esAlquiler = datos.factura.tipoOperacion === "ALQUILER";
  const prefijo = esSepare ? "Formato_Apartado" : (esAlquiler ? "Comprobante_Alquiler" : "Factura_Venta");
  const clienteLimpio = (datos.factura.cliente.nombre || "Cliente")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 20);

  const nombre =
    nombreArchivo || `${prefijo}_${datos.factura.numeroFactura}_${clienteLimpio}_${formatoEfectivo}.pdf`;
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
  formato?: FormatoImpresionTipo,
  opciones: OpcionesPdfMediaCarta = {}
): void {
  const formatoEfectivo = formato || resolverFormatoPdfPredeterminado(datos.factura.tipoOperacion);
  let doc: jsPDF;
  if (formatoEfectivo === "TIRILLA_58") {
    doc = crearDocumentoPdfTirilla(datos, opciones, 58);
  } else if (formatoEfectivo === "TIRILLA") {
    doc = crearDocumentoPdfTirilla(datos, opciones, 80);
  } else if (formatoEfectivo === "CARTA") {
    doc = crearDocumentoPdfCarta(datos, opciones);
  } else if (formatoEfectivo === "MEDIA_CARTA_DOBLE") {
    doc = crearDocumentoPdfMediaCartaDoble(datos, opciones);
  } else {
    doc = crearDocumentoPdfMediaCarta(datos, opciones);
  }

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
