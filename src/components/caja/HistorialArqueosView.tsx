"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Banknote,
  CreditCard,
  Vault,
  Eye,
  X,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Users,
  Layers,
} from "lucide-react";

export type PeriodoHistorial = "DIARIO" | "MENSUAL" | "ANUAL";

export interface TurnoHistorialItem {
  id: string;
  nombreGabinete: string;
  modalidad: string;
  fechaApertura: string;
  fechaCierre: string | null;
  baseInicialEfectivo: number;
  totalEfectivo: number;
  totalDigital: number;
  totalNequi: number;
  totalBancolombia: number;
  totalDaviplata: number;
  totalTransferencia: number;
  totalConsignacion: number;
  totalRecaudado: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  tieneDiferencia: boolean;
  notaNovedad: string | null;
  observaciones: string | null;
  usuarioCajero: {
    id: string;
    nombre: string;
    username: string;
    rol?: string;
  };
  cajerosParticipantes: Array<{
    id: string;
    nombre: string;
    username: string;
    fechaUnion?: string;
  }>;
}

export interface ResumenHistorial {
  totalTurnos: number;
  totalBaseInicial: number;
  totalEfectivo: number;
  totalDigital: number;
  totalRecaudado: number;
  totalEsperado: number;
  totalContado: number;
  totalDiferencias: number;
  totalFaltantes: number;
  totalSobrantes: number;
  turnosConNovedad: number;
  turnosExactos: number;
}

export interface HistorialArqueosViewProps {
  onRefrescarTurnoActivo?: () => void;
  modoPaginaCompleta?: boolean;
}

