"use client";

import React, { useState } from "react";
import { Printer, Copy, FileText, CheckCircle2, X, FileDown, ExternalLink } from "lucide-react";
import { descargarPdfMediaCarta, abrirPdfMediaCarta } from "@/lib/pdf-media-carta";

export type FormatoImpresionTipo = "TIRILLA" | "MEDIA_CARTA" | "CARTA";

export interface DatosImpresionFactura {
  factura: {
    id: string;
    numeroFactura: string;
    fechaCreacion: string;
    fechaEntregaAlquiler?: string | null;
    fechaDevolucionPactada?: string | null;
    tipoOperacion: string;
    estado: string;
    subtotalProductos: number;
    subtotalArreglosLibres: number;
    recargoMoraAcumulado: number;
    totalFactura: number;
    totalAbonado: number;
    saldoPendiente: number;
    notas?: string | null;
    cliente: {
      nombre: string;
      documento: string;
      telefono?: string | null;
      direccion?: string | null;
    };
    usuarioCajero?: {
      nombre: string;
      username: string;
    };
    detalles: Array<{
      id: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      esServicioLibre: boolean;
      descripcionLibre?: string | null;
      producto?: {
        codigo: string;
        nombre: string;
        tipo?: string | null;
        talla?: string | null;
        color?: string | null;
      } | null;
    }>;
    abonos?: Array<{
      id: string;
      fecha: string;
      monto: number;
      metodoPago: string;
      referenciaComprobante?: string | null;
    }>;
  };
  empresa: {
    nombreComercial: string;
    nit: string;
    direccion: string;
    telefono: string;
    logoUrl?: string | null;
    politicasFactura?: string | null;
    formatoImpresionDefault?: FormatoImpresionTipo;
  };
}

interface PlantillaImpresionProps {
  datos: DatosImpresionFactura;
  onCerrar?: () => void;
}

