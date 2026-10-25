"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
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
  Info,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalProducto from "@/components/inventario/ModalProducto";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import { descargarPdfMediaCarta } from "@/lib/pdf-media-carta";

interface ProductoInventario {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER";
  talla?: string | null;
  color?: string | null;
  stockActual: number;
  precioVenta: number;
  precioAlquilerBase: number;
  estado: string;
}

interface ItemCarrito {
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

type MetodoPago = "EFECTIVO" | "NEQUI" | "DAVIPLATA" | "TRANSFERENCIA" | "CONSIGNACION";
type ModalidadPago = "COMPLETO" | "ADELANTO" | "PENDIENTE";
type ModuloCarga = "VENTA" | "ALQUILER" | "ARREGLO";

// Sugerencias rápidas para arreglos de sastrería
const SUGERENCIAS_ARREGLOS = [
  "Entalle de chaqueta",
  "Dobladillo de pantalón",
  "Mantenimiento de traje",
  "Ajuste de mangas",
  "Cambio de cremallera",
  "Planchado y almidonado",
  "Refuerzo de costuras",
  "Bordado o aplique",
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
  // CONTROL DE PASOS GUIADOS (1 -> 2 -> 3 -> 4)
  // =========================================================
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);

  // =========================================================
  // PASO 1: ESTADO DE CLIENTE
  // =========================================================
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCreado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState<ClienteCreado[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const clienteSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // =========================================================
  // PASO 2: MÓDULOS DE CARGA (VENTA, ALQUILER, ARREGLO)
  // =========================================================
  const [moduloActivo, setModuloActivo] = useState<ModuloCarga>("VENTA");

  // Módulo A: Venta directa
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [productosVentaSugeridos, setProductosVentaSugeridos] = useState<ProductoInventario[]>([]);
  const [buscandoVenta, setBuscandoVenta] = useState(false);
  const [productoVentaSeleccionado, setProductoVentaSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadVenta, setCantidadVenta] = useState<number>(1);
  const [precioVentaCustom, setPrecioVentaCustom] = useState<string>("");
  const ventaSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Módulo B: Alquiler con calendario
  const [busquedaAlquiler, setBusquedaAlquiler] = useState("");
  const [productosAlquilerSugeridos, setProductosAlquilerSugeridos] = useState<ProductoInventario[]>([]);
  const [buscandoAlquiler, setBuscandoAlquiler] = useState(false);
  const [productoAlquilerSeleccionado, setProductoAlquilerSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadAlquiler, setCantidadAlquiler] = useState<number>(1);
  const [precioAlquilerCustom, setPrecioAlquilerCustom] = useState<string>("");
  const [fechaSalidaAlquiler, setFechaSalidaAlquiler] = useState<string>(getFechaHoy());
  const [fechaDevolucionAlquiler, setFechaDevolucionAlquiler] = useState<string>(getFechaDevolucionSugerida(2));
  const alquilerSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Módulo C: Arreglo / Servicio libre
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
  // BÚSQUEDA REACTIVA DE CLIENTES (Paso 1)
  // =========================================================
  useEffect(() => {
    if (!busquedaCliente.trim() || clienteSeleccionado) {
      setClientesSugeridos([]);
      return;
    }

    if (clienteSearchTimeout.current) clearTimeout(clienteSearchTimeout.current);

    clienteSearchTimeout.current = setTimeout(async () => {
      try {
        setBuscandoClientes(true);
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(busquedaCliente.trim())}`);
        const data = await res.json();
        if (data.success) {
          setClientesSugeridos(data.clientes || []);
        }
      } catch (err) {
        console.error("Error al buscar clientes:", err);
      } finally {
        setBuscandoClientes(false);
      }
    }, 250);

    return () => {
      if (clienteSearchTimeout.current) clearTimeout(clienteSearchTimeout.current);
    };
  }, [busquedaCliente, clienteSeleccionado]);

  // =========================================================
  // BÚSQUEDA REACTIVA DE PRODUCTOS DE VENTA (Paso 2 - Módulo A)
  // =========================================================
  useEffect(() => {
    if (!busquedaVenta.trim()) {
      setProductosVentaSugeridos([]);
      return;
    }

    if (ventaSearchTimeout.current) clearTimeout(ventaSearchTimeout.current);

    ventaSearchTimeout.current = setTimeout(async () => {
      try {
        setBuscandoVenta(true);
        const res = await fetch(`/api/inventario?q=${encodeURIComponent(busquedaVenta.trim())}`);
        const data = await res.json();
        if (data.ok) {
          // Filtrar o priorizar productos de venta
          setProductosVentaSugeridos(data.productos || []);
        }
      } catch (err) {
        console.error("Error al buscar productos de venta:", err);
      } finally {
        setBuscandoVenta(false);
      }
    }, 250);

    return () => {
      if (ventaSearchTimeout.current) clearTimeout(ventaSearchTimeout.current);
    };
  }, [busquedaVenta]);

  // =========================================================
  // BÚSQUEDA REACTIVA DE PRENDAS DE ALQUILER (Paso 2 - Módulo B)
  // =========================================================
  useEffect(() => {
    if (!busquedaAlquiler.trim()) {
      setProductosAlquilerSugeridos([]);
      return;
    }

    if (alquilerSearchTimeout.current) clearTimeout(alquilerSearchTimeout.current);

    alquilerSearchTimeout.current = setTimeout(async () => {
      try {
        setBuscandoAlquiler(true);
        const res = await fetch(`/api/inventario?q=${encodeURIComponent(busquedaAlquiler.trim())}`);
        const data = await res.json();
        if (data.ok) {
          setProductosAlquilerSugeridos(data.productos || []);
        }
      } catch (err) {
        console.error("Error al buscar prendas de alquiler:", err);
      } finally {
        setBuscandoAlquiler(false);
      }
    }, 250);

    return () => {
      if (alquilerSearchTimeout.current) clearTimeout(alquilerSearchTimeout.current);
    };
  }, [busquedaAlquiler]);

  // =========================================================
  // MANIPULACIÓN DE CLIENTE (PASO 1)
  // =========================================================
  const asignarCliente = (cliente: ClienteCreado) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente("");
    setClientesSugeridos([]);
    setMensajeError(null);
    // Avance automático al Paso 2
    setPasoActual(2);
  };

  const cambiarCliente = () => {
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setPasoActual(1);
  };

  // =========================================================
  // MÓDULO A: AGREGAR VENTA
  // =========================================================
  const seleccionarProductoVenta = (p: ProductoInventario) => {
    setProductoVentaSeleccionado(p);
    setCantidadVenta(1);
    setPrecioVentaCustom(String(p.precioVenta || p.precioAlquilerBase || 0));
    setBusquedaVenta("");
    setProductosVentaSugeridos([]);
  };

  const agregarVentaAlCarrito = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productoVentaSeleccionado) return;

    const cant = Math.max(1, cantidadVenta);
    const precioUnit = Math.max(0, parseFloat(precioVentaCustom) || 0);

    // Revisar si ya existe en el carrito
    const existeIndex = itemsCarrito.findIndex(
      (item) => item.productoId === productoVentaSeleccionado.id && item.tipo === "VENTA"
    );

    if (existeIndex >= 0) {
      const actualizados = [...itemsCarrito];
      const itemExistente = actualizados[existeIndex];
      const nuevaCant = itemExistente.cantidad + cant;
      actualizados[existeIndex] = {
        ...itemExistente,
        cantidad: nuevaCant,
        subtotal: Math.round(nuevaCant * itemExistente.precioUnitario * 100) / 100,
      };
      setItemsCarrito(actualizados);
    } else {
      const nuevoItem: ItemCarrito = {
        idTemporal: `venta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productoId: productoVentaSeleccionado.id,
        codigo: productoVentaSeleccionado.codigo,
        nombre: `${productoVentaSeleccionado.nombre} ${
          productoVentaSeleccionado.talla ? `[T: ${productoVentaSeleccionado.talla}]` : ""
        } ${productoVentaSeleccionado.color ? `(${productoVentaSeleccionado.color})` : ""}`.trim(),
        tipo: "VENTA",
        esServicioLibre: false,
        descripcionLibre: `[VENTA] ${productoVentaSeleccionado.nombre}`,
        cantidad: cant,
        precioUnitario: precioUnit,
        subtotal: Math.round(cant * precioUnit * 100) / 100,
      };
      setItemsCarrito([...itemsCarrito, nuevoItem]);
    }

    setProductoVentaSeleccionado(null);
    setPrecioVentaCustom("");
    setCantidadVenta(1);
  };

  // =========================================================
  // MÓDULO B: AGREGAR ALQUILER
  // =========================================================
  const seleccionarProductoAlquiler = (p: ProductoInventario) => {
    setProductoAlquilerSeleccionado(p);
    setCantidadAlquiler(1);
    setPrecioAlquilerCustom(String(p.precioAlquilerBase || p.precioVenta || 0));
    setBusquedaAlquiler("");
    setProductosAlquilerSugeridos([]);
  };

  const agregarAlquilerAlCarrito = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productoAlquilerSeleccionado) return;

    if (!fechaDevolucionAlquiler) {
      setMensajeError("Debe indicar la fecha y hora de entrega/devolución para el alquiler.");
      return;
    }

    const cant = Math.max(1, cantidadAlquiler);
    const precioUnit = Math.max(0, parseFloat(precioAlquilerCustom) || 0);

    const fSalidaStr = fechaSalidaAlquiler || getFechaHoy();
    const fDevolucionStr = new Date(fechaDevolucionAlquiler).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const descAlquiler = `[ALQUILER] ${productoAlquilerSeleccionado.nombre} (Salida: ${fSalidaStr} ➔ Devolución: ${fDevolucionStr})`;

    const nuevoItem: ItemCarrito = {
      idTemporal: `alq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: productoAlquilerSeleccionado.id,
      codigo: productoAlquilerSeleccionado.codigo,
      nombre: `${productoAlquilerSeleccionado.nombre} ${
        productoAlquilerSeleccionado.talla ? `[T: ${productoAlquilerSeleccionado.talla}]` : ""
      } ${productoAlquilerSeleccionado.color ? `(${productoAlquilerSeleccionado.color})` : ""}`.trim(),
      tipo: "ALQUILER",
      esServicioLibre: false,
      descripcionLibre: descAlquiler,
      cantidad: cant,
      precioUnitario: precioUnit,
      subtotal: Math.round(cant * precioUnit * 100) / 100,
      fechaEntrega: fechaSalidaAlquiler,
      fechaDevolucion: fechaDevolucionAlquiler,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setProductoAlquilerSeleccionado(null);
    setPrecioAlquilerCustom("");
    setCantidadAlquiler(1);
    setMensajeError(null);
  };

  // =========================================================
  // MÓDULO C: AGREGAR ARREGLO / SASTRERÍA LIBRE
  // =========================================================
  const agregarArregloAlCarrito = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!descArreglo.trim()) {
      setMensajeError("Escriba la descripción o seleccione una sugerencia para el servicio libre.");
      return;
    }

    const valor = parseFloat(precioArreglo) || 0;
    const cant = Math.max(1, cantArreglo);

    const nuevoItem: ItemCarrito = {
      idTemporal: `arr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: null,
      codigo: "SERVICIO",
      nombre: descArreglo.trim().toUpperCase(),
      tipo: "ARREGLO",
      esServicioLibre: true,
      descripcionLibre: descArreglo.trim().toUpperCase(),
      cantidad: cant,
      precioUnitario: valor,
      subtotal: Math.round(valor * cant * 100) / 100,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setDescArreglo("");
    setPrecioArreglo("");
    setCantArreglo(1);
    setMensajeError(null);
  };

  // =========================================================
  // MODIFICAR Y ELIMINAR ÍTEMS DEL CARRITO
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
    if (itemsCarrito.length > 0 && !confirm("¿Está seguro de reiniciar la factura en curso? Se perderán los ítems cargados.")) {
      return;
    }
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
  };

