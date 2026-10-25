"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  User,
  UserPlus,
  UserCheck,
  Plus,
  Trash2,
  Scissors,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Clock,
  Layers,
  Tag,
  FileDown,
  Calendar,
  CalendarClock,
  PackagePlus,
  Wallet,
  Building2,
  Check,
  Users,
  DollarSign,
  AlertTriangle,
  Filter,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalProducto, { ProductoData } from "@/components/inventario/ModalProducto";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import { descargarPdfMediaCarta } from "@/lib/pdf-media-carta";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

export interface ProductoInventario {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER";
  talla?: string | null;
  color?: string | null;
  categoria?: string;
  stockActual: number;
  precioBase?: number;
  precioVenta: number;
  precioAlquilerBase: number;
  estado: string;
  estadoPrenda?: string;
  activo?: boolean;
}

export interface ItemCarrito {
  idTemporal: string;
  productoId: string | null;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER" | "ARREGLO";
  esServicioLibre: boolean;
  descripcionLibre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  fechaEntrega?: string;
  fechaDevolucion?: string;
}

export interface FacturaPendientePos {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  cliente: {
    nombre: string;
    documento: string;
    telefono?: string | null;
  };
  usuarioCajero?: {
    nombre: string;
    username: string;
  };
}

type MetodoPago = "EFECTIVO" | "NEQUI" | "DAVIPLATA" | "TRANSFERENCIA" | "CONSIGNACION";
type ModalidadPago = "COMPLETO" | "ADELANTO" | "PENDIENTE";
type ModuloCarga = "VENTA" | "ALQUILER" | "ARREGLO";
type VistaPos = "NUEVA_FACTURA" | "FACTURAS_PENDIENTES";

// Sugerencias rápidas para arreglos de sastrería
const SUGERENCIAS_ARREGLOS = [
  "Dobladillo / Bota de pantalón",
  "Entalle de chaqueta o prenda",
  "Cambio de cremallera",
  "Ajuste de cintura / pretina",
  "Lavandería / Mantenimiento",
  "Confección a medida",
  "Ajuste de mangas y puños",
  "Refuerzo de costuras",
  "Planchado y almidonado",
  "Bordado o aplique personalizado",
];

