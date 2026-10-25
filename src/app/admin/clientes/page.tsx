"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  RefreshCw,
  Phone,
  FileText,
  Clock,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  Receipt,
  UserCheck,
  Shield,
  Layers,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

interface ClienteDirectorio {
  id: string;
  documento: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  notas?: string | null;
  fechaCreacion: string;
  _count?: {
    facturas: number;
  };
}

export default function DirectorioClientesPage() {
  const [clientes, setClientes] = useState<ClienteDirectorio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);

  const cargarClientes = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.success) {
        setClientes(data.clientes || []);
      } else {
        throw new Error(data.error || "Error al cargar la lista de clientes");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de conexión al cargar clientes");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const clientesFiltrados = useMemo(() => {
    return filtrarPorRelevancia(clientes, busqueda, (item) => ({
      primarios: [item.documento, item.nombre],
      secundarios: [item.telefono, item.direccion, item.notas],
    }));
  }, [clientes, busqueda]);

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded-2xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Directorio de Clientes & Historial
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                Cartera y Perfiles
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Gestión de clientes, historial consolidado de transacciones, prendas en alquiler y estado de cuenta individual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={cargarClientes}
            disabled={cargando}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition disabled:opacity-50"
            title="Recargar listado de clientes"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-600 ${cargando ? "animate-spin" : ""}`} />
            <span>Recargar</span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarModalNuevo(true)}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 transition shadow-sm shadow-cyan-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nuevo Cliente</span>
          </button>
        </div>
      </header>

      {/* Buscador Difuso y Contador */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente por Cédula / NIT, Nombre completo, Teléfono o Dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-500 shrink-0">
            {clientesFiltrados.length} de {clientes.length} cliente(s)
          </span>
        </div>

        {/* Tabla de Clientes */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {cargando ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
              <p className="text-sm md:text-base font-semibold">Cargando directorio de clientes...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 bg-rose-50 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-7 h-7" />
              <p className="text-sm md:text-base font-bold">{error}</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Users className="w-10 h-10 text-slate-400" />
              <p className="text-sm md:text-base font-bold text-slate-800">
                No se encontraron clientes
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Intente con otro criterio de búsqueda o cree un nuevo cliente.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm md:text-base border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3.5">Cliente / Documento</th>
                  <th className="px-4 py-3.5">Contacto Telefónico</th>
                  <th className="px-4 py-3.5">Dirección / Ciudad</th>
                  <th className="px-4 py-3.5 text-center">Facturas</th>
                  <th className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    {/* 1. Nombre y Documento */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="font-bold text-slate-900 hover:text-cyan-700 hover:underline block leading-snug"
                        title="Ver historial completo del cliente"
                      >
                        {c.nombre}
                      </Link>
                      <span className="text-xs font-mono font-semibold text-slate-500 block mt-0.5">
                        C.C. / NIT: {c.documento}
                      </span>
                    </td>

                    {/* 2. Teléfono */}
                    <td className="px-4 py-3.5">
                      {c.telefono ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>{c.telefono}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin teléfono</span>
                      )}
                    </td>

                    {/* 3. Dirección */}
                    <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600">
                      {c.direccion || <span className="text-slate-400 text-xs">No registrada</span>}
                    </td>

                    {/* 4. Total de Facturas */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {c._count?.facturas || 0}
                      </span>
                    </td>

                    {/* 5. Botón Ver Historial */}
                    <td className="px-4 py-3.5 text-center">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Historial</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear Cliente */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalNuevo}
        onClose={() => setMostrarModalNuevo(false)}
        onClienteCreado={() => {
          cargarClientes();
        }}
      />
    </div>
  );
}
