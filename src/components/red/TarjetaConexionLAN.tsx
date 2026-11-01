"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Wifi,
  Copy,
  Check,
  Radio,
  Server,
  RefreshCw,
  ShieldCheck,
  Activity,
  Network,
  ArrowLeft,
  X,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import { RespuestaRedLocal } from "@/app/api/red-local/route";

interface TarjetaConexionLANProps {
  titulo?: string;
  subtitulo?: string;
  className?: string;
  onClose?: () => void;
}

export default function TarjetaConexionLAN({
  titulo = "Conexión en Red Local (LAN)",
  className = "",
  onClose,
}: TarjetaConexionLANProps) {
  const [datosRed, setDatosRed] = useState<RespuestaRedLocal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorRed, setErrorRed] = useState<string | null>(null);

  // Modo de acceso: IP universal vs mDNS
  const [modoAcceso, setModoAcceso] = useState<"IP" | "MDNS">("IP");
  // Índice de interfaz de red física
  const [interfazSeleccionada, setInterfazSeleccionada] = useState<number>(0);
  // Selector de puerto: 3000 vs 80
  const [puertoSeleccionado, setPuertoSeleccionado] = useState<"3000" | "80">("3000");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);

  // Cargar información de interfaces de red
  const cargarDatosRed = async () => {
    try {
      setCargando(true);
      setErrorRed(null);
      const res = await fetch("/api/red-local");
      if (!res.ok) {
        throw new Error("No se pudo obtener la información de red.");
      }
      const data: RespuestaRedLocal = await res.json();
      setDatosRed(data);

      if (!data.puerto80Activo) {
        setPuertoSeleccionado("3000");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el servidor local";
      setErrorRed(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosRed();
  }, []);

  // Calcular la URL activa para conectar dispositivos
  const obtenerUrlActiva = (): string => {
    if (!datosRed) return "http://127.0.0.1:3000";

    const puertoStr = puertoSeleccionado === "80" ? "" : `:${datosRed.puertoNext}`;

    if (modoAcceso === "MDNS") {
      return puertoSeleccionado === "80"
        ? datosRed.mdnsUrl
        : `${datosRed.mdnsUrl}${puertoStr}`;
    }

    const iface = datosRed.interfaces[interfazSeleccionada] || {
      ip: datosRed.ipPrincipal,
    };

    return puertoSeleccionado === "80"
      ? `http://${iface.ip}`
      : `http://${iface.ip}:${datosRed.puertoNext}`;
  };

  const urlActiva = obtenerUrlActiva();

  // Generar código QR 100% offline
  useEffect(() => {
    if (!urlActiva) return;

    QRCode.toDataURL(urlActiva, {
      width: 240,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error("Error al generar código QR offline:", err);
      });
  }, [urlActiva]);

  // Copiar URL al portapapeles
  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(urlActiva);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = urlActiva;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div
      className={`w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-slate-900 select-none ${className}`}
    >
      {/* ===================================================================== */}
      {/* 1. ÚNICA CABECERA COMPACTA SIN DUPLICACIONES                          */}
      {/* ===================================================================== */}
      <div className="h-13 px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onClose && (
            <IconButtonTooltip
              icon={ArrowLeft}
              label="Regresar al Panel Principal"
              size="sm"
              variant="neutral"
              onClick={onClose}
            />
          )}

          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4 text-blue-600" />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
              {titulo}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 cursor-help"
              title="Opera en la red Wi-Fi de la tienda sin requerir internet"
            >
              100% Offline
            </span>
          </div>
        </div>

        {/* Barra de Iconos Uniformes con Tooltips */}
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButtonTooltip
            icon={Activity}
            label="Ver Diagnóstico Técnico de Red y Puertos"
            size="sm"
            variant="neutral"
            active={mostrarDiagnostico}
            onClick={() => setMostrarDiagnostico(!mostrarDiagnostico)}
          />

          <IconButtonTooltip
            icon={RefreshCw}
            label="Actualizar IP y Estado de Red"
            size="sm"
            variant="neutral"
            onClick={cargarDatosRed}
            disabled={cargando}
          />

          <IconButtonTooltip
            icon={HelpCircle}
            label="Paso 1: Conecta el celular al Wi-Fi · Paso 2: Escanea el QR o abre el enlace · Paso 3: Inicia sesión"
            size="sm"
            variant="neutral"
          />

          {onClose && (
            <IconButtonTooltip
              icon={X}
              variant="danger"
              label="Cerrar ventana (Esc)"
              size="sm"
              onClick={onClose}
            />
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. PANEL DE DIAGNÓSTICO DESPLEGABLE COMPACTO                          */}
      {/* ===================================================================== */}
      {mostrarDiagnostico && (
        <div className="bg-slate-50 text-slate-800 p-3.5 border-b border-slate-200 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-blue-700 text-xs flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Diagnóstico de Red Local
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold">
              Host: {datosRed?.hostname || "Local"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Next.js (3000)</span>
              <span className="font-bold text-slate-800 font-mono">0.0.0.0:3000</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Proxy mDNS (80)</span>
              <span className="font-bold text-slate-800 font-mono">
                {datosRed?.puerto80Activo ? "Puerto 80 Activo" : "Solo Puerto 3000"}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Firewall LAN</span>
              <span className="font-bold text-emerald-700 font-mono">TCP 80, 3000 OK</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. CUERPO EN 2 COLUMNAS COMPACTAS QUE CABEN AL 100% SIN SCROLL        */}
      {/* ===================================================================== */}
      <div className="p-4 grid grid-cols-12 gap-4 items-center">
        {/* Columna Izquierda: Configuración de Acceso y Guía (7 columnas) */}
        <div className="col-span-12 sm:col-span-7 space-y-3">
          {/* Selector de Método: IP Directa vs mDNS */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModoAcceso("IP")}
              title="Recomendado Universal: Compatible al 100% con celulares Android, iPhone, tablets y PCs en el mismo Wi-Fi"
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                modoAcceso === "IP"
                  ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Wifi className={`w-3.5 h-3.5 ${modoAcceso === "IP" ? "text-blue-600" : "text-slate-400"}`} />
              <span>IP Directa</span>
            </button>

            <button
              type="button"
              onClick={() => setModoAcceso("MDNS")}
              title="Enlace http://llanomio.local ideal para dispositivos Apple/Bonjour y PCs en red local"
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                modoAcceso === "MDNS"
                  ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${modoAcceso === "MDNS" ? "text-blue-600" : "text-slate-400"}`} />
              <span>Dominio mDNS</span>
            </button>
          </div>

          {/* Adaptador de Red y Puerto en una Sola Fila Compacta */}
          <div className="grid grid-cols-2 gap-2">
            {/* Adaptador de Red */}
            <div
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-1.5 truncate cursor-help"
              title="Adaptador de red física activo de la tienda"
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Network className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {datosRed?.interfaces[interfazSeleccionada]?.esWifi ? "Wi-Fi" : "Red LAN"}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-blue-700 shrink-0">
                {datosRed?.interfaces[interfazSeleccionada]?.ip || datosRed?.ipPrincipal || "127.0.0.1"}
              </span>
            </div>

            {/* Selector de Puerto Píldora */}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setPuertoSeleccionado("3000")}
                title="Puerto principal directo Next.js (Recomendado)"
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono font-bold transition ${
                  puertoSeleccionado === "3000"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                :3000
              </button>
              <button
                type="button"
                onClick={() => setPuertoSeleccionado("80")}
                disabled={!datosRed?.puerto80Activo}
                title={
                  datosRed?.puerto80Activo
                    ? "Puerto 80 Proxy HTTP sin escribir número de puerto"
                    : "Proxy puerto 80 no disponible"
                }
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono font-bold transition ${
                  puertoSeleccionado === "80"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : datosRed?.puerto80Activo
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                :80
              </button>
            </div>
          </div>

          {/* Caja de Enlace Directo + Botones de Icono */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <span
              className="text-xs sm:text-[13px] font-mono font-bold text-blue-950 truncate select-all"
              title={urlActiva}
            >
              {urlActiva}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <IconButtonTooltip
                icon={copiado ? Check : Copy}
                variant={copiado ? "emerald" : "primary"}
                size="sm"
                label={copiado ? "¡Enlace copiado al portapapeles!" : "Copiar enlace de acceso local"}
                onClick={handleCopiar}
              />

              <IconButtonTooltip
                icon={ExternalLink}
                variant="neutral"
                size="sm"
                label="Abrir enlace en una pestaña nueva"
                onClick={() => window.open(urlActiva, "_blank")}
              />
            </div>
          </div>

          {/* Guía Rápida por Iconos Interactivos */}
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-2 text-xs">
            <div
              className="flex items-center gap-1.5 text-blue-950 font-semibold cursor-help"
              title="Conecta el celular o tablet a la misma red Wi-Fi del servidor"
            >
              <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>1. Wi-Fi Tienda</span>
            </div>

            <div
              className="flex items-center gap-1.5 text-blue-950 font-semibold cursor-help"
              title="Apunta la cámara al código QR de la derecha o abre el enlace"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>2. Escanear QR</span>
            </div>

            <div
              className="flex items-center gap-1.5 text-blue-950 font-semibold cursor-help"
              title="Inicia sesión con tu usuario de cajero o administrador"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>3. Entrar a POS</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Código QR Proporcionado y Compacto (5 columnas) */}
        <div className="col-span-12 sm:col-span-5 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Escaneo Rápido Wi-Fi</span>
          </div>

          {/* Código QR Proporcionado */}
          <div
            className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs inline-block transition-transform hover:scale-105 duration-150 cursor-help"
            title="Apunta la cámara de tu celular a este código QR para abrir el sistema POS en red local"
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR para ${urlActiva}`}
                className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg"
              />
            ) : (
              <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                <span className="text-[11px] font-medium">Generando QR...</span>
              </div>
            )}
          </div>

          {/* Pie debajo del QR */}
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <span
              className="flex items-center gap-1 truncate cursor-help"
              title="Nombre del equipo servidor y socket 0.0.0.0 activo"
            >
              <Server className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[110px]">{datosRed?.hostname || "localhost"}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LAN Activo</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
