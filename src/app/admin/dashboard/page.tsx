"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  RefreshCw,
  Receipt,
  Vault,
  Smartphone,
  Banknote,
  ArrowUpRight,
  ClockAlert,
  CheckCircle2,
  User,
  Play,
  Pause,
  ShieldCheck,
  Wallet,
  Scale,
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import Tooltip from "@/components/ui/Tooltip";

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
  desgloseConsignaciones: {
    nequi: number;
    bancolombia: number;
    daviplata: number;
    llave: number;
    transferencia: number;
    consignacion: number;
  };
}

interface TurnoActualInfo {
  id: string;
  fechaApertura: string;
  baseInicial: number;
  cajero: string;
  efectivoEnGaveta?: number;
}

interface UltimaFactura {
  id: string;
  numeroFactura: string;
  clienteNombre: string;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  fechaCreacion: string;
}

interface DashboardMetricsResponse {
  success: boolean;
  consolidadoCajaCartera?: ConsolidadoCajaCartera;
  turnoActual?: TurnoActualInfo | null;
  ultimasFacturas?: UltimaFactura[];
}

const CONSOLIDADO_INICIAL: ConsolidadoCajaCartera = {
  baseCaja: 0,
  dineroRecibidoEfectivo: 0,
  dineroConsignaciones: 0,
  depositosCustodia: 0,
  depositosCustodiaEfectivo: 0,
  depositosCustodiaDigital: 0,
  efectivoRealEnGaveta: 0,
  fondoPermanenteCaja: 0,
  ingresosRealesTienda: 0,
  consolidadoTotal: 0,
  carteraPorCobrar: 0,
  saldosPendientes: 0,
  morasActivas: 0,
  clientesDeudoresCount: 0,
  facturasConSaldoCount: 0,
  alquileresVencidosCount: 0,
  desgloseConsignaciones: {
    nequi: 0,
    bancolombia: 0,
    daviplata: 0,
    llave: 0,
    transferencia: 0,
    consignacion: 0,
  },
};

