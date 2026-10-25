"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

interface MetricasData {
  ingresosNetos: number;
  cuentasPorCobrar: number;
  morasRecaudadas: number;
  totalPrendasAlquiladas: number;
  rendimientoSastreria: number;
  totalFacturas: number;
}

interface DesgloseMetodosPago {
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalTransferencia: number;
}

interface DesgloseLineasNegocio {
  alquileres: number;
  ventas: number;
  sastreria: number;
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
  // Fechas por defecto: últimos 30 días
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [metricas, setMetricas] = useState<MetricasData>({
    ingresosNetos: 0,
    cuentasPorCobrar: 0,
    morasRecaudadas: 0,
    totalPrendasAlquiladas: 0,
    rendimientoSastreria: 0,
    totalFacturas: 0,
  });

  const [metodosPago, setMetodosPago] = useState<DesgloseMetodosPago>({
    totalEfectivo: 0,
    totalNequi: 0,
    totalDaviplata: 0,
    totalTransferencia: 0,
  });

  const [lineasNegocio, setLineasNegocio] = useState<DesgloseLineasNegocio>({
    alquileres: 0,
    ventas: 0,
    sastreria: 0,
  });

  const [ultimasFacturas, setUltimasFacturas] = useState<UltimaFactura[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarMetricas = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch(`/api/admin/dashboard?desde=${fechaDesde}&hasta=${fechaHasta}`);
      const data = await res.json();
      if (data.success) {
        setMetricas(data.metricas);
        setMetodosPago(data.desgloseMetodosPago);
        setLineasNegocio(data.desgloseLineasNegocio);
        setUltimasFacturas(data.ultimasFacturas || []);
      }
    } catch (err) {
      console.error("Error al cargar métricas del dashboard:", err);
    } finally {
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  // Atajos rápidos de fechas
  const setRangoHoy = () => {
    const hoy = new Date().toISOString().split("T")[0];
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };

  const setRango7Dias = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFechaDesde(d.toISOString().split("T")[0]);
    setFechaHasta(new Date().toISOString().split("T")[0]);
  };