export default function PlantillaImpresion({ datos, onCerrar }: PlantillaImpresionProps) {
  const { factura, empresa } = datos;
  // Formato predeterminado estricto: MEDIA_CARTA (Half Letter)
  const [formato, setFormato] = useState<FormatoImpresionTipo>("MEDIA_CARTA");
  const [numCopias, setNumCopias] = useState<1 | 2>(1);

  const ejecutarImpresion = () => {
    window.print();
  };

  // Renderizador de un documento individual
  const renderDocumento = (tipoCopiaTexto: string) => {
    // -------------------------------------------------------------
    // FORMATO 1: TIRILLA POS (80mm)
    // -------------------------------------------------------------
    if (formato === "TIRILLA") {
      return (
        <div className="w-[78mm] mx-auto p-2 bg-white text-black font-mono text-[11px] leading-tight select-none">
          {/* Cabecera Empresa */}
          <div className="text-center pb-2 border-b border-black space-y-0.5">
            {empresa.logoUrl && (
              <img
                src={empresa.logoUrl}
                alt={empresa.nombreComercial}
                className="max-h-12 mx-auto object-contain mb-1"
              />
            )}
            <h1 className="text-base font-black font-sans tracking-tight uppercase">
              {empresa.nombreComercial}
            </h1>
            <p className="font-bold">NIT: {empresa.nit}</p>
            <p className="text-[10px]">{empresa.direccion}</p>
            <p className="text-[10px]">Tel: {empresa.telefono}</p>
            <p className="text-[9px] uppercase font-bold pt-1">
              ** {tipoCopiaTexto} **
            </p>
          </div>

          {/* Datos Factura */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>FACTURA:</span>
              <strong className="font-sans text-xs">{factura.numeroFactura}</strong>
            </div>
            <div className="flex justify-between">
              <span>FECHA:</span>
              <span>{new Date(factura.fechaCreacion).toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between">
              <span>OPERACIÓN:</span>
              <span className="font-bold">{factura.tipoOperacion}</span>
            </div>
            <div className="flex justify-between">
              <span>CAJERO:</span>
              <span>{factura.usuarioCajero?.nombre || "Cajero Turno"}</span>
            </div>
          </div>

          {/* Datos Cliente */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <p>
              CLIENTE: <strong>{factura.cliente?.nombre}</strong>
            </p>
            <p>DOC / C.C: {factura.cliente?.documento}</p>
            {factura.cliente?.telefono && <p>TEL: {factura.cliente.telefono}</p>}
            {factura.cliente?.direccion && <p>DIR: {factura.cliente.direccion}</p>}
          </div>

          {/* Fechas de Alquiler */}
          {factura.fechaDevolucionPactada && (
            <div className="py-1.5 border-b border-dashed border-black text-[10px] bg-slate-50 p-1">
              <p className="font-bold">FECHA LÍMITE DE DEVOLUCIÓN:</p>
              <p className="font-sans font-extrabold text-xs">
                {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO")}
              </p>
            </div>
          )}

          {/* Tabla de Ítems */}
          <div className="py-2 border-b border-black">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-0.5">CANT</th>
                  <th className="text-left py-0.5">DESCRIPCIÓN</th>
                  <th className="text-right py-0.5">SUBT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-400">
                {factura.detalles.map((d, idx) => (
                  <tr key={idx}>
                    <td className="py-1 align-top">{d.cantidad}</td>
                    <td className="py-1 align-top pr-1">
                      {d.esServicioLibre
                        ? `[SASTRERÍA] ${d.descripcionLibre}`
                        : `${d.producto?.nombre} ${d.producto?.talla ? `[T:${d.producto.talla}]` : ""}`}
                    </td>
                    <td className="py-1 align-top text-right font-bold whitespace-nowrap">
                      ${d.subtotal.toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Liquidación de Totales */}
          <div className="py-2 border-b border-black space-y-0.5 text-right text-[11px]">
            <div className="flex justify-between">
              <span>SUBTOTAL PRENDAS:</span>
              <span>${factura.subtotalProductos.toLocaleString("es-CO")}</span>
            </div>
            {factura.subtotalArreglosLibres > 0 && (
              <div className="flex justify-between">
                <span>SUBTOTAL SASTRERÍA:</span>
                <span>${factura.subtotalArreglosLibres.toLocaleString("es-CO")}</span>
              </div>
            )}
            {factura.recargoMoraAcumulado > 0 && (
              <div className="flex justify-between font-bold">
                <span>RECARGO MORA:</span>
                <span>+${factura.recargoMoraAcumulado.toLocaleString("es-CO")}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-black">
              <span>TOTAL FACTURA:</span>
              <span>${factura.totalFactura.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TOTAL ABONADO:</span>
              <span>-${factura.totalAbonado.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-dashed border-black">
              <span>SALDO PENDIENTE:</span>
              <span>${factura.saldoPendiente.toLocaleString("es-CO")}</span>
            </div>
          </div>

          {/* Desglose de Abonos */}
          {factura.abonos && factura.abonos.length > 0 && (
            <div className="py-1.5 border-b border-dashed border-black text-[9px] space-y-0.5">
              <p className="font-bold uppercase">Abonos Registrados:</p>
              {factura.abonos.map((a, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {new Date(a.fecha).toLocaleDateString("es-CO")} ({a.metodoPago})
                  </span>
                  <span>${a.monto.toLocaleString("es-CO")}</span>
                </div>
              ))}
            </div>
          )}

          {/* Políticas de Alquiler */}
          {empresa.politicasFactura && (
            <div className="pt-2 text-[8px] text-center leading-normal">
              <p className="font-bold uppercase mb-0.5">TÉRMINOS Y CONDICIONES:</p>
              <p>{empresa.politicasFactura}</p>
            </div>
          )}

          <div className="pt-3 pb-1 text-center text-[9px] font-sans">
            <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="text-[8px] text-slate-500">Sistema POS Local LLANOMIO</p>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // FORMATO 2 & 3: MEDIA CARTA Y CARTA
    // -------------------------------------------------------------
    const esCartaCompleta = formato === "CARTA";

    return (
      <div
        className={`mx-auto p-6 bg-white text-black font-sans border border-slate-300 ${
          esCartaCompleta ? "max-w-[210mm] min-h-[270mm]" : "max-w-[210mm] min-h-[140mm]"
        }`}
      >
        {/* Cabecera Documental */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            {empresa.logoUrl && (
              <img
                src={empresa.logoUrl}
                alt={empresa.nombreComercial}
                className="max-h-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                {empresa.nombreComercial}
              </h1>
              <p className="text-xs font-bold text-slate-600">NIT: {empresa.nit}</p>
              <p className="text-xs text-slate-500">{empresa.direccion}</p>
              <p className="text-xs text-slate-500">Tel: {empresa.telefono}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="border-2 border-slate-900 rounded-xl p-3 bg-slate-50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                FACTURA COMERCIAL
              </span>
              <span className="text-lg font-black font-mono block text-slate-900">
                {factura.numeroFactura}
              </span>
              <span className="text-[10px] font-bold text-slate-700 uppercase mt-0.5 block">
                {tipoCopiaTexto}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fecha: {new Date(factura.fechaCreacion).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        {/* Ficha de Cliente y Operación */}
        <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="font-bold uppercase text-slate-500 text-[10px] mb-1">
              Información del Cliente:
            </p>
            <p className="font-bold text-slate-900 text-sm">{factura.cliente?.nombre}</p>
            <p>
              Documento: <span className="font-mono">{factura.cliente?.documento}</span>
            </p>
            {factura.cliente?.telefono && <p>Teléfono: {factura.cliente.telefono}</p>}
            {factura.cliente?.direccion && <p>Dirección: {factura.cliente.direccion}</p>}
          </div>

          <div className="space-y-1">
            <p className="font-bold uppercase text-slate-500 text-[10px] mb-1">
              Detalles de la Operación:
            </p>
            <p>
              Tipo de Operación: <strong className="uppercase">{factura.tipoOperacion}</strong>
            </p>
            <p>
              Estado de la Factura: <strong className="uppercase">{factura.estado}</strong>
            </p>
            {factura.fechaDevolucionPactada && (
              <p className="font-bold text-rose-700 bg-rose-50 p-1 rounded inline-block">
                Devolución Pactada: {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO")}
              </p>
            )}
            <p className="text-slate-500 text-[11px]">
              Cajero: {factura.usuarioCajero?.nombre}
            </p>
          </div>
        </div>

        {/* Tabla de Ítems */}
        <table className="w-full text-xs mb-3">
          <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase">
            <tr>
              <th className="py-1.5 px-2 text-left w-12">Cant</th>
              <th className="py-1.5 px-2 text-left w-20">Tipo</th>
              <th className="py-1.5 px-2 text-left">Descripción del Ítem / Prenda</th>
              <th className="py-1.5 px-2 text-right w-24">Precio Unit.</th>
              <th className="py-1.5 px-2 text-right w-24">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {factura.detalles.map((d, idx) => {
              const esAlquiler = d.producto?.tipo === "ALQUILER" || factura.tipoOperacion === "ALQUILER";
              const tipoTexto = d.esServicioLibre ? "SERVICIO" : esAlquiler ? "ALQUILER" : "VENTA";
              const tipoBadgeColor = d.esServicioLibre
                ? "bg-purple-100 text-purple-800 border-purple-200"
                : esAlquiler
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-blue-100 text-blue-800 border-blue-200";

              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 font-bold text-center align-top">{d.cantidad}</td>
                  <td className="py-1.5 px-2 align-top">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${tipoBadgeColor}`}>
                      {tipoTexto}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 align-top">
                    <p className="font-bold text-slate-900 text-xs">
                      {d.esServicioLibre
                        ? `[Arreglo de Sastrería] ${d.descripcionLibre}`
                        : d.producto?.nombre}
                    </p>
                    {d.producto?.codigo && (
                      <p className="text-[10px] font-mono text-slate-500">
                        Cód: {d.producto.codigo}{" "}
                        {d.producto.talla ? `| Talla: ${d.producto.talla}` : ""}
                        {d.producto.color ? ` | Color: ${d.producto.color}` : ""}
                      </p>
                    )}
                    {esAlquiler && factura.fechaDevolucionPactada && (
                      <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                        Devolución: {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono align-top text-xs">
                    ${d.precioUnitario.toLocaleString("es-CO")}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold align-top text-xs">
                    ${d.subtotal.toLocaleString("es-CO")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Liquidación de Totales */}
        <div className="flex justify-between items-start gap-4 border-t-2 border-slate-900 pt-2.5">
          <div className="max-w-md text-[10px] text-slate-600 space-y-1">
            {empresa.politicasFactura && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold uppercase text-[9px] text-slate-700 mb-0.5">
                  Términos y Políticas de Alquiler:
                </p>
                <p className="text-[9.5px] leading-tight text-slate-500">
                  {empresa.politicasFactura}
                </p>
              </div>
            )}
            <div className="pt-4 grid grid-cols-2 gap-4 text-center">
              <div className="border-t border-slate-400 pt-1 text-[9px]">
                Firma Autorizada LLANOMIO
              </div>
              <div className="border-t border-slate-400 pt-1 text-[9px]">
                Firma y Cédula del Cliente
              </div>
            </div>
          </div>

          <div className="w-68 space-y-1 text-xs font-mono">
            {/* Estado de Pago */}
            <div className="pb-1 mb-1 border-b border-slate-200 flex items-center justify-between">
              <span className="font-sans text-[11px] font-bold text-slate-600">Estado de Pago:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  factura.saldoPendiente <= 0
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : factura.totalAbonado > 0
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {factura.saldoPendiente <= 0
                  ? "PAGADO COMPLETO"
                  : factura.totalAbonado > 0
                  ? "CON ADELANTO"
                  : "PENDIENTE POR PAGAR"}
              </span>
            </div>

            <div className="flex justify-between text-[11px]">
              <span className="font-sans text-slate-500">Subtotal Prendas:</span>
              <span>${factura.subtotalProductos.toLocaleString("es-CO")}</span>
            </div>
            {factura.subtotalArreglosLibres > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="font-sans text-slate-500">Sastrería Libre:</span>
                <span>${factura.subtotalArreglosLibres.toLocaleString("es-CO")}</span>
              </div>
            )}
            {factura.recargoMoraAcumulado > 0 && (
              <div className="flex justify-between text-[11px] text-rose-700 font-bold">
                <span className="font-sans">Recargo de Mora:</span>
                <span>+${factura.recargoMoraAcumulado.toLocaleString("es-CO")}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-slate-900">
              <span>TOTAL FACTURA:</span>
              <span>${factura.totalFactura.toLocaleString("es-CO")}</span>
            </div>

            {/* Total Abonado y Método */}
            <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
              <span className="font-sans">
                Abono Recibido
                {factura.abonos && factura.abonos.length > 0
                  ? ` (${factura.abonos[0].metodoPago})`
                  : ""}:
              </span>
              <span>-${factura.totalAbonado.toLocaleString("es-CO")}</span>
            </div>

            {/* Saldo Pendiente */}
            <div className="flex justify-between text-xs font-black font-sans pt-1 p-1.5 rounded bg-slate-100 border border-slate-300">
              <span className="text-slate-900">SALDO PENDIENTE:</span>
              <span className="text-rose-600">${factura.saldoPendiente.toLocaleString("es-CO")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Control de Impresión (Se oculta en @media print) */}
      <div className="print:hidden bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">
              Impresión Documental — {factura.numeroFactura}
            </h2>
            <p className="text-xs text-slate-400">
              Seleccione el formato físico y la cantidad de copias deseadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Formato */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormato("TIRILLA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "TIRILLA" ? "bg-amber-500 text-white shadow-xs" : "text-slate-300 hover:text-white"
              }`}
            >
              Tirilla 80mm
            </button>
            <button
              type="button"
              onClick={() => setFormato("MEDIA_CARTA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "MEDIA_CARTA" ? "bg-amber-500 text-white shadow-xs" : "text-slate-300 hover:text-white"
              }`}
            >
              Media Carta
            </button>
            <button
              type="button"
              onClick={() => setFormato("CARTA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "CARTA" ? "bg-amber-500 text-white shadow-xs" : "text-slate-300 hover:text-white"
              }`}
            >
              Carta Completa
            </button>
          </div>

          {/* Selector de Copias */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setNumCopias(1)}
              className={`px-3 py-1.5 rounded-lg transition ${
                numCopias === 1 ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              1 Copia
            </button>
            <button
              type="button"
              onClick={() => setNumCopias(2)}
              className={`px-3 py-1.5 rounded-lg transition ${
                numCopias === 2 ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              2 Copias (Tienda + Cliente)
            </button>
          </div>

          {/* Botón Exportar PDF Media Carta */}
          <button
            type="button"
            onClick={() => descargarPdfMediaCarta(datos)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
            title="Descargar archivo PDF oficial en tamaño Media Carta"
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

          {/* Botón Abrir / Ver PDF */}
          <button
            type="button"
            onClick={() => abrirPdfMediaCarta(datos)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md transition"
            title="Abrir PDF en pestaña nueva para visualizar o imprimir con lector predeterminado"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver PDF</span>
          </button>

          {/* Botón Imprimir Nativo */}
          <button
            type="button"
            onClick={ejecutarImpresion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar vista de impresión"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Área Imprimible */}
      <div className="bg-slate-200 dark:bg-slate-900/60 p-4 sm:p-8 rounded-2xl print:p-0 print:bg-white print:m-0">
        {/* Copia 1: Original Cliente */}
        {renderDocumento("ORIGINAL CLIENTE")}

        {/* Copia 2: Copia Tienda (si está seleccionada) */}
        {numCopias === 2 && (
          <>
            <div className="my-6 border-t-2 border-dashed border-slate-400 text-center relative print:my-4">
              <span className="bg-white px-3 py-0.5 text-[9px] uppercase font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300">
                Cortar aquí (Línea de División)
              </span>
            </div>
            {renderDocumento("COPIA ARCHIVO TIENDA")}
          </>
        )}
      </div>

      {/* Estilos CSS Nativos @media print */}
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
            margin: ${formato === "TIRILLA" ? "2mm" : formato === "MEDIA_CARTA" ? "6mm" : "10mm"};
            size: ${formato === "MEDIA_CARTA" ? "landscape" : "auto"};
          }
        }
      `}</style>
    </div>
  );
}
