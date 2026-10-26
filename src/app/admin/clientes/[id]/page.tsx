"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  Receipt,
  FileText,
  RefreshCw,
  Coins,
  Package,
  Layers,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";

interface DetalleProducto {
  id: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esServicioLibre: boolean;
  descripcionLibre?: string | null;
  producto?: {
    codigo: string;
    nombre: string;
    tipo: string;
    talla?: string | null;
    color?: string | null;
  } | null;
}

interface AbonoItem {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  referenciaComprobante?: string | null;
  cajero?: {
    nombre: string;
  } | null;
}

interface FacturaCliente {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  fechaEntregaAlquiler?: string | null;
  fechaDevolucionPactada?: string | null;
  fechaDevolucionReal?: string | null;
  tipoOperacion: string;
  estado: string;
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
  estaCerrada: boolean;
  prendaSinEntregar: boolean;
  detalles: DetalleProducto[];
  abonos: AbonoItem[];
}

interface PrendaEnPoder {
  facturaId: string;
  numeroFactura: string;
  prenda: string;
  codigo?: string;
  fechaEntrega?: string | null;
  fechaDevolucionPactada?: string | null;
  enMora: boolean;
  diasRetraso: number;
}

interface MetricasCliente {
  totalFacturas: number;
  totalFacturado: number;
  totalAbonado: number;
  saldoTotalPendiente: number;
  totalMoraVigente: number;
  prendasAlquiladasActivas: number;
}

interface DatosPerfilCliente {
  id: string;
  documento: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  notas?: string | null;
  fechaCreacion: string;
  updatedAt: string;
}

