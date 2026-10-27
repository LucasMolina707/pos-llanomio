"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Info,
  ShieldCheck,
  Layers,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import ModalConexionCajon from "@/components/caja/ModalConexionCajon";

// ---------------------------------------------------------------------------
// Tipos e Interfaces
// ---------------------------------------------------------------------------
export interface ClienteApartado {
  id: string;
  nombre: string;
  documento: string;
  tipoIdentificacion?: string | null;
  digitoVerificacion?: string | null;
  telefono: string;
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
  const [apartadoParaImpresion, setApartadoParaImpresion] = useState<FacturaApartadoResumen | null>(null);
  const [apartadoParaAbonar, setApartadoParaAbonar] = useState<FacturaApartadoResumen | null>(null);
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<string>("");
  const [metodoNuevoAbono, setMetodoNuevoAbono] = useState<string>("EFECTIVO");
  const [procesandoAbonoExtra, setProcesandoAbonoExtra] = useState(false);

  // ---------------------------------------------------------------------------
  // Carga Inicial de Datos (Clientes, Productos, Configuración)
  // ---------------------------------------------------------------------------
  const cargarClientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      const res = await fetch("/api/clientes", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.clientes)) {
        setClientes(data.clientes);
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
      const res = await fetch("/api/inventario", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.productos)) {
        setProductos(data.productos);
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
      const res = await fetch("/api/facturas?modulo=APARTADOS", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.facturas)) {
        setApartadosHistorial(data.facturas);
      }
    } catch (e) {
      console.error("Error al cargar historial de apartados:", e);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && data.configuracion) {
        setConfiguracionEmpresa(data.configuracion);
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
    if (!busquedaCliente.trim()) return clientes.slice(0, 8);
    return filtrarPorRelevancia(clientes, busquedaCliente, (c) => ({
      primarios: [c.nombre, c.documento, c.telefono],
      secundarios: [c.telefonoSecundario, c.direccion],
    }));
  }, [clientes, busquedaCliente]);

  // Productos filtrados por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) return productos.slice(0, 10);
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
  // Guardado Idempotente del Apartado (Paso 3 -> Paso 4)
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
        total: totalAlquiler,
        montoDeposito: depositoNumerico,
        depositoEntregadoHoy,
        estadoDeposito: depositoEntregadoHoy && depositoNumerico > 0 ? "RECIBIDO_EN_GARANTIA" : "SIN_DEPOSITO",
        metodoPagoDeposito: depositoEntregadoHoy && depositoNumerico > 0 ? "EFECTIVO" : null,
        fechaRetiroApartado: fechaSalida,
        fechaDevolucionEstimada: fechaDevolucion,
        observaciones: observaciones.trim() || null,
        notas: observaciones.trim() || null,
        abonoInicial: abonoNumerico > 0
          ? {
              monto: abonoNumerico,
              metodoPago: metodoPagoAbono,
              montoRecibido: metodoPagoAbono === "EFECTIVO" ? efectivoRecibidoNum : null,
              vueltasEntregadas: metodoPagoAbono === "EFECTIVO" ? vueltasEntregadasCalculadas : null,
            }
          : undefined,
      };

      let res;
      if (facturaEnCursoId) {
        // Actualización idempotente para no duplicar si retrocede
        res = await fetch(`/api/facturas/${facturaEnCursoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payloadBase, reemplazarEnCurso: true }),
        });
      } else {
        // Creación inicial
        res = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBase),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el apartado en el sistema.");
      }

      const facturaGuardada = data.factura || data;
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
      const res = await fetch(`/api/facturas/${apartadoParaAbonar.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto,
          metodoPago: metodoNuevoAbono,
          notas: "Abono adicional a apartado registrado desde historial",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el abono.");
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

  // Convertir directamente a Alquiler en 1 clic
  const irAConvertirEnAlquiler = (apartadoId: string) => {
    router.push(`/caja/alquileres?apartadoId=${apartadoId}`);
  };

  // Historial filtrado
  const apartadosHistorialFiltrados = useMemo(() => {
    return apartadosHistorial.filter((f) => {
      // Filtro de estado
      if (filtroEstadoHistorial === "PENDIENTES") {
        if (f.tipoOperacion !== "SEPARE" || f.estado === "CERRADA") return false;
      } else if (filtroEstadoHistorial === "CONVERTIDOS") {
        if (f.tipoOperacion !== "ALQUILER") return false;
      }

      // Filtro de texto
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
      {/* 1. Barra Superior Institucional Pantalla Completa */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition"
            title="Regresar al panel de inicio"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Regresar</span>
          </Link>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <LogoEmpresa size="sm" showText textClassName="font-black text-slate-900 text-sm hidden md:inline" />

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
              SISTEMA DE APARTADOS Y RESERVAS
            </span>
          </div>
        </div>

        {/* Conmutador de Pestañas + Accesos Rápidos */}
        <div className="flex items-center gap-2">
          {/* Conmutador Nuevo vs Historial */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setPestaña("NUEVO")}
              className={`px-3 py-1.5 rounded-lg transition ${
                pestaña === "NUEVO"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nuevo Apartado (Pasos 1-4)
            </button>
            <button
              type="button"
              onClick={() => {
                setPestaña("HISTORIAL");
                cargarHistorial();
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                pestaña === "HISTORIAL"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historial de Apartados
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block" />

          {/* Estado de Cajón Sincronizado */}
          <div className="hidden lg:block">
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

          {/* Enlaces Rápidos a POS y Alquileres */}
          <Link
            href="/caja/pos"
            className="hidden xl:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            POS Ventas
          </Link>
          <Link
            href="/caja/alquileres"
            className="hidden xl:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            Alquileres
          </Link>
        </div>
      </header>

      {/* 2. Cuerpo Principal */}
      {pestaña === "NUEVO" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Progreso de 4 Pasos Lineales */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-xs sm:text-sm font-bold w-full max-w-4xl mx-auto">
              {[
                { n: 1, label: "1. Cliente y Contacto" },
                { n: 2, label: "2. Prendas, Fechas y Notas" },
                { n: 3, label: "3. Valores, Abono y Saldo" },
                { n: 4, label: "4. Formato Oficial de Apartado" },
              ].map((step) => {
                const activo = paso === step.n;
                const completado = paso > step.n;
                return (
                  <div
                    key={step.n}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition shrink-0 ${
                      activo
                        ? "bg-amber-500 text-white shadow-xs"
                        : completado
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "text-slate-400 bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                        activo ? "bg-white text-amber-600" : completado ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {completado ? <Check className="w-3.5 h-3.5" /> : step.n}
                    </span>
                    <span className="truncate">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contenido Dinámico por Paso */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl space-y-6">
              {/* ============================================================= */}
              {/* PASO 1: SELECCIÓN O CREACIÓN DE CLIENTE                        */}
              {/* ============================================================= */}
              {paso === 1 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <User className="w-5 h-5 text-amber-600" />
                        Paso 1: Identificación del Cliente
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Busca en la base de datos única o registra un nuevo cliente en segundos (con teléfono obligatorio).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarModalCrearCliente(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <UserPlus className="w-4 h-4" />
                      + Crear Cliente Rápido
                    </button>
                  </div>

                  {/* Buscador de Clientes */}
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre, cédula / NIT o celular..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none text-sm transition"
                    />
                  </div>

                  {/* Lista de Clientes Disponibles */}
                  {cargandoClientes ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      Cargando base de datos de clientes...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                      {clientesFiltrados.map((cli) => {
                        const seleccionado = clienteSeleccionado?.id === cli.id;
                        return (
                          <div
                            key={cli.id}
                            onClick={() => setClienteSeleccionado(cli)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                              seleccionado
                                ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-sm text-slate-900">{cli.nombre}</p>
                              <p className="text-xs text-slate-500 font-mono">
                                {cli.tipoIdentificacion || "CC"}: {cli.documento}
                              </p>
                              <p className="text-xs text-slate-600 flex items-center gap-1 font-mono">
                                <PhoneCall className="w-3 h-3 text-emerald-600" />
                                {cli.telefono} {cli.telefonoSecundario ? ` / ${cli.telefonoSecundario}` : ""}
                              </p>
                              {cli.direccion && (
                                <p className="text-[11px] text-slate-400">Dir: {cli.direccion}</p>
                              )}
                            </div>
                            {seleccionado && (
                              <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumen del Cliente Seleccionado & Botón Siguiente */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {clienteSeleccionado ? (
                      <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Cliente seleccionado: <strong>{clienteSeleccionado.nombre}</strong> ({clienteSeleccionado.documento}) — Tel: {clienteSeleccionado.telefono}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Selecciona un cliente de la lista para continuar.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!clienteSeleccionado}
                      onClick={() => setPaso(2)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      Continuar a Selección de Prendas
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* PASO 2: PRENDAS / TRAJES A SEPARAR (CATÁLOGO O LIBRE)          */}
              {/* ============================================================= */}
              {paso === 2 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-600" />
                        Paso 2: Prendas o Trajes a Separar, Fechas y Notas
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agrega trajes del catálogo (incluso si hoy están alquilados) o escribe ítems libres de trajes por llegar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Cambiar Cliente
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Columna Izquierda (7 cols): Selección de Catálogo o Ítem Libre */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Sub-bloque A: Agregar Traje / Ítem Libre por Descripción */}
                      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                        <p className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-amber-700" />
                          Agregar Prenda / Traje Libre por Descripción (Personalizado)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            placeholder="Descripción (ej: Traje Joropo Talla 8 Blanco con Sombrero)..."
                            value={descripcionLibreInput}
                            onChange={(e) => setDescripcionLibreInput(e.target.value)}
                            className="sm:col-span-7 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <input
                            type="number"
                            placeholder="Valor Alquiler $"
                            value={precioLibreInput}
                            onChange={(e) => setPrecioLibreInput(e.target.value)}
                            className="sm:col-span-3 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={agregarItemLibre}
                            className="sm:col-span-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar
                          </button>
                        </div>
                      </div>

                      {/* Sub-bloque B: Tomar del Catálogo de Inventario */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-700 uppercase">
                            O Tomar del Inventario Existente:
                          </p>
                          <span className="text-[11px] text-slate-400">
                            (No bloquea si hoy está alquilado)
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar en inventario por nombre o código..."
                            value={busquedaProducto}
                            onChange={(e) => setBusquedaProducto(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white outline-none"
                          />
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1.5 p-1">
                          {productosFiltrados.map((prod) => (
                            <div
                              key={prod.id}
                              className="p-2.5 rounded-lg border border-slate-200 hover:border-amber-300 bg-white flex items-center justify-between text-xs transition"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{prod.nombre}</span>
                                <span className="font-mono text-slate-400 ml-1.5">[{prod.codigo}]</span>
                                {prod.talla && (
                                  <span className="text-[10px] text-slate-500 ml-1.5">
                                    Talla: {prod.talla}
                                  </span>
                                )}
                                <span className="text-amber-700 font-bold font-mono ml-2">
                                  ${(prod.precioAlquilerBase || prod.precioVenta || 0).toLocaleString("es-CO")}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => agregarProductoDesdeCatalogo(prod)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-500 hover:text-white rounded-md text-[11px] font-bold text-slate-700 transition"
                              >
                                + Apartar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha (5 cols): Carrito de Ítems Separados + Fechas + Notas */}
                    <div className="lg:col-span-5 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <p className="font-black text-xs text-slate-800 uppercase">
                            Prendas en el Apartado ({itemsApartado.length})
                          </p>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            Total: ${totalAlquiler.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {itemsApartado.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-6 text-center">
                            Aún no has agregado prendas a este apartado.
                          </p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 py-1">
                            {itemsApartado.map((item) => (
                              <div key={item.idTemporal} className="py-2 flex items-center justify-between text-xs">
                                <div className="space-y-0.5 max-w-[65%]">
                                  <p className="font-bold text-slate-900 truncate">
                                    {item.cantidad}x {item.nombre}
                                  </p>
                                  {item.codigo && (
                                    <p className="text-[10px] text-slate-500 font-mono">[{item.codigo}]</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={item.precioUnitario}
                                    onChange={(e) => actualizarPrecioUnitario(item.idTemporal, Number(e.target.value) || 0)}
                                    className="w-16 px-1.5 py-1 rounded border border-slate-300 text-xs text-right font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => eliminarItem(item.idTemporal)}
                                    className="text-rose-600 hover:text-rose-800 p-1"
                                    title="Quitar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fechas Estimadas */}
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                              Fecha Retiro / Entrega:
                            </label>
                            <input
                              type="date"
                              value={fechaSalida}
                              onChange={(e) => setFechaSalida(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                              Fecha Devolución:
                            </label>
                            <input
                              type="date"
                              value={fechaDevolucion}
                              onChange={(e) => setFechaDevolucion(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                            />
                          </div>
                        </div>

                        {/* Observaciones */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Observaciones / Ajustes del Apartado:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Ej: Ajustar bota 2cm, evento sábado, entregar con sombrero..."
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Navegación */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Volver a Cliente
                    </button>

                    <button
                      type="button"
                      disabled={itemsApartado.length === 0}
                      onClick={() => setPaso(3)}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      Continuar a Definición de Valores
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* PASO 3: VALORES FINANCIEROS (ALQUILER, DEPÓSITO, ABONO, SALDO) */}
              {/* ============================================================= */}
              {paso === 3 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                        Paso 3: Liquidación Financiera del Apartado
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define el valor acordado de alquiler, depósito en garantía, cuánto abona hoy el cliente y el saldo resultante.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaso(2)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Modificar Prendas
                    </button>
                  </div>

                  {/* Cuadrícula de los 4 Valores Clave */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Alquiler */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-600 uppercase">1. Alquiler Total</p>
                      <p className="text-2xl font-black font-mono text-slate-900">
                        ${totalAlquiler.toLocaleString("es-CO")}
                      </p>
                      <p className="text-[10px] text-slate-400">Total pactado de las prendas</p>
                    </div>

                    {/* 2. Depósito en Garantía */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <p className="text-xs font-bold text-amber-900 uppercase">2. Depósito ($)</p>
                      <input
                        type="number"
                        value={montoDepositoInput}
                        onChange={(e) => setMontoDepositoInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white font-mono font-bold text-lg outline-none"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-950">
                        <input
                          type="checkbox"
                          checked={depositoEntregadoHoy}
                          onChange={(e) => setDepositoEntregadoHoy(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-0"
                        />
                        <span>¿Deja abonado el depósito hoy?</span>
                      </label>
                    </div>

                    {/* 3. Abono para Separar */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <p className="text-xs font-bold text-emerald-900 uppercase">3. Abono Inicial ($)</p>
                      <input
                        type="number"
                        value={abonoInicialInput}
                        onChange={(e) => setAbonoInicialInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-lg outline-none"
                      />
                      {/* Accesos rápidos de porcentaje */}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setAbonoInicialInput("0")}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                        >
                          $0
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbonoInicialInput(String(Math.round(totalAlquiler * 0.3)))}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                        >
                          30%
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbonoInicialInput(String(Math.round(totalAlquiler * 0.5)))}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbonoInicialInput(String(totalAlquiler))}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                        >
                          100%
                        </button>
                      </div>
                    </div>

                    {/* 4. Saldo Restante */}
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                      <p className="text-xs font-bold text-rose-900 uppercase">4. Saldo Restante</p>
                      <p className={`text-2xl font-black font-mono ${saldoPendienteCalculado <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        ${saldoPendienteCalculado.toLocaleString("es-CO")}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {saldoPendienteCalculado <= 0 ? "Totalmente cancelado" : "Pendiente para entrega"}
                      </p>
                    </div>
                  </div>

                  {/* Método de Pago y Calculadora si abona hoy dinero */}
                  {totalACobrarHoy > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <p className="text-xs font-bold text-slate-800 uppercase">
                          Dinero a Recibir Hoy en Caja: <strong className="font-mono text-emerald-700">${totalACobrarHoy.toLocaleString("es-CO")}</strong>
                        </p>
                        <span className="text-xs text-slate-500">
                          (Abono: ${abonoNumerico.toLocaleString("es-CO")} {depositoEntregadoHoy ? `+ Depósito: $${depositoNumerico.toLocaleString("es-CO")}` : ""})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Método de Pago del Abono:
                          </label>
                          <select
                            value={metodoPagoAbono}
                            onChange={(e) => setMetodoPagoAbono(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold outline-none"
                          >
                            <option value="EFECTIVO">EFECTIVO</option>
                            <option value="NEQUI">NEQUI</option>
                            <option value="BANCOLOMBIA">BANCOLOMBIA</option>
                            <option value="DAVIPLATA">DAVIPLATA</option>
                            <option value="LLAVE">LLAVE</option>
                            <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                            <option value="CONSIGNACION">CONSIGNACIÓN</option>
                          </select>
                        </div>

                        {metodoPagoAbono === "EFECTIVO" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Efectivo Recibido:
                              </label>
                              <input
                                type="number"
                                placeholder={`$${totalACobrarHoy}`}
                                value={efectivoRecibidoInput}
                                onChange={(e) => setEfectivoRecibidoInput(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Cambio / Vueltas:
                              </label>
                              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-black text-emerald-800">
                                ${vueltasEntregadasCalculadas.toLocaleString("es-CO")}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botones de Confirmación */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPaso(2)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Volver a Prendas
                    </button>

                    <button
                      type="button"
                      disabled={guardando}
                      onClick={procesarGuardadoApartado}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
                    >
                      {guardando ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Guardando Apartado...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar y Expedir FORMATO DE APARTADO
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* PASO 4: FORMATO DE APARTADO (IMPRESIÓN / PDF / CERRAR)         */}
              {/* ============================================================= */}
              {paso === 4 && facturaFinalizada && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Apartado Guardado Exitosamente (N° {facturaFinalizada.numeroFactura})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Previsualiza e imprime el comprobante oficial en Tirilla (80mm), Media Carta o Carta.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={reiniciarOperacionLimpia}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Finalizar y Cerrar Operación
                    </button>
                  </div>

                  {/* Visor Oficial de Impresión */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <PlantillaImpresion
                      datos={{
                        factura: facturaFinalizada,
                        empresa: configuracionEmpresa || {
                          nombreTienda: "LLANOMIO",
                          nombreComercial: "LLANOMIO",
                          eslogan: "Trajes Típicos y Alquileres",
                          nit: "900.123.456-7",
                          direccion: "Calle 15 # 22-30",
                          telefono: "310 123 4567",
                          politicasFactura: "PLATA DE TRAJES APARTADOS NO SE DEVUELVE. El cliente se compromete a retirar las prendas en la fecha acordada.",
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* PESTAÑA: HISTORIAL DE APARTADOS Y CONVERSIÓN A ALQUILER             */
        /* =================================================================== */
        <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6">
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera del Historial con Filtros */}
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-600" />
                    Historial de Apartados y Reservas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Monitorea los apartados pendientes de retiro, registra nuevos abonos o conviértelos en alquiler activo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cargarHistorial}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                    title="Recargar historial"
                  >
                    <RefreshCw className={`w-4 h-4 ${cargandoHistorial ? "animate-spin text-amber-600" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPestaña("NUEVO")}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Apartado
                  </button>
                </div>
              </div>

              {/* Buscador y Selector de Estado */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por N° de apartado, nombre o cédula del cliente..."
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg transition ${
                      filtroEstadoHistorial === "TODOS" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
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
                    Pendientes de Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("CONVERTIDOS")}
                    className={`px-3 py-1 rounded-lg transition ${
                      filtroEstadoHistorial === "CONVERTIDOS" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Convertidos a Alquiler
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="flex-1 overflow-y-auto">
              {cargandoHistorial ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                  Cargando apartados registrados...
                </div>
              ) : apartadosHistorialFiltrados.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm italic">
                  No se encontraron apartados con el filtro seleccionado.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">N° Apartado</th>
                      <th className="py-2.5 px-3">Cliente / Teléfono</th>
                      <th className="py-2.5 px-3">Prendas Separadas</th>
                      <th className="py-2.5 px-3">Fecha Retiro</th>
                      <th className="py-2.5 px-3 text-right">Alquiler</th>
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
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {item.numeroFactura}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {new Date(item.fechaCreacion).toLocaleDateString("es-CO")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">{item.cliente?.nombre}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              {item.cliente?.documento} | {item.cliente?.telefono}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <span className="truncate block font-medium text-slate-700">
                              {item.detalles?.map((d) => `${d.cantidad}x ${d.descripcionLibre || d.producto?.nombre}`).join(", ") || "Prendas"}
                            </span>
                            {item.observaciones && (
                              <span className="text-[10px] text-amber-800 italic block truncate">
                                Nota: {item.observaciones}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {item.fechaRetiroApartado
                              ? new Date(item.fechaRetiroApartado).toLocaleDateString("es-CO")
                              : item.fechaEntregaAlquiler
                              ? new Date(item.fechaEntregaAlquiler).toLocaleDateString("es-CO")
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ${item.totalFactura.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            ${item.totalAbonado.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                            ${item.saldoPendiente.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-center">
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
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Ver Comprobante */}
                              <button
                                type="button"
                                onClick={() => setApartadoParaImpresion(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                title="Ver / Imprimir FORMATO DE APARTADO"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Registrar Abono Extra si aún tiene saldo */}
                              {!esConvertido && item.saldoPendiente > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setApartadoParaAbonar(item)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                  title="Registrar nuevo abono"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Entregar y Convertir a Alquiler */}
                              {!esConvertido && (
                                <button
                                  type="button"
                                  onClick={() => irAConvertirEnAlquiler(item.id)}
                                  className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10.5px] transition flex items-center gap-1"
                                  title="Entregar prendas y convertir en Alquiler en 1 clic"
                                >
                                  <span>Entregar</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
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
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: CREAR CLIENTE RÁPIDO                                      */}
      {/* =================================================================== */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalCrearCliente}
        onClose={() => setMostrarModalCrearCliente(false)}
        onClienteCreado={(nuevoCli: ClienteCreado) => {
          setClientes((prev) => [nuevoCli as ClienteApartado, ...prev]);
          setClienteSeleccionado(nuevoCli as ClienteApartado);
          setMostrarModalCrearCliente(false);
        }}
      />

      {/* =================================================================== */}
      {/* MODAL 2: VER / IMPRIMIR COMPROBANTE DESDE HISTORIAL                */}
      {/* =================================================================== */}
      {apartadoParaImpresion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-600" />
                Comprobante Oficial: {apartadoParaImpresion.numeroFactura}
              </h3>
              <button
                type="button"
                onClick={() => setApartadoParaImpresion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PlantillaImpresion
              datos={{
                factura: apartadoParaImpresion as any,
                empresa: configuracionEmpresa || {
                  nombreTienda: "LLANOMIO",
                  nombreComercial: "LLANOMIO",
                  eslogan: "Trajes Típicos y Alquileres",
                  nit: "900.123.456-7",
                  direccion: "Calle 15 # 22-30",
                  telefono: "310 123 4567",
                  politicasFactura: "PLATA DE TRAJES APARTADOS NO SE DEVUELVE. El cliente se compromete a retirar las prendas en la fecha acordada.",
                },
              }}
              onCerrar={() => setApartadoParaImpresion(null)}
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: REGISTRAR ABONO EXTRA DESDE HISTORIAL                      */}
      {/* =================================================================== */}
      {apartadoParaAbonar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Registrar Abono a Apartado {apartadoParaAbonar.numeroFactura}
              </h3>
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p><strong>Cliente:</strong> {apartadoParaAbonar.cliente?.nombre}</p>
                <p><strong>Total Alquiler:</strong> ${apartadoParaAbonar.totalFactura.toLocaleString("es-CO")}</p>
                <p><strong>Total Abonado Previo:</strong> ${apartadoParaAbonar.totalAbonado.toLocaleString("es-CO")}</p>
                <p className="text-rose-700 font-bold"><strong>Saldo Pendiente:</strong> ${apartadoParaAbonar.saldoPendiente.toLocaleString("es-CO")}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Monto a Abonar ($):
                </label>
                <input
                  type="number"
                  placeholder={`Máximo $${apartadoParaAbonar.saldoPendiente}`}
                  value={montoNuevoAbono}
                  onChange={(e) => setMontoNuevoAbono(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Método de Pago:
                </label>
                <select
                  value={metodoNuevoAbono}
                  onChange={(e) => setMetodoNuevoAbono(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold outline-none"
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="NEQUI">NEQUI</option>
                  <option value="BANCOLOMBIA">BANCOLOMBIA</option>
                  <option value="DAVIPLATA">DAVIPLATA</option>
                  <option value="LLAVE">LLAVE</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="CONSIGNACION">CONSIGNACIÓN</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAbonoExtra}
                onClick={registrarAbonoHistorial}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                {procesandoAbonoExtra ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conexión de Gaveta */}
      <ModalConexionCajon
        abierto={cajon.modalAbierto}
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
        onCerrarModal={cajon.cerrarModal}
      />
    </div>
  );
}
