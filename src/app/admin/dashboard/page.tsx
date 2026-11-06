"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ShoppingBag,
  Scissors,
  Calendar,
  RefreshCw,
  Receipt,
  Vault,
  Smartphone,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Filter,
  BarChart3,
  Layers,
  ClockAlert,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Radio,
  Play,
  Pause,
  ShieldCheck,
  Building2,
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";

interface MetricasData {
  ingresosNetos: number;
  totalGastos?: number;
  utilidadNeta?: number;
  balanceNeto?: number;
  cuentasPorCobrar: number;
  morasRecaudadas: number;
  totalPrendasAlquiladas: number;
  prendasAlquiladasActivas: number;
  rendimientoSastreria: number;
  rendimientoVentas: number;
  rendimientoAlquileres: number;
  rendimientoApartados?: number;
  totalFacturas: number;
  totalAbonos: number;
  depositosCustodia?: number;
  depositosEnCustodia?: number;
  dineroEnLaCalle?: number;
  clientesDeudoresCount?: number;
}

interface DesgloseMetodosPago {
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalBancolombia: number;
  totalLlave: number;
  totalTransferencia: number;
  totalConsignacion?: number;
  totalDigital: number;
}

interface DesgloseLineasNegocio {
  alquileres: number;
  ventas: number;
  apartados?: number;
  sastreria: number;
}

interface DondeEstaElDineroData {
  efectivoFisicoPeriodo: number;
  efectivoEnGavetaTurno: number;
  baseInicialGaveta?: number;
  efectivoRecaudadoTurno?: number;
  totalCuentasDigitales: number;
  cuentasDigitalesOConsignaciones?: number;
  desgloseDigital: {
    nequi: number;
    bancolombia: number;
    llave: number;
    daviplata: number;
    transferencia: number;
    consignacion?: number;
  };
  depositosCustodia: number;
  depositosEnCustodia?: number;
  desgloseCustodia?: {
    alquileresActivos: number;
    apartadosActivos: number;
    leyenda: string;
  };
  dineroEnLaCalle?: number;
  desgloseDineroCalle?: {
    saldosPorCobrar: number;
    morasActivas: number;
    clientesDeudoresCount: number;
    facturasConSaldoCount: number;
    alquileresVencidosCount: number;
  };
  cuentasPorCobrar: number;
  morasRecaudadas: number;
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

export default function DashboardGerencialPage() {
  const [periodoActivo, setPeriodoActivo] = useState<"DIA" | "MES" | "ANIO" | "PERSONALIZADO">("MES");

  // Fechas por defecto: mes actual
  const [fechaDesde, setFechaDesde] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Estados de métricas financieras
  const [metricas, setMetricas] = useState<MetricasData>({
    ingresosNetos: 0,
    cuentasPorCobrar: 0,
    morasRecaudadas: 0,
    totalPrendasAlquiladas: 0,
    prendasAlquiladasActivas: 0,
    rendimientoSastreria: 0,
    rendimientoVentas: 0,
    rendimientoAlquileres: 0,
    totalFacturas: 0,
    totalAbonos: 0,
    depositosCustodia: 0,
  });

  const [dondeEstaElDinero, setDondeEstaElDinero] = useState<DondeEstaElDineroData>({
    efectivoFisicoPeriodo: 0,
    efectivoEnGavetaTurno: 0,
    totalCuentasDigitales: 0,
    desgloseDigital: {
      nequi: 0,
      bancolombia: 0,
      llave: 0,
      daviplata: 0,
      transferencia: 0,
    },
    depositosCustodia: 0,
    cuentasPorCobrar: 0,
    morasRecaudadas: 0,
  });

  const [metodosPago, setMetodosPago] = useState<DesgloseMetodosPago>({
    totalEfectivo: 0,
    totalNequi: 0,
    totalDaviplata: 0,
    totalBancolombia: 0,
    totalLlave: 0,
    totalTransferencia: 0,
    totalDigital: 0,
  });

  const [lineasNegocio, setLineasNegocio] = useState<DesgloseLineasNegocio>({
    alquileres: 0,
    ventas: 0,
    sastreria: 0,
  });

  const [turnoActual, setTurnoActual] = useState<TurnoActualInfo | null>(null);
  const [ultimasFacturas, setUltimasFacturas] = useState<UltimaFactura[]>([]);

  // Estados de control de telemetría en tiempo real
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizandoSilencioso, setActualizandoSilencioso] = useState(false);
  const [enVivoActivo, setEnVivoActivo] = useState(true);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date>(new Date());
  const [totalPulsosRecibidos, setTotalPulsosRecibidos] = useState(0);

