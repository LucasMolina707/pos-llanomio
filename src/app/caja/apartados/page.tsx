"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  User,
  UserPlus,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  History,
  Download,
  PhoneCall,
  Check,
  Clock,
  FileText,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  CalendarClock,
  Sparkles,
  ShieldCheck,
  Tag,
  Building2,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import PlantillaImpresion from "@/components/impresion/PlantillaImpresion";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import ModalConexionCajon from "@/components/caja/ModalConexionCajon";
import { safeFetchJson } from "@/lib/safe-fetch";

// ---------------------------------------------------------------------------
// Tipos e Interfaces
// ---------------------------------------------------------------------------
export interface ClienteApartado {
  id: string;
  nombre: string;
  documento: string;
  tipoIdentificacion?: string | null;
  digitoVerificacion?: string | null;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  direccion?: string | null;
  email?: string | null;
}

export interface ProductoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "ALQUILER" | "VENTA";
  talla?: string | null;
  color?: string | null;
  categoria?: string;
  stockActual: number;
  precioAlquilerBase?: number;
  precioVenta?: number;
  estado: string;
}

export interface ItemApartado {
  idTemporal: string;
  productoId?: string | null;
  codigo?: string;
  nombre: string;
  talla?: string | null;
  color?: string | null;
  esServicioLibre: boolean;
  descripcionLibre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaApartadoResumen {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  fechaRetiroApartado?: string | null;
  fechaDevolucionEstimada?: string | null;
  fechaEntregaAlquiler?: string | null;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  montoDeposito: number;
  estadoDeposito: string;
  observaciones?: string | null;
  notas?: string | null;
  cliente: {
    id: string;
    nombre: string;
    documento: string;
    telefono?: string | null;
    telefonoSecundario?: string | null;
    direccion?: string | null;
  };
  usuarioCajero?: {
    nombre: string;
    username: string;
  } | null;
  detalles: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    esServicioLibre: boolean;
    descripcionLibre?: string | null;
    producto?: {
      id: string;
      codigo: string;
      nombre: string;
      talla?: string | null;
      color?: string | null;
    } | null;
  }>;
  abonos?: Array<{
    id: string;
    fecha: string;
    monto: number;
    metodoPago: string;
    notas?: string | null;
  }>;
}

