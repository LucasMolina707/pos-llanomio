"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  User,
  UserPlus,
  Plus,
  Trash2,
  Scissors,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  FileText,
  Clock,
  Layers,
  Tag,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";

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
  tipo: "VENTA" | "ALQUILER" | "SASTRERIA";
  esServicioLibre: boolean;
  descripcionLibre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

type MetodoPago = "EFECTIVO" | "NEQUI" | "DAVIPLATA" | "TRANSFERENCIA";

export default function PosPage() {
  // 1. Estado de Cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCreado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState<ClienteCreado[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const clienteSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 2. Estado de Inventario y Búsqueda
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productosSugeridos, setProductosSugeridos] = useState<ProductoInventario[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const productoSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 3. Estado de Sastrería Libre
  const [mostrarFormSastreria, setMostrarFormSastreria] = useState(false);
  const [descSastreria, setDescSastreria] = useState("");
  const [precioSastreria, setPrecioSastreria] = useState<string>("");
  const [cantSastreria, setCantSastreria] = useState<number>(1);

  // 4. Estado de Carrito de Facturación
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([]);

  // 5. Estado de Liquidación, Abonos y Pago
  const [montoAbono, setMontoAbono] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [referenciaComprobante, setReferenciaComprobante] = useState("");
  const [notasFactura, setNotasFactura] = useState("");
  const [estadoDeseado, setEstadoDeseado] = useState<"ACTIVA" | "EN_PROCESO">("ACTIVA");

  // 6. Estado de Procesamiento y Modal de Impresión
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [facturaGuardada, setFacturaGuardada] = useState<any | null>(null);
  const [mostrarModalExito, setMostrarModalExito] = useState(false);

  // Búsqueda reactiva de clientes
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

  // Búsqueda reactiva de productos en inventario
  useEffect(() => {
    if (!busquedaProducto.trim()) {
      setProductosSugeridos([]);
      return;
    }

    if (productoSearchTimeout.current) clearTimeout(productoSearchTimeout.current);

    productoSearchTimeout.current = setTimeout(async () => {
      try {
        setBuscandoProductos(true);
        const res = await fetch(`/api/inventario?q=${encodeURIComponent(busquedaProducto.trim())}`);
        const data = await res.json();
        if (data.success) {
          setProductosSugeridos(data.productos || []);
        }
      } catch (err) {
        console.error("Error al buscar productos:", err);
      } finally {
        setBuscandoProductos(false);
      }
    }, 250);

    return () => {
      if (productoSearchTimeout.current) clearTimeout(productoSearchTimeout.current);
    };
  }, [busquedaProducto]);

  // Agregar producto desde el catálogo
  const agregarProductoAlCarrito = (producto: ProductoInventario) => {
    const precioBase = producto.tipo === "VENTA" ? producto.precioVenta : producto.precioAlquilerBase;

    // Verificar si ya está en el carrito
    const existeIndex = itemsCarrito.findIndex((item) => item.productoId === producto.id);

    if (existeIndex >= 0) {
      const itemsNuevos = [...itemsCarrito];
      const itemExistente = itemsNuevos[existeIndex];
      const nuevaCantidad = itemExistente.cantidad + 1;
      itemsNuevos[existeIndex] = {
        ...itemExistente,
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * itemExistente.precioUnitario,
      };
      setItemsCarrito(itemsNuevos);
    } else {
      const nuevoItem: ItemCarrito = {
        idTemporal: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: `${producto.nombre} ${producto.talla ? `[T: ${producto.talla}]` : ""} ${
          producto.color ? `(${producto.color})` : ""
        }`,
        tipo: producto.tipo,
        esServicioLibre: false,
        cantidad: 1,
        precioUnitario: precioBase,
        subtotal: precioBase,
      };
      setItemsCarrito([...itemsCarrito, nuevoItem]);
    }

    setBusquedaProducto("");
    setProductosSugeridos([]);
  };

  // Agregar servicio de sastrería libre
  const agregarSastreriaLibre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descSastreria.trim()) return;

    const valor = parseFloat(precioSastreria) || 0;
    const cant = Math.max(1, cantSastreria);

    const nuevoItem: ItemCarrito = {
      idTemporal: `sast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productoId: null,
      codigo: "SASTRERIA",
      nombre: descSastreria.trim().toUpperCase(),
      tipo: "SASTRERIA",
      esServicioLibre: true,
      descripcionLibre: descSastreria.trim().toUpperCase(),
      cantidad: cant,
      precioUnitario: valor,
      subtotal: valor * cant,
    };

    setItemsCarrito([...itemsCarrito, nuevoItem]);
    setDescSastreria("");
    setPrecioSastreria("");
    setCantSastreria(1);
    setMostrarFormSastreria(false);
  };

  // Modificar cantidad o precio de un ítem
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
    if (itemsCarrito.length > 0 && !confirm("¿Está seguro de limpiar la factura en curso?")) {
      return;
    }
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setItemsCarrito([]);
    setMontoAbono("");
    setReferenciaComprobante("");
    setNotasFactura("");
    setMensajeError(null);
  };

  // Cálculos matemáticos en vivo
  const subtotalProductos = Math.round(
    itemsCarrito
      .filter((i) => !i.esServicioLibre)
      .reduce((acc, curr) => acc + curr.subtotal, 0) * 100
  ) / 100;

  const subtotalSastreria = Math.round(
    itemsCarrito
      .filter((i) => i.esServicioLibre)
      .reduce((acc, curr) => acc + curr.subtotal, 0) * 100
  ) / 100;

  const totalFactura = Math.round((subtotalProductos + subtotalSastreria) * 100) / 100;

  const abonoNumerico = Math.max(0, parseFloat(montoAbono) || 0);
  const saldoPendiente = Math.max(0, Math.round((totalFactura - abonoNumerico) * 100) / 100);

  // Atajos rápidos para montos de abono
  const fijarAbonoTotal = () => setMontoAbono(String(totalFactura));
  const fijarAbonoMitad = () => setMontoAbono(String(Math.round(totalFactura / 2)));
  const fijarAbonoMonto = (m: number) => setMontoAbono(String(m));

  // Guardar factura en el servidor
  const guardarFactura = async () => {
    setMensajeError(null);

    if (!clienteSeleccionado) {
      setMensajeError("Debe seleccionar o registrar un cliente para emitir la factura");
      return;
    }

    if (itemsCarrito.length === 0) {
      setMensajeError("Agregue al menos una prenda o arreglo de sastrería al carrito");
      return;
    }

    try {
      setProcesandoFactura(true);

      const detallesPayload = itemsCarrito.map((item) => ({
        productoId: item.productoId,
        esServicioLibre: item.esServicioLibre,
        descripcionLibre: item.descripcionLibre || null,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      }));

      const bodyPayload = {
        clienteId: clienteSeleccionado.id,
        detalles: detallesPayload,
        abonoInicial:
          abonoNumerico > 0
            ? {
                monto: abonoNumerico,
                metodoPago,
                referenciaComprobante: referenciaComprobante.trim() || null,
                notas: "Abono inicial en mostrador POS",
              }
            : null,
        estadoInicial: estadoDeseado,
        notas: notasFactura.trim() || null,
      };

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la factura");
      }

      setFacturaGuardada(data.factura);
      setMostrarModalExito(true);

      // Limpiar formulario para la siguiente venta
      setClienteSeleccionado(null);
      setBusquedaCliente("");
      setItemsCarrito([]);
      setMontoAbono("");
      setReferenciaComprobante("");
      setNotasFactura("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error imprevisto al guardar la factura");
      }
    } finally {
      setProcesandoFactura(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera Principal de Caja */}
        <header className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  LLANOMIO
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Mostrador POS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Punto de Venta Dinámico, Alquiler de Trajes y Sastrería Libre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={limpiarVentaCompleta}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpiar / Nueva Factura</span>
            </button>
          </div>
        </header>

        {/* Mensaje de Alerta Global */}
        {mensajeError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 text-sm shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{mensajeError}</span>
            </div>
            <button
              onClick={() => setMensajeError(null)}
              className="text-xs font-semibold underline hover:text-rose-950"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Layout Principal de 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: Clientes, Buscador y Carrito (7 cols)  */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Selector y Búsqueda de Cliente */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  Cliente de la Venta
                </span>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setBusquedaCliente("");
                    }}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Cambiar Cliente
                  </button>
                )}
              </div>

              {clienteSeleccionado ? (
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {clienteSeleccionado.nombre}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Doc: <span className="font-mono font-medium">{clienteSeleccionado.documento}</span>
                      {clienteSeleccionado.telefono && ` | Tel: ${clienteSeleccionado.telefono}`}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Asignado
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar cliente por Cédula, NIT o Nombre..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarModalCliente(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition shadow-sm"
                      title="Registrar nuevo cliente al vuelo"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nuevo Cliente</span>
                    </button>
                  </div>

                  {/* Lista flotante de clientes encontrados */}
                  {clientesSugeridos.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {clientesSugeridos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(c);
                            setBusquedaCliente("");
                            setClientesSugeridos([]);
                          }}
                          className="w-full text-left p-3 hover:bg-amber-50/80 dark:hover:bg-slate-700/60 transition flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {c.nombre}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              C.C: {c.documento} {c.telefono ? `| Tel: ${c.telefono}` : ""}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Buscador de Prendas e Inserción de Sastrería */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  Catálogo & Servicios
                </span>

                <button
                  type="button"
                  onClick={() => setMostrarFormSastreria(!mostrarFormSastreria)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    mostrarFormSastreria
                      ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                      : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60 hover:bg-purple-100"
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Añadir Arreglo de Sastrería Libre</span>
                </button>
              </div>

              {/* Formulario Desplegable de Sastrería Libre */}
              {mostrarFormSastreria && (
                <form
                  onSubmit={agregarSastreriaLibre}
                  className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />
                      Nuevo Servicio de Sastrería / Arreglo sin Inventario
                    </h2>
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      Precio y concepto libre
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Descripción del Arreglo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Ajuste de bota de pantalón"
                        value={descSastreria}
                        onChange={(e) => setDescSastreria(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor del Servicio ($) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="100"
                        placeholder="Ej. 15000"
                        value={precioSastreria}
                        onChange={(e) => setPrecioSastreria(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Buscador de Productos por Código o Nombre */}
              <div className="relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Escanear Código de Barras o buscar prenda por nombre..."
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>

                {/* Lista Flotante de Resultados de Inventario */}
                {productosSugeridos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {productosSugeridos.map((p) => {
                      const precio = p.tipo === "VENTA" ? p.precioVenta : p.precioAlquilerBase;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => agregarProductoAlCarrito(p)}
                          className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {p.codigo}
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {p.nombre}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                  p.tipo === "VENTA"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                }`}
                              >
                                {p.tipo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {p.talla && `Talla: ${p.talla} | `}
                              {p.color && `Color: ${p.color} | `}
                              Stock: {p.stockActual}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                              ${precio.toLocaleString("es-CO")}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {p.tipo === "ALQUILER" ? "Tarifa base" : "Precio unitario"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Tabla del Carrito de la Venta */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Ítems en Factura ({itemsCarrito.length})
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Prendas de venta, alquiler y sastrería
                </span>
              </div>

              {itemsCarrito.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    El carrito está vacío
                  </h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Escanea un producto con el lector de código de barras, búscalo en el catálogo o agrega un arreglo libre de sastrería.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Concepto / Prenda</th>
                        <th className="px-3 py-2.5 text-center">Tipo</th>
                        <th className="px-3 py-2.5 text-center w-24">Cant.</th>
                        <th className="px-3 py-2.5 text-right">Precio Unit.</th>
                        <th className="px-3 py-2.5 text-right">Subtotal</th>
                        <th className="px-3 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {itemsCarrito.map((item) => (
                        <tr key={item.idTemporal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {item.nombre}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.codigo}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                item.tipo === "VENTA"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : item.tipo === "ALQUILER"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              }`}
                            >
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                actualizarCantidadItem(
                                  item.idTemporal,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-14 text-center py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.esServicioLibre ? (
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={item.precioUnitario}
                                onChange={(e) =>
                                  actualizarPrecioItem(
                                    item.idTemporal,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 text-right py-1 px-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 text-xs font-bold text-purple-700 dark:text-purple-300"
                              />
                            ) : (
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                ${item.precioUnitario.toLocaleString("es-CO")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                            ${item.subtotal.toLocaleString("es-CO")}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarItem(item.idTemporal)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Eliminar ítem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMNA DERECHA: Resumen de Totales y Abonos (5 cols)     */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Tarjeta de Liquidación de Totales */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-500" />
                Resumen de Liquidación
              </span>

              <div className="space-y-2.5 text-xs sm:text-sm divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="flex justify-between items-center pt-1 text-slate-600 dark:text-slate-400">
                  <span>Subtotal Prendas / Inventario:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${subtotalProductos.toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
                    <Scissors className="w-3.5 h-3.5" />
                    Subtotal Sastrería Libre:
                  </span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                    ${subtotalSastreria.toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  <span>TOTAL FACTURA:</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    ${totalFactura.toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Abono Inmediato:</span>
                  <span>-${abonoNumerico.toLocaleString("es-CO")}</span>
                </div>

                <div
                  className={`flex justify-between items-center pt-3 p-3 rounded-xl ${
                    saldoPendiente > 0
                      ? "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
                      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                    Saldo Pendiente:
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold font-mono">
                    ${saldoPendiente.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Sección de Abono y Métodos de Pago */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-500" />
                Abono Parcial o Pago Completo
              </span>

              {/* Botones de Selección Rápida de Abono */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={fijarAbonoTotal}
                  className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                >
                  100% Total
                </button>
                <button
                  type="button"
                  onClick={fijarAbonoMitad}
                  className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                >
                  50% Mitad
                </button>
                <button
                  type="button"
                  onClick={() => fijarAbonoMonto(20000)}
                  className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                >
                  $20.000
                </button>
                <button
                  type="button"
                  onClick={() => fijarAbonoMonto(50000)}
                  className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                >
                  $50.000
                </button>
              </div>

              {/* Input de Monto de Abono */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monto a Pagar / Abonar ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    $
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              {/* Botones de Selección de Método de Pago */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Método de Pago del Abono
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago("EFECTIVO")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                      metodoPago === "EFECTIVO"
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago("NEQUI")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                      metodoPago === "NEQUI"
                        ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Nequi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago("DAVIPLATA")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                      metodoPago === "DAVIPLATA"
                        ? "bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Daviplata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago("TRANSFERENCIA")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                      metodoPago === "TRANSFERENCIA"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              {/* Referencia o Comprobante (opcional) */}
              {metodoPago !== "EFECTIVO" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Comprobante / Aprobación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. NQ-8921820"
                    value={referenciaComprobante}
                    onChange={(e) => setReferenciaComprobante(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Notas de la Factura */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Notas de la Venta
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de entrega, especificaciones de arreglos, etc."
                  value={notasFactura}
                  onChange={(e) => setNotasFactura(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Selector de Estado de Factura */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Estado al Guardar:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEstadoDeseado("ACTIVA")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      estadoDeseado === "ACTIVA"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Activa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoDeseado("EN_PROCESO")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      estadoDeseado === "EN_PROCESO"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    En Proceso
                  </button>
                </div>
              </div>

              {/* Botón Principal de Guardar e Imprimir */}
              <button
                type="button"
                onClick={guardarFactura}
                disabled={procesandoFactura || itemsCarrito.length === 0}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-extrabold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/30 disabled:opacity-50 disabled:pointer-events-none transition"
              >
                {procesandoFactura ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Guardando Factura...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span>Guardar Factura / Imprimir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro Rápido de Cliente */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalCliente}
        onClose={() => setMostrarModalCliente(false)}
        documentoInicial={busquedaCliente}
        onClienteCreado={(cliente) => {
          setClienteSeleccionado(cliente);
          setBusquedaCliente("");
        }}
      />

      {/* Modal de Factura Guardada y Comprobante */}
      {mostrarModalExito && facturaGuardada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold">Factura Registrada con Éxito</h2>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    N° {facturaGuardada.numeroFactura}
                  </p>
                </div>
              </div>
            </div>

            {/* Tirilla de Resumen */}
            <div className="p-6 space-y-4 text-xs sm:text-sm font-mono">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <h3 className="font-sans text-base font-black text-slate-900 dark:text-white">
                  TIENDA LLANOMIO
                </h3>
                <p className="text-xs text-slate-500">Mostrador & Sastrería Principal</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {facturaGuardada.numeroFactura}
                </p>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-400">
                <p>
                  <strong className="text-slate-900 dark:text-white">Cliente:</strong>{" "}
                  {facturaGuardada.cliente?.nombre}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Cédula:</strong>{" "}
                  {facturaGuardada.cliente?.documento}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Estado:</strong>{" "}
                  {facturaGuardada.estado}
                </p>
              </div>

              {/* Desglose de Ítems */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                      <th className="py-1 text-left">Cant</th>
                      <th className="py-1 text-left">Descripción</th>
                      <th className="py-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {facturaGuardada.detalles?.map((d: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1">{d.cantidad}</td>
                        <td className="py-1">
                          {d.esServicioLibre
                            ? `[SASTRERÍA] ${d.descripcionLibre}`
                            : d.producto?.nombre || "Prenda"}
                        </td>
                        <td className="py-1 text-right">${d.subtotal?.toLocaleString("es-CO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales y Saldo */}
              <div className="pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-right">
                <p>
                  Total Factura:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    ${facturaGuardada.totalFactura?.toLocaleString("es-CO")}
                  </strong>
                </p>
                <p className="text-emerald-600 font-bold">
                  Abonado: -${facturaGuardada.totalAbonado?.toLocaleString("es-CO")}
                </p>
                <p className="text-base font-black text-rose-600 pt-1">
                  Saldo Pendiente: ${facturaGuardada.saldoPendiente?.toLocaleString("es-CO")}
                </p>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMostrarModalExito(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cerrar y Nueva Venta
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Tirilla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