  const setRangoEsteMes = () => {
    const now = new Date();
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    setFechaDesde(primerDia);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  const setRangoAnoActual = () => {
    const now = new Date();
    const primerDiaAno = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    setFechaDesde(primerDiaAno);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  // Cálculo porcentual para barras de progreso
  const totalPagos =
    metodosPago.totalEfectivo +
    metodosPago.totalNequi +
    metodosPago.totalDaviplata +
    metodosPago.totalTransferencia || 1;

  const totalLineas =
    lineasNegocio.alquileres + lineasNegocio.ventas + lineasNegocio.sastreria || 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera Principal */}
        <header className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Dashboard Gerencial LLANOMIO
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Inteligencia de Negocio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Métricas financieras consolidadas, rendimiento por líneas de negocio y cartera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={cargarMetricas}
              disabled={cargando}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
              <span>Actualizar Datos</span>
            </button>
            <Link
              href="/admin/caja"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 transition shadow-sm"
            >
              <Vault className="w-4 h-4" />
              <span>Control de Caja</span>
            </Link>
          </div>
        </header>

        {/* Barra de Filtro de Fechas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              Rango de Fecha:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              />
              <span className="text-xs text-slate-400 font-bold">hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          {/* Atajos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={setRangoHoy}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setRango7Dias}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              onClick={setRangoEsteMes}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={setRangoAnoActual}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Año Actual
            </button>
          </div>
        </div>

        {/* Cuadrícula de las 5 Tarjetas KPI Gerenciales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Ingresos Netos */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Ingresos Netos
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              ${metricas.ingresosNetos.toLocaleString("es-CO")}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total recaudado en el periodo</p>
          </div>

          {/* 2. Cuentas por Cobrar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Cuentas por Cobrar
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
              ${metricas.cuentasPorCobrar.toLocaleString("es-CO")}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Saldos pendientes de clientes</p>
          </div>

          {/* 3. Moras Recaudadas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Moras Generadas
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
              ${metricas.morasRecaudadas.toLocaleString("es-CO")}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Penalizaciones por retraso</p>
          </div>

          {/* 4. Total Prendas Alquiladas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Prendas Alquiladas
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {metricas.totalPrendasAlquiladas}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Trajes entregados en alquiler</p>
          </div>

          {/* 5. Rendimiento de Sastrería Libre */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Sastrería Libre
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Scissors className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
              ${metricas.rendimientoSastreria.toLocaleString("es-CO")}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Ingresos por arreglos libres</p>
          </div>
        </div>

        {/* Paneles de Desglose Comparativo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Desglose por Método de Pago */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                Ingresos por Método de Pago
              </h2>
              <span className="text-xs font-mono font-bold text-slate-500">
                ${metricas.ingresosNetos.toLocaleString("es-CO")}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Efectivo */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Banknote className="w-3.5 h-3.5 text-amber-500" />
                    Efectivo
                  </span>
                  <span className="font-mono">
                    ${metodosPago.totalEfectivo.toLocaleString("es-CO")} (
                    {Math.round((metodosPago.totalEfectivo / totalPagos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full"
                    style={{ width: `${(metodosPago.totalEfectivo / totalPagos) * 100}%` }}
                  />
                </div>
              </div>

              {/* Nequi */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Smartphone className="w-3.5 h-3.5 text-fuchsia-500" />
                    Nequi
                  </span>
                  <span className="font-mono">
                    ${metodosPago.totalNequi.toLocaleString("es-CO")} (
                    {Math.round((metodosPago.totalNequi / totalPagos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-fuchsia-600 h-2.5 rounded-full"
                    style={{ width: `${(metodosPago.totalNequi / totalPagos) * 100}%` }}
                  />
                </div>
              </div>

              {/* Daviplata */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Smartphone className="w-3.5 h-3.5 text-red-500" />
                    Daviplata
                  </span>
                  <span className="font-mono">
                    ${metodosPago.totalDaviplata.toLocaleString("es-CO")} (
                    {Math.round((metodosPago.totalDaviplata / totalPagos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-600 h-2.5 rounded-full"
                    style={{ width: `${(metodosPago.totalDaviplata / totalPagos) * 100}%` }}
                  />
                </div>
              </div>

              {/* Transferencia */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    Transferencia Bancaria
                  </span>
                  <span className="font-mono">
                    ${metodosPago.totalTransferencia.toLocaleString("es-CO")} (
                    {Math.round((metodosPago.totalTransferencia / totalPagos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(metodosPago.totalTransferencia / totalPagos) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por Línea de Negocio */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Rendimiento por Línea de Negocio
              </h2>
              <span className="text-xs text-slate-400">{metricas.totalFacturas} facturas</span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Alquileres */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">
                    Alquiler de Trajes y Disfraces
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {metricas.totalPrendasAlquiladas} prendas prestadas
                  </p>
                </div>
                <span className="text-base font-black font-mono text-blue-700 dark:text-blue-300">
                  ${lineasNegocio.alquileres.toLocaleString("es-CO")}
                </span>
              </div>

              {/* Venta Directa */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Venta Directa de Catálogo
                  </p>
                  <p className="text-[11px] text-slate-500">Artículos comerciales y accesorios</p>
                </div>
                <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                  ${lineasNegocio.ventas.toLocaleString("es-CO")}
                </span>
              </div>

              {/* Sastrería Libre */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase">
                    Sastrería y Confección Libre
                  </p>
                  <p className="text-[11px] text-slate-500">Ajustes, dobladillos y arreglos</p>
                </div>
                <span className="text-base font-black font-mono text-purple-700 dark:text-purple-300">
                  ${lineasNegocio.sastreria.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Últimas Facturas del Periodo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Últimas Facturas Emitidas en el Periodo
            </h2>
            <Link
              href="/admin/monitoreo"
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Monitoreo Completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {ultimasFacturas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No se emitieron facturas en el rango de fechas seleccionado.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Factura</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5">Operación</th>
                    <th className="px-3 py-2.5 text-center">Estado</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Abonado</th>
                    <th className="px-3 py-2.5 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ultimasFacturas.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {f.numeroFactura}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {f.clienteNombre}
                      </td>
                      <td className="px-3 py-3 uppercase text-[11px] font-bold text-slate-500">
                        {f.tipoOperacion}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            f.estado === "CERRADA"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : f.estado === "EN_MORA"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${f.totalFactura.toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${f.totalAbonado.toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        ${f.saldoPendiente.toLocaleString("es-CO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
