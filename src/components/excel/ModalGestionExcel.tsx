"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileDown,
  X,
  Layers,
  Info,
  FileText,
  Sparkles,
} from "lucide-react";

export type TipoGestionExcel = "INVENTARIO" | "CLIENTES";

interface ModalGestionExcelProps {
  tipo: TipoGestionExcel;
  abierto: boolean;
  onCerrar: () => void;
  onImportacionExitosa?: () => void;
}

interface ResultadoImportacion {
  ok: boolean;
  mensaje: string;
  resumen: {
    totalLeidos: number;
    validos: number;
    creados: number;
    actualizados: number;
    fallidos: number;
  };
  errores: string[];
}

export default function ModalGestionExcel({
  tipo,
  abierto,
  onCerrar,
  onImportacionExitosa,
}: ModalGestionExcelProps) {
  const [pestaña, setPestaña] = useState<"IMPORTAR" | "REGLETA" | "EXPORTAR">("IMPORTAR");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abierto && !procesando) {
        onCerrar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abierto, procesando, onCerrar]);

  if (!abierto) return null;

  const endpointBase = tipo === "INVENTARIO" ? "/api/inventario/excel" : "/api/clientes/excel";
  const tituloEntidad = tipo === "INVENTARIO" ? "Inventario & Prendas" : "Directorio de Clientes";

  const handleDescargarPlantilla = () => {
    window.open(`${endpointBase}?modo=plantilla`, "_blank");
  };

  const handleExportarBaseDatos = () => {
    window.open(`${endpointBase}?modo=exportar`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validarYSeleccionarArchivo(file);
    }
  };

  const validarYSeleccionarArchivo = (file: File) => {
    setErrorGlobal(null);
    setResultado(null);
    const nombre = file.name.toLowerCase();
    if (!nombre.endsWith(".xlsx") && !nombre.endsWith(".xls")) {
      setErrorGlobal("El archivo seleccionado no es un libro de Excel válido (.xlsx o .xls).");
      return;
    }
    setArchivoSeleccionado(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validarYSeleccionarArchivo(file);
    }
  };

  const handleProcesarImportacion = async () => {
    if (!archivoSeleccionado) {
      setErrorGlobal("Por favor selecciona un archivo Excel antes de procesar.");
      return;
    }

    try {
      setProcesando(true);
      setErrorGlobal(null);
      setResultado(null);

      const formData = new FormData();
      formData.append("file", archivoSeleccionado);

      const res = await fetch(endpointBase, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al procesar la importación masiva");
      }

      setResultado(data);
      if (onImportacionExitosa) {
        onImportacionExitosa();
      }
    } catch (err: any) {
      setErrorGlobal(err.message || "Error al enviar el archivo al servidor");
    } finally {
      setProcesando(false);
    }
  };

  const handleLimpiarParaOtra = () => {
    setArchivoSeleccionado(null);
    setResultado(null);
    setErrorGlobal(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Gestión Masiva en Excel — {tituloEntidad}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  SheetJS .xlsx
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Descarga la plantilla con encabezados oficiales, exporta tu base de datos o importa masivamente sin duplicados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-30 shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setPestaña("IMPORTAR")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              pestaña === "IMPORTAR"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>1. Importar Masivamente</span>
          </button>

          <button
            type="button"
            onClick={() => setPestaña("REGLETA")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              pestaña === "REGLETA"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>2. Descargar Regleta Guía</span>
          </button>

          <button
            type="button"
            onClick={() => setPestaña("EXPORTAR")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              pestaña === "EXPORTAR"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>3. Exportar Respaldo Actual</span>
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Mensaje de Error Global */}
          {errorGlobal && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">No se pudo procesar la solicitud:</span>
                <span>{errorGlobal}</span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 1: IMPORTAR MASIVAMENTE                                   */}
          {/* ================================================================= */}
          {pestaña === "IMPORTAR" && (
            <div className="space-y-4">
              {!resultado ? (
                <>
                  {/* Resumen de Regla de Negocio */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-blue-900">
                        {tipo === "INVENTARIO"
                          ? "Columnas Obligatorias en Inventario:"
                          : "Columnas Obligatorias en Clientes:"}
                      </span>
                      <p className="mt-0.5 text-blue-800/90 leading-relaxed">
                        {tipo === "INVENTARIO" ? (
                          <>
                            Deben incluirse obligatoriamente:{" "}
                            <strong className="underline">CODIGO_REFERENCIA</strong>,{" "}
                            <strong className="underline">NOMBRE_PRODUCTO</strong>,{" "}
                            <strong className="underline">TIPO_MODALIDAD</strong> (VENTA o ALQUILER) y{" "}
                            <strong className="underline">PRECIO_BASE</strong>. Si el código ya existe, se
                            actualizan sus datos sin duplicar.
                          </>
                        ) : (
                          <>
                            Solo se exigen 3 columnas obligatorias:{" "}
                            <strong className="underline">DOCUMENTO_O_NIT</strong>,{" "}
                            <strong className="underline">NOMBRE_COMPLETO</strong> y{" "}
                            <strong className="underline">TELEFONO_PRIMARIO</strong>. Si el cliente es contribuyente
                            (FE), los datos tributarios faltantes se autocompletarán de forma segura.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Zona de Dropzone para subir archivo */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      dragOver
                        ? "border-emerald-500 bg-emerald-50/70"
                        : archivoSeleccionado
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {archivoSeleccionado ? (
                      <>
                        <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-900">{archivoSeleccionado.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {(archivoSeleccionado.size / 1024).toFixed(1)} KB — Listo para procesar
                          </p>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-bold hover:underline mt-1">
                          Haz clic para cambiar de archivo
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-2xl bg-slate-200 text-slate-700">
                          <Upload className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Arrastra y suelta tu archivo Excel aquí
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            O haz clic para examinar desde tu equipo (.xlsx o .xls)
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Botón para Iniciar Importación */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onCerrar}
                      disabled={procesando}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleProcesarImportacion}
                      disabled={!archivoSeleccionado || procesando}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {procesando ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importando a Base de Datos...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Procesar e Importar a SQLite</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Reporte de Resultados en Vivo */
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          ¡Importación Finalizada con Éxito!
                        </h3>
                        <p className="text-xs text-emerald-800">{resultado.mensaje}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tarjetas Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Filas Leídas
                      </span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {resultado.resumen.totalLeidos}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                        Nuevos Creados
                      </span>
                      <span className="text-xl font-black text-emerald-700 font-mono">
                        {resultado.resumen.creados}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                      <span className="text-[10px] font-bold text-blue-700 uppercase block">
                        Actualizados
                      </span>
                      <span className="text-xl font-black text-blue-700 font-mono">
                        {resultado.resumen.actualizados}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl border text-center ${
                        resultado.resumen.fallidos > 0
                          ? "bg-rose-50 border-rose-200"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase block ${
                          resultado.resumen.fallidos > 0 ? "text-rose-700" : "text-slate-500"
                        }`}
                      >
                        Filas con Error
                      </span>
                      <span
                        className={`text-xl font-black font-mono ${
                          resultado.resumen.fallidos > 0 ? "text-rose-700" : "text-slate-500"
                        }`}
                      >
                        {resultado.resumen.fallidos}
                      </span>
                    </div>
                  </div>

                  {/* Listado de Errores por Fila si existieron */}
                  {resultado.errores && resultado.errores.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-xs">
                      <span className="font-bold text-rose-900 block mb-1">
                        Detalle de filas no importadas ({resultado.errores.length}):
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-rose-800 pr-1">
                        {resultado.errores.map((err, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-500">•</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botones de Cierre o Carga Adicional */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleLimpiarParaOtra}
                      className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Importar Otro Archivo
                    </button>

                    <button
                      type="button"
                      onClick={onCerrar}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      Finalizar y Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 2: DESCARGAR REGLETA GUÍA                                 */}
          {/* ================================================================= */}
          {pestaña === "REGLETA" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900">
                    Plantilla Oficial con Encabezados Validados (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Descarga el archivo Excel oficial prediseñado para {tituloEntidad}. Contiene la hoja principal
                    con ejemplos y la hoja de guía con el detalle de qué campos son obligatorios.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDescargarPlantilla}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla Excel</span>
                </button>
              </div>

              {/* Guía Visual Rápida */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Columnas Incluidas en la Regleta:
                  </span>
                </div>
                <div className="p-3.5 bg-white text-xs space-y-2">
                  {tipo === "INVENTARIO" ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        CODIGO_REFERENCIA [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        NOMBRE_PRODUCTO [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        TIPO_MODALIDAD [OBLIGATORIO *: VENTA o ALQUILER]
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        PRECIO_BASE [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        CATEGORIA [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        TALLA [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        COLOR [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        STOCK_CANTIDAD [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        TARIFA_MORA_DIARIA [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        TARIFA_MORA_HORA [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        ESTADO_PRENDA [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        DESCRIPCION_NOTAS [OPCIONAL]
                      </li>
                    </ul>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        DOCUMENTO_O_NIT [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        NOMBRE_COMPLETO [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        TELEFONO_PRIMARIO [OBLIGATORIO *]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        TELEFONO_SECUNDARIO [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        DIRECCION [OPCIONAL / FE]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        ES_FACTURACION_ELECTRONICA_CONTRIBUYENTE [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        TIPO_DOCUMENTO [OPCIONAL: CC, NIT, CE...]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        DIGITO_VERIFICACION [OPCIONAL / Autocalculado]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        RAZON_SOCIAL_LEGAL [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        CORREO_ELECTRONICO [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        RESPONSABILIDAD_FISCAL_DIAN [OPCIONAL]
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        MUNICIPIO Y CODIGO_DANE [OPCIONAL]
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 3: EXPORTAR RESPALDO ACTUAL                               */}
          {/* ================================================================= */}
          {pestaña === "EXPORTAR" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-indigo-950">
                    Exportación Completa y Respaldo Externo en Excel
                  </h3>
                  <p className="text-xs text-indigo-900/90 leading-relaxed">
                    Descarga en un archivo Excel todos los registros activos almacenados en tu base de datos SQLite.
                    Este archivo usa exactamente las mismas columnas de la regleta oficial, por lo que sirve tanto de
                    copia de seguridad como para editar y volver a re-importar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportarBaseDatos}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Exportar Todo (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Ventajas del Respaldo Externo en Excel:</span>
                </div>
                <p className="leading-relaxed">
                  1. Es completamente legible e independiente de SQLite. Puedes abrirlo en Microsoft Excel, LibreOffice o Google Sheets.
                </p>
                <p className="leading-relaxed">
                  2. Si necesitas hacer cambios masivos de precios, tallas o teléfonos, puedes editar este mismo archivo y volverlo a subir en la pestaña de <strong>Importar</strong>. El sistema actualizará automáticamente cada registro por su código o cédula.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
