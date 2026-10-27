"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Wifi,
  Smartphone,
  Laptop,
  Copy,
  Check,
  Radio,
  Info,
  Server,
  RefreshCw,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Network,
  Cpu,
  Layers,
} from "lucide-react";
import { RespuestaRedLocal, InfoInterfazRed } from "@/app/api/red-local/route";

interface TarjetaConexionLANProps {
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

export default function TarjetaConexionLAN({
  titulo = "Conectar Celulares, Tablets y Computadores en Red Local",
  subtitulo = "Escanea el código QR o copia el enlace para acceder al sistema desde cualquier dispositivo conectado al Wi-Fi de la tienda sin internet.",
  className = "",
}: TarjetaConexionLANProps) {
  const [datosRed, setDatosRed] = useState<RespuestaRedLocal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorRed, setErrorRed] = useState<string | null>(null);

  // Modo predeterminado: "IP" (Universal para todos los celulares Android, iPhones y PCs)
  const [modoAcceso, setModoAcceso] = useState<"IP" | "MDNS">("IP");
  // Índice de interfaz seleccionada en lista de interfaces físicas
  const [interfazSeleccionada, setInterfazSeleccionada] = useState<number>(0);
  // Selector de puerto: "3000" (Directo Next.js) o "80" (Proxy mDNS)
  const [puertoSeleccionado, setPuertoSeleccionado] = useState<"3000" | "80">("3000");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);

  // Cargar datos de red local
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

      // Si el puerto 80 está activo, podemos ofrecerlo, de lo contrario forzar 3000
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

  // Calcular la URL activa en base a las opciones seleccionadas
  const obtenerUrlActiva = (): string => {
    if (!datosRed) return "http://127.0.0.1:3000";

    const puertoStr = puertoSeleccionado === "80" ? "" : `:${datosRed.puertoNext}`;

    if (modoAcceso === "MDNS") {
      return puertoSeleccionado === "80"
        ? datosRed.mdnsUrl
        : `${datosRed.mdnsUrl}${puertoStr}`;
    }

    // Modo IP Directa (Universal)
    const iface = datosRed.interfaces[interfazSeleccionada] || {
      ip: datosRed.ipPrincipal,
    };

    return puertoSeleccionado === "80"
      ? `http://${iface.ip}`
      : `http://${iface.ip}:${datosRed.puertoNext}`;
  };

  const urlActiva = obtenerUrlActiva();

  // Generar el código QR 100% offline cada vez que cambia la URL activa
  useEffect(() => {
    if (!urlActiva) return;

    QRCode.toDataURL(urlActiva, {
      width: 280,
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
        console.error("Error al generar código QR offline:", err);
      });
  }, [urlActiva]);

  // Manejo de copiado al portapapeles
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
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}>
      {/* 1. Cabecera de la Tarjeta */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {titulo}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Offline
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMostrarDiagnostico(!mostrarDiagnostico)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition ${
              mostrarDiagnostico
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
            title="Diagnóstico de puertos y tarjetas de red"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnóstico Red</span>
          </button>

          <button
            type="button"
            onClick={cargarDatosRed}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            title="Actualizar interfaces de red"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-blue-600" : ""}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Panel de Diagnóstico Colapsable Claro Antifatiga */}
      {mostrarDiagnostico && (
        <div className="bg-slate-50 text-slate-800 p-5 border-b border-slate-200 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-700">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Diagnóstico de Red Local del Servidor Tienda</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              Host: {datosRed?.hostname || "Local"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-600 font-semibold block mb-1">
                Servidor Next.js (Puerto 3000)
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    datosRed?.diagnostico?.puertoNextActivo ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span className="font-bold text-slate-900 font-mono">
                  {datosRed?.diagnostico?.puertoNextActivo
                    ? "Escuchando en 0.0.0.0:3000"
                    : "Verificando conexión"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Permite conexiones directas desde cualquier IP de la red.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-600 font-semibold block mb-1">
                Proxy mDNS / Puerto 80
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    datosRed?.puerto80Activo ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <span className="font-bold text-slate-900 font-mono">
                  {datosRed?.puerto80Activo ? "Activo (Puerto 80 Abierto)" : "Inactivo o en Puerto 3000"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {datosRed?.puerto80Activo
                  ? "Acceso simplificado sin número de puerto."
                  : "Usa el puerto :3000 para acceso directo."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-600 font-semibold block mb-1">
                Firewall de Windows
              </span>
              <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Reglas LAN TCP 80, 3000</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Si un celular no conecta, ejecuta `5_ABRIR_FIREWALL_LAN.bat` en la carpeta `instalador_tienda`.
              </p>
            </div>
          </div>

          {/* Filtro de adaptadores virtuales */}
          {datosRed?.diagnostico?.interfacesDescartadas && datosRed.diagnostico.interfacesDescartadas.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Adaptadores virtuales filtrados con éxito:{" "}
                <span className="text-slate-700 font-mono font-semibold">
                  {datosRed.diagnostico.interfacesDescartadas.join(", ")}
                </span>
              </span>
              <span className="text-emerald-700 font-bold">
                IP real del Wi-Fi priorizada
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Cuerpo: Selector de Modo, Visualizador QR y Guía */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Opciones de Conexión y Selector (7 columnas) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Selector de Modo: IP LAN (Universal) vs mDNS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Método de Conexión
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoAcceso("IP")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  modoAcceso === "IP"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Wifi className={`w-4 h-4 ${modoAcceso === "IP" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="text-xs font-bold">IP Directa en Red</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                    Recomendado Universal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Compatible al 100% con todos los teléfonos Android, iPhones, tablets y PCs en el Wi-Fi.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModoAcceso("MDNS")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  modoAcceso === "MDNS"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${modoAcceso === "MDNS" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="text-xs font-bold">Enlace Fácil mDNS</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Apple / Bonjour
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  http://llanomio.local (Ideal para iPhones, iPads, Macs y PCs con Bonjour).
                </p>
              </button>
            </div>
          </div>

          {/* Selector de Interfaces si está en modo IP */}
          {modoAcceso === "IP" && datosRed && datosRed.interfaces.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Tarjeta de Red Física Seleccionada:
              </label>
              <div className="space-y-1.5">
                {datosRed.interfaces.map((iface, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      interfazSeleccionada === idx
                        ? "bg-white border-blue-500 font-bold text-blue-900 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-700 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="interfazRed"
                        checked={interfazSeleccionada === idx}
                        onChange={() => setInterfazSeleccionada(idx)}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>{iface.nombre}</span>
                      {iface.esWifi && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          Wi-Fi Tienda
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-blue-600 font-bold">{iface.ip}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Selector de Puerto (3000 vs 80) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Puerto de Conexión:
              </span>
              <span className="text-[11px] text-slate-500">
                {datosRed?.puerto80Activo
                  ? "El puerto 80 permite conectar sin escribir el puerto en la URL."
                  : "El puerto 3000 conecta directamente al motor Next.js."}
              </span>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setPuertoSeleccionado("3000")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  puertoSeleccionado === "3000"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Puerto 3000 (Recomendado Directo)
              </button>
              <button
                type="button"
                onClick={() => setPuertoSeleccionado("80")}
                disabled={!datosRed?.puerto80Activo}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  puertoSeleccionado === "80"
                    ? "bg-blue-600 text-white shadow-xs"
                    : datosRed?.puerto80Activo
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                title={
                  datosRed?.puerto80Activo
                    ? "Puerto 80 disponible"
                    : "Proxy puerto 80 no detectado. Se usa el puerto 3000."
                }
              >
                Puerto 80 {datosRed?.puerto80Activo ? "(Proxy)" : "(No activo)"}
              </button>
            </div>
          </div>

          {/* Enlace Activo y Botón de Copiar */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
              Enlace de Acceso Local para Dispositivos
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-white rounded-lg border border-blue-200 font-mono text-xs sm:text-sm font-bold text-blue-900 truncate select-all">
                {urlActiva}
              </div>
              <button
                type="button"
                onClick={handleCopiar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition shrink-0"
              >
                {copiado ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? "Copiado" : "Copiar Enlace"}</span>
              </button>
            </div>
          </div>

          {/* Guía en 3 Pasos */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-800 mb-2.5">
              Guía de Conexión en 3 Pasos:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] mb-1.5">
                  1
                </span>
                <span className="font-bold text-slate-800 block">Mismo Wi-Fi</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conecta el celular, tablet o PC al mismo Wi-Fi de la tienda.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] mb-1.5">
                  2
                </span>
                <span className="font-bold text-slate-800 block">Escanear o Escribir</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Escanea el código QR con la cámara o escribe la URL en Chrome / Safari.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] mb-1.5">
                  3
                </span>
                <span className="font-bold text-slate-800 block">Iniciar Sesión</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ingresa con tu usuario de Cajero o Administrador.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Renderizador QR 100% Offline (5 columnas) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 text-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Código QR para Escaneo Rápido</span>
          </div>

          {/* Contenedor del Código QR */}
          <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200/90 inline-block transition-transform hover:scale-105 duration-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR para acceder a ${urlActiva}`}
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <span className="text-xs font-medium">Generando QR offline...</span>
              </div>
            )}
          </div>

          <div className="mt-3.5 space-y-1">
            <span className="text-xs font-bold text-slate-900 block font-mono">
              {urlActiva}
            </span>
            <p className="text-[11px] text-slate-500">
              Apunta la cámara de tu celular hacia la pantalla para abrir el POS de inmediato.
            </p>
          </div>

          {/* Información del Servidor Local */}
          {datosRed && (
            <div className="mt-4 pt-3 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Servidor: {datosRed.hostname}</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                LAN 0.0.0.0 Activo
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
