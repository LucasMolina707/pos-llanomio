"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TarjetaConexionLAN from "@/components/red/TarjetaConexionLAN";
import {
  Building2,
  FileText,
  Save,
  Database,
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
} from "lucide-react";

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
  formatoPredeterminado: "TIRILLA" | "MEDIA_CARTA" | "CARTA";
  formatoImpresionDefault: "TIRILLA" | "MEDIA_CARTA" | "CARTA";
  rutaCarpetaRespaldo: string;
}

export default function ConfiguracionAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracion>({
    id: "",
    nombreTienda: "LLANOMIO",
    nombreComercial: "LLANOMIO",
    eslogan: "Trajes Típicos, Disfraces y Sastrería",
    nit: "900.123.456-7",
    regimenFiscal: "No Responsable de IVA",
    direccion: "Calle 15 # 22-30, Barrio Siete de Agosto",
    ciudad: "Villavicencio, Meta",
    telefono: "310 123 4567",
    email: "contacto@llanomio.com",
    logoUrl: null,
    encabezadoFactura: "Ropa, Disfraces, Trajes Típicos y Sastrería Profesional",
    mostrarVendedorFactura: true,
    politicasFactura:
      "Términos y Condiciones de Alquiler: Las prendas deben devolverse en la fecha pactada en el mismo estado en que se reciben. Todo retraso generará cobro de recargo de mora. Cuide su comprobante de pago.",
    piePaginaFactura: "¡Gracias por preferir a LLANOMIO! Tradición, calidad y distinción.",
    formatoPredeterminado: "MEDIA_CARTA",
    formatoImpresionDefault: "MEDIA_CARTA",
    rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formato simulado en la columna derecha
  const [formatoSimulador, setFormatoSimulador] = useState<"TIRILLA" | "MEDIA_CARTA" | "CARTA">("MEDIA_CARTA");

  // Estado del respaldo en caliente
  const [respaldando, setRespaldando] = useState(false);
  const [ultimoRespaldoInfo, setUltimoRespaldoInfo] = useState<{
    bytes: number;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
    cargarInfoRespaldo();
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
          nombreTienda: c.nombreTienda || "LLANOMIO",
          nombreComercial: c.nombreComercial || "LLANOMIO",
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
          rutaCarpetaRespaldo: c.rutaCarpetaRespaldo || "C:\\POS_LLANOMIO_BACKUPS",
        });
        setFormatoSimulador(formatoDefinido);
      }
    } catch {
      setMensajeError("No se pudo cargar la configuración de la empresa.");
    } finally {
      setCargando(false);
    }
  };

  const cargarInfoRespaldo = async () => {
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.ultimoRespaldo) {
        setUltimoRespaldoInfo({
          bytes: data.ultimoRespaldo.tamanioBytes,
          timestamp: data.ultimoRespaldo.fechaModificacion,
        });
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

      setMensajeExito("La configuración de factura y el logotipo han sido actualizados con éxito.");
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar configuración.";
      setMensajeError(msg);
    } finally {
      setGuardando(false);
    }
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
        setMensajeExito("Respaldo SQLite generado con éxito en C:\\POS_LLANOMIO_BACKUPS.");
        setTimeout(() => setMensajeExito(null), 4000);
      }
    } catch {
      setMensajeError("Fallo al ejecutar el respaldo manual.");
    } finally {
      setRespaldando(false);
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
                Configuración de Facturación y Datos Corporativos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                Solo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Personaliza el logotipo, los datos de encabezado, la información del vendedor y las políticas de alquiler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleForzarRespaldo}
            disabled={respaldando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Database className="h-4 w-4 text-blue-600" />
            <span>{respaldando ? "Respaldando..." : "Respaldo SQLite"}</span>
          </button>
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

      {/* Distribución Principal en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Formulario de Configuración (7 Columnas) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: IDENTIDAD VISUAL Y LOGOTIPO DE EMPRESA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Logotipo Corporativo de Factura
                  </h2>
                  <p className="text-xs text-slate-500">
                    Se almacena directamente en Base64 para visualización instantánea 100% offline y en PDF
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Logo LLANOMIO"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold block">
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
                    placeholder="LLANOMIO"
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
                    placeholder="Trajes Típicos, Disfraces y Sastrería"
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
                    placeholder="900.123.456-7"
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
                    placeholder="310 123 4567"
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
                    placeholder="contacto@llanomio.com"
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
                    <option value="MEDIA_CARTA">Media Carta (Half Letter — Recomendado para mostrador)</option>
                    <option value="TIRILLA">Tirilla Térmica (80mm / POS)</option>
                    <option value="CARTA">Carta Completa (Letter — 1 página ejecutiva)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: INFORMACIÓN DEL VENDEDOR / CAJERO */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Información del Vendedor / Cajero
                </h2>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    Mostrar Cajero / Vendedor en la Factura Impresa
                  </span>
                  <span className="text-[11px] text-slate-500 block">
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

            {/* SECCIÓN 4: REQUISITOS, NORMAS Y POLÍTICAS AL PIE DE FACTURA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Requisitos, Normas y Políticas de Factura
                </h2>
              </div>

              <div className="space-y-4 text-xs">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
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

            {/* SECCIÓN 5: POLÍTICA ESTRICTA CERO CÓDIGOS QR EN FACTURAS */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">
                  Política Estricta del Sistema: CERO Códigos QR en Facturas de Cliente
                </span>
                <span className="text-amber-800 leading-relaxed block">
                  Por directriz operativa, las facturas entregadas a los clientes no incorporan códigos QR
                  externos, preservando el espacio para los detalles de las prendas, el desglose financiero y las firmas autorizadas.
                </span>
              </div>
            </div>

            {/* BOTÓN GUARDAR CONFIGURACIÓN */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{guardando ? "Guardando cambios..." : "Guardar Configuración de Facturación"}</span>
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
              <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                <Printer className="h-3.5 w-3.5" />
                <span>Vista Previa 1:1</span>
              </div>
            </div>

            {/* Pestañas de Formato en el Simulador */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-4">
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
                Media Carta
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

            {/* CONTENEDOR DEL SIMULADOR SEGÚN FORMATO */}
            {formatoSimulador === "TIRILLA" && (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 font-mono text-[10.5px] text-slate-800 shadow-inner max-w-xs mx-auto">
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
                  <p className="font-bold text-xs uppercase tracking-wide">
                    {config.nombreComercial || "LLANOMIO"}
                  </p>
                  {config.eslogan && <p className="text-[9px] italic">{config.eslogan}</p>}
                  <p>NIT: {config.nit || "900.123.456-7"}</p>
                  {config.regimenFiscal && <p className="text-[9px]">{config.regimenFiscal}</p>}
                  <p>{config.direccion || "Villavicencio, Meta"}</p>
                  <p>TEL: {config.telefono || "310 123 4567"}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Datos Muestra */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>FACTURA:</span>
                    <span>1001</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>FECHA: 25/10/2026</span>
                    <span>HORA: 10:30 AM</span>
                  </div>
                  {config.mostrarVendedorFactura && (
                    <div className="flex justify-between text-slate-600">
                      <span>CAJERO: admin</span>
                      <span>OPERACIÓN: ALQUILER</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span>CLIENTE:</span>
                    <span>CARLOS ANDRÉS PÉREZ</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Ítems Muestra */}
                <div className="space-y-1 mb-2 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>DESCRIPCIÓN</span>
                    <span>VALOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Traje Llanero Blanco [TR-01]</span>
                    <span>$85.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Ajuste de Manga (Sastrería)</span>
                    <span>$15.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Totales */}
                <div className="space-y-0.5 font-bold text-[10.5px]">
                  <div className="flex justify-between">
                    <span>TOTAL FACTURA:</span>
                    <span>$100.000</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>ABONO RECIBIDO:</span>
                    <span>-$50.000</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>SALDO PENDIENTE:</span>
                    <span>$50.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Políticas */}
                <div className="text-[9px] text-justify leading-tight text-slate-600 my-2">
                  {config.politicasFactura || "Sin políticas registradas."}
                </div>

                <div className="mt-2 text-center border-t border-dotted border-slate-300 pt-1.5 text-[8.5px] text-slate-500 uppercase font-sans">
                  {config.piePaginaFactura || "¡GRACIAS POR SU PREFERENCIA! — CERO QR"}
                </div>
              </div>
            )}

            {formatoSimulador === "MEDIA_CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-[10px] text-slate-800 shadow-inner space-y-2">
                {/* Cabecera Media Carta */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                    )}
                    <div>
                      <h3 className="font-bold text-xs uppercase">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[8.5px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[8.5px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[8.5px] text-slate-500">{config.direccion}</p>
                    </div>
                  </div>
                  <div className="border rounded p-1 text-right bg-white">
                    <span className="block text-[8px] font-bold text-slate-500">FACTURA COMERCIAL</span>
                    <span className="block font-mono font-bold text-xs text-blue-700">1001</span>
                  </div>
                </div>

                {/* Ficha Cliente */}
                <div className="bg-white p-2 rounded border grid grid-cols-2 gap-2 text-[9px]">
                  <div>
                    <span className="font-bold text-slate-500 block">CLIENTE:</span>
                    <span className="font-bold">CARLOS ANDRÉS PÉREZ</span>
                    <span className="block text-slate-500">Doc: 1.121.890.123 | Tel: 312 456 7890</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">DETALLES:</span>
                    <span>Alquiler | Devolución: 28/10/2026</span>
                    {config.mostrarVendedorFactura && <span className="block text-slate-500">Cajero: admin</span>}
                  </div>
                </div>

                {/* Tabla */}
                <div className="bg-white p-1.5 rounded border">
                  <div className="flex justify-between font-bold border-b pb-0.5 text-[8.5px]">
                    <span>CANT | DESCRIPCIÓN</span>
                    <span>SUBTOTAL</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>1x Traje Llanero Gala Blanco</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>1x Arreglo de Sastrería</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Pie Media Carta */}
                <div className="flex justify-between items-start gap-2 pt-1 border-t text-[8.5px]">
                  <div className="flex-1 text-slate-500 line-clamp-2">
                    {config.politicasFactura}
                  </div>
                  <div className="w-28 text-right font-mono">
                    <div>Total: <strong>$100.000</strong></div>
                    <div className="text-emerald-700">Abono: -$50.000</div>
                    <div className="text-rose-700 font-bold">Saldo: $50.000</div>
                  </div>
                </div>
              </div>
            )}

            {formatoSimulador === "CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-[10.5px] text-slate-800 shadow-inner space-y-3">
                {/* Cabecera Carta */}
                <div className="flex items-start justify-between border-b pb-2.5">
                  <div className="flex items-center gap-3">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" />
                    )}
                    <div>
                      <h3 className="font-black text-sm uppercase text-slate-900">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[9px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[9px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[9px] text-slate-500">{config.direccion} — {config.ciudad}</p>
                      <p className="text-[9px] text-slate-500">Tel: {config.telefono}</p>
                    </div>
                  </div>
                  <div className="border-2 rounded-xl p-2 text-right bg-white">
                    <span className="block text-[8.5px] font-bold text-slate-500">FACTURA COMERCIAL</span>
                    <span className="block font-mono font-bold text-sm text-blue-700">1001</span>
                    <span className="block text-[8px] text-slate-400">ORIGINAL CLIENTE</span>
                  </div>
                </div>

                {/* Ficha Cliente & Operación */}
                <div className="bg-white p-2.5 rounded-xl border grid grid-cols-2 gap-3 text-[9.5px]">
                  <div>
                    <span className="font-bold text-slate-500 block">DATOS DEL CLIENTE:</span>
                    <p className="font-bold text-slate-900">CARLOS ANDRÉS PÉREZ</p>
                    <p className="text-slate-500">C.C. 1.121.890.123 — Tel: 312 456 7890</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">OPERACIÓN:</span>
                    <p>Tipo: ALQUILER | Estado: ACTIVA</p>
                    {config.mostrarVendedorFactura && <p className="text-slate-500">Atendido por: admin</p>}
                  </div>
                </div>

                {/* Tabla Resumen */}
                <div className="bg-white p-2 rounded-xl border">
                  <div className="flex justify-between font-bold border-b pb-1 text-[9px] uppercase text-slate-600">
                    <span>Ítem / Descripción</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>1x Traje Llanero Gala Blanco [TL-01]</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>1x Arreglo de Sastrería Libre</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Totales y Políticas */}
                <div className="flex justify-between items-start gap-3 pt-1 border-t text-[9px]">
                  <div className="flex-1 p-2 bg-white rounded border text-slate-500 line-clamp-3">
                    <span className="font-bold block text-slate-700 mb-0.5">TÉRMINOS Y CONDICIONES:</span>
                    {config.politicasFactura}
                  </div>
                  <div className="w-32 text-right font-mono space-y-0.5">
                    <div>Total: <strong>$100.000</strong></div>
                    <div className="text-emerald-700">Abonado: -$50.000</div>
                    <div className="text-rose-700 font-bold p-1 bg-rose-50 rounded border border-rose-200">
                      Saldo: $50.000
                    </div>
                  </div>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-4 text-center pt-2 text-[8px] text-slate-500">
                  <div className="border-t pt-0.5">Firma Autorizada LLANOMIO</div>
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
