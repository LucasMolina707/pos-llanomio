"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Receipt,
  FileText,
  Save,
  Database,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  Printer,
  ShieldCheck,
  Ban,
  Package,
  Settings,
} from "lucide-react";

interface Configuracion {
  id: string;
  nombreTienda: string;
  nombreComercial: string;
  nit: string;
  direccion: string;
  telefono: string;
  logoUrl: string | null;
  politicasFactura: string | null;
  formatoImpresionDefault: "TIRILLA" | "MEDIA_CARTA" | "CARTA";
  rutaCarpetaRespaldo: string;
}

export default function ConfiguracionAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracion>({
    id: "",
    nombreTienda: "LLANOMIO",
    nombreComercial: "LLANOMIO",
    nit: "900.123.456-7",
    direccion: "Calle Principal #10-20, Villavicencio, Meta",
    telefono: "3101234567",
    logoUrl: null,
    politicasFactura:
      "Términos y Condiciones: Las prendas en alquiler deben devolverse en las mismas condiciones recibidas. El retraso en la entrega genera recargo por mora según la tarifa establecida. Cuide su comprobante de pago.",
    formatoImpresionDefault: "TIRILLA",
    rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

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
      const res = await fetch("/api/empresa");
      const data = await res.json();
      if (data.ok && data.configuracion) {
        setConfig(data.configuracion);
      }
    } catch {
      setMensajeError("No se pudo cargar la configuración de la empresa.");
    } finally {
      setCargando(false);
    }
  };

  const cargarInfoRespaldo = async () => {
    try {
      const res = await fetch("/api/backup");
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
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("El archivo no debe exceder 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const res = await fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar la configuración.");
      }

      setMensajeExito("Los datos de factura de LLANOMIO han sido actualizados exitosamente.");
      setTimeout(() => setMensajeExito(null), 4000);
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

  const handleCerrarSesion = async () => {
    try {
      // Disparar logout que ejecuta automáticamente VACUUM INTO
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-600 font-semibold">Cargando panel de configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Configuración de Facturación y Datos de Empresa
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                Solo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Datos fiscales, logotipos, políticas de alquiler y formatos de impresión para tirilla y carta
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
            <span>{respaldando ? "Respaldando..." : "Respaldo en Caliente"}</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="w-full space-y-6">
        {/* Notificaciones */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-semibold shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {mensajeError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center space-x-3 text-red-800 text-xs font-semibold shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Formulario de Datos (7 columnas) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección 1: Datos Comerciales */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Identidad Comercial y Fiscal
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nombre de la Tienda
                    </label>
                    <input
                      type="text"
                      required
                      name="nombreTienda"
                      value={config.nombreTienda}
                      onChange={handleChange}
                      placeholder="LLANOMIO"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      NIT o Cédula Fiscal
                    </label>
                    <input
                      type="text"
                      required
                      name="nit"
                      value={config.nit}
                      onChange={handleChange}
                      placeholder="900.123.456-7"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={config.telefono}
                      onChange={handleChange}
                      placeholder="3101234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Formato de Impresión
                    </label>
                    <select
                      name="formatoImpresionDefault"
                      value={config.formatoImpresionDefault}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="TIRILLA">Tirilla Térmica (80mm / POS)</option>
                      <option value="MEDIA_CARTA">Media Carta</option>
                      <option value="CARTA">Carta Completa</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Dirección Física de la Tienda
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={config.direccion}
                      onChange={handleChange}
                      placeholder="Calle Principal #10-20, Villavicencio, Meta"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Logotipo */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                  <Upload className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Logotipo de Factura
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {config.logoUrl ? (
                      <img
                        src={config.logoUrl}
                        alt="Logo LLANOMIO"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold text-center px-2">
                        Sin logotipo
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Cargar imagen local
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        O ingresar URL directa
                      </label>
                      <input
                        type="text"
                        name="logoUrl"
                        value={config.logoUrl || ""}
                        onChange={handleChange}
                        placeholder="https://... o ruta local"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {config.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, logoUrl: null }))}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        Quitar logotipo actual
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 3: Políticas y Términos */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Políticas y Términos al Pie de Factura
                  </h2>
                </div>

                <div>
                  <textarea
                    rows={4}
                    name="politicasFactura"
                    value={config.politicasFactura || ""}
                    onChange={handleChange}
                    placeholder="Escriba los términos que se imprimirán al pie de cada factura..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Este texto se imprimirá al final de la tirilla térmica y contratos de alquiler.
                  </p>
                </div>
              </div>

              {/* Sección 4: Notificación Obligatoria de QR Desactivado */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
                <Ban className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Política Estricta: Código QR Desactivado
                  </span>
                  <span className="text-amber-800 leading-relaxed block">
                    Por directriz operativa y de seguridad del negocio, las facturas y tirillas impresas no incorporan códigos QR de consulta web externa.
                  </span>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{guardando ? "Guardando cambios..." : "Guardar Configuración"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo de la Tirilla (5 columnas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Vista Previa de Tirilla (80mm)
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                  <Printer className="h-3.5 w-3.5" />
                  <span>POS Térmico</span>
                </div>
              </div>

              {/* Simulación física de Tirilla Térmica */}
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-5 font-mono text-[11px] text-slate-800 shadow-inner max-w-sm mx-auto">
                {/* Logo en Tirilla si está configurado */}
                {config.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="h-10 object-contain grayscale"
                    />
                  </div>
                )}

                {/* Encabezado */}
                <div className="text-center space-y-0.5 mb-3">
                  <p className="font-bold text-sm uppercase tracking-wide">
                    {config.nombreTienda || "LLANOMIO"}
                  </p>
                  <p>NIT: {config.nit || "900.123.456-7"}</p>
                  <p>{config.direccion || "Dirección no especificada"}</p>
                  <p>TEL: {config.telefono || "3000000000"}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Datos de Factura Muestra */}
                <div className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>FACTURA No:</span>
                    <span>FAC-000124</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>FECHA: 25/10/2026</span>
                    <span>HORA: 10:30 AM</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>CAJERO: admin</span>
                    <span>TIPO: ALQUILER</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Ítems Muestra */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between font-bold">
                    <span>DESCRIPCION</span>
                    <span>VALOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 x Traje Llanero Blanco</span>
                    <span>$85.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>  * Alquiler base (24h)</span>
                    <span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 x Ajuste de Manga (Arreglo)</span>
                    <span>$10.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Totales */}
                <div className="space-y-0.5 font-bold">
                  <div className="flex justify-between">
                    <span>TOTAL FACTURA:</span>
                    <span>$95.000</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>ABONO RECIBIDO (EFECTIVO):</span>
                    <span>$50.000</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>SALDO PENDIENTE:</span>
                    <span>$45.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Políticas */}
                <div className="text-[10px] text-justify leading-tight text-slate-600 my-2">
                  {config.politicasFactura || "Sin políticas registradas."}
                </div>

                {/* Recordatorio de NO QR */}
                <div className="mt-3 text-center border-t border-dotted border-slate-300 pt-2 text-[9px] text-slate-500 uppercase font-sans">
                  *** COMPROBANTE OFICIAL LOCAL ***
                  <br />
                  SISTEMA POS LLANOMIO
                </div>
              </div>

              {/* Información del Motor de Respaldo SQLite */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Motor de Respaldo SQLite (VACUUM INTO)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destino Central:</span>
                    <span className="font-bold text-slate-800 font-mono">C:\POS_LLANOMIO_BACKUPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Archivo Primario:</span>
                    <span className="font-bold text-slate-800 font-mono">llanomio_ULTIMO.db</span>
                  </div>
                  {ultimoRespaldoInfo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tamaño actual:</span>
                      <span className="font-bold text-emerald-700">
                        {(ultimoRespaldoInfo.bytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 pt-1">
                    Se activa automáticamente en cada cierre de sesión (Logout) y conserva historial fechado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
