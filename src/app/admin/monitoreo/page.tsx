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
  Receipt,
  Layers,
  ChevronRight,
  AlertCircle,
  Scissors,
  DollarSign,
  X,
  FileText,
  CreditCard,
  Printer,
  Coins,
  History,
  PhoneCall,
} from "lucide-react";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

export type PestanaHistorial = "PENDIENTES_AL_DIA" | "MORA_Y_SALDO" | "SOLO_MORA" | "PAZ_Y_SALVOS";

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
    id: string;
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
  saldoBase: number;
  recargoMora: number;
  totalExigible: number;
  diasRetraso: number;
  horasRetraso: number;
  enMora: boolean;
  prendaPrincipal: string;
  detalles: DetalleItem[];
  esPendienteAlDia?: boolean;
  esMoraYSaldo?: boolean;
  esSoloMora?: boolean;
  esPazYSalvo?: boolean;
}

interface EstadisticasMonitoreo {
  totalFacturas: number;
  conteoPendientesAlDia: number;
  conteoMoraYSaldo: number;
  conteoSoloMora: number;
  conteoPazYSalvos: number;
  totalCarteraMora: number;
  totalSaldoPendiente: number;
  totalAlertas: number;
  totalEnMora: number;
}

export default function CentralMonitoreoPage() {
  const [pestanaActiva, setPestanaActiva] = useState<PestanaHistorial>("PENDIENTES_AL_DIA");
  const [busqueda, setBusqueda] = useState("");
  const [facturas, setFacturas] = useState<FacturaMonitoreo[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasMonitoreo>({
    totalFacturas: 0,
    conteoPendientesAlDia: 0,
    conteoMoraYSaldo: 0,
    conteoSoloMora: 0,
    conteoPazYSalvos: 0,
    totalCarteraMora: 0,
    totalSaldoPendiente: 0,
    totalAlertas: 0,
    totalEnMora: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control del modal de liquidación
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // Control del modal de reimpresión de comprobante y PDF
  const [datosImpresionModal, setDatosImpresionModal] = useState<DatosImpresionFactura | null>(null);
  const [modalImpresionAbierto, setModalImpresionAbierto] = useState(false);
  const [cargandoImpresionId, setCargandoImpresionId] = useState<string | null>(null);

  // Cargar facturas desde el endpoint
  const cargarFacturas = useCallback(async (sync = false) => {
    try {
      if (sync) setSincronizando(true);
      else setCargando(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("pestana", pestanaActiva);
      if (sync) {
        params.set("sync", "true");
      }

      const res = await fetch(`/api/facturas/monitoreo?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar facturas de historial y monitoreo");
      }

      setFacturas(data.facturas || []);
      if (data.estadisticas) {
        setEstadisticas(data.estadisticas);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado al consultar el historial de facturas");
      }
    } finally {
      setCargando(false);
      setSincronizando(false);
    }
  }, [pestanaActiva]);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  // Autofiltrado difuso en vivo
  const facturasFiltradas = useMemo(() => {
    return filtrarPorRelevancia(facturas, busqueda, (item) => ({
      primarios: [item.numeroFactura, item.cliente?.nombre, item.cliente?.documento],
      secundarios: [
        item.cliente?.telefono,
        item.cliente?.direccion,
        item.usuarioCajero?.nombre,
        item.prendaPrincipal,
        item.tipoOperacion,
        item.estado,
        String(item.totalExigible),
        String(item.saldoPendiente),
      ],
    }));
  }, [facturas, busqueda]);

  const abrirLiquidarFactura = (id: string) => {
    setFacturaSeleccionadaId(id);
    setModalLiquidarAbierto(true);
  };

  const abrirImpresionFactura = async (id: string) => {
    try {
      setCargandoImpresionId(id);
      const res = await fetch(`/api/impresion/${id}`);
      const data = await res.json();
      if (data.success && data.factura) {
        setDatosImpresionModal(data);
        setModalImpresionAbierto(true);
      } else {
        alert(data.error || "No fue posible cargar los datos de impresión de la factura.");
      }
    } catch (err) {
      console.error("Error al cargar datos de impresión:", err);
      alert("Error de conexión al cargar la factura para impresión.");
    } finally {
      setCargandoImpresionId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Historial de Facturas y Moras
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Centro de Gestión y Cartera
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Seguimiento centralizado de facturas pendientes, cobro de moras, prendas en alquiler y reimpresión de Paz y Salvos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => cargarFacturas(true)}
            disabled={sincronizando || cargando}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition disabled:opacity-50"
            title="Recalcular moras acumuladas y sincronizar estados en caliente"
          >
            <RefreshCw className={`w-4 h-4 text-amber-600 ${sincronizando ? "animate-spin" : ""}`} />
            <span>{sincronizando ? "Sincronizando..." : "Sincronizar Moras"}</span>
          </button>

          <Link
            href="/caja/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
            title="Abrir Terminal de Facturación POS en nueva ventana"
          >
            <Receipt className="w-4 h-4" />
            <span>Terminal POS (Nueva Ventana)</span>
          </Link>
        </div>
      </header>

      {/* 4 Tarjetas de Métricas de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Pendientes al Día */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Pendientes al Día
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
            {estadisticas.conteoPendientesAlDia}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Facturas con saldo dentro del plazo pactado
          </p>
        </div>

        {/* Tarjeta 2: Con Mora y Saldo */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Con Mora y Saldo
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 font-mono">
            ${estadisticas.totalCarteraMora.toLocaleString("es-CO")}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {estadisticas.conteoMoraYSaldo} factura(s) vencidas con saldo impago
          </p>
        </div>

        {/* Tarjeta 3: Solo Mora / Prenda Retenida */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Prendas Retenidas
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 font-mono">
            {estadisticas.conteoSoloMora}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Pagadas pero con prenda fuera de inventario
          </p>
        </div>

        {/* Tarjeta 4: Paz y Salvos */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Paz y Salvos
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 font-mono">
            {estadisticas.conteoPazYSalvos}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Facturas cerradas y prendas devueltas
          </p>
        </div>
      </div>

      {/* Contenedor Principal: 4 Pestañas y Buscador */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-4">
        {/* Barra de 4 Pestañas Estandarizadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Pestaña 1: Pendientes por Pagar (Al Día) */}
          <button
            type="button"
            onClick={() => setPestanaActiva("PENDIENTES_AL_DIA")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[48px] ${
              pestanaActiva === "PENDIENTES_AL_DIA"
                ? "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>1. Pendientes al Día</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                pestanaActiva === "PENDIENTES_AL_DIA"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {estadisticas.conteoPendientesAlDia}
            </span>
          </button>

          {/* Pestaña 2: Con Mora y Saldo Pendiente */}
          <button
            type="button"
            onClick={() => setPestanaActiva("MORA_Y_SALDO")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[48px] ${
              pestanaActiva === "MORA_Y_SALDO"
                ? "bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-600/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>2. Con Mora y Saldo</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                estadisticas.conteoMoraYSaldo > 0
                  ? "bg-rose-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {estadisticas.conteoMoraYSaldo}
            </span>
          </button>

          {/* Pestaña 3: Solo en Mora (Prenda Retenida) */}
          <button
            type="button"
            onClick={() => setPestanaActiva("SOLO_MORA")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[48px] ${
              pestanaActiva === "SOLO_MORA"
                ? "bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-600/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
              <span>3. Prendas en Mora</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                estadisticas.conteoSoloMora > 0
                  ? "bg-amber-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {estadisticas.conteoSoloMora}
            </span>
          </button>

          {/* Pestaña 4: Paz y Salvos / Historial Cerrado */}
          <button
            type="button"
            onClick={() => setPestanaActiva("PAZ_Y_SALVOS")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[48px] ${
              pestanaActiva === "PAZ_Y_SALVOS"
                ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>4. Paz y Salvos</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                pestanaActiva === "PAZ_Y_SALVOS"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {estadisticas.conteoPazYSalvos}
            </span>
          </button>
        </div>

        {/* Buscador Difuso */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Fuzzy: Factura, Cliente, Documento, Prenda, Teléfono o Saldo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-500 shrink-0">
            {facturasFiltradas.length} factura(s) encontrada(s)
          </span>
        </div>

        {/* Tabla de Facturas */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {cargando ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-sm md:text-base font-semibold">Cargando facturas de historial...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 bg-rose-50 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-7 h-7" />
              <p className="text-sm md:text-base font-bold">{error}</p>
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm md:text-base font-bold text-slate-800">
                No hay facturas en esta categoría
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Todas las cuentas están cuadradas o no coinciden con los términos de búsqueda.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm md:text-base border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-3.5 py-3 text-center">Factura / Fecha</th>
                  <th className="px-3.5 py-3">Cliente</th>
                  <th className="px-3.5 py-3">Concepto / Prenda</th>
                  <th className="px-3.5 py-3 text-center">Devolución</th>
                  <th className="px-3.5 py-3 text-center">Retraso / Estado</th>
                  <th className="px-3.5 py-3 text-right">Saldo Base</th>
                  <th className="px-3.5 py-3 text-right">Recargo Mora</th>
                  <th className="px-3.5 py-3 text-right">Total Exigible</th>
                  <th className="px-3.5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {facturasFiltradas.map((f) => {
                  const tieneMora = f.recargoMora > 0 || (f.enMora && f.diasRetraso > 0);
                  const esPazYSalvo = f.estado === "CERRADA" || (f.saldoPendiente === 0 && f.recargoMora === 0);

                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-slate-50/80 transition ${
                        tieneMora ? "bg-rose-50/30" : ""
                      }`}
                    >
                      {/* 1. Factura / Fecha */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm block">
                          {f.numeroFactura}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(f.fechaCreacion).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* 2. Cliente con enlace a su perfil */}
                      <td className="px-3.5 py-3">
                        <Link
                          href={`/admin/clientes/${f.cliente?.id || ""}`}
                          className="font-bold text-blue-700 hover:text-blue-900 hover:underline block leading-tight text-xs sm:text-sm"
                          title="Ver perfil completo e historial del cliente"
                        >
                          {f.cliente?.nombre || "Consumidor Final"}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>CC: {f.cliente?.documento || "N/A"}</span>
                          {f.cliente?.telefono && (
                            <span className="font-mono font-medium text-slate-700">
                              Tel: {f.cliente.telefono}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Concepto / Prenda */}
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[200px]" title={f.prendaPrincipal}>
                          {f.prendaPrincipal}
                        </p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {f.tipoOperacion}
                        </span>
                      </td>

                      {/* 4. Fecha Devolución */}
                      <td className="px-3.5 py-3 text-center">
                        {f.fechaDevolucionPactada ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700 block">
                              {new Date(f.fechaDevolucionPactada).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                            <span className="text-slate-500 font-mono text-xs">
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

                      {/* 5. Retraso / Estado */}
                      <td className="px-3.5 py-3 text-center">
                        {tieneMora ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{f.diasRetraso}d mora</span>
                          </span>
                        ) : esPazYSalvo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paz y Salvo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Al Día</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Saldo Base */}
                      <td className="px-3.5 py-3 text-right">
                        <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                          ${f.saldoBase.toLocaleString("es-CO")}
                        </span>
                        {f.totalAbonado > 0 && (
                          <span className="text-xs text-slate-500 block font-mono">
                            Abonó: ${f.totalAbonado.toLocaleString("es-CO")}
                          </span>
                        )}
                      </td>

                      {/* 7. Recargo Mora */}
                      <td className="px-3.5 py-3 text-right">
                        {f.recargoMora > 0 ? (
                          <span className="font-mono font-black text-rose-600 text-xs sm:text-sm">
                            +${f.recargoMora.toLocaleString("es-CO")}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">$0</span>
                        )}
                      </td>

                      {/* 8. Total Exigible */}
                      <td className="px-3.5 py-3 text-right">
                        <span
                          className={`font-mono font-black text-sm md:text-base ${
                            f.totalExigible > 0
                              ? tieneMora
                                ? "text-rose-600"
                                : "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ${f.totalExigible.toLocaleString("es-CO")}
                        </span>
                      </td>

                      {/* 9. Botones de Acción */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Botón Cobrar Saldo / Recibir Prenda */}
                          {f.totalExigible > 0 && (
                            <button
                              type="button"
                              onClick={() => abrirLiquidarFactura(f.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                              title="Cobrar saldo pendiente y liquidar mora"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}

                          {/* Botón Reimprimir / Ver Comprobante PDF */}
                          <button
                            type="button"
                            onClick={() => abrirImpresionFactura(f.id)}
                            disabled={cargandoImpresionId === f.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition"
                            title="Reimprimir o exportar PDF en Tirilla, Media Carta o Carta"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>{cargandoImpresionId === f.id ? "..." : "PDF"}</span>
                          </button>

                          {/* Botón WhatsApp CRM */}
                          <BotonWhatsApp
                            telefono={f.cliente?.telefono}
                            nombreCliente={f.cliente?.nombre || "Estimado(a) Cliente"}
                            nombrePrenda={f.prendaPrincipal}
                            diasRetraso={f.diasRetraso}
                            horasRetraso={f.horasRetraso}
                            saldoPendiente={f.totalExigible}
                            tipoMensaje={
                              f.esSoloMora
                                ? "SOLO_MORA_ENTREGA"
                                : tieneMora
                                ? "MORA"
                                : "RECORDATORIO"
                            }
                            numeroFactura={f.numeroFactura}
                            mostrarTexto={false}
                          />
                        </div>
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

      {/* Modal de Reimpresión Universal (Tirilla 80mm, Media Carta, Carta) */}
      {modalImpresionAbierto && datosImpresionModal && (
        <PlantillaImpresion
          datos={datosImpresionModal}
          onCerrar={() => {
            setModalImpresionAbierto(false);
            setDatosImpresionModal(null);
          }}
        />
      )}
    </div>
  );
}
