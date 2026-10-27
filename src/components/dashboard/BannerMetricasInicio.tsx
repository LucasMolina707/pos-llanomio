"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Vault,
  ClockAlert,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
  Scissors,
  CalendarCheck,
  Banknote,
  Smartphone,
  Layers,
  Activity,
} from "lucide-react";

interface MetricasData {
  ingresosNetos: number;
  cuentasPorCobrar: number;
  morasRecaudadas: number;
  totalPrendasAlquiladas: number;
  prendasAlquiladasActivas: number;
  rendimientoSastreria: number;
  rendimientoVentas: number;
  rendimientoAlquileres: number;
  totalFacturas: number;
  totalAbonos: number;
  depositosCustodia: number;
}

interface DondeEstaElDineroData {
  efectivoFisicoPeriodo: number;
  efectivoEnGavetaTurno: number;
  totalCuentasDigitales: number;
  desgloseDigital: {
    nequi: number;
    bancolombia: number;
    llave: number;
    daviplata: number;
    transferencia: number;
  };
  depositosCustodia: number;
  cuentasPorCobrar: number;
  morasRecaudadas: number;
}

interface DesgloseMetodosPago {
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalBancolombia: number;
  totalLlave: number;
  totalTransferencia: number;
  totalDigital: number;
}

interface DesgloseLineasNegocio {
  alquileres: number;
  ventas: number;
  sastreria: number;
}

interface BannerMetricasInicioProps {
  esAdmin: boolean;
}