export default function HistorialArqueosView({
  onRefrescarTurnoActivo,
  modoPaginaCompleta = false,
}: HistorialArqueosViewProps) {
  const hoyStr = new Date().toISOString().split("T")[0];
  const mesActualStr = hoyStr.substring(0, 7);
  const anioActualStr = hoyStr.substring(0, 4);

  const [periodo, setPeriodo] = useState<PeriodoHistorial>("DIARIO");
  const [fechaFiltro, setFechaFiltro] = useState<string>(hoyStr);
  const [mesFiltro, setMesFiltro] = useState<string>(mesActualStr);
  const [anioFiltro, setAnioFiltro] = useState<string>(anioActualStr);
  const [soloNovedades, setSoloNovedades] = useState<boolean>(false);
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");

  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoHistorialItem[]>([]);
  const [resumen, setResumen] = useState<ResumenHistorial | null>(null);
  const [etiquetaPeriodo, setEtiquetaPeriodo] = useState<string>("");

  // Modal para ver detalle completo de Novedad / Arqueo
  const [turnoSeleccionadoModal, setTurnoSeleccionadoModal] = useState<TurnoHistorialItem | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargando(true);
      setErrorMsg(null);

      const params = new URLSearchParams();
      params.set("periodo", periodo);

      if (periodo === "DIARIO") {
        params.set("fecha", fechaFiltro);
      } else if (periodo === "MENSUAL") {
        params.set("mes", mesFiltro);
      } else if (periodo === "ANUAL") {
        params.set("anio", anioFiltro);
      }

      if (soloNovedades) {
        params.set("soloNovedades", "true");
      }

      const res = await fetch(`/api/caja/historial?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el historial de arqueos");
      }

      setTurnos(data.turnos || []);
      setResumen(data.resumen || null);
      setEtiquetaPeriodo(data.periodo?.etiqueta || "");
    } catch (err: unknown) {
      console.error("Error al cargar historial de arqueos:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error al consultar historial");
    } finally {
      setCargando(false);
    }
  }, [periodo, fechaFiltro, mesFiltro, anioFiltro, soloNovedades]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Controles de navegación temporal
  const handleAvanzarFecha = (delta: number) => {
    if (periodo === "DIARIO") {
      const [y, m, d] = fechaFiltro.split("-").map(Number);
      const curr = new Date(y, m - 1, d);
      curr.setDate(curr.getDate() + delta);
      setFechaFiltro(curr.toISOString().split("T")[0]);
    } else if (periodo === "MENSUAL") {
      const [y, m] = mesFiltro.split("-").map(Number);
      const curr = new Date(y, m - 1 + delta, 1);
      const nuevoY = curr.getFullYear();
      const nuevoM = String(curr.getMonth() + 1).padStart(2, "0");
      setMesFiltro(`${nuevoY}-${nuevoM}`);
    } else if (periodo === "ANUAL") {
      const nuevoAnio = String(Number(anioFiltro) + delta);
      setAnioFiltro(nuevoAnio);
    }
  };

  const handleIrAHoy = () => {
    if (periodo === "DIARIO") setFechaFiltro(hoyStr);
    if (periodo === "MENSUAL") setMesFiltro(mesActualStr);
    if (periodo === "ANUAL") setAnioFiltro(anioActualStr);
  };

  // Filtrado de turnos en cliente por texto (cajero, gabinete o nota)
  const turnosFiltrados = turnos.filter((t) => {
    if (!busquedaTexto.trim()) return true;
    const q = busquedaTexto.toLowerCase();
    const cajero = t.usuarioCajero?.nombre?.toLowerCase() || "";
    const username = t.usuarioCajero?.username?.toLowerCase() || "";
    const gabinete = t.nombreGabinete?.toLowerCase() || "";
    const nota = t.notaNovedad?.toLowerCase() || "";
    const obs = t.observaciones?.toLowerCase() || "";
    return (
      cajero.includes(q) ||
      username.includes(q) ||
      gabinete.includes(q) ||
      nota.includes(q) ||
      obs.includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full">
      {/* 1. Barra de Control de Periodo & Filtros */}
      <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Selector de Periodo: Diario | Mensual | Anual */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriodo("DIARIO")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                periodo === "DIARIO"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Diario</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("MENSUAL")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                periodo === "MENSUAL"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Mensual</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("ANUAL")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                periodo === "ANUAL"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Anual</span>
            </button>
          </div>

          {/* Navegación de Rango y Selector Específico */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => handleAvanzarFecha(-1)}
                title="Periodo anterior"
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {periodo === "DIARIO" && (
                <input
                  type="date"
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  className="px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              )}

              {periodo === "MENSUAL" && (
                <input
                  type="month"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              )}

              {periodo === "ANUAL" && (
                <select
                  value={anioFiltro}
                  onChange={(e) => setAnioFiltro(e.target.value)}
                  className="px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={String(y)}>
                      Año {y}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => handleAvanzarFecha(1)}
                title="Periodo siguiente"
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleIrAHoy}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
            >
              Actual
            </button>

            <button
              type="button"
              onClick={cargarHistorial}
              disabled={cargando}
              className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer disabled:opacity-50"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sub-barra de Búsqueda y Filtro de Novedades */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cajero, gabinete o nota de justificación..."
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-semibold text-slate-800 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={soloNovedades}
              onChange={(e) => setSoloNovedades(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver solo turnos con diferencias / novedades</span>
            </span>
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* 2. Tarjetas Resumen de Rendimiento Financiero del Periodo */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Efectivo Recaudado */}
          <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Efectivo Recaudado
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ${resumen.totalEfectivo.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 font-medium">En {resumen.totalTurnos} arqueos cerrados</p>
          </div>

          {/* Card 2: Total Digital (Nequi, Bancolombia, etc.) */}
          <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Recaudos Digitales
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-950 font-mono">
              ${resumen.totalDigital.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 font-medium">Nequi, transferencias y bancos</p>
          </div>

          {/* Card 3: Total Recaudado General */}
          <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Recaudo Total
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Vault className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
              ${resumen.totalRecaudado.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 font-medium">Efectivo + Medios Digitales</p>
          </div>

          {/* Card 4: Turnos & Auditoría de Cuadre */}
          <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Arqueos Auditados
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {resumen.totalTurnos}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-emerald-700">{resumen.turnosExactos} exactos</span>
              <span className="text-slate-400">•</span>
              <span className={resumen.turnosConNovedad > 0 ? "text-amber-700 font-bold" : "text-slate-500"}>
                {resumen.turnosConNovedad} con novedad
              </span>
            </div>
          </div>

          {/* Card 5: Desviación / Diferencia Neta Acumulada */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border shadow-xs space-y-1 ${
              resumen.totalDiferencias === 0
                ? "bg-emerald-50/70 border-emerald-200"
                : resumen.totalDiferencias > 0
                ? "bg-blue-50/70 border-blue-200"
                : "bg-rose-50/70 border-rose-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  resumen.totalDiferencias === 0
                    ? "text-emerald-900"
                    : resumen.totalDiferencias > 0
                    ? "text-blue-900"
                    : "text-rose-900"
                }`}
              >
                Diferencia Neta
              </span>
              <div
                className={`p-2 rounded-xl border ${
                  resumen.totalDiferencias === 0
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : resumen.totalDiferencias > 0
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {resumen.totalDiferencias >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
            </div>
            <p
              className={`text-xl sm:text-2xl font-black font-mono ${
                resumen.totalDiferencias === 0
                  ? "text-emerald-950"
                  : resumen.totalDiferencias > 0
                  ? "text-blue-950"
                  : "text-rose-950"
              }`}
            >
              {resumen.totalDiferencias >= 0 ? "+" : ""}$
              {resumen.totalDiferencias.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              Faltantes: -${resumen.totalFaltantes.toLocaleString("es-CO")} | Sobrantes: +$
              {resumen.totalSobrantes.toLocaleString("es-CO")}
            </p>
          </div>
        </div>
      )}

      {/* 3. Tabla Consolidada de Arqueos Históricos */}
      <div className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Vault className="w-5 h-5 text-blue-600" />
              <span>Arqueos y Cierres Históricos: {etiquetaPeriodo}</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Registro inmutable de efectivo esperado, conteo físico y justificaciones de novedades
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 self-start sm:self-center">
            {turnosFiltrados.length} registro(s) en este periodo
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {cargando ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-slate-600">
                Consolidando arqueos del periodo...
              </p>
            </div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                No se encontraron arqueos para los filtros seleccionados
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Prueba cambiando el rango de fechas o desactivando el filtro de novedades.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-300">
                <tr>
                  <th className="px-3.5 py-3">Fecha & Horario</th>
                  <th className="px-3 py-3">Gabinete & Modalidad</th>
                  <th className="px-3 py-3">Cajero Responsable</th>
                  <th className="px-3 py-3 text-right">Efectivo Esperado</th>
                  <th className="px-3 py-3 text-right">Efectivo Contado</th>
                  <th className="px-3 py-3 text-center">Diferencia</th>
                  <th className="px-3.5 py-3">Nota de Novedad / Justificación</th>
                  <th className="px-3 py-3 text-right">Digital</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-2.5 py-3 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {turnosFiltrados.map((t) => {
                  const tieneNota = Boolean(t.notaNovedad && t.notaNovedad.trim());
                  return (
                    <tr key={t.id} className="hover:bg-blue-50/30 transition">
                      {/* Fecha & Horario */}
                      <td className="px-3.5 py-3">
                        <span className="font-bold text-slate-900 block">
                          {new Date(t.fechaApertura).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-slate-600 font-mono block mt-0.5">
                          {new Date(t.fechaApertura).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {t.fechaCierre
                            ? new Date(t.fechaCierre).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Abierto"}
                        </span>
                      </td>

                      {/* Gabinete & Modalidad */}
                      <td className="px-3 py-3">
                        <span className="font-bold text-slate-900 block text-xs">
                          {t.nombreGabinete}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mt-1 border ${
                            t.modalidad === "DIVIDIDA"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {t.modalidad === "DIVIDIDA" ? (
                            <Layers className="w-3 h-3" />
                          ) : (
                            <Users className="w-3 h-3" />
                          )}
                          <span>{t.modalidad === "DIVIDIDA" ? "Dividida" : "Compartida"}</span>
                        </span>
                      </td>

                      {/* Cajero */}
                      <td className="px-3 py-3">
                        <span className="font-bold text-slate-900 block">
                          {t.usuarioCajero?.nombre}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          @{t.usuarioCajero?.username}
                        </span>
                      </td>

                      {/* Efectivo Esperado */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                        ${t.efectivoEsperado.toLocaleString("es-CO")}
                      </td>

                      {/* Efectivo Contado */}
                      <td className="px-3 py-3 text-right font-mono font-black text-slate-950">
                        ${t.efectivoContado.toLocaleString("es-CO")}
                      </td>

                      {/* Diferencia */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                            t.diferencia === 0
                              ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                              : t.diferencia > 0
                              ? "bg-blue-50 text-blue-950 border-blue-300"
                              : "bg-rose-50 text-rose-950 border-rose-300"
                          }`}
                        >
                          {t.diferencia >= 0 ? "+" : ""}${t.diferencia.toLocaleString("es-CO")}
                        </span>
                      </td>

                      {/* Nota de Novedad / Justificación */}
                      <td className="px-3.5 py-3 max-w-xs">
                        {t.diferencia === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Cuadre Exacto</span>
                          </span>
                        ) : tieneNota ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-800 font-medium line-clamp-2 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200">
                              {t.notaNovedad}
                            </p>
                            <button
                              type="button"
                              onClick={() => setTurnoSeleccionadoModal(t)}
                              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                            >
                              Ver justificación completa
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            Pendiente de nota
                          </span>
                        )}
                      </td>

                      {/* Digital */}
                      <td className="px-3 py-3 text-right font-mono font-semibold text-purple-800">
                        ${t.totalDigital.toLocaleString("es-CO")}
                      </td>

                      {/* Total Recaudado */}
                      <td className="px-3 py-3 text-right font-mono font-black text-emerald-900">
                        ${t.totalRecaudado.toLocaleString("es-CO")}
                      </td>

                      {/* Botón Ver Detalle */}
                      <td className="px-2.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setTurnoSeleccionadoModal(t)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
                          title="Ver detalle del arqueo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Modal de Detalle de Auditoría & Nota de Novedad Inmutable */}
      {turnoSeleccionadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#FCFDFE] rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 sm:p-7 space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    turnoSeleccionadoModal.diferencia === 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : turnoSeleccionadoModal.diferencia > 0
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <Vault className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Auditoría de Arqueo — {turnoSeleccionadoModal.nombreGabinete}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Cierre realizado el{" "}
                    {turnoSeleccionadoModal.fechaCierre
                      ? new Date(turnoSeleccionadoModal.fechaCierre).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Fecha no registrada"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTurnoSeleccionadoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparativa Financiera del Cuadre */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Efectivo Esperado
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-slate-900 block mt-0.5">
                  ${turnoSeleccionadoModal.efectivoEsperado.toLocaleString("es-CO")}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Base ($
                  {turnoSeleccionadoModal.baseInicialEfectivo.toLocaleString("es-CO")}) + Ventas en
                  efectivo
                </span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Efectivo Físico Contado
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-slate-950 block mt-0.5">
                  ${turnoSeleccionadoModal.efectivoContado.toLocaleString("es-CO")}
                </span>
                <span className="text-xs text-slate-500 font-medium">Contado en gaveta</span>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Resultado del Arqueo
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {turnoSeleccionadoModal.diferencia === 0
                      ? "Cuadre Exacto sin desviaciones"
                      : turnoSeleccionadoModal.diferencia > 0
                      ? "Sobrante a favor en gaveta"
                      : "Faltante en gaveta"}
                  </span>
                </div>
                <span
                  className={`text-lg sm:text-xl font-mono font-black px-3.5 py-1.5 rounded-xl border ${
                    turnoSeleccionadoModal.diferencia === 0
                      ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                      : turnoSeleccionadoModal.diferencia > 0
                      ? "bg-blue-50 text-blue-950 border-blue-300"
                      : "bg-rose-50 text-rose-950 border-rose-300"
                  }`}
                >
                  {turnoSeleccionadoModal.diferencia >= 0 ? "+" : ""}$
                  {turnoSeleccionadoModal.diferencia.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* Documento Inmutable de Nota de Novedad */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Nota de Novedad / Justificación Registrada (Inmutable)</span>
              </label>

              {turnoSeleccionadoModal.notaNovedad ? (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-slate-900 text-sm font-medium leading-relaxed">
                  <p>{turnoSeleccionadoModal.notaNovedad}</p>
                  <p className="text-xs text-amber-900/80 font-bold mt-2 pt-2 border-t border-amber-200">
                    Registrado por: {turnoSeleccionadoModal.usuarioCajero?.nombre} (@
                    {turnoSeleccionadoModal.usuarioCajero?.username})
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs sm:text-sm font-medium">
                  {turnoSeleccionadoModal.diferencia === 0
                    ? "Cuadre exacto ($0 de diferencia). No se requirió nota de justificación por desviación."
                    : "No se registró nota de novedad en este arqueo."}
                </div>
              )}
            </div>

            {/* Observaciones generales del turno si las hay */}
            {turnoSeleccionadoModal.observaciones && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Observaciones Adicionales
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {turnoSeleccionadoModal.observaciones}
                </p>
              </div>
            )}

            {/* Desglose de Medios Digitales */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 block">
                Desglose de Ingresos Digitales del Turno
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Nequi:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${turnoSeleccionadoModal.totalNequi.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Bancolombia:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${turnoSeleccionadoModal.totalBancolombia.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Daviplata:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${turnoSeleccionadoModal.totalDaviplata.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Transf./Consig:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(
                      turnoSeleccionadoModal.totalTransferencia +
                      turnoSeleccionadoModal.totalConsignacion
                    ).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón Cerrar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTurnoSeleccionadoModal(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