// Ayudantes de fecha
const getFechaHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFechaDevolucionSugerida = (diasAdicionales = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + diasAdicionales);
  d.setHours(18, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function PosPage() {
  // =========================================================
  // VISTA PRINCIPAL DEL POS: NUEVA FACTURA vs FACTURAS PENDIENTES
  // =========================================================
  const [vistaPrincipal, setVistaPrincipal] = useState<VistaPos>("NUEVA_FACTURA");

  // =========================================================
  // CONTROL DE PASOS GUIADOS (1 -> 2 -> 3 -> 4)
  // =========================================================
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);

  // =========================================================
  // PASO 1: ESTADO DE CLIENTE (CATÁLOGO COMPLETO + CHIPS FUZZY)
  // =========================================================
  const [todosLosClientes, setTodosLosClientes] = useState<ClienteCreado[]>([]);
  const [cargandoClientesInicial, setCargandoClientesInicial] = useState(false);
  const [clientesNuevosIds, setClientesNuevosIds] = useState<Set<string>>(new Set());
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCreado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [modalDocInicial, setModalDocInicial] = useState("");
  const [modalNomInicial, setModalNomInicial] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================
  // CATÁLOGO DE INVENTARIO COMPLETO (0 ms de latencia local)
  // =========================================================
  const [catalogoInventario, setCatalogoInventario] = useState<ProductoInventario[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // =========================================================
  // PASO 2: MÓDULOS DE CARGA (VENTA, ALQUILER, ARREGLO)
  // =========================================================
  const [moduloActivo, setModuloActivo] = useState<ModuloCarga>("VENTA");

  // Módulo A: Venta directa
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [productoVentaSeleccionado, setProductoVentaSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadVenta, setCantidadVenta] = useState<number>(1);
  const [precioVentaCustom, setPrecioVentaCustom] = useState<string>("");

  // Módulo B: Alquiler con calendario
  const [busquedaAlquiler, setBusquedaAlquiler] = useState("");
  const [productoAlquilerSeleccionado, setProductoAlquilerSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadAlquiler, setCantidadAlquiler] = useState<number>(1);
  const [precioAlquilerCustom, setPrecioAlquilerCustom] = useState<string>("");
  const [fechaSalidaAlquiler, setFechaSalidaAlquiler] = useState<string>(getFechaHoy());
  const [fechaDevolucionAlquiler, setFechaDevolucionAlquiler] = useState<string>(getFechaDevolucionSugerida(2));

  // Módulo C: Arreglo / Servicio libre
  const [busquedaArreglo, setBusquedaArreglo] = useState("");
  const [descArreglo, setDescArreglo] = useState("");
  const [precioArreglo, setPrecioArreglo] = useState<string>("");
  const [cantArreglo, setCantArreglo] = useState<number>(1);

  // Modal para crear producto al vuelo (Venta o Alquiler)
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [tipoModalProducto, setTipoModalProducto] = useState<"VENTA" | "ALQUILER">("VENTA");

  // Carrito unificado
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([]);

  // =========================================================
  // PASO 3: CONDICIÓN DE PAGO Y LIQUIDACIÓN
  // =========================================================
  const [modalidadPago, setModalidadPago] = useState<ModalidadPago>("COMPLETO");
  const [montoAdelantoInput, setMontoAdelantoInput] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [referenciaComprobante, setReferenciaComprobante] = useState("");
  const [notasFactura, setNotasFactura] = useState("");

  // =========================================================
  // PASO 4: EMISIÓN, DATOS MEDIA CARTA Y EXPORTACIÓN
  // =========================================================
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [facturaGuardada, setFacturaGuardada] = useState<any | null>(null);
  const [datosImpresion, setDatosImpresion] = useState<DatosImpresionFactura | null>(null);

  // =========================================================
  // BANDEJA DE FACTURAS PENDIENTES / POR COBRAR
  // =========================================================
  const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendientePos[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [busquedaPendientes, setBusquedaPendientes] = useState("");
  const [filtroTipoPendiente, setFiltroTipoPendiente] = useState<"TODAS" | "ADELANTO" | "SIN_PAGO">("TODAS");
  const [facturaALiquidarId, setFacturaALiquidarId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // =========================================================
  // 1. CARGA COMPLETA INICIAL DE CLIENTES (0 ms latencia)
  // =========================================================
  const cargarClientes = useCallback(async () => {
    try {
      setCargandoClientesInicial(true);
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.success) {
        setTodosLosClientes(data.clientes || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes iniciales:", err);
    } finally {
      setCargandoClientesInicial(false);
    }
  }, []);

  // =========================================================
  // 2. CARGA COMPLETA DE INVENTARIO (0 ms latencia)
  // =========================================================
  const cargarInventario = useCallback(async () => {
    try {
      setCargandoInventario(true);
      const res = await fetch("/api/inventario?tipo=TODOS");
      const data = await res.json();
      if (data.ok) {
        setCatalogoInventario(data.productos || []);
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setCargandoInventario(false);
    }
  }, []);

  // =========================================================
  // 3. CARGA DE FACTURAS PENDIENTES POR COBRAR
  // =========================================================
  const cargarFacturasPendientes = useCallback(async () => {
    try {
      setCargandoPendientes(true);
      const res = await fetch("/api/facturas?pendientes=true");
      const data = await res.json();
      if (data.success) {
        setFacturasPendientes(data.facturas || []);
      }
    } catch (err) {
      console.error("Error al cargar facturas pendientes:", err);
    } finally {
      setCargandoPendientes(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarInventario();
    cargarFacturasPendientes();
  }, [cargarClientes, cargarInventario, cargarFacturasPendientes]);

  // =========================================================
  // FILTRADO DINÁMICO FUZZY EN CLIENTES (useMemo con motor compartido)
  // =========================================================
  const clientesFiltrados = useMemo(() => {
    return filtrarPorRelevancia(todosLosClientes, busquedaCliente, (item) => ({
      primarios: [item.documento, item.nombre],
      secundarios: [item.telefono, item.direccion, item.notas],
    }));
  }, [todosLosClientes, busquedaCliente]);

  // =========================================================
  // PRODUCTOS DE VENTA Y ALQUILER DERIVADOS EN MEMORIA
  // =========================================================
  const productosVenta = useMemo(() => {
    return catalogoInventario.filter((p) => p.tipo === "VENTA" && p.activo !== false);
  }, [catalogoInventario]);

  const productosAlquiler = useMemo(() => {
    return catalogoInventario.filter((p) => p.tipo === "ALQUILER" && p.activo !== false);
  }, [catalogoInventario]);

  // Filtrado dinámico difuso para Venta
  const productosVentaFiltrados = useMemo(() => {
    return filtrarPorRelevancia(productosVenta, busquedaVenta, (item) => ({
      primarios: [item.codigo, item.nombre],
      secundarios: [item.talla, item.color, item.categoria, String(item.precioVenta || item.precioBase || "")],
    }));
  }, [productosVenta, busquedaVenta]);

  // Filtrado dinámico difuso para Alquiler
  const productosAlquilerFiltrados = useMemo(() => {
    return filtrarPorRelevancia(productosAlquiler, busquedaAlquiler, (item) => ({
      primarios: [item.codigo, item.nombre],
      secundarios: [
        item.talla,
        item.color,
        item.categoria,
        item.estado,
        item.estadoPrenda,
        String(item.precioAlquilerBase || item.precioBase || ""),
      ],
    }));
  }, [productosAlquiler, busquedaAlquiler]);

  // Sugerencias de arreglos filtradas
  const sugerenciasArreglosFiltradas = useMemo(() => {
    if (!busquedaArreglo.trim()) return SUGERENCIAS_ARREGLOS;
    return filtrarPorRelevancia(SUGERENCIAS_ARREGLOS, busquedaArreglo, (item) => ({
      primarios: [item],
    }));
  }, [busquedaArreglo]);

  // Filtrado de Facturas Pendientes
  const facturasPendientesFiltradas = useMemo(() => {
    let base = facturasPendientes;

    if (filtroTipoPendiente === "ADELANTO") {
      base = base.filter((f) => f.totalAbonado > 0);
    } else if (filtroTipoPendiente === "SIN_PAGO") {
      base = base.filter((f) => f.totalAbonado === 0);
    }

    return filtrarPorRelevancia(base, busquedaPendientes, (item) => ({
      primarios: [item.numeroFactura, item.cliente?.nombre, item.cliente?.documento],
      secundarios: [item.cliente?.telefono, item.usuarioCajero?.nombre, item.tipoOperacion, String(item.saldoPendiente)],
    }));
  }, [facturasPendientes, busquedaPendientes, filtroTipoPendiente]);

  // =========================================================
  // MANIPULACIÓN DE CLIENTE (PASO 1)
  // =========================================================
  const asignarCliente = (cliente: ClienteCreado) => {
    setClienteSeleccionado(cliente);
    setMensajeError(null);
  };

  const cambiarCliente = () => {
    setClienteSeleccionado(null);
    setPasoActual(1);
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  const abrirModalNuevoCliente = (textoPrellenar = "") => {
    const limpio = textoPrellenar.trim();
    const soloNumeros = limpio.replace(/[^\d]/g, "");

    if (soloNumeros.length >= 4 && soloNumeros.length >= limpio.length * 0.6) {
      setModalDocInicial(limpio);
      setModalNomInicial("");
    } else {
      setModalDocInicial("");
      setModalNomInicial(limpio);
    }
    setMostrarModalCliente(true);
  };

  // =========================================================
  // MÓDULO A: AGREGAR VENTA
  // =========================================================
  const seleccionarProductoVenta = (p: ProductoInventario) => {
    setProductoVentaSeleccionado(p);
    setCantidadVenta(1);
    setPrecioVentaCustom(String(p.precioVenta || p.precioBase || 0));
  };

  const agregarVentaAlCarrito = (productoDirecto?: ProductoInventario) => {
    const p = productoDirecto || productoVentaSeleccionado;
    if (!p) {
      setMensajeError("Seleccione un producto de venta antes de agregar.");
      return;
    }

    const cant = Math.max(1, cantidadVenta);
    const precio = Math.max(0, parseFloat(precioVentaCustom) || p.precioVenta || p.precioBase || 0);

    const nuevoItem: ItemCarrito = {
      idTemporal: `venta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: p.id,
      codigo: p.codigo,
      nombre: p.nombre + (p.talla ? ` (Talla: ${p.talla})` : "") + (p.color ? ` - ${p.color}` : ""),
      tipo: "VENTA",
      esServicioLibre: false,
      cantidad: cant,
      precioUnitario: precio,
      subtotal: Math.round(cant * precio * 100) / 100,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setProductoVentaSeleccionado(null);
    setBusquedaVenta("");
    setCantidadVenta(1);
    setPrecioVentaCustom("");
    setMensajeError(null);
  };

  // =========================================================
  // MÓDULO B: AGREGAR ALQUILER
  // =========================================================
  const seleccionarProductoAlquiler = (p: ProductoInventario) => {
    setProductoAlquilerSeleccionado(p);
    setCantidadAlquiler(1);
    setPrecioAlquilerCustom(String(p.precioAlquilerBase || p.precioBase || 0));
    setFechaSalidaAlquiler(getFechaHoy());
    setFechaDevolucionAlquiler(getFechaDevolucionSugerida(2));
  };

  const agregarAlquilerAlCarrito = () => {
    if (!productoAlquilerSeleccionado) {
      setMensajeError("Seleccione una prenda de alquiler antes de agregar.");
      return;
    }

    if (!fechaDevolucionAlquiler) {
      setMensajeError("Debe indicar la fecha y hora pactada de devolución.");
      return;
    }

    const cant = Math.max(1, cantidadAlquiler);
    const precio = Math.max(0, parseFloat(precioAlquilerCustom) || productoAlquilerSeleccionado.precioAlquilerBase || 0);

    const nuevoItem: ItemCarrito = {
      idTemporal: `alq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: productoAlquilerSeleccionado.id,
      codigo: productoAlquilerSeleccionado.codigo,
      nombre: `[Alquiler] ${productoAlquilerSeleccionado.nombre}` +
        (productoAlquilerSeleccionado.talla ? ` (Talla: ${productoAlquilerSeleccionado.talla})` : "") +
        (productoAlquilerSeleccionado.color ? ` - ${productoAlquilerSeleccionado.color}` : ""),
      tipo: "ALQUILER",
      esServicioLibre: false,
      cantidad: cant,
      precioUnitario: precio,
      subtotal: Math.round(cant * precio * 100) / 100,
      fechaEntrega: fechaSalidaAlquiler,
      fechaDevolucion: fechaDevolucionAlquiler,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setProductoAlquilerSeleccionado(null);
    setBusquedaAlquiler("");
    setCantidadAlquiler(1);
    setPrecioAlquilerCustom("");
    setMensajeError(null);
  };

  // =========================================================
  // MÓDULO C: AGREGAR ARREGLO LIBRE
  // =========================================================
  const agregarArregloAlCarrito = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const descLimpia = descArreglo.trim();
    if (!descLimpia) {
      setMensajeError("Escriba la descripción del arreglo o servicio de sastrería.");
      return;
    }

    const cant = Math.max(1, cantArreglo);
    const precio = Math.max(0, parseFloat(precioArreglo) || 0);

    const nuevoItem: ItemCarrito = {
      idTemporal: `arreglo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: null,
      codigo: "ARREGLO",
      nombre: `[Sastrería] ${descLimpia}`,
      tipo: "ARREGLO",
      esServicioLibre: true,
      descripcionLibre: descLimpia,
      cantidad: cant,
      precioUnitario: precio,
      subtotal: Math.round(cant * precio * 100) / 100,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setDescArreglo("");
    setPrecioArreglo("");
    setCantArreglo(1);
    setBusquedaArreglo("");
    setMensajeError(null);
  };

  // =========================================================
  // CONTROL DEL CARRITO
  // =========================================================
  const actualizarCantidadItem = (idTemporal: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarItem(idTemporal);
      return;
    }
    setItemsCarrito(
      itemsCarrito.map((item) =>
        item.idTemporal === idTemporal
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: Math.round(nuevaCantidad * item.precioUnitario * 100) / 100,
            }
          : item
      )
    );
  };

  const actualizarPrecioItem = (idTemporal: string, nuevoPrecio: number) => {
    const p = Math.max(0, nuevoPrecio);
    setItemsCarrito(
      itemsCarrito.map((item) =>
        item.idTemporal === idTemporal
          ? {
              ...item,
              precioUnitario: p,
              subtotal: Math.round(item.cantidad * p * 100) / 100,
            }
          : item
      )
    );
  };

  const eliminarItem = (idTemporal: string) => {
    setItemsCarrito(itemsCarrito.filter((item) => item.idTemporal !== idTemporal));
  };

  const limpiarVentaCompleta = () => {
    setPasoActual(1);
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setItemsCarrito([]);
    setProductoVentaSeleccionado(null);
    setProductoAlquilerSeleccionado(null);
    setModalidadPago("COMPLETO");
    setMontoAdelantoInput("");
    setReferenciaComprobante("");
    setNotasFactura("");
    setMensajeError(null);
    setFacturaGuardada(null);
    setDatosImpresion(null);
    cargarFacturasPendientes();
  };

  // =========================================================
  // CÁLCULOS MATEMÁTICOS Y TOTALES DE LA FACTURA
  // =========================================================
  const subtotalVenta = Math.round(
    itemsCarrito
      .filter((i) => i.tipo === "VENTA")
      .reduce((acc, curr) => acc + curr.subtotal, 0) * 100
  ) / 100;

  const subtotalAlquiler = Math.round(
    itemsCarrito
      .filter((i) => i.tipo === "ALQUILER")
      .reduce((acc, curr) => acc + curr.subtotal, 0) * 100
  ) / 100;

  const subtotalArreglos = Math.round(
    itemsCarrito
      .filter((i) => i.tipo === "ARREGLO")
      .reduce((acc, curr) => acc + curr.subtotal, 0) * 100
  ) / 100;

  const totalFactura = Math.round((subtotalVenta + subtotalAlquiler + subtotalArreglos) * 100) / 100;

  const tipoOperacionFactura: "VENTA" | "ALQUILER" | "ARREGLO" | "MIXTO" = (() => {
    if (itemsCarrito.length === 0) return "VENTA";
    const tieneV = itemsCarrito.some((i) => i.tipo === "VENTA");
    const tieneA = itemsCarrito.some((i) => i.tipo === "ALQUILER");
    const tieneS = itemsCarrito.some((i) => i.tipo === "ARREGLO");

    let count = 0;
    if (tieneV) count++;
    if (tieneA) count++;
    if (tieneS) count++;

    if (count > 1) return "MIXTO";
    if (tieneA) return "ALQUILER";
    if (tieneS) return "ARREGLO";
    return "VENTA";
  })();

  const abonoCalculado = (() => {
    if (modalidadPago === "COMPLETO") return totalFactura;
    if (modalidadPago === "PENDIENTE") return 0;
    return Math.max(0, parseFloat(montoAdelantoInput) || 0);
  })();

  const saldoPendienteCalculado = Math.max(0, Math.round((totalFactura - abonoCalculado) * 100) / 100);

  // =========================================================
  // PASO 3 -> PASO 4: GUARDAR FACTURA EN SQLITE
  // =========================================================
  const guardarFactura = async () => {
    setMensajeError(null);

    if (!clienteSeleccionado) {
      setMensajeError("Debe seleccionar o registrar un cliente antes de emitir la factura.");
      setPasoActual(1);
      return;
    }

    if (itemsCarrito.length === 0) {
      setMensajeError("Debe agregar al menos un ítem (venta, alquiler o servicio) a la factura.");
      setPasoActual(2);
      return;
    }

    if (modalidadPago === "ADELANTO") {
      const val = parseFloat(montoAdelantoInput) || 0;
      if (val <= 0) {
        setMensajeError("Para la modalidad de Adelanto, el monto debe ser mayor a $0.");
        return;
      }
      if (val >= totalFactura) {
        setMensajeError("El adelanto no puede ser igual o mayor al total. Para cobrar el 100%, seleccione 'Pago Completo'.");
        return;
      }
    }

    try {
      setProcesandoFactura(true);

      const detallesPayload = itemsCarrito.map((item) => ({
        productoId: item.productoId,
        esServicioLibre: item.esServicioLibre,
        descripcionLibre: item.descripcionLibre || null,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        fechaEntrega: item.fechaEntrega || null,
        fechaDevolucion: item.fechaDevolucion || null,
      }));

      const primerItemAlquiler = itemsCarrito.find((i) => i.tipo === "ALQUILER");

      const bodyPayload = {
        clienteId: clienteSeleccionado.id,
        detalles: detallesPayload,
        fechaEntregaAlquiler: primerItemAlquiler?.fechaEntrega || null,
        fechaDevolucionPactada: primerItemAlquiler?.fechaDevolucion || null,
        abonoInicial:
          modalidadPago !== "PENDIENTE" && abonoCalculado > 0
            ? {
                monto: abonoCalculado,
                metodoPago,
                referenciaComprobante: referenciaComprobante.trim() || null,
                notas:
                  modalidadPago === "COMPLETO"
                    ? "Pago completo (100%) en mostrador POS"
                    : "Adelanto parcial recibido en mostrador POS",
              }
            : null,
        notas: notasFactura.trim() || null,
      };

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo procesar la factura en el servidor.");
      }

      setFacturaGuardada(data.factura);

      // Cargar datos formateados para visor Media Carta
      try {
        const resImp = await fetch(`/api/impresion/${data.factura.id}`);
        const dataImp = await resImp.json();
        if (dataImp.success) {
          setDatosImpresion(dataImp);
        }
      } catch (errImp) {
        console.error("Error al cargar datos de impresión:", errImp);
      }

      // Actualizar inventario local si se alquilaron prendas
      cargarInventario();
      cargarFacturasPendientes();

      // Avanzar al Paso 4 de emisión
      setPasoActual(4);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error inesperado al guardar la factura.");
      }
    } finally {
      setProcesandoFactura(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================================= */}
      {/* CONMUTADOR SUPERIOR PROMINENTE (1. NUEVA vs 2. PENDIENTES) */}
      {/* ========================================================= */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Mostrador de Facturación & Caja POS
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Terminal Táctil
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Venta directa, prendas de alquiler con calendario, sastrería libre y liquidación de cartera
            </p>
          </div>
        </div>

        {/* Selector de Vista: Nueva Factura vs Facturas Pendientes */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => setVistaPrincipal("NUEVA_FACTURA")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                vistaPrincipal === "NUEVA_FACTURA"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>1. Nueva Factura</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setVistaPrincipal("FACTURAS_PENDIENTES");
                cargarFacturasPendientes();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                vistaPrincipal === "FACTURAS_PENDIENTES"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>2. Cobrar Facturas Pendientes</span>
              {facturasPendientes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {facturasPendientes.length}
                </span>
              )}
            </button>
          </div>

          {vistaPrincipal === "NUEVA_FACTURA" && (
            <button
              type="button"
              onClick={limpiarVentaCompleta}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition"
              title="Reiniciar factura en curso"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Limpiar Mostrador</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VISTA 1: FLUJO SECUENCIAL DE NUEVA FACTURA (4 PASOS)                      */}
      {/* ========================================================================= */}
      {vistaPrincipal === "NUEVA_FACTURA" && (
        <div className="space-y-6">
          {/* Barra de Progreso Visual de 4 Pasos */}
          <nav aria-label="Progreso de Facturación" className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Paso 1 */}
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left ${
                  pasoActual === 1
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                    : clienteSeleccionado
                    ? "bg-blue-50/60 text-blue-900 border-blue-200 hover:bg-blue-100/50"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    pasoActual === 1
                      ? "bg-white text-blue-600"
                      : clienteSeleccionado
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {clienteSeleccionado ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                    Paso 1
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate block">
                    {clienteSeleccionado ? clienteSeleccionado.nombre : "Identificar Cliente"}
                  </span>
                </div>
              </button>

              {/* Paso 2 */}
              <button
                type="button"
                onClick={() => {
                  if (clienteSeleccionado) setPasoActual(2);
                }}
                disabled={!clienteSeleccionado}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  pasoActual === 2
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                    : itemsCarrito.length > 0
                    ? "bg-blue-50/60 text-blue-900 border-blue-200 hover:bg-blue-100/50"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    pasoActual === 2
                      ? "bg-white text-blue-600"
                      : itemsCarrito.length > 0
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {itemsCarrito.length > 0 ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                    Paso 2
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate block">
                    {itemsCarrito.length > 0
                      ? `${itemsCarrito.length} Ítem(s) [${tipoOperacionFactura}]`
                      : "Productos & Alquiler"}
                  </span>
                </div>
              </button>

              {/* Paso 3 */}
              <button
                type="button"
                onClick={() => {
                  if (clienteSeleccionado && itemsCarrito.length > 0) setPasoActual(3);
                }}
                disabled={!clienteSeleccionado || itemsCarrito.length === 0}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  pasoActual === 3
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                    : facturaGuardada
                    ? "bg-emerald-50/60 text-emerald-900 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    pasoActual === 3
                      ? "bg-white text-emerald-600"
                      : facturaGuardada
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {facturaGuardada ? <Check className="w-4 h-4" /> : "3"}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                    Paso 3
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate block">
                    {itemsCarrito.length > 0 ? `$${totalFactura.toLocaleString("es-CO")}` : "Pago o Adelanto"}
                  </span>
                </div>
              </button>

              {/* Paso 4 */}
              <button
                type="button"
                onClick={() => {
                  if (facturaGuardada) setPasoActual(4);
                }}
                disabled={!facturaGuardada}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  pasoActual === 4
                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20"
                    : facturaGuardada
                    ? "bg-slate-100 text-slate-900 border-slate-300"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    pasoActual === 4
                      ? "bg-white text-slate-900"
                      : facturaGuardada
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  4
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                    Paso 4
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate block">
                    {facturaGuardada ? `Factura N° ${facturaGuardada.numeroFactura}` : "Media Carta / PDF"}
                  </span>
                </div>
              </button>
            </div>
          </nav>

          {/* Mensaje de Alerta Global */}
          {mensajeError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 text-xs sm:text-sm shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{mensajeError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMensajeError(null)}
                className="text-xs font-bold text-rose-900 underline hover:no-underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 1: SELECTOR VISUAL DE CLIENTES POR ETIQUETAS TÁCTILES FUZZY         */}
          {/* ========================================================================= */}
          {pasoActual === 1 && (
            <section aria-labelledby="heading-paso-1" className="space-y-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 max-w-5xl mx-auto">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 id="heading-paso-1" className="text-lg sm:text-xl font-black text-slate-900">
                        Paso 1: Selección de Cliente por Etiquetas Táctiles
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Toque una etiqueta para asignarlo o escriba cualquier fragmento para autofiltrar al instante
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirModalNuevoCliente(busquedaCliente)}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Nuevo Cliente</span>
                  </button>
                </div>

                {/* Buscador Difuso con Contador y Limpieza Rápida */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Buscador flexible por nombre, cédula, teléfono o dirección:</span>
                    <span className="font-semibold text-slate-700">
                      Mostrando {clientesFiltrados.length} de {todosLosClientes.length} clientes
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      autoFocus
                      placeholder="Escriba para filtrar etiquetas (ej. 'juan 311', 'meta', '1121')... Presione Enter para elegir el primero"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (clientesFiltrados.length > 0) {
                            asignarCliente(clientesFiltrados[0]);
                          }
                        }
                      }}
                      className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
                    />
                    {busquedaCliente && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusquedaCliente("");
                          searchInputRef.current?.focus();
                        }}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenedor de Etiquetas / Chips Táctiles de Clientes */}
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                    {cargandoClientesInicial && todosLosClientes.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                        <p>Cargando catálogo completo de clientes...</p>
                      </div>
                    ) : clientesFiltrados.length === 0 ? (
                      <div className="p-6 text-center space-y-3">
                        <p className="text-sm font-semibold text-slate-700">
                          No se encontró ningún cliente que coincida con &quot;{busquedaCliente}&quot;.
                        </p>
                        <button
                          type="button"
                          onClick={() => abrirModalNuevoCliente(busquedaCliente)}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>No se encontró &quot;{busquedaCliente}&quot;. Haz clic aquí para crear este cliente ahora</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto pr-1">
                        {clientesFiltrados.map((c) => {
                          const estaSeleccionado = clienteSeleccionado?.id === c.id;
                          const esNuevo = clientesNuevosIds.has(c.id);
                          const inicial = (c.nombre || "C").trim().charAt(0).toUpperCase();

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => asignarCliente(c)}
                              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition select-none cursor-pointer ${
                                estaSeleccionado
                                  ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-md scale-102"
                                  : "bg-white hover:bg-blue-50/80 border-slate-200/90 text-slate-800 hover:border-blue-300 shadow-xs active:scale-95"
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                  estaSeleccionado
                                    ? "bg-white text-blue-600"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {estaSeleccionado ? <CheckCircle2 className="w-4 h-4" /> : inicial}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs sm:text-sm font-bold truncate max-w-[190px] sm:max-w-[240px]">
                                    {c.nombre}
                                  </span>
                                  {esNuevo && (
                                    <span
                                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                        estaSeleccionado
                                          ? "bg-emerald-400 text-slate-900"
                                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      }`}
                                    >
                                      NUEVO
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`flex items-center gap-2 text-[11px] font-mono ${
                                    estaSeleccionado ? "text-blue-100" : "text-slate-500"
                                  }`}
                                >
                                  <span>C.C: {c.documento}</span>
                                  {c.telefono && <span>• Tel: {c.telefono}</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cliente Actualmente Asignado y Botón Siguiente */}
                {clienteSeleccionado && (
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
                          Cliente Asignado para la Factura
                        </span>
                        <h3 className="text-base font-black text-slate-900">
                          {clienteSeleccionado.nombre}
                        </h3>
                        <p className="text-xs text-slate-600 font-mono">
                          Documento: {clienteSeleccionado.documento}
                          {clienteSeleccionado.telefono ? ` | Tel: ${clienteSeleccionado.telefono}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={cambiarCliente}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasoActual(2)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
                      >
                        <span>Continuar al Paso 2</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: MÓDULOS DE CARGA (VENTA / ALQUILER / ARREGLOS) Y CARRITO MIXTO     */}
          {/* ========================================================================= */}
          {pasoActual === 2 && (
            <section aria-labelledby="heading-paso-2" className="space-y-6">
              {/* Ficha Resumida del Cliente Asignado */}
              {clienteSeleccionado && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-slate-800">
                    <UserCheck className="w-4 h-4 text-blue-700" />
                    <span className="font-bold">{clienteSeleccionado.nombre}</span>
                    <span className="text-slate-500 font-mono">({clienteSeleccionado.documento})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasoActual(1)}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    Cambiar Cliente
                  </button>
                </div>
              )}

              {/* Selector de los 3 Módulos de Operación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Módulo A: Venta Directa */}
                <button
                  type="button"
                  onClick={() => setModuloActivo("VENTA")}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition ${
                    moduloActivo === "VENTA"
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25 ring-2 ring-blue-600/30"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      moduloActivo === "VENTA" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider block opacity-90">
                      Módulo A
                    </span>
                    <span className="text-base font-black block">Venta Directa</span>
                    <p className={`text-xs ${moduloActivo === "VENTA" ? "text-blue-100" : "text-slate-500"}`}>
                      Chips de prendas en catálogo
                    </p>
                  </div>
                </button>

                {/* Módulo B: Alquiler con Calendario */}
                <button
                  type="button"
                  onClick={() => setModuloActivo("ALQUILER")}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition ${
                    moduloActivo === "ALQUILER"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-600/30"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      moduloActivo === "ALQUILER" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <CalendarClock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider block opacity-90">
                      Módulo B
                    </span>
                    <span className="text-base font-black block">Alquiler de Prendas</span>
                    <p className={`text-xs ${moduloActivo === "ALQUILER" ? "text-emerald-100" : "text-slate-500"}`}>
                      Chips de trajes con calendario
                    </p>
                  </div>
                </button>

                {/* Módulo C: Arreglo / Sastrería Libre */}
                <button
                  type="button"
                  onClick={() => setModuloActivo("ARREGLO")}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition ${
                    moduloActivo === "ARREGLO"
                      ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/25 ring-2 ring-purple-600/30"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      moduloActivo === "ARREGLO" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    <Scissors className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider block opacity-90">
                      Módulo C
                    </span>
                    <span className="text-base font-black block">Arreglo / Sastrería</span>
                    <p className={`text-xs ${moduloActivo === "ARREGLO" ? "text-purple-100" : "text-slate-500"}`}>
                      Chips de servicios frecuentes
                    </p>
                  </div>
                </button>
              </div>

              {/* Formulario Activo del Módulo + Panel del Carrito Unificado */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna Izquierda: Formulario del Módulo Activo (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* SUBFORMULARIO MÓDULO A: VENTA DIRECTA CON CHIPS TÁCTILES */}
                  {moduloActivo === "VENTA" && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-blue-600" />
                          <h3 className="text-base font-black text-slate-900">
                            Cargar Ítem de Venta Directa
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoModalProducto("VENTA");
                            setMostrarModalProducto(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          <PackagePlus className="w-4 h-4" />
                          <span>+ Crear Nuevo Producto</span>
                        </button>
                      </div>

                      {/* Buscador Difuso Instantáneo de Venta */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                          <span>Filtrar prendas de venta por código, nombre o talla:</span>
                          <span className="font-semibold text-slate-700">
                            Mostrando {productosVentaFiltrados.length} de {productosVenta.length} prendas
                          </span>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            placeholder="Buscar producto de venta (ej. 'camisa blanca', '001', 'talla M')... Enter para elegir"
                            value={busquedaVenta}
                            onChange={(e) => setBusquedaVenta(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && productosVentaFiltrados.length > 0) {
                                e.preventDefault();
                                seleccionarProductoVenta(productosVentaFiltrados[0]);
                              }
                            }}
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                          {busquedaVenta && (
                            <button
                              type="button"
                              onClick={() => setBusquedaVenta("")}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenedor de Etiquetas / Chips Táctiles de Prendas de Venta */}
                      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                        {productosVentaFiltrados.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                            <p>No se encontraron prendas de venta con &quot;{busquedaVenta}&quot;.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setTipoModalProducto("VENTA");
                                setMostrarModalProducto(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Crear producto de venta ahora</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                            {productosVentaFiltrados.map((p) => {
                              const estaSeleccionado = productoVentaSeleccionado?.id === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => seleccionarProductoVenta(p)}
                                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition select-none cursor-pointer ${
                                    estaSeleccionado
                                      ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-md scale-102"
                                      : "bg-white hover:bg-blue-50/80 border-slate-200 text-slate-800 hover:border-blue-300 shadow-xs active:scale-95"
                                  }`}
                                >
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      estaSeleccionado ? "bg-white text-blue-600" : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold truncate max-w-[140px] sm:max-w-[180px]">
                                        {p.nombre}
                                      </span>
                                      <span
                                        className={`px-1 rounded text-[9px] font-mono ${
                                          estaSeleccionado ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {p.codigo}
                                      </span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 text-[10px] ${
                                        estaSeleccionado ? "text-blue-100" : "text-slate-500"
                                      }`}
                                    >
                                      <span>Talla: {p.talla || "U"}</span>
                                      <strong className={estaSeleccionado ? "text-white" : "text-blue-600 font-mono"}>
                                        ${(p.precioVenta || p.precioBase || 0).toLocaleString("es-CO")}
                                      </strong>
                                      <span>Stock: {p.stockActual}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Panel de Ajuste y Confirmación de Venta */}
                      {productoVentaSeleccionado && (
                        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 animate-in fade-in">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                                Prenda Seleccionada para Venta
                              </span>
                              <h4 className="text-sm sm:text-base font-black text-slate-900">
                                {productoVentaSeleccionado.nombre}
                              </h4>
                              <p className="text-xs text-slate-600 font-mono">
                                Cód: {productoVentaSeleccionado.codigo} | Stock: {productoVentaSeleccionado.stockActual}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProductoVentaSeleccionado(null)}
                              className="text-xs text-slate-400 hover:text-slate-700"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200/60">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={cantidadVenta}
                                onChange={(e) => setCantidadVenta(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-bold text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Precio Unitario ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={precioVentaCustom}
                                onChange={(e) => setPrecioVentaCustom(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-bold text-sm font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => agregarVentaAlCarrito()}
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Venta al Carrito</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBFORMULARIO MÓDULO B: ALQUILER CON CHIPS TÁCTILES Y CALENDARIO */}
                  {moduloActivo === "ALQUILER" && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-5 h-5 text-emerald-600" />
                          <h3 className="text-base font-black text-slate-900">
                            Cargar Prenda de Alquiler con Calendario
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoModalProducto("ALQUILER");
                            setMostrarModalProducto(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>+ Crear Prenda de Alquiler</span>
                        </button>
                      </div>

                      {/* Buscador Difuso Instantáneo de Alquiler */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                          <span>Filtrar trajes/disfraces por código, nombre o color:</span>
                          <span className="font-semibold text-slate-700">
                            Mostrando {productosAlquilerFiltrados.length} de {productosAlquiler.length} trajes
                          </span>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            placeholder="Buscar traje de alquiler (ej. 'traje llanero', 'disfraz', 'gala')... Enter para elegir"
                            value={busquedaAlquiler}
                            onChange={(e) => setBusquedaAlquiler(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && productosAlquilerFiltrados.length > 0) {
                                e.preventDefault();
                                seleccionarProductoAlquiler(productosAlquilerFiltrados[0]);
                              }
                            }}
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                          />
                          {busquedaAlquiler && (
                            <button
                              type="button"
                              onClick={() => setBusquedaAlquiler("")}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenedor de Etiquetas / Chips Táctiles de Trajes de Alquiler */}
                      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                        {productosAlquilerFiltrados.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                            <p>No se encontraron prendas de alquiler con &quot;{busquedaAlquiler}&quot;.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setTipoModalProducto("ALQUILER");
                                setMostrarModalProducto(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Crear prenda de alquiler ahora</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                            {productosAlquilerFiltrados.map((p) => {
                              const estaSeleccionado = productoAlquilerSeleccionado?.id === p.id;
                              const disponible = p.estado === "DISPONIBLE" || p.estadoPrenda === "DISPONIBLE";

                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => seleccionarProductoAlquiler(p)}
                                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition select-none cursor-pointer ${
                                    estaSeleccionado
                                      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-md scale-102"
                                      : "bg-white hover:bg-emerald-50/80 border-slate-200 text-slate-800 hover:border-emerald-300 shadow-xs active:scale-95"
                                  }`}
                                >
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      estaSeleccionado ? "bg-white text-emerald-600" : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    <Tag className="w-3 h-3" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold truncate max-w-[140px] sm:max-w-[180px]">
                                        {p.nombre}
                                      </span>
                                      <span
                                        className={`px-1 rounded text-[9px] font-mono ${
                                          estaSeleccionado ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {p.codigo}
                                      </span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 text-[10px] ${
                                        estaSeleccionado ? "text-emerald-100" : "text-slate-500"
                                      }`}
                                    >
                                      <span>Talla: {p.talla || "U"}</span>
                                      <strong className={estaSeleccionado ? "text-white" : "text-emerald-700 font-mono"}>
                                        ${(p.precioAlquilerBase || p.precioBase || 0).toLocaleString("es-CO")}
                                      </strong>
                                      <span
                                        className={`px-1 rounded-full text-[9px] font-bold uppercase ${
                                          disponible
                                            ? estaSeleccionado ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-700"
                                            : estaSeleccionado ? "bg-amber-800 text-white" : "bg-amber-50 text-amber-700"
                                        }`}
                                      >
                                        {p.estado || "DISP"}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Panel de Fechas y Configuración de Alquiler */}
                      {productoAlquilerSeleccionado && (
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                Prenda Seleccionada para Alquiler
                              </span>
                              <h4 className="text-sm sm:text-base font-black text-slate-900">
                                {productoAlquilerSeleccionado.nombre}
                              </h4>
                              <p className="text-xs text-slate-600 font-mono">
                                Cód: {productoAlquilerSeleccionado.codigo} | Talla: {productoAlquilerSeleccionado.talla || "U"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProductoAlquilerSeleccionado(null)}
                              className="text-xs text-slate-400 hover:text-slate-700"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Tarifa de Alquiler ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={precioAlquilerCustom}
                                onChange={(e) => setPrecioAlquilerCustom(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white font-bold text-sm font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={cantidadAlquiler}
                                onChange={(e) => setCantidadAlquiler(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white font-bold text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Fecha Salida</span>
                              </label>
                              <input
                                type="date"
                                value={fechaSalidaAlquiler}
                                onChange={(e) => setFechaSalidaAlquiler(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-xs sm:text-sm font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-rose-800 uppercase mb-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-rose-600" />
                                <span>Devolución Pactada *</span>
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={fechaDevolucionAlquiler}
                                onChange={(e) => setFechaDevolucionAlquiler(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white text-xs sm:text-sm font-bold text-rose-900"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => agregarAlquilerAlCarrito()}
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Alquiler a la Factura</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBFORMULARIO MÓDULO C: ARREGLO CON CHIPS DE SERVICIOS FRECUENTES */}
                  {moduloActivo === "ARREGLO" && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-5 h-5 text-purple-600" />
                          <h3 className="text-base font-black text-slate-900">
                            Servicio de Sastrería o Arreglo Libre
                          </h3>
                        </div>
                        <span className="text-xs text-purple-600 font-semibold">
                          100% Libre sin inventario
                        </span>
                      </div>

                      {/* Chips Táctiles de Servicios Frecuentes con Autocompletado */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">
                          Etiquetas de Servicios Frecuentes (toque para autocompletar):
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {sugerenciasArreglosFiltradas.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setDescArreglo(sug)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                descArreglo === sug
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                              }`}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Formulario Libre */}
                      <form onSubmit={agregarArregloAlCarrito} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Descripción del Arreglo / Servicio *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Dobladillo de pantalón, cambio de cremallera o entalle"
                            value={descArreglo}
                            onChange={(e) => setDescArreglo(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={cantArreglo}
                              onChange={(e) => setCantArreglo(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-3 py-2 rounded-xl border border-purple-300 font-bold text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Precio del Servicio ($) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              required
                              placeholder="Ej. 15000"
                              value={precioArreglo}
                              onChange={(e) => setPrecioArreglo(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-purple-300 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Arreglo a la Factura</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Carrito Unificado Mixto (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-slate-800" />
                      <h3 className="text-base font-black text-slate-900">
                        Carrito Actual ({itemsCarrito.length})
                      </h3>
                    </div>
                    {itemsCarrito.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border">
                        {tipoOperacionFactura}
                      </span>
                    )}
                  </div>

                  {/* Lista de Ítems del Carrito */}
                  {itemsCarrito.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">El carrito se encuentra vacío</p>
                      <p className="text-[11px] text-slate-400">
                        Use los módulos de la izquierda para agregar ventas, alquileres o arreglos.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1 space-y-2">
                      {itemsCarrito.map((item) => (
                        <div key={item.idTemporal} className="pt-2 first:pt-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                    item.tipo === "VENTA"
                                      ? "bg-blue-100 text-blue-800"
                                      : item.tipo === "ALQUILER"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {item.tipo}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 truncate">
                                  {item.nombre}
                                </h5>
                              </div>
                              {item.fechaDevolucion && (
                                <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                  Devolución: {new Date(item.fechaDevolucion).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => eliminarItem(item.idTemporal)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Eliminar ítem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 text-[11px]">Cant:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) =>
                                  actualizarCantidadItem(item.idTemporal, parseInt(e.target.value) || 1)
                                }
                                className="w-12 px-1.5 py-0.5 rounded border border-slate-200 text-center font-bold text-xs"
                              />
                              <span className="text-slate-400">x</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={item.precioUnitario}
                                onChange={(e) =>
                                  actualizarPrecioItem(item.idTemporal, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-1.5 py-0.5 rounded border border-slate-200 text-right font-mono text-xs"
                              />
                            </div>
                            <strong className="font-mono text-xs font-black text-slate-900">
                              ${item.subtotal.toLocaleString("es-CO")}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumen de Totales del Carrito */}
                  {itemsCarrito.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                      {subtotalVenta > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal Venta:</span>
                          <span className="font-mono">${subtotalVenta.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalAlquiler > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal Alquiler:</span>
                          <span className="font-mono">${subtotalAlquiler.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalArreglos > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal Sastrería:</span>
                          <span className="font-mono">${subtotalArreglos.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                        <span>TOTAL FACTURA:</span>
                        <span className="font-mono text-base text-blue-600">
                          ${totalFactura.toLocaleString("es-CO")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPasoActual(3)}
                        className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
                      >
                        <span>Continuar al Paso 3 (Definir Pago)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* PASO 3: CONDICIÓN DE PAGO Y LIQUIDACIÓN EN MOSTRADOR                      */}
          {/* ========================================================================= */}
          {pasoActual === 3 && (
            <section aria-labelledby="heading-paso-3" className="space-y-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 max-w-4xl mx-auto">
                <div className="border-b border-slate-100 pb-4">
                  <h2 id="heading-paso-3" className="text-lg sm:text-xl font-black text-slate-900">
                    Paso 3: Definición del Estado de Pago
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Seleccione si el cliente cancela el 100%, deja un adelanto parcial o queda pendiente por pagar ($0)
                  </p>
                </div>

                {/* 3 Tarjetas de Modalidad de Pago */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Opción 1: Pago Completo */}
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadPago("COMPLETO");
                      setMontoAdelantoInput("");
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                      modalidadPago === "COMPLETO"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-600/30"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-90">
                        Opción 1
                      </span>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-base font-black block">Pago Completo</span>
                      <span className="text-xs opacity-90">Cancela el 100% hoy</span>
                      <strong className="text-lg font-mono font-black block mt-2">
                        ${totalFactura.toLocaleString("es-CO")}
                      </strong>
                    </div>
                  </button>

                  {/* Opción 2: Adelanto Parcial */}
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadPago("ADELANTO");
                      if (!montoAdelantoInput) {
                        setMontoAdelantoInput(String(Math.round(totalFactura * 0.5)));
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                      modalidadPago === "ADELANTO"
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-600/30"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-90">
                        Opción 2
                      </span>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-base font-black block">Adelanto / Abono</span>
                      <span className="text-xs opacity-90">Pago parcial con saldo</span>
                      <strong className="text-lg font-mono font-black block mt-2">
                        {modalidadPago === "ADELANTO" && abonoCalculado > 0
                          ? `$${abonoCalculado.toLocaleString("es-CO")}`
                          : "Abono a convenir"}
                      </strong>
                    </div>
                  </button>

                  {/* Opción 3: Pendiente por Pagar ($0) */}
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadPago("PENDIENTE");
                      setMontoAdelantoInput("");
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                      modalidadPago === "PENDIENTE"
                        ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20 ring-2 ring-slate-800/30"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-90">
                        Opción 3
                      </span>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-base font-black block">Pendiente por Pagar</span>
                      <span className="text-xs opacity-90">$0 abono inicial</span>
                      <strong className="text-lg font-mono font-black block mt-2">
                        Saldo: ${totalFactura.toLocaleString("es-CO")}
                      </strong>
                    </div>
                  </button>
                </div>

                {/* Input de Monto de Adelanto (Si aplica) */}
                {modalidadPago === "ADELANTO" && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-blue-900 uppercase">
                      Monto del Adelanto / Abono Inicial (COP):
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={totalFactura - 1}
                        value={montoAdelantoInput}
                        onChange={(e) => setMontoAdelantoInput(e.target.value)}
                        placeholder="Ej. 50000"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-blue-300 font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      {[0.3, 0.5, 0.7].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setMontoAdelantoInput(String(Math.round(totalFactura * pct)))}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          {pct * 100}% (${Math.round(totalFactura * pct).toLocaleString("es-CO")})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Métodos de Pago (Si abona > 0) */}
                {modalidadPago !== "PENDIENTE" && abonoCalculado > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Método de Pago para el Abono:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                        { id: "NEQUI", label: "Nequi", icon: Smartphone },
                        { id: "DAVIPLATA", label: "Daviplata", icon: Wallet },
                        { id: "TRANSFERENCIA", label: "Transf.", icon: CreditCard },
                        { id: "CONSIGNACION", label: "Consig.", icon: Building2 },
                      ].map((item) => {
                        const Icon = item.icon;
                        const seleccionado = metodoPago === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMetodoPago(item.id as MetodoPago)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition gap-1.5 ${
                              seleccionado
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {metodoPago !== "EFECTIVO" && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          N° de Aprobación o Comprobante (Opcional):
                        </label>
                        <input
                          type="text"
                          value={referenciaComprobante}
                          onChange={(e) => setReferenciaComprobante(e.target.value)}
                          placeholder="Ej. N° de transferencia o ID de transacción Nequi"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen Financiero en Vivo */}
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Factura</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      ${totalFactura.toLocaleString("es-CO")}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                      Abono Inmediato
                    </span>
                    <span className="text-base font-black font-mono text-emerald-700">
                      ${abonoCalculado.toLocaleString("es-CO")}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      saldoPendienteCalculado > 0
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold block">Saldo Pendiente</span>
                    <span className="text-base font-black font-mono">
                      ${saldoPendienteCalculado.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {/* Observaciones de la Factura */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Observaciones / Notas de la Factura (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones de entrega, especificaciones de arreglos o acuerdos de pago"
                    value={notasFactura}
                    onChange={(e) => setNotasFactura(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>

                {/* Botones de Navegación del Paso 3 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasoActual(2)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver al Paso 2 (Modificar Ítems)</span>
                  </button>

                  <button
                    type="button"
                    onClick={guardarFactura}
                    disabled={procesandoFactura}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition"
                  >
                    {procesandoFactura ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Guardando Factura...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Finalizar y Guardar Factura</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* PASO 4: EMISIÓN, MEDIA CARTA, EXPORTACIÓN A PDF E IMPRESIÓN              */}
          {/* ========================================================================= */}
          {pasoActual === 4 && datosImpresion && (
            <section aria-labelledby="heading-paso-4" className="space-y-6">
              <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/20 text-white">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 id="heading-paso-4" className="text-lg sm:text-xl font-black">
                      Factura N° {datosImpresion.factura.numeroFactura} Generada Exitosamente
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100">
                      Cliente: <strong>{datosImpresion.factura.cliente.nombre}</strong> (Doc: {datosImpresion.factura.cliente.documento}) | Saldo Pendiente: ${datosImpresion.factura.saldoPendiente.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => descargarPdfMediaCarta(datosImpresion)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-emerald-800 hover:bg-emerald-50 shadow-sm transition"
                  >
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    <span>Descargar PDF Media Carta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir en Media Carta</span>
                  </button>

                  <button
                    type="button"
                    onClick={limpiarVentaCompleta}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Iniciar Siguiente Factura / Limpiar</span>
                  </button>
                </div>
              </div>

              {/* Plantilla de Impresión Media Carta Embebida */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
                <PlantillaImpresion datos={datosImpresion} />
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: BANDEJA DE FACTURAS POR COBRAR / PAGOS PENDIENTES                */}
      {/* ========================================================================= */}
      {vistaPrincipal === "FACTURAS_PENDIENTES" && (
        <section aria-labelledby="heading-pendientes" className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="heading-pendientes" className="text-lg sm:text-xl font-black text-slate-900">
                    Bandeja de Facturas por Cobrar / Saldos Pendientes
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Seleccione cualquier factura pendiente para liquidar el saldo total o registrar un nuevo abono
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cargarFacturasPendientes}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoPendientes ? "animate-spin" : ""}`} />
                <span>Actualizar Lista</span>
              </button>
            </div>

            {/* Filtros Rápidos y Buscador Difuso */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroTipoPendiente("TODAS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filtroTipoPendiente === "TODAS"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todas ({facturasPendientes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoPendiente("ADELANTO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filtroTipoPendiente === "ADELANTO"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Con Adelanto Parcial
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoPendiente("SIN_PAGO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filtroTipoPendiente === "SIN_PAGO"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Sin Pago Inicial ($0)
                </button>
              </div>

              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Fuzzy: cliente, documento, teléfono, N° factura..."
                  value={busquedaPendientes}
                  onChange={(e) => setBusquedaPendientes(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {busquedaPendientes && (
                  <button
                    type="button"
                    onClick={() => setBusquedaPendientes("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Listado de Facturas Pendientes */}
            <div className="space-y-3">
              {cargandoPendientes ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                  <p>Cargando facturas pendientes de cobro...</p>
                </div>
              ) : facturasPendientesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <h4 className="text-sm font-bold text-slate-800">
                    No hay facturas pendientes con los filtros actuales
                  </h4>
                  <p className="text-xs text-slate-400">
                    Todas las obligaciones en esta categoría se encuentran al día o liquidadas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {facturasPendientesFiltradas.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-md transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            N° {f.numeroFactura}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {f.tipoOperacion}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {f.cliente?.nombre || "Cliente Mostrador"}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">
                            C.C: {f.cliente?.documento || "N/A"}
                            {f.cliente?.telefono ? ` | Tel: ${f.cliente.telefono}` : ""}
                          </p>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Fecha: {new Date(f.fechaCreacion).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                            {f.usuarioCajero?.nombre ? ` • Emisor: ${f.usuarioCajero.nombre}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Total Factura:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ${f.totalFactura?.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Abonado hasta ahora:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            ${f.totalAbonado?.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs p-2 rounded-lg bg-rose-50 border border-rose-200">
                          <span className="font-bold text-rose-800">Saldo Pendiente:</span>
                          <span className="font-mono font-black text-sm text-rose-700">
                            ${f.saldoPendiente?.toLocaleString("es-CO")}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFacturaALiquidarId(f.id);
                            setModalLiquidarAbierto(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Cobrar Saldo / Liquidar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALES AUXILIARES                                                        */}
      {/* ========================================================================= */}

      {/* Modal 1: Creación Rápida de Cliente */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalCliente}
        onClose={() => setMostrarModalCliente(false)}
        documentoInicial={modalDocInicial}
        nombreInicial={modalNomInicial}
        onClienteCreado={(cliente) => {
          setTodosLosClientes((prev) => [cliente, ...prev.filter((c) => c.id !== cliente.id)]);
          setClientesNuevosIds((prev) => new Set(prev).add(cliente.id));
          asignarCliente(cliente);
          setBusquedaCliente("");
          setMostrarModalCliente(false);
        }}
      />

      {/* Modal 2: Creación Rápida de Producto al Vuelo (Venta o Alquiler) */}
      <ModalProducto
        isOpen={mostrarModalProducto}
        onClose={() => setMostrarModalProducto(false)}
        tipoInicial={tipoModalProducto}
        onSaved={(productoCreado) => {
          if (productoCreado) {
            const nuevoProd: ProductoInventario = {
              id: productoCreado.id,
              codigo: productoCreado.codigo,
              nombre: productoCreado.nombre,
              tipo: productoCreado.tipo as "VENTA" | "ALQUILER",
              talla: productoCreado.talla,
              color: productoCreado.color,
              stockActual: productoCreado.stockActual,
              precioBase: productoCreado.precioBase,
              precioVenta: productoCreado.precioVenta || productoCreado.precioBase,
              precioAlquilerBase: productoCreado.precioAlquilerBase || productoCreado.precioBase,
              estado: productoCreado.estado,
            };

            setCatalogoInventario((prev) => [nuevoProd, ...prev]);

            if (tipoModalProducto === "VENTA") {
              seleccionarProductoVenta(nuevoProd);
              setModuloActivo("VENTA");
            } else {
              seleccionarProductoAlquiler(nuevoProd);
              setModuloActivo("ALQUILER");
            }
          }
          setMostrarModalProducto(false);
        }}
      />

      {/* Modal 3: Liquidación de Facturas Pendientes y Emisión de Paz y Salvo */}
      <ModalLiquidarFactura
        facturaId={facturaALiquidarId}
        isOpen={modalLiquidarAbierto}
        onClose={() => {
          setModalLiquidarAbierto(false);
          setFacturaALiquidarId(null);
        }}
        onFacturaLiquidada={() => {
          cargarFacturasPendientes();
          cargarInventario();
        }}
      />
    </div>
  );
}
