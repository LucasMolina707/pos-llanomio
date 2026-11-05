"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Receipt,
  Plus,
  Search,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  Trash2,
  Edit3,
  UserCheck,
  Briefcase,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FolderPlus,
  ChevronDown,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import { safeFetchJson } from "@/lib/safe-fetch";

interface CategoriaGasto {
  id: string;
  nombre: string;
  requiereEmpleado: boolean;
  esPredeterminada: boolean;
  activa: boolean;
}

interface EmpleadoGasto {
  id: string;
  nombreCompleto: string;
  cargoOperacion?: string | null;
  telefono?: string | null;
  activo: boolean;
}

interface GastoRegistro {
  id: string;
  fecha: string;
  categoriaId: string;
  categoriaNombre: string;
  descripcion: string;
  valor: number;
  esNomina: boolean;
  nombreEmpleado?: string | null;
  modalidadPagoNomina?: string | null;
  observacionNomina?: string | null;
  registradoPorNombre?: string | null;
  categoria?: {
    id: string;
    nombre: string;
    requiereEmpleado: boolean;
  };
}

interface ResumenPeriodo {
  totalGastosFiltrados: number;
  gastoDia: number;
  gastoMesTotal: number;
  gastoMesOperativo: number;
  gastoMesNomina: number;
  gastoAnio: number;
  ingresosPeriodo: number;
  balanceNeto: number;
  fechaSeleccionada: string;
  mesSeleccionado: number;
  anioSeleccionado: number;
}

interface FilaBalanceMes {
  mesNumero: number;
  mesNombre: string;
  anio: number;
  ingresos: number;
  gastosOperativos: number;
  gastosNomina: number;
  totalGastos: number;
  balanceNeto: number;
}

const MODALIDADES_NOMINA = [
  { id: "QUINCENAL", label: "Quincenal" },
  { id: "DIARIO", label: "Diario / Turno" },
  { id: "POR_HORAS", label: "Por Horas" },
  { id: "MENSUAL", label: "Mensual" },
  { id: "OTRO", label: "Otro / Extra" },
];

const MESES = [
  { num: 1, nombre: "Enero" },
  { num: 2, nombre: "Febrero" },
  { num: 3, nombre: "Marzo" },
  { num: 4, nombre: "Abril" },
  { num: 5, nombre: "Mayo" },
  { num: 6, nombre: "Junio" },
  { num: 7, nombre: "Julio" },
  { num: 8, nombre: "Agosto" },
  { num: 9, nombre: "Septiembre" },
  { num: 10, nombre: "Octubre" },
  { num: 11, nombre: "Noviembre" },
  { num: 12, nombre: "Diciembre" },
];