  // Referencias para evitar revalidaciones duplicadas y condiciones de carrera
  const ultimaFirmaDatosRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Función principal de carga de métricas (silenciosa o con indicador)
  const cargarMetricas = useCallback(
    async (mostrarSpinner = false) => {
      if (mostrarSpinner) {
        setCargandoInicial(true);
      } else {
        setActualizandoSilencioso(true);
      }

      // Cancelar request previo si aún está en vuelo
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const queryParam =
          periodoActivo !== "PERSONALIZADO"
            ? `periodo=${periodoActivo.toLowerCase()}`
            : `desde=${fechaDesde}&hasta=${fechaHasta}`;

        const { ok, data } = await safeFetchJson<any>(`/api/dashboard/metrics?${queryParam}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (ok && data?.success && data?.metricas) {
          const firmaActual = `${data.metricas.ingresosNetos}-${data.metricas.cuentasPorCobrar}-${data.metricas.totalFacturas}-${data.dondeEstaElDinero?.depositosCustodia || 0}-${data.ultimasFacturas?.[0]?.id || ""}`;

          if (firmaActual !== ultimaFirmaDatosRef.current || mostrarSpinner) {
            ultimaFirmaDatosRef.current = firmaActual;
            setMetricas(data.metricas);
            if (data.dondeEstaElDinero) {
              setDondeEstaElDinero(data.dondeEstaElDinero);
            }
            setMetodosPago(data.desgloseMetodos || data.desgloseMetodosPago);
            setLineasNegocio(data.desgloseLineas || data.desgloseLineasNegocio);
            setUltimasFacturas(data.ultimasFacturas || []);
            setTurnoActual(data.turnoActual || null);
          }

          setUltimaSincronizacion(new Date());
          setTotalPulsosRecibidos((prev) => prev + 1);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
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

  // Carga inicial al montar o al cambiar filtros
  useEffect(() => {
    cargarMetricas(true);
  }, [cargarMetricas]);

  // Polling Inteligente con AbortController y Pausa por Visibilidad (15s LAN local)
  // Reemplaza SSE permanente para liberar sockets HTTP/1.1 y garantizar transiciones de página instantáneas (<50ms)
  useEffect(() => {
    if (!enVivoActivo) return;

    let pollingInterval: NodeJS.Timeout | null = null;

    // Ejecutar revalidación periódica cada 15 segundos solo si la pestaña está activa
    pollingInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        cargarMetricas(false);
      }
    }, 15000);

    // Revalidación inmediata al recibir foco o volver a la pestaña del navegador
    const handleReenfoque = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        cargarMetricas(false);
      }
    };

    window.addEventListener("focus", handleReenfoque);
    document.addEventListener("visibilitychange", handleReenfoque);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      window.removeEventListener("focus", handleReenfoque);
      document.removeEventListener("visibilitychange", handleReenfoque);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [enVivoActivo, cargarMetricas]);

  const formatearDinero = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Atajos rápidos de fecha
  const setRangoHoy = () => {
    setPeriodoActivo("DIA");
    const hoy = new Date().toISOString().split("T")[0];
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };

  const setRango7Dias = () => {
    setPeriodoActivo("PERSONALIZADO");
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFechaDesde(d.toISOString().split("T")[0]);
    setFechaHasta(new Date().toISOString().split("T")[0]);
  };

  const setRangoEsteMes = () => {
    setPeriodoActivo("MES");
    const now = new Date();
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    setFechaDesde(primerDia);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  const setRangoAnoActual = () => {
    setPeriodoActivo("ANIO");
    const now = new Date();
    const primerDiaAno = new Date(now.getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0];
    setFechaDesde(primerDiaAno);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  // Cálculo porcentual para barras de progreso
  const totalPagos =
    metodosPago.totalEfectivo +
    metodosPago.totalNequi +
    metodosPago.totalDaviplata +
    (metodosPago.totalBancolombia || 0) +
    (metodosPago.totalLlave || 0) +
    metodosPago.totalTransferencia || 1;

  const totalLineas =
    lineasNegocio.alquileres + lineasNegocio.ventas + lineasNegocio.sastreria || 1;

  return (
    <div className="w-full space-y-6">
      {/* 1. Cabecera Gerencial & Telemetría en Vivo */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">
            Dashboard Gerencial
          </h1>
          <p className="text-xs text-slate-500 font-medium truncate">
            Visualización en tiempo real de ingresos, cuentas por cobrar, moras y balance
          </p>
        </div>

        {/* Controles de Filtros Temporales y Botón En Vivo */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Conmutador de Pausa / Reanudación En Vivo */}
          <IconButtonTooltip
            icon={enVivoActivo ? Pause : Play}
            label={
              enVivoActivo
                ? `Pausar Sincronización en Vivo (Pulsos: ${totalPulsosRecibidos})`
                : "Reanudar Sincronización en Vivo"
            }
            modulo="En Vivo"
            destino="Transmisión SSE en tiempo real"
            onClick={() => setEnVivoActivo(!enVivoActivo)}
            size="md"
            variant={enVivoActivo ? "emerald" : "neutral"}
          />

          {/* Botones de Selección Rápida de Periodo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={setRangoHoy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodoActivo === "DIA"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              Día (Hoy)
            </button>
            <button
              type="button"
              onClick={setRangoEsteMes}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodoActivo === "MES"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              Mes Actual
            </button>
            <button
              type="button"
              onClick={setRangoAnoActual}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodoActivo === "ANIO"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              Año Actual
            </button>
          </div>

          {/* Rango de Fechas Personalizado */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-blue-600 ml-1.5" />
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

          {/* Botón de Refresco Manual */}
          <IconButtonTooltip
            icon={RefreshCw}
            label="Actualizar Métricas y Balance"
            modulo="Dashboard"
            destino={`Recalcula ventas, cartera y moras (Última: ${ultimaSincronizacion.toLocaleTimeString("es-CO")})`}
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

      {/* 2. Barra de Estado de Turno de Caja en Vivo */}
      {turnoActual && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              Caja Activa: <strong className="text-slate-900 font-bold">{turnoActual.cajero}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Base: ${turnoActual.baseInicial.toLocaleString("es-CO")}
            </span>
            <IconButtonTooltip
              icon={ArrowUpRight}
              label="Control y Arqueo de Caja"
              modulo="Operaciones"
              destino="Ruta: /admin/caja"
              href="/admin/caja"
              size="md"
              variant="neutral"
            />
          </div>
        </div>
      )}

      {/* SECCIÓN 1: ¿DÓNDE ESTÁ EL DINERO? (TRAZABILIDAD EXACTA DE LIQUIDEZ) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                ¿Dónde está el Dinero? (Trazabilidad de Liquidez)
              </h2>
              <p className="text-xs text-slate-500">
                Auditoría en tiempo real de billetes en gaveta, saldos digitales en bancos, depósitos en custodia y dinero en la calle
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 w-fit">
            Período: <strong className="text-slate-900 uppercase">{periodoActivo === "DIA" ? "Día (Hoy)" : periodoActivo === "MES" ? "Mes Actual" : periodoActivo === "ANIO" ? "Año Actual" : "Personalizado"}</strong>
          </span>
        </div>

        {/* 4 Tarjetas de Liquidez */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Efectivo Físico */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-white rounded-xl p-4 border border-emerald-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Efectivo Físico
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                En Caja
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight">
              {formatearDinero(dondeEstaElDinero?.efectivoFisicoPeriodo ?? metodosPago.totalEfectivo)}
            </div>
            <div className="pt-2 border-t border-emerald-100 space-y-1 text-xs text-emerald-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">En Gaveta (Turno):</span>
                <span className="font-bold font-mono">
                  {formatearDinero(dondeEstaElDinero?.efectivoEnGavetaTurno ?? turnoActual?.efectivoEnGaveta ?? 0)}
                </span>
              </div>
              {turnoActual && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700">
                  <span>Base: {formatearDinero(dondeEstaElDinero?.baseInicialGaveta ?? turnoActual.baseInicial)}</span>
                  <span>+ Recaudado: {formatearDinero(dondeEstaElDinero?.efectivoRecaudadoTurno ?? (dondeEstaElDinero?.efectivoEnGavetaTurno ? dondeEstaElDinero.efectivoEnGavetaTurno - turnoActual.baseInicial : 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Cuentas Digitales o Consignaciones */}
          <div className="bg-gradient-to-br from-blue-50/60 to-white rounded-xl p-4 border border-blue-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Cuentas Digitales / Consignaciones
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Bancos & Apps
              </span>
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono tracking-tight">
              {formatearDinero(dondeEstaElDinero?.cuentasDigitalesOConsignaciones ?? dondeEstaElDinero?.totalCuentasDigitales ?? (metodosPago.totalNequi + metodosPago.totalDaviplata + (metodosPago.totalBancolombia || 0) + (metodosPago.totalLlave || 0) + metodosPago.totalTransferencia + (metodosPago.totalConsignacion || 0)))}
            </div>
            <div className="pt-2 border-t border-blue-100 flex flex-wrap gap-1 text-[11px]">
              <span className="bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                Neq: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.nequi ?? metodosPago.totalNequi)}
              </span>
              <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                Ban: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.bancolombia ?? metodosPago.totalBancolombia ?? 0)}
              </span>
              <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                Dav: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.daviplata ?? metodosPago.totalDaviplata)}
              </span>
              {((dondeEstaElDinero?.desgloseDigital?.llave ?? metodosPago.totalLlave ?? 0) > 0) && (
                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  Llave: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.llave ?? metodosPago.totalLlave ?? 0)}
                </span>
              )}
              {((dondeEstaElDinero?.desgloseDigital?.transferencia ?? metodosPago.totalTransferencia ?? 0) > 0) && (
                <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  Transf: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.transferencia ?? metodosPago.totalTransferencia ?? 0)}
                </span>
              )}
              {((dondeEstaElDinero?.desgloseDigital?.consignacion ?? metodosPago.totalConsignacion ?? 0) > 0) && (
                <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                  Consig: {formatearDinero(dondeEstaElDinero?.desgloseDigital?.consignacion ?? metodosPago.totalConsignacion ?? 0)}
                </span>
              )}
            </div>
          </div>

          {/* 3. Depósitos en Custodia (Alquileres + Apartados) */}
          <div className="bg-gradient-to-br from-amber-50/60 to-white rounded-xl p-4 border border-amber-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Depósitos en Custodia
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Garantías
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono tracking-tight">
              {formatearDinero(dondeEstaElDinero?.depositosEnCustodia ?? dondeEstaElDinero?.depositosCustodia ?? metricas.depositosCustodia ?? 0)}
            </div>
            <div className="pt-2 border-t border-amber-100 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between font-bold text-[11px]">
                <span>Alquileres: {formatearDinero(dondeEstaElDinero?.desgloseCustodia?.alquileresActivos ?? dondeEstaElDinero?.depositosCustodia ?? 0)}</span>
                <span>Apartados: {formatearDinero(dondeEstaElDinero?.desgloseCustodia?.apartadosActivos ?? 0)}</span>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                Dinero en garantía de alquileres activos y apartados (En custodia, no es ingreso de la tienda)
              </p>
            </div>
          </div>

          {/* 4. Dinero en la Calle (Saldos por Cobrar + Moras Activas) */}
          <div className="bg-gradient-to-br from-rose-50/60 to-white rounded-xl p-4 border border-rose-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <ClockAlert className="w-4 h-4 text-rose-600" />
                Dinero en la Calle
              </span>
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                Cartera & Moras
              </span>
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono tracking-tight">
              {formatearDinero(dondeEstaElDinero?.dineroEnLaCalle ?? (dondeEstaElDinero?.cuentasPorCobrar ?? metricas.cuentasPorCobrar))}
            </div>
            <div className="pt-2 border-t border-rose-100 text-xs text-rose-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-[11px]">
                <span>Saldos: {formatearDinero(dondeEstaElDinero?.desgloseDineroCalle?.saldosPorCobrar ?? dondeEstaElDinero?.cuentasPorCobrar ?? metricas.cuentasPorCobrar)}</span>
                <span>Moras Activas: {formatearDinero(dondeEstaElDinero?.desgloseDineroCalle?.morasActivas ?? 0)}</span>
              </div>
              <p className="text-[10.5px] font-semibold text-rose-700">
                {dondeEstaElDinero?.desgloseDineroCalle?.clientesDeudoresCount ?? metricas.clientesDeudoresCount ?? 0} clientes deudores / en mora
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cuadrícula de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {/* Tarjeta 1: Ingresos Netos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ingresos Netos
            </span>
            <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-slate-900 transition-colors">
              {formatearDinero(metricas.ingresosNetos)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center justify-between">
              <span>Total recaudado</span>
              <span className="font-bold text-slate-700">{metricas.totalAbonos} abonos</span>
            </p>
          </div>
        </div>

        {/* Tarjeta 2: Cuentas por Cobrar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cuentas por Cobrar
            </span>
            <div className="h-10 w-10 rounded-full bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600">
              <ClockAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-amber-600 transition-colors">
              {formatearDinero(metricas.cuentasPorCobrar)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Saldos pendientes de clientes
            </p>
          </div>
        </div>

        {/* Tarjeta 3: Moras Recaudadas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Moras Recaudadas
            </span>
            <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-rose-600 transition-colors">
              {formatearDinero(metricas.morasRecaudadas)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Recargos por retraso liquidados
            </p>
          </div>
        </div>

        {/* Tarjeta 4: Prendas Alquiladas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Prendas Alquiladas
            </span>
            <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-slate-900 transition-colors">
              {metricas.totalPrendasAlquiladas}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center justify-between">
              <span>En periodo</span>
              <span className="font-bold text-indigo-600">
                {metricas.prendasAlquiladasActivas} fuera de tienda
              </span>
            </p>
          </div>
        </div>

        {/* Tarjeta 5: Sastrería Libre */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sastrería Libre
            </span>
            <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600">
              <Scissors className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-emerald-600 transition-colors">
              {formatearDinero(metricas.rendimientoSastreria)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Arreglos y confección sin stock
            </p>
          </div>
        </div>

        {/* Tarjeta 6: Total Gastos del Periodo */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Gastos
            </span>
            <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-rose-600 transition-colors">
              {formatearDinero(metricas.totalGastos ?? 0)}
            </div>
            <Link
              href="/admin/gastos"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center justify-between hover:underline"
            >
              <span>Ver hoja de gastos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Tarjeta 7: Balance / Utilidad Neta */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Utilidad Neta
            </span>
            <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight transition-colors ${
                (metricas.utilidadNeta ?? metricas.ingresosNetos) >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {formatearDinero(metricas.utilidadNeta ?? metricas.ingresosNetos)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Ingresos - Gastos
            </p>
          </div>
        </div>
      </div>

      {/* 4. Desgloses Comparativos en 2 Columnas Grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose por Método de Pago */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Ingresos por Método de Pago
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Base: {formatearDinero(totalPagos === 1 ? 0 : totalPagos)}
            </span>
          </div>

          <div className="space-y-4">
            {/* Efectivo */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Efectivo
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(metodosPago.totalEfectivo)} ({Math.round((metodosPago.totalEfectivo / totalPagos) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(metodosPago.totalEfectivo / totalPagos) * 100}%` }}
                />
              </div>
            </div>

            {/* Nequi */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" /> Nequi
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(metodosPago.totalNequi)} ({Math.round((metodosPago.totalNequi / totalPagos) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(metodosPago.totalNequi / totalPagos) * 100}%` }}
                />
              </div>
            </div>

            {/* Daviplata */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-600" /> Daviplata
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(metodosPago.totalDaviplata)} ({Math.round((metodosPago.totalDaviplata / totalPagos) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(metodosPago.totalDaviplata / totalPagos) * 100}%` }}
                />
              </div>
            </div>

            {/* Bancolombia / Llave */}
            {(metodosPago.totalBancolombia > 0 || metodosPago.totalLlave > 0) && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" /> Bancolombia & Llave
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatearDinero((metodosPago.totalBancolombia || 0) + (metodosPago.totalLlave || 0))} (
                    {Math.round(
                      (((metodosPago.totalBancolombia || 0) + (metodosPago.totalLlave || 0)) / totalPagos) * 100
                    )}
                    %)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (((metodosPago.totalBancolombia || 0) + (metodosPago.totalLlave || 0)) / totalPagos) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Transferencias / Consignaciones */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" /> Transferencia Bancaria
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(metodosPago.totalTransferencia)} ({Math.round((metodosPago.totalTransferencia / totalPagos) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(metodosPago.totalTransferencia / totalPagos) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por Línea de Negocio */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Rendimiento por Línea de Negocio
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total: {formatearDinero(totalLineas === 1 ? 0 : totalLineas)}
            </span>
          </div>

          <div className="space-y-4">
            {/* Alquileres */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-blue-600" /> Alquiler de Trajes & Vestidos
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(lineasNegocio.alquileres)} ({Math.round((lineasNegocio.alquileres / totalLineas) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(lineasNegocio.alquileres / totalLineas) * 100}%` }}
                />
              </div>
            </div>

            {/* Venta Directa */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" /> Venta Directa de Accesorios & Prendas
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(lineasNegocio.ventas)} ({Math.round((lineasNegocio.ventas / totalLineas) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(lineasNegocio.ventas / totalLineas) * 100}%` }}
                />
              </div>
            </div>

            {/* Sastrería Libre */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-emerald-600" /> Confección & Sastrería Libre
                </span>
                <span className="font-bold text-slate-900">
                  {formatearDinero(lineasNegocio.sastreria)} ({Math.round((lineasNegocio.sastreria / totalLineas) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(lineasNegocio.sastreria / totalLineas) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tabla de Últimas Facturas Emitidas en Ancho Completo */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Últimas Facturas Emitidas
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {ultimasFacturas.length} en pantalla
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Transacciones registradas en tiempo real en la base de datos
              </p>
            </div>
          </div>

          <Link
            href="/admin/monitoreo"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Ver Centro de Facturas y Moras</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimasFacturas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
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
