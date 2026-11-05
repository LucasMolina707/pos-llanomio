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
  Building2,
  Mail,
  MapPin,
  Edit3,
  FileSpreadsheet,
  Download,
  Upload,
  FileDown,
  FileUp,
  Plus,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalGestionExcel from "@/components/excel/ModalGestionExcel";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import { safeFetchJson } from "@/lib/safe-fetch";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";

interface ClienteDirectorio {
  id: string;
  documento: string;
  nombre: string;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  esResponsableIVA?: boolean;
  tipoIdentificacion?: string;
  digitoVerificacion?: string | null;
  razonSocial?: string | null;
  responsabilidadFiscal?: string;
  municipio?: string;
  codigoDaneMunicipio?: string;
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
  const [clienteAEditar, setClienteAEditar] = useState<ClienteDirectorio | null>(null);
  const [mostrarModalExcel, setMostrarModalExcel] = useState(false);

  const cargarClientes = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await safeFetchJson<{ success?: boolean; ok?: boolean; clientes?: ClienteDirectorio[]; error?: string }>("/api/clientes");
      if (res.ok && res.data?.clientes) {
        setClientes(res.data.clientes);
      } else {
        throw new Error(res.error || res.data?.error || "Error al cargar la lista de clientes");
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
      primarios: [item.documento, item.nombre, item.razonSocial || ""],
      secundarios: [item.telefono, item.telefonoSecundario, item.email, item.direccion, item.notas],
    }));
  }, [clientes, busqueda]);

  // Optimización de renderizado DOM: límite de 48 elementos visuales manteniendo búsqueda fuzzy sobre 100%
  const clientesPaginados = useMemo(() => {
    return clientesFiltrados.slice(0, 48);
  }, [clientesFiltrados]);

  const abrirModalCrear = () => {
    setClienteAEditar(null);
    setMostrarModalNuevo(true);
  };

  const abrirModalEditar = (cliente: ClienteDirectorio) => {
    setClienteAEditar(cliente);
    setMostrarModalNuevo(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">
              Directorio de Clientes
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate">
              Gestión de clientes, historial de contratos y datos de facturación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end flex-nowrap">
          <IconButtonTooltip
            icon={FileDown}
            label="Descargar Plantilla Oficial Excel"
            size="md"
            variant="neutral"
            onClick={() => window.open("/api/clientes/excel?modo=plantilla", "_blank")}
          />

          <IconButtonTooltip
            icon={Download}
            label="Exportar Base de Datos a Excel"
            size="md"
            variant="neutral"
            onClick={() => window.open("/api/clientes/excel?modo=exportar", "_blank")}
          />

          <IconButtonTooltip
            icon={FileUp}
            label="Importar Masivamente desde Excel"
            variant="emerald"
            size="md"
            onClick={() => setMostrarModalExcel(true)}
          />

          <IconButtonTooltip
            icon={RefreshCw}
            label="Actualizar listado de clientes"
            onClick={cargarClientes}
            disabled={cargando}
            iconClassName={cargando ? "animate-spin text-blue-600" : "text-blue-600"}
            size="md"
            variant="neutral"
          />

          <IconButtonTooltip
            icon={Plus}
            label="Crear Nuevo Cliente"
            variant="primary"
            size="md"
            onClick={abrirModalCrear}
          />
        </div>
      </header>

      {/* Buscador Difuso y Contador */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente por Cédula / NIT, Razón Social, Nombre, Teléfono o Correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
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
                <tr className="bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-slate-300">
                  <th className="px-4 py-3.5">Cliente / Razón Social</th>
                  <th className="px-4 py-3.5">Identificación / RUT</th>
                  <th className="px-4 py-3.5">Contacto / Correo</th>
                  <th className="px-4 py-3.5">Municipio / Dirección</th>
                  <th className="px-4 py-3.5 text-center">Facturas</th>
                  <th className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {clientesPaginados.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/40 transition">
                    {/* 1. Nombre y Razón Social */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="font-bold text-slate-900 hover:text-blue-700 hover:underline block leading-snug"
                        title="Ver historial completo del cliente"
                      >
                        {c.razonSocial || c.nombre}
                      </Link>
                      {c.razonSocial && c.razonSocial !== c.nombre && (
                        <span className="text-xs text-slate-500 block">
                          Contacto: {c.nombre}
                        </span>
                      )}
                    </td>

                    {/* 2. Identificación y Badge Tributario */}
                    <td className="px-4 py-3.5">
                      {c.esResponsableIVA ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                            {c.tipoIdentificacion || "NIT"}: {c.documento}{c.digitoVerificacion ? `-${c.digitoVerificacion}` : ""}
                          </span>
                          <span className="block text-xs font-bold text-blue-800">
                            RUT: {c.responsabilidadFiscal || "O-48"}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold text-slate-800 block">
                            {c.tipoIdentificacion || "CC"}: {c.documento}
                          </span>
                          <span className="inline-block px-2 py-0.2 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Consumidor Final (O-99)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 3. Contacto / Correo */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        {c.telefono ? (
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-800 tracking-tight leading-none">
                            <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{c.telefono}</span>
                            {c.telefonoSecundario && (
                              <span className="inline-flex items-center justify-center w-6 h-5 text-[10px] font-bold rounded-md shrink-0 bg-blue-50 text-blue-700 border border-blue-200">
                                1°
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs block">Sin teléfono</span>
                        )}
                        {c.telefonoSecundario && (
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-800 tracking-tight leading-none">
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{c.telefonoSecundario}</span>
                            <span className="inline-flex items-center justify-center w-6 h-5 text-[10px] font-bold rounded-md shrink-0 bg-slate-100 text-slate-700 border border-slate-300">
                              2°
                            </span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1 text-slate-600 text-xs pt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Municipio y Dirección */}
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      <span className="font-semibold block text-slate-800">
                        {c.municipio || "Villavicencio - Meta"}
                      </span>
                      <span className="text-slate-600 block truncate max-w-[200px]">
                        {c.direccion || "Dirección no registrada"}
                      </span>
                    </td>

                    {/* 5. Total de Facturas */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {c._count?.facturas || 0}
                      </span>
                    </td>

                    {/* 6. Acciones: Editar RUT & Ver Historial */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer"
                          title="Editar información tributaria DIAN o datos de contacto"
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Editar RUT</span>
                        </button>

                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
                          title="Ver expediente completo, ventas, arreglos y alquileres del cliente"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Historial Completo</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {clientesFiltrados.length > 48 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs font-semibold text-slate-600">
              Mostrando los primeros 48 de {clientesFiltrados.length} clientes encontrados. Escriba en el buscador para acotar el cliente deseado.
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Cliente */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalNuevo}
        onClose={() => {
          setMostrarModalNuevo(false);
          setClienteAEditar(null);
        }}
        onClienteCreado={() => {
          cargarClientes();
          setClienteAEditar(null);
        }}
        clienteAEditar={clienteAEditar}
      />

      {/* Modal de Gestión e Importación Masiva Excel */}
      <ModalGestionExcel
        tipo="CLIENTES"
        abierto={mostrarModalExcel}
        onCerrar={() => setMostrarModalExcel(false)}
        onImportacionExitosa={cargarClientes}
      />
    </div>
  );
}