export default function ApartadosPage() {
  const router = useRouter();

  // Estados principales de flujo y pestañas
  const [pestaña, setPestaña] = useState<"NUEVO" | "HISTORIAL">("NUEVO");
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [facturaEnCursoId, setFacturaEnCursoId] = useState<string | null>(null);
  const [facturaFinalizada, setFacturaFinalizada] = useState<any | null>(null);
  const [configuracionEmpresa, setConfiguracionEmpresa] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Hook de gaveta de dinero
  const cajon = useCajonSincronizado();
  const [mostrarModalCajon, setMostrarModalCajon] = useState(false);

  // Paso 1: Clientes
  const [clientes, setClientes] = useState<ClienteApartado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteApartado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarModalCrearCliente, setMostrarModalCrearCliente] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // Paso 2: Catálogo de productos e ítems libres
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [itemsApartado, setItemsApartado] = useState<ItemApartado[]>([]);

  // Ítem libre por descripción
  const [descripcionLibreInput, setDescripcionLibreInput] = useState("");
  const [precioLibreInput, setPrecioLibreInput] = useState("");
  const [cantidadLibreInput, setCantidadLibreInput] = useState("1");

  // Fechas y Observaciones
  const [fechaSalida, setFechaSalida] = useState(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split("T")[0];
  });
  const [fechaDevolucion, setFechaDevolucion] = useState(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() + 4);
    return limite.toISOString().split("T")[0];
  });
  const [observaciones, setObservaciones] = useState("");

  // Paso 3: Valores Financieros
  const [montoDepositoInput, setMontoDepositoInput] = useState<string>("0");
  const [depositoEntregadoHoy, setDepositoEntregadoHoy] = useState(false);
  const [abonoInicialInput, setAbonoInicialInput] = useState<string>("0");
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>("EFECTIVO");
  const [efectivoRecibidoInput, setEfectivoRecibidoInput] = useState<string>("");

  // Historial de Apartados
  const [apartadosHistorial, setApartadosHistorial] = useState<FacturaApartadoResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<string>("TODOS");
  const [apartadoParaAbonar, setApartadoParaAbonar] = useState<FacturaApartadoResumen | null>(null);
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<string>("");
  const [metodoNuevoAbono, setMetodoNuevoAbono] = useState<string>("EFECTIVO");
  const [procesandoAbonoExtra, setProcesandoAbonoExtra] = useState(false);

  // ---------------------------------------------------------------------------
  // Carga Segura de Datos con safeFetchJson
  // ---------------------------------------------------------------------------
  const cargarClientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      const res = await safeFetchJson<{ ok?: boolean; success?: boolean; clientes?: ClienteApartado[] }>("/api/clientes");
      if (res.ok && res.data?.clientes && Array.isArray(res.data.clientes)) {
        setClientes(res.data.clientes);
      }
    } catch (e) {
      console.error("Error al cargar clientes:", e);
    } finally {
      setCargandoClientes(false);
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const res = await safeFetchJson<{ ok?: boolean; success?: boolean; productos?: ProductoCatalogo[] }>("/api/inventario");
      if (res.ok && res.data?.productos && Array.isArray(res.data.productos)) {
        setProductos(res.data.productos);
      }
    } catch (e) {
      console.error("Error al cargar productos:", e);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargandoHistorial(true);
      const res = await safeFetchJson<{ ok: boolean; facturas: FacturaApartadoResumen[] }>(
        "/api/facturas?modulo=APARTADOS"
      );
      if (res.ok && res.data?.facturas && Array.isArray(res.data.facturas)) {
        setApartadosHistorial(res.data.facturas);
      }
    } catch (e) {
      console.error("Error al cargar historial de apartados:", e);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; configuracion: any }>("/api/empresa");
      if (res.ok && res.data?.configuracion) {
        setConfiguracionEmpresa(res.data.configuracion);
      }
    } catch (e) {
      console.error("Error al cargar configuración:", e);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarProductos();
    cargarConfiguracion();
    cargarHistorial();
  }, [cargarClientes, cargarProductos, cargarConfiguracion, cargarHistorial]);

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 12);
    return filtrarPorRelevancia(clientes, busquedaCliente, (c) => ({
      primarios: [c.nombre, c.documento, c.telefono],
      secundarios: [c.telefonoSecundario, c.direccion],
    }));
  }, [clientes, busquedaCliente]);

  // Productos filtrados por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) return productos.slice(0, 15);
    return filtrarPorRelevancia(productos, busquedaProducto, (p) => ({
      primarios: [p.nombre, p.codigo],
      secundarios: [p.talla, p.color, p.categoria],
    }));
  }, [productos, busquedaProducto]);

  // Total de Alquiler de los ítems en el carrito
  const totalAlquiler = useMemo(() => {
    return itemsApartado.reduce((acc, item) => acc + item.subtotal, 0);
  }, [itemsApartado]);

  // Cálculo de Saldo en Vivo
  const abonoNumerico = Math.max(0, Number(abonoInicialInput) || 0);
  const depositoNumerico = Math.max(0, Number(montoDepositoInput) || 0);
  const saldoPendienteCalculado = Math.max(0, totalAlquiler - abonoNumerico);

  // Cuadre de efectivo y vueltas
  const totalACobrarHoy = (depositoEntregadoHoy ? depositoNumerico : 0) + abonoNumerico;
  const efectivoRecibidoNum = Number(efectivoRecibidoInput) || 0;
  const vueltasEntregadasCalculadas = Math.max(0, efectivoRecibidoNum - totalACobrarHoy);

  // ---------------------------------------------------------------------------
  // Acciones de Carrito de Apartados
  // ---------------------------------------------------------------------------
  const agregarProductoDesdeCatalogo = (prod: ProductoCatalogo) => {
    const precio = Number(prod.precioAlquilerBase || prod.precioVenta || 0);
    const nuevoItem: ItemApartado = {
      idTemporal: `prod-${prod.id}-${Date.now()}`,
      productoId: prod.id,
      codigo: prod.codigo,
      nombre: prod.nombre,
      talla: prod.talla || null,
      color: prod.color || null,
      esServicioLibre: false,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
    };
    setItemsApartado((prev) => [...prev, nuevoItem]);
  };

  const agregarItemLibre = () => {
    const desc = descripcionLibreInput.trim();
    const precio = Math.max(0, Number(precioLibreInput) || 0);
    const cant = Math.max(1, Math.round(Number(cantidadLibreInput) || 1));

    if (!desc) {
      alert("Por favor escribe la descripción de la prenda o traje a separar.");
      return;
    }

    const nuevoItem: ItemApartado = {
      idTemporal: `libre-${Date.now()}`,
      productoId: null,
      nombre: desc,
      esServicioLibre: true,
      descripcionLibre: desc,
      cantidad: cant,
      precioUnitario: precio,
      subtotal: cant * precio,
    };

    setItemsApartado((prev) => [...prev, nuevoItem]);
    setDescripcionLibreInput("");
    setPrecioLibreInput("");
    setCantidadLibreInput("1");
  };

  const eliminarItem = (idTemp: string) => {
    setItemsApartado((prev) => prev.filter((i) => i.idTemporal !== idTemp));
  };

  const actualizarPrecioUnitario = (idTemp: string, nuevoPrecio: number) => {
    setItemsApartado((prev) =>
      prev.map((item) => {
        if (item.idTemporal === idTemp) {
          const precio = Math.max(0, nuevoPrecio);
          return { ...item, precioUnitario: precio, subtotal: item.cantidad * precio };
        }
        return item;
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Guardado Seguro del Apartado (Paso 3 -> Paso 4)
  // ---------------------------------------------------------------------------
  const procesarGuardadoApartado = async () => {
    if (!clienteSeleccionado) {
      alert("Debes seleccionar o crear un cliente antes de continuar.");
      setPaso(1);
      return;
    }
    if (itemsApartado.length === 0) {
      alert("Debes agregar al menos una prenda o traje a separar.");
      setPaso(2);
      return;
    }

    try {
      setGuardando(true);
      setMensajeError(null);

      const detallesPayload = itemsApartado.map((item) => ({
        productoId: item.productoId || null,
        esServicioLibre: item.esServicioLibre,
        descripcionLibre: item.descripcionLibre || item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      }));

      const payloadBase = {
        clienteId: clienteSeleccionado.id,
        tipoOperacion: "SEPARE",
        items: detallesPayload,
        fechaRetiroApartado: fechaSalida ? new Date(fechaSalida).toISOString() : null,
        fechaDevolucionEstimada: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
        montoDeposito: depositoNumerico,
        depositoEntregado: depositoEntregadoHoy,
        observaciones: observaciones.trim() || null,
        abonoInicial: abonoNumerico > 0
          ? {
              monto: abonoNumerico,
              metodoPago: metodoPagoAbono,
              montoRecibido: metodoPagoAbono === "EFECTIVO" ? efectivoRecibidoNum : null,
              vueltasEntregadas: metodoPagoAbono === "EFECTIVO" ? vueltasEntregadasCalculadas : null,
            }
          : undefined,
      };

      const endpoint = facturaEnCursoId ? `/api/facturas/${facturaEnCursoId}` : "/api/facturas";
      const method = facturaEnCursoId ? "PUT" : "POST";
      const body = facturaEnCursoId
        ? JSON.stringify({ ...payloadBase, reemplazarEnCurso: true })
        : JSON.stringify(payloadBase);

      const res = await safeFetchJson<any>(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok || (!res.data?.success && !res.data?.ok)) {
        throw new Error(res.error || "No se pudo registrar el apartado en el sistema.");
      }

      const facturaGuardada = res.data?.factura || res.data;
      setFacturaEnCursoId(facturaGuardada.id);
      setFacturaFinalizada(facturaGuardada);

      // Sincronizar en vivo el saldo de cajón si se recibió dinero hoy
      if (totalACobrarHoy > 0) {
        cajon.actualizarCajon(true);
        cajon.notificarCajaActualizada();
      }

      // Recargar historial en segundo plano
      cargarHistorial();

      // Avanzar al Paso 4 (Comprobante FORMATO DE APARTADO)
      setPaso(4);
    } catch (err: unknown) {
      console.error("Error al registrar apartado:", err);
      const msg = err instanceof Error ? err.message : "Error desconocido al procesar el apartado";
      setMensajeError(msg);
      alert(`Error: ${msg}`);
    } finally {
      setGuardando(false);
    }
  };

  // Finalizar y reiniciar operación
  const reiniciarOperacionLimpia = () => {
    setPaso(1);
    setFacturaEnCursoId(null);
    setFacturaFinalizada(null);
    setClienteSeleccionado(null);
    setItemsApartado([]);
    setAbonoInicialInput("0");
    setMontoDepositoInput("0");
    setDepositoEntregadoHoy(false);
    setEfectivoRecibidoInput("");
    setObservaciones("");
    setMensajeError(null);
  };

  // ---------------------------------------------------------------------------
  // Registro de Nuevo Abono desde el Historial
  // ---------------------------------------------------------------------------
  const registrarAbonoHistorial = async () => {
    if (!apartadoParaAbonar) return;
    const monto = Math.max(0, Number(montoNuevoAbono) || 0);
    if (monto <= 0) {
      alert("Ingresa un monto válido para el abono.");
      return;
    }

    try {
      setProcesandoAbonoExtra(true);
      const res = await safeFetchJson<any>(`/api/facturas/${apartadoParaAbonar.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto,
          metodoPago: metodoNuevoAbono,
          notas: "Abono adicional a apartado registrado desde historial",
        }),
      });

      if (!res.ok || (!res.data?.success && !res.data?.ok)) {
        throw new Error(res.error || "No se pudo registrar el abono.");
      }

      alert("Abono registrado con éxito.");
      setApartadoParaAbonar(null);
      setMontoNuevoAbono("");
      cargarHistorial();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar abono";
      alert(msg);
    } finally {
      setProcesandoAbonoExtra(false);
    }
  };

  // Historial filtrado
  const apartadosHistorialFiltrados = useMemo(() => {
    return apartadosHistorial.filter((f) => {
      if (filtroEstadoHistorial === "PENDIENTES") {
        if (f.tipoOperacion !== "SEPARE" || f.estado === "CERRADA") return false;
      } else if (filtroEstadoHistorial === "CONVERTIDOS") {
        if (f.tipoOperacion !== "ALQUILER") return false;
      }

      if (!busquedaHistorial.trim()) return true;
      const q = busquedaHistorial.toLowerCase();
      const num = f.numeroFactura?.toLowerCase() || "";
      const nom = f.cliente?.nombre?.toLowerCase() || "";
      const doc = f.cliente?.documento?.toLowerCase() || "";
      return num.includes(q) || nom.includes(q) || doc.includes(q);
    });
  }, [apartadosHistorial, filtroEstadoHistorial, busquedaHistorial]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9] text-slate-800 select-none">
      {/* ========================================================================= */}
      {/* 1. HEADER COMPACTO FIJO (h-14 shrink-0 px-4 bg-white border-b)           */}
      {/* ========================================================================= */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-2xs z-20 gap-2">
        {/* Izquierda: Regresar + Logo + Título con Acento Índigo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shrink-0"
            title="Regresar al panel de inicio"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Regresar</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          <div className="shrink-0">
            <LogoEmpresa size="sm" showText={false} />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
              <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
              <span className="truncate">APARTADOS Y RESERVAS</span>
            </span>
          </div>
        </div>

        {/* Centro: Stepper Horizontal Compacto en Línea */}
        {pestaña === "NUEVO" && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs text-xs font-bold">
            {[
              { n: 1, label: "1. Cliente" },
              { n: 2, label: `2. Prendas (${itemsApartado.length})` },
              { n: 3, label: "3. Valores y Cobro" },
              { n: 4, label: "4. Comprobante" },
            ].map((step) => {
              const activo = paso === step.n;
              const completado = paso > step.n;
              return (
                <button
                  key={step.n}
                  type="button"
                  onClick={() => {
                    if (step.n === 1) setPaso(1);
                    else if (step.n === 2 && clienteSeleccionado) setPaso(2);
                    else if (step.n === 3 && itemsApartado.length > 0) setPaso(3);
                    else if (step.n === 4 && facturaFinalizada) setPaso(4);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    activo
                      ? "bg-indigo-600 text-white shadow-xs"
                      : completado
                      ? "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      activo
                        ? "bg-white text-indigo-600"
                        : completado
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {completado ? <Check className="w-3 h-3" /> : step.n}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Derecha: Conmutador Nuevo/Historial + Estado Cajón + Enlaces Rápidos */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setPestaña("NUEVO")}
              className={`px-3 py-1 rounded-lg transition ${
                pestaña === "NUEVO"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nuevo
            </button>
            <button
              type="button"
              onClick={() => {
                setPestaña("HISTORIAL");
                cargarHistorial();
              }}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                pestaña === "HISTORIAL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden xl:block" />

          {/* Estado de Cajón Sincronizado */}
          <div className="hidden xl:block">
            <BarraEstadoCajon
              cargando={cajon.cargando}
              cajonConectado={cajon.cajonConectado}
              seguridadCaja={cajon.seguridadCaja}
              saldoActualEnCajon={cajon.saldoActualEnCajon}
              totalDigital={cajon.totalDigital}
              estado={cajon.estado}
              motivoBloqueo={cajon.motivoBloqueo}
              onRefrescar={() => cajon.actualizarCajon(true)}
              onAbrirModal={cajon.abrirModal}
            />
          </div>

          {/* Accesos Rápidos a Otras Ventanas */}
          <Link
            href="/caja/pos"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
            title="Ir a Terminal POS"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">POS</span>
          </Link>
          <Link
            href="/caja/alquileres"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
            title="Ir a Terminal de Alquileres"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Alquileres</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS (lg:grid-cols-12 h-screen)     */}
      {/* ========================================================================= */}
      {pestaña === "NUEVO" ? (
        <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden bg-[#F3F6F9]">
          {/* ======================================================================= */}
          {/* COLUMNA IZQUIERDA / CENTRAL (lg:col-span-8)                             */}
          {/* ======================================================================= */}
          <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Cabecera Interna de Columna Izquierda con Buscador y Acción */}
            <div className="h-12 shrink-0 px-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 truncate">
                  {paso === 1 && (
                    <>
                      <User className="w-4 h-4 text-indigo-600" />
                      Directorio de Clientes
                    </>
                  )}
                  {paso === 2 && (
                    <>
                      <Tag className="w-4 h-4 text-indigo-600" />
                      Catálogo de Prendas y Registro de Reserva
                    </>
                  )}
                  {paso === 3 && (
                    <>
                      <Banknote className="w-4 h-4 text-indigo-600" />
                      Liquidación de Apartado y Calculadora de Vueltas
                    </>
                  )}
                  {paso === 4 && (
                    <>
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Comprobante Oficial de Apartado
                    </>
                  )}
                </span>
              </div>

              {paso === 1 && (
                <button
                  type="button"
                  onClick={() => setMostrarModalCrearCliente(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Nuevo Cliente</span>
                </button>
              )}
            </div>

            {/* Contenido con Scroll Interno Exclusivo según el Paso */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              {/* PASO 1: SELECCIÓN DE CLIENTE */}
              {paso === 1 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre, cédula o celular..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  {cargandoClientes ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Cargando clientes...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {clientesFiltrados.map((cli) => {
                        const seleccionado = clienteSeleccionado?.id === cli.id;
                        return (
                          <div
                            key={cli.id}
                            onClick={() => setClienteSeleccionado(cli)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                              seleccionado
                                ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {cli.nombre}
                              </p>
                              {seleccionado && (
                                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {cli.tipoIdentificacion || "CC"}: {cli.documento}
                            </p>
                            <p className="text-[11px] text-slate-600 flex items-center gap-1 font-mono mt-0.5">
                              <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{cli.telefono}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: CATÁLOGO DE PRENDAS Y FECHAS */}
              {paso === 2 && (
                <div className="space-y-3">
                  {/* Fila de Fechas Compacta en Línea */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Fecha Pactada de Retiro / Evento:
                      </label>
                      <input
                        type="date"
                        value={fechaSalida}
                        onChange={(e) => setFechaSalida(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Fecha Límite Estimada de Devolución:
                      </label>
                      <input
                        type="date"
                        value={fechaDevolucion}
                        onChange={(e) => setFechaDevolucion(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Fila Compacta de Ítem Libre / Personalizado */}
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Descripción de prenda libre o reserva personalizada..."
                      value={descripcionLibreInput}
                      onChange={(e) => setDescripcionLibreInput(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        placeholder="Precio $"
                        value={precioLibreInput}
                        onChange={(e) => setPrecioLibreInput(e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white font-mono font-bold text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={agregarItemLibre}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shrink-0 cursor-pointer"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Buscador de Catálogo */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar en catálogo de prendas por nombre o código..."
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  {/* Grid de Productos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {productosFiltrados.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => agregarProductoDesdeCatalogo(prod)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-slate-400 uppercase">
                              {prod.codigo}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {prod.talla || "Talla Única"}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-slate-900 mt-0.5 line-clamp-1">
                            {prod.nombre}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                          <span className="font-mono font-black text-xs text-indigo-700">
                            ${Number(prod.precioAlquilerBase || prod.precioVenta || 0).toLocaleString("es-CO")}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-600">+ Separar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PASO 3: LIQUIDACIÓN, ABONO Y CALCULADORA DE VUELTAS */}
              {paso === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subcolumna A: Valores y Liquidación */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                      Condición Financiera del Apartado
                    </h3>

                    <div>
                      <span className="text-xs text-slate-500 block">Total de las Prendas Separadas:</span>
                      <span className="font-mono text-xl font-black text-slate-900">
                        ${totalAlquiler.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Depósito en Garantía (Opcional):
                      </label>
                      <input
                        type="number"
                        value={montoDepositoInput}
                        onChange={(e) => setMontoDepositoInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-sm bg-white outline-none focus:border-indigo-500"
                        placeholder="0"
                      />
                      <label className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={depositoEntregadoHoy}
                          onChange={(e) => setDepositoEntregadoHoy(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Cliente entrega el depósito hoy en mostrador</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Abono Inicial (Hoy):
                      </label>
                      <input
                        type="number"
                        value={abonoInicialInput}
                        onChange={(e) => setAbonoInicialInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-base bg-white text-emerald-700 outline-none focus:border-emerald-500"
                        placeholder="0"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Saldo Pendiente al Retirar:</span>
                      <span className="font-mono text-base font-black text-rose-600">
                        ${saldoPendienteCalculado.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Observaciones del Apartado:
                      </label>
                      <textarea
                        rows={2}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detalles de ajustes, acuerdos de entrega o preferencias del cliente..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Subcolumna B: Métodos de Pago y Calculadora de Vueltas */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                      Cobro Inmediato en Mostrador
                    </h3>

                    <div>
                      <span className="text-xs text-slate-500 block">Total a Recibir Hoy:</span>
                      <span className="font-mono text-2xl font-black text-indigo-700">
                        ${totalACobrarHoy.toLocaleString("es-CO")}
                      </span>
                    </div>

                    {totalACobrarHoy > 0 && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Método de Pago:
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {["EFECTIVO", "NEQUI", "DAVIPLATA", "TARJETA", "TRANSFERENCIA"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMetodoPagoAbono(m)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                                  metodoPagoAbono === m
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {metodoPagoAbono === "EFECTIVO" && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              Efectivo Recibido:
                            </label>
                            <input
                              type="number"
                              value={efectivoRecibidoInput}
                              onChange={(e) => setEfectivoRecibidoInput(e.target.value)}
                              placeholder={`Mínimo $${totalACobrarHoy.toLocaleString("es-CO")}`}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-base bg-white outline-none focus:border-indigo-500"
                            />

                            {/* Billetes Rápidos */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[10000, 20000, 50000, 100000].map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setEfectivoRecibidoInput(String(b))}
                                  className="px-2 py-1 rounded-md bg-white border border-slate-300 text-xs font-mono font-bold hover:bg-slate-100"
                                >
                                  ${(b / 1000).toFixed(0)}k
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEfectivoRecibidoInput(String(totalACobrarHoy))}
                                className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                              >
                                Exacto
                              </button>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                              <span className="text-xs font-bold">Vueltas / Cambio:</span>
                              <span className="font-mono text-xl font-black text-emerald-700">
                                ${vueltasEntregadasCalculadas.toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 4: IMPRESIÓN OFICIAL DEL FORMATO DE APARTADO */}
              {paso === 4 && facturaFinalizada && (
                <div className="h-full flex flex-col space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shrink-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs sm:text-sm">
                        Apartado Registrado Exitosamente — Factura N° {facturaFinalizada.numeroFactura}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={reiniciarOperacionLimpia}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nuevo Apartado Limpio</span>
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <PlantillaImpresion facturaId={facturaFinalizada.id} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* COLUMNA DERECHA: RESUMEN PERMANENTE Y BOTONES DE AVANCE (lg:col-span-4)  */}
          {/* ======================================================================= */}
          <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Cabecera Derecha: Cliente Seleccionado y Fechas */}
            <div className="shrink-0 p-3 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Resumen de Reserva
                </span>
                {clienteSeleccionado && (
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Cliente Listo
                  </span>
                )}
              </div>

              {clienteSeleccionado ? (
                <div className="mt-2 space-y-0.5">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {clienteSeleccionado.nombre}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    CC: {clienteSeleccionado.documento} | Tel: {clienteSeleccionado.telefono}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Retiro: <strong className="text-slate-800">{fechaSalida || "Por definir"}</strong>
                  </p>
                </div>
              ) : (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Aún no has seleccionado un cliente.
                </div>
              )}
            </div>

            {/* Centro: Lista de Prendas en el Carrito con Scroll Interno Propio */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  Prendas Separadas ({itemsApartado.length})
                </span>
                {itemsApartado.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItemsApartado([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {itemsApartado.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-600">No hay prendas agregadas</p>
                  <p className="text-[11px] text-slate-500">Agrega prendas o reserva personalizada</p>
                </div>
              ) : (
                itemsApartado.map((item) => (
                  <div
                    key={item.idTemporal}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{item.nombre}</p>
                      <span className="text-[11px] text-slate-500">
                        ${item.precioUnitario.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        value={item.precioUnitario}
                        onChange={(e) => actualizarPrecioUnitario(item.idTemporal, Number(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-right font-mono font-bold text-xs bg-white"
                        title="Editar precio de alquiler"
                      />
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.idTemporal)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pie Fijo con Resumen Numérico y Botones Grandes de Navegación Siempre Visibles */}
            <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 space-y-2">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Operación:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${totalAlquiler.toLocaleString("es-CO")}
                  </span>
                </div>
                {depositoNumerico > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Depósito (Garantía):</span>
                    <span className="font-mono font-bold text-slate-800">
                      ${depositoNumerico.toLocaleString("es-CO")} {depositoEntregadoHoy ? "(Hoy)" : "(Al Retiro)"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Abono Recibido Hoy:</span>
                  <span className="font-mono font-black">
                    ${abonoNumerico.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                  <span>Saldo Pendiente:</span>
                  <span className="font-mono font-black text-sm">
                    ${saldoPendienteCalculado.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Botones Grandes de Navegación Fijos */}
              <div className="pt-1 flex items-center gap-2">
                {paso > 1 && paso < 4 && (
                  <button
                    type="button"
                    onClick={() => setPaso((prev) => (prev - 1) as any)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Atrás</span>
                  </button>
                )}

                {paso === 1 && (
                  <button
                    type="button"
                    disabled={!clienteSeleccionado}
                    onClick={() => setPaso(2)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Siguiente: Prendas</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {paso === 2 && (
                  <button
                    type="button"
                    disabled={itemsApartado.length === 0}
                    onClick={() => setPaso(3)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Siguiente: Cobro y Abono</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {paso === 3 && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={procesarGuardadoApartado}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {guardando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar y Expedir Apartado</span>
                      </>
                    )}
                  </button>
                )}

                {paso === 4 && (
                  <button
                    type="button"
                    onClick={reiniciarOperacionLimpia}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Apartado</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* VISTA: HISTORIAL DE APARTADOS (PANTALLA COMPLETA CON SCROLL INTERNO)      */
        /* ========================================================================= */
        <main className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden bg-[#F3F6F9]">
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-3 min-h-0">
            {/* Barra de Filtros */}
            <div className="shrink-0 pb-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento o N° de factura..."
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg transition ${
                      filtroEstadoHistorial === "TODOS" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("PENDIENTES")}
                    className={`px-3 py-1 rounded-lg transition ${
                      filtroEstadoHistorial === "PENDIENTES" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("CONVERTIDOS")}
                    className={`px-3 py-1 rounded-lg transition ${
                      filtroEstadoHistorial === "CONVERTIDOS" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Alquileres
                  </button>
                </div>

                <button
                  type="button"
                  onClick={cargarHistorial}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Recargar historial"
                >
                  <RefreshCw className={`w-4 h-4 ${cargandoHistorial ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Tabla de Resultados con Scroll Interno */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {cargandoHistorial ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Cargando historial de apartados...
                </div>
              ) : apartadosHistorialFiltrados.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  No se encontraron apartados registrados.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">N° Apartado</th>
                      <th className="py-2.5 px-3">Cliente / Teléfono</th>
                      <th className="py-2.5 px-3">Prendas</th>
                      <th className="py-2.5 px-3">Fecha Retiro</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Abonado</th>
                      <th className="py-2.5 px-3 text-right">Saldo</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apartadosHistorialFiltrados.map((item) => {
                      const esConvertido = item.tipoOperacion === "ALQUILER";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {item.numeroFactura}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {new Date(item.fechaCreacion).toLocaleDateString("es-CO")}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-800 block truncate max-w-[160px]">
                              {item.cliente?.nombre}
                            </span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              CC: {item.cliente?.documento} | Tel: {item.cliente?.telefono}
                            </span>
                          </td>
                          <td className="py-2 px-3 max-w-xs truncate">
                            {item.detalles?.map((d) => `${d.cantidad}x ${d.descripcionLibre || d.producto?.nombre}`).join(", ") || "Prendas"}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-700">
                            {item.fechaRetiroApartado
                              ? new Date(item.fechaRetiroApartado).toLocaleDateString("es-CO")
                              : item.fechaEntregaAlquiler
                              ? new Date(item.fechaEntregaAlquiler).toLocaleDateString("es-CO")
                              : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ${item.totalFactura.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            ${item.totalAbonado.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                            ${item.saldoPendiente.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {esConvertido ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                Alquiler Activo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                                Apartado Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!esConvertido && item.saldoPendiente > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApartadoParaAbonar(item);
                                    setMontoNuevoAbono(String(item.saldoPendiente));
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer"
                                >
                                  + Abonar
                                </button>
                              )}
                              <Link
                                href={`/impresion/${item.id}`}
                                target="_blank"
                                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"
                                title="Ver e imprimir comprobante"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
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
        </main>
      )}

      {/* Modal Registrar Abono Extra desde Historial */}
      {apartadoParaAbonar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Registrar Abono a Apartado N° {apartadoParaAbonar.numeroFactura}
              </h3>
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-600">
                Cliente: <strong>{apartadoParaAbonar.cliente?.nombre}</strong>
              </p>
              <p className="text-slate-600">
                Saldo Actual: <strong className="text-rose-600">${apartadoParaAbonar.saldoPendiente.toLocaleString("es-CO")}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Monto del Abono:
              </label>
              <input
                type="number"
                value={montoNuevoAbono}
                onChange={(e) => setMontoNuevoAbono(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-base text-emerald-700 outline-none focus:border-emerald-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Método de Pago:
              </label>
              <select
                value={metodoNuevoAbono}
                onChange={(e) => setMetodoNuevoAbono(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="NEQUI">NEQUI</option>
                <option value="DAVIPLATA">DAVIPLATA</option>
                <option value="TARJETA">TARJETA</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAbonoExtra}
                onClick={registrarAbonoHistorial}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {procesandoAbonoExtra ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Guardar Abono</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Cliente Rápido */}
      {mostrarModalCrearCliente && (
        <ModalCrearClienteRapido
          isOpen={mostrarModalCrearCliente}
          onClose={() => setMostrarModalCrearCliente(false)}
          onClienteCreado={(nuevo: ClienteCreado) => {
            const clienteFormateado: ClienteApartado = {
              id: nuevo.id,
              nombre: nuevo.nombre,
              documento: nuevo.documento,
              telefono: nuevo.telefono || null,
              telefonoSecundario: nuevo.telefonoSecundario || null,
              direccion: nuevo.direccion || null,
              email: nuevo.email || null,
            };
            setClientes((prev) => [clienteFormateado, ...prev]);
            setClienteSeleccionado(clienteFormateado);
            setMostrarModalCrearCliente(false);
          }}
        />
      )}

      {/* Modal Conexión de Cajón */}
      <ModalConexionCajon
        abierto={cajon.modalAbierto || mostrarModalCajon}
        estado={cajon.estado}
        cargando={cajon.cargando}
        motivoBloqueo={cajon.motivoBloqueo}
        turnoAbierto={cajon.turnoAbierto}
        turnoParaCompartir={cajon.turnoParaCompartir}
        turnosAbiertosHoy={cajon.turnosAbiertosHoy}
        arqueoTurno={cajon.arqueoTurno}
        saldoActualEnCajon={cajon.saldoActualEnCajon}
        cajonConectado={cajon.cajonConectado}
        onConectarCompartida={cajon.conectarCajaCompartida}
        onAbrirNuevoCajon={cajon.abrirNuevoCajon}
        onCerrarModal={() => {
          cajon.cerrarModal();
          setMostrarModalCajon(false);
        }}
      />
    </div>
  );
}
