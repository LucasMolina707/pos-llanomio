"use client";

import React, { useState, useRef } from "react";
import { Printer, FileText, CheckCircle2, X, FileDown, ExternalLink } from "lucide-react";
import {
  descargarPdfMediaCarta,
  abrirPdfMediaCarta,
  descargarPdfSegunFormato,
} from "@/lib/pdf-media-carta";

export type FormatoImpresionTipo = "TIRILLA" | "MEDIA_CARTA" | "CARTA";

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
    montoDeposito?: number;
    estadoDeposito?: string;
    montoRetenidoDeposito?: number;
    montoDevueltoDeposito?: number;
    motivoRetencionDeposito?: string | null;
    metodoPagoDeposito?: string | null;
    notas?: string | null;
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

interface PlantillaImpresionProps {
  datos: DatosImpresionFactura;
  onCerrar?: () => void;
}

export default function PlantillaImpresion({ datos, onCerrar }: PlantillaImpresionProps) {
  const { factura, empresa } = datos;
  // Formato activo sincronizado 1:1 entre vista, iframe de impresión y descarga PDF
  const [formato, setFormato] = useState<FormatoImpresionTipo>(
    empresa.formatoPredeterminado || empresa.formatoImpresionDefault || "MEDIA_CARTA"
  );
  const [numCopias, setNumCopias] = useState<1 | 2>(1);
  const areaImprimibleRef = useRef<HTMLDivElement>(null);

  /**
   * Imprime exclusivamente el documento generado dentro de un iframe aislado,
   * aplicando reglas CSS @page geométricas exactas para TIRILLA (80mm),
   * MEDIA CARTA (215.9mm x 139.7mm) y CARTA (letter portrait con max-height 258mm
   * anti-hoja en blanco).
   */
  const imprimirDocumentoAislado = () => {
    const contenedor = areaImprimibleRef.current;
    if (!contenedor) {
      window.print();
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
      window.print();
      return;
    }

    // Reglas CSS específicas por formato físico
    let pageCss = "";
    if (formato === "TIRILLA") {
      pageCss = `
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        html, body {
          width: 80mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: white !important;
          color: black !important;
        }
        body {
          width: 76mm !important;
          margin: 0 auto !important;
          padding: 2mm 1mm !important;
        }
      `;
    } else if (formato === "MEDIA_CARTA") {
      pageCss = `
        @page {
          size: 215.9mm 139.7mm landscape;
          margin: 6mm;
        }
        html, body {
          width: 100%;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          color: black !important;
          overflow: hidden !important;
        }
        .hoja-media-carta-impresion {
          width: 100%;
          max-height: 127mm !important;
          box-sizing: border-box;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          break-after: avoid !important;
          break-inside: avoid !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    } else {
      // FORMATO CARTA COMPLETA: Solución Quirúrgica Anti-Hoja en Blanco
      pageCss = `
        @page {
          size: letter portrait;
          margin: 8mm;
        }
        html, body {
          width: 100%;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          color: black !important;
          overflow: hidden !important;
        }
        .hoja-carta-impresion {
          width: 100%;
          max-height: 258mm !important;
          box-sizing: border-box;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          break-after: avoid !important;
          break-inside: avoid !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    }

    // Copiar estilos CSS cargados en el documento
    const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    const htmlDocumento = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Factura ${factura.numeroFactura} - LLANOMIO</title>
        ${styleTags}
        <style>
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          ${pageCss}
          .no-print {
            display: none !important;
          }
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

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Error al disparar impresión en iframe:", err);
        window.print();
      }
    }, 350);
  };

  // Renderizador individual de documento según el formato seleccionado
  const renderDocumento = (tipoCopiaTexto: string) => {
    const esPazYSalvo = factura.saldoPendiente <= 0;
    const mostrarCajero = empresa.mostrarVendedorFactura !== false && factura.usuarioCajero?.nombre;

    // -------------------------------------------------------------
    // FORMATO 1: TIRILLA POS TÉRMICA (80mm)
    // -------------------------------------------------------------
    if (formato === "TIRILLA") {
      return (
        <div className="w-[80mm] max-w-[80mm] min-w-[80mm] mx-auto p-3 bg-white text-black font-mono text-[11px] leading-tight select-none shadow-md border border-slate-300">
          {/* Cabecera Empresa */}
          <div className="text-center pb-2 border-b border-black space-y-0.5">
            {empresa.logoUrl && (
              <img
                src={empresa.logoUrl}
                alt={empresa.nombreComercial}
                className="max-h-14 mx-auto object-contain mb-1.5"
              />
            )}
            <h1 className="text-sm font-black font-sans tracking-tight uppercase">
              {empresa.nombreComercial}
            </h1>
            {empresa.eslogan && (
              <p className="text-[9.5px] italic font-sans text-slate-700">{empresa.eslogan}</p>
            )}
            <p className="font-bold">NIT: {empresa.nit}</p>
            {empresa.regimenFiscal && (
              <p className="text-[9px] uppercase">{empresa.regimenFiscal}</p>
            )}
            <p className="text-[10px]">{empresa.direccion}</p>
            <p className="text-[10px]">Tel: {empresa.telefono}</p>
            <p className="text-[9px] uppercase font-bold pt-1 text-slate-800">
              ** {tipoCopiaTexto} **
            </p>
          </div>

          {/* Datos Factura */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <div className="flex justify-between font-bold">
              <span>
                {factura.tipoOperacion === "ALQUILER"
                  ? (esPazYSalvo ? "PAZ Y SALVO ALQUILER:" : "CONTRATO ALQUILER:")
                  : "FACTURA:"}
              </span>
              <span>{factura.numeroFactura}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA EMISIÓN:</span>
              <span>{new Date(factura.fechaCreacion).toLocaleDateString("es-CO")}</span>
            </div>
            <div className="flex justify-between">
              <span>OPERACIÓN:</span>
              <span className="uppercase font-semibold">{factura.tipoOperacion}</span>
            </div>
            {mostrarCajero && (
              <div className="flex justify-between">
                <span>CAJERO:</span>
                <span className="font-semibold">{factura.usuarioCajero?.nombre}</span>
              </div>
            )}
          </div>

          {/* Datos Cliente */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <p className="font-bold uppercase text-[9px] text-slate-600">CLIENTE:</p>
            {factura.cliente.esResponsableIVA ? (
              <>
                <p className="font-bold text-[11px] font-sans">
                  {(factura.cliente.razonSocial || factura.cliente.nombre).toUpperCase()}
                </p>
                <p>
                  {factura.cliente.tipoIdentificacion || "NIT"}: {factura.cliente.documento}
                  {factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : ""}
                </p>
                <p>RESP. FISCAL: {factura.cliente.responsabilidadFiscal || "O-48"}</p>
                {factura.cliente.email && <p>EMAIL: {factura.cliente.email}</p>}
                {factura.cliente.direccion && (
                  <p>
                    DIR: {factura.cliente.direccion}
                    {factura.cliente.municipio ? ` — ${factura.cliente.municipio}` : ""}
                  </p>
                )}
                {factura.cliente.telefono && <p>TEL. 1°: {factura.cliente.telefono}</p>}
                {factura.cliente.telefonoSecundario && <p>TEL. 2°: {factura.cliente.telefonoSecundario}</p>}
              </>
            ) : (
              <>
                <p className="font-bold text-[11px] font-sans">{factura.cliente.nombre.toUpperCase()}</p>
                <p>DOC: {factura.cliente.documento}</p>
                {factura.cliente.telefono && <p>TEL. 1°: {factura.cliente.telefono}</p>}
                {factura.cliente.telefonoSecundario && <p>TEL. 2°: {factura.cliente.telefonoSecundario}</p>}
                {factura.cliente.direccion && <p>DIR: {factura.cliente.direccion}</p>}
              </>
            )}
          </div>

          {/* Fechas de Alquiler */}
          {factura.tipoOperacion === "ALQUILER" && (
            <div className="py-1.5 border-b border-dashed border-black text-[9.5px] space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold">FECHA SALIDA:</span>
                <span>{new Date(factura.fechaEntregaAlquiler || factura.fechaCreacion).toLocaleDateString("es-CO")}</span>
              </div>
              {factura.fechaDevolucionPactada && (
                <div className="flex justify-between font-bold text-rose-800">
                  <span>LÍMITE DEVOLUCIÓN:</span>
                  <span>
                    {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              )}
              {factura.fechaDevolucionReal && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>DEVUELTO EL:</span>
                  <span>
                    {new Date(factura.fechaDevolucionReal).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tabla de Ítems */}
          <div className="py-2 border-b border-black text-[10px]">
            <div className="flex justify-between font-bold pb-1 border-b border-black text-[9px]">
              <span>CANT  DESCRIPCIÓN</span>
              <span>SUBTOTAL</span>
            </div>
            <div className="divide-y divide-slate-200 space-y-1 pt-1">
              {factura.detalles.map((d, idx) => (
                <div key={idx} className="pt-1">
                  <div className="flex justify-between font-sans text-[10.5px]">
                    <span className="font-bold">
                      {d.cantidad}x{" "}
                      {d.esServicioLibre
                        ? `[Arreglo] ${d.descripcionLibre || "Servicio"}`
                        : d.producto?.nombre}
                    </span>
                    <span className="font-mono font-bold">
                      ${d.subtotal.toLocaleString("es-CO")}
                    </span>
                  </div>
                  {d.producto?.codigo && (
                    <p className="text-[9px] text-slate-600">
                      Cód: {d.producto.codigo} {d.producto.talla ? `| T: ${d.producto.talla}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="py-2 border-b border-black space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>
                ${(factura.subtotalProductos + factura.subtotalArreglosLibres).toLocaleString("es-CO")}
              </span>
            </div>
            {factura.recargoMoraAcumulado > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Recargo Mora:</span>
                <span>+${factura.recargoMoraAcumulado.toLocaleString("es-CO")}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-black">
              <span>TOTAL FACTURA:</span>
              <span>${factura.totalFactura.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800">
              <span>TOTAL ABONADO:</span>
              <span>-${factura.totalAbonado.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-dashed border-black">
              <span>SALDO PENDIENTE:</span>
              <span className={esPazYSalvo ? "text-emerald-700" : "text-rose-700"}>
                {esPazYSalvo ? "$0 (PAZ Y SALVO)" : `$${factura.saldoPendiente.toLocaleString("es-CO")}`}
              </span>
            </div>
          </div>

          {/* Depósito en Garantía en Tirilla */}
          {(factura.tipoOperacion === "ALQUILER" || (factura.montoDeposito !== undefined && factura.montoDeposito > 0)) && (
            <div className="py-2 border-b border-black space-y-0.5 text-[9.5px]">
              <div className="flex justify-between font-bold">
                <span>DEPÓSITO EN GARANTÍA:</span>
                <span>${(factura.montoDeposito || 0).toLocaleString("es-CO")}</span>
              </div>
              <p className="text-[8.5px] text-slate-800">
                Estado:{" "}
                <strong>
                  {factura.estadoDeposito === "DEVUELTO_COMPLETO"
                    ? `Devuelto 100% al cliente ($${(factura.montoDevueltoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")})`
                    : factura.estadoDeposito === "RETENIDO_PARCIAL"
                    ? `Retenido por daño: $${(factura.montoRetenidoDeposito || 0).toLocaleString("es-CO")} | Devuelto: $${(factura.montoDevueltoDeposito || 0).toLocaleString("es-CO")}${factura.motivoRetencionDeposito ? ` (${factura.motivoRetencionDeposito})` : ""}`
                    : factura.estadoDeposito === "RETENIDO_TOTAL"
                    ? `Retenido 100% por daño total / reposición${factura.motivoRetencionDeposito ? ` (${factura.motivoRetencionDeposito})` : ""}`
                    : "En custodia — Reembolsable al devolver sin novedades"}
                </strong>
              </p>
            </div>
          )}

          {/* Desglose de Abonos */}
          {factura.abonos && factura.abonos.length > 0 && (
            <div className="py-1.5 border-b border-dashed border-black text-[9px] space-y-0.5">
              <p className="font-bold uppercase">Historial de Pagos:</p>
              {factura.abonos.map((a, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>
                      {new Date(a.fecha).toLocaleDateString("es-CO")} ({a.metodoPago})
                    </span>
                    <span className="font-bold">${a.monto.toLocaleString("es-CO")}</span>
                  </div>
                  {a.montoRecibido && a.montoRecibido > 0 && (
                    <div className="flex justify-between text-[8.5px] text-slate-700 pl-2">
                      <span>Recibió: ${a.montoRecibido.toLocaleString("es-CO")}</span>
                      <span>Cambio: ${(a.vueltasEntregadas || 0).toLocaleString("es-CO")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Requisitos y Políticas */}
          {empresa.politicasFactura && (
            <div className="pt-2 text-[8.5px] text-center leading-normal text-slate-700">
              <p className="font-bold uppercase mb-0.5">TÉRMINOS Y CONDICIONES:</p>
              <p>{empresa.politicasFactura}</p>
            </div>
          )}

          <div className="pt-3 pb-1 text-center text-[9px] font-sans">
            <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="text-[8px] text-slate-500">
              {empresa.piePaginaFactura || "Sistema POS Local LLANOMIO — Cero QR"}
            </p>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // FORMATO 2: MEDIA CARTA (Half Letter Landscape: 215.9mm x 139.7mm)
    // -------------------------------------------------------------
    if (formato === "MEDIA_CARTA") {
      return (
        <div className="hoja-media-carta-impresion w-full max-w-[215.9mm] mx-auto p-4 sm:p-5 bg-white text-black font-sans border border-slate-300 shadow-md rounded-xl text-xs flex flex-col justify-between">
          <div>
            {/* Cabecera Documental */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 mb-2.5">
              <div className="flex items-center gap-3">
                {empresa.logoUrl && (
                  <img
                    src={empresa.logoUrl}
                    alt={empresa.nombreComercial}
                    className="max-h-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                    {empresa.nombreComercial}
                  </h1>
                  {empresa.eslogan && (
                    <p className="text-[10px] text-slate-600 italic font-semibold">
                      {empresa.eslogan}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-slate-700">
                    NIT: {empresa.nit} {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                  </p>
                  <p className="text-[10.5px] text-slate-500">{empresa.direccion} — {empresa.ciudad || "Villavicencio, Meta"}</p>
                  <p className="text-[10.5px] text-slate-500">
                    Tel: {empresa.telefono} {empresa.email ? `| ${empresa.email}` : ""}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`border-2 rounded-xl p-2.5 ${
                    esPazYSalvo
                      ? "border-emerald-600 bg-emerald-50/60"
                      : "border-slate-900 bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider block ${
                      esPazYSalvo ? "text-emerald-700 font-black" : "text-slate-500"
                    }`}
                  >
                    {factura.tipoOperacion === "ALQUILER"
                      ? (esPazYSalvo
                          ? "PAZ Y SALVO DE ALQUILER"
                          : "CONTRATO / FACTURA DE ALQUILER")
                      : (esPazYSalvo
                          ? "COMPROBANTE DE PAGO FINAL (PAZ Y SALVO)"
                          : "FACTURA COMERCIAL")}
                  </span>
                  <span className="text-base font-black font-mono block text-slate-900">
                    {factura.numeroFactura}
                  </span>
                  <span className="text-[9px] font-bold text-slate-700 uppercase mt-0.5 block">
                    {tipoCopiaTexto}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Fecha: {new Date(factura.fechaCreacion).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>

            <div className="mb-2 px-3 py-1 rounded-lg bg-emerald-600 text-white flex items-center justify-between text-xs font-black shadow-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>
                  {factura.tipoOperacion === "ALQUILER"
                    ? "COMPROBANTE OFICIAL DE ALQUILER — LLANOMIO"
                    : "PAZ Y SALVO — FACTURA Y PRENDAS AL DÍA (SALDO $0)"}
                </span>
              </div>
              <span className="bg-emerald-700 px-2 py-0.5 rounded text-[10px] font-mono">
                {esPazYSalvo ? "SALDO: $0" : `SALDO: $${factura.saldoPendiente.toLocaleString("es-CO")}`}
              </span>
            </div>

            {/* Ficha Cliente & Operación */}
            <div className="grid grid-cols-2 gap-3 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="font-bold uppercase text-slate-500 text-[9.5px]">CLIENTE:</p>
                {factura.cliente.esResponsableIVA ? (
                  <>
                    <p className="font-bold text-slate-900 text-xs">
                      {(factura.cliente.razonSocial || factura.cliente.nombre).toUpperCase()}
                    </p>
                    <p className="text-[11px]">
                      {factura.cliente.tipoIdentificacion || "NIT"}:{" "}
                      <span className="font-mono font-bold">
                        {factura.cliente.documento}
                        {factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : ""}
                      </span>
                    </p>
                    <p className="text-[10.5px]">
                      Resp. Fiscal:{" "}
                      <span className="font-semibold text-slate-800">
                        {factura.cliente.responsabilidadFiscal || "O-48"}
                      </span>
                    </p>
                    {factura.cliente.email && (
                      <p className="text-[10.5px] truncate">Email: {factura.cliente.email}</p>
                    )}
                    {factura.cliente.direccion && (
                      <p className="text-[10px] truncate">
                        Dir: {factura.cliente.direccion} — {factura.cliente.municipio || "Villavicencio"} (DANE:{" "}
                        {factura.cliente.codigoDaneMunicipio || "50001"})
                      </p>
                    )}
                    {factura.cliente.telefono && (
                      <p className="text-[10.5px]">Tel. 1°: <span className="font-mono">{factura.cliente.telefono}</span></p>
                    )}
                    {factura.cliente.telefonoSecundario && (
                      <p className="text-[10.5px]">Tel. 2°: <span className="font-mono">{factura.cliente.telefonoSecundario}</span></p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-xs">{factura.cliente.nombre.toUpperCase()}</p>
                    <p className="text-[11px]">
                      Cédula / NIT: <span className="font-mono">{factura.cliente.documento}</span>
                    </p>
                    {factura.cliente.telefono && <p className="text-[11px]">Tel. 1°: <span className="font-mono">{factura.cliente.telefono}</span></p>}
                    {factura.cliente.telefonoSecundario && <p className="text-[11px]">Tel. 2°: <span className="font-mono">{factura.cliente.telefonoSecundario}</span></p>}
                    {factura.cliente.direccion && <p className="text-[10.5px]">Dir: {factura.cliente.direccion}</p>}
                  </>
                )}
              </div>

              <div>
                <p className="font-bold uppercase text-slate-500 text-[9.5px]">OPERACIÓN:</p>
                <p className="text-[11px]">
                  Tipo: <strong className="uppercase">{factura.tipoOperacion}</strong> | Estado: <strong className="uppercase">{factura.estado}</strong>
                </p>
                {mostrarCajero && (
                  <p className="text-[11px] text-slate-600">
                    Cajero: <strong>{factura.usuarioCajero?.nombre}</strong>
                  </p>
                )}
                {factura.tipoOperacion === "ALQUILER" && (
                  <div className="mt-1 pt-1 border-t border-slate-200 text-[10.5px] space-y-0.5">
                    <p>
                      Fecha Salida: <strong>{new Date(factura.fechaEntregaAlquiler || factura.fechaCreacion).toLocaleDateString("es-CO")}</strong>
                    </p>
                    {factura.fechaDevolucionPactada && (
                      <p className="font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                        Límite Devolución: {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    )}
                    {factura.fechaDevolucionReal && (
                      <p className="font-bold text-emerald-700">
                        Devuelto el: {new Date(factura.fechaDevolucionReal).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recuadro Depósito en Garantía para Media Carta */}
            {(factura.tipoOperacion === "ALQUILER" || (factura.montoDeposito !== undefined && factura.montoDeposito > 0)) && (
              <div className="p-2 mb-2 bg-amber-50/80 rounded-xl border border-amber-300 text-xs">
                <div className="flex justify-between items-center font-bold text-amber-950">
                  <span>DEPÓSITO EN GARANTÍA (POR DAÑOS / PÉRDIDAS):</span>
                  <span className="font-mono text-sm">${(factura.montoDeposito || 0).toLocaleString("es-CO")}</span>
                </div>
                <div className="text-[10px] text-amber-900 mt-0.5">
                  <span>Estado: </span>
                  <strong>
                    {factura.estadoDeposito === "DEVUELTO_COMPLETO"
                      ? `DEVUELTO 100% AL CLIENTE ($${(factura.montoDevueltoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")})`
                      : factura.estadoDeposito === "RETENIDO_PARCIAL"
                      ? `RETENCIÓN PARCIAL: $${(factura.montoRetenidoDeposito || 0).toLocaleString("es-CO")} retenido por daño / $${(factura.montoDevueltoDeposito || 0).toLocaleString("es-CO")} devuelto${factura.motivoRetencionDeposito ? ` — Motivo: ${factura.motivoRetencionDeposito}` : ""}`
                      : factura.estadoDeposito === "RETENIDO_TOTAL"
                      ? `RETENCIÓN TOTAL POR DAÑO / PÉRDIDA${factura.motivoRetencionDeposito ? ` — Motivo: ${factura.motivoRetencionDeposito}` : ""}`
                      : "EN CUSTODIA (Reembolsable al devolver prendas sin novedades)"}
                  </strong>
                </div>
              </div>
            )}

            {/* Tabla de Ítems */}
            <table className="w-full text-xs mb-2">
              <thead className="bg-slate-900 text-white text-[9.5px] font-bold uppercase">
                <tr>
                  <th className="py-1 px-2 text-left w-10">Cant</th>
                  <th className="py-1 px-2 text-left w-16">Tipo</th>
                  <th className="py-1 px-2 text-left">Descripción del Ítem / Prenda</th>
                  <th className="py-1 px-2 text-right w-20">Valor Unit.</th>
                  <th className="py-1 px-2 text-right w-20">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {factura.detalles.slice(0, 5).map((d, idx) => {
                  const esAlq = d.producto?.tipo === "ALQUILER" || factura.tipoOperacion === "ALQUILER";
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1 px-2 text-center font-bold">{d.cantidad}</td>
                      <td className="py-1 px-2">
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase bg-slate-100 text-slate-800 border">
                          {d.esServicioLibre ? "SERVICIO" : esAlq ? "ALQUILER" : "VENTA"}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="font-bold text-slate-900">
                          {d.esServicioLibre
                            ? `[Arreglo] ${d.descripcionLibre || "Servicio de Sastrería"}`
                            : d.producto?.nombre}
                        </span>
                        {d.producto?.codigo && (
                          <span className="text-[9.5px] font-mono text-slate-500 ml-1.5">
                            [{d.producto.codigo}]
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-right font-mono">${d.precioUnitario.toLocaleString("es-CO")}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">${d.subtotal.toLocaleString("es-CO")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pie Media Carta: Políticas & Totales lado a lado */}
          <div className="flex justify-between items-start gap-4 border-t-2 border-slate-900 pt-2">
            <div className="flex-1 text-[9.5px] text-slate-600 space-y-1.5">
              {empresa.politicasFactura && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold uppercase text-[8.5px] text-slate-700 mb-0.5">
                    TÉRMINOS Y POLÍTICAS DE ALQUILER:
                  </p>
                  <p className="text-[9px] leading-tight text-slate-500 line-clamp-3">
                    {empresa.politicasFactura}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-center pt-2">
                <div className="border-t border-slate-400 pt-0.5 text-[8.5px]">
                  Firma Autorizada LLANOMIO
                </div>
                <div className="border-t border-slate-400 pt-0.5 text-[8.5px]">
                  Firma y Cédula del Cliente
                </div>
              </div>
            </div>

            <div className="w-60 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-[11px]">
                <span className="font-sans text-slate-500">Subtotal:</span>
                <span>${(factura.subtotalProductos + factura.subtotalArreglosLibres).toLocaleString("es-CO")}</span>
              </div>
              {factura.recargoMoraAcumulado > 0 && (
                <div className="flex justify-between text-[11px] text-rose-700 font-bold">
                  <span className="font-sans">Recargo Mora:</span>
                  <span>+${factura.recargoMoraAcumulado.toLocaleString("es-CO")}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-slate-900">
                <span>TOTAL FACTURA:</span>
                <span>${factura.totalFactura.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                <span className="font-sans">Total Abonado:</span>
                <span>-${factura.totalAbonado.toLocaleString("es-CO")}</span>
              </div>
              <div
                className={`flex justify-between text-xs font-black font-sans pt-1 p-1.5 rounded border ${
                  esPazYSalvo
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-rose-600 border-slate-300"
                }`}
              >
                <span>SALDO:</span>
                <span>
                  {esPazYSalvo ? "$0 (PAZ Y SALVO)" : `$${factura.saldoPendiente.toLocaleString("es-CO")}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // FORMATO 3: CARTA COMPLETA (Letter Portrait: 215.9mm x 279.4mm)
    // -------------------------------------------------------------
    return (
      <div className="hoja-carta-impresion w-full max-w-[215.9mm] min-h-[255mm] max-h-[258mm] mx-auto p-6 sm:p-7 bg-white text-black font-sans border border-slate-300 shadow-md rounded-2xl text-xs flex flex-col justify-between box-border">
        <div>
          {/* Cabecera Documental Carta */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center gap-4">
              {empresa.logoUrl && (
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nombreComercial}
                  className="max-h-20 object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                  {empresa.nombreComercial}
                </h1>
                {empresa.eslogan && (
                  <p className="text-xs text-slate-600 italic font-semibold">
                    {empresa.eslogan}
                  </p>
                )}
                <p className="text-xs font-bold text-slate-700">
                  NIT: {empresa.nit} {empresa.regimenFiscal ? `| ${empresa.regimenFiscal}` : ""}
                </p>
                <p className="text-xs text-slate-500">{empresa.direccion} — {empresa.ciudad || "Villavicencio, Meta"}</p>
                <p className="text-xs text-slate-500">
                  Teléfono / WhatsApp: {empresa.telefono} {empresa.email ? `| ${empresa.email}` : ""}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`border-2 rounded-xl p-3 ${
                  esPazYSalvo
                    ? "border-emerald-600 bg-emerald-50/70"
                    : "border-slate-900 bg-slate-50"
                }`}
              >
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider block ${
                    esPazYSalvo ? "text-emerald-700 font-black" : "text-slate-500"
                  }`}
                >
                  {factura.tipoOperacion === "ALQUILER"
                    ? (esPazYSalvo
                        ? "PAZ Y SALVO DE ALQUILER"
                        : "CONTRATO / FACTURA DE ALQUILER")
                    : (esPazYSalvo
                        ? "COMPROBANTE DE PAGO FINAL (PAZ Y SALVO)"
                        : "FACTURA COMERCIAL")}
                </span>
                <span className="text-lg font-black font-mono block text-slate-900">
                  {factura.numeroFactura}
                </span>
                <span className="text-[10px] font-bold text-slate-700 uppercase mt-0.5 block">
                  {tipoCopiaTexto}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fecha Emisión: {new Date(factura.fechaCreacion).toLocaleDateString("es-CO")}
              </p>
            </div>
          </div>

          {/* Sello Paz y Salvo Carta */}
          {esPazYSalvo && (
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white flex items-center justify-between text-xs font-black shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>FACTURA PAGADA AL 100% — PAZ Y SALVO DE OBLIGACIÓN</span>
              </div>
              <span className="bg-emerald-700 px-2 py-0.5 rounded text-[11px] font-mono">
                SALDO TOTAL: $0
              </span>
            </div>
          )}

          {/* Ficha Cliente y Operación */}
          <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="font-bold uppercase text-slate-500 text-[10px] mb-1">
                Información del Cliente / Adquiriente:
              </p>
              {factura.cliente.esResponsableIVA ? (
                <>
                  <p className="font-bold text-slate-900 text-sm">
                    {(factura.cliente.razonSocial || factura.cliente.nombre).toUpperCase()}
                  </p>
                  <p>
                    {factura.cliente.tipoIdentificacion || "NIT"}:{" "}
                    <span className="font-mono font-bold">
                      {factura.cliente.documento}
                      {factura.cliente.digitoVerificacion ? `-${factura.cliente.digitoVerificacion}` : ""}
                    </span>
                  </p>
                  <p>
                    Responsabilidad Fiscal:{" "}
                    <span className="font-semibold">{factura.cliente.responsabilidadFiscal || "O-48"}</span>
                  </p>
                  {factura.cliente.email && <p>Correo Electrónico: {factura.cliente.email}</p>}
                  {factura.cliente.direccion && (
                    <p>
                      Dirección Fiscal: {factura.cliente.direccion} — {factura.cliente.municipio || "Villavicencio - Meta"}{" "}
                      (Código DANE: {factura.cliente.codigoDaneMunicipio || "50001"})
                    </p>
                  )}
                  {factura.cliente.telefono && <p>Tel. 1°: {factura.cliente.telefono}</p>}
                  {factura.cliente.telefonoSecundario && <p>Tel. 2°: {factura.cliente.telefonoSecundario}</p>}
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-900 text-sm">{factura.cliente.nombre.toUpperCase()}</p>
                  <p>
                    Cédula / NIT: <span className="font-mono">{factura.cliente.documento}</span>
                  </p>
                  {factura.cliente.telefono && <p>Tel. 1°: {factura.cliente.telefono}</p>}
                  {factura.cliente.telefonoSecundario && <p>Tel. 2°: {factura.cliente.telefonoSecundario}</p>}
                  {factura.cliente.direccion && <p>Dirección: {factura.cliente.direccion}</p>}
                </>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-bold uppercase text-slate-500 text-[10px] mb-1">
                Detalles de la Operación Comercial:
              </p>
              <p>
                Tipo de Operación: <strong className="uppercase">{factura.tipoOperacion}</strong>
              </p>
              <p>
                Estado de la Factura: <strong className="uppercase">{factura.estado}</strong>
              </p>
              {mostrarCajero && (
                <p className="text-slate-600">
                  Atendido por Cajero: <strong>{factura.usuarioCajero?.nombre}</strong>
                </p>
              )}
              {factura.tipoOperacion === "ALQUILER" && (
                <div className="mt-1 pt-1 border-t border-slate-200 text-xs space-y-0.5">
                  <p>
                    Fecha Salida: <strong>{new Date(factura.fechaEntregaAlquiler || factura.fechaCreacion).toLocaleDateString("es-CO")}</strong>
                  </p>
                  {factura.fechaDevolucionPactada && (
                    <p className="font-bold text-rose-700 bg-rose-50 p-1 rounded inline-block text-xs">
                      Límite Devolución: {new Date(factura.fechaDevolucionPactada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                  {factura.fechaDevolucionReal && (
                    <p className="font-bold text-emerald-700 ml-2 inline-block">
                      Devuelto el: {new Date(factura.fechaDevolucionReal).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recuadro Depósito en Garantía para Carta */}
          {(factura.tipoOperacion === "ALQUILER" || (factura.montoDeposito !== undefined && factura.montoDeposito > 0)) && (
            <div className="mb-3 p-2.5 bg-amber-50/80 rounded-xl border border-amber-300 text-xs">
              <div className="flex justify-between items-center font-bold text-amber-950">
                <span>DEPÓSITO EN GARANTÍA (RESPALDO POR DAÑOS O PÉRDIDA DE PRENDAS):</span>
                <span className="font-mono text-base">${(factura.montoDeposito || 0).toLocaleString("es-CO")}</span>
              </div>
              <div className="text-[11px] text-amber-900 mt-1">
                <span>Estado Actual del Depósito: </span>
                <strong>
                  {factura.estadoDeposito === "DEVUELTO_COMPLETO"
                    ? `DEVUELTO 100% AL CLIENTE ($${(factura.montoDevueltoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")}) — Prendas devueltas en perfecto estado.`
                    : factura.estadoDeposito === "RETENIDO_PARCIAL"
                    ? `RETENCIÓN PARCIAL: $${(factura.montoRetenidoDeposito || 0).toLocaleString("es-CO")} retenido por daños / $${(factura.montoDevueltoDeposito || 0).toLocaleString("es-CO")} devuelto${factura.motivoRetencionDeposito ? ` — Justificación: ${factura.motivoRetencionDeposito}` : ""}`
                    : factura.estadoDeposito === "RETENIDO_TOTAL"
                    ? `RETENCIÓN TOTAL: $${(factura.montoRetenidoDeposito || factura.montoDeposito || 0).toLocaleString("es-CO")} retenido por pérdida o daño irreparable${factura.motivoRetencionDeposito ? ` — Justificación: ${factura.motivoRetencionDeposito}` : ""}`
                    : "EN CUSTODIA (Reembolsable al 100% al devolver las prendas sin novedades ni averías)"}
                </strong>
              </div>
            </div>
          )}

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
              {factura.detalles.slice(0, 8).map((d, idx) => {
                const esAlq = d.producto?.tipo === "ALQUILER" || factura.tipoOperacion === "ALQUILER";
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-bold text-center">{d.cantidad}</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border bg-slate-100 text-slate-800">
                        {d.esServicioLibre ? "SERVICIO" : esAlq ? "ALQUILER" : "VENTA"}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <p className="font-bold text-slate-900 text-xs">
                        {d.esServicioLibre
                          ? `[Arreglo de Sastrería] ${d.descripcionLibre || "Servicio"}`
                          : d.producto?.nombre}
                      </p>
                      {d.producto?.codigo && (
                        <p className="text-[10px] font-mono text-slate-500">
                          Cód: {d.producto.codigo} {d.producto.talla ? `| Talla: ${d.producto.talla}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">
                      ${d.precioUnitario.toLocaleString("es-CO")}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-xs">
                      ${d.subtotal.toLocaleString("es-CO")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Historial de Abonos Recibidos */}
          {factura.abonos && factura.abonos.length > 0 && (
            <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="font-bold uppercase text-[9.5px] text-slate-700 mb-1 flex items-center justify-between">
                <span>Historial de Pagos & Abonos Registrados:</span>
                <span className="font-mono text-emerald-700">
                  Total Pagado: ${factura.totalAbonado.toLocaleString("es-CO")}
                </span>
              </p>
              <div className="space-y-1">
                {factura.abonos.slice(0, 3).map((abono, aIdx) => (
                  <div
                    key={aIdx}
                    className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200/80 font-mono text-[10px]"
                  >
                    <span>
                      Pago #{aIdx + 1} — {new Date(abono.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} ({abono.metodoPago})
                      {abono.cajero?.nombre ? ` [${abono.cajero.nombre}]` : ""}
                    </span>
                    <strong className="text-emerald-700 font-bold">
                      ${abono.monto.toLocaleString("es-CO")}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sección Inferior de Carta: Políticas & Totales + Firmas */}
        <div className="border-t-2 border-slate-900 pt-3">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1 text-[10px] text-slate-600 space-y-1">
              {empresa.politicasFactura && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold uppercase text-[9px] text-slate-700 mb-0.5">
                    TÉRMINOS Y POLÍTICAS DE ALQUILER / VENTA:
                  </p>
                  <p className="text-[9.5px] leading-relaxed text-slate-500">
                    {empresa.politicasFactura}
                  </p>
                </div>
              )}
            </div>

            <div className="w-68 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-[11px]">
                <span className="font-sans text-slate-500">Subtotal Prendas:</span>
                <span>${factura.subtotalProductos.toLocaleString("es-CO")}</span>
              </div>
              {factura.subtotalArreglosLibres > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="font-sans text-slate-500">Sastrería:</span>
                  <span>${factura.subtotalArreglosLibres.toLocaleString("es-CO")}</span>
                </div>
              )}
              {factura.recargoMoraAcumulado > 0 && (
                <div className="flex justify-between text-[11px] text-rose-700 font-bold">
                  <span className="font-sans">Recargo Mora:</span>
                  <span>+${factura.recargoMoraAcumulado.toLocaleString("es-CO")}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black font-sans pt-1 border-t border-slate-900">
                <span>TOTAL FACTURA:</span>
                <span>${factura.totalFactura.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                <span className="font-sans">Total Abonado:</span>
                <span>-${factura.totalAbonado.toLocaleString("es-CO")}</span>
              </div>
              <div
                className={`flex justify-between text-xs font-black font-sans pt-1 p-1.5 rounded border ${
                  esPazYSalvo
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-rose-600 border-slate-300"
                }`}
              >
                <span>SALDO PENDIENTE:</span>
                <span>
                  {esPazYSalvo ? "$0 (PAZ Y SALVO)" : `$${factura.saldoPendiente.toLocaleString("es-CO")}`}
                </span>
              </div>
            </div>
          </div>

          {/* Bloque de Firmas */}
          <div className="grid grid-cols-2 gap-8 text-center pt-3 border-t border-dashed border-slate-300">
            <div>
              <div className="w-48 border-t border-slate-700 mx-auto pt-1 text-[10px] font-semibold text-slate-800">
                Firma Autorizada LLANOMIO
              </div>
            </div>
            <div>
              <div className="w-48 border-t border-slate-700 mx-auto pt-1 text-[10px] font-semibold text-slate-800">
                Firma y Cédula del Cliente
              </div>
            </div>
          </div>

          {/* Pie Institucional sin QR */}
          <div className="text-center text-[9px] text-slate-400 mt-2 font-mono">
            {empresa.piePaginaFactura || "Comprobante Oficial LLANOMIO POS — Impreso sin códigos QR externos"}
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
              Impresión Documental — Factura {factura.numeroFactura}
            </h2>
            <p className="text-xs text-slate-400">
              Formato seleccionado: <strong>{formato}</strong> — Coherencia 1:1 entre vista, impresión y PDF
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Selector de Formato */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormato("TIRILLA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "TIRILLA"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Tirilla 80mm
            </button>
            <button
              type="button"
              onClick={() => setFormato("MEDIA_CARTA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "MEDIA_CARTA"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Media Carta
            </button>
            <button
              type="button"
              onClick={() => setFormato("CARTA")}
              className={`px-3 py-1.5 rounded-lg transition ${
                formato === "CARTA"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
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
              2 Copias
            </button>
          </div>

          {/* Botón Exportar / Descargar PDF Oficial según Formato */}
          <button
            type="button"
            onClick={() => descargarPdfSegunFormato(datos, formato)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
            title={`Descargar archivo PDF oficial en tamaño ${formato}`}
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar PDF ({formato})</span>
          </button>

          {/* Botón Abrir / Ver PDF */}
          <button
            type="button"
            onClick={() => abrirPdfMediaCarta(datos)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md transition"
            title="Abrir PDF en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver PDF</span>
          </button>

          {/* Botón Imprimir Aislado en Iframe */}
          <button
            type="button"
            onClick={imprimirDocumentoAislado}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition"
            title="Imprimir exclusivamente el documento en la impresora física seleccionada"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ({formato})</span>
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

      {/* Área Imprimible Aislada (Se sincroniza 1:1 con el formato seleccionado) */}
      <div
        ref={areaImprimibleRef}
        className="bg-slate-200 dark:bg-slate-900/60 p-4 sm:p-8 rounded-2xl print:p-0 print:bg-white print:m-0 flex flex-col items-center"
      >
        {/* Copia 1: Original Cliente */}
        {renderDocumento("ORIGINAL CLIENTE")}

        {/* Copia 2: Copia Archivo Tienda (si está seleccionada) */}
        {numCopias === 2 && (
          <>
            <div className="w-full my-6 border-t-2 border-dashed border-slate-400 text-center relative print:my-4">
              <span className="bg-white px-3 py-0.5 text-[9px] uppercase font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300">
                Línea de Corte (División de Copias)
              </span>
            </div>
            {renderDocumento("COPIA ARCHIVO TIENDA")}
          </>
        )}
      </div>

      {/* Estilos CSS Globales @media print para impresión de respaldo */}
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
            margin: ${formato === "TIRILLA" ? "2mm 1mm" : formato === "MEDIA_CARTA" ? "6mm" : "8mm"};
            size: ${formato === "TIRILLA" ? "80mm auto" : formato === "MEDIA_CARTA" ? "215.9mm 139.7mm landscape" : "letter portrait"};
          }
        }
      `}</style>
    </div>
  );
}