  // =========================================================
  // CÁLCULOS MATEMÁTICOS Y CLASIFICACIÓN DE FACTURA
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

  // Clasificación dinámica del tipo de operación
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

  // Cálculo del abono y saldo pendiente en vivo
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

      // Buscar si hay fechas de alquiler en los ítems
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

      // Cargar datos estructurados para visor Media Carta
      try {
        const resImp = await fetch(`/api/impresion/${data.factura.id}`);
        const dataImp = await resImp.json();
        if (dataImp.success) {
          setDatosImpresion(dataImp);
        }
      } catch (errImp) {
        console.error("Error al cargar datos de impresión:", errImp);
      }

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

  // =========================================================
  // RENDERIZADO VISUAL
  // =========================================================
  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal y Control de Nueva Factura */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Mostrador de Ventas & Facturación
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Terminal POS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Flujo Guiado: Cliente ➔ Carga Mixta (Venta / Alquiler / Arreglos) ➔ Pago o Adelanto ➔ Factura Media Carta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={limpiarVentaCompleta}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Nueva Factura / Limpiar</span>
          </button>
        </div>
      </header>

      {/* Barra de Progreso Visual de 4 Pasos */}
      <nav aria-label="Progreso de Facturación" className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Paso 1 */}
          <button
            type="button"
            onClick={() => setPasoActual(1)}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition text-left ${
              pasoActual === 1
                ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                : clienteSeleccionado
                ? "bg-amber-50/60 text-amber-900 border-amber-200 hover:bg-amber-100/50"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                pasoActual === 1
                  ? "bg-white text-amber-600"
                  : clienteSeleccionado
                  ? "bg-amber-600 text-white"
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
      {/* VISTA DEL PASO 1: SELECCIÓN O REGISTRO DE CLIENTE                         */}
      {/* ========================================================================= */}
      {pasoActual === 1 && (
        <section aria-labelledby="heading-paso-1" className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="heading-paso-1" className="text-lg sm:text-xl font-black text-slate-900">
                    Paso 1: Identificación o Registro del Cliente
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Obligatorio para vincular la orden de venta, los contratos de alquiler y las garantías de devolución
                  </p>
                </div>
              </div>
            </div>

            {clienteSeleccionado ? (
              /* Ficha de Cliente Asignado */
              <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-700" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {clienteSeleccionado.nombre}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Cliente Asignado
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Cédula / NIT: <span className="font-mono font-bold text-slate-900">{clienteSeleccionado.documento}</span>
                    {clienteSeleccionado.telefono && ` | Teléfono: ${clienteSeleccionado.telefono}`}
                  </p>
                  {clienteSeleccionado.direccion && (
                    <p className="text-xs text-slate-500">Dirección: {clienteSeleccionado.direccion}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={cambiarCliente}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition"
                  >
                    Cambiar Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasoActual(2)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
                  >
                    <span>Continuar al Paso 2</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Buscador y Botón de Creación Rápida */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por Cédula, NIT, Nombre o Teléfono..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-xs"
                    />
                    {buscandoClientes && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-amber-600 text-xs font-semibold">
                        Buscando...
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarModalCliente(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition shrink-0"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>+ Agregar Nuevo Cliente</span>
                  </button>
                </div>

                {/* Lista de Sugerencias de Clientes */}
                {clientesSugeridos.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {clientesSugeridos.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => asignarCliente(c)}
                        className="w-full text-left p-3.5 hover:bg-amber-50/70 transition flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700">
                            {c.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            Cédula / NIT: <span className="font-mono font-semibold">{c.documento}</span>
                            {c.telefono ? ` | Tel: ${c.telefono}` : ""}
                            {c.direccion ? ` | ${c.direccion}` : ""}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                          <span>Seleccionar</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {busquedaCliente.trim() && !buscandoClientes && clientesSugeridos.length === 0 && (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-700">
                      No se encontró ningún cliente registrado con el criterio: &quot;{busquedaCliente}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => setMostrarModalCliente(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Registrar a &quot;{busquedaCliente}&quot; Ahora Mismo</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* VISTA DEL PASO 2: TRES MÓDULOS DE CARGA Y CARRITO MIXTO                  */}
      {/* ========================================================================= */}
      {pasoActual === 2 && (
        <section aria-labelledby="heading-paso-2" className="space-y-6">
          {/* Ficha Resumida del Cliente Asignado */}
          {clienteSeleccionado && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-800">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span className="font-bold">{clienteSeleccionado.nombre}</span>
                <span className="text-slate-500 font-mono">({clienteSeleccionado.documento})</span>
              </div>
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className="text-xs font-bold text-amber-800 hover:underline"
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
                  Prendas de venta y accesorios
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
                  Con calendario de devolución
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
                  Formato libre sin inventario
                </p>
              </div>
            </button>
          </div>

          {/* Formulario Activo del Módulo + Panel del Carrito Unificado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Formulario del Módulo Activo (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* ------------------------------------------------------------- */}
              {/* SUBFORMULARIO MÓDULO A: VENTA DIRECTA                         */}
              {/* ------------------------------------------------------------- */}
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
                      title="Crear producto nuevo en catálogo sin salir del mostrador"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>+ Crear Nuevo Producto</span>
                    </button>
                  </div>

                  {/* Buscador de Producto de Venta */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar producto por Código o Nombre..."
                      value={busquedaVenta}
                      onChange={(e) => setBusquedaVenta(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />

                    {/* Dropdown de Resultados */}
                    {productosVentaSugeridos.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {productosVentaSugeridos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => seleccionarProductoVenta(p)}
                            className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900">{p.nombre}</p>
                              <p className="text-xs text-slate-500">
                                Cód: <span className="font-mono font-bold">{p.codigo}</span>
                                {p.talla ? ` | Talla: ${p.talla}` : ""}
                                {p.color ? ` | Color: ${p.color}` : ""}
                                {` | Stock: ${p.stockActual}`}
                              </p>
                            </div>
                            <span className="text-sm font-black text-blue-600 font-mono">
                              ${(p.precioVenta || p.precioAlquilerBase).toLocaleString("es-CO")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Panel de Ajuste del Producto Seleccionado */}
                  {productoVentaSeleccionado ? (
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 animate-in fade-in">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            Producto Seleccionado
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-slate-900">
                            {productoVentaSeleccionado.nombre}
                          </h4>
                          <p className="text-xs text-slate-600 font-mono">
                            Cód: {productoVentaSeleccionado.codigo} | Stock disponible: {productoVentaSeleccionado.stockActual}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/60">
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
                            className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-bold text-sm"
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
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                      Busque y seleccione un producto arriba, o créelo rápidamente con el botón &quot;+ Crear Nuevo Producto&quot;.
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SUBFORMULARIO MÓDULO B: ALQUILER CON CALENDARIO              */}
              {/* ------------------------------------------------------------- */}
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
                      title="Registrar una nueva prenda de alquiler en inventario"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>+ Crear Prenda de Alquiler</span>
                    </button>
                  </div>

                  {/* Buscador de Prenda de Alquiler */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar traje o prenda de alquiler por código o nombre..."
                      value={busquedaAlquiler}
                      onChange={(e) => setBusquedaAlquiler(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />

                    {/* Dropdown de Resultados */}
                    {productosAlquilerSugeridos.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {productosAlquilerSugeridos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => seleccionarProductoAlquiler(p)}
                            className="w-full text-left p-3 hover:bg-emerald-50/70 transition flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900">{p.nombre}</p>
                              <p className="text-xs text-slate-500">
                                Cód: <span className="font-mono font-bold">{p.codigo}</span>
                                {p.talla ? ` | Talla: ${p.talla}` : ""}
                                {p.color ? ` | Color: ${p.color}` : ""}
                                {` | Disp: ${p.stockActual}`}
                              </p>
                            </div>
                            <span className="text-sm font-black text-emerald-600 font-mono">
                              ${(p.precioAlquilerBase || p.precioVenta).toLocaleString("es-CO")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Panel de Fechas y Tarifa de Alquiler */}
                  {productoAlquilerSeleccionado ? (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Prenda Seleccionada
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

                      {/* Tarifa y Cantidad */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Tarifa del Alquiler ($) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={precioAlquilerCustom}
                            onChange={(e) => setPrecioAlquilerCustom(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white font-bold text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Cantidad de Prendas
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

                      {/* Calendario de Entrega / Devolución */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fecha de Salida / Despacho</span>
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
                            <span>Fecha y Hora de Devolución *</span>
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
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                      Busque el traje o prenda de alquiler arriba para configurar la fecha de entrega y hora pactada de devolución.
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SUBFORMULARIO MÓDULO C: ARREGLO O COSTURA LIBRE               */}
              {/* ------------------------------------------------------------- */}
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

                  {/* Chips de Sugerencias Rápidas */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                      Sugerencias Rápidas de Arreglos (clic para autocompletar):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGERENCIAS_ARREGLOS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setDescArreglo(sug)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
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
                        Descripción Detallada del Arreglo / Servicio *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Entalle de chaqueta y dobladillo de pantalón"
                        value={descArreglo}
                        onChange={(e) => setDescArreglo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          required
                          min="0"
                          step="100"
                          placeholder="Ej. 25000"
                          value={precioArreglo}
                          onChange={(e) => setPrecioArreglo(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 font-bold text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Servicio a la Factura</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Columna Derecha: Tabla de Carrito Mixto Unificado (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Carrito de Facturación ({itemsCarrito.length})
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      tipoOperacionFactura === "MIXTO"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : tipoOperacionFactura === "ALQUILER"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : tipoOperacionFactura === "ARREGLO"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}
                  >
                    {tipoOperacionFactura}
                  </span>
                </div>

                {itemsCarrito.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">El carrito está vacío</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Use los módulos A, B o C para agregar productos de venta, alquileres o servicios libres.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {itemsCarrito.map((item) => (
                      <div key={item.idTemporal} className="p-3.5 hover:bg-slate-50 transition space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                                  item.tipo === "VENTA"
                                    ? "bg-blue-100 text-blue-800"
                                    : item.tipo === "ALQUILER"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {item.tipo}
                              </span>
                              <span className="text-xs font-bold text-slate-900 leading-tight">
                                {item.nombre}
                              </span>
                            </div>
                            {item.descripcionLibre && item.tipo === "ALQUILER" && (
                              <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                {item.descripcionLibre}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarItem(item.idTemporal)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[11px]">Cant:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                actualizarCantidadItem(item.idTemporal, parseInt(e.target.value) || 1)
                              }
                              className="w-12 text-center py-0.5 border rounded font-bold text-xs"
                            />
                            <span className="text-slate-400">×</span>
                            <span className="font-mono text-slate-700">
                              ${item.precioUnitario.toLocaleString("es-CO")}
                            </span>
                          </div>

                          <span className="font-black text-slate-900 font-mono">
                            ${item.subtotal.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotales y Total del Carrito */}
                {itemsCarrito.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                    {subtotalVenta > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Venta Directa:</span>
                        <span className="font-mono font-bold">${subtotalVenta.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {subtotalAlquiler > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Subtotal Alquileres:</span>
                        <span className="font-mono font-bold">${subtotalAlquiler.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {subtotalArreglos > 0 && (
                      <div className="flex justify-between text-purple-700 font-semibold">
                        <span>Subtotal Sastrería Libre:</span>
                        <span className="font-mono font-bold">${subtotalArreglos.toLocaleString("es-CO")}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                      <span>TOTAL A COBRAR:</span>
                      <span className="text-lg font-mono text-blue-600">
                        ${totalFactura.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPasoActual(3)}
                      className="w-full mt-3 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
                    >
                      <span>Continuar al Paso 3: Pago o Adelanto</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* VISTA DEL PASO 3: CONDICIÓN DE PAGO (COMPLETO, ADELANTO O PENDIENTE)       */}
      {/* ========================================================================= */}
      {pasoActual === 3 && (
        <section aria-labelledby="heading-paso-3" className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="heading-paso-3" className="text-lg sm:text-xl font-black text-slate-900">
                    Paso 3: Definición del Estado de Pago y Liquidación
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Defina si el cliente paga la totalidad, abona un adelanto parcial o queda 100% pendiente
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase font-bold block">Total a Liquidar</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                  ${totalFactura.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* 3 Tarjetas Excluyentes de Modalidad de Pago */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Opción 1: Pago Completo */}
              <button
                type="button"
                onClick={() => setModalidadPago("COMPLETO")}
                className={`p-4 rounded-xl border text-left transition relative ${
                  modalidadPago === "COMPLETO"
                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-emerald-800">
                    1. Pago Completo (100%)
                  </span>
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      modalidadPago === "COMPLETO" ? "text-emerald-600" : "text-slate-300"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-600 leading-tight">
                  Se cancela la totalidad de la factura hoy. Saldo pendiente queda en <strong>$0</strong>.
                </p>
              </button>

              {/* Opción 2: Adelanto Parcial */}
              <button
                type="button"
                onClick={() => {
                  setModalidadPago("ADELANTO");
                  if (!montoAdelantoInput) {
                    setMontoAdelantoInput(String(Math.round(totalFactura / 2)));
                  }
                }}
                className={`p-4 rounded-xl border text-left transition relative ${
                  modalidadPago === "ADELANTO"
                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-amber-800">
                    2. Dejó Adelanto / Abono
                  </span>
                  <Wallet
                    className={`w-5 h-5 ${
                      modalidadPago === "ADELANTO" ? "text-amber-600" : "text-slate-300"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-600 leading-tight">
                  El cliente entrega un anticipo hoy y cancela el saldo pendiente contra entrega o devolución.
                </p>
              </button>

              {/* Opción 3: Pendiente por Pagar ($0 Adelanto) */}
              <button
                type="button"
                onClick={() => setModalidadPago("PENDIENTE")}
                className={`p-4 rounded-xl border text-left transition relative ${
                  modalidadPago === "PENDIENTE"
                    ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-rose-800">
                    3. Pendiente por Pagar ($0)
                  </span>
                  <Clock
                    className={`w-5 h-5 ${
                      modalidadPago === "PENDIENTE" ? "text-rose-600" : "text-slate-300"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-600 leading-tight">
                  Abono inicial de <strong>$0</strong>. El 100% queda registrado como saldo pendiente en proceso.
                </p>
              </button>
            </div>

            {/* Configuración Dinámica según la Modalidad Seleccionada */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              {/* Campo de Adelanto Numérico si seleccionó Modalidad 2 */}
              {modalidadPago === "ADELANTO" && (
                <div className="space-y-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Valor del Adelanto / Abono Recibido ($) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                      $
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      placeholder="Ej. 50000"
                      value={montoAdelantoInput}
                      onChange={(e) => setMontoAdelantoInput(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-amber-300 bg-white text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Chips rápidos de monto */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMontoAdelantoInput(String(Math.round(totalFactura * 0.5)))}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      50% (${Math.round(totalFactura * 0.5).toLocaleString("es-CO")})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMontoAdelantoInput("20000")}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      $20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setMontoAdelantoInput("50000")}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      $50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setMontoAdelantoInput("100000")}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      $100.000
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Método de Pago (si hay ingreso de dinero) */}
              {modalidadPago !== "PENDIENTE" && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Método de Pago del Dinero Recibido
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("EFECTIVO")}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        metodoPago === "EFECTIVO"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago("NEQUI")}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        metodoPago === "NEQUI"
                          ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Nequi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago("DAVIPLATA")}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        metodoPago === "DAVIPLATA"
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Daviplata</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago("TRANSFERENCIA")}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        metodoPago === "TRANSFERENCIA"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Transf.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago("CONSIGNACION")}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        metodoPago === "CONSIGNACION"
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Consign.</span>
                    </button>
                  </div>

                  {metodoPago !== "EFECTIVO" && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Número de Aprobación o Comprobante
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. NQ-890214 / Aprobación bancaria"
                        value={referenciaComprobante}
                        onChange={(e) => setReferenciaComprobante(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
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
                  placeholder="Detalles de entrega, instrucciones de lavado o especificaciones especiales"
                  value={notasFactura}
                  onChange={(e) => setNotasFactura(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            {/* Acciones de Navegación del Paso 3 */}
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
                    <span>Generar y Guardar Factura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* VISTA DEL PASO 4: EMISIÓN, MEDIA CARTA, EXPORTACIÓN A PDF E IMPRESIÓN      */}
      {/* ========================================================================= */}
      {pasoActual === 4 && datosImpresion && (
        <section aria-labelledby="heading-paso-4" className="space-y-6">
          {/* Barra de Confirmación y Acciones Rápidas */}
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
              {/* Botón Descargar / Exportar PDF Media Carta */}
              <button
                type="button"
                onClick={() => descargarPdfMediaCarta(datosImpresion)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-emerald-800 hover:bg-emerald-50 shadow-sm transition"
                title="Descargar archivo PDF oficial en tamaño Media Carta"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Descargar PDF Media Carta</span>
              </button>

              {/* Botón Imprimir Nativo */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir en Media Carta</span>
              </button>

              {/* Botón Nueva Venta */}
              <button
                type="button"
                onClick={limpiarVentaCompleta}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>

          {/* Plantilla de Impresión Media Carta Embebida */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
            <PlantillaImpresion datos={datosImpresion} />
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
        documentoInicial={busquedaCliente}
        onClienteCreado={(cliente) => {
          asignarCliente(cliente);
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
            if (tipoModalProducto === "VENTA") {
              seleccionarProductoVenta({
                id: productoCreado.id,
                codigo: productoCreado.codigo,
                nombre: productoCreado.nombre,
                tipo: "VENTA",
                talla: productoCreado.talla,
                color: productoCreado.color,
                stockActual: productoCreado.stockActual,
                precioVenta: productoCreado.precioVenta || productoCreado.precioBase,
                precioAlquilerBase: 0,
                estado: productoCreado.estado,
              });
              setModuloActivo("VENTA");
            } else {
              seleccionarProductoAlquiler({
                id: productoCreado.id,
                codigo: productoCreado.codigo,
                nombre: productoCreado.nombre,
                tipo: "ALQUILER",
                talla: productoCreado.talla,
                color: productoCreado.color,
                stockActual: productoCreado.stockActual,
                precioVenta: 0,
                precioAlquilerBase: productoCreado.precioAlquilerBase || productoCreado.precioBase,
                estado: productoCreado.estado,
              });
              setModuloActivo("ALQUILER");
            }
          }
          setMostrarModalProducto(false);
        }}
      />
    </div>
  );
}
