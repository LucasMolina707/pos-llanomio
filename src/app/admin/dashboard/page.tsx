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
  ClockAlert,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
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
        setMetodosPago(data.desgloseMetodos);
        setLineasNegocio(data.desgloseLineas);
        setUltimasFacturas(data.ultimasFacturas);
      }
    } catch (error) {
      console.error("Error al cargar métricas del dashboard:", error);
    } finally {
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

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
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    setFechaDesde(primerDia);
    setFechaHasta(now.toISOString().split("T")[0]);
  };

  const setRangoAnoActual = () => {
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
    metodosPago.totalTransferencia || 1;

  const totalLineas =
    lineasNegocio.alquileres + lineasNegocio.ventas + lineasNegocio.sastreria || 1;

  return (
    <div className="w-full space-y-6">
      {/* 1. Cabecera Gerencial & Filtro de Rango de Fechas */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Dashboard Gerencial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              Métricas Consolidadas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visualización en tiempo real de ingresos, cuentas por cobrar, moras y rendimiento comercial
          </p>
        </div>

        {/* Controles de Filtros Temporales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-blue-600 ml-1.5" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            />
            <span className="text-xs text-slate-400 font-bold">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={setRangoHoy}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setRango7Dias}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={setRangoEsteMes}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              Mes
            </button>
            <button
              type="button"
              onClick={setRangoAnoActual}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              Año
            </button>
          </div>

          <button
            type="button"
            onClick={cargarMetricas}
            disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-blue-600" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Cuadrícula de Métricas Principales en Grid Expandido (5 Columnas en Pantallas Grandes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
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
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {formatearDinero(metricas.ingresosNetos)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Total recaudado en el periodo
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
            <div className="text-2xl font-black tracking-tight text-amber-600">
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
            <div className="text-2xl font-black tracking-tight text-rose-600">
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
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {metricas.totalPrendasAlquiladas}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Trajes en posesión de clientes
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
            <div className="text-2xl font-black tracking-tight text-emerald-600">
              {formatearDinero(metricas.rendimientoSastreria)}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Arreglos y confección sin inventario
            </p>
          </div>
        </div>
      </div>

      {/* 3. Desgloses Comparativos en 2 Columnas Grandes */}
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

            {/* Transferencia */}
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

      {/* 4. Tabla de Últimas Facturas en Ancho Completo */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Últimas Facturas Emitidas
              </h2>
              <p className="text-xs text-slate-500">
                Actividad reciente de mostrador en el periodo seleccionado
              </p>
            </div>
          </div>

          <Link
            href="/admin/monitoreo"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Ver Monitoreo Completo</span>
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
                <th className="py-3 px-5 text-center">Fecha</th>
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
                    <td className="py-3 px-5 font-bold text-slate-900">
                      {fac.numeroFactura}
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{fac.clienteNombre}</span>
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
                    <td className="py-3 px-5 text-right font-bold text-slate-900">
                      {formatearDinero(fac.totalFactura)}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold text-emerald-600">
                      {formatearDinero(fac.totalAbonado)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-amber-600">
                      {formatearDinero(fac.saldoPendiente)}
                    </td>
                    <td className="py-3 px-5 text-center text-slate-500 font-medium">
                      {new Date(fac.fechaCreacion).toLocaleDateString("es-CO")}
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
