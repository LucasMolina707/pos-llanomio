"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  Calendar,
  User,
  ShoppingBag,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Layers,
  ChevronRight,
  AlertCircle,
  Scissors,
  DollarSign,
  X,
  FileText,
  CreditCard,
} from "lucide-react";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

interface DetalleItem {
  id: string;
  producto?: {
    nombre: string;
    codigo: string;
    tipo: string;
  } | null;
  esServicioLibre: boolean;
  descripcionLibre?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface FacturaMonitoreo {
  id: string;
  numeroFactura: string;
  cliente: {
    nombre: string;
    documento: string;
    telefono?: string | null;
    direccion?: string | null;
  };
  usuarioCajero: {
    nombre: string;
    username: string;
  };
  tipoOperacion: string;
  estado: "ACTIVA" | "EN_PROCESO" | "ACTIVA_ALQUILADA" | "EN_MORA" | "CERRADA";
  fechaCreacion: string;
  fechaDevolucionPactada?: string | null;
  fechaDevolucionReal?: string | null;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  recargoMoraCalculado: number;
  diasRetraso: number;
  horasRetraso: number;
  enMora: boolean;
  prendaPrincipal: string;
  detalles: DetalleItem[];
}

interface EstadisticasMonitoreo {
  totalFacturas: number;
  conteoActivas: number;
  conteoEnMora: number;
  conteoCerradas: number;
  totalCarteraMora: number;
  totalSaldoPendiente: number;
}

export default function CentralMonitoreoPage() {
  const [pestañaActiva, setPestañaActiva] = useState<"EN_MORA" | "ACTIVAS" | "CERRADAS" | "CON_SALDO" | "TODAS">("EN_MORA");
  const [busqueda, setBusqueda] = useState("");
  const [facturas, setFacturas] = useState<FacturaMonitoreo[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasMonitoreo>({
    totalFacturas: 0,
    conteoActivas: 0,
    conteoEnMora: 0,
    conteoCerradas: 0,
    totalCarteraMora: 0,
    totalSaldoPendiente: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control del modal de liquidación
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // Cargar facturas desde el endpoint
  const cargarFacturas = useCallback(async (sync = false) => {
    try {
      if (sync) setSincronizando(true);
      else setCargando(true);
      setError(null);

      const params = new URLSearchParams();
      if (pestañaActiva !== "TODAS" && pestañaActiva !== "CON_SALDO") {
        params.set("estado", pestañaActiva);
      }
      if (sync) {
        params.set("sync", "true");
      }

      const res = await fetch(`/api/facturas/monitoreo?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar facturas de monitoreo");
      }

      setFacturas(data.facturas || []);
      if (data.estadisticas) {
        setEstadisticas(data.estadisticas);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado al consultar el monitoreo de facturas");
      }
    } finally {
      setCargando(false);
      setSincronizando(false);
    }
  }, [pestañaActiva]);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  // Autofiltrado difuso en vivo
  const facturasFiltradas = useMemo(() => {
    let base = facturas;

    if (pestañaActiva === "CON_SALDO") {
      base = base.filter((f) => f.saldoPendiente > 0);
    }

    return filtrarPorRelevancia(base, busqueda, (item) => ({
      primarios: [item.numeroFactura, item.cliente?.nombre, item.cliente?.documento],
      secundarios: [
        item.cliente?.telefono,
        item.cliente?.direccion,
        item.usuarioCajero?.nombre,
        item.prendaPrincipal,
        item.tipoOperacion,
        item.estado,
        String(item.saldoPendiente),
      ],
    }));
  }, [facturas, pestañaActiva, busqueda]);

  const abrirLiquidarFactura = (id: string) => {
    setFacturaSeleccionadaId(id);
    setModalLiquidarAbierto(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Central de Monitoreo & Control de Moras
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                Auditoría en Vivo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Seguimiento de fechas pactadas de devolución, recargos acumulados y contacto CRM por WhatsApp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => cargarFacturas(true)}
            disabled={sincronizando || cargando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${sincronizando ? "animate-spin" : ""}`} />
            <span>{sincronizando ? "Recalculando..." : "Recalcular Moras"}</span>
          </button>
          <Link
            href="/caja/pos"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Receipt className="w-4 h-4" />
            <span>Ir a Facturar POS</span>
          </Link>
        </div>
      </header>

        {/* Tarjetas de Métricas de Cartera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Cartera en Mora
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
              ${estadisticas.totalCarteraMora.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {estadisticas.conteoEnMora} factura(s) con retraso en devolución
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saldo Pendiente Total
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              ${estadisticas.totalSaldoPendiente.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pendiente por recaudar en mostrador
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Alquileres / Activas
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {estadisticas.conteoActivas}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dentro de la fecha pactada de entrega
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Cerradas / Liquidadas
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {estadisticas.conteoCerradas}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Devueltas y saldadas al 100%
            </p>
          </div>
        </div>

        {/* Pestañas de Estado y Buscador */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Pestañas de Filtro Rápido */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setPestañaActiva("EN_MORA")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  pestañaActiva === "EN_MORA"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>En Mora</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {estadisticas.conteoEnMora}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva("CON_SALDO")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  pestañaActiva === "CON_SALDO"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Con Saldo Pendiente</span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva("ACTIVAS")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  pestañaActiva === "ACTIVAS"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Activas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {estadisticas.conteoActivas}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva("CERRADAS")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  pestañaActiva === "CERRADAS"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cerradas / Pagadas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {estadisticas.conteoCerradas}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva("TODAS")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  pestañaActiva === "TODAS"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Todas ({estadisticas.totalFacturas})</span>
              </button>
            </div>

            {/* Buscador Dinámico Difuso */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Fuzzy: cliente, cédula, teléfono, N° factura..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap hidden lg:inline">
                {facturasFiltradas.length} coincidencia(s)
              </span>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tabla de Facturas */}
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500" />
                <p className="text-xs font-semibold">Calculando estado de moras y consultando facturas...</p>
              </div>
            ) : facturasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No hay facturas en esta categoría o búsqueda
                </p>
                <p className="text-xs text-slate-400">
                  No se encontraron registros que coincidan con los filtros actuales.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Factura / Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-3 py-3">Prenda Principal</th>
                    <th className="px-3 py-3 text-center">Fecha Pactada</th>
                    <th className="px-3 py-3 text-center">Retraso</th>
                    <th className="px-3 py-3 text-right">Recargo Mora</th>
                    <th className="px-3 py-3 text-right">Saldo Actual</th>
                    <th className="px-4 py-3 text-center">Cobrar / Liquidar</th>
                    <th className="px-4 py-3 text-center">CRM WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {facturasFiltradas.map((f) => {
                    const esMora = f.enMora || f.estado === "EN_MORA";

                    return (
                      <tr
                        key={f.id}
                        className={`transition ${
                          esMora
                            ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        {/* 1. Factura y Fecha */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                esMora
                                  ? "bg-rose-500 ring-4 ring-rose-200 dark:ring-rose-900/50"
                                  : f.estado === "CERRADA"
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white font-mono">
                                {f.numeroFactura}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(f.fechaCreacion).toLocaleDateString("es-CO")}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Cliente */}
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {f.cliente?.nombre}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            C.C: {f.cliente?.documento}{" "}
                            {f.cliente?.telefono && `| Tel: ${f.cliente.telefono}`}
                          </p>
                        </td>

                        {/* 3. Prenda */}
                        <td className="px-3 py-3.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                            {f.prendaPrincipal}
                          </p>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {f.tipoOperacion}
                          </span>
                        </td>

                        {/* 4. Fecha Pactada */}
                        <td className="px-3 py-3.5 text-center">
                          {f.fechaDevolucionPactada ? (
                            <div>
                              <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                {new Date(f.fechaDevolucionPactada).toLocaleDateString("es-CO")}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(f.fechaDevolucionPactada).toLocaleTimeString("es-CO", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </td>

                        {/* 5. Retraso */}
                        <td className="px-3 py-3.5 text-center">
                          {esMora ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              {f.diasRetraso} {f.diasRetraso === 1 ? "día" : "días"}
                            </span>
                          ) : f.estado === "CERRADA" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                              Devuelto
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
                              A tiempo
                            </span>
                          )}
                        </td>

                        {/* 6. Recargo Mora */}
                        <td className="px-3 py-3.5 text-right">
                          {f.recargoMoraCalculado > 0 ? (
                            <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                              +${f.recargoMoraCalculado.toLocaleString("es-CO")}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">$0</span>
                          )}
                        </td>

                        {/* 7. Saldo Actual */}
                        <td className="px-3 py-3.5 text-right">
                          <p
                            className={`font-mono font-extrabold text-sm ${
                              f.saldoPendiente > 0
                                ? esMora
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            ${f.saldoPendiente.toLocaleString("es-CO")}
                          </p>
                          {f.totalAbonado > 0 && (
                            <span className="text-[10px] text-slate-400 block">
                              Abonado: ${f.totalAbonado.toLocaleString("es-CO")}
                            </span>
                          )}
                        </td>

                        {/* 8. Botón Liquidar / Cobrar Pago */}
                        <td className="px-4 py-3.5 text-center">
                          {f.saldoPendiente > 0 ? (
                            <button
                              type="button"
                              onClick={() => abrirLiquidarFactura(f.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                              title="Registrar pago o liquidar saldo restante"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Cobrar Saldo</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirLiquidarFactura(f.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                              title="Ver comprobante de pago o historial de abonos"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ver Paz y Salvo</span>
                            </button>
                          )}
                        </td>

                        {/* 9. Botón WhatsApp CRM */}
                        <td className="px-4 py-3.5 text-center">
                          <BotonWhatsApp
                            telefono={f.cliente?.telefono}
                            nombreCliente={f.cliente?.nombre || "Estimado(a) Cliente"}
                            nombrePrenda={f.prendaPrincipal}
                            diasRetraso={f.diasRetraso}
                            horasRetraso={f.horasRetraso}
                            saldoPendiente={f.saldoPendiente}
                            tipoMensaje={esMora ? "MORA" : "RECORDATORIO"}
                            numeroFactura={f.numeroFactura}
                            mostrarTexto={false}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal de Liquidación de Saldo y Emisión de Paz y Salvo */}
        <ModalLiquidarFactura
          facturaId={facturaSeleccionadaId}
          isOpen={modalLiquidarAbierto}
          onClose={() => {
            setModalLiquidarAbierto(false);
            setFacturaSeleccionadaId(null);
          }}
          onFacturaLiquidada={() => {
            cargarFacturas(false);
          }}
        />
      </div>
  );
}
