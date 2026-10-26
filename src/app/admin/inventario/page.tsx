"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  CheckCircle,
  Clock,
  Wrench,
  Ban,
  Edit,
  Trash2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  AlertTriangle,
  X,
  Layers,
  Palette,
} from "lucide-react";
import ModalProducto, { ProductoData } from "@/components/inventario/ModalProducto";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

interface ProductoItem extends ProductoData {
  id: string;
  _count?: {
    detallesFactura?: number;
    itemsFactura?: number;
  };
}

interface ResumenInventario {
  total: number;
  alquileres: number;
  ventas: number;
  disponibles: number;
  alquilados: number;
  separados: number;
  enArreglo: number;
  inactivos: number;
}

export default function InventarioAdminPage() {
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [resumen, setResumen] = useState<ResumenInventario>({
    total: 0,
    alquileres: 0,
    ventas: 0,
    disponibles: 0,
    alquilados: 0,
    separados: 0,
    enArreglo: 0,
    inactivos: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [pestañaTipo, setPestañaTipo] = useState<"ALQUILER" | "VENTA" | "TODOS">("ALQUILER");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [filtroTalla, setFiltroTalla] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Control del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoItem | null>(null);

  // Notificaciones
  const [notificacion, setNotificacion] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const cargarInventario = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (pestañaTipo !== "TODOS") params.set("tipo", pestañaTipo);

      const res = await fetch(`/api/inventario?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setProductos(data.productos || []);
        if (data.resumen) setResumen(data.resumen);
      }
    } catch {
      mostrarNotificacion("error", "Error de conexión al cargar inventario.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, [pestañaTipo]);

  // Extraer categorías y tallas únicas presentes en el catálogo cargado
  const categoriasUnicas = useMemo(() => {
    const set = new Set<string>();
    for (const p of productos) {
      if (p.categoria && p.categoria.trim()) set.add(p.categoria.trim());
    }
    return Array.from(set).sort();
  }, [productos]);

  const tallasUnicas = useMemo(() => {
    const set = new Set<string>();
    for (const p of productos) {
      if (p.talla && p.talla.trim()) set.add(p.talla.trim());
    }
    return Array.from(set).sort();
  }, [productos]);

  // Autofiltrado dinámico no-preciso (Fuzzy) y por etiquetas de filtro
  const productosFiltrados = useMemo(() => {
    let base = productos;

    // Filtro por Estado
    if (filtroEstado !== "TODOS") {
      base = base.filter((p) => p.estado === filtroEstado);
    }

    // Filtro por Categoría
    if (filtroCategoria !== "TODAS") {
      base = base.filter((p) => p.categoria?.trim() === filtroCategoria);
    }

    // Filtro por Talla
    if (filtroTalla !== "TODAS") {
      base = base.filter((p) => p.talla?.trim() === filtroTalla);
    }

    // Búsqueda difusa multi-campo
    return filtrarPorRelevancia(base, busqueda, (item) => ({
      primarios: [item.codigo, item.nombre],
      secundarios: [
        item.talla,
        item.color,
        item.categoria,
        item.estado,
        String(item.precioBase || ""),
      ],
    }));
  }, [productos, filtroEstado, filtroCategoria, filtroTalla, busqueda]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarInventario();
  };

  const mostrarNotificacion = (tipo: "exito" | "error", texto: string) => {
    setNotificacion({ tipo, texto });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const handleNuevoProducto = () => {
    setProductoSeleccionado(null);
    setModalAbierto(true);
  };

  const handleEditarProducto = (prod: ProductoItem) => {
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  };

  const handleEliminarProducto = async (prod: ProductoItem) => {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar o dar de baja la prenda '${prod.codigo} - ${prod.nombre}'?`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`/api/inventario?id=${prod.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok && data.bloqueado) {
        // Bloqueo por facturas activas
        mostrarNotificacion("error", data.mensaje);
        cargarInventario();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar la solicitud.");
      }

      mostrarNotificacion("exito", data.mensaje || "Prenda actualizada correctamente.");
      cargarInventario();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      mostrarNotificacion("error", msg);
    }
  };

  const formatearDinero = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Badge de Estado con íconos vectoriales de Lucide
  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "DISPONIBLE":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Disponible</span>
          </span>
        );
      case "ALQUILADO":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Alquilado</span>
          </span>
        );
      case "SEPARADO":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <BookmarkCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>Separado</span>
          </span>
        );
      case "EN_ARREGLO":
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-orange-50 text-orange-800 border border-orange-200">
            <Wrench className="h-3.5 w-3.5 text-orange-600" />
            <span>En Arreglo</span>
          </span>
        );
      case "INACTIVO":
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <Ban className="h-3.5 w-3.5 text-slate-500" />
            <span>Inactivo</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Inventario & Catálogo de Prendas
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                Alquiler & Venta
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Control de prendas por tallas, colores, estados de disponibilidad y tarifas de mora
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleNuevoProducto}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Prenda</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="w-full space-y-6">
        {/* Notificación flotante */}
        {notificacion && (
          <div
            className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold shadow-sm animate-fade-in ${
              notificacion.tipo === "exito"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {notificacion.tipo === "exito" ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{notificacion.texto}</span>
          </div>
        )}

        {/* Tarjetas de Estadísticas Rápidas */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">Alquiler</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{resumen.alquileres}</span>
            <span className="text-xs text-emerald-600 font-semibold">Trajes / Disfraces</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">Venta</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{resumen.ventas}</span>
            <span className="text-xs text-blue-600 font-semibold">Ropa Directa</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">Disponibles</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{resumen.disponibles}</span>
            <span className="text-xs text-slate-500 font-medium">Listos para entrega</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">Alquilados</span>
            <span className="text-2xl font-black text-blue-700 mt-1 block">{resumen.alquilados}</span>
            <span className="text-xs text-slate-500 font-medium">En poder de cliente</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">Separados</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">{resumen.separados}</span>
            <span className="text-xs text-slate-500 font-medium">Con anticipo reserva</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block uppercase">En Arreglo</span>
            <span className="text-2xl font-black text-orange-700 mt-1 block">{resumen.enArreglo}</span>
            <span className="text-xs text-slate-500 font-medium">Lavandería / Taller</span>
          </div>
        </section>

        {/* Pestañas de Navegación: Venta vs Alquiler */}
        <section className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1">
            <button
              onClick={() => setPestañaTipo("ALQUILER")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                pestañaTipo === "ALQUILER"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tag className="h-3.5 w-3.5 text-emerald-600" />
              <span>Disfraces y Prendas de Alquiler ({resumen.alquileres})</span>
            </button>

            <button
              onClick={() => setPestañaTipo("VENTA")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                pestañaTipo === "VENTA"
                  ? "bg-white text-blue-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="h-3.5 w-3.5 text-blue-600" />
              <span>Ropa de Venta Directa ({resumen.ventas})</span>
            </button>

            <button
              onClick={() => setPestañaTipo("TODOS")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                pestañaTipo === "TODOS"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
              <span>Todo el Inventario ({resumen.total})</span>
            </button>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="DISPONIBLE">Disponibles</option>
                <option value="ALQUILADO">Alquilados</option>
                <option value="SEPARADO">Separados</option>
                <option value="EN_ARREGLO">En Arreglo</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>

            <button
              onClick={cargarInventario}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
              title="Recargar catálogo"
            >
              <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {/* Barra de Búsqueda Dinámica No-Precisa + Selector de Chips Táctiles */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscador difuso: escribe código, nombre, talla, color o categoría (sin importar tildes)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <span className="text-slate-500 font-medium">
                Mostrando <strong>{productosFiltrados.length}</strong> de {productos.length} prendas
              </span>
              <button
                type="button"
                onClick={cargarInventario}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                title="Recargar catálogo"
              >
                <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Chips Interactivos Táctiles de Filtro Rápido */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {/* Fila 1: Estados */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Estado:
              </span>
              {[
                { id: "TODOS", label: "Todos los Estados" },
                { id: "DISPONIBLE", label: "Disponibles" },
                { id: "ALQUILADO", label: "Alquilados" },
                { id: "SEPARADO", label: "Separados" },
                { id: "EN_ARREGLO", label: "En Arreglo" },
                { id: "INACTIVO", label: "Inactivos" },
              ].map((est) => (
                <button
                  key={est.id}
                  type="button"
                  onClick={() => setFiltroEstado(est.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition min-h-[34px] ${
                    filtroEstado === est.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {est.label}
                </button>
              ))}
            </div>

            {/* Fila 2: Categorías Dinámicas */}
            {categoriasUnicas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Categoría:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroCategoria("TODAS")}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition min-h-[34px] ${
                    filtroCategoria === "TODAS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todas
                </button>
                {categoriasUnicas.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFiltroCategoria(filtroCategoria === cat ? "TODAS" : cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition min-h-[34px] ${
                      filtroCategoria === cat
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Fila 3: Tallas Dinámicas */}
            {tallasUnicas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Talla:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroTalla("TODAS")}
                  className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold transition min-h-[34px] ${
                    filtroTalla === "TODAS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Todas
                </button>
                {tallasUnicas.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    onClick={() => setFiltroTalla(filtroTalla === talla ? "TODAS" : talla)}
                    className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold transition min-h-[34px] ${
                      filtroTalla === talla
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {talla}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Tabla de Productos */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {cargando ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <span>Cargando catálogo de prendas...</span>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p>No se encontraron prendas con los filtros o búsqueda seleccionada.</p>
              <button
                onClick={handleNuevoProducto}
                className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Registrar la primera prenda</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm md:text-base">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-xs sm:text-sm">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Descripción y Categoría</th>
                    <th className="py-3.5 px-4">Talla / Color</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4 text-right">Precio Base</th>
                    <th className="py-3.5 px-4">Tarifa de Mora</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Stock</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productosFiltrados.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/70 transition duration-150 text-slate-800"
                    >
                      {/* Código */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs sm:text-sm">
                          {prod.codigo}
                        </span>
                      </td>

                      {/* Descripción y Categoría */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{prod.nombre}</span>
                        <span className="text-xs text-slate-500">{prod.categoria}</span>
                      </td>

                      {/* Talla y Color */}
                      <td className="py-3.5 px-4">
                        <span className="block font-semibold">Talla: {prod.talla || "N/A"}</span>
                        <span className="text-xs text-slate-500">{prod.color || "Sin color"}</span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4">
                        {prod.tipo === "ALQUILER" ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Tag className="h-3.5 w-3.5" />
                            <span>Alquiler</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Package className="h-3.5 w-3.5" />
                            <span>Venta</span>
                          </span>
                        )}
                      </td>

                      {/* Precio Base */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                        {formatearDinero(prod.precioBase)}
                      </td>

                      {/* Tarifa de Mora */}
                      <td className="py-3.5 px-4">
                        {prod.tipo === "ALQUILER" ? (
                          <div className="font-semibold text-slate-800 font-mono">
                            <span>{formatearDinero(prod.tarifaMora)}</span>
                            <span className="text-xs text-slate-500 font-normal block font-sans">
                              por {prod.unidadMora === "DIA" ? "día" : "hora"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">N/A (Venta)</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {renderBadgeEstado(prod.estado)}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-md ${
                          prod.stockActual > 0 ? "bg-slate-100 text-slate-800" : "bg-red-50 text-red-700"
                        }`}>
                          {prod.stockActual}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleEditarProducto(prod)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="Editar Prenda"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEliminarProducto(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Eliminar o dar de baja"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal de Registro / Edición */}
      <ModalProducto
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSaved={cargarInventario}
        productoAEditar={productoSeleccionado}
        tipoInicial={pestañaTipo === "VENTA" ? "VENTA" : "ALQUILER"}
      />
    </div>
  );
}
