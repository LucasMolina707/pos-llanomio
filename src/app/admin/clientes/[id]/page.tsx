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
  ShieldCheck,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import ModalConfigurarCredito from "@/components/cartera/ModalConfigurarCredito";
import ModalAbonarCartera from "@/components/cartera/ModalAbonarCartera";

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
  montoDeposito?: number;
  estadoDeposito?: string;
  montoRetenidoDeposito?: number;
  montoDevueltoDeposito?: number;
  motivoRetencionDeposito?: string | null;
  metodoPagoDeposito?: string | null;
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

interface MovimientoCarteraItem {
  id: string;
  fecha: string;
  tipoMovimiento: string;
  monto: number;
  saldoAnterior: number;
  saldoNuevo: number;
  metodoPago?: string | null;
  referencia?: string | null;
  descripcion?: string | null;
  factura?: {
    id: string;
    numeroFactura: string;
    totalFactura: number;
    saldoPendiente: number;
    tipoOperacion: string;
    fechaCreacion: string;
  } | null;
}

interface MetricasCliente {
  totalFacturas: number;
  totalFacturado: number;
  totalAbonado: number;
  saldoTotalPendiente: number;
  saldoCartera?: number;
  cupoCredito?: number;
  cupoDisponible?: number;
  creditoHabilitado?: boolean;
  diasCredito?: number;
  totalMoraVigente: number;
  prendasAlquiladasActivas: number;
}

interface DatosPerfilCliente {
  id: string;
  documento: string;
  nombre: string;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  direccion?: string | null;
  notas?: string | null;
  creditoHabilitado?: boolean;
  cupoCredito?: number;
  diasCredito?: number;
  notasCredito?: string | null;
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

  // Pestaña principal: Historial vs Cartera
  const [pestanaActiva, setPestanaActiva] = useState<"HISTORIAL" | "CARTERA">("HISTORIAL");
  const [movimientosCartera, setMovimientosCartera] = useState<MovimientoCarteraItem[]>([]);
  const [cargandoCartera, setCargandoCartera] = useState(false);
  const [modalConfigurarCreditoAbierto, setModalConfigurarCreditoAbierto] = useState(false);
  const [modalAbonarCarteraAbierto, setModalAbonarCarteraAbierto] = useState(false);

  // Sub-filtro de facturas dentro del perfil
  const [filtroFacturas, setFiltroFacturas] = useState<"TODAS" | "CON_SALDO" | "ALQUILERES_ACTIVOS" | "CERRADAS">("TODAS");

  // Modal de liquidación
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // Modal de reimpresión de comprobante y PDF
  const [datosImpresionModal, setDatosImpresionModal] = useState<DatosImpresionFactura | null>(null);
  const [modalImpresionAbierto, setModalImpresionAbierto] = useState(false);
  const [cargandoPdfId, setCargandoPdfId] = useState<string | null>(null);

