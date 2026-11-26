"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Printer,
  FileText,
  CheckCircle2,
  X,
  FileDown,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Receipt,
  Banknote,
  Copy,
  BookOpen,
  Scissors,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
import {
  descargarPdfMediaCarta,
  abrirPdfMediaCarta,
  descargarPdfSegunFormato,
} from "@/lib/pdf-media-carta";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import { formatearFechaConDia } from "@/lib/fechas-alquiler";
import {
  FormatoImpresionTipo,
  esFormatoImpresionValido,
  obtenerPreferenciasImpresion,
  guardarPreferenciasImpresion,
  usePreferenciasImpresion,
} from "@/lib/preferencias-impresion";

export type { FormatoImpresionTipo };

export interface DatosImpresionFactura {
  factura: {
    id: string;
    numeroFactura: string;
    fechaCreacion: string;
    fechaEntregaAlquiler?: string | null;
    fechaDevolucionPactada?: string | null;
    fechaDevolucionReal?: string | null;
    tipoOperacion: string;
    estado: string;
    subtotalProductos: number;
    subtotalArreglosLibres: number;
    recargoMoraAcumulado: number;
    totalFactura: number;
    totalAbonado: number;
    saldoPendiente: number;
    tarifaMoraDiaria?: number | null;
    montoDeposito?: number;
    depositoAbonado?: number;
    saldoDeposito?: number;
    estadoDeposito?: string;
    montoRetenidoDeposito?: number;
    montoDevueltoDeposito?: number;
    motivoRetencionDeposito?: string | null;
    metodoPagoDeposito?: string | null;
    metodoPagoPrincipal?: string | null;
    formaPago?: string | null;
    efectivoRecibido?: number;
    cambioEntregado?: number;
    notas?: string | null;
    observaciones?: string | null;
    fechaRetiroApartado?: string | null;
    fechaDevolucionEstimada?: string | null;
    cliente: {
      nombre: string;
      documento: string;
      telefono?: string | null;
      telefonoSecundario?: string | null;
      email?: string | null;
      direccion?: string | null;
      esResponsableIVA?: boolean;
      tipoIdentificacion?: string;
      digitoVerificacion?: string | null;
      razonSocial?: string | null;
      responsabilidadFiscal?: string;
      municipio?: string;
      codigoDaneMunicipio?: string;
    };
    usuarioCajero?: {
      nombre: string;
      username: string;
    } | null;
    detalles: Array<{
      id: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      esServicioLibre: boolean;
      descripcionLibre?: string | null;
      descripcionDetallada?: string | null;
      producto?: {
        codigo: string;
        nombre: string;
        tipo?: string | null;
        talla?: string | null;
        color?: string | null;
        tarifaMoraDiaria?: number | null;
      } | null;
    }>;
    abonos?: Array<{
      id: string;
      fecha: string;
      monto: number;
      metodoPago: string;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      referenciaComprobante?: string | null;
      cajero?: {
        nombre: string;
        username?: string;
      } | null;
    }>;
  };
  empresa: {
    nombreTienda?: string;
    nombreComercial: string;
    eslogan?: string | null;
    nit: string;
    regimenFiscal?: string | null;
    direccion: string;
    ciudad?: string | null;
    telefono: string;
    email?: string | null;
    logoUrl?: string | null;
    encabezadoFactura?: string | null;
    mostrarVendedorFactura?: boolean;
    politicasFactura?: string | null;
    piePaginaFactura?: string | null;
    formatoPredeterminado?: FormatoImpresionTipo;
    formatoImpresionDefault?: FormatoImpresionTipo;
  };
}

export interface ItemDetalleAgrupado {
  id: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esServicioLibre: boolean;
  descripcionLibre?: string | null;
  descripcionDetallada?: string | null;
  producto?: {
    codigo: string;
    nombre: string;
    tipo?: string | null;
    talla?: string | null;
    color?: string | null;
    tarifaMoraDiaria?: number | null;
  } | null;
}

/**
 * Agrupa de forma inteligente ítems repetidos que compartan la misma referencia/producto,
 * nombre, talla, color, precio unitario y notas específicas.
 * Suma las cantidades y subtotales en una sola línea clara y estandarizada.
 */
export function agruparDetallesFactura(
  detalles: DatosImpresionFactura["factura"]["detalles"] | any[]
): ItemDetalleAgrupado[] {
  if (!Array.isArray(detalles) || detalles.length === 0) return [];
  const mapa = new Map<string, ItemDetalleAgrupado>();

  for (const d of detalles) {
    const cantidad = Number(d?.cantidad) || 1;
    const precioUnitario = Number(d?.precioUnitario) || 0;
    const subtotal = Number(d?.subtotal) || cantidad * precioUnitario;
    const esServicio = Boolean(d?.esServicioLibre);

    const prodId = (d?.productoId || d?.producto?.codigo || d?.producto?.id || (esServicio ? "servicio_libre" : "articulo")).trim();
    const nombre = (d?.producto?.nombre || d?.descripcionLibre || "").trim().toLowerCase();
    const talla = (d?.producto?.talla || "").trim().toLowerCase();
    const color = (d?.producto?.color || "").trim().toLowerCase();
    const detalleNota = (d?.descripcionDetallada || "").trim().toLowerCase();

    const clave = `${prodId}__${nombre}__${talla}__${color}__${precioUnitario}__${detalleNota}`;

    if (mapa.has(clave)) {
      const existente = mapa.get(clave)!;
      existente.cantidad += cantidad;
      existente.subtotal += subtotal;
    } else {
      mapa.set(clave, {
        id: String(d?.id || clave),
        cantidad,
        precioUnitario,
        subtotal,
        esServicioLibre: esServicio,
        descripcionLibre: d?.descripcionLibre || null,
        descripcionDetallada: d?.descripcionDetallada || null,
        producto: d?.producto
          ? {
            codigo: d.producto.codigo || "",
            nombre: d.producto.nombre || "",
            tipo: d.producto.tipo || null,
            talla: d.producto.talla || null,
            color: d.producto.color || null,
            tarifaMoraDiaria: d.producto.tarifaMoraDiaria || null,
          }
          : null,
      });
    }
  }

  return Array.from(mapa.values());
}

interface PlantillaImpresionProps {
  datos?: DatosImpresionFactura | null;
  facturaId?: string;
  formatoInicial?: FormatoImpresionTipo;
  onCerrar?: () => void;
}

/**
 * Resuelve el formato de impresión predeterminado.
 * Prioridad 1: Último formato elegido y guardado por el usuario en el navegador (persistencia automática).
 * Prioridad 2: Formato inicial pasado explícitamente por prop.
 * Prioridad 3: Regla contextual por tipo de operación (Alquiler -> MEDIA_CARTA_DOBLE, Apartados/Ventas -> MEDIA_CARTA).
 */
export function resolverFormatoPredeterminado(
  tipoOperacion?: string,
  formatoInicial?: FormatoImpresionTipo
): FormatoImpresionTipo {
  if (formatoInicial && esFormatoImpresionValido(formatoInicial)) {
    return formatoInicial;
  }

  if (typeof window !== "undefined") {
    try {
      const prefs = obtenerPreferenciasImpresion({ tipoOperacion });
      if (prefs?.formato && esFormatoImpresionValido(prefs.formato)) {
        return prefs.formato;
      }
    } catch { }
  }

  const tipo = (tipoOperacion || "").toUpperCase();
  if (tipo === "ALQUILER") {
    return "MEDIA_CARTA_DOBLE";
  }
  if (tipo === "SEPARE" || tipo === "APARTADO") {
    return "MEDIA_CARTA";
  }
  return "MEDIA_CARTA";
}

// ---------------------------------------------------------------------------
// Helpers Defensivos Anti-Crash Client-Side
// ---------------------------------------------------------------------------
const safeNumber = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const formatCOP = (val: unknown): string => {
  return `$${Math.round(safeNumber(val)).toLocaleString("es-CO")}`;
};

const safeDate = (val: unknown, withTime = false): string => {
  if (!val) return "—";
  return formatearFechaConDia(val, withTime, "corto");
};