export default function GastosAdminPage() {
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const anioActual = useMemo(() => new Date().getFullYear(), []);
  const mesActual = useMemo(() => new Date().getMonth() + 1, []);

  // Estados de datos
  const [gastos, setGastos] = useState<GastoRegistro[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoGasto[]>([]);
  const [resumen, setResumen] = useState<ResumenPeriodo | null>(null);
  const [balanceMesAMes, setBalanceMesAMes] = useState<FilaBalanceMes[]>([]);
  const [cargando, setCargando] = useState(true);

  // Pestaña de visualización principal
  const [vistaActiva, setVistaActiva] = useState<"HOJA_EXCEL" | "BALANCE_ANUAL">("HOJA_EXCEL");

  // Filtros de barra estilo Excel
  const [filtroPeriodo, setFiltroPeriodo] = useState<"DIA" | "MES" | "ANUAL" | "RANGO">("MES");
  const [filtroFechaDia, setFiltroFechaDia] = useState<string>(hoyStr);
  const [filtroMes, setFiltroMes] = useState<number>(mesActual);
  const [filtroAnio, setFiltroAnio] = useState<number>(anioActual);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>(hoyStr);
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>(hoyStr);
  const [filtroCategoriaId, setFiltroCategoriaId] = useState<string>("TODAS");
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>("TODOS");
  const [filtroTexto, setFiltroTexto] = useState<string>("");

  // Fila de Inserción Rápida Tipo Excel
  const [nuevaFecha, setNuevaFecha] = useState<string>(hoyStr);
  const [nuevaCategoriaId, setNuevaCategoriaId] = useState<string>("");
  const [nuevoNombreEmpleado, setNuevoNombreEmpleado] = useState<string>("");
  const [nuevaModalidadNomina, setNuevaModalidadNomina] = useState<string>("QUINCENAL");
  const [nuevaObservacionNomina, setNuevaObservacionNomina] = useState<string>("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>("");
  const [nuevoValor, setNuevoValor] = useState<string>("");
  const [guardandoFila, setGuardandoFila] = useState(false);

  // Modales
  const [modalNuevaCategoriaAbierto, setModalNuevaCategoriaAbierto] = useState(false);
  const [nombreNuevaCatInput, setNombreNuevaCatInput] = useState("");
  const [catNuevaRequiereEmpleado, setCatNuevaRequiereEmpleado] = useState(false);
  const [guardandoCat, setGuardandoCat] = useState(false);

  const [modalNuevoEmpleadoAbierto, setModalNuevoEmpleadoAbierto] = useState(false);
  const [nombreNuevoEmpInput, setNombreNuevoEmpInput] = useState("");
  const [cargoNuevoEmpInput, setCargoNuevoEmpInput] = useState("Operativo / Sastrería");
  const [telefonoNuevoEmpInput, setTelefonoNuevoEmpInput] = useState("");
  const [guardandoEmp, setGuardandoEmp] = useState(false);

  const [gastoParaEditar, setGastoParaEditar] = useState<GastoRegistro | null>(null);
  const [editandoGasto, setEditandoGasto] = useState(false);

  const [gastoParaEliminar, setGastoParaEliminar] = useState<GastoRegistro | null>(null);
  const [eliminandoGasto, setEliminandoGasto] = useState(false);

  const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Carga de categorías persistentes
  const cargarCategorias = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; categorias: CategoriaGasto[] }>("/api/gastos/categorias");
      if (res.ok && res.data?.categorias) {
        setCategorias(res.data.categorias);
        if (!nuevaCategoriaId && res.data.categorias.length > 0) {
          // Seleccionar la primera por defecto
          setNuevaCategoriaId(res.data.categorias[0].id);
        }
      }
    } catch (e) {
      console.error("Error al cargar categorías de gastos:", e);
    }
  }, [nuevaCategoriaId]);

  // Carga de empleados persistentes
  const cargarEmpleados = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; empleados: EmpleadoGasto[] }>("/api/gastos/empleados");
      if (res.ok && res.data?.empleados) {
        setEmpleados(res.data.empleados);
      }
    } catch (e) {
      console.error("Error al cargar empleados:", e);
    }
  }, []);

  // Carga de gastos y balance
  const cargarGastos = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      params.set("periodo", filtroPeriodo);
      if (filtroPeriodo === "DIA") params.set("fecha", filtroFechaDia);
      if (filtroPeriodo === "MES") {
        params.set("mes", String(filtroMes));
        params.set("anio", String(filtroAnio));
      }
      if (filtroPeriodo === "ANUAL") params.set("anio", String(filtroAnio));
      if (filtroPeriodo === "RANGO") {
        params.set("fechaInicio", filtroFechaInicio);
        params.set("fechaFin", filtroFechaFin);
      }
      if (filtroCategoriaId !== "TODAS") params.set("categoriaId", filtroCategoriaId);
      if (filtroEmpleado !== "TODOS") params.set("empleado", filtroEmpleado);
      if (filtroTexto.trim()) params.set("q", filtroTexto.trim());

      const res = await safeFetchJson<{
        ok: boolean;
        gastos: GastoRegistro[];
        resumen: ResumenPeriodo;
        balanceMesAMes: FilaBalanceMes[];
      }>(`/api/gastos?${params.toString()}`);

      if (res.ok && res.data) {
        setGastos(res.data.gastos || []);
        setResumen(res.data.resumen || null);
        setBalanceMesAMes(res.data.balanceMesAMes || []);
      }
    } catch (e) {
      console.error("Error al consultar gastos:", e);
    } finally {
      setCargando(false);
    }
  }, [
    filtroPeriodo,
    filtroFechaDia,
    filtroMes,
    filtroAnio,
    filtroFechaInicio,
    filtroFechaFin,
    filtroCategoriaId,
    filtroEmpleado,
    filtroTexto,
  ]);

  useEffect(() => {
    cargarCategorias();
    cargarEmpleados();
  }, [cargarCategorias, cargarEmpleados]);

  useEffect(() => {
    cargarGastos();
  }, [cargarGastos]);

  // Determinar si la categoría elegida en la fila de captura rápida requiere datos de nómina
  const categoriaSeleccionada = useMemo(() => {
    return categorias.find((c) => c.id === nuevaCategoriaId);
  }, [categorias, nuevaCategoriaId]);

  const esNominaEnFila = useMemo(() => {
    if (!categoriaSeleccionada) return false;
    return (
      categoriaSeleccionada.requiereEmpleado ||
      categoriaSeleccionada.nombre === "Pago de Nómina" ||
      categoriaSeleccionada.nombre === "Gasto de Empleados"
    );
  }, [categoriaSeleccionada]);

  // Insertar Fila Rápida Tipo Excel (1 Clic o Enter)
  const handleGuardarFilaRapida = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevaCategoriaId) {
      setMensajeAlerta({ tipo: "error", texto: "Debes seleccionar una categoría para el gasto." });
      return;
    }

    const valorNum = Math.round(Number(nuevoValor) * 100) / 100;
    if (isNaN(valorNum) || valorNum <= 0) {
      setMensajeAlerta({ tipo: "error", texto: "Ingresa un valor monetario válido mayor a cero." });
      return;
    }

    if (esNominaEnFila && (!nuevoNombreEmpleado.trim() || nuevoNombreEmpleado.trim().length < 2)) {
      setMensajeAlerta({
        tipo: "error",
        texto: "Para pagos de nómina es obligatorio indicar el nombre del empleado.",
      });
      return;
    }

    const descFinal = nuevaDescripcion.trim()
      ? nuevaDescripcion.trim()
      : esNominaEnFila
      ? `Pago de nómina - ${nuevoNombreEmpleado} (${nuevaModalidadNomina})`
      : categoriaSeleccionada?.nombre || "Gasto operativo";

    try {
      setGuardandoFila(true);
      setMensajeAlerta(null);

      const res = await safeFetchJson<any>("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: nuevaFecha,
          categoriaId: nuevaCategoriaId,
          descripcion: descFinal,
          valor: valorNum,
          nombreEmpleado: esNominaEnFila ? nuevoNombreEmpleado.trim() : null,
          modalidadPagoNomina: esNominaEnFila ? nuevaModalidadNomina : null,
          observacionNomina: esNominaEnFila ? nuevaObservacionNomina.trim() || null : null,
        }),
      });

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || "No se pudo registrar el gasto.");
      }

      // Limpiar campos para la siguiente fila conservando fecha y categoría
      setNuevaDescripcion("");
      setNuevoValor("");
      setNuevaObservacionNomina("");
      setMensajeAlerta({ tipo: "exito", texto: "Fila registrada exitosamente en la hoja de gastos." });

      // Recargar datos y empleados
      cargarGastos();
      cargarEmpleados();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar fila";
      setMensajeAlerta({ tipo: "error", texto: msg });
    } finally {
      setGuardandoFila(false);
    }
  };

  // Guardar nueva categoría persistente
  const handleGuardarNuevaCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = nombreNuevaCatInput.trim();
    if (!nom || nom.length < 2) {
      alert("El nombre de la categoría debe tener al menos 2 caracteres.");
      return;
    }

    try {
      setGuardandoCat(true);
      const res = await safeFetchJson<any>("/api/gastos/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nom,
          requiereEmpleado: catNuevaRequiereEmpleado,
        }),
      });

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || "No se pudo crear la categoría.");
      }

      const catCreada = res.data.categoria;
      await cargarCategorias();
      setNuevaCategoriaId(catCreada.id);
      setModalNuevaCategoriaAbierto(false);
      setNombreNuevaCatInput("");
      setCatNuevaRequiereEmpleado(false);
      setMensajeAlerta({ tipo: "exito", texto: `Categoría "${catCreada.nombre}" guardada permanentemente en la base de datos.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear categoría";
      alert(msg);
    } finally {
      setGuardandoCat(false);
    }
  };

  // Guardar nuevo empleado persistente
  const handleGuardarNuevoEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = nombreNuevoEmpInput.trim();
    if (!nom || nom.length < 2) {
      alert("El nombre del empleado debe tener al menos 2 caracteres.");
      return;
    }

    try {
      setGuardandoEmp(true);
      const res = await safeFetchJson<any>("/api/gastos/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCompleto: nom,
          cargoOperacion: cargoNuevoEmpInput.trim() || null,
          telefono: telefonoNuevoEmpInput.trim() || null,
        }),
      });

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || "No se pudo registrar el empleado.");
      }

      const empCreado = res.data.empleado;
      await cargarEmpleados();
      setNuevoNombreEmpleado(empCreado.nombreCompleto);
      setModalNuevoEmpleadoAbierto(false);
      setNombreNuevoEmpInput("");
      setTelefonoNuevoEmpInput("");
      setMensajeAlerta({ tipo: "exito", texto: `Empleado "${empCreado.nombreCompleto}" añadido al catálogo de nómina.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar empleado";
      alert(msg);
    } finally {
      setGuardandoEmp(false);
    }
  };

  // Confirmar eliminación de fila
  const handleConfirmarEliminacion = async () => {
    if (!gastoParaEliminar) return;
    try {
      setEliminandoGasto(true);
      const res = await safeFetchJson<any>(`/api/gastos/${gastoParaEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || "No se pudo eliminar el registro.");
      }
      setGastoParaEliminar(null);
      setMensajeAlerta({ tipo: "exito", texto: "Registro eliminado de la hoja de gastos." });
      cargarGastos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      alert(msg);
    } finally {
      setEliminandoGasto(false);
    }
  };

  // Guardar edición de fila
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoParaEditar) return;

    try {
      setEditandoGasto(true);
      const res = await safeFetchJson<any>(`/api/gastos/${gastoParaEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoriaId: gastoParaEditar.categoriaId,
          descripcion: gastoParaEditar.descripcion,
          valor: gastoParaEditar.valor,
          fecha: gastoParaEditar.fecha,
          nombreEmpleado: gastoParaEditar.nombreEmpleado,
          modalidadPagoNomina: gastoParaEditar.modalidadPagoNomina,
          observacionNomina: gastoParaEditar.observacionNomina,
        }),
      });

      if (!res.ok || !res.data?.success) {
        throw new Error(res.error || "No se pudo actualizar el registro.");
      }

      setGastoParaEditar(null);
      setMensajeAlerta({ tipo: "exito", texto: "Registro actualizado correctamente." });
      cargarGastos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar";
      alert(msg);
    } finally {
      setEditandoGasto(false);
    }
  };

  // Descargar Excel (.xlsx)
  const handleDescargarExcel = () => {
    const params = new URLSearchParams();
    params.set("periodo", filtroPeriodo);
    if (filtroPeriodo === "DIA") params.set("fecha", filtroFechaDia);
    if (filtroPeriodo === "MES") {
      params.set("mes", String(filtroMes));
      params.set("anio", String(filtroAnio));
    }
    if (filtroPeriodo === "ANUAL") params.set("anio", String(filtroAnio));
    if (filtroCategoriaId !== "TODAS") params.set("categoriaId", filtroCategoriaId);
    if (filtroEmpleado !== "TODOS") params.set("empleado", filtroEmpleado);

    window.open(`/api/gastos/excel?${params.toString()}`, "_blank");
  };

  // Sumatoria en vivo de la columna VALOR
  const sumatoriaValor = useMemo(() => {
    return gastos.reduce((acc, g) => acc + g.valor, 0);
  }, [gastos]);

  return (
    <div className="min-h-screen bg-slate-100/60 p-3 sm:p-6 space-y-5 text-slate-800">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Gastos Operativos y Nómina
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Hoja de cálculo consolidada de tesorería y balances gerenciales (Aislado de la caja activa diaria)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternar Vista */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setVistaActiva("HOJA_EXCEL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                vistaActiva === "HOJA_EXCEL"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Hoja de Gastos</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva("BALANCE_ANUAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                vistaActiva === "BALANCE_ANUAL"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Balance Mes a Mes</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDescargarExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Notificación */}
      {mensajeAlerta && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold ${
            mensajeAlerta.tipo === "exito"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {mensajeAlerta.tipo === "exito" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{mensajeAlerta.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeAlerta(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Tarjetas Ejecutivas de Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Tarjeta 1: Gasto del Día */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Gasto Total del Día</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-mono text-2xl font-black text-slate-900">
            ${(resumen?.gastoDia || 0).toLocaleString("es-CO")}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Fecha: {resumen?.fechaSeleccionada || hoyStr}
          </p>
        </div>

        {/* Tarjeta 2: Gasto Acumulado del Mes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Gasto del Mes ({MESES[(resumen?.mesSeleccionado || mesActual) - 1]?.nombre})</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <p className="font-mono text-2xl font-black text-rose-700">
            ${(resumen?.gastoMesTotal || 0).toLocaleString("es-CO")}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>Operativos: ${(resumen?.gastoMesOperativo || 0).toLocaleString("es-CO")}</span>
            <span className="font-bold text-indigo-700">Nómina: ${(resumen?.gastoMesNomina || 0).toLocaleString("es-CO")}</span>
          </div>
        </div>

        {/* Tarjeta 3: Gasto Acumulado del Año */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Gasto Anual ({resumen?.anioSeleccionado || anioActual})</span>
            <Briefcase className="w-4 h-4 text-slate-600" />
          </div>
          <p className="font-mono text-2xl font-black text-slate-800">
            ${(resumen?.gastoAnio || 0).toLocaleString("es-CO")}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Erogaciones acumuladas Ene - Dic
          </p>
        </div>

        {/* Tarjeta 4: Balance Neto del Periodo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Balance Neto Periodo</span>
            {(resumen?.balanceNeto || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p
            className={`font-mono text-2xl font-black ${
              (resumen?.balanceNeto || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            ${(resumen?.balanceNeto || 0).toLocaleString("es-CO")}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
            Ingresos reales (${(resumen?.ingresosPeriodo || 0).toLocaleString("es-CO")}) - Gastos (${(resumen?.totalGastosFiltrados || 0).toLocaleString("es-CO")})
          </p>
        </div>
      </div>

      {/* VISTA 1: HOJA DE CÁLCULO ESTILO EXCEL */}
      {vistaActiva === "HOJA_EXCEL" && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {/* Barra de Filtros en Desplegables Tipo Excel */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Desplegable de Periodo */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-600">Periodo:</span>
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="MES">Mes a Mes</option>
                  <option value="DIA">Día Específico</option>
                  <option value="ANUAL">Balance Anual</option>
                  <option value="RANGO">Rango de Fechas</option>
                </select>
              </div>

              {/* Subfiltro según periodo */}
              {filtroPeriodo === "DIA" && (
                <input
                  type="date"
                  value={filtroFechaDia}
                  onChange={(e) => setFiltroFechaDia(e.target.value)}
                  className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono"
                />
              )}

              {filtroPeriodo === "MES" && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(Number(e.target.value))}
                    className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    {MESES.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(Number(e.target.value))}
                    className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono cursor-pointer"
                  >
                    {[anioActual - 2, anioActual - 1, anioActual, anioActual + 1].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filtroPeriodo === "ANUAL" && (
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(Number(e.target.value))}
                  className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono cursor-pointer"
                >
                  {[anioActual - 2, anioActual - 1, anioActual, anioActual + 1].map((a) => (
                    <option key={a} value={a}>
                      Año {a}
                    </option>
                  ))}
                </select>
              )}

              {filtroPeriodo === "RANGO" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filtroFechaInicio}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className="bg-white px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono"
                  />
                  <span className="text-xs text-slate-400">a</span>
                  <input
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className="bg-white px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono"
                  />
                </div>
              )}

              {/* Desplegable de Categoría (CERO botones sueltos) */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-600">Categoría:</span>
                <select
                  value={filtroCategoriaId}
                  onChange={(e) => setFiltroCategoriaId(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 outline-none max-w-[200px] truncate cursor-pointer"
                >
                  <option value="TODAS">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desplegable de Empleado (Para auditar nómina) */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-600">Empleado:</span>
                <select
                  value={filtroEmpleado}
                  onChange={(e) => setFiltroEmpleado(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 outline-none max-w-[170px] truncate cursor-pointer"
                >
                  <option value="TODOS">Todos los empleados</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.nombreCompleto}>
                      {emp.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buscador de texto en descripción */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en descripción..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Fila Superior de Inserción Rápida Tipo Excel */}
          <div className="p-3.5 bg-indigo-50/70 border-b-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-700" />
                Fila de Inserción Rápida Tipo Excel (Registrar Gasto)
              </span>
            </div>

            <form onSubmit={handleGuardarFilaRapida} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                {/* Celda 1: Fecha (col 2) */}
                <div className="sm:col-span-2">
                  <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    FECHA
                  </label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-10 px-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                {/* Celda 2: Categoría con botón [+] integrado (col 3) */}
                <div className="sm:col-span-3">
                  <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    CATEGORÍA
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <select
                      value={nuevaCategoriaId}
                      onChange={(e) => setNuevaCategoriaId(e.target.value)}
                      className="w-full h-10 px-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 cursor-pointer truncate"
                      required
                    >
                      <option value="" disabled>Seleccione categoría...</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre} {cat.requiereEmpleado ? "(Nómina)" : ""}
                        </option>
                      ))}
                    </select>
                    <IconButtonTooltip
                      icon={Plus}
                      label="Crear nueva categoría persistente"
                      size="md"
                      variant="neutral"
                      onClick={() => setModalNuevaCategoriaAbierto(true)}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-xl border-slate-300"
                    />
                  </div>
                </div>

                {/* Celda 4: Descripción (col 4 o col 3) */}
                <div className={esNominaEnFila ? "sm:col-span-3" : "sm:col-span-5"}>
                  <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    DESCRIPCIÓN DIRECTA
                  </label>
                  <input
                    type="text"
                    placeholder={
                      esNominaEnFila
                        ? "Ej. Quincena de noviembre / Horas extras..."
                        : "Ej. Servicio de luz, compra de cintas métricas..."
                    }
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Celda 5: Valor en Pesos COP (col 2) */}
                <div className="sm:col-span-2">
                  <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    VALOR ($ COP)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={nuevoValor}
                    onChange={(e) => setNuevoValor(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-black text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                {/* Celda 6: Botón de Inserción (col 2) */}
                <div className="sm:col-span-2 flex flex-col justify-end">
                  <div className="h-5 hidden sm:block" />
                  <button
                    type="submit"
                    disabled={guardandoFila}
                    className="w-full h-10 px-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{guardandoFila ? "Guardando..." : "Guardar Fila"}</span>
                  </button>
                </div>
              </div>

              {/* Subfila Condicional Exclusiva de Nómina */}
              {esNominaEnFila && (
                <div className="p-3 bg-white rounded-xl border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  {/* Desplegable / Combobox de Empleado con botón [+] */}
                  <div>
                    <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                      EMPLEADO / BENEFICIARIO (OBLIGATORIO)
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        list="lista-empleados"
                        placeholder="Escribe o selecciona empleado..."
                        value={nuevoNombreEmpleado}
                        onChange={(e) => setNuevoNombreEmpleado(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        required
                      />
                      <datalist id="lista-empleados">
                        {empleados.map((emp) => (
                          <option key={emp.id} value={emp.nombreCompleto} />
                        ))}
                      </datalist>
                      <IconButtonTooltip
                        icon={Plus}
                        label="Registrar nuevo empleado para nómina"
                        size="md"
                        variant="neutral"
                        onClick={() => setModalNuevoEmpleadoAbierto(true)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-xl border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Frecuencia / Modalidad de Pago */}
                  <div>
                    <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                      MODALIDAD DE PAGO
                    </label>
                    <select
                      value={nuevaModalidadNomina}
                      onChange={(e) => setNuevaModalidadNomina(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                      {MODALIDADES_NOMINA.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observación de Nómina */}
                  <div>
                    <label className="h-5 flex items-center text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                      DETALLE / OBSERVACIÓN DE NÓMINA
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Quincena 1 de Noviembre / 8 Horas extras"
                      value={nuevaObservacionNomina}
                      onChange={(e) => setNuevaObservacionNomina(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Tabla Principal Tipo Cuadrícula Excel */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] tracking-wider border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300 w-24">Fecha</th>
                  <th className="p-2.5 border-r border-slate-300 w-44">Categoría</th>
                  <th className="p-2.5 border-r border-slate-300 min-w-[200px]">Descripción</th>
                  <th className="p-2.5 border-r border-slate-300 w-40">Empleado (Nómina)</th>
                  <th className="p-2.5 border-r border-slate-300 w-32">Modalidad</th>
                  <th className="p-2.5 border-r border-slate-300 w-44">Observación Nómina</th>
                  <th className="p-2.5 border-r border-slate-300 w-32 text-right">Valor ($ COP)</th>
                  <th className="p-2.5 border-r border-slate-300 w-28">Registrado Por</th>
                  <th className="p-2.5 w-20 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Cargando hoja de gastos...</span>
                    </td>
                  </tr>
                ) : gastos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      No se encontraron registros de gastos para el periodo o filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  gastos.map((g, idx) => (
                    <tr
                      key={g.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                      }`}
                    >
                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-800 font-semibold whitespace-nowrap">
                        {g.fecha ? g.fecha.split("T")[0] : "-"}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            g.esNomina
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          {g.categoriaNombre}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800 font-medium">
                        {g.descripcion}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        {g.nombreEmpleado ? (
                          <span className="flex items-center gap-1 text-purple-900 font-bold">
                            <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            {g.nombreEmpleado}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 font-medium whitespace-nowrap">
                        {g.modalidadPagoNomina ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                            {g.modalidadPagoNomina}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 text-[11px]">
                        {g.observacionNomina || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono font-black text-slate-950 text-right whitespace-nowrap text-sm">
                        ${g.valor.toLocaleString("es-CO")}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-500 text-[11px] whitespace-nowrap">
                        {g.registradoPorNombre || "Administrador"}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setGastoParaEditar(g)}
                            title="Editar fila"
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-indigo-700 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGastoParaEliminar(g)}
                            title="Eliminar fila"
                            className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Fila Inferior de Sumatoria Automática Tipo Excel */}
              <tfoot>
                <tr className="bg-slate-200/80 font-black text-slate-900 border-t-2 border-slate-400 text-xs">
                  <td className="p-2.5 border-r border-slate-300" colSpan={2}>
                    TOTALES DE LA HOJA
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-slate-600 font-semibold" colSpan={4}>
                    {gastos.length} {gastos.length === 1 ? "registro mostrado" : "registros mostrados"}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono text-sm font-black text-slate-950">
                    ${sumatoriaValor.toLocaleString("es-CO")}
                  </td>
                  <td className="p-2.5" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: BALANCE MES A MES (ENERO A DICIEMBRE) */}
      {vistaActiva === "BALANCE_ANUAL" && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Balance Operativo Mes a Mes (Año {filtroAnio})
              </h2>
              <p className="text-xs text-slate-500">
                Comparativa de ingresos reales de la tienda vs. gastos operativos y nómina consolidada
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Año de Consulta:</span>
              <select
                value={filtroAnio}
                onChange={(e) => setFiltroAnio(Number(e.target.value))}
                className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none font-mono cursor-pointer"
              >
                {[anioActual - 2, anioActual - 1, anioActual, anioActual + 1].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] tracking-wider border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300">Mes</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Ingresos Tienda ($)</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Gastos Operativos ($)</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Gastos Nómina ($)</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Total Gastos ($)</th>
                  <th className="p-2.5 text-right font-black">Balance / Utilidad Neta ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {balanceMesAMes.map((f, idx) => (
                  <tr
                    key={f.mesNumero}
                    className={`hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                      {f.mesNombre}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                      ${f.ingresos.toLocaleString("es-CO")}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono text-slate-600">
                      ${f.gastosOperativos.toLocaleString("es-CO")}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono font-semibold text-purple-700">
                      ${f.gastosNomina.toLocaleString("es-CO")}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono font-black text-rose-700">
                      ${f.totalGastos.toLocaleString("es-CO")}
                    </td>
                    <td
                      className={`p-2.5 text-right font-mono font-black text-sm ${
                        f.balanceNeto >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      ${f.balanceNeto.toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-black text-slate-950 border-t-2 border-slate-400 text-xs">
                  <td className="p-2.5 border-r border-slate-300">TOTALES DEL AÑO</td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono text-sm">
                    ${balanceMesAMes.reduce((acc, f) => acc + f.ingresos, 0).toLocaleString("es-CO")}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono">
                    ${balanceMesAMes.reduce((acc, f) => acc + f.gastosOperativos, 0).toLocaleString("es-CO")}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono text-purple-900">
                    ${balanceMesAMes.reduce((acc, f) => acc + f.gastosNomina, 0).toLocaleString("es-CO")}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono text-rose-900">
                    ${balanceMesAMes.reduce((acc, f) => acc + f.totalGastos, 0).toLocaleString("es-CO")}
                  </td>
                  <td className="p-2.5 text-right font-mono text-sm font-black">
                    ${balanceMesAMes.reduce((acc, f) => acc + f.balanceNeto, 0).toLocaleString("es-CO")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: AGREGAR NUEVA CATEGORÍA PERSISTENTE */}
      {modalNuevaCategoriaAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Nueva Categoría Persistente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevaCategoriaAbierto(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevaCategoria} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                La nueva categoría se guardará permanentemente en la base de datos SQLite y estará disponible de inmediato en todos los desplegables.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  placeholder="Ej. Publicidad, Mantenimiento, Transporte..."
                  value={nombreNuevaCatInput}
                  onChange={(e) => setNombreNuevaCatInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catNuevaRequiereEmpleado}
                  onChange={(e) => setCatNuevaRequiereEmpleado(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Esta categoría corresponde a Nómina o Empleados (requiere asignar trabajador)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalNuevaCategoriaAbierto(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCat}
                  className="px-4 py-2 text-xs font-black bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {guardandoCat ? "Guardando..." : "Guardar en Base de Datos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AGREGAR NUEVO EMPLEADO AL CATÁLOGO DE NÓMINA */}
      {modalNuevoEmpleadoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Nuevo Empleado para Nómina
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoEmpleadoAbierto(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoEmpleado} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Guarda los datos del trabajador en el directorio persistente para seleccionarlo en futuros pagos de nómina (no requiere usuario del sistema POS).
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre Completo del Trabajador
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez / María Rodríguez..."
                  value={nombreNuevoEmpInput}
                  onChange={(e) => setNombreNuevoEmpInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Área / Cargo Operativo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sastrería, Lavandería, Almacén, Mostrador..."
                  value={cargoNuevoEmpInput}
                  onChange={(e) => setCargoNuevoEmpInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Teléfono / Contacto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 310 000 0000"
                  value={telefonoNuevoEmpInput}
                  onChange={(e) => setTelefonoNuevoEmpInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalNuevoEmpleadoAbierto(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEmp}
                  className="px-4 py-2 text-xs font-black bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {guardandoEmp ? "Guardando..." : "Guardar Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR REGISTRO DE GASTO */}
      {gastoParaEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Editar Registro de Gasto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGastoParaEditar(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={gastoParaEditar.fecha ? gastoParaEditar.fecha.split("T")[0] : ""}
                    onChange={(e) =>
                      setGastoParaEditar({ ...gastoParaEditar, fecha: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valor ($ COP)</label>
                  <input
                    type="number"
                    min="1"
                    value={gastoParaEditar.valor}
                    onChange={(e) =>
                      setGastoParaEditar({ ...gastoParaEditar, valor: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 text-xs font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Categoría</label>
                <select
                  value={gastoParaEditar.categoriaId}
                  onChange={(e) =>
                    setGastoParaEditar({ ...gastoParaEditar, categoriaId: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
                  required
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descripción</label>
                <input
                  type="text"
                  value={gastoParaEditar.descripcion}
                  onChange={(e) =>
                    setGastoParaEditar({ ...gastoParaEditar, descripcion: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              {/* Si es nómina, campos adicionales */}
              {(gastoParaEditar.esNomina ||
                gastoParaEditar.nombreEmpleado ||
                categorias.find((c) => c.id === gastoParaEditar.categoriaId)?.requiereEmpleado) && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-0.5">
                      Empleado (Nómina)
                    </label>
                    <input
                      type="text"
                      value={gastoParaEditar.nombreEmpleado || ""}
                      onChange={(e) =>
                        setGastoParaEditar({ ...gastoParaEditar, nombreEmpleado: e.target.value })
                      }
                      className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-purple-300 rounded-lg"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-0.5">
                        Modalidad
                      </label>
                      <select
                        value={gastoParaEditar.modalidadPagoNomina || "QUINCENAL"}
                        onChange={(e) =>
                          setGastoParaEditar({ ...gastoParaEditar, modalidadPagoNomina: e.target.value })
                        }
                        className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-purple-300 rounded-lg cursor-pointer"
                      >
                        {MODALIDADES_NOMINA.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-0.5">
                        Observación
                      </label>
                      <input
                        type="text"
                        value={gastoParaEditar.observacionNomina || ""}
                        onChange={(e) =>
                          setGastoParaEditar({ ...gastoParaEditar, observacionNomina: e.target.value })
                        }
                        className="w-full px-2.5 py-1 text-xs font-medium text-slate-900 bg-white border border-purple-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setGastoParaEditar(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoGasto}
                  className="px-4 py-2 text-xs font-black bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {editandoGasto ? "Guardando..." : "Actualizar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR ELIMINACIÓN */}
      {gastoParaEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-300 shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Eliminar Registro de Gasto</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de eliminar el registro{" "}
              <strong className="text-slate-900 font-bold">"{gastoParaEliminar.descripcion}"</strong> por{" "}
              <strong className="font-mono text-slate-900 font-black">
                ${gastoParaEliminar.valor.toLocaleString("es-CO")}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setGastoParaEliminar(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminacion}
                disabled={eliminandoGasto}
                className="px-4 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {eliminandoGasto ? "Eliminando..." : "Eliminar Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