  const cargarCartera = useCallback(async () => {
    if (!clienteId) return;
    try {
      setCargandoCartera(true);
      const res = await fetch(`/api/clientes/${clienteId}/cartera`);
      const data = await res.json();
      if (data.success) {
        setMovimientosCartera(data.movimientos || []);
      }
    } catch (err) {
      console.error("Error al cargar cartera:", err);
    } finally {
      setCargandoCartera(false);
    }
  }, [clienteId]);

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
      cargarCartera();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de conexión al obtener el perfil del cliente");
      }
    } finally {
      setCargando(false);
    }
  }, [clienteId, cargarCartera]);

  useEffect(() => {
    cargarDatosCliente();
  }, [cargarDatosCliente]);

  const facturasFiltradas = useMemo(() => {
    if (filtroFacturas === "CON_SALDO") {
      return facturas.filter((f) => f.totalExigible > 0 && f.estado !== "ANULADA");
    }
    if (filtroFacturas === "ALQUILERES_ACTIVOS") {
      return facturas.filter((f) => !f.estaCerrada && f.estado !== "ANULADA" && (f.tipoOperacion === "ALQUILER" || f.tipoOperacion === "MIXTO"));
    }
    if (filtroFacturas === "CERRADAS") {
      return facturas.filter((f) => f.estaCerrada && f.estado !== "ANULADA");
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
          <div className="flex items-center gap-2 flex-wrap">
            {cliente.telefono && (
              <BotonWhatsApp
                telefono={cliente.telefono}
                nombreCliente={cliente.nombre}
                nombrePrenda="Servicio de Alquiler / Compra"
                saldoPendiente={metricas?.saldoTotalPendiente || 0}
                tipoMensaje={(metricas?.saldoTotalPendiente || 0) > 0 ? "RECORDATORIO" : "RECORDATORIO"}
                mostrarTexto={true}
              />
            )}
            {cliente.telefonoSecundario && (
              <BotonWhatsApp
                telefono={cliente.telefonoSecundario}
                nombreCliente={`${cliente.nombre} (2° Tel)`}
                nombrePrenda="Servicio de Alquiler / Compra"
                saldoPendiente={metricas?.saldoTotalPendiente || 0}
                tipoMensaje={(metricas?.saldoTotalPendiente || 0) > 0 ? "RECORDATORIO" : "RECORDATORIO"}
                mostrarTexto={true}
              />
            )}
          </div>
        </div>

        {/* Fila de Datos Secundarios */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">Tel. Primario:</span>
            <span className="font-mono font-semibold text-slate-800">{cliente.telefono || "No registrado"}</span>
            {cliente.telefono && (
              <span className="inline-flex items-center justify-center w-6 h-5 text-[10px] font-bold rounded-md shrink-0 bg-blue-50 text-blue-700 border border-blue-200">
                1°
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-semibold">Tel. Secundario:</span>
            <span className="font-mono font-semibold text-slate-800">{cliente.telefonoSecundario || "No registrado"}</span>
            {cliente.telefonoSecundario && (
              <span className="inline-flex items-center justify-center w-6 h-5 text-[10px] font-bold rounded-md shrink-0 bg-slate-100 text-slate-700 border border-slate-300">
                2°
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">Dirección:</span>
            <span>{cliente.direccion || "No registrada"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
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
            <span>Prendas Activas ({prendasEnPoder.length})</span>
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

      {/* 5. Selector de Pestañas: Historial vs Cartera */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setPestanaActiva("HISTORIAL")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            pestanaActiva === "HISTORIAL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historial ({facturas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva("CARTERA")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            pestanaActiva === "CARTERA"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cartera y Cupo ({movimientosCartera.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: HISTORIAL DE FACTURAS */}
      {pestanaActiva === "HISTORIAL" && (
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
                <tr className="bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-slate-300">
                  <th className="px-3.5 py-3 text-center">Folio / Fecha</th>
                  <th className="px-3.5 py-3 text-center">Tipo</th>
                  <th className="px-3.5 py-3">Prendas & Detalle</th>
                  <th className="px-3.5 py-3 text-right">Total</th>
                  <th className="px-3.5 py-3 text-right">Abonado</th>
                  <th className="px-3.5 py-3 text-right">Saldo</th>
                  <th className="px-3.5 py-3 text-center">Depósito</th>
                  <th className="px-3.5 py-3 text-center">Estado</th>
                  <th className="px-3.5 py-3 text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {facturasFiltradas.map((f) => {
                  const tieneMora = f.recargoMora > 0 || (f.enMora && f.diasRetraso > 0);
                  const esAlquiler = f.tipoOperacion === "ALQUILER" || f.tipoOperacion === "MIXTO";
                  const montoDep = f.montoDeposito || 0;

                  return (
                    <tr key={f.id} className={`hover:bg-slate-50/80 transition ${tieneMora ? "bg-rose-50/30" : ""}`}>
                      {/* 1. Folio / Fecha */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="font-mono font-black text-slate-900 text-xs sm:text-sm block">
                          #{f.numeroFactura}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {new Date(f.fechaCreacion).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>

                      {/* 2. Badge Tipo de Operación */}
                      <td className="px-3.5 py-3 text-center">
                        {f.tipoOperacion === "VENTA" && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            Venta
                          </span>
                        )}
                        {f.tipoOperacion === "ARREGLO" && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            Arreglo
                          </span>
                        )}
                        {f.tipoOperacion === "ALQUILER" && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">
                            Alquiler
                          </span>
                        )}
                        {f.tipoOperacion === "MIXTO" && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
                            Mixto
                          </span>
                        )}
                        {f.tipoOperacion !== "VENTA" && f.tipoOperacion !== "ARREGLO" && f.tipoOperacion !== "ALQUILER" && f.tipoOperacion !== "MIXTO" && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {f.tipoOperacion}
                          </span>
                        )}
                      </td>

                      {/* 3. Prendas & Detalle */}
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{f.prendaPrincipal}</p>
                        {Array.isArray(f.detalles) && f.detalles.length > 1 && (
                          <span className="text-xs text-slate-500">
                            +{f.detalles.length - 1} artículo(s) más
                          </span>
                        )}
                        {f.fechaDevolucionPactada && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Devolución: {new Date(f.fechaDevolucionPactada).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </td>

                      {/* 4. Total Factura */}
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        ${f.totalFactura.toLocaleString("es-CO")}
                      </td>

                      {/* 5. Total Abonado */}
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-emerald-700 text-xs sm:text-sm">
                        ${f.totalAbonado.toLocaleString("es-CO")}
                      </td>

                      {/* 6. Saldo Pendiente */}
                      <td className="px-3.5 py-3 text-right font-mono">
                        <span
                          className={`font-black text-xs sm:text-sm md:text-base ${
                            f.totalExigible > 0 ? (tieneMora ? "text-rose-600" : "text-amber-600") : "text-emerald-600"
                          }`}
                        >
                          ${f.totalExigible.toLocaleString("es-CO")}
                        </span>
                        {f.recargoMora > 0 && (
                          <span className="text-[11px] text-rose-600 font-bold block">
                            (+${f.recargoMora.toLocaleString("es-CO")} mora)
                          </span>
                        )}
                      </td>

                      {/* 7. Depósito en Garantía */}
                      <td className="px-3.5 py-3 text-center">
                        {esAlquiler && montoDep > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-xs text-slate-800 block">
                              ${montoDep.toLocaleString("es-CO")}
                            </span>
                            {f.estadoDeposito === "DEVUELTO_COMPLETO" && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Devuelto
                              </span>
                            )}
                            {f.estadoDeposito === "RETENIDO_PARCIAL" && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                Retenido Parcial
                              </span>
                            )}
                            {f.estadoDeposito === "RETENIDO_TOTAL" && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                Retenido Total
                              </span>
                            )}
                            {(!f.estadoDeposito || f.estadoDeposito === "RECIBIDO_EN_GARANTIA") && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                En Custodia
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">N/A</span>
                        )}
                      </td>

                      {/* 8. Estado de Factura */}
                      <td className="px-3.5 py-3 text-center">
                        {f.estado === "ANULADA" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-slate-200 text-slate-700 border border-slate-300">
                            <X className="w-3.5 h-3.5 text-slate-500" />
                            <span>Anulada</span>
                          </span>
                        ) : tieneMora ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-rose-600 text-white animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>En Mora</span>
                          </span>
                        ) : f.estaCerrada || f.estado === "CERRADA" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paz y Salvo</span>
                          </span>
                        ) : f.estado === "ACTIVA_ALQUILADA" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>En Alquiler</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Activa</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Acciones: Ver / Imprimir Comprobante */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {f.totalExigible > 0 && f.estado !== "ANULADA" && (
                            <button
                              type="button"
                              onClick={() => {
                                setFacturaSeleccionadaId(f.id);
                                setModalLiquidarAbierto(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                            title="Ver e imprimir comprobante en 80mm, Media Carta o Carta"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{cargandoPdfId === f.id ? "Cargando..." : "Comprobante"}</span>
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
      )}

      {/* PESTAÑA 2: CARTERA Y CRÉDITOS */}
      {pestanaActiva === "CARTERA" && (
        <div className="space-y-4">
          {/* Panel de Resumen de Cartera y Cupo */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Cartera y Cupo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Control financiero de cupo disponible, amortizaciones y cuentas por cobrar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalConfigurarCreditoAbierto(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Ajustar Cupo</span>
                </button>

                <button
                  type="button"
                  disabled={(metricas?.saldoTotalPendiente || 0) <= 0}
                  onClick={() => setModalAbonarCarteraAbierto(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Abonar Deuda</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Cartera */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                  Crédito Activo
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      cliente?.creditoHabilitado ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                  <span className="text-sm font-black text-slate-900">
                    {cliente?.creditoHabilitado ? "Habilitado" : "Inactivo"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Plazo de pago: {cliente?.diasCredito || 30} días
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-600 block">
                  Cupo Autorizado
                </span>
                <span className="font-mono text-lg sm:text-xl font-black text-blue-900 mt-1 block tabular-nums">
                  ${(cliente?.cupoCredito || 0).toLocaleString("es-CO")}
                </span>
                <span className="text-[11px] text-blue-600 mt-0.5 block">Límite financiero</span>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-600 block">
                  Deuda Total:
                </span>
                <span className="font-mono text-lg sm:text-xl font-black text-rose-700 mt-1 block tabular-nums">
                  ${(metricas?.saldoTotalPendiente || 0).toLocaleString("es-CO")}
                </span>
                <span className="text-[11px] text-rose-600 mt-0.5 block">Por cobrar</span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Disponible:
                </span>
                <span className="font-mono text-lg sm:text-xl font-black text-emerald-700 mt-1 block tabular-nums">
                  ${Math.max(0, (cliente?.cupoCredito || 0) - (metricas?.saldoTotalPendiente || 0)).toLocaleString("es-CO")}
                </span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">Margen para compras</span>
              </div>
            </div>

            {cliente?.notasCredito && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Condiciones de Crédito: </span>
                {cliente.notasCredito}
              </div>
            )}
          </div>

          {/* Historial de Movimientos de Cartera */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Historial de Movimientos de Cartera ({movimientosCartera.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={cargarCartera}
                disabled={cargandoCartera}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Actualizar movimientos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoCartera ? "animate-spin" : ""}`} />
              </button>
            </div>

            {cargandoCartera ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-xs font-semibold">Cargando libro contable de cartera...</p>
              </div>
            ) : movimientosCartera.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Sin movimientos registrados</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                  Los cargos por ventas/alquileres a crédito y los abonos recibidos se registrarán automáticamente aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider bg-slate-50">
                      <th className="px-3.5 py-2.5">Fecha y Hora</th>
                      <th className="px-3.5 py-2.5">Tipo de Movimiento</th>
                      <th className="px-3.5 py-2.5">Factura / Ref</th>
                      <th className="px-3.5 py-2.5 text-right">Monto</th>
                      <th className="px-3.5 py-2.5 text-right">Saldo Anterior</th>
                      <th className="px-3.5 py-2.5 text-right">Nuevo Saldo</th>
                      <th className="px-3.5 py-2.5">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {movimientosCartera.map((m) => {
                      const esCargo = m.tipoMovimiento === "CARGO_VENTA" || m.tipoMovimiento === "CARGO_ALQUILER";
                      const esAbono = m.tipoMovimiento === "ABONO_CUENTA";
                      const esAjuste = m.tipoMovimiento === "AJUSTE_CUPO";

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 font-mono">
                            {new Date(m.fecha).toLocaleString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="px-3.5 py-2.5">
                            {esCargo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <TrendingUp className="w-3 h-3 text-rose-600" />
                                <span>{m.tipoMovimiento === "CARGO_ALQUILER" ? "Cargo Alquiler" : "Cargo Venta"}</span>
                              </span>
                            )}
                            {esAbono && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <TrendingDown className="w-3 h-3 text-emerald-600" />
                                <span>Abono Cuenta</span>
                              </span>
                            )}
                            {esAjuste && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                <ShieldCheck className="w-3 h-3 text-blue-600" />
                                <span>Ajuste Cupo</span>
                              </span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                            {m.factura?.numeroFactura ? `#${m.factura.numeroFactura}` : (m.referencia || "N/A")}
                          </td>

                          <td className="px-3.5 py-2.5 text-right font-mono font-black tabular-nums">
                            <span className={esAbono ? "text-emerald-700" : esCargo ? "text-rose-700" : "text-slate-900"}>
                              {esAbono ? `-$${m.monto.toLocaleString("es-CO")}` : `+$${m.monto.toLocaleString("es-CO")}`}
                            </span>
                          </td>

                          <td className="px-3.5 py-2.5 text-right font-mono text-slate-500 tabular-nums">
                            ${m.saldoAnterior.toLocaleString("es-CO")}
                          </td>

                          <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-900 tabular-nums">
                            ${m.saldoNuevo.toLocaleString("es-CO")}
                          </td>

                          <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate" title={m.descripcion || ""}>
                            {m.descripcion || "Operación registrada en mostrador"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Configurar Línea de Crédito */}
      {cliente && (
        <ModalConfigurarCredito
          isOpen={modalConfigurarCreditoAbierto}
          onClose={() => setModalConfigurarCreditoAbierto(false)}
          clienteId={cliente.id}
          clienteNombre={cliente.nombre}
          creditoHabilitadoInicial={cliente.creditoHabilitado}
          cupoCreditoInicial={cliente.cupoCredito}
          diasCreditoInicial={cliente.diasCredito}
          notasCreditoInicial={cliente.notasCredito}
          onCreditoActualizado={() => {
            cargarDatosCliente();
          }}
        />
      )}

      {/* Modal de Abono a Cartera */}
      {cliente && (
        <ModalAbonarCartera
          isOpen={modalAbonarCarteraAbierto}
          onClose={() => setModalAbonarCarteraAbierto(false)}
          clienteId={cliente.id}
          clienteNombre={cliente.nombre}
          saldoCarteraActual={metricas?.saldoTotalPendiente || 0}
          onAbonoCompletado={() => {
            cargarDatosCliente();
          }}
        />
      )}

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

      {/* Modal de Reimpresión Universal Flotante */}
      {modalImpresionAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="shrink-0 p-3.5 bg-slate-50 text-slate-800 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-900">
                  Visor de Comprobante / PDF {datosImpresionModal?.factura?.numeroFactura ? `#${datosImpresionModal.factura.numeroFactura}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalImpresionAbierto(false);
                  setDatosImpresionModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                title="Cerrar visor de impresión"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <PlantillaImpresion
                datos={datosImpresionModal}
                facturaId={cargandoPdfId || undefined}
                onCerrar={() => {
                  setModalImpresionAbierto(false);
                  setDatosImpresionModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