export default function PlantillaImpresion({
  datos: datosProp,
  facturaId,
  formatoInicial,
  onCerrar,
}: PlantillaImpresionProps) {
  const [datosCargados, setDatosCargados] = useState<DatosImpresionFactura | null>(null);
  const [cargandoRemoto, setCargandoRemoto] = useState<boolean>(!datosProp && Boolean(facturaId));
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!datosProp && facturaId) {
      let isMounted = true;
      setCargandoRemoto(true);
      setErrorCarga(null);

      fetch(`/api/impresion/${facturaId}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("No se pudo obtener la factura para impresión");
          return res.json();
        })
        .then((data) => {
          if (isMounted) {
            const facturaObj = data.factura || data;
            const empresaObj = data.empresa || {};
            if (facturaObj && facturaObj.id) {
              setDatosCargados({
                factura: facturaObj,
                empresa: empresaObj,
              });
            } else {
              setErrorCarga(data.error || "No se encontraron datos de la factura.");
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setErrorCarga(err instanceof Error ? err.message : "Error al cargar datos");
          }
        })
        .finally(() => {
          if (isMounted) setCargandoRemoto(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [datosProp, facturaId]);

  const datos = datosProp || datosCargados;

  // Persistencia automática reactiva del formato y número de copias
  const {
    formato,
    numCopias,
    cambiarFormato,
    cambiarNumCopias,
  } = usePreferenciasImpresion({
    formatoPredeterminado: formatoInicial,
    tipoOperacion: datos?.factura?.tipoOperacion,
  });

  const areaImprimibleRef = useRef<HTMLDivElement>(null);

  // Normalización defensiva absoluta de datos (incluso si datos es null/undefined)
  const factura: any = datos?.factura || datos || {};
  const empresa: any = datos?.empresa || {};
  const detallesOriginales: any[] = Array.isArray(factura?.detalles) ? factura.detalles : [];
  const detalles: ItemDetalleAgrupado[] = agruparDetallesFactura(detallesOriginales);
  const abonos: any[] = Array.isArray(factura?.abonos) ? factura.abonos : [];
  const cliente: any = factura?.cliente || {};
  const usuarioCajero: any = factura?.usuarioCajero || null;

  const sincronizarIframeImpresion = useCallback(
    (forzarImprimir = false) => {
      if (typeof window === "undefined") return;
      const contenedor = areaImprimibleRef.current;
      if (!contenedor) {
        if (forzarImprimir) window.print();
        return;
      }

      let iframe = document.getElementById("iframe-impresion-documento-pos") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "iframe-impresion-documento-pos";
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        if (forzarImprimir) window.print();
        return;
      }

      let pageCss = "";
      if (formato === "TIRILLA_58") {
        pageCss = `
          @page { size: 58mm auto; margin: 0mm; }
          html, body { width: 58mm !important; margin: 0 auto !important; padding: 0 !important; background: white !important; color: black !important; }
          body { width: 54mm !important; }
        `;
      } else if (formato === "TIRILLA") {
        pageCss = `
          @page { size: 80mm auto; margin: 0mm; }
          html, body { width: 80mm !important; margin: 0 auto !important; padding: 0 !important; background: white !important; color: black !important; }
          body { width: 76mm !important; }
        `;
      } else if (formato === "MEDIA_CARTA") {
        pageCss = `
          @page { size: 215.9mm 139.7mm landscape; margin: 4mm; }
          html, body { width: 215.9mm !important; height: 139.7mm !important; margin: 0 !important; padding: 0 !important; background: white !important; color: black !important; }
          .hoja-media-carta-impresion { width: 207mm !important; height: 131mm !important; max-height: 131mm !important; box-sizing: border-box; page-break-after: avoid !important; break-after: avoid !important; }
        `;
      } else if (formato === "MEDIA_CARTA_DOBLE") {
        pageCss = `
          @page { size: letter portrait; margin: 4mm; }
          html, body { width: 207.9mm !important; height: 271mm !important; max-height: 271mm !important; margin: 0 auto !important; padding: 0 !important; background: white !important; color: black !important; overflow: hidden !important; }
          .hoja-media-carta-doble-impresion { width: 100% !important; height: 270mm !important; max-height: 270mm !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; box-sizing: border-box !important; page-break-after: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; break-inside: avoid !important; }
          .mitad-media-carta { height: 130mm !important; max-height: 130mm !important; overflow: hidden !important; box-sizing: border-box !important; }
        `;
      } else {
        pageCss = `
          @page { size: letter portrait; margin: 6mm; }
          html, body { width: 215.9mm !important; margin: 0 !important; padding: 0 !important; background: white !important; color: black !important; }
          .hoja-carta-impresion { width: 100%; max-height: 258mm !important; box-sizing: border-box; page-break-after: avoid !important; break-after: avoid !important; }
        `;
      }

      const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      const htmlDocumento = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Factura ${factura?.numeroFactura || ""} - ${empresa?.nombreComercial || "Mi Empresa"}</title>
          ${styleTags}
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            ${pageCss}
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${contenedor.innerHTML}
        </body>
        </html>
      `;

      doc.open();
      doc.write(htmlDocumento);
      doc.close();

      if (forzarImprimir) {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error("Error al disparar impresión en iframe:", err);
            window.print();
          }
        }, 350);
      }
    },
    [formato, factura?.numeroFactura, empresa?.nombreComercial]
  );

  const imprimirDocumentoAislado = () => {
    sincronizarIframeImpresion(true);
  };

  useEffect(() => {
    if (!datos) return;
    // Sincronizar el contenido del iframe en segundo plano para que cualquier botón exterior tenga el HTML listo
    const timer = setTimeout(() => {
      sincronizarIframeImpresion(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [datos, formato, numCopias, sincronizarIframeImpresion]);

  // Retornos condicionales ubicados estrictamente DESPUÉS de todos los hooks
  if (cargandoRemoto) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Preparando documento para impresión...</p>
        <span className="text-xs text-slate-400 mt-1">Cargando datos frescos y políticas comerciales</span>
      </div>
    );
  }

  if (errorCarga || !datos) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-rose-200 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-600 mb-2" />
        <p className="text-sm font-bold text-slate-900">
          {errorCarga || "No hay datos disponibles para imprimir"}
        </p>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cerrar
          </button>
        )}
      </div>
    );
  }

  const renderDocumento = (tipoCopiaTexto: string) => {
    // -------------------------------------------------------------------------
    // DETERMINACIÓN INEQUÍVOCA DEL TIPO DE OPERACIÓN (VENTA vs ALQUILER vs APARTADO)
    // -------------------------------------------------------------------------
    const esAlquiler = factura.tipoOperacion === "ALQUILER";
    const esApartado = factura.tipoOperacion === "SEPARE" || factura.tipoOperacion === "APARTADO";
    const esVenta = !esAlquiler && !esApartado; // VENTA, ARREGLO, VENTA_ARREGLO
    const mostrarCajero = empresa.mostrarVendedorFactura !== false && Boolean(usuarioCajero?.nombre);

    // 1. REGLA CONTABLE — LIQUIDACIÓN DE LA OPERACIÓN PRINCIPAL
    const subtotalPrendas =
      safeNumber(factura.subtotalProductos) + safeNumber(factura.subtotalArreglosLibres);
    const recargoMora = esAlquiler ? safeNumber(factura.recargoMoraAcumulado) : 0;
    const totalOperacionPrincipal =
      (safeNumber(factura.totalFactura) || subtotalPrendas) + recargoMora;
    const totalAbonadoOperacion = safeNumber(factura.totalAbonado);
    const saldoPendienteOperacion = Math.max(0, safeNumber(factura.saldoPendiente));
    const esPazYSalvo = saldoPendienteOperacion <= 0;

    // -------------------------------------------------------------------------
    // DESACOPLAMIENTO FINANCIERO OFICIAL (ALQUILER VS CUSTODIA VS CONSOLIDADO)
    // -------------------------------------------------------------------------
    const esSepare = esApartado;
    const totalAlquilerBase = totalOperacionPrincipal;
    const totalOperacionAlquiler = totalAlquilerBase;

    // 1. Servicio Principal: Exclusivamente abonos comerciales (excluye custodia y devoluciones de custodia)
    const abonosAlquiler = abonos.filter(
      (a: any) => a.tipoAbono !== "DEPOSITO_GARANTIA" && a.tipoAbono !== "DEPOSITO_DEVUELTO"
    );
    const abonosDeposito = abonos.filter((a: any) => a.tipoAbono === "DEPOSITO_GARANTIA");

    const totalAbonadoAlquiler = abonosAlquiler.length > 0
      ? abonosAlquiler.reduce((sum: number, a: any) => sum + (safeNumber(a.monto) || 0), 0)
      : safeNumber(factura.totalAbonado);

    const desgloseMetodosAlquiler = abonosAlquiler.reduce((acc: Record<string, number>, a: any) => {
      const met = (a.metodoPago || "EFECTIVO").toUpperCase();
      acc[met] = (acc[met] || 0) + (safeNumber(a.monto) || 0);
      return acc;
    }, {});
    const tienePagoMixtoAlquiler = Object.keys(desgloseMetodosAlquiler).length > 1;
    const textoMedioPagoAlquiler = tienePagoMixtoAlquiler
      ? Object.entries(desgloseMetodosAlquiler).map(([m, v]) => `${m} ${formatCOP(v)}`).join(" + ")
      : (Object.keys(desgloseMetodosAlquiler)[0] || (factura.metodoPagoPrincipal || factura.formaPago || "EFECTIVO").toUpperCase());

    const abonoPrevioApartado =
      safeNumber((factura as any).abonoPrevioApartado) > 0
        ? safeNumber((factura as any).abonoPrevioApartado)
        : (Array.isArray(factura.abonos) && factura.abonos.length > 1 && esAlquiler
          ? factura.abonos.slice(1).reduce((acc: number, a: { monto?: number | string | null }) => acc + (safeNumber(a.monto) || 0), 0)
          : 0);

    const saldoPendienteAlquiler = esApartado && (factura as any).saldoPendiente !== undefined
      ? Math.max(0, safeNumber((factura as any).saldoPendiente))
      : Math.max(
          0,
          totalAlquilerBase - (abonoPrevioApartado > 0 ? abonoPrevioApartado : 0) - totalAbonadoAlquiler
        );
    const saldoPendienteTotalApartado = saldoPendienteAlquiler;

    // Extracción inteligente de vueltas y efectivo desde los abonos registrados
    const vueltasDesdeAbonos = abonos.reduce((sum: number, a: any) => sum + (safeNumber(a.vueltasEntregadas) || 0), 0);
    const efectivoDesdeAbonos = abonos.reduce((sum: number, a: any) => sum + (safeNumber(a.montoRecibido) || 0), 0);

    // 2. Depósito en Garantía (Custodia Reembolsable)
    const montoDepositoEfectivo = safeNumber(factura.montoDeposito);
    const montoDepositoTotal = montoDepositoEfectivo;
    let depositoPagadoHoy = 0;
    if (abonosDeposito.length > 0) {
      depositoPagadoHoy = abonosDeposito.reduce((sum: number, a: any) => sum + (safeNumber(a.monto) || 0), 0);
    } else if (esApartado) {
      if ((factura as any).depositoAbonado !== undefined) {
        depositoPagadoHoy = safeNumber((factura as any).depositoAbonado);
      } else if ((factura as any).depositoAbonadoHoy !== undefined) {
        depositoPagadoHoy = safeNumber((factura as any).depositoAbonadoHoy);
      } else if (factura.estadoDeposito === "RECIBIDO_EN_GARANTIA") {
        depositoPagadoHoy = montoDepositoTotal;
      } else {
        depositoPagadoHoy = 0;
      }
    } else if (esAlquiler) {
      depositoPagadoHoy = montoDepositoTotal > 0 && factura.estadoDeposito !== "DEVUELTO_COMPLETO" ? montoDepositoTotal : 0;
    }
    const saldoDepositoAlRetirar = (factura as any).saldoDeposito !== undefined
      ? safeNumber((factura as any).saldoDeposito)
      : Math.max(0, montoDepositoTotal - depositoPagadoHoy);

    const metodoDepositoRaw = factura.metodoPagoDeposito || abonosDeposito[0]?.metodoPago || "";
    const metodoDepositoNombre = metodoDepositoRaw === "EFECTIVO"
      ? "Efectivo"
      : metodoDepositoRaw === "BANCOLOMBIA"
      ? "Bancolombia"
      : metodoDepositoRaw === "NEQUI"
      ? "Nequi"
      : metodoDepositoRaw === "DAVIPLATA"
      ? "Daviplata"
      : metodoDepositoRaw === "LLAVE"
      ? "Bre-B / Llave"
      : metodoDepositoRaw === "CONSIGNACION"
      ? "Consignación"
      : metodoDepositoRaw === "TRANSFERENCIA"
      ? "Transferencia"
      : (metodoDepositoRaw || "Custodia");

    // 3. Módulo 3: Consolidado Total de la Factura (Léxico Breve, Sin Redundancias)
    const totalOperacionGlobal = totalAlquilerBase + montoDepositoTotal;
    const totalPagadoFacturaHoy = totalAbonadoAlquiler + depositoPagadoHoy;
    const saldoPendienteTotalRetiro = esApartado
      ? Math.max(0, (totalAlquilerBase + montoDepositoTotal) - totalPagadoFacturaHoy)
      : saldoPendienteAlquiler + saldoDepositoAlRetirar;

    // Tarifa diaria de mora estipulada oficial (predeterminada $3.000)
    const tarifaMoraDiariaOficial =
      safeNumber(factura.tarifaMoraDiaria) > 0
        ? safeNumber(factura.tarifaMoraDiaria)
        : (detalles.reduce((acc, d) => acc + (safeNumber(d.producto?.tarifaMoraDiaria) || 0), 0) || 3000);

    // Para ventas comerciales estándar y recibo unificado en mano
    const textoMedioPagoPrincipal = textoMedioPagoAlquiler;
    const efectivoTotalConsolidado =
      safeNumber(factura.efectivoRecibido) > 0
        ? safeNumber(factura.efectivoRecibido)
        : efectivoDesdeAbonos;
    const efectivoRecibidoCliente =
      efectivoTotalConsolidado > 0
        ? efectivoTotalConsolidado
        : (esVenta ? totalAbonadoOperacion : totalPagadoFacturaHoy);

    const vueltasCambioFinal =
      factura.cambioEntregado !== null && factura.cambioEntregado !== undefined
        ? safeNumber(factura.cambioEntregado)
        : (vueltasDesdeAbonos > 0
            ? vueltasDesdeAbonos
            : (esVenta
                ? Math.max(0, efectivoRecibidoCliente - totalAbonadoOperacion)
                : Math.max(0, efectivoRecibidoCliente - totalPagadoFacturaHoy)));

    const vueltasAlquiler = vueltasCambioFinal;

    // 5. ESTADOS Y TÍTULOS SEGREGADOS POR OPERACIÓN (PROHIBIDO "ALQUILER" EN VENTAS)
    const estaCerrada =
      factura.estado === "FINALIZADA" ||
      factura.estado === "CERRADA" ||
      Boolean(factura.fechaDevolucionReal);

    let tituloComprobante = "FACTURA DE VENTA";

    if (esVenta) {
      tituloComprobante = esPazYSalvo
        ? "FACTURA DE VENTA"
        : "COMPROBANTE DE VENTA — SALDO PENDIENTE";
    } else if (esAlquiler) {
      if (estaCerrada) {
        tituloComprobante = "COMPROBANTE DE PAZ Y SALVO FINAL DE ALQUILER";
      } else if (esPazYSalvo) {
        tituloComprobante = "FACTURA / CONTRATO DE ALQUILER — PAGO COMPLETO";
      } else {
        tituloComprobante = "COMPROBANTE DE ALQUILER — PAGO PARCIAL Y SALDO PENDIENTE";
      }
    } else if (esApartado) {
      tituloComprobante = "COMPROBANTE DE RESERVA / APARTADO";
    }

    // 5. NORMAS Y POLÍTICAS SEGREGADAS (CERO CRUCE DE POLÍTICAS DE APARTADO EN VENTAS/ALQUILERES)
    let textoPoliticas =
      "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.";
    if (esAlquiler) {
      textoPoliticas =
        empresa.politicasFactura ||
        "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de recargo por mora. Cuide su comprobante.";
    } else if (esApartado) {
      textoPoliticas =
        "PLATA DE TRAJES APARTADOS NO SE DEVUELVE. El cliente cuenta con un plazo determinado para retirar las prendas; en caso de desistir de la reserva, el abono no es reembolsable.";
    }

    // Estado de Plazo y Llegada (exclusivo para Alquiler)
    let textoPlazoYDevolucion = "ESTÁ EN PLAZO / AL DÍA";
    let estaEnMora = false;
    let diasRetraso = 0;
    let horasRetraso = 0;

    if (esAlquiler) {
      if (factura.fechaDevolucionReal) {
        textoPlazoYDevolucion = "PRENDAS DEVUELTAS A CONFORMIDAD";
      } else if (factura.fechaDevolucionPactada) {
        const ahora = new Date();
        const limite = new Date(factura.fechaDevolucionPactada);
        if (ahora > limite) {
          estaEnMora = true;
          const diffMs = ahora.getTime() - limite.getTime();
          diasRetraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          horasRetraso = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const detalleMora =
            diasRetraso > 0 ? `${diasRetraso} d y ${horasRetraso} h` : `${horasRetraso} h`;
          textoPlazoYDevolucion = `YA SE PASÓ DE LA FECHA DE ENTREGA (EN MORA — ${detalleMora} de retraso)`;
        } else {
          textoPlazoYDevolucion = esPazYSalvo
            ? "ESTÁ EN PLAZO / AL DÍA (Prendas en custodia — Pago completo)"
            : "ESTÁ EN PLAZO / AL DÍA (Prendas en custodia — Saldo pendiente)";
        }
      }
    }

    // -------------------------------------------------------------
    // FORMATO 1: TIRILLA POS TÉRMICA (80mm o 58mm)
    // -------------------------------------------------------------
    if (formato === "TIRILLA" || formato === "TIRILLA_58") {
      const es58 = formato === "TIRILLA_58";
      const anchoClase = es58 ? "w-[58mm] max-w-[58mm] min-w-[58mm]" : "w-[80mm] max-w-[80mm] min-w-[80mm]";

      if (esSepare) {
        return (
          <div className={`${anchoClase} mx-auto p-2 bg-white text-black font-mono ${es58 ? "text-[9.5px]" : "text-[11px]"} leading-tight select-none border border-slate-300`}>
            {/* Cabecera Empresa Dinámica */}
            <div className="text-center pb-2 border-b border-black space-y-0.5">
              {empresa.logoUrl && (
                <div className={`${es58 ? "w-14 h-14" : "w-16 h-16"} border border-slate-300 mx-auto p-0.5 mb-1.5 flex items-center justify-center overflow-hidden`}>
                  <img
                    src={empresa.logoUrl}
                    alt={empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <h1 className="text-sm font-black font-sans tracking-tight uppercase">
                {empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
              </h1>
              {empresa.eslogan && (
                <p className="text-[9.5px] italic font-sans text-slate-700">{empresa.eslogan}</p>
              )}
              <p className="font-bold">NIT: {empresa.nit || "900.123.456-7"}</p>
              {empresa.regimenFiscal && (
                <p className="text-[9px] uppercase">{empresa.regimenFiscal}</p>
              )}
              <p className="text-[10px]">{empresa.direccion || "Calle 15 # 22-30"}</p>
              <p className="text-[10px]">Tel: {empresa.telefono || "310 123 4567"}</p>
              <p className="text-[9px] uppercase font-bold pt-1 text-slate-800">
                ** {tipoCopiaTexto} **
              </p>
            </div>

            {/* Título en Recuadro Central */}
            <div className="py-2 border-b-2 border-black text-center space-y-1">
              <div className="border-2 border-black py-1 px-2 font-black text-xs uppercase tracking-wider bg-slate-100">
                COMPROBANTE DE RESERVA / APARTADO
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>N° APARTADO:</span>
                <span className="font-mono">{factura.numeroFactura}</span>
              </div>
              <div className="flex justify-between text-[9.5px]">
                <span>FECHA EMISIÓN:</span>
                <span>{safeDate(factura.fechaCreacion, true)}</span>
              </div>
              {mostrarCajero && (
                <div className="flex justify-between text-[9.5px]">
                  <span>CAJERO:</span>
                  <span className="font-semibold">{usuarioCajero?.nombre}</span>
                </div>
              )}
            </div>

            {/* Bloque Estructurado del Cliente */}
            <div className="py-2 border-b border-black text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">Nombre:</span>
                <span className="font-semibold text-right max-w-[50mm] break-words">{(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">C.C. / NIT:</span>
                <span className="font-mono">{cliente.documento || "—"}{cliente.digitoVerificacion ? `-${cliente.digitoVerificacion}` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Dirección:</span>
                <span className="text-right max-w-[50mm] break-words">{cliente.direccion || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Celular:</span>
                <span className="font-mono font-bold">{cliente.telefono || "—"}{cliente.telefonoSecundario ? ` / ${cliente.telefonoSecundario}` : ""}</span>
              </div>
            </div>

            {/* Descripción de Prendas y Fechas */}
            <div className="py-2 border-b border-black text-[10px] space-y-1">
              <p className="font-black uppercase text-[9.5px] border-b border-black pb-0.5">Descripción de Prendas Separadas:</p>
              <div className="space-y-1 pt-1">
                {detalles.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10px]">
                    <span className="font-semibold max-w-[52mm] break-words">
                      {safeNumber(d.cantidad)}x {d.esServicioLibre ? (d.descripcionLibre || "Traje libre") : (d.producto?.nombre || d.descripcionLibre || "Prenda")}
                      {d.producto?.codigo ? ` [${d.producto.codigo}]` : ""}
                      {safeNumber(d.cantidad) > 1 && (
                        <span className="text-[8.5px] text-slate-600 font-normal ml-1">
                          ({formatCOP(d.precioUnitario)} c/u)
                        </span>
                      )}
                      {d.descripcionDetallada?.trim() && (
                        <span className="block text-[9px] text-slate-700 italic font-medium break-words whitespace-pre-wrap mt-0.5">
                          * Detalle: {d.descripcionDetallada.trim()}
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold">{formatCOP(d.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-dashed border-black text-[9.5px] space-y-0.5 bg-slate-50 p-1 rounded">
                <div className="flex justify-between">
                  <span className="font-bold">FECHA ESTIMADA RETIRO:</span>
                  <span className="font-bold">{safeDate(factura.fechaRetiroApartado || factura.fechaEntregaAlquiler)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">FECHA ESTIMADA DEVOLUCIÓN:</span>
                  <span className="font-bold">{safeDate(factura.fechaDevolucionEstimada || factura.fechaDevolucionPactada)}</span>
                </div>
              </div>
            </div>

            {/* 4 ETIQUETAS DE APARTADOS (VALOR ALQUILER, DEPOSITO, ABONO, SALDO PENDIENTE AL RETIRAR) */}
            <div className="py-2 border-t-2 border-black space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-1.5 text-center">
                {/* VALOR ALQUILER = AZUL */}
                <div
                  className="p-1.5 rounded-lg border-2 flex flex-col justify-center items-center"
                  style={{
                    backgroundColor: "#eff6ff",
                    borderColor: "#3b82f6",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider text-blue-900 block leading-tight">
                    VALOR ALQUILER
                  </span>
                  <span className="text-xs font-black font-mono text-blue-950 mt-0.5 block">
                    {formatCOP(totalAlquilerBase)}
                  </span>
                </div>

                {/* DEPOSITO = AMARILLO NARANJA */}
                <div
                  className="p-1.5 rounded-lg border-2 flex flex-col justify-center items-center"
                  style={{
                    backgroundColor: "#fefce8",
                    borderColor: "#f59e0b",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-900 block leading-tight">
                    DEPOSITO
                  </span>
                  <span className="text-xs font-black font-mono text-amber-950 mt-0.5 block">
                    {formatCOP(montoDepositoTotal)}
                  </span>
                </div>

                {/* ABONO = VERDE */}
                <div
                  className="p-1.5 rounded-lg border-2 flex flex-col justify-center items-center"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderColor: "#10b981",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-900 block leading-tight">
                    ABONO
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-950 mt-0.5 block">
                    {formatCOP(totalPagadoFacturaHoy)}
                  </span>
                </div>

                {/* SALDO PENDIENTE AL RETIRAR = ROJO */}
                <div
                  className="p-1.5 rounded-lg border-2 flex flex-col justify-center items-center"
                  style={{
                    backgroundColor: "#fff1f2",
                    borderColor: "#f43f5e",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <span className="text-[7.5px] font-black uppercase tracking-tight text-rose-900 block leading-tight">
                    SALDO PENDIENTE AL RETIRAR
                  </span>
                  <span className="text-xs font-black font-mono text-rose-950 mt-0.5 block">
                    {formatCOP(saldoPendienteTotalRetiro)}
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t border-dashed border-slate-400 text-[9px] space-y-0.5">
                <div className="flex justify-between font-black text-slate-900">
                  <span>TOTAL TASADO (ALQUILER + CUSTODIA):</span>
                  <span>{formatCOP(totalAlquilerBase + montoDepositoTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Hoy (Reserva {formatCOP(totalAbonadoAlquiler)} + Custodia {formatCOP(depositoPagadoHoy)}):</span>
                  <span className="font-bold">{formatCOP(totalPagadoFacturaHoy)}</span>
                </div>
                {efectivoTotalConsolidado > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Efectivo: {formatCOP(efectivoTotalConsolidado)}</span>
                    <span className="font-bold">Vueltas: {formatCOP(vueltasCambioFinal)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* OBSERVACIONES Y LEYENDA OFICIAL (DEBAJO DEL CUADRO) */}
            <div className="my-1.5 p-2 border-2 border-black bg-slate-100 text-center w-full space-y-1">
              <p className="font-black text-[10px] uppercase leading-tight text-black">
                PLATA DE TRAJES APARTADOS NO SE DEVUELVEN
              </p>
              {factura.observaciones && (
                <p className="text-[9px] text-slate-700 italic border-t border-slate-300 pt-0.5">
                  Nota: {factura.observaciones}
                </p>
              )}
            </div>

            {/* Pie y Firmas de Respaldo Holgadas */}
            <div
              className="text-center text-[9px] select-none"
              style={{ marginTop: "40px", breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="space-y-6">
                <div>
                  <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                  <p className="font-bold uppercase tracking-tight">Firma del Cliente</p>
                  <p className="text-[8px] text-slate-700">C.C. / NIT: {cliente.documento || "____________________"}</p>
                </div>
                <div>
                  <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                  <p className="font-bold uppercase tracking-tight">Firma Vendedor / Cajero</p>
                  <p className="text-[8px] text-slate-700">{usuarioCajero?.nombre || "Atención en Mostrador"}</p>
                </div>
              </div>
            </div>

            <div className="text-center text-[8.5px] pt-1 text-slate-500">
              {empresa.piePaginaFactura || "¡Gracias por su preferencia! — Comprobante POS"}
            </div>
          </div>
        );
      }
      return (
        <div className={`${anchoClase} mx-auto p-2 bg-white text-slate-950 font-sans ${es58 ? "text-[10px]" : "text-xs"} font-semibold leading-snug select-none border border-slate-300`}>
          {/* Cabecera Empresa */}
          <div className="text-center pb-2 border-b border-black space-y-0.5">
            {empresa.logoUrl && (
              <div className={`${es58 ? "w-14 h-14" : "w-16 h-16"} border border-slate-300 mx-auto p-0.5 mb-1.5 flex items-center justify-center overflow-hidden`}>
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nombreComercial || "Mi Empresa"}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <h1 className="text-sm font-black font-sans tracking-tight uppercase text-black">
              {empresa.nombreComercial || "Mi Empresa"}
            </h1>
            {empresa.eslogan && (
              <p className="text-[10px] italic font-sans text-slate-700">{empresa.eslogan}</p>
            )}
            <p className="font-bold text-xs">NIT: {empresa.nit || "900.123.456-7"}</p>
            {empresa.regimenFiscal && (
              <p className="text-[10px] uppercase">{empresa.regimenFiscal}</p>
            )}
            <p className="text-[11px]">{empresa.direccion || "Calle 15 # 22-30"}</p>
            <p className="text-[11px]">Tel: {empresa.telefono || "310 123 4567"}</p>
            <p className="text-[10px] uppercase font-bold pt-1 text-slate-900">
              ** {tipoCopiaTexto} **
            </p>
          </div>

          {/* Datos Factura / Título Dinámico */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-xs">
            <div className="font-black text-center text-[12px] uppercase border-b border-black pb-1 text-black">
              {tituloComprobante}
            </div>
            <div className="flex justify-between font-bold">
              <span>FOLIO / N°:</span>
              <span className="font-mono text-sm">{factura.numeroFactura}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA EMISIÓN:</span>
              <span>{safeDate(factura.fechaCreacion, true)}</span>
            </div>
            <div className="flex justify-between">
              <span>OPERACIÓN:</span>
              <span className="uppercase font-bold">{esVenta ? "VENTA" : (factura.tipoOperacion || "VENTA")}</span>
            </div>
            {mostrarCajero && (
              <div className="flex justify-between">
                <span>CAJERO:</span>
                <span className="font-semibold">{usuarioCajero?.nombre}</span>
              </div>
            )}
          </div>

          {/* Datos Cliente */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-xs">
            <p className="font-bold uppercase text-[10px] text-slate-700">DATOS DEL CLIENTE:</p>
            <p className="font-black text-xs text-black">
              {(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}
            </p>
            <p>
              {cliente.tipoIdentificacion || "CC"}: {cliente.documento || "—"}
              {cliente.digitoVerificacion ? `-${cliente.digitoVerificacion}` : ""}
            </p>
            {cliente.telefono && (
              <p>
                TEL. PRIMARIO (1°): <span className="font-bold">{cliente.telefono}</span>
              </p>
            )}
            {cliente.telefonoSecundario && (
              <p>
                TEL. SECUNDARIO (2°): <span className="font-bold">{cliente.telefonoSecundario}</span>
              </p>
            )}
            {cliente.direccion && <p>DIR: {cliente.direccion}</p>}
          </div>

          {/* Fechas de Alquiler (SOLO SI ES ALQUILER) */}
          {esAlquiler && (
            <div className="py-1.5 border-b border-dashed border-black text-[11px] space-y-0.5 bg-slate-50 p-1.5 rounded">
              <div className="flex justify-between">
                <span className="font-bold">FECHA SALIDA:</span>
                <span>{safeDate(factura.fechaEntregaAlquiler || factura.fechaCreacion)}</span>
              </div>
              {factura.fechaDevolucionPactada && (
                <div className="flex justify-between font-bold text-rose-800">
                  <span>LÍMITE DEVOLUCIÓN:</span>
                  <span>{safeDate(factura.fechaDevolucionPactada, true)}</span>
                </div>
              )}
              {factura.fechaDevolucionReal && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>DEVUELTO EL:</span>
                  <span>{safeDate(factura.fechaDevolucionReal, true)}</span>
                </div>
              )}
              <div className="pt-0.5 text-[10px] text-slate-800">
                <span>ESTADO PLAZO: </span>
                <strong className={estaEnMora ? "text-rose-800" : "text-slate-950"}>
                  {textoPlazoYDevolucion}
                </strong>
              </div>
            </div>
          )}

          {/* Tabla de Artículos / Ítems */}
          <div className="py-2 border-b border-black text-xs">
            <div className="flex justify-between font-bold pb-1 border-b border-black text-[11px] uppercase">
              <span>{esAlquiler ? "CANT  TIPO DE TRAJE / DETALLE" : "CANT  DESCRIPCIÓN"}</span>
              <span>SUBTOTAL</span>
            </div>
            <div className="divide-y divide-slate-200 space-y-1 pt-1">
              {detalles.map((d, idx) => (
                <div key={idx} className="pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-black max-w-[52mm] break-words">
                      {safeNumber(d.cantidad)}x{" "}
                      {d.esServicioLibre
                        ? `[Arreglo] ${d.descripcionLibre || "Servicio"}`
                        : d.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje")}
                      {safeNumber(d.cantidad) > 1 && (
                        <span className="text-[9px] font-normal text-slate-600 ml-1">
                          ({formatCOP(d.precioUnitario)} c/u)
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold">{formatCOP(d.subtotal)}</span>
                  </div>
                  {d.producto?.codigo && (
                    <p className="text-[10px] text-slate-700">
                      Cód: {d.producto.codigo} {d.producto.talla ? `| T: ${d.producto.talla}` : ""}
                    </p>
                  )}
                  {d.descripcionDetallada?.trim() && (
                    <p className="text-[9.5px] text-slate-800 italic font-medium leading-tight break-words whitespace-pre-wrap mt-0.5">
                      * Detalle: {d.descripcionDetallada.trim()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LIQUIDACIÓN SEGREGADA: ALQUILER vs APARTADO vs VENTA                      */}
          {/* ========================================================================= */}
          {esAlquiler ? (
            <>
              {/* BLOQUE DE COBRO ORGANIZADO DE ALQUILER */}
              <div className="py-2 border-2 border-black bg-slate-50 p-2.5 rounded my-1.5 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Total Valor Alquiler:</span>
                  <span className="font-mono font-black text-slate-950">{formatCOP(totalAlquilerBase)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Valor Total del Depósito:</span>
                  <span className="font-mono font-black text-slate-950">{formatCOP(montoDepositoTotal)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-300">
                  <span>Total Alquiler más Depósito:</span>
                  <span className="font-mono font-black text-sm">{formatCOP(totalAlquilerBase + montoDepositoTotal)}</span>
                </div>
                {saldoPendienteAlquiler > 0 && (
                  <div className="flex justify-between font-black text-rose-700 pt-1 border-t border-slate-300">
                    <span>Saldo Pendiente Alquiler:</span>
                    <span className="font-mono">{formatCOP(saldoPendienteAlquiler)}</span>
                  </div>
                )}
                {efectivoRecibidoCliente > totalPagadoFacturaHoy && (
                  <div className="flex justify-between text-slate-700 pt-1 border-t border-dashed border-slate-300 text-[11px]">
                    <span>Efectivo Recibido Cliente:</span>
                    <span className="font-mono font-bold">{formatCOP(efectivoRecibidoCliente)}</span>
                  </div>
                )}
                {vueltasCambioFinal > 0 && (
                  <div className="flex justify-between font-black text-emerald-800 text-[12px] pt-1 border-t border-slate-300">
                    <span>Vueltos / Cambio Entregado:</span>
                    <span className="font-mono">{formatCOP(vueltasCambioFinal)}</span>
                  </div>
                )}
              </div>

              {/* BANNER OFICIAL DE OBSERVACIONES Y MORA (DEBAJO DEL CUADRO CONSOLIDADO) */}
              <div className="my-1.5 p-2 bg-amber-50/90 rounded border border-amber-300 text-amber-950 text-center text-[10px] leading-snug w-full space-y-1">
                <p className="font-black uppercase tracking-wider text-[9px] text-amber-900 border-b border-amber-200 pb-0.5">OBSERVACIONES</p>
                <p className="font-semibold">
                  A partir del día siguiente de la fecha de entrega se descontará {formatCOP(tarifaMoraDiariaOficial)} pesos por día de mora del depósito en garantía.
                </p>
                {factura.observaciones && (
                  <p className="italic text-[9.5px] text-slate-800 pt-0.5 border-t border-amber-200">
                    Nota: {factura.observaciones}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* CELDA ÚNICA DE TOTALES DE VENTA (CERO SECCIÓN A, CERO SECCIÓN B) */
            <div className="py-2 border-2 border-black bg-slate-100 p-2 rounded my-1.5 text-xs space-y-1">
              <p className="text-[10.5px] font-black uppercase text-slate-900 border-b border-black pb-0.5">
                TOTALES DE VENTA
              </p>
              <div className="flex justify-between text-[13px] font-black text-black">
                <span>Total Cobro de Venta:</span>
                <span className="font-mono">{formatCOP(totalOperacionPrincipal)}</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold">
                <span>Cobro de Venta Recibido ({textoMedioPagoPrincipal}):</span>
                <span className="font-mono">{formatCOP(totalAbonadoOperacion)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-0.5 border-t border-dashed border-black">
                <span>Efectivo Recibido del Cliente:</span>
                <span className="font-mono">{formatCOP(efectivoRecibidoCliente)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-800 text-[13px] pt-0.5 border-t border-black">
                <span>Vueltos / Cambio Final Entregado:</span>
                <span className="font-mono">{formatCOP(vueltasCambioFinal)}</span>
              </div>
              {saldoPendienteOperacion > 0 && (
                <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                  <span>Falta por pagar:</span>
                  <span className="text-rose-700 font-black">
                    {formatCOP(saldoPendienteOperacion)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Historial Detallado de Abonos */}
          {abonos.length > 0 && (
            <div className="py-1.5 border-b border-dashed border-black text-[11px] space-y-1">
              <p className="font-bold uppercase text-[10px] text-slate-800">HISTORIAL DE PAGOS REGISTRADOS:</p>
              {abonos.map((a, idx) => (
                <div key={idx} className="space-y-0.5 pb-0.5 border-b border-dotted border-slate-300 last:border-none">
                  <div className="flex justify-between font-bold">
                    <span>Abono #{idx + 1} ({a.metodoPago || "EFECTIVO"})</span>
                    <span>{formatCOP(a.monto)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>{safeDate(a.fecha, true)}</span>
                    {a.cajero?.nombre && <span>Cajero: {a.cajero.nombre}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Normas y Políticas Segregadas (Omitidas estrictamente en Alquiler) */}
          {!esAlquiler && textoPoliticas && (
            <div className="py-2 border-b border-black text-[10.5px] text-slate-800 leading-tight">
              <p className="font-bold uppercase text-[11px] mb-0.5 text-black">NORMAS Y POLÍTICAS:</p>
              <p>{textoPoliticas}</p>
            </div>
          )}

          {/* Firmas de Respaldo Holgadas */}
          <div
            className="text-center text-[10px] select-none"
            style={{ marginTop: "40px", breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <div className="space-y-6">
              <div>
                <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                <p className="font-bold uppercase tracking-tight">Firma del Cliente</p>
                <p className="text-[8.5px] text-slate-700">C.C. / NIT: {cliente.documento || "____________________"}</p>
                <p className="text-[8px] text-slate-600 mt-0.5">
                  {esAlquiler ? "(Acepto estado de prendas y condiciones)" : "(Aceptación y recibido a conformidad)"}
                </p>
              </div>
              <div>
                <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                <p className="font-bold uppercase tracking-tight">Firma Vendedor / Cajero</p>
                <p className="text-[8.5px] text-slate-700">{usuarioCajero?.nombre || "Atención en Mostrador"}</p>
              </div>
            </div>
          </div>

          <div className="text-center text-[8.5px] pt-1 text-slate-500">
            {empresa.piePaginaFactura || "¡Gracias por su preferencia! — Comprobante POS"}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // FUNCIÓN AUXILIAR: RENDER CONTENIDO DE MEDIA CARTA (REUTILIZABLE)
    // -------------------------------------------------------------
    const renderContenidoMediaCarta = (copiaLabel: string, esDoble: boolean = false) => {
      if (esSepare) {
        return (
          <div className={`w-full bg-white text-black font-sans flex flex-col justify-between box-border h-full ${esDoble ? "p-2 sm:p-2.5 text-[9.5px]" : "p-4 sm:p-5 text-xs"}`}>
            <div>
              {/* Cabecera Media Carta */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-1.5 mb-1.5">
                <div className="flex items-center gap-2.5">
                  {empresa.logoUrl && (
                    <div className={esDoble ? "w-16 h-16 min-w-16 min-h-16 border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden" : "w-20 h-20 min-w-20 min-h-20 border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden"}>
                      <img
                        src={empresa.logoUrl}
                        alt={empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h1 className={`${esDoble ? "text-sm" : "text-base"} font-black tracking-tight text-slate-900 uppercase`}>
                      {empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
                    </h1>
                    {empresa.eslogan && (
                      <p className="text-[9px] italic text-slate-600">{empresa.eslogan}</p>
                    )}
                    <p className="text-[9.5px] text-slate-700 font-bold">
                      NIT: {empresa.nit || "900.123.456-7"} {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {empresa.direccion} — {empresa.ciudad || "Villavicencio"} | Tel: {empresa.telefono}
                    </p>
                  </div>
                </div>

                {/* Recuadro de Título y Folio */}
                <div className="text-right">
                  <div className="border-2 border-slate-900 px-2 py-0.5 bg-slate-50">
                    <span className="text-[9px] uppercase font-black tracking-wider block text-slate-900">
                      COMPROBANTE DE RESERVA / APARTADO
                    </span>
                    <span className={`${esDoble ? "text-xs" : "text-sm"} font-black font-mono block text-slate-900`}>
                      N° {factura.numeroFactura}
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase block">
                      {copiaLabel}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-500 mt-0.5">
                    Fecha: {safeDate(factura.fechaCreacion, true)}
                  </p>
                </div>
              </div>

              {/* Ficha Estructurada del Cliente y Fechas */}
              <div className="grid grid-cols-2 gap-2 mb-1.5 p-1.5 bg-slate-50 border border-slate-300 text-xs">
                <div className="space-y-0.5">
                  <p><strong className="text-slate-700">Nombre:</strong> <span className="font-bold text-slate-900">{(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}</span></p>
                  <p><strong className="text-slate-700">C.C. / NIT:</strong> <span className="font-mono font-bold">{cliente.documento || "—"}</span></p>
                  <p><strong className="text-slate-700">Dirección:</strong> <span>{cliente.direccion || "—"}</span></p>
                  <p><strong className="text-slate-700">Celular:</strong> <span className="font-mono font-bold">{cliente.telefono || "—"}{cliente.telefonoSecundario ? ` / ${cliente.telefonoSecundario}` : ""}</span></p>
                </div>

                <div className="space-y-0.5">
                  <p><strong className="text-slate-700">Fecha Estimada Retiro:</strong> <span className="font-bold text-blue-900">{safeDate(factura.fechaRetiroApartado || factura.fechaEntregaAlquiler)}</span></p>
                  <p><strong className="text-slate-700">Fecha Estimada Devolución:</strong> <span className="font-bold text-rose-800">{safeDate(factura.fechaDevolucionEstimada || factura.fechaDevolucionPactada)}</span></p>
                  {mostrarCajero && (
                    <p><strong className="text-slate-700">Cajero Responsable:</strong> <span>{usuarioCajero?.nombre}</span></p>
                  )}
                </div>
              </div>

              {/* Tabla de Descripción de Prendas */}
              <div className="mb-1.5">
                <p className="font-bold text-[8.5px] uppercase text-slate-700 mb-0.5">Descripción de las Prendas Separadas:</p>
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white text-[8px] font-bold uppercase">
                    <tr>
                      <th className="py-0.5 px-1.5 text-left w-10">Cant</th>
                      <th className="py-0.5 px-1.5 text-left">Detalle / Traje Separado</th>
                      <th className="py-0.5 px-1.5 text-right w-20">Precio Unit.</th>
                      <th className="py-0.5 px-1.5 text-right w-20">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detalles.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-0.5 px-1.5 text-center font-bold">{safeNumber(d.cantidad)}</td>
                        <td className="py-0.5 px-1.5">
                          <span className="font-bold text-slate-900">
                            {d.esServicioLibre ? (d.descripcionLibre || "Traje libre") : (d.producto?.nombre || d.descripcionLibre || "Prenda")}
                          </span>
                          {d.producto?.codigo && (
                            <span className="text-[8.5px] font-mono text-slate-500 ml-1">[{d.producto.codigo}]</span>
                          )}
                          {d.descripcionDetallada?.trim() && (
                            <div className="text-[8.5px] text-slate-700 italic font-medium leading-normal mt-0.5 break-words whitespace-pre-wrap bg-slate-50/80 px-1.5 py-0.5 rounded border border-slate-200">
                              <span className="font-bold text-slate-800 not-italic">Detalle / Modificaciones: </span>
                              {d.descripcionDetallada.trim()}
                            </div>
                          )}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono">{formatCOP(d.precioUnitario)}</td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatCOP(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4 ETIQUETAS HORIZONTALES DE APARTADOS (VALOR ALQUILER, DEPOSITO, ABONO, SALDO PENDIENTE AL RETIRAR) */}
            <div className="grid grid-cols-4 gap-2 text-center my-2">
              {/* VALOR ALQUILER = AZUL */}
              <div
                className="p-2 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#eff6ff",
                  borderColor: "#3b82f6",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[8.5px] font-black uppercase tracking-wider text-blue-900 block leading-tight">
                  VALOR ALQUILER
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-blue-950 mt-1 block">
                  {formatCOP(totalAlquilerBase)}
                </span>
              </div>

              {/* DEPOSITO = AMARILLO NARANJA */}
              <div
                className="p-2 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#fefce8",
                  borderColor: "#f59e0b",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-900 block leading-tight">
                  DEPOSITO
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-950 mt-1 block">
                  {formatCOP(montoDepositoTotal)}
                </span>
              </div>

              {/* ABONO = VERDE */}
              <div
                className="p-2 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#f0fdf4",
                  borderColor: "#10b981",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-900 block leading-tight">
                  ABONO
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-950 mt-1 block">
                  {formatCOP(totalPagadoFacturaHoy)}
                </span>
              </div>

              {/* SALDO PENDIENTE AL RETIRAR = ROJO */}
              <div
                className="p-2 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#fff1f2",
                  borderColor: "#f43f5e",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[8px] font-black uppercase tracking-tight text-rose-900 block leading-tight">
                  SALDO PENDIENTE AL RETIRAR
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-rose-950 mt-1 block">
                  {formatCOP(saldoPendienteTotalRetiro)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-[9.5px] my-1.5">
              <span className="font-black text-slate-900">
                TOTAL TASADO (ALQUILER + CUSTODIA): {formatCOP(totalAlquilerBase + montoDepositoTotal)}
              </span>
              <span className="font-semibold text-slate-700">
                Hoy: Reserva {formatCOP(totalAbonadoAlquiler)} + Custodia {formatCOP(depositoPagadoHoy)}
              </span>
              {efectivoTotalConsolidado > 0 && (
                <span className="font-bold text-slate-800">
                  Efectivo: {formatCOP(efectivoTotalConsolidado)} | Vueltas: {formatCOP(vueltasCambioFinal)}
                </span>
              )}
            </div>

            {/* OBSERVACIONES Y LEYENDA OFICIAL (DEBAJO DEL CUADRO) */}
            <div className="p-1.5 bg-slate-100 border border-slate-900 text-center my-1 w-full space-y-0.5">
              <p className="text-[9.5px] font-black tracking-tight text-slate-900 uppercase leading-snug">
                PLATA DE TRAJES APARTADOS NO SE DEVUELVEN
              </p>
              {factura.observaciones && (
                <p className="text-[8.5px] text-slate-700 italic border-t border-slate-200 pt-0.5">
                  Nota: {factura.observaciones}
                </p>
              )}
            </div>

            {/* Pie de Firmas Holgado */}
            <div
              className="grid grid-cols-2 gap-6 text-center text-[9px]"
              style={{ marginTop: "36px", breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div>
                <div className="border-t border-slate-800 w-full mb-1"></div>
                <p className="font-bold text-[9.5px]">Firma del Cliente</p>
                <p className="text-[8px] text-slate-600">C.C. / NIT: {cliente.documento || "____________________"}</p>
              </div>
              <div>
                <div className="border-t border-slate-800 w-full mb-1"></div>
                <p className="font-bold text-[9.5px]">Firma Vendedor / Cajero</p>
                <p className="text-[8px] text-slate-600">{usuarioCajero?.nombre || "Atención en Mostrador"}</p>
              </div>
            </div>
          </div>
        );
      }

      // Alquiler o Venta Comercial
      return (
        <div
          className={`w-full bg-white text-slate-950 font-sans flex flex-col justify-between box-border h-full ${esDoble
            ? "p-2 sm:p-2.5 text-[11px] sm:text-[11.5px] font-semibold leading-tight"
            : "p-3 sm:p-4 text-xs sm:text-[12.5px] font-medium leading-tight"
            }`}
        >
          <div>
            {/* Cabecera Media Carta */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-1.5 mb-1">
              <div className="flex items-center gap-2.5">
                {empresa.logoUrl && (
                  <div className={esDoble ? "w-16 h-16 min-w-16 min-h-16 border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden" : "w-20 h-20 min-w-20 min-h-20 border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden"}>
                    <img
                      src={empresa.logoUrl}
                      alt={empresa.nombreComercial || "Mi Empresa"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1
                    className={`${esDoble ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                      } font-black tracking-tight text-slate-950 uppercase`}
                  >
                    {empresa.nombreComercial || "Mi Empresa"}
                  </h1>
                  {empresa.eslogan && (
                    <p className="text-[10px] italic text-slate-700">{empresa.eslogan}</p>
                  )}
                  <p className="text-[10.5px] text-slate-800 font-bold">
                    NIT: {empresa.nit || "900.123.456-7"}{" "}
                    {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {empresa.direccion} — {empresa.ciudad || "Villavicencio"} | Tel: {empresa.telefono}
                  </p>
                </div>
              </div>

              {/* Recuadro de Título y Folio */}
              <div className="text-right">
                <div className="border-2 border-slate-900 px-2 py-0.5 bg-slate-50">
                  <span className="text-[10px] uppercase font-black tracking-wider block text-slate-950">
                    {tituloComprobante}
                  </span>
                  <span
                    className={`${esDoble ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                      } font-black font-mono block text-slate-950`}
                  >
                    N° {factura.numeroFactura}
                  </span>
                  <span className="text-[9px] font-bold text-slate-700 uppercase block">
                    {copiaLabel}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-600 mt-0.5">
                  Fecha: {safeDate(factura.fechaCreacion, true)}
                </p>
              </div>
            </div>

            {/* Ficha Cliente & Operación */}
            <div
              className={`grid grid-cols-2 gap-2 mb-1 p-1.5 bg-slate-50 border border-slate-300 ${esDoble ? "text-[11px]" : "text-xs"
                }`}
            >
              <div>
                <p className="font-bold uppercase text-slate-700 text-[9.5px]">DATOS DEL CLIENTE:</p>
                <p className="font-black text-slate-950 text-xs sm:text-[13px]">
                  {(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}
                </p>
                <p className="text-[10.5px]">
                  {cliente.tipoIdentificacion || "CC"}:{" "}
                  <span className="font-mono font-bold">{cliente.documento || "—"}</span>
                  {cliente.digitoVerificacion ? `-${cliente.digitoVerificacion}` : ""}
                </p>
                {cliente.telefono && (
                  <p className="text-[10.5px]">
                    Tel. Primario (1°): <span className="font-mono font-bold">{cliente.telefono}</span>
                  </p>
                )}
                {cliente.telefonoSecundario && (
                  <p className="text-[10.5px]">
                    Tel. Secundario (2°): <span className="font-mono font-bold">{cliente.telefonoSecundario}</span>
                  </p>
                )}
              </div>

              <div>
                <p className="font-bold uppercase text-slate-700 text-[9.5px]">OPERACIÓN Y DETALLES:</p>
                <p className="text-[10.5px]">
                  Operación: <strong className="uppercase">{esVenta ? "VENTA" : (factura.tipoOperacion || "VENTA")}</strong>
                  {mostrarCajero && (
                    <span>
                      {" "}
                      | Cajero: <strong>{usuarioCajero?.nombre}</strong>
                    </span>
                  )}
                </p>
                {esAlquiler && (
                  <div className="mt-0.5 text-[10px] space-y-0.5">
                    <p>
                      Fecha Salida:{" "}
                      <strong>{safeDate(factura.fechaEntregaAlquiler || factura.fechaCreacion)}</strong>
                    </p>
                    {factura.fechaDevolucionPactada && (
                      <p className="font-bold text-rose-700">
                        Límite Devolución: {safeDate(factura.fechaDevolucionPactada, true)}
                      </p>
                    )}
                    <p className="text-[9.5px] text-slate-700">
                      Plazo:{" "}
                      <strong className={estaEnMora ? "text-rose-700" : "text-emerald-700"}>
                        {textoPlazoYDevolucion}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla Compacta de Ítems */}
            <table className={`w-full mb-1 ${esDoble ? "text-[10px]" : "text-xs"}`}>
              <thead className="bg-slate-900 text-white text-[9px] font-bold uppercase">
                <tr>
                  <th className="py-0.5 px-1.5 text-left w-10">Cant</th>
                  <th className="py-0.5 px-1.5 text-left">
                    {esAlquiler ? "Tipo de Traje / Detalle" : (esApartado ? "Tipo de Traje / Separado" : "Descripción del Artículo o Servicio")}
                  </th>
                  <th className="py-0.5 px-1.5 text-right w-20">Valor Unit.</th>
                  <th className="py-0.5 px-1.5 text-right w-20">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {detalles.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-0.5 px-1.5 text-center font-bold">{safeNumber(d.cantidad)}</td>
                    <td className="py-0.5 px-1.5">
                      <span className="font-bold text-slate-950">
                        {d.esServicioLibre
                          ? `[Arreglo] ${d.descripcionLibre || "Servicio"}`
                          : d.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje")}
                      </span>
                      {d.producto?.codigo && (
                        <span className="text-[9px] font-mono text-slate-600 ml-1">
                          [{d.producto.codigo}]
                        </span>
                      )}
                      {d.descripcionDetallada?.trim() && (
                        <div className="text-[8.5px] text-slate-700 italic font-medium leading-normal mt-0.5 break-words whitespace-pre-wrap bg-slate-50/80 px-1.5 py-0.5 rounded border border-slate-200">
                          <span className="font-bold text-slate-800 not-italic">Detalle / Modificaciones: </span>
                          {d.descripcionDetallada.trim()}
                        </div>
                      )}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono">{formatCOP(d.precioUnitario)}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatCOP(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bloques Contables Segregados: Alquiler vs Apartado vs Venta */}
          <div className="border-t-2 border-slate-900 pt-1">
            {esAlquiler ? (
              <>
                <div className={`grid grid-cols-2 gap-2 ${esDoble ? "text-[10px]" : "text-xs"}`}>
                  {/* COLUMNA 1: DEPÓSITO EN GARANTÍA (EN CUSTODIA) */}
                  <div className="p-2 bg-amber-50/70 border border-amber-300 rounded space-y-1 text-amber-950">
                    <p className="font-black text-[9px] uppercase border-b border-amber-300 pb-0.5 text-amber-950">
                      DEPÓSITO EN GARANTÍA (EN CUSTODIA)
                    </p>
                    <div className="flex justify-between font-bold text-[9.5px]">
                      <span>Depósito en Garantía ({metodoDepositoNombre}):</span>
                      <span className="font-mono font-black">{formatCOP(montoDepositoTotal)}</span>
                    </div>
                    <p className="text-[8px] text-amber-900 leading-tight">
                      Custodia: Dinero en garantía a devolver al entregar las prendas completas.
                    </p>
                    <div className="p-1 bg-amber-100/90 rounded border border-amber-300 mt-0.5">
                      <span className="font-black text-[8.5px] uppercase block text-amber-950">
                        FECHA LÍMITE ENTREGA:
                      </span>
                      <span className="font-mono text-rose-900 font-black text-[10px] block mt-0.5">
                        {factura.fechaDevolucionPactada
                          ? `${safeDate(factura.fechaDevolucionPactada)} hasta 8:00 p.m. (20:00)`
                          : "SEGÚN CONTRATO"}
                      </span>
                    </div>
                  </div>

                  {/* COLUMNA 2: COBRO POR SERVICIO DE ALQUILER */}
                  <div className="p-2 bg-slate-50 border border-slate-400 rounded space-y-1 text-slate-900">
                    <p className="font-black text-[9px] uppercase border-b border-slate-300 pb-0.5 text-slate-900">
                      COBRO POR SERVICIO DE ALQUILER
                    </p>
                    <div className="flex justify-between font-bold text-[9.5px]">
                      <span>Total Valor Alquiler:</span>
                      <span className="font-mono font-black">{formatCOP(totalAlquilerBase)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[9.5px] text-slate-800">
                      <span>Valor Total del Depósito:</span>
                      <span className="font-mono font-black">{formatCOP(montoDepositoTotal)}</span>
                    </div>
                    <div className="flex justify-between font-black text-[10px] text-slate-950 pt-1 border-t border-slate-300">
                      <span>Total Alquiler más Depósito:</span>
                      <span className="font-mono font-black">{formatCOP(totalAlquilerBase + montoDepositoTotal)}</span>
                    </div>
                    {saldoPendienteAlquiler > 0 && (
                      <div className="flex justify-between font-black text-rose-700 pt-0.5 border-t border-slate-300 text-[9.5px]">
                        <span>Saldo Pendiente Alquiler:</span>
                        <span className="font-mono font-black">{formatCOP(saldoPendienteAlquiler)}</span>
                      </div>
                    )}
                    {vueltasCambioFinal > 0 && efectivoRecibidoCliente > totalPagadoFacturaHoy && (
                      <div className="flex justify-between text-slate-700 pt-0.5 border-t border-dashed border-slate-300 text-[9px]">
                        <span>Efectivo Recibido Cliente:</span>
                        <span className="font-mono font-black">{formatCOP(efectivoRecibidoCliente)}</span>
                      </div>
                    )}
                    {vueltasCambioFinal > 0 && (
                      <div className="flex justify-between font-black text-emerald-800 pt-0.5 border-t border-slate-300 text-[9.5px]">
                        <span>Vueltos / Cambio Entregado:</span>
                        <span className="font-mono font-black">{formatCOP(vueltasCambioFinal)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BANNER OFICIAL DE OBSERVACIONES Y MORA (DEBAJO DEL CUADRO) */}
                <div className="p-1.5 bg-amber-50/60 border border-amber-300 text-center text-[8.5px] sm:text-[9.5px] text-amber-950 my-1 w-full leading-snug space-y-0.5">
                  <div className="font-bold">
                    OBSERVACIÓN: A partir del día siguiente de la fecha de entrega se descontará {formatCOP(tarifaMoraDiariaOficial)} pesos por día de mora del depósito en garantía.
                  </div>
                  {factura.observaciones && (
                    <div className="italic text-[8px] sm:text-[9px] text-slate-800 pt-0.5 border-t border-amber-200">
                      Nota: {factura.observaciones}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* VENTA COMERCIAL: CELDA DIRECTA DE TOTALES (CERO SECCIÓN A, CERO SECCIÓN B) */
              <div className={`p-2 bg-slate-50 border border-slate-300 max-w-md ml-auto space-y-1 ${esDoble ? "text-[10px]" : "text-xs"}`}>
                <p className="font-black text-[9.5px] uppercase text-slate-900 border-b border-slate-300 pb-0.5">
                  TOTALES DE VENTA
                </p>
                <div className="flex justify-between font-black text-sm text-slate-950">
                  <span>Total Cobro de Venta:</span>
                  <span className="font-mono">{formatCOP(totalOperacionPrincipal)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Cobro de Venta Recibido ({textoMedioPagoPrincipal}):</span>
                  <span className="font-mono">{formatCOP(totalAbonadoOperacion)}</span>
                </div>
                <div className="flex justify-between text-slate-700 pt-0.5 border-t border-dashed border-slate-300">
                  <span>Efectivo Recibido Cliente:</span>
                  <span className="font-mono">{formatCOP(efectivoRecibidoCliente)}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-800 border-t border-slate-300 pt-0.5">
                  <span>Vueltos / Cambio Final Entregado:</span>
                  <span className="font-mono">{formatCOP(vueltasCambioFinal)}</span>
                </div>
                {saldoPendienteOperacion > 0 && (
                  <div className="flex justify-between font-black border-t border-slate-300 pt-0.5">
                    <span>Falta por pagar:</span>
                    <span className="text-rose-700">
                      {formatCOP(saldoPendienteOperacion)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Normas y Políticas Segregadas (Omitidas estrictamente en Alquiler) */}
          {!esAlquiler && textoPoliticas && (
            <div className="p-1 bg-slate-50 border border-slate-200 text-[9px] sm:text-[10px] text-slate-800 leading-tight my-0.5">
              <span className="font-black uppercase text-[9px] sm:text-[10px] mr-1 text-slate-950">
                NORMAS Y POLÍTICAS:
              </span>
              <span>{textoPoliticas}</span>
            </div>
          )}

          {/* Firmas de Respaldo Holgadas */}
          <div
            className="grid grid-cols-2 gap-6 text-center text-[9px]"
            style={{ marginTop: "36px", breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <div>
              <div className="border-t border-slate-700 w-full mb-1"></div>
              <p className="font-bold text-[9.5px]">Firma del Cliente</p>
              <p className="text-[8px] text-slate-600">C.C. / NIT: {cliente.documento || "____________________"}</p>
              <p className="text-[7.5px] text-slate-500 italic mt-0.5">
                {esAlquiler ? "(Acepto estado de prendas y condiciones)" : "(Aceptación y recibido a conformidad)"}
              </p>
            </div>
            <div>
              <div className="border-t border-slate-700 w-full mb-1"></div>
              <p className="font-bold text-[9.5px]">Firma Vendedor / Cajero</p>
              <p className="text-[8px] text-slate-600">{usuarioCajero?.nombre || "Atención en Mostrador"}</p>
              <p className="text-[7.5px] text-slate-500 italic mt-0.5">
                Responsable de Entrega
              </p>
            </div>
          </div>
        </div>
      );
    };

    // -------------------------------------------------------------
    // FORMATO 2: MEDIA CARTA INDIVIDUAL (Horizontal: 215.9mm x 139.7mm)
    // -------------------------------------------------------------
    if (formato === "MEDIA_CARTA") {
      return (
        <div className="hoja-media-carta-impresion w-full max-w-[215.9mm] min-h-[139.7mm] max-h-[139.7mm] mx-auto bg-white text-black font-sans border border-slate-300 flex flex-col justify-between box-border overflow-hidden">
          {renderContenidoMediaCarta(tipoCopiaTexto, false)}
        </div>
      );
    }

    // -------------------------------------------------------------
    // FORMATO 4: MEDIA CARTA DOBLE (2 en 1 Hoja Carta Vertical)
    // -------------------------------------------------------------
    if (formato === "MEDIA_CARTA_DOBLE") {
      return (
        <div className="hoja-media-carta-doble-impresion w-full max-w-[215.9mm] h-[270mm] max-h-[270mm] mx-auto p-2 sm:p-2.5 bg-white text-black font-sans border border-slate-300 text-xs flex flex-col justify-between box-border overflow-hidden">
          {/* Mitad Superior: ORIGINAL CLIENTE */}
          <div className="mitad-media-carta h-[129mm] max-h-[129mm] overflow-hidden flex flex-col justify-between border-b border-slate-100">
            {renderContenidoMediaCarta("EJEMPLAR 1: ORIGINAL CLIENTE", true)}
          </div>

          {/* Línea Central de Corte */}
          <div className="h-[5mm] my-[1mm] flex items-center justify-center relative border-t-2 border-dashed border-slate-400 shrink-0">
            <span className="bg-white px-2.5 py-0.5 text-[8.5px] uppercase font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300 flex items-center gap-1.5">
              <Scissors className="w-3 h-3 text-slate-400" />
              <span>-- CORTAR POR ESTA LÍNEA (2 MEDIAS CARTAS EN 1 HOJA) --</span>
            </span>
          </div>

          {/* Mitad Inferior: COPIA ARCHIVO / TIENDA */}
          <div className="mitad-media-carta h-[129mm] max-h-[129mm] overflow-hidden flex flex-col justify-between border-t border-slate-100">
            {renderContenidoMediaCarta("EJEMPLAR 2: COPIA ARCHIVO / TIENDA", true)}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // FORMATO 3: CARTA COMPLETA (Letter Portrait: 215.9mm x 279.4mm)
    // -------------------------------------------------------------
    if (esSepare) {
      return (
        <div className="hoja-carta-impresion w-full max-w-[215.9mm] min-h-[255mm] max-h-[258mm] mx-auto p-6 sm:p-7 bg-white text-black font-sans border border-slate-300 text-xs flex flex-col justify-between box-border">
          <div>
            {/* Cabecera Carta */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-center gap-4">
                {empresa.logoUrl && (
                  <img
                    src={empresa.logoUrl}
                    alt={empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
                    className="h-24 max-h-[28mm] w-auto max-w-[58mm] object-contain"
                  />
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {empresa.nombreTienda || empresa.nombreComercial || "Mi Empresa"}
                  </h1>
                  {empresa.eslogan && (
                    <p className="text-xs italic text-slate-600">{empresa.eslogan}</p>
                  )}
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    NIT: {empresa.nit || "900.123.456-7"} {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {empresa.direccion} — {empresa.ciudad || "Villavicencio"} | Tel: {empresa.telefono}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="border-2 border-slate-900 px-4 py-2 bg-slate-50">
                  <span className="text-[11px] uppercase font-black tracking-wider block text-slate-900">
                    COMPROBANTE DE RESERVA / APARTADO
                  </span>
                  <span className="text-lg font-black font-mono block text-slate-900">
                    N° {factura.numeroFactura}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase block">
                    {tipoCopiaTexto}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Fecha Emisión: {safeDate(factura.fechaCreacion, true)}
                </p>
              </div>
            </div>

            {/* Ficha Cliente & Fechas */}
            <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-slate-50 border border-slate-300">
              <div className="space-y-1">
                <p className="text-xs"><strong className="text-slate-700">Nombre:</strong> <span className="font-bold text-sm text-slate-900">{(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}</span></p>
                <p className="text-xs"><strong className="text-slate-700">C.C. / NIT:</strong> <span className="font-mono font-bold">{cliente.documento || "—"}</span></p>
                <p className="text-xs"><strong className="text-slate-700">Dirección:</strong> <span>{cliente.direccion || "—"}</span></p>
                <p className="text-xs"><strong className="text-slate-700">Celular:</strong> <span className="font-mono font-bold">{cliente.telefono || "—"}{cliente.telefonoSecundario ? ` / ${cliente.telefonoSecundario}` : ""}</span></p>
              </div>

              <div className="space-y-1">
                <p className="text-xs"><strong className="text-slate-700">Modalidad:</strong> <span className="font-bold uppercase text-blue-900">APARTADO / RESERVA</span></p>
                <p className="text-xs"><strong className="text-slate-700">Fecha Estimada Retiro:</strong> <span className="font-bold text-blue-900">{safeDate(factura.fechaRetiroApartado || factura.fechaEntregaAlquiler)}</span></p>
                <p className="text-xs"><strong className="text-slate-700">Fecha Estimada Devolución:</strong> <span className="font-bold text-rose-800">{safeDate(factura.fechaDevolucionEstimada || factura.fechaDevolucionPactada)}</span></p>
                {mostrarCajero && (
                  <p className="text-xs"><strong className="text-slate-700">Cajero Responsable:</strong> <span>{usuarioCajero?.nombre}</span></p>
                )}
              </div>
            </div>

            {/* Tabla Completa de Ítems */}
            <table className="w-full text-xs mb-4">
              <thead className="bg-slate-900 text-white text-[9.5px] font-bold uppercase">
                <tr>
                  <th className="py-2 px-3 text-left w-12">Cant</th>
                  <th className="py-2 px-3 text-left">Descripción de la Prenda o Servicio Separado</th>
                  <th className="py-2 px-3 text-right w-28">Precio Unitario</th>
                  <th className="py-2 px-3 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {detalles.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1 px-3 text-center font-bold">{safeNumber(d.cantidad)}</td>
                    <td className="py-1 px-3">
                      <span className="font-bold text-slate-900">
                        {d.esServicioLibre
                          ? (d.descripcionLibre || "Traje libre")
                          : d.producto?.nombre || d.descripcionLibre || "Prenda"}
                      </span>
                      {d.producto?.codigo && (
                        <span className="text-[10px] font-mono text-slate-500 ml-2">
                          [{d.producto.codigo}] {d.producto.talla ? `| Talla: ${d.producto.talla}` : ""}
                        </span>
                      )}
                      {d.descripcionDetallada?.trim() && (
                        <div className="text-[9.5px] text-slate-700 italic font-medium leading-normal mt-0.5 break-words whitespace-pre-wrap bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200">
                          <span className="font-bold text-slate-800 not-italic">Detalle / Modificaciones: </span>
                          {d.descripcionDetallada.trim()}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-3 text-right font-mono">{formatCOP(d.precioUnitario)}</td>
                    <td className="py-1 px-3 text-right font-mono font-bold">{formatCOP(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4 ETIQUETAS HORIZONTALES DE APARTADOS (VALOR ALQUILER, DEPOSITO, ABONO, SALDO PENDIENTE AL RETIRAR) */}
            <div className="grid grid-cols-4 gap-3 text-center my-3">
              {/* VALOR ALQUILER = AZUL */}
              <div
                className="p-3 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#eff6ff",
                  borderColor: "#3b82f6",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block leading-tight">
                  VALOR ALQUILER
                </span>
                <span className="text-base font-black font-mono text-blue-950 mt-1 block">
                  {formatCOP(totalAlquilerBase)}
                </span>
              </div>

              {/* DEPOSITO = AMARILLO NARANJA */}
              <div
                className="p-3 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#fefce8",
                  borderColor: "#f59e0b",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block leading-tight">
                  DEPOSITO
                </span>
                <span className="text-base font-black font-mono text-amber-950 mt-1 block">
                  {formatCOP(montoDepositoTotal)}
                </span>
              </div>

              {/* ABONO = VERDE */}
              <div
                className="p-3 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#f0fdf4",
                  borderColor: "#10b981",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block leading-tight">
                  ABONO
                </span>
                <span className="text-base font-black font-mono text-emerald-950 mt-1 block">
                  {formatCOP(totalPagadoFacturaHoy)}
                </span>
              </div>

              {/* SALDO PENDIENTE AL RETIRAR = ROJO */}
              <div
                className="p-3 rounded-xl border-2 flex flex-col justify-center items-center"
                style={{
                  backgroundColor: "#fff1f2",
                  borderColor: "#f43f5e",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-tight text-rose-900 block leading-tight">
                  SALDO PENDIENTE AL RETIRAR
                </span>
                <span className="text-base font-black font-mono text-rose-950 mt-1 block">
                  {formatCOP(saldoPendienteTotalRetiro)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs mb-3">
              <span className="font-black text-slate-900">
                TOTAL TASADO (ALQUILER + CUSTODIA): {formatCOP(totalAlquilerBase + montoDepositoTotal)}
              </span>
              <span className="font-semibold text-slate-700">
                Hoy: Reserva {formatCOP(totalAbonadoAlquiler)} + Custodia {formatCOP(depositoPagadoHoy)}
              </span>
              {efectivoTotalConsolidado > 0 && (
                <span className="font-bold text-slate-800">
                  Efectivo: {formatCOP(efectivoTotalConsolidado)} | Vueltas: {formatCOP(vueltasCambioFinal)}
                </span>
              )}
            </div>

            {/* OBSERVACIONES Y LEYENDA OFICIAL (DEBAJO DEL CUADRO) */}
            <div className="p-3 bg-slate-100 border-2 border-slate-900 text-center mb-3 w-full space-y-1">
              <p className="text-sm font-black tracking-wide text-slate-900 uppercase leading-snug">
                PLATA DE TRAJES APARTADOS NO SE DEVUELVEN
              </p>
              {factura.observaciones && (
                <p className="text-xs text-slate-700 italic border-t border-slate-300 pt-1">
                  Nota: {factura.observaciones}
                </p>
              )}
            </div>
          </div>

          {/* Firmas Carta Holgadas y Espaciadas */}
          <div>
            <div
              className="grid grid-cols-2 gap-10 text-center text-xs"
              style={{ marginTop: "44px", breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div>
                <div className="w-64 border-t-2 border-slate-800 mx-auto mb-1.5"></div>
                <p className="font-bold text-slate-900">Firma del Cliente</p>
                <p className="text-[11px] text-slate-700 mt-0.5">C.C. / NIT: {cliente.documento || "____________________"}</p>
              </div>
              <div>
                <div className="w-64 border-t-2 border-slate-800 mx-auto mb-1.5"></div>
                <p className="font-bold text-slate-900">Firma Vendedor / Cajero</p>
                <p className="text-[11px] text-slate-700 mt-0.5">{usuarioCajero?.nombre || "Atención en Mostrador"}</p>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-400 mt-3 font-mono">
              {empresa.piePaginaFactura || "Comprobante Oficial POS — Facturación y Control"}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hoja-carta-impresion w-full max-w-[215.9mm] min-h-[255mm] max-h-[258mm] mx-auto p-6 sm:p-7 bg-white text-black font-sans border border-slate-300 text-xs flex flex-col justify-between box-border">
        <div>
          {/* Cabecera Carta */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center gap-4">
              {empresa.logoUrl && (
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nombreComercial || "Mi Empresa"}
                  className="h-24 max-h-[28mm] w-auto max-w-[58mm] object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {empresa.nombreComercial || "Mi Empresa"}
                </h1>
                {empresa.eslogan && (
                  <p className="text-xs italic text-slate-600">{empresa.eslogan}</p>
                )}
                <p className="text-xs text-slate-700 font-bold mt-0.5">
                  NIT: {empresa.nit || "900.123.456-7"} {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                </p>
                <p className="text-[11px] text-slate-500">
                  {empresa.direccion} — {empresa.ciudad || "Villavicencio"} | Tel: {empresa.telefono}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="border-2 border-slate-900 px-4 py-2 bg-slate-50">
                <span className="text-[10px] uppercase font-black tracking-wider block text-slate-800">
                  {tituloComprobante}
                </span>
                <span className="text-lg font-black font-mono block text-slate-900">
                  N° {factura.numeroFactura}
                </span>
                <span className="text-[9px] font-bold text-slate-600 uppercase block">
                  {tipoCopiaTexto}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Fecha Emisión: {safeDate(factura.fechaCreacion, true)}
              </p>
            </div>
          </div>

          {/* Ficha Cliente & Operación */}
          <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-slate-50 border border-slate-300">
            <div>
              <p className="font-bold uppercase text-slate-500 text-[9px] mb-1">DATOS DEL CLIENTE:</p>
              <p className="font-bold text-slate-900 text-sm">
                {(cliente.razonSocial || cliente.nombre || "CLIENTE GENERAL").toUpperCase()}
              </p>
              <p className="text-xs text-slate-700">
                {cliente.tipoIdentificacion || "CC"}: <span className="font-mono font-bold">{cliente.documento || "—"}</span>
                {cliente.digitoVerificacion ? `-${cliente.digitoVerificacion}` : ""}
              </p>
              {cliente.telefono && (
                <p className="text-xs text-slate-700">
                  Teléfono Primario (1°): <span className="font-mono font-bold">{cliente.telefono}</span>
                </p>
              )}
              {cliente.telefonoSecundario && (
                <p className="text-xs text-slate-700">
                  Teléfono Secundario (2°): <span className="font-mono font-bold">{cliente.telefonoSecundario}</span>
                </p>
              )}
              {cliente.direccion && <p className="text-xs text-slate-500">Dirección: {cliente.direccion}</p>}
            </div>

            <div>
              <p className="font-bold uppercase text-slate-500 text-[10px] mb-1">DETALLES DE LA ORDEN:</p>
              <p className="text-xs">
                Modalidad: <strong className="uppercase">{esVenta ? "VENTA" : (factura.tipoOperacion || "VENTA")}</strong>
              </p>
              {mostrarCajero && (
                <p className="text-xs">Cajero Responsable: <strong>{usuarioCajero?.nombre}</strong></p>
              )}
              {esAlquiler && (
                <div className="mt-1 space-y-0.5 text-xs">
                  <p>Fecha Salida: <strong>{safeDate(factura.fechaEntregaAlquiler || factura.fechaCreacion)}</strong></p>
                  {factura.fechaDevolucionPactada && (
                    <p className="font-bold text-rose-700">
                      Fecha Límite Devolución: {safeDate(factura.fechaDevolucionPactada, true)}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600">
                    Plazo: <strong className={estaEnMora ? "text-rose-700" : "text-emerald-700"}>{textoPlazoYDevolucion}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabla Completa de Ítems */}
          <table className="w-full text-xs mb-3">
            <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase">
              <tr>
                <th className="py-1.5 px-3 text-left w-12">Cant</th>
                <th className="py-1.5 px-3 text-left">
                  {esAlquiler ? "Tipo de Traje / Detalle" : (esApartado ? "Tipo de Traje / Separado" : "Descripción del Artículo o Servicio")}
                </th>
                <th className="py-1.5 px-3 text-right w-28">Precio Unitario</th>
                <th className="py-1.5 px-3 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {detalles.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1 px-3 text-center font-bold">{safeNumber(d.cantidad)}</td>
                  <td className="py-1 px-3">
                    <span className="font-bold text-slate-900">
                      {d.esServicioLibre
                        ? `[Arreglo] ${d.descripcionLibre || "Servicio"}`
                        : d.producto?.nombre || (esVenta ? "Artículo de Venta" : "Traje")}
                    </span>
                    {d.producto?.codigo && (
                      <span className="text-[10px] font-mono text-slate-500 ml-2">
                        [{d.producto.codigo}] {d.producto.talla ? `| Talla: ${d.producto.talla}` : ""}
                      </span>
                    )}
                    {d.descripcionDetallada?.trim() && (
                      <div className="text-[9.5px] text-slate-700 italic font-medium leading-normal mt-0.5 break-words whitespace-pre-wrap bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200">
                        <span className="font-bold text-slate-800 not-italic">Detalle / Modificaciones: </span>
                        {d.descripcionDetallada.trim()}
                      </div>
                    )}
                  </td>
                  <td className="py-1 px-3 text-right font-mono">{formatCOP(d.precioUnitario)}</td>
                  <td className="py-1 px-3 text-right font-mono font-bold">{formatCOP(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ========================================================================= */}
          {/* LIQUIDACIÓN SEGREGADA: ALQUILER vs APARTADO vs VENTA                      */}
          {/* ========================================================================= */}
          <div className="mb-3">
            {esAlquiler ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {/* COLUMNA 1: DEPÓSITO EN GARANTÍA (EN CUSTODIA) */}
                  <div className="p-3 bg-amber-50/70 border-2 border-amber-300 rounded-xl space-y-2 text-amber-950">
                    <p className="font-black text-xs uppercase border-b border-amber-300 pb-1 text-amber-950">
                      DEPÓSITO EN GARANTÍA (EN CUSTODIA)
                    </p>
                    <div className="flex justify-between font-bold text-xs">
                      <span>Depósito en Garantía ({metodoDepositoNombre}):</span>
                      <span className="font-mono font-black text-sm text-amber-900">{formatCOP(montoDepositoTotal)}</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-tight">
                      Custodia: Dinero en garantía a devolver al entregar las prendas completas.
                    </p>
                    <div className="p-2.5 bg-amber-100 rounded-lg border border-amber-300 mt-1">
                      <span className="font-black text-[11px] uppercase block text-amber-950">
                        Fecha Límite de Entrega Obligatoria:
                      </span>
                      <span className="font-mono text-rose-900 font-black text-sm block mt-0.5">
                        {factura.fechaDevolucionPactada
                          ? `${safeDate(factura.fechaDevolucionPactada)} hasta las 8:00 p.m. (20:00)`
                          : "SEGÚN CONTRATO"}
                      </span>
                    </div>
                  </div>

                  {/* COLUMNA 2: BLOQUE DERECHO DE COBRO ORGANIZADO */}
                  <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-1.5 text-slate-900">
                    <p className="font-black text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">
                      COBRO POR SERVICIO DE ALQUILER
                    </p>
                    <div className="flex justify-between font-bold text-xs">
                      <span>Total Valor Alquiler:</span>
                      <span className="font-mono font-black text-sm">{formatCOP(totalAlquilerBase)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-slate-800">
                      <span>Valor Total del Depósito:</span>
                      <span className="font-mono font-black text-sm">{formatCOP(montoDepositoTotal)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-slate-950 pt-1.5 border-t border-slate-300">
                      <span>Total Alquiler más Depósito:</span>
                      <span className="font-mono font-black text-base">{formatCOP(totalAlquilerBase + montoDepositoTotal)}</span>
                    </div>
                    {saldoPendienteAlquiler > 0 && (
                      <div className="flex justify-between font-black text-rose-700 pt-1 border-t border-slate-300 text-xs">
                        <span>Saldo Pendiente Alquiler:</span>
                        <span className="font-mono font-black">{formatCOP(saldoPendienteAlquiler)}</span>
                      </div>
                    )}
                    {vueltasCambioFinal > 0 && efectivoRecibidoCliente > totalPagadoFacturaHoy && (
                      <div className="flex justify-between text-slate-700 pt-1 border-t border-dashed border-slate-300 text-xs">
                        <span>Efectivo Recibido Cliente:</span>
                        <span className="font-mono font-bold">{formatCOP(efectivoRecibidoCliente)}</span>
                      </div>
                    )}
                    {vueltasCambioFinal > 0 && (
                      <div className="flex justify-between font-black text-emerald-800 pt-1 border-t border-slate-300 text-xs">
                        <span>Vueltos / Cambio Entregado:</span>
                        <span className="font-mono font-black">{formatCOP(vueltasCambioFinal)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BANNER OFICIAL DE OBSERVACIONES Y MORA (DEBAJO DEL CUADRO) */}
                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-center text-xs text-amber-950 my-1 w-full leading-relaxed space-y-1">
                  <p className="font-black uppercase tracking-wider text-[11px] text-amber-900 border-b border-amber-200 pb-0.5">OBSERVACIONES</p>
                  <p className="font-bold">
                    A partir del día siguiente de la fecha de entrega se descontará {formatCOP(tarifaMoraDiariaOficial)} pesos por día de mora del depósito en garantía.
                  </p>
                  {factura.observaciones && (
                    <p className="italic text-slate-800 pt-1 border-t border-amber-200">
                      Nota: {factura.observaciones}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* VENTA COMERCIAL: CELDA DIRECTA DE TOTALES (CERO SECCIÓN A, CERO SECCIÓN B) */
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 max-w-lg ml-auto space-y-1.5">
                <p className="font-black text-[10px] uppercase text-slate-900 border-b border-slate-300 pb-0.5">
                  TOTALES DE VENTA
                </p>
                <div className="flex justify-between text-sm font-black text-slate-950">
                  <span>Total Cobro de Venta:</span>
                  <span className="font-mono text-base">{formatCOP(totalOperacionPrincipal)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-800 font-bold">
                  <span>Cobro de Venta Recibido ({textoMedioPagoPrincipal}):</span>
                  <span className="font-mono text-sm">{formatCOP(totalAbonadoOperacion)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-700 pt-1 border-t border-dashed border-slate-300">
                  <span>Efectivo Recibido Cliente:</span>
                  <span className="font-mono">{formatCOP(efectivoRecibidoCliente)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-emerald-800 border-t border-slate-300 pt-1">
                  <span>Vueltas / Cambio Final Entregado:</span>
                  <span className="font-mono">{formatCOP(vueltasCambioFinal)}</span>
                </div>
                {saldoPendienteOperacion > 0 && (
                  <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1">
                    <span>Falta por pagar:</span>
                    <span className="text-rose-700">
                      {formatCOP(saldoPendienteOperacion)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Políticas y Firmas */}
        <div>
          {!esAlquiler && textoPoliticas && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 mb-3 leading-relaxed">
              <p className="font-bold uppercase text-[10px] text-slate-900 mb-0.5">NORMAS Y POLÍTICAS:</p>
              <p>{textoPoliticas}</p>
            </div>
          )}

          <div
            className="grid grid-cols-2 gap-10 text-center text-xs"
            style={{ marginTop: "44px", breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <div>
              <div className="w-64 border-t-2 border-slate-800 mx-auto mb-1.5"></div>
              <p className="font-bold text-slate-900">Firma del Cliente</p>
              <p className="text-[11px] text-slate-700 mt-0.5">C.C. / NIT: {cliente.documento || "____________________"}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                {esAlquiler ? "(Acepto estado de prendas y condiciones)" : "(Recibido a conformidad y aceptación de factura)"}
              </p>
            </div>
            <div>
              <div className="w-64 border-t-2 border-slate-800 mx-auto mb-1.5"></div>
              <p className="font-bold text-slate-900">Firma Vendedor / Cajero</p>
              <p className="text-[11px] text-slate-700 mt-0.5">
                {usuarioCajero?.nombre || "Atención en Mostrador"}
              </p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">
                Responsable de Emisión
              </p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 mt-3 font-mono">
            {empresa.piePaginaFactura || "Comprobante Oficial POS — Facturación y Control"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Control de Impresión Clara Antifatiga */}
      <div className="print:hidden bg-white text-slate-800 p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Impresión Documental — Factura {factura.numeroFactura || ""}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Formato seleccionado: <strong className="text-slate-800">{formato}</strong> — Coherencia 1:1 entre vista, impresión y PDF
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Selector de Formato con Botones Uniformes */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-1">
            <IconButtonTooltip
              icon={Receipt}
              label="Formato Tirilla Térmica (80mm)"
              active={formato === "TIRILLA"}
              variant={formato === "TIRILLA" ? "primary" : "neutral"}
              size="sm"
              onClick={() => cambiarFormato("TIRILLA")}
            />
            <IconButtonTooltip
              icon={Receipt}
              label="Formato Tirilla Térmica Compacta (58mm)"
              active={formato === "TIRILLA_58"}
              variant={formato === "TIRILLA_58" ? "primary" : "neutral"}
              size="sm"
              onClick={() => cambiarFormato("TIRILLA_58")}
            />
            <IconButtonTooltip
              icon={FileText}
              label="Formato Media Carta Individual"
              active={formato === "MEDIA_CARTA"}
              variant={formato === "MEDIA_CARTA" ? "primary" : "neutral"}
              size="sm"
              onClick={() => cambiarFormato("MEDIA_CARTA")}
            />
            <IconButtonTooltip
              icon={Scissors}
              label="Formato Media Carta Doble (2 en 1 Hoja Carta)"
              active={formato === "MEDIA_CARTA_DOBLE"}
              variant={formato === "MEDIA_CARTA_DOBLE" ? "primary" : "neutral"}
              size="sm"
              onClick={() => cambiarFormato("MEDIA_CARTA_DOBLE")}
            />
            <IconButtonTooltip
              icon={BookOpen}
              label="Formato Carta Completa Vertical"
              active={formato === "CARTA"}
              variant={formato === "CARTA" ? "primary" : "neutral"}
              size="sm"
              onClick={() => cambiarFormato("CARTA")}
            />
          </div>

          {/* Selector de Copias con Botones Uniformes (Oculto en formato doble ya que contiene 2 copias intrínsecas) */}
          {formato !== "MEDIA_CARTA_DOBLE" && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-1">
              <IconButtonTooltip
                icon={Copy}
                label="1 Copia: Original Cliente"
                active={numCopias === 1}
                variant={numCopias === 1 ? "indigo" : "neutral"}
                size="sm"
                onClick={() => cambiarNumCopias(1)}
              />
              <IconButtonTooltip
                icon={Copy}
                label="2 Copias: Original Cliente + Respaldo Tienda"
                active={numCopias === 2}
                variant={numCopias === 2 ? "indigo" : "neutral"}
                badgeCount={2}
                badgeVariant="blue"
                size="sm"
                onClick={() => cambiarNumCopias(2)}
              />
            </div>
          )}

          {/* Botón Descargar PDF */}
          <IconButtonTooltip
            icon={FileDown}
            label={`Descargar archivo PDF oficial (${formato}, ${numCopias} ${numCopias === 1 ? "copia" : "copias"})`}
            variant="primary"
            size="md"
            onClick={() => descargarPdfSegunFormato(datos, formato, undefined, { numCopias })}
          />

          {/* Botón Abrir / Ver PDF */}
          <IconButtonTooltip
            icon={ExternalLink}
            label="Abrir PDF en pestaña nueva"
            variant="neutral"
            size="md"
            onClick={() => abrirPdfMediaCarta(datos, formato, { numCopias })}
          />

          {/* Botón Imprimir Aislado en Iframe */}
          <IconButtonTooltip
            icon={Printer}
            label="Imprimir directamente en impresora física seleccionada"
            variant="emerald"
            size="md"
            onClick={imprimirDocumentoAislado}
          />

          {/* Botón Abrir Cajón Monedero */}
          <BotonAbrirCajon soloIcono={true} size="md" />

          {/* Botón Minimizar Ventana */}
          <BotonMinimizarVentana size="md" />

          {onCerrar && (
            <IconButtonTooltip
              icon={X}
              label="Cerrar vista de comprobante"
              variant="ghost"
              size="md"
              onClick={onCerrar}
            />
          )}
        </div>
      </div>

      {/* Área Imprimible Aislada */}
      <div
        ref={areaImprimibleRef}
        className="bg-slate-100/80 p-4 sm:p-6 rounded-2xl print:p-0 print:bg-white print:m-0 flex flex-col items-center border border-slate-200 shadow-2xs"
      >
        {formato === "MEDIA_CARTA_DOBLE" ? (
          renderDocumento("DOBLE")
        ) : (
          <>
            {renderDocumento(numCopias === 2 ? "EJEMPLAR 1: COPIA CLIENTE" : "COPIA CLIENTE")}

            {numCopias === 2 && (
              <>
                <div className="w-full my-6 border-t-2 border-dashed border-slate-400 text-center relative print:my-4">
                  <span className="bg-white px-3 py-0.5 text-[9px] uppercase font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300">
                    - - - - - LÍNEA DE CORTE (DIVISIÓN DE COPIAS) - - - - -
                  </span>
                </div>
                {renderDocumento("EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO")}
              </>
            )}
          </>
        )}
      </div>

      {/* Estilos CSS Globales @media print */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header,
          footer,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: ${formato === "TIRILLA_58"
          ? "2mm 1mm"
          : formato === "TIRILLA"
            ? "2mm 1mm"
            : formato === "MEDIA_CARTA"
              ? "6mm"
              : formato === "MEDIA_CARTA_DOBLE"
                ? "4mm"
                : "8mm"
        };
            size: ${formato === "TIRILLA_58"
          ? "58mm auto"
          : formato === "TIRILLA"
            ? "80mm auto"
            : formato === "MEDIA_CARTA"
              ? "215.9mm 139.7mm landscape"
              : "letter portrait"
        };
          }
        }
      `}</style>
    </div>
  );
}
