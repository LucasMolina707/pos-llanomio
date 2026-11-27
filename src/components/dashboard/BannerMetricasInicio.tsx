"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  BarChart3,
  Vault,
  RefreshCw,
  ArrowRight,
  Banknote,
  Smartphone,
  ShieldCheck,
  Scale,
  Wallet,
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";

interface ConsolidadoCajaCartera {
  baseCaja: number;
  dineroRecibidoEfectivo: number;
  dineroConsignaciones: number;
  depositosCustodia: number;
  depositosCustodiaEfectivo: number;
  depositosCustodiaDigital: number;
  efectivoRealEnGaveta: number;
  fondoPermanenteCaja: number;
  ingresosRealesTienda: number;
  consolidadoTotal: number;
  carteraPorCobrar: number;
  saldosPendientes: number;
  morasActivas: number;
  clientesDeudoresCount: number;
  facturasConSaldoCount: number;
  alquileresVencidosCount: number;
}

interface DashboardApiResponse {
  success: boolean;
  consolidadoCajaCartera?: ConsolidadoCajaCartera;
}

interface BannerMetricasInicioProps {
  esAdmin: boolean;
}

export default function BannerMetricasInicio({ esAdmin }: BannerMetricasInicioProps) {
  const [periodo, setPeriodo] = useState<"hoy" | "mes" | "anio">("hoy");
  const [consolidado, setConsolidado] = useState<ConsolidadoCajaCartera | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [actualizando, setActualizando] = useState<boolean>(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [montado, setMontado] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMontado(true);
    setUltimaActualizacion(new Date());
  }, []);

  const formatearDinero = (val: number): string =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);

  const cargarDatos = useCallback(
    async (silencioso = false) => {
      if (!silencioso && !consolidado) setCargando(true);
      setActualizando(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const { ok, data } = await safeFetchJson<DashboardApiResponse>(
          `/api/admin/dashboard?periodo=${periodo}`,
          {
            signal: controller.signal,
            cacheTtlMs: 25000,
            forzarFresco: silencioso,
          }
        );

        if (ok && data?.success && data.consolidadoCajaCartera) {
          setConsolidado(data.consolidadoCajaCartera);
          setUltimaActualizacion(new Date());
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error al cargar métricas para el banner de inicio:", err);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [periodo, consolidado]
  );

  useEffect(() => {
    if (esAdmin) {
      cargarDatos();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [esAdmin, cargarDatos]);

  if (!esAdmin) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-white via-slate-50/70 to-indigo-50/30 rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
      {/* 1. Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Consolidado de Caja y Cartera
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>En Vivo</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium" suppressHydrationWarning>
              Sincronizado con el arqueo de caja &bull; Actualizado:{" "}
              <span suppressHydrationWarning>
                {montado && ultimaActualizacion
                  ? ultimaActualizacion.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "--:--:--"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriodo("hoy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodo === "mes"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("anio")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodo === "anio"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Año
            </button>
          </div>

          <button
            type="button"
            onClick={() => cargarDatos(true)}
            disabled={actualizando}
            aria-label="Actualizar métricas en tiempo real"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shrink-0 disabled:opacity-50 cursor-pointer"
            title="Refrescar métricas ahora"
          >
            <RefreshCw className={`h-4 w-4 ${actualizando ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-xs shadow-indigo-500/20 shrink-0"
          >
            <span>Ver Panel Completo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 2. 4 Tarjetas Limpias Separadas (Base, Efectivo Recibido, Consignaciones, Depósitos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Base de Caja</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Vault className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {cargando ? (
              <div className="h-7 w-24 bg-slate-200 rounded-md animate-pulse"></div>
            ) : (
              formatearDinero(consolidado?.baseCaja || 0)
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">Fondo fijo en gaveta</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Recibido Efectivo</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {cargando ? (
              <div className="h-7 w-24 bg-slate-200 rounded-md animate-pulse"></div>
            ) : (
              formatearDinero(consolidado?.dineroRecibidoEfectivo || 0)
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Gaveta real: {formatearDinero(consolidado?.efectivoRealEnGaveta || 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Consignaciones</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
            {cargando ? (
              <div className="h-7 w-24 bg-slate-200 rounded-md animate-pulse"></div>
            ) : (
              formatearDinero(consolidado?.dineroConsignaciones || 0)
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">Bancolombia (principal), Nequi, transferencias</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-300 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Depósitos Custodia</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono">
            {cargando ? (
              <div className="h-7 w-24 bg-slate-200 rounded-md animate-pulse"></div>
            ) : (
              formatearDinero(consolidado?.depositosCustodia || 0)
            )}
          </div>
          <p className="text-[11px] font-medium text-amber-800 mt-1">Fondo constante (no es ingreso)</p>
        </div>
      </div>

      {/* 3. Barra Compacta de Suma Consolidada + Cartera */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-sans font-bold uppercase tracking-wider mr-1">Total Consolidado:</span>
          <span className="text-lg font-black text-white">
            {formatearDinero(consolidado?.consolidadoTotal || 0)}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            (Base + Recibido Ef. + Consignaciones + Depósitos)
          </span>
        </div>

        <Link
          href="/admin/monitoreo"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-700/70 text-rose-200 text-xs font-bold transition shrink-0"
        >
          <Wallet className="w-3.5 h-3.5 text-rose-400" />
          <span>Cartera por cobrar: {formatearDinero(consolidado?.carteraPorCobrar || 0)}</span>
        </Link>
      </div>
    </section>
  );
}