export default function DashboardGerencialPage() {
  const [periodoActivo, setPeriodoActivo] = useState<"DIA" | "MES" | "ANIO" | "PERSONALIZADO">("DIA");

  const [fechaDesde, setFechaDesde] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);

  const [consolidado, setConsolidado] = useState<ConsolidadoCajaCartera>(CONSOLIDADO_INICIAL);
  const [turnoActual, setTurnoActual] = useState<TurnoActualInfo | null>(null);
  const [ultimasFacturas, setUltimasFacturas] = useState<UltimaFactura[]>([]);

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizandoSilencioso, setActualizandoSilencioso] = useState(false);
  const [enVivoActivo, setEnVivoActivo] = useState(true);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date>(new Date());
  const [totalPulsosRecibidos, setTotalPulsosRecibidos] = useState(0);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  const ultimaFirmaDatosRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const cargarMetricas = useCallback(
    async (mostrarSpinner = false) => {
      if (mostrarSpinner) {
        setCargandoInicial(true);
      } else {
        setActualizandoSilencioso(true);
      }

      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {}
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const queryParam =
          periodoActivo !== "PERSONALIZADO"
            ? `periodo=${periodoActivo.toLowerCase()}`
            : `desde=${fechaDesde}&hasta=${fechaHasta}`;

        const { ok, data, error } = await safeFetchJson<DashboardMetricsResponse>(
          `/api/dashboard/metrics?${queryParam}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (error === "PETICION_ABORTADA") {
          return;
        }

        if (ok && data?.success && data.consolidadoCajaCartera) {
          const c = data.consolidadoCajaCartera;
          const firmaActual = `${c.baseCaja}-${c.dineroRecibidoEfectivo}-${c.dineroConsignaciones}-${c.depositosCustodia}-${c.carteraPorCobrar}-${data.ultimasFacturas?.[0]?.id || ""}`;

          if (firmaActual !== ultimaFirmaDatosRef.current || mostrarSpinner) {
            ultimaFirmaDatosRef.current = firmaActual;
            setConsolidado(c);
            setUltimasFacturas(data.ultimasFacturas || []);
            setTurnoActual(data.turnoActual || null);
          }

          setUltimaSincronizacion(new Date());
          setTotalPulsosRecibidos((prev) => prev + 1);
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "AbortError" ||
            err.message?.toLowerCase().includes("abort") ||
            err.message?.toLowerCase().includes("aborted"))
        ) {
          return;
        }
        console.warn("Telemetría en segundo plano no crítica:", err);
      } finally {
        setCargandoInicial(false);
        setActualizandoSilencioso(false);
      }
    },
    [periodoActivo, fechaDesde, fechaHasta]
  );

  useEffect(() => {
    cargarMetricas(true);
  }, [cargarMetricas]);

  useEffect(() => {
    if (!enVivoActivo) return;

    const pollingInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        cargarMetricas(false);
      }
    }, 15000);

    const handleReenfoque = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        cargarMetricas(false);
      }
    };

    window.addEventListener("focus", handleReenfoque);
    document.addEventListener("visibilitychange", handleReenfoque);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener("focus", handleReenfoque);
      document.removeEventListener("visibilitychange", handleReenfoque);
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {}
      }
    };
  }, [enVivoActivo, cargarMetricas]);

  const formatearDinero = (val: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);

  const setRangoHoy = () => {
    setPeriodoActivo("DIA");
    const hoy = new Date().toISOString().split("T")[0];
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };

  const setRangoEsteMes = () => {
    setPeriodoActivo("MES");
    const now = new Date();
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    setFechaDesde(primerDia);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  const setRangoAnoActual = () => {
    setPeriodoActivo("ANIO");
    const now = new Date();
    const primerDiaAno = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    setFechaDesde(primerDiaAno);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  const canalesConsignacion = [
    { etiqueta: "Nequi", valor: consolidado.desgloseConsignaciones.nequi },
    { etiqueta: "Bancolombia", valor: consolidado.desgloseConsignaciones.bancolombia },
    { etiqueta: "Daviplata", valor: consolidado.desgloseConsignaciones.daviplata },
    { etiqueta: "Llave", valor: consolidado.desgloseConsignaciones.llave },
    { etiqueta: "Transferencia", valor: consolidado.desgloseConsignaciones.transferencia },
    { etiqueta: "Consignación", valor: consolidado.desgloseConsignaciones.consignacion },
  ].filter((c) => c.valor > 0);

  return (
    <div className="w-full space-y-5">
      {/* 1. Cabecera Gerencial & Filtros */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            Consolidado de Caja y Cartera
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Control directo sincronizado con el turno de caja activo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButtonTooltip
            icon={enVivoActivo ? Pause : Play}
            label={
              enVivoActivo
                ? `Pausar sincronización en vivo (Pulsos: ${totalPulsosRecibidos})`
                : "Reanudar sincronización en vivo"
            }
            modulo="En Vivo"
            destino="Actualización automática cada 15s"
            onClick={() => setEnVivoActivo(!enVivoActivo)}
            size="md"
            variant={enVivoActivo ? "emerald" : "neutral"}
          />

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Tooltip content="Ver cifras de la jornada de hoy" position="bottom">
              <button
                type="button"
                onClick={setRangoHoy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodoActivo === "DIA"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                Hoy
              </button>
            </Tooltip>
            <Tooltip content="Ver acumulado del mes actual" position="bottom">
              <button
                type="button"
                onClick={setRangoEsteMes}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodoActivo === "MES"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                Mes
              </button>
            </Tooltip>
            <Tooltip content="Ver acumulado del año actual" position="bottom">
              <button
                type="button"
                onClick={setRangoAnoActual}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodoActivo === "ANIO"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                Año
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-blue-600 ml-1" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setPeriodoActivo("PERSONALIZADO");
                setFechaDesde(e.target.value);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            />
            <span className="text-xs text-slate-400 font-bold">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setPeriodoActivo("PERSONALIZADO");
                setFechaHasta(e.target.value);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            />
          </div>

          <IconButtonTooltip
            icon={RefreshCw}
            label="Actualizar"
            modulo="Métricas"
            destino={`Última actualización: ${montado ? ultimaSincronizacion.toLocaleTimeString("es-CO") : "--:--"}`}
            onClick={() => cargarMetricas(true)}
            disabled={cargandoInicial || actualizandoSilencioso}
            iconClassName={
              cargandoInicial || actualizandoSilencioso ? "animate-spin text-blue-600" : "text-blue-600"
            }
            size="md"
            variant="neutral"
          />
        </div>
      </div>

      {/* 2. Barra de Estado de Turno Activo */}
      {turnoActual && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              Turno Activo: <strong className="text-slate-950 font-bold">{turnoActual.cajero}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              En Gaveta Física: {formatearDinero(consolidado.efectivoRealEnGaveta)}
            </span>
            <Link
              href="/admin/caja"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              <span>Ir a Arqueo / Cierre</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Consolidado Limpio de los 4 Rubros Separados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rubro 1: Base de Caja */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">
              1. Base de Caja
            </span>
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Vault className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 mt-3">
            {formatearDinero(consolidado.baseCaja)}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Base fija inicial que permanece en gaveta
          </p>
        </div>

        {/* Rubro 2: Dinero en Caja Real (Efectivo Recibido) */}
        <div className="bg-emerald-50/50 rounded-2xl p-5 border-2 border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
              2. Dinero Recibido (Efectivo)
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-950 mt-3">
            {formatearDinero(consolidado.dineroRecibidoEfectivo)}
          </p>
          <p className="text-xs text-emerald-800 font-medium mt-1">
            Ingresos reales en efectivo (sin depósitos)
          </p>
        </div>

        {/* Rubro 3: Consignaciones y Transferencias */}
        <div className="bg-purple-50/50 rounded-2xl p-5 border-2 border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-900">
              3. Consignaciones / Bancos
            </span>
            <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-purple-950 mt-3">
            {formatearDinero(consolidado.dineroConsignaciones)}
          </p>
          <div className="text-[11px] text-purple-800 font-medium mt-1">
            {canalesConsignacion.length > 0 ? (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {canalesConsignacion.map((c) => (
                  <span key={c.etiqueta}>
                    {c.etiqueta}: <strong>{formatearDinero(c.valor)}</strong>
                  </span>
                ))}
              </div>
            ) : (
              <span>Nequi, Bancolombia, Daviplata, Transferencias</span>
            )}
          </div>
        </div>

        {/* Rubro 4: Depósitos en Custodia (Fondo Constante) */}
        <div className="bg-amber-50/60 rounded-2xl p-5 border-2 border-amber-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              4. Depósitos en Custodia
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-950 mt-3">
            {formatearDinero(consolidado.depositosCustodia)}
          </p>
          <p className="text-xs text-amber-900 font-medium mt-1">
            Efectivo: {formatearDinero(consolidado.depositosCustodiaEfectivo)}
            {consolidado.depositosCustodiaDigital > 0
              ? ` • Digital: ${formatearDinero(consolidado.depositosCustodiaDigital)}`
              : " • Fondo constante (no es ingreso)"}
          </p>
        </div>
      </div>

      {/* 4. Ecuación Consolidada Transparente (Base + Recibido Efectivo + Consignaciones + Depósitos) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Suma Consolidada Total (Base + Efectivo Recibido + Consignaciones + Depósitos)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono">
              <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200">
                Base: <strong>{formatearDinero(consolidado.baseCaja)}</strong>
              </span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-emerald-300">
                Recibido Ef.: <strong>{formatearDinero(consolidado.dineroRecibidoEfectivo)}</strong>
              </span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-700/60 text-purple-300">
                Consignaciones: <strong>{formatearDinero(consolidado.dineroConsignaciones)}</strong>
              </span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-700/60 text-amber-300">
                Depósitos: <strong>{formatearDinero(consolidado.depositosCustodia)}</strong>
              </span>
            </div>
          </div>

          <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-slate-700 pt-3 lg:pt-0 lg:pl-6 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Consolidado en Sistema
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatearDinero(consolidado.consolidadoTotal)}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              Ingreso real tienda: {formatearDinero(consolidado.ingresosRealesTienda)} &bull; Físico en gaveta: {formatearDinero(consolidado.efectivoRealEnGaveta)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Estado de Cartera (Saldos por Cobrar y Moras Activas) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              Estado de Cartera Pendiente (Dinero en la Calle)
            </span>
            <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
              <span className="text-2xl font-black font-mono text-rose-700">
                {formatearDinero(consolidado.carteraPorCobrar)}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Saldos por cobrar: <strong className="text-slate-900">{formatearDinero(consolidado.saldosPendientes)}</strong>
                {" • "}
                Moras activas: <strong className="text-rose-700">{formatearDinero(consolidado.morasActivas)}</strong>
                {" • "}
                {consolidado.clientesDeudoresCount} cliente(s) / {consolidado.facturasConSaldoCount} factura(s)
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/admin/monitoreo"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition shrink-0"
        >
          <span>Gestionar Cartera y Cobros</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 6. Tabla de Últimas Facturas Emitidas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Últimas Facturas</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {ultimasFacturas.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Movimientos recientes sincronizados en tiempo real
              </p>
            </div>
          </div>

          <Link
            href="/admin/monitoreo"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Ir a Monitoreo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">N° Factura</th>
                <th className="py-3 px-5">Cliente</th>
                <th className="py-3 px-5">Tipo</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5 text-right">Total</th>
                <th className="py-3 px-5 text-right">Abonado</th>
                <th className="py-3 px-5 text-right">Saldo Pendiente</th>
                <th className="py-3 px-5 text-center">Fecha y Hora</th>
                <th className="py-3 px-5 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimasFacturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No se encontraron facturas registradas en este rango de fecha.
                  </td>
                </tr>
              ) : (
                ultimasFacturas.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-5 font-bold text-slate-900 font-mono">
                      #{fac.numeroFactura}
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{fac.clienteNombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {fac.tipoOperacion}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          fac.estado === "EN_MORA"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : fac.estado === "CERRADA"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {fac.estado === "EN_MORA" && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                        {fac.estado === "CERRADA" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {fac.estado !== "EN_MORA" && fac.estado !== "CERRADA" && (
                          <ClockAlert className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{fac.estado}</span>
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-slate-900 font-mono">
                      {formatearDinero(fac.totalFactura)}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold text-emerald-600 font-mono">
                      {formatearDinero(fac.totalAbonado)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-amber-600 font-mono">
                      {formatearDinero(fac.saldoPendiente)}
                    </td>
                    <td className="py-3 px-5 text-center text-slate-500 font-medium font-mono">
                      {new Date(fac.fechaCreacion).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <Link
                        href="/admin/monitoreo"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
                        title="Ver detalles, anular o liquidar en Historial"
                      >
                        <span>Gestionar</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
