"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TarjetaConexionLAN from "@/components/red/TarjetaConexionLAN";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import {
  Building2,
  FileText,
  Save,
  Database,
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  Printer,
  Trash2,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Settings,
  LockOpen,
  KeyRound,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Download,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Cloud,
  FileCheck2,
  FolderSync,
  FolderOpen,
  X,
  Scissors,
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";
import {
  guardarPreferenciasImpresion,
  obtenerPreferenciasImpresion,
} from "@/lib/preferencias-impresion";

interface Configuracion {
  id: string;
  nombreTienda: string;
  nombreComercial: string;
  eslogan: string;
  nit: string;
  regimenFiscal: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
  encabezadoFactura: string;
  mostrarVendedorFactura: boolean;
  politicasFactura: string;
  piePaginaFactura: string;
  formatoPredeterminado: "TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA";
  formatoImpresionDefault: "TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA";
  rutaCarpetaRespaldo: string;
  nombreImpresoraPos: string;
  abrirCajonAutoEfectivo: boolean;
  pinCajon: number;
}

export default function ConfiguracionAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracion>({
    id: "",
    nombreTienda: "Mi Empresa",
    nombreComercial: "Mi Empresa",
    eslogan: "Punto de Venta y Alquileres",
    nit: "900.123.456-7",
    regimenFiscal: "No Responsable de IVA",
    direccion: "Calle 15 # 22-30",
    ciudad: "Ciudad Comercial",
    telefono: "300 123 4567",
    email: "contacto@miempresa.com",
    logoUrl: null,
    encabezadoFactura: "Punto de Venta, Alquileres y Servicios",
    mostrarVendedorFactura: true,
    politicasFactura:
      "Términos y Condiciones: Las prendas y artículos deben devolverse en la fecha pactada en el mismo estado en que se reciben. Todo retraso generará cobro de recargo de mora. Cuide su comprobante de pago.",
    piePaginaFactura: "¡Gracias por su preferencia!",
    formatoPredeterminado: "MEDIA_CARTA",
    formatoImpresionDefault: "MEDIA_CARTA",
    rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
    nombreImpresoraPos: "",
    abrirCajonAutoEfectivo: true,
    pinCajon: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Hardware POS - Detección y Prueba de Impresora y Cajón
  const [impresorasWindows, setImpresorasWindows] = useState<string[]>([]);
  const [cargandoImpresoras, setCargandoImpresoras] = useState(false);
  const [probandoCajon, setProbandoCajon] = useState(false);
  const [resultadoPruebaCajon, setResultadoPruebaCajon] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  // Formato simulado en la columna derecha
  const [formatoSimulador, setFormatoSimulador] = useState<"TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA">("MEDIA_CARTA");
  const [tipoOperacionSimulador, setTipoOperacionSimulador] = useState<"VENTA" | "ALQUILER">("VENTA");

  // Estado del respaldo en caliente y descarga
  const [respaldando, setRespaldando] = useState(false);
  const [descargandoRespaldo, setDescargandoRespaldo] = useState(false);
  const [abriendoCarpeta, setAbriendoCarpeta] = useState(false);
  const [ultimoRespaldoInfo, setUltimoRespaldoInfo] = useState<{
    bytes: number;
    timestamp?: string;
  } | null>(null);
  const [infoRespaldoServidor, setInfoRespaldoServidor] = useState<{
    rutaCarpetaPrincipal: string;
    rutaCarpetaLocal: string;
    rutaPorDefecto: string;
    esWindows: boolean;
    permisosEscritura: boolean;
    errorRuta?: string | null;
    ultimoRespaldo?: {
      nombre: string;
      ruta: string;
      tamanioBytes: number;
      fechaModificacion: string;
    } | null;
    historialReciente: Array<{
      nombre: string;
      tamanioBytes: number;
      fechaModificacion: string;
      origen: string;
    }>;
  } | null>(null);
  const [validandoRuta, setValidandoRuta] = useState(false);
  const [resultadoValidacionRuta, setResultadoValidacionRuta] = useState<{
    valido: boolean;
    mensaje: string;
  } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
    cargarInfoRespaldo();
    cargarImpresorasWindows();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/empresa", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.configuracion) {
        const c = data.configuracion;
        const formatoDefinido = c.formatoPredeterminado || c.formatoImpresionDefault || "MEDIA_CARTA";
        setConfig({
          id: c.id || "",
          nombreTienda: c.nombreTienda || "Mi Empresa",
          nombreComercial: c.nombreComercial || "Mi Empresa",
          eslogan: c.eslogan || "",
          nit: c.nit || "900.123.456-7",
          regimenFiscal: c.regimenFiscal || "No Responsable de IVA",
          direccion: c.direccion || "Calle 15 # 22-30, Barrio Siete de Agosto",
          ciudad: c.ciudad || "Villavicencio, Meta",
          telefono: c.telefono || "310 123 4567",
          email: c.email || "",
          logoUrl: c.logoUrl || null,
          encabezadoFactura: c.encabezadoFactura || "",
          mostrarVendedorFactura: c.mostrarVendedorFactura !== undefined ? c.mostrarVendedorFactura : true,
          politicasFactura: c.politicasFactura || "",
          piePaginaFactura: c.piePaginaFactura || "",
          formatoPredeterminado: formatoDefinido,
          formatoImpresionDefault: formatoDefinido,
          rutaCarpetaRespaldo: c.rutaCarpetaRespaldo || "C:\\POS_BACKUPS",
          nombreImpresoraPos: c.nombreImpresoraPos || "",
          abrirCajonAutoEfectivo: c.abrirCajonAutoEfectivo !== undefined ? c.abrirCajonAutoEfectivo : true,
          pinCajon: c.pinCajon !== undefined ? Number(c.pinCajon) : 0,
        });
        setFormatoSimulador(formatoDefinido);
      }
    } catch {
      setMensajeError("No se pudo cargar la configuración de la empresa.");
    } finally {
      setCargando(false);
    }
  };

  const cargarImpresorasWindows = async (forzarRefresco = false) => {
    try {
      setCargandoImpresoras(true);
      const url = `/api/caja/abrir-cajon${forzarRefresco ? "?refresh=1" : ""}`;
      const res = await safeFetchJson<{
        ok: boolean;
        impresoras?: string[];
        configuracion?: { nombreImpresoraPos: string; abrirCajonAutoEfectivo: boolean; pinCajon: number };
      }>(url);

      if (res.ok && res.data?.impresoras) {
        setImpresorasWindows(res.data.impresoras);
      }
    } catch {
      // Manejo silencioso
    } finally {
      setCargandoImpresoras(false);
    }
  };

  const probarAperturaCajon = async () => {
    try {
      setProbandoCajon(true);
      setResultadoPruebaCajon(null);

      const res = await safeFetchJson<{
        ok: boolean;
        mensaje: string;
        resultado?: { impresoraUsada: string; detalle?: string };
        error?: string;
      }>("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: "PRUEBA_DESDE_PANEL_CONFIGURACION",
          nombreImpresora: config.nombreImpresoraPos,
          pin: config.pinCajon,
        }),
      });

      if (res.ok && res.data) {
        setResultadoPruebaCajon({
          tipo: "exito",
          mensaje:
            res.data.resultado?.detalle ||
            `¡Pulso ESC/POS enviado a '${res.data.resultado?.impresoraUsada}' con éxito!`,
        });
      } else {
        setResultadoPruebaCajon({
          tipo: "error",
          mensaje: res.error || "No se pudo enviar el pulso a la impresora seleccionada.",
        });
      }
    } catch {
      setResultadoPruebaCajon({
        tipo: "error",
        mensaje: "Error de red al intentar disparar la apertura de prueba.",
      });
    } finally {
      setProbandoCajon(false);
      setTimeout(() => {
        setResultadoPruebaCajon(null);
      }, 7000);
    }
  };

  const cargarInfoRespaldo = async () => {
    try {
      const res = await fetch("/api/backup?info=true", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setInfoRespaldoServidor(data);
        if (data.ultimoRespaldo) {
          setUltimoRespaldoInfo({
            bytes: data.ultimoRespaldo.tamanioBytes,
            timestamp: data.ultimoRespaldo.fechaModificacion,
          });
        }
      }
    } catch {
      // Silencioso
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig((prev) => ({ ...prev, [name]: checked }));
    } else {
      setConfig((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Carga y procesa el logo de la empresa redimensionándolo con HTML5 Canvas
   * a máximo 600px para que se almacene velozmente en Base64 sin problemas de CORS.
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensajeError("El archivo seleccionado debe ser una imagen válida (PNG, JPG, WEBP o SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensajeError("La imagen original no debe exceder 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Si es SVG, guardarlo directo como data URL
      if (file.type === "image/svg+xml") {
        setConfig((prev) => ({ ...prev, logoUrl: dataUrl }));
        setMensajeExito("Logotipo vectorial SVG cargado para la vista previa.");
        setTimeout(() => setMensajeExito(null), 3000);
        return;
      }

      // Redimensionar con canvas a máximo 600px de ancho para optimizar almacenamiento en SQLite
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const formatoMime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
          const dataUrlOptimizada = canvas.toDataURL(formatoMime, 0.92);
          setConfig((prev) => ({ ...prev, logoUrl: dataUrlOptimizada }));
          setMensajeExito("Logotipo procesado y listo para guardar.");
          setTimeout(() => setMensajeExito(null), 3000);
        } else {
          setConfig((prev) => ({ ...prev, logoUrl: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEliminarLogo = () => {
    setConfig((prev) => ({ ...prev, logoUrl: null }));
    setMensajeExito("Logotipo removido de la vista previa.");
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const payload = {
        ...config,
        formatoPredeterminado: config.formatoPredeterminado,
        formatoImpresionDefault: config.formatoPredeterminado,
      };

      const res = await fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar la configuración de factura.");
      }

      setMensajeExito("La configuración de factura y el logotipo han sido actualizados con éxito en todo el sistema.");
      if (typeof window !== "undefined") {
        guardarPreferenciasImpresion({
          formato: config.formatoPredeterminado,
          nombreImpresora: config.nombreImpresoraPos,
        });
        window.dispatchEvent(new Event("empresa-updated"));
      }
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar configuración.";
      setMensajeError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleValidarRutaRespaldo = async () => {
    setValidandoRuta(true);
    setResultadoValidacionRuta(null);
    try {
      const ruta = config.rutaCarpetaRespaldo?.trim() || "";
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "VALIDAR_RUTA", ruta }),
      });
      const data = await res.json();
      if (data.ok) {
        setResultadoValidacionRuta({
          valido: true,
          mensaje: `Ruta accesible con permisos completos de escritura: ${data.rutaResuelta}`,
        });
      } else {
        setResultadoValidacionRuta({
          valido: false,
          mensaje: data.error || "La ruta no es accesible o carece de permisos de escritura.",
        });
      }
    } catch {
      setResultadoValidacionRuta({
        valido: false,
        mensaje: "Error de red al comprobar la ruta en el servidor.",
      });
    } finally {
      setValidandoRuta(false);
    }
  };

  const handleRestablecerRutaDefault = () => {
    const rutaDef = infoRespaldoServidor?.rutaPorDefecto || (navigator.platform.includes("Win") ? "C:\\POS_BACKUPS" : "database/backups_locales");
    setConfig((prev) => ({ ...prev, rutaCarpetaRespaldo: rutaDef }));
    setResultadoValidacionRuta(null);
  };

  const handleDescargarArchivoHistorial = (nombreArchivo: string) => {
    const enlace = document.createElement("a");
    enlace.href = `/api/backup?archivo=${encodeURIComponent(nombreArchivo)}`;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const handleForzarRespaldo = async () => {
    setRespaldando(true);
    setMensajeExito(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: "MANUAL_DESDE_ADMIN" }),
      });
      const data = await res.json();
      if (data.ok && data.resultado) {
        setUltimoRespaldoInfo({
          bytes: data.resultado.tamanioBytes,
          timestamp: new Date().toISOString(),
        });
        setMensajeExito(`Respaldo SQLite generado con éxito en ${config.rutaCarpetaRespaldo || "POS_BACKUPS"}.`);
        cargarInfoRespaldo();
        setTimeout(() => setMensajeExito(null), 4000);
      }
    } catch {
      setMensajeError("Fallo al ejecutar el respaldo manual.");
    } finally {
      setRespaldando(false);
    }
  };

  /**
   * Inicia la descarga directa del archivo binario .db completo del sistema
   */
  const handleDescargarRespaldo = async () => {
    setDescargandoRespaldo(true);
    setMensajeError(null);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "No se pudo generar el archivo de respaldo para descarga.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let nombreArchivo = "Respaldo_Sistema.db";
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) nombreArchivo = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);

      setMensajeExito(`Copia de seguridad descargada exitosamente (${nombreArchivo}).`);
      cargarInfoRespaldo();
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error durante la descarga del respaldo.";
      setMensajeError(msg);
    } finally {
      setDescargandoRespaldo(false);
    }
  };

  /**
   * Abre la carpeta local de respaldos en el Explorador de Windows en el servidor
   * y copia la ruta de respaldos al portapapeles del navegador.
   */
  const handleAbrirCarpetaExplorador = async () => {
    setAbriendoCarpeta(true);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      const rutaDestino = config.rutaCarpetaRespaldo || "C:\\POS_BACKUPS";
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(rutaDestino).catch(() => {});
      }

      const res = await fetch("/api/backup?abrirCarpeta=true", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMensajeExito("Carpeta de respaldos abierta en el Explorador de Windows y ruta copiada al portapapeles.");
      } else {
        setMensajeExito(`Ruta de respaldos copiada al portapapeles: ${rutaDestino}`);
      }
      setTimeout(() => setMensajeExito(null), 5000);
    } catch {
      const rutaDestino = config.rutaCarpetaRespaldo || "C:\\POS_BACKUPS";
      setMensajeExito(`Ruta de respaldos copiada al portapapeles: ${rutaDestino}`);
      setTimeout(() => setMensajeExito(null), 5000);
    } finally {
      setAbriendoCarpeta(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-600 font-semibold">Cargando panel de configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Configuración
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                Solo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Parámetros generales de tienda y facturación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end flex-nowrap">
          <IconButtonTooltip
            icon={BarChart3}
            label="Dashboard Gerencial"
            modulo="Gerencia"
            destino="Ruta: /admin/dashboard"
            href="/admin/dashboard"
            size="md"
            variant="neutral"
          />

          <IconButtonTooltip
            icon={ShoppingBag}
            label="Terminal POS"
            modulo="Mostrador"
            destino="Ruta: /caja/pos"
            href="/caja/pos"
            size="md"
            variant="neutral"
          />

          <IconButtonTooltip
            icon={UserCheck}
            label="Usuarios y Permisos"
            modulo="Seguridad"
            destino="Ruta: /admin/usuarios"
            href="/admin/usuarios"
            size="md"
            variant="neutral"
          />

          <IconButtonTooltip
            icon={Database}
            label={respaldando ? "Creando..." : "Crear Respaldo"}
            modulo="Copias de Seguridad"
            destino="Crea copia en caliente en boveda local y nube"
            onClick={handleForzarRespaldo}
            disabled={respaldando}
            size="md"
            variant="neutral"
          />
        </div>
      </header>

      {/* Notificaciones */}
      {mensajeExito && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800 text-xs font-semibold shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Conexión de Dispositivos en Red Local LAN */}
      <TarjetaConexionLAN />

      {/* ===================================================================== */}
      {/* SECCIÓN: COPIAS DE SEGURIDAD, MIGRACIÓN Y CONTINUIDAD OPERATIVA       */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-xs text-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Copias de Seguridad, Migración y Continuidad Operativa
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  SQLite WAL Checkpoint
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                  VACUUM INTO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Genere respaldos atómicos sin detener la operación, descargue copias completas al computador desde el cual está conectado (cliente o servidor) o restaure copias previas para migración entre equipos y recuperación de desastres.
              </p>
            </div>
          </div>

          {ultimoRespaldoInfo && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Última copia:{" "}
                <strong className="text-slate-900">
                  {Math.round(ultimoRespaldoInfo.bytes / 1024)} KB
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Panel 1: Configuración de Ruta Predeterminada en Servidor / PC Principal */}
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Ubicación / Carpeta Predeterminada de Respaldos (Servidor Local)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ruta física en el computador donde se ejecuta el sistema POS para respaldos automáticos de cierre de caja y sincronización en disco.
              </p>
            </div>
            {infoRespaldoServidor && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  infoRespaldoServidor.permisosEscritura
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {infoRespaldoServidor.permisosEscritura
                  ? "Permisos de Escritura Verificados"
                  : "Atención: Verifique Permisos de Ruta"}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="flex-1 relative">
              <input
                type="text"
                name="rutaCarpetaRespaldo"
                value={config.rutaCarpetaRespaldo}
                onChange={handleChange}
                placeholder="Ejemplo: C:\POS_BACKUPS o /var/backups/pos"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <button
              type="button"
              onClick={handleValidarRutaRespaldo}
              disabled={validandoRuta}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer shrink-0"
              title="Comprobar si el sistema puede escribir en este directorio"
            >
              {validandoRuta ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Probar Acceso</span>
            </button>
            <button
              type="button"
              onClick={handleRestablecerRutaDefault}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer shrink-0"
              title="Restablecer la ruta predeterminada del sistema operativo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restablecer</span>
            </button>
          </div>

          {resultadoValidacionRuta && (
            <div
              className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                resultadoValidacionRuta.valido
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {resultadoValidacionRuta.valido ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{resultadoValidacionRuta.mensaje}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 gap-1">
            <span>
              Ruta activa actual en servidor:{" "}
              <code className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {infoRespaldoServidor?.rutaCarpetaPrincipal || config.rutaCarpetaRespaldo}
              </code>
            </span>
            <span className="text-slate-400">
              Copia interna espejo: <code className="font-mono text-slate-600">database/backups_locales/</code>
            </span>
          </div>
        </div>

        {/* Panel 2: Botonera Operativa de Copias de Seguridad */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Generar y Descargar al PC Cliente */}
          <button
            type="button"
            onClick={handleDescargarRespaldo}
            disabled={descargandoRespaldo}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            title="Genera un respaldo con checkpoint atómico y lo descarga directamente al navegador de este computador"
          >
            {descargandoRespaldo ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {descargandoRespaldo
                ? "Generando y Descargando..."
                : "Generar y Descargar al PC (.db)"}
            </span>
          </button>

          {/* 2. Generar Respaldo en Servidor */}
          <button
            type="button"
            onClick={handleForzarRespaldo}
            disabled={respaldando}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            title="Ejecuta el respaldo en caliente y lo guarda en la carpeta configurada del servidor"
          >
            {respaldando ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              {respaldando ? "Creando en Servidor..." : "Generar Copia en Servidor"}
            </span>
          </button>

          {/* 3. Abrir Carpeta en Servidor / Copiar Ruta */}
          <button
            type="button"
            onClick={handleAbrirCarpetaExplorador}
            disabled={abriendoCarpeta}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition disabled:opacity-50 cursor-pointer"
            title="Abre la carpeta en el Explorador de Windows del servidor local o copia la ruta"
          >
            {abriendoCarpeta ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <FolderOpen className="w-4 h-4 text-amber-600" />
            )}
            <span>
              {abriendoCarpeta
                ? "Abriendo en Servidor..."
                : "Abrir Carpeta en Servidor"}
            </span>
          </button>
        </div>

        {/* Panel Informativo: Gestión de Infraestructura, Servicio y Restauración */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Control de Infraestructura, Servicio y Restauración de Base de Datos
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Para garantizar la integridad y coherencia contable del sistema, las operaciones críticas de infraestructura (restauración de base de datos, auto-arranque del servicio de Windows, detención segura con respaldo previo y formateo de fábrica) se gestionan de forma centralizada desde el programa de escritorio nativo:
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono text-xs text-emerald-400 font-bold bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span>Panel Servidor POS (Panel_Servidor_POS.exe)</span>
          </div>
        </div>

        {/* Panel 3: Historial de Respaldos Disponibles en el Servidor con Descarga / Restauración */}
        {infoRespaldoServidor && infoRespaldoServidor.historialReciente.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                Copias de Seguridad Disponibles en el Servidor ({infoRespaldoServidor.historialReciente.length})
              </span>
              <button
                type="button"
                onClick={cargarInfoRespaldo}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Actualizar Lista</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3.5 py-2.5">Archivo</th>
                    <th className="px-3 py-2.5">Fecha y Hora</th>
                    <th className="px-3 py-2.5 text-right">Tamaño</th>
                    <th className="px-3 py-2.5 text-center">Ubicación</th>
                    <th className="px-3 py-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {infoRespaldoServidor.historialReciente.slice(0, 8).map((archivo, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-3.5 py-2 font-bold text-slate-900 truncate max-w-[280px]">
                        {archivo.nombre}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-sans text-xs">
                        {new Date(archivo.fechaModificacion).toLocaleString("es-CO", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">
                        {Math.round(archivo.tamanioBytes / 1024)} KB
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase font-sans ${
                            archivo.origen === "EXTERNO"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {archivo.origen === "EXTERNO" ? "Carpeta Predeterminada" : "Local"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center font-sans">
                          <button
                            type="button"
                            onClick={() => handleDescargarArchivoHistorial(archivo.nombre)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition cursor-pointer text-xs font-semibold"
                            title="Descargar este archivo a este computador"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Panel 4: Subcarpetas Estructuradas por Módulos para Auditoría e Inspección Humana */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-blue-600" />
              Volcados Estructurados por Carpetas (Archivos JSON Legibles)
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {config.rutaCarpetaRespaldo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">inventario/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">Productos</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Catálogo completo de productos, referencias, precios y stock activo en JSON.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">clientes/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Directorio</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Clientes, teléfonos principales, celulares secundarios y cédulas DIAN.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">historial_facturas/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">Ventas</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Facturas emitidas, abonos recibidos y prendas de alquiler registradas.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">movimientos_caja/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">Arqueos</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Turnos de cajero, arqueos de apertura, bases de caja y cierres de turno.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Distribución Principal en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Formulario de Configuración (7 Columnas) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: IDENTIDAD VISUAL Y LOGOTIPO DE EMPRESA */}
            <div className="bg-[#FCFDFE] rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Logotipo Oficial del Sistema y Facturas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sincronización automática en Login, Menú Lateral, Terminal POS, Barra Superior, Favicon y Facturas impresas (80mm, Media Carta y Carta).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={`Logo ${config.nombreComercial || "Mi Empresa"}`}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-xs text-slate-400 font-bold block">
                        Sin logotipo
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Subir Imagen del Logo (PNG, JPG o WEBP)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      El sistema optimiza automáticamente las proporciones a máximo 600px.
                    </p>
                  </div>

                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={handleEliminarLogo}
                      className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar logotipo actual</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS COMERCIALES Y FISCALES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Identidad Comercial y Fiscal
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre Comercial / Tienda
                  </label>
                  <input
                    type="text"
                    required
                    name="nombreComercial"
                    value={config.nombreComercial}
                    onChange={handleChange}
                    placeholder="Mi Empresa"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Eslogan o Subtítulo
                  </label>
                  <input
                    type="text"
                    name="eslogan"
                    value={config.eslogan}
                    onChange={handleChange}
                    placeholder="Punto de Venta y Servicios"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIT / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    required
                    name="nit"
                    value={config.nit}
                    onChange={handleChange}
                    placeholder="000.000.000-0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Régimen / Responsabilidad Fiscal
                  </label>
                  <input
                    type="text"
                    name="regimenFiscal"
                    value={config.regimenFiscal}
                    onChange={handleChange}
                    placeholder="No Responsable de IVA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={config.telefono}
                    onChange={handleChange}
                    placeholder="000 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={config.email}
                    onChange={handleChange}
                    placeholder="contacto@miempresa.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={config.direccion}
                    onChange={handleChange}
                    placeholder="Calle 15 # 22-30, Barrio Siete de Agosto"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad y Departamento
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={config.ciudad}
                    onChange={handleChange}
                    placeholder="Villavicencio, Meta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Formato Predeterminado de Facturación
                  </label>
                  <select
                    name="formatoPredeterminado"
                    value={config.formatoPredeterminado}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                  >
                    <option value="MEDIA_CARTA">Media Carta Individual (1 por hoja — Ventas y Apartados)</option>
                    <option value="MEDIA_CARTA_DOBLE">Media Carta Doble (2 por hoja — Alquileres)</option>
                    <option value="TIRILLA">Tirilla POS (80mm / Térmica)</option>
                    <option value="CARTA">Carta Completa Vertical (1 página)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Carpeta Predeterminada de Respaldos en Servidor
                  </label>
                  <input
                    type="text"
                    name="rutaCarpetaRespaldo"
                    value={config.rutaCarpetaRespaldo}
                    onChange={handleChange}
                    placeholder="Ejemplo: C:\POS_BACKUPS o /var/backups/pos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ubicación en el equipo servidor donde se guardan automáticamente las copias al cerrar turno de caja.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: HARDWARE POS: IMPRESORA TÉRMICA Y CAJÓN MONEDERO RJ11/RJ12 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Hardware POS: Impresora Térmica y Cajón Monedero RJ11
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => cargarImpresorasWindows(true)}
                  disabled={cargandoImpresoras}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  title="Detectar y refrescar impresoras conectadas en Windows"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cargandoImpresoras ? "animate-spin text-blue-600" : ""}`} />
                  <span>{cargandoImpresoras ? "Detectando..." : "Detectar / Refrescar Impresoras"}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Selector de Impresora */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Impresora Térmica con Puerto DK (Cajón Monedero Conectado)
                  </label>
                  <select
                    name="nombreImpresoraPos"
                    value={config.nombreImpresoraPos}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="">
                      Impresora Predeterminada de Windows (Detección Automática)
                    </option>
                    {impresorasWindows.map((imp) => (
                      <option key={imp} value={imp}>
                        {imp}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Seleccione la impresora térmica de recibos (80mm/58mm) a la que está conectado físicamente el cable RJ11 del cajón.
                  </p>
                </div>

                {/* Selector de Pin de Conexión */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pin del Puerto DK / Cable RJ11
                    </label>
                    <select
                      name="pinCajon"
                      value={config.pinCajon}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value={0}>Pin 2 (Estándar Universal Epson / Xprinter / POS-80)</option>
                      <option value={1}>Pin 5 (Secundario / Bixolon / Citizen / Otros)</option>
                      <option value={2}>Pulso Dual (Pines 2 y 5 simultáneos — Universal)</option>
                    </select>
                  </div>

                  {/* Botón de Prueba en Vivo */}
                  <div className="flex flex-col justify-end">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={probandoCajon}
                        onClick={probarAperturaCajon}
                        className="w-full px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 min-h-[42px]"
                      >
                        <LockOpen className="h-4 w-4 text-amber-700" />
                        <span>{probandoCajon ? "Probando..." : "Probar Apertura Cajón"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const w = window.open("", "_blank", "width=380,height=500");
                          if (w) {
                            w.document.write(`
                              <html>
                                <head>
                                  <title>Ticket de Prueba — Aurora-POS</title>
                                  <style>
                                    body { font-family: monospace; font-size: 12px; margin: 10px; text-align: center; }
                                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                                    .bold { font-weight: bold; font-size: 14px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="bold">AURORA-POS</div>
                                  <div>PRUEBA DE IMPRESIÓN TÉRMICA</div>
                                  <div class="divider"></div>
                                  <div>Estado: 100% OPERATIVO</div>
                                  <div>Fecha: ${new Date().toLocaleString("es-CO")}</div>
                                  <div>Terminal: Mostrador Principal</div>
                                  <div class="divider"></div>
                                  <div>¡Tu impresora térmica está configurada correctamente!</div>
                                  <div class="divider"></div>
                                  <div style="margin-top: 25px;">.</div>
                                </body>
                              </html>
                            `);
                            w.document.close();
                            w.focus();
                            setTimeout(() => { w.print(); w.close(); }, 500);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 min-h-[42px]"
                      >
                        <Printer className="h-4 w-4 text-blue-700" />
                        <span>Ticket de Prueba</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notificación de Prueba */}
                {resultadoPruebaCajon && (
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
                      resultadoPruebaCajon.tipo === "exito"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}
                  >
                    {resultadoPruebaCajon.tipo === "exito" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{resultadoPruebaCajon.mensaje}</span>
                  </div>
                )}

                {/* Switch Apertura Automática al Cobrar en Efectivo */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      Apertura Automática del Cajón al Cobrar en Efectivo
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Abre el cajón monedero automáticamente al confirmar ventas, contratos de alquiler, apartados o liquidar depósitos en efectivo.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="abrirCajonAutoEfectivo"
                      checked={config.abrirCajonAutoEfectivo}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Nota de Ayuda y Manual */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Guía de Hardware:</strong> Asegúrese de que el cable telefónico RJ11 esté conectado en el puerto marcado como <em>DK</em> o <em>Drawer</em> en la parte trasera de la impresora térmica, y que la llave frontal del cajón esté en posición vertical (modo apertura electrónica).
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: INFORMACIÓN DEL VENDEDOR / CAJERO */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Información del Vendedor / Cajero
                </h2>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-sm text-slate-900 block">
                    Mostrar Cajero / Vendedor en la Factura Impresa
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Incluye el nombre del usuario autenticado que emitió la factura o registró el abono.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="mostrarVendedorFactura"
                    checked={config.mostrarVendedorFactura}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: REQUISITOS, NORMAS Y POLÍTICAS AL PIE DE FACTURA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Requisitos, Normas y Políticas de Factura
                </h2>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Términos, Condiciones y Políticas de Alquiler / Venta
                  </label>
                  <textarea
                    rows={4}
                    name="politicasFactura"
                    value={config.politicasFactura}
                    onChange={handleChange}
                    placeholder="Escriba los requisitos de entrega, garantías, moras por retraso..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Aparece impreso en la parte inferior de las facturas en Tirilla, Media Carta y Carta.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pie Institucional o Mensaje de Agradecimiento
                  </label>
                  <input
                    type="text"
                    name="piePaginaFactura"
                    value={config.piePaginaFactura}
                    onChange={handleChange}
                    placeholder="¡Gracias por su preferencia! Tradición y calidad."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* BOTÓN GUARDAR CONFIGURACIÓN */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition duration-200 flex items-center space-x-2 disabled:opacity-50 min-h-[44px]"
              >
                <Save className="h-4 w-4" />
                <span>{guardando ? "Guardando..." : "Guardar"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Simulador en Vivo de Facturas (5 Columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-24">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Simulador en Vivo de Factura
                </span>
              </div>
              <div className="flex items-center space-x-1 text-slate-500 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Vista Previa 1:1</span>
              </div>
            </div>

            {/* Pestañas de Formato en el Simulador */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-4 gap-1">
              <button
                type="button"
                onClick={() => setFormatoSimulador("TIRILLA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "TIRILLA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tirilla (80mm)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("MEDIA_CARTA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "MEDIA_CARTA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Media Carta (1x)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("MEDIA_CARTA_DOBLE")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "MEDIA_CARTA_DOBLE"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Media Carta Doble (2 en 1)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("CARTA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "CARTA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Carta Completa
              </button>
            </div>

            {/* Selector de Tipo de Operación para la Simulación */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-semibold text-slate-700 mb-3">
              <span className="text-[11px] px-2 font-bold text-slate-500 uppercase tracking-wider">
                Simular Tipo de Factura:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTipoOperacionSimulador("VENTA");
                    setFormatoSimulador("MEDIA_CARTA");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    tipoOperacionSimulador === "VENTA"
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Venta (1 Media Carta)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoOperacionSimulador("ALQUILER");
                    setFormatoSimulador("MEDIA_CARTA_DOBLE");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    tipoOperacionSimulador === "ALQUILER"
                      ? "bg-amber-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Alquiler (2 en 1 Hoja)
                </button>
              </div>
            </div>

            {/* CONTENEDOR DEL SIMULADOR SEGÚN FORMATO */}
            {formatoSimulador === "TIRILLA" && (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 font-mono text-xs text-slate-900 shadow-inner max-w-xs mx-auto">
                {/* Logo en Tirilla */}
                {config.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="h-12 object-contain"
                    />
                  </div>
                )}

                {/* Encabezado */}
                <div className="text-center space-y-0.5 mb-2.5">
                  <p className="font-bold text-sm uppercase tracking-wide">
                    {config.nombreComercial || "Mi Empresa"}
                  </p>
                  {config.eslogan && <p className="text-[10px] italic text-slate-600">{config.eslogan}</p>}
                  <p className="text-[11px]">NIT: {config.nit || "900.123.456-7"}</p>
                  {config.regimenFiscal && <p className="text-[10px] text-slate-600">{config.regimenFiscal}</p>}
                  <p className="text-[10.5px]">{config.direccion || "Villavicencio, Meta"}</p>
                  <p className="text-[10.5px]">TEL: {config.telefono || "310 123 4567"}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Datos Muestra */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA:" : "FACTURA DE ALQUILER:"}</span>
                    <span>1001</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>FECHA: 25/10/2026</span>
                    <span>HORA: 10:30 AM</span>
                  </div>
                  {config.mostrarVendedorFactura && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>CAJERO: admin</span>
                      <span>OP: {tipoOperacionSimulador}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span>{tipoOperacionSimulador === "VENTA" ? "CLIENTE:" : "ARRENDATARIO:"}</span>
                    <span>CARLOS ANDRÉS PÉREZ</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Ítems Muestra */}
                <div className="space-y-1 mb-2 text-xs">
                  <div className="flex justify-between font-bold text-[11px] text-slate-700">
                    <span>DESCRIPCIÓN</span>
                    <span>VALOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera Blanca [CL-01]" : "Traje Llanero Blanco [TR-01]"}</span>
                    <span className="font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Ajuste de Manga (Sastrería)</span>
                    <span className="font-bold">$15.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Recuadro de Depósito en Garantía y Entrega Obligatoria - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <>
                    <div className="border-t border-dashed border-amber-400 my-2"></div>
                    <div className="bg-amber-100 border border-amber-300 rounded p-1.5 text-[10.5px] space-y-0.5 text-amber-950">
                      <div className="flex justify-between font-bold text-amber-950">
                        <span>DEPÓSITO EN GARANTÍA Y ENTREGA:</span>
                        <span>$50.000</span>
                      </div>
                      <p className="text-[9.5px] text-amber-900">Custodia: $50.000 reembolsable al entregar prendas completas.</p>
                      <div className="flex justify-between font-bold text-[9.5px] text-rose-900">
                        <span>ENTREGA OBLIGATORIA:</span>
                        <span>Miércoles 8:00 p.m. (20:00)</span>
                      </div>
                      <div className="text-[8.5px] text-slate-700 pt-0.5 border-t border-amber-200">
                        Cobros Adicionales: Saldo $50.000 | Mora diaria: $15.000/día
                      </div>
                    </div>
                  </>
                )}

                {/* Totales Segregados de Tirilla */}
                <div className="space-y-1 font-bold text-xs pt-1">
                  {tipoOperacionSimulador === "ALQUILER" ? (
                    <div className="py-1.5 border-2 border-black bg-slate-100 p-2 rounded my-1 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Total Valor Alquiler:</span>
                        <span className="font-mono">$100.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Depósito en Garantía:</span>
                        <span className="font-mono">$50.000</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 pt-0.5 border-t border-black bg-slate-200/70 px-1 rounded">
                        <span>Total Alquiler más Depósito:</span>
                        <span className="font-mono text-sm">$150.000</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-bold pt-0.5 border-t border-dashed border-black">
                        <span>Recibido:</span>
                        <span className="font-mono">$150.000</span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-black pt-0.5">
                        <span>Valor Pagado (Efectivo):</span>
                        <span className="font-mono">$150.000</span>
                      </div>
                      <div className="flex justify-between font-black text-emerald-800 pt-0.5 border-t border-black">
                        <span>Vueltas:</span>
                        <span className="font-mono">$0</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm font-black">
                        <span>TOTAL VENTA:</span>
                        <span>$100.000</span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>COBRO RECIBIDO (EFECTIVO):</span>
                        <span>$100.000</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Políticas (Solo en Ventas; omitidas en Alquiler) */}
                {tipoOperacionSimulador === "VENTA" && (
                  <div className="text-[10px] text-justify leading-tight text-slate-600 my-2">
                    Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.
                  </div>
                )}

                <div className="mt-2 text-center border-t border-dotted border-slate-300 pt-1.5 text-[9.5px] text-slate-500 uppercase font-sans">
                  {config.piePaginaFactura || "¡GRACIAS POR SU PREFERENCIA! — CERO QR"}
                </div>
              </div>
            )}

            {formatoSimulador === "MEDIA_CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 shadow-inner space-y-2.5">
                {/* Cabecera Media Carta */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="flex items-center gap-2.5">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm uppercase text-slate-950">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[9.5px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[9.5px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[9.5px] text-slate-500">{config.direccion}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-1.5 text-right bg-white shadow-2xs">
                    <span className="block text-[8.5px] font-bold text-slate-500">
                      {tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA" : "FACTURA DE ALQUILER"}
                    </span>
                    <span className="block font-mono font-bold text-sm text-blue-700">1001</span>
                    <span className="block text-[7.5px] font-bold text-slate-400">COPIA CLIENTE</span>
                  </div>
                </div>

                {/* Ficha Cliente */}
                <div className="bg-white p-2.5 rounded-lg border grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-500 block">
                      {tipoOperacionSimulador === "VENTA" ? "CLIENTE / ADQUIRIENTE:" : "CLIENTE / ARRENDATARIO:"}
                    </span>
                    <span className="font-bold text-xs">CARLOS ANDRÉS PÉREZ</span>
                    <span className="block text-slate-500">CC: 1.121.890.123 | Tel: 312 456 7890</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">DATOS DE LA OPERACIÓN:</span>
                    <span>{tipoOperacionSimulador === "VENTA" ? "Venta Comercial | Pago con Saldo" : "Alquiler | Devolución: 28/10/2026"}</span>
                    {config.mostrarVendedorFactura && <span className="block text-slate-500">Cajero: admin</span>}
                  </div>
                </div>

                {/* Tabla */}
                <div className="bg-white p-2 rounded-lg border">
                  <div className="flex justify-between font-bold border-b pb-1 text-[9.5px] text-slate-600">
                    <span>CANT | DESCRIPCIÓN</span>
                    <span>SUBTOTAL</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-[10.5px]">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera Blanca [CL-01]" : "Traje Llanero Gala Blanco [TL-01]"}</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-1 text-[10.5px]">
                    <span>1x Arreglo de Sastrería</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Recuadro de Depósito y Entrega Obligatoria - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-[10px] space-y-1 text-amber-950">
                    <div className="flex justify-between font-bold text-amber-950 border-b border-amber-300 pb-0.5">
                      <span>DEPÓSITO EN GARANTÍA Y ENTREGA:</span>
                      <span>$50.000</span>
                    </div>
                    <p className="text-[9px] text-amber-900 leading-tight">
                      Custodia: $50.000 en custodia (Se devuelve 100% al entregar prendas completas).
                    </p>
                    <div className="flex justify-between font-bold text-[9px] text-rose-900">
                      <span>ENTREGA OBLIGATORIA:</span>
                      <span>Miércoles 8:00 p.m. (20:00)</span>
                    </div>
                  </div>
                )}

                {/* Pie Media Carta */}
                <div className="flex justify-between items-start gap-3 pt-1 border-t text-[10px]">
                  <div className="flex-1 text-slate-700 line-clamp-3">
                    {tipoOperacionSimulador === "ALQUILER" ? (
                      <div className="p-1.5 bg-amber-50 rounded border border-amber-200 text-amber-950">
                        <span className="font-bold uppercase text-[9px] block mb-0.5">OBSERVACIONES:</span>
                        <span>A partir del día siguiente de la fecha de entrega se descontará $15.000 por día de mora del depósito en garantía.</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">POLÍTICAS COMERCIALES:</span>
                        <span>Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.</span>
                      </div>
                    )}
                  </div>
                  <div className="w-48 text-right font-mono text-[10px] space-y-0.5 border-2 border-slate-300 p-1.5 rounded-lg bg-white">
                    {tipoOperacionSimulador === "ALQUILER" ? (
                      <>
                        <div className="text-slate-800">Total Valor Alquiler: <strong>$100.000</strong></div>
                        <div className="text-amber-800 font-bold">Depósito en Garantía: <strong>$50.000</strong></div>
                        <div className="font-black text-slate-950 bg-slate-100 p-0.5 rounded">Total Alquiler más Depósito: $150.000</div>
                        <div className="text-slate-700 font-semibold">Recibido: <strong>$150.000</strong></div>
                        <div className="text-emerald-700 font-black">Valor Pagado (Efectivo): $150.000</div>
                        <div className="text-emerald-700 font-semibold">Vueltas: $0</div>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-slate-900 text-xs">
                          TOTAL VENTA: <strong>$100.000</strong>
                        </div>
                        <div className="text-emerald-700 font-semibold">Cobro Recibido: $100.000</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {formatoSimulador === "MEDIA_CARTA_DOBLE" && (
              <div className="bg-white border-2 border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 shadow-sm space-y-2.5">
                <div className="text-center pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    Hoja Tamaño Carta Vertical (2 Medias Cartas en 1 Sola Hoja)
                  </span>
                  <span className="text-[9px] text-slate-500">
                    Ahorro del 50% de papel — 1 original para el cliente y 1 copia para archivo
                  </span>
                </div>

                {/* Mitad Superior: EJEMPLAR 1 */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[10px]">
                  <div className="flex items-start justify-between border-b pb-1">
                    <div className="flex items-center gap-2">
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="h-7 object-contain" />
                      )}
                      <div>
                        <h4 className="font-bold text-[11px] uppercase text-slate-900">{config.nombreComercial}</h4>
                        <p className="text-[8.5px] text-slate-500">NIT: {config.nit} | {config.direccion}</p>
                      </div>
                    </div>
                    <div className="border rounded px-1.5 py-0.5 text-right bg-white">
                      <span className="block text-[8.5px] font-bold text-slate-500">
                        {tipoOperacionSimulador === "VENTA" ? "VENTA 1001" : "ALQUILER 1001"}
                      </span>
                      <span className="block text-[7.5px] font-black text-indigo-700">EJEMPLAR 1: ORIGINAL CLIENTE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-1 rounded border">
                    <div>
                      <span className="font-bold text-slate-600">Cliente:</span> CARLOS PÉREZ (1.121.890.123)
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-600">Operación:</span> {tipoOperacionSimulador === "VENTA" ? "Venta Directa" : "Alquiler | Dev: 28/10/2026"}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded border text-[9.5px] flex justify-between font-medium">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera + Arreglo" : "Traje Llanero Gala + Arreglo"}</span>
                    <span className="font-mono font-bold">$100.000</span>
                  </div>

                  {tipoOperacionSimulador === "ALQUILER" && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-1 text-[8.5px] flex justify-between font-bold text-amber-900">
                      <span>Constancia Depósito Efectivo:</span>
                      <span>$50.000</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] pt-0.5">
                    <span className="text-slate-500 text-[8px] truncate max-w-[190px]">
                      {tipoOperacionSimulador === "VENTA"
                        ? "Gracias por su compra. Conserve esta factura."
                        : config.politicasFactura}
                    </span>
                    <div className="text-right font-mono font-black text-slate-950">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} $100.000 | <span className="text-rose-700">Saldo: $50.000</span>
                    </div>
                  </div>
                </div>

                {/* Línea Central de Corte */}
                <div className="relative border-t-2 border-dashed border-slate-400 my-1 text-center">
                  <span className="bg-white px-2 py-0.5 text-[8.5px] font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300 flex items-center gap-1 shadow-2xs">
                    <Scissors className="w-2.5 h-2.5 text-slate-500" />
                    <span>-- CORTAR POR ESTA LÍNEA (2 MEDIAS CARTAS EN 1 HOJA) --</span>
                  </span>
                </div>

                {/* Mitad Inferior: EJEMPLAR 2 */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[10px]">
                  <div className="flex items-start justify-between border-b pb-1">
                    <div className="flex items-center gap-2">
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="h-7 object-contain" />
                      )}
                      <div>
                        <h4 className="font-bold text-[11px] uppercase text-slate-900">{config.nombreComercial}</h4>
                        <p className="text-[8.5px] text-slate-500">NIT: {config.nit} | {config.direccion}</p>
                      </div>
                    </div>
                    <div className="border rounded px-1.5 py-0.5 text-right bg-white">
                      <span className="block text-[8.5px] font-bold text-slate-500">
                        {tipoOperacionSimulador === "VENTA" ? "VENTA 1001" : "ALQUILER 1001"}
                      </span>
                      <span className="block text-[7.5px] font-black text-slate-700">EJEMPLAR 2: COPIA ARCHIVO / TIENDA</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-1 rounded border">
                    <div>
                      <span className="font-bold text-slate-600">Cliente:</span> CARLOS PÉREZ (1.121.890.123)
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-600">Operación:</span> {tipoOperacionSimulador === "VENTA" ? "Venta Directa" : "Alquiler | Dev: 28/10/2026"}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded border text-[9.5px] flex justify-between font-medium">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera + Arreglo" : "Traje Llanero Gala + Arreglo"}</span>
                    <span className="font-mono font-bold">$100.000</span>
                  </div>

                  {tipoOperacionSimulador === "ALQUILER" && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-1 text-[8.5px] flex justify-between font-bold text-amber-900">
                      <span>Constancia Depósito Efectivo:</span>
                      <span>$50.000</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] pt-0.5">
                    <span className="text-slate-500 text-[8px] truncate max-w-[190px]">
                      {tipoOperacionSimulador === "VENTA"
                        ? "Gracias por su compra. Conserve esta factura."
                        : config.politicasFactura}
                    </span>
                    <div className="text-right font-mono font-black text-slate-950">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} $100.000 | <span className="text-rose-700">Saldo: $50.000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formatoSimulador === "CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs text-slate-900 shadow-inner space-y-3">
                {/* Cabecera Carta */}
                <div className="flex items-start justify-between border-b pb-2.5">
                  <div className="flex items-center gap-3">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" />
                    )}
                    <div>
                      <h3 className="font-black text-base uppercase text-slate-950">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[10px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[10px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[10px] text-slate-500">{config.direccion} — {config.ciudad}</p>
                      <p className="text-[10px] text-slate-500">Tel: {config.telefono}</p>
                    </div>
                  </div>
                  <div className="border-2 rounded-xl p-2 text-right bg-white shadow-xs">
                    <span className="block text-[9px] font-bold text-slate-500">
                      {tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA" : "FACTURA DE ALQUILER"}
                    </span>
                    <span className="block font-mono font-bold text-base text-blue-700">1001</span>
                    <span className="block text-[8px] font-bold text-slate-400">ORIGINAL CLIENTE</span>
                  </div>
                </div>

                {/* Ficha Cliente & Operación */}
                <div className="bg-white p-2.5 rounded-xl border grid grid-cols-2 gap-3 text-[10.5px]">
                  <div>
                    <span className="font-bold text-slate-500 block">
                      {tipoOperacionSimulador === "VENTA" ? "DATOS DEL CLIENTE / ADQUIRIENTE:" : "DATOS DEL CLIENTE / ARRENDATARIO:"}
                    </span>
                    <p className="font-bold text-slate-950 text-xs">CARLOS ANDRÉS PÉREZ</p>
                    <p className="text-slate-500">C.C. 1.121.890.123 — Tel: 312 456 7890</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">DETALLES DE LA OPERACIÓN:</span>
                    <p>Tipo: {tipoOperacionSimulador} | Estado: ACTIVA</p>
                    {config.mostrarVendedorFactura && <p className="text-slate-500">Atendido por: admin</p>}
                  </div>
                </div>

                {/* Tabla Resumen */}
                <div className="bg-white p-2 rounded-xl border">
                  <div className="flex justify-between font-bold border-b pb-1 text-[10px] uppercase text-slate-600">
                    <span>Ítem / Descripción</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera de Gala [CL-01]" : "Traje Llanero Gala Blanco [TL-01]"}</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span>1x Arreglo de Sastrería Libre</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Recuadro de Depósito en Garantía y Entrega - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs space-y-1 text-amber-950">
                    <div className="flex justify-between font-bold text-amber-950 border-b border-amber-300 pb-0.5">
                      <span>DEPÓSITO EN GARANTÍA Y ENTREGA:</span>
                      <span className="font-mono">$50.000</span>
                    </div>
                    <p className="text-[10px] text-amber-900 leading-tight">
                      Custodia: Recibido en custodia en mostrador (Se devuelve el 100% al entregar las prendas a conformidad).
                    </p>
                    <div className="p-1 bg-amber-100/90 rounded border border-amber-300 flex justify-between font-bold text-[10px]">
                      <span>ENTREGA OBLIGATORIA:</span>
                      <span className="text-rose-900">Miércoles 8:00 p.m. (20:00)</span>
                    </div>
                    <div className="text-[9px] text-slate-700 pt-0.5 border-t border-amber-200 flex justify-between">
                      <span>Cobros Adicionales: Saldo pendiente: $50.000 | Mora diaria: $15.000/día</span>
                    </div>
                  </div>
                )}

                {/* Totales y Políticas Segregados */}
                <div className="flex justify-between items-start gap-3 pt-1 border-t text-[10px]">
                  <div className="flex-1 p-2 bg-white rounded border text-slate-700 line-clamp-3">
                    {tipoOperacionSimulador === "ALQUILER" ? (
                      <div className="p-1.5 bg-amber-50 rounded border border-amber-200 text-amber-950">
                        <span className="font-bold uppercase text-[9px] block mb-0.5">OBSERVACIONES:</span>
                        <span>A partir del día siguiente de la fecha de entrega se descontará $15.000 por día de mora del depósito en garantía.</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold block text-slate-700 mb-0.5">POLÍTICAS COMERCIALES:</span>
                        <span>Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento.</span>
                      </div>
                    )}
                  </div>
                  <div className="w-52 text-right font-mono space-y-1 text-xs border-2 border-slate-300 p-2 rounded-xl bg-white">
                    {tipoOperacionSimulador === "ALQUILER" ? (
                      <>
                        <div className="text-slate-800">Total Valor Alquiler: <strong>$100.000</strong></div>
                        <div className="text-amber-800 font-bold">Depósito en Garantía: <strong>$50.000</strong></div>
                        <div className="font-black text-slate-950 bg-slate-100 p-1 rounded">Total Alquiler más Depósito: $150.000</div>
                        <div className="text-slate-700 font-semibold">Recibido: <strong>$150.000</strong></div>
                        <div className="text-emerald-700 font-black">Valor Pagado (Efectivo): $150.000</div>
                        <div className="text-emerald-700 font-semibold">Vueltas: $0</div>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-sm text-slate-950">
                          TOTAL VENTA: <strong>$100.000</strong>
                        </div>
                        <div className="text-emerald-700 font-semibold">Cobro Recibido (Efectivo): $100.000</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-4 text-center pt-2 text-[9px] text-slate-500">
                  <div className="border-t pt-0.5">Firma Autorizada {config.nombreComercial || "Mi Empresa"}</div>
                  <div className="border-t pt-0.5">Firma y Cédula Cliente</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