export default function PerfilClientePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;

  const [cliente, setCliente] = useState<DatosPerfilCliente | null>(null);
  const [metricas, setMetricas] = useState<MetricasCliente | null>(null);
  const [prendasEnPoder, setPrendasEnPoder] = useState<PrendaEnPoder[]>([]);
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-filtro de facturas dentro del perfil
  const [filtroFacturas, setFiltroFacturas] = useState<"TODAS" | "CON_SALDO" | "ALQUILERES_ACTIVOS" | "CERRADAS">("TODAS");

  // Modal de liquidación
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // Modal de reimpresión de comprobante y PDF
  const [datosImpresionModal, setDatosImpresionModal] = useState<DatosImpresionFactura | null>(null);
  const [modalImpresionAbierto, setModalImpresionAbierto] = useState(false);
  const [cargandoPdfId, setCargandoPdfId] = useState<string | null>(null);

  const cargarDatosCliente = useCallback(async () => {
    if (!clienteId) return;
    try {
      setCargando(true);
      setError(null);
      const res = await fetch(`/api/clientes/${clienteId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar la información del cliente");
      }

      setCliente(data.cliente);
      setMetricas(data.metricas);
      setPrendasEnPoder(data.prendasEnPoderCliente || []);
      setFacturas(data.facturas || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de conexión al obtener el perfil del cliente");
      }
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargarDatosCliente();
  }, [cargarDatosCliente]);

  const facturasFiltradas = useMemo(() => {
    if (filtroFacturas === "CON_SALDO") {
      return facturas.filter((f) => f.totalExigible > 0);
    }
    if (filtroFacturas === "ALQUILERES_ACTIVOS") {
      return facturas.filter((f) => !f.estaCerrada && (f.tipoOperacion === "ALQUILER" || f.tipoOperacion === "MIXTO"));
    }
    if (filtroFacturas === "CERRADAS") {
      return facturas.filter((f) => f.estaCerrada);
    }
    return facturas;
  }, [facturas, filtroFacturas]);

  const abrirImpresionFactura = async (id: string) => {
    try {
      setCargandoPdfId(id);
      const res = await fetch(`/api/impresion/${id}`);
      const data = await res.json();
      if (data.success && data.factura) {
        setDatosImpresionModal(data);
        setModalImpresionAbierto(true);
      } else {
        alert(data.error || "No fue posible cargar el comprobante para impresión.");
      }
    } catch (err) {
      console.error("Error al cargar documento para impresión:", err);
      alert("Error de conexión al generar comprobante.");
    } finally {
      setCargandoPdfId(null);
    }
  };

  if (cargando) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
        <p className="text-sm md:text-base font-semibold">Cargando perfil e historial del cliente...</p>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-base font-bold">{error || "Cliente no encontrado"}</p>
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Directorio de Clientes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Barra de Navegación Superior de Retorno */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Clientes</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/monitoreo"
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition shadow-xs"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Historial de Facturas y Moras</span>
          </Link>

          <Link
            href="/caja/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm font-bold transition shadow-sm shadow-blue-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Facturar en POS</span>
          </Link>
        </div>
      </div>

      {/* 2. Tarjeta de Perfil del Cliente */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center justify-center font-black text-lg">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {cliente.nombre}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  C.C. / NIT: {cliente.documento}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cliente registrado el {new Date(cliente.fechaCreacion).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Contacto Directo WhatsApp */}
          {cliente.telefono && (
            <div className="flex items-center gap-2">
              <BotonWhatsApp
                telefono={cliente.telefono}
                nombreCliente={cliente.nombre}
                nombrePrenda="Servicio de Alquiler / Compra"
                saldoPendiente={metricas?.saldoTotalPendiente || 0}
                tipoMensaje={(metricas?.saldoTotalPendiente || 0) > 0 ? "RECORDATORIO" : "RECORDATORIO"}
                mostrarTexto={true}
              />
            </div>
          )}
        </div>

        {/* Fila de Datos Secundarios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="font-semibold">Teléfono:</span>
            <span className="font-mono">{cliente.telefono || "No registrado"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="font-semibold">Dirección:</span>
            <span>{cliente.direccion || "No registrada"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="font-semibold">Notas:</span>
            <span className="truncate" title={cliente.notas || "Sin observaciones"}>
              {cliente.notas || "Sin observaciones"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Métricas Financieras del Cliente */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total Facturado
          </span>
          <p className="text-lg sm:text-xl font-mono font-black text-slate-900 mt-1">
            ${metricas?.totalFacturado.toLocaleString("es-CO") || 0}
          </p>
          <span className="text-xs text-slate-400 mt-0.5 block">{metricas?.totalFacturas || 0} factura(s)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
            Total Abonado
          </span>
          <p className="text-lg sm:text-xl font-mono font-black text-emerald-600 mt-1">
            ${metricas?.totalAbonado.toLocaleString("es-CO") || 0}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">Pagos confirmados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
            Saldo Exigible Hoy
          </span>
          <p className="text-lg sm:text-xl font-mono font-black text-rose-600 mt-1">
            ${metricas?.saldoTotalPendiente.toLocaleString("es-CO") || 0}
          </p>
          <span className="text-xs text-rose-600 font-semibold mt-0.5 block">
            {(metricas?.saldoTotalPendiente || 0) > 0 ? "Cuenta con saldo pendiente" : "Al día ($0)"}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
            Mora Acumulada
          </span>
          <p className="text-lg sm:text-xl font-mono font-black text-amber-600 mt-1">
            ${metricas?.totalMoraVigente.toLocaleString("es-CO") || 0}
          </p>
          <span className="text-xs text-amber-600 font-semibold mt-0.5 block">Penalizaciones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
            Prendas en Alquiler
          </span>
          <p className="text-lg sm:text-xl font-mono font-black text-blue-600 mt-1">
            {prendasEnPoder.length}
          </p>
          <span className="text-xs text-blue-600 font-semibold mt-0.5 block">Fuera de tienda</span>
        </div>
      </div>

      {/* 4. Prendas actualmente en poder del cliente (Alerta en Vivo si existen) */}
      {prendasEnPoder.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-black text-sm md:text-base">
            <Coins className="w-5 h-5 text-amber-600" />
            <span>Prendas de Alquiler actualmente en poder del Cliente ({prendasEnPoder.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prendasEnPoder.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl bg-white border ${
                  item.enMora ? "border-rose-300 ring-1 ring-rose-400" : "border-amber-200"
                } shadow-xs text-xs sm:text-sm`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-500 font-bold">Fac: {item.numeroFactura}</span>
                  {item.enMora ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                      Mora ({item.diasRetraso}d)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      Al día
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 mt-1">{item.prenda}</p>
                {item.fechaDevolucionPactada && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Devolución pactada: {new Date(item.fechaDevolucionPactada).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sección Central: "Historial de Facturas, Alquileres y Moras del Cliente" */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Historial de Facturas, Alquileres y Moras del Cliente
            </h2>
            <p className="text-xs text-slate-500">
              Registro inmutable de compras, alquileres, pagos parciales y liquidaciones efectuadas.
            </p>
          </div>

          {/* Filtros Internos Rápidos */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setFiltroFacturas("TODAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroFacturas === "TODAS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({facturas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroFacturas("CON_SALDO")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroFacturas === "CON_SALDO" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Con Saldo ({facturas.filter((f) => f.totalExigible > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroFacturas("ALQUILERES_ACTIVOS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroFacturas === "ALQUILERES_ACTIVOS" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Alquileres ({facturas.filter((f) => !f.estaCerrada && (f.tipoOperacion === "ALQUILER" || f.tipoOperacion === "MIXTO")).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroFacturas("CERRADAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroFacturas === "CERRADAS" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paz y Salvos ({facturas.filter((f) => f.estaCerrada).length})
            </button>
          </div>
        </div>

        {/* Listado de Facturas */}
        {facturasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm md:text-base font-semibold">No hay facturas en esta vista.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm md:text-base border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-3.5 py-3 text-center">Factura / Fecha</th>
                  <th className="px-3.5 py-3">Concepto / Artículos</th>
                  <th className="px-3.5 py-3 text-center">Devolución Pactada</th>
                  <th className="px-3.5 py-3 text-center">Estado</th>
                  <th className="px-3.5 py-3 text-right">Total Factura</th>
                  <th className="px-3.5 py-3 text-right">Abonado</th>
                  <th className="px-3.5 py-3 text-right">Saldo Exigible</th>
                  <th className="px-3.5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {facturasFiltradas.map((f) => {
                  const tieneMora = f.recargoMora > 0 || (f.enMora && f.diasRetraso > 0);

                  return (
                    <tr key={f.id} className={`hover:bg-slate-50/80 transition ${tieneMora ? "bg-rose-50/30" : ""}`}>
                      {/* 1. Factura / Fecha */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm block">
                          {f.numeroFactura}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(f.fechaCreacion).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>

                      {/* 2. Concepto / Artículos */}
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">{f.prendaPrincipal}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 mt-0.5">
                          {f.tipoOperacion}
                        </span>
                      </td>

                      {/* 3. Devolución Pactada */}
                      <td className="px-3.5 py-3 text-center">
                        {f.fechaDevolucionPactada ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700 block">
                              {new Date(f.fechaDevolucionPactada).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                            </span>
                            <span className="text-slate-500 font-mono text-xs">
                              {new Date(f.fechaDevolucionPactada).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">N/A</span>
                        )}
                      </td>

                      {/* 4. Estado */}
                      <td className="px-3.5 py-3 text-center">
                        {tieneMora ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Mora ({f.diasRetraso}d)</span>
                          </span>
                        ) : f.estaCerrada ? (
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

                      {/* 5. Total Factura */}
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        ${f.totalFactura.toLocaleString("es-CO")}
                      </td>

                      {/* 6. Total Abonado */}
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-emerald-700 text-xs sm:text-sm">
                        ${f.totalAbonado.toLocaleString("es-CO")}
                      </td>

                      {/* 7. Saldo Exigible */}
                      <td className="px-3.5 py-3 text-right">
                        <span
                          className={`font-mono font-black text-xs sm:text-sm md:text-base ${
                            f.totalExigible > 0 ? (tieneMora ? "text-rose-600" : "text-amber-600") : "text-emerald-600"
                          }`}
                        >
                          ${f.totalExigible.toLocaleString("es-CO")}
                        </span>
                        {f.recargoMora > 0 && (
                          <span className="text-xs text-rose-600 font-mono block">
                            (incluye +${f.recargoMora.toLocaleString("es-CO")} mora)
                          </span>
                        )}
                      </td>

                      {/* 8. Acciones */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {f.totalExigible > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFacturaSeleccionadaId(f.id);
                                setModalLiquidarAbierto(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                              title="Cobrar saldo pendiente y liquidar factura"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => abrirImpresionFactura(f.id)}
                            disabled={cargandoPdfId === f.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition"
                            title="Reimprimir o exportar PDF de la factura"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>{cargandoPdfId === f.id ? "..." : "PDF"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Liquidación */}
      <ModalLiquidarFactura
        facturaId={facturaSeleccionadaId}
        isOpen={modalLiquidarAbierto}
        onClose={() => {
          setModalLiquidarAbierto(false);
          setFacturaSeleccionadaId(null);
        }}
        onFacturaLiquidada={() => {
          cargarDatosCliente();
        }}
      />

      {/* Modal de Reimpresión Universal */}
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
