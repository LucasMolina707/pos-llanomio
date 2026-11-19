"use client";

import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  X,
  ExternalLink,
  ZoomIn,
  Globe,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import { RespuestaRedLocal } from "@/app/api/red-local/route";

interface TarjetaConexionLANProps {
  titulo?: string;
  subtitulo?: string;
  className?: string;
  onClose?: () => void;
  modoModal?: boolean;
}

interface InfoUbicacionNavegador {
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
}

export default function TarjetaConexionLAN({
  titulo = "Conectar Dispositivos por Código QR",
  className = "",
  onClose,
  modoModal,
}: TarjetaConexionLANProps) {
  const esModal = modoModal !== undefined ? modoModal : Boolean(onClose);

  const [datosRed, setDatosRed] = useState<RespuestaRedLocal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [locCliente, setLocCliente] = useState<InfoUbicacionNavegador | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [zoomQrAbierto, setZoomQrAbierto] = useState(false);

  // Leer la ubicación del cliente al montarse
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLocCliente({
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        origin: window.location.origin,
      });
    }
  }, []);

  // Consultar endpoints de red local para obtener la IP física en caso de estar en localhost
  const cargarDatosRed = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/red-local");
      if (res.ok) {
        const data: RespuestaRedLocal = await res.json();
        setDatosRed(data);
      }
    } catch (err: unknown) {
      console.warn("No se pudo obtener información de red local:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosRed();
  }, [cargarDatosRed]);

  // =========================================================================
  // LÓGICA DE DETECCIÓN EXACTA DE LA DIRECCIÓN ACTIVA DE LA SESIÓN:
  // - Caso A: Acceso Local (IPv4 o localhost / 127.0.0.1) -> IP:PUERTO
  // - Caso B: Acceso por Dominio/Subdominio (Internet / Túnel) -> protocol://dominio limpio sin :puerto
  // =========================================================================
  const calcularUrlConexion = (): string => {
    if (!locCliente) {
      if (datosRed?.ipPrincipal) {
        const port = datosRed.puertoNext || "3000";
        return `http://${datosRed.ipPrincipal}:${port}`;
      }
      return "http://127.0.0.1:3000";
    }

    const { protocol, hostname, port } = locCliente;
    const esLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
    const esIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    // Caso A1: Abierto desde localhost en el equipo central servidor
    // Para que los celulares o tablets en la tienda puedan conectarse, resolver a la IPv4 LAN física
    if (esLocalhost) {
      const ipLan = datosRed?.ipPrincipal || "127.0.0.1";
      const puertoEfectivo =
        port && port !== "80" && port !== "443"
          ? port
          : datosRed?.puertoNext || "3000";
      const sufijoPuerto =
        puertoEfectivo && puertoEfectivo !== "80" && puertoEfectivo !== "443"
          ? `:${puertoEfectivo}`
          : "";
      return `http://${ipLan}${sufijoPuerto}`;
    }

    // Caso A2: Abierto directamente por IP local en el navegador (ej. http://192.168.1.50:3000)
    // Conserva estrictamente IP:PUERTO
    if (esIpv4) {
      const sufijoPuerto = port && port !== "80" && port !== "443" ? `:${port}` : "";
      return `${protocol}//${hostname}${sufijoPuerto}`;
    }

    // Caso B: Acceso por Dominio o Subdominio (Internet / Proxy / Túnel)
    // Enlace limpio únicamente con protocolo + dominio/subdominio, sin sufijos :puerto redundantes
    return `${protocol}//${hostname}`;
  };

  const urlActiva = calcularUrlConexion();

  const esAccesoDominio =
    locCliente &&
    locCliente.hostname !== "localhost" &&
    locCliente.hostname !== "127.0.0.1" &&
    !/^(\d{1,3}\.){3}\d{1,3}$/.test(locCliente.hostname);

  // Generar código QR de alta resolución
  useEffect(() => {
    if (!urlActiva) return;

    QRCode.toDataURL(urlActiva, {
      width: 440,
      margin: 2,
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
        console.error("Error al generar código QR:", err);
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
      className={`w-full ${
        esModal ? "max-w-md shadow-2xl" : "max-w-lg mx-auto shadow-xs"
      } bg-white rounded-3xl border border-slate-200 overflow-hidden text-slate-900 select-none ${className}`}
    >
      {/* 1. Cabecera Compacta */}
      <div className="h-13 px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            {esAccesoDominio ? (
              <Globe className="w-4 h-4 text-blue-600" />
            ) : (
              <Wifi className="w-4 h-4 text-blue-600" />
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
              {titulo}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                esAccesoDominio
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {esAccesoDominio ? "Web / Dominio" : "Wi-Fi Tienda"}
            </span>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-1 shrink-0">
          <IconButtonTooltip
            icon={RefreshCw}
            label="Actualizar Dirección y QR"
            size="sm"
            variant="neutral"
            onClick={cargarDatosRed}
            disabled={cargando}
            iconClassName={cargando ? "animate-spin text-blue-600" : "text-blue-600"}
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

      {/* 2. Cuerpo Centrado: Exclusivamente QR + Campo para Copiar y Pegar Debajo */}
      <div className="p-5 sm:p-6 flex flex-col items-center justify-center text-center space-y-4">
        {/* Badge Superior */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold uppercase tracking-wider">
          <QrCode className="w-3.5 h-3.5 text-blue-600" />
          <span>Escaneo con Celular o Tablet</span>
        </div>

        {/* Marco del Código QR con Zoom al Clic */}
        <div
          onClick={() => setZoomQrAbierto(true)}
          className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md transition-all duration-200 cursor-zoom-in group relative"
          title="Clic para ampliar Código QR a pantalla completa"
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Código QR para ${urlActiva}`}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
              style={{ imageRendering: "crisp-edges" }}
            />
          ) : (
            <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-medium">Generando código QR...</span>
            </div>
          )}

          {/* Icono de zoom en esquina superior derecha */}
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-500 group-hover:text-blue-600 group-hover:border-blue-300 shadow-2xs transition">
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Campo Compacto con Enlace Exacto y Botones para Copiar y Pegar */}
        <div className="w-full space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-left">
            Enlace Directo de la Sesión:
          </label>
          <div className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
            <span
              className="font-mono text-xs sm:text-[13px] font-bold text-blue-950 truncate select-all text-left flex-1 pl-1"
              title={urlActiva}
            >
              {urlActiva}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <IconButtonTooltip
                icon={copiado ? Check : Copy}
                variant={copiado ? "emerald" : "primary"}
                size="sm"
                label={copiado ? "¡Enlace copiado al portapapeles!" : "Copiar enlace"}
                onClick={handleCopiar}
              />

              <IconButtonTooltip
                icon={ExternalLink}
                variant="neutral"
                size="sm"
                label="Abrir enlace en pestaña nueva"
                onClick={() => window.open(urlActiva, "_blank")}
              />
            </div>
          </div>
        </div>

        {/* Guía Rápida Inferior Discreta */}
        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed max-w-sm">
          Apunta la cámara de tu teléfono al código QR o copia el enlace superior para ingresar desde cualquier navegador.
        </p>
      </div>

      {/* 3. Lightbox / Modal de Zoom Gigante en 1 Clic */}
      {zoomQrAbierto && (
        <div
          onClick={() => setZoomQrAbierto(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-150 relative"
          >
            <button
              type="button"
              onClick={() => setZoomQrAbierto(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition cursor-pointer"
              title="Cerrar ampliación (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold uppercase tracking-wider mb-4">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>ESCANEO A LARGA DISTANCIA</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-slate-300 shadow-md inline-block">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`Código QR ampliado para ${urlActiva}`}
                  className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain rounded-xl"
                  style={{ imageRendering: "crisp-edges" }}
                />
              )}
            </div>

            <p className="text-xs text-slate-500 mt-3 font-medium">
              Apunta la cámara de tu celular o tablet desde cualquier distancia en la tienda.
            </p>

            <div className="mt-3 w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2">
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-950 truncate select-all">
                {urlActiva}
              </span>
              <IconButtonTooltip
                icon={copiado ? Check : Copy}
                variant={copiado ? "emerald" : "primary"}
                size="sm"
                label={copiado ? "¡Enlace copiado!" : "Copiar enlace"}
                onClick={handleCopiar}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