export default function BannerMetricasInicio({ esAdmin }: BannerMetricasInicioProps) {
  const [periodo, setPeriodo] = useState<"hoy" | "mes" | "anio">("hoy");
  const [metricas, setMetricas] = useState<MetricasData | null>(null);
  const [dondeEstaElDinero, setDondeEstaElDinero] = useState<DondeEstaElDineroData | null>(null);
  const [desgloseMetodos, setDesgloseMetodos] = useState<DesgloseMetodosPago | null>(null);
  const [desgloseLineas, setDesgloseLineas] = useState<DesgloseLineasNegocio | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [actualizando, setActualizando] = useState<boolean>(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());

  const formatearDinero = (val: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setActualizando(true);

    try {
      const res = await fetch(`/api/admin/dashboard?periodo=${periodo}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" },
      });

      if (!res.ok) throw new Error("Error al consultar métricas del servidor");

      const data = await res.json();
      if (data.success) {
        setMetricas(data.metricas);
        setDondeEstaElDinero(data.dondeEstaElDinero);
        setDesgloseMetodos(data.desgloseMetodos || data.desgloseMetodosPago);
        setDesgloseLineas(data.desgloseLineas || data.desgloseLineasNegocio);
        setUltimaActualizacion(new Date());
      }
    } catch (err) {
      console.error("Error al cargar métricas para el banner de inicio:", err);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (esAdmin) {
      cargarDatos();
    }
  }, [esAdmin, cargarDatos]);

  if (!esAdmin) {
    return null;
  }

  // Cálculos porcentuales para líneas de negocio
  const totalLineas =
    (desgloseLineas?.ventas || 0) +
    (desgloseLineas?.sastreria || 0) +
    (desgloseLineas?.alquileres || 0) || 1;

  const pctVentas = Math.min(100, Math.round(((desgloseLineas?.ventas || 0) / totalLineas) * 100));
  const pctSastreria = Math.min(100, Math.round(((desgloseLineas?.sastreria || 0) / totalLineas) * 100));
  const pctAlquileres = Math.min(100, Math.round(((desgloseLineas?.alquileres || 0) / totalLineas) * 100));

  // Cálculos porcentuales para métodos de pago
  const totalPagos =
    (desgloseMetodos?.totalEfectivo || 0) + (desgloseMetodos?.totalDigital || 0) || 1;
  const pctEfectivo = Math.min(100, Math.round(((desgloseMetodos?.totalEfectivo || 0) / totalPagos) * 100));
  const pctDigital = Math.min(100, Math.round(((desgloseMetodos?.totalDigital || 0) / totalPagos) * 100));

  const pctNequi = Math.min(100, Math.round(((desgloseMetodos?.totalNequi || 0) / totalPagos) * 100));
  const pctBancolombia = Math.min(100, Math.round(((desgloseMetodos?.totalBancolombia || 0) / totalPagos) * 100));
  const totalOtrosDigitales =
    (desgloseMetodos?.totalDaviplata || 0) +
    (desgloseMetodos?.totalLlave || 0) +
    (desgloseMetodos?.totalTransferencia || 0);
  const pctOtrosDigitales = Math.min(100, Math.round((totalOtrosDigitales / totalPagos) * 100));

  return (
    <section className="bg-gradient-to-br from-white via-slate-50/70 to-indigo-50/30 rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
      {/* 1. Encabezado del Banner: Título, Indicador en Vivo, Selector de Periodos y Enlace Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Métricas y Rendimiento Financiero del Sistema
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>En Vivo</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Lectura directa en tiempo real &bull; Actualizado: {ultimaActualizacion.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Controles de Selección de Periodo y Acceso al Dashboard Completo */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Selector de Periodo */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriodo("hoy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodo === "hoy"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("mes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodo === "mes"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("anio")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodo === "anio"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Este Año
            </button>
          </div>

          {/* Botón de Refresco Manual */}
          <button
            type="button"
            onClick={() => cargarDatos(true)}
            disabled={actualizando}
            aria-label="Actualizar métricas en tiempo real"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shrink-0 disabled:opacity-50"
            title="Refrescar métricas ahora"
          >
            <RefreshCw className={`h-4 w-4 ${actualizando ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Botón Destacado hacia /admin/dashboard */}
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-xs shadow-indigo-500/20 shrink-0"
            title="Abrir Dashboard Gerencial Completo"
          >
            <span>Ver Panel Completo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 2. Fila de Indicadores Clave (4 Tarjetas KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Ingresos Netos Recaudados */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ingresos Recaudados
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {cargando ? (
                <div className="h-7 w-28 bg-slate-200 rounded-md animate-pulse"></div>
              ) : (
                formatearDinero(metricas?.ingresosNetos || 0)
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {metricas?.totalFacturas || 0} facturas &bull; {metricas?.totalAbonos || 0} abonos
            </p>
          </div>
        </div>

        {/* KPI 2: Efectivo en Caja vs. Medios Digitales */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Efectivo vs. Digitales
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Vault className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span className="text-emerald-700">
                Efvo: {cargando ? "..." : formatearDinero(desgloseMetodos?.totalEfectivo || 0)}
              </span>
              <span className="text-blue-700">
                Dig: {cargando ? "..." : formatearDinero(desgloseMetodos?.totalDigital || 0)}
              </span>
            </div>

            {/* Barra de progreso de distribución */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${pctEfectivo}%` }}
                title={`Efectivo: ${pctEfectivo}%`}
              ></div>
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${pctDigital}%` }}
                title={`Digital: ${pctDigital}%`}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
              <span>{pctEfectivo}% Efectivo</span>
              <span>{pctDigital}% Digital</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Depósitos de Alquiler en Custodia */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Depósitos en Custodia
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <ClockAlert className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
              {cargando ? (
                <div className="h-7 w-28 bg-slate-200 rounded-md animate-pulse"></div>
              ) : (
                formatearDinero(metricas?.depositosCustodia || 0)
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {metricas?.prendasAlquiladasActivas || 0} prendas en alquiler activo
            </p>
          </div>
        </div>

        {/* KPI 4: Cuentas por Cobrar y Moras */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cartera y Moras
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
              {cargando ? (
                <div className="h-7 w-28 bg-slate-200 rounded-md animate-pulse"></div>
              ) : (
                formatearDinero(metricas?.cuentasPorCobrar || 0)
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Moras cobradas: {formatearDinero(metricas?.morasRecaudadas || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sección Gráfica Visual: Comparativa por Línea de Negocio y Distribución por Método de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel A: Rendimiento por Línea de Negocio */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Rendimiento por Línea de Negocio
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Participación</span>
          </div>

          <div className="space-y-3">
            {/* Ventas Directas */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                  <span>Ventas Directas POS</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(desgloseLineas?.ventas || 0)}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">({pctVentas}%)</span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctVentas}%` }}
                ></div>
              </div>
            </div>

            {/* Arreglos y Sastrería */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Scissors className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Arreglos y Sastrería</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(desgloseLineas?.sastreria || 0)}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">({pctSastreria}%)</span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctSastreria}%` }}
                ></div>
              </div>
            </div>

            {/* Alquileres de Prendas */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Alquiler de Prendas</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(desgloseLineas?.alquileres || 0)}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">({pctAlquileres}%)</span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctAlquileres}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel B: Distribución de Ingresos por Método de Pago */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Distribución por Métodos de Pago
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Total Recibido</span>
          </div>

          <div className="space-y-3">
            {/* Efectivo */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Efectivo en Caja</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(desgloseMetodos?.totalEfectivo || 0)}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">({pctEfectivo}%)</span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctEfectivo}%` }}
                ></div>
              </div>
            </div>

            {/* Nequi */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                  <span>Nequi</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(desgloseMetodos?.totalNequi || 0)}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">({pctNequi}%)</span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctNequi}%` }}
                ></div>
              </div>
            </div>

            {/* Bancolombia y Otros Digitales */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                  <span>Bancolombia, Llave y Daviplata</span>
                </span>
                <span className="text-slate-800">
                  {formatearDinero(
                    (desgloseMetodos?.totalBancolombia || 0) + totalOtrosDigitales
                  )}
                  <span className="text-slate-400 text-[10px] ml-1 font-semibold">
                    ({pctBancolombia + pctOtrosDigitales}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctBancolombia + pctOtrosDigitales}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
