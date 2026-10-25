"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Tag,
  Package,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
  DollarSign,
} from "lucide-react";

export interface ProductoData {
  id?: string;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER";
  categoria: string;
  talla?: string | null;
  color?: string | null;
  stockActual: number;
  estado: "DISPONIBLE" | "ALQUILADO" | "SEPARADO" | "EN_ARREGLO" | "INACTIVO";
  precioBase: number;
  tarifaMora: number;
  unidadMora: "DIA" | "HORA";
}

interface ModalProductoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (productoCreado?: any) => void;
  productoAEditar?: ProductoData | null;
  tipoInicial?: "VENTA" | "ALQUILER";
}

export default function ModalProducto({
  isOpen,
  onClose,
  onSaved,
  productoAEditar,
  tipoInicial = "ALQUILER",
}: ModalProductoProps) {
  const [formData, setFormData] = useState<ProductoData>({
    codigo: "",
    nombre: "",
    tipo: tipoInicial,
    categoria: "Trajes Típicos",
    talla: "M",
    color: "",
    stockActual: 1,
    estado: "DISPONIBLE",
    precioBase: 0,
    tarifaMora: 15000,
    unidadMora: "DIA",
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productoAEditar) {
      setFormData({
        id: productoAEditar.id,
        codigo: productoAEditar.codigo || "",
        nombre: productoAEditar.nombre || "",
        tipo: productoAEditar.tipo || "ALQUILER",
        categoria: productoAEditar.categoria || "General",
        talla: productoAEditar.talla || "",
        color: productoAEditar.color || "",
        stockActual: productoAEditar.stockActual ?? 1,
        estado: productoAEditar.estado || "DISPONIBLE",
        precioBase: productoAEditar.precioBase ?? 0,
        tarifaMora: productoAEditar.tarifaMora ?? 0,
        unidadMora: productoAEditar.unidadMora || "DIA",
      });
    } else {
      setFormData({
        codigo: "",
        nombre: "",
        tipo: tipoInicial,
        categoria: tipoInicial === "ALQUILER" ? "Trajes Típicos" : "Ropa Llanera",
        talla: "M",
        color: "",
        stockActual: 1,
        estado: "DISPONIBLE",
        precioBase: 0,
        tarifaMora: tipoInicial === "ALQUILER" ? 15000 : 0,
        unidadMora: "DIA",
      });
    }
    setError(null);
  }, [productoAEditar, tipoInicial, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : parseFloat(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      // Validaciones en cliente
      if (!formData.codigo.trim()) {
        throw new Error("El código de referencia es obligatorio.");
      }
      if (!formData.nombre.trim()) {
        throw new Error("El nombre de la prenda es obligatorio.");
      }

      if (formData.tipo === "ALQUILER") {
        if (Number(formData.tarifaMora) < 0 || isNaN(Number(formData.tarifaMora))) {
          throw new Error("Para alquileres debe especificar una tarifa de mora numérica mayor o igual a cero.");
        }
      }

      const method = formData.id ? "PUT" : "POST";
      const res = await fetch("/api/inventario", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          codigo: formData.codigo.trim().toUpperCase(),
          precioBase: Number(formData.precioBase) || 0,
          tarifaMora: Number(formData.tarifaMora) || 0,
          stockActual: Number(formData.stockActual) || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo guardar la prenda.");
      }

      onSaved(data.producto);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar formulario";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {formData.id ? "Editar Prenda / Producto" : "Registrar Nueva Prenda"}
              </h2>
              <p className="text-xs text-slate-500">
                Configure datos de inventario, disponibilidad y reglas de mora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo: Alquiler vs Venta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, tipo: "ALQUILER" }))}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  formData.tipo === "ALQUILER"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Tag className="h-4 w-4 text-emerald-600" />
                <span>Alquiler de Prenda / Disfraz</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, tipo: "VENTA" }))}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  formData.tipo === "VENTA"
                    ? "bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Package className="h-4 w-4 text-blue-600" />
                <span>Ropa de Venta Directa</span>
              </button>
            </div>
          </div>

          {/* Fila: Código y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Código / Ref *
              </label>
              <input
                type="text"
                required
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="ej. LL-010"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre o Descripción de la Prenda *
              </label>
              <input
                type="text"
                required
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="ej. Vestido de Joropo Tradicional Azul Rey"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila: Categoría, Talla y Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                placeholder="ej. Trajes Típicos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Talla
              </label>
              <input
                type="text"
                name="talla"
                value={formData.talla || ""}
                onChange={handleChange}
                placeholder="ej. S, M, L, 38, Única"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color || ""}
                onChange={handleChange}
                placeholder="ej. Rojo / Negro"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila: Stock y Estado de Disponibilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Stock Físico Actual
              </label>
              <input
                type="number"
                min="0"
                name="stockActual"
                value={formData.stockActual}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado de Disponibilidad
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="DISPONIBLE">Disponible para Entrega</option>
                <option value="ALQUILADO">Alquilado (Fuera de tienda)</option>
                <option value="SEPARADO">Separado (Apartado con anticipo)</option>
                <option value="EN_ARREGLO">En Arreglo / Lavandería / Taller</option>
                <option value="INACTIVO">Inactivo / Fuera de Circulación</option>
              </select>
            </div>
          </div>

          {/* Fila: Precio Base */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {formData.tipo === "ALQUILER" ? "Precio Base de Alquiler ($ COP)" : "Precio de Venta ($ COP)"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <input
                type="number"
                min="0"
                step="100"
                name="precioBase"
                value={formData.precioBase}
                onChange={handleChange}
                placeholder="0"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN OBLIGATORIA DE ALQUILER: TARIFAS DE MORA */}
          {formData.tipo === "ALQUILER" && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900">
                <Clock className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Configuración Obligatoria de Tarifa de Mora
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tarifa de Mora ($ COP) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01" // Soporte estricto de decimales
                    name="tarifaMora"
                    value={formData.tarifaMora}
                    onChange={handleChange}
                    placeholder="ej. 15000.50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Permite valores decimales (ej. 2500.50)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unidad de Medida de Mora *
                  </label>
                  <select
                    name="unidadMora"
                    value={formData.unidadMora}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="DIA">Por Día de Retraso</option>
                    <option value="HORA">Por Hora de Retraso</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Base temporal del recargo automático
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-1 text-[11px] text-amber-800">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  El motor de facturación liquidará automáticamente los recargos cuando la fecha o hora de devolución real supere lo pactado en la tirilla.
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Pie del Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{guardando ? "Guardando..." : "Guardar Prenda"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
