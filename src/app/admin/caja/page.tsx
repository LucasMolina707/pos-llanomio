"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Vault,
  Banknote,
  Smartphone,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Receipt,
  Layers,
  History,
  Lock,
  Unlock,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

interface TurnoActivo {
  id: string;
  fechaApertura: string;
  baseInicialEfectivo: number;
  usuarioCajero: {
    nombre: string;
    username: string;
  };
}

interface ArqueoActual {
  baseInicialEfectivo: number;
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalTransferencia: number;
  totalConsignacion: number;
  totalRecaudado: number;
  esperadoEnGavetaEfectivo: number;
  cantidadAbonos: number;
  cantidadFacturas: number;
}

interface TurnoCerradoItem {
  id: string;
  fechaApertura: string;
  fechaCierre: string;
  baseInicialEfectivo: number;
  totalEfectivo: number;
  totalNequi: number;
  totalDaviplata: number;
  totalTransferencia: number;
  totalRecaudado: number;
  diferenciaEfectivo: number;
  usuarioCajero: {
    nombre: string;
    username: string;
  };
}

export interface VerificacionSeguridadAdmin {
  estado: "ABIERTO_HOY" | "BLOQUEADO_DIA_ANTERIOR" | "SIN_TURNO";
  bloqueadoParaFacturar: boolean;
  motivoBloqueo: string | null;
  fechaHoy: string;
  turnoAbierto?: {
    id: string;
    fechaApertura: string;
    fechaAperturaLocal: string;
    baseInicialEfectivo: number;
    diasAbierto: number;
    usuarioCajero: {
      id: string;
      nombre: string;
      username: string;
    };
  } | null;
}

export default function ControlCajaAdminPage() {
  const [hayTurnoAbierto, setHayTurnoAbierto] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState<TurnoActivo | null>(null);
  const [verificacionSeguridad, setVerificacionSeguridad] = useState<VerificacionSeguridadAdmin | null>(null);
  const [arqueoActual, setArqueoActual] = useState<ArqueoActual | null>(null);
  const [historialTurnos, setHistorialTurnos] = useState<TurnoCerradoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Estados formulario Apertura
  const [baseInicialInput, setBaseInicialInput] = useState<string>("100000");
  const [obsApertura, setObsApertura] = useState<string>("");

  // Estados formulario Cierre
  const [efectivoContadoInput, setEfectivoContadoInput] = useState<string>("");
  const [tipoCierre, setTipoCierre] = useState<"DIARIO" | "CONSOLIDADO_MENSUAL">("DIARIO");
  const [obsCierre, setObsCierre] = useState<string>("");

  const consultarEstadoCaja = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/caja");
      const data = await res.json();
      if (data.success) {
        setHayTurnoAbierto(data.hayTurnoAbierto);
        setTurnoAbierto(data.turnoAbierto);
        setArqueoActual(data.arqueoActual);
        setHistorialTurnos(data.historialTurnos || []);
        if (data.verificacionSeguridad) {
          setVerificacionSeguridad(data.verificacionSeguridad);
        }
      }
    } catch (err) {
      console.error("Error al consultar caja:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    consultarEstadoCaja();
  }, [consultarEstadoCaja]);

  // Manejador de Apertura de Turno
  const handleApertura = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const base = parseFloat(baseInicialInput);
    if (isNaN(base) || base < 0) {
      setMensaje({ tipo: "error", texto: "Ingrese un monto válido para la base inicial en efectivo" });
      return;
    }

    try {
      setProcesando(true);
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "APERTURA",
          baseInicialEfectivo: base,
          observaciones: obsApertura.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo abrir el turno");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje });
      setObsApertura("");
      await consultarEstadoCaja();
    } catch (err: unknown) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "Error al abrir turno" });
    } finally {
      setProcesando(false);
    }
  };

  // Manejador de Cierre de Turno
  const handleCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const contado = parseFloat(efectivoContadoInput);
    if (isNaN(contado) || contado < 0) {
      setMensaje({ tipo: "error", texto: "Debe ingresar el monto de efectivo físico contado en gaveta" });
      return;
    }

    if (!confirm("¿Está seguro de proceder con el CIERRE DEFINITIVO de la caja actual? Esta acción consolidará los registros del turno.")) {
      return;
    }

    try {
      setProcesando(true);
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "CIERRE",
          efectivoFisicoContado: contado,
          tipoCierre,
          observaciones: obsCierre.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cerrar turno de caja");
      }

      setMensaje({
        tipo: "exito",
        texto: `${data.mensaje}. Diferencia en gaveta: $${data.cuadre?.diferenciaEfectivo?.toLocaleString("es-CO")}`,
      });
      setEfectivoContadoInput("");
      setObsCierre("");
      await consultarEstadoCaja();
    } catch (err: unknown) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "Error al cerrar caja" });
    } finally {
      setProcesando(false);
    }
  };

  // Cálculo en vivo de diferencia durante el tipeo
  const contadoNumerico = parseFloat(efectivoContadoInput) || 0;
  const esperadoGaveta = arqueoActual?.esperadoEnGavetaEfectivo || 0;
  const diferenciaEnVivo = Math.round((contadoNumerico - esperadoGaveta) * 100) / 100;

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Vault className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Control de Caja & Turnos
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  hayTurnoAbierto
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {hayTurnoAbierto ? "Caja Abierta" : "Caja Cerrada"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Apertura con base inicial, arqueo físico en gaveta y cierre diario por métodos de pago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={consultarEstadoCaja}
            disabled={cargando}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar Arqueo</span>
          </button>
          <Link
            href="/caja/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
            title="Abrir Terminal de Facturación POS en nueva ventana"
          >
            <Receipt className="w-4 h-4" />
            <span>Terminal POS (Nueva Ventana)</span>
          </Link>
        </div>
      </header>

        {/* Banner Crítico de Turno Anterior Abierto Sin Cerrar */}
        {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR" && (
          <div className="p-5 rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-md space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    Alerta de Control Financiero POS
                  </span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Terminal POS Bloqueada
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-rose-900 dark:text-rose-100">
                  Turno de Caja Anterior Pendiente de Arqueo y Cierre
                </h3>
                <p className="text-xs sm:text-sm text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
                  Existe un turno de caja abierto el{" "}
                  <strong>{verificacionSeguridad.turnoAbierto?.fechaAperturaLocal}</strong>{" "}
                  ({verificacionSeguridad.turnoAbierto?.diasAbierto} día(s) sin cerrar) a cargo del cajero{" "}
                  <strong>{verificacionSeguridad.turnoAbierto?.usuarioCajero.nombre}</strong>.
                  Por política estricta de control, ningún cajero puede facturar hoy hasta que realice el arqueo y cierre formal de esta jornada anterior.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Alerta */}
        {mensaje && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-xs ${
              mensaje.tipo === "exito"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {mensaje.tipo === "exito" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <span>{mensaje.texto}</span>
            </div>
            <button onClick={() => setMensaje(null)} className="text-xs font-semibold underline">
              Cerrar
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASO A: NO HAY TURNO ABIERTO (Formulario de Apertura)     */}
        {/* ========================================================= */}
        {!hayTurnoAbierto ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Unlock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Apertura de Nuevo Turno de Caja
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Para iniciar la jornada en el mostrador POS, registre la base en efectivo disponible en la gaveta física para devueltas y cambio.
              </p>
            </div>

            <form onSubmit={handleApertura} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Base Inicial en Efectivo ($ COP) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-extrabold text-base">
                    $
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    placeholder="100000"
                    value={baseInicialInput}
                    onChange={(e) => setBaseInicialInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[50000, 100000, 150000, 200000].map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() => setBaseInicialInput(String(monto))}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      ${monto.toLocaleString("es-CO")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Observaciones de Apertura (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Billetes de 10.000 y 5.000 para cambio matutino"
                  value={obsApertura}
                  onChange={(e) => setObsApertura(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={procesando}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Iniciando Turno...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    <span>Abrir Turno de Caja</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* CASO B: HAY TURNO ABIERTO (Arqueo en Vivo y Cierre)       */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Ficha Informativa del Turno en Curso */}
            <div
              className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                  ? "bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-900"
                  : "bg-amber-500/10 border-amber-300/60 dark:border-amber-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl text-white shrink-0 ${
                    verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                      ? "bg-rose-600 shadow-sm"
                      : "bg-amber-500"
                  }`}
                >
                  {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                        ? "Turno Pendiente del Día Anterior"
                        : "Turno Activo al Día"}
                      {" — "}
                      {turnoAbierto?.fechaApertura
                        ? new Date(turnoAbierto.fechaApertura).toLocaleString("es-CO")
                        : ""}
                    </h2>
                    {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white animate-pulse">
                        Requiere Cierre Urgente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Cajero Responsable:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {turnoAbierto?.usuarioCajero?.nombre}
                    </strong>{" "}
                    ({turnoAbierto?.usuarioCajero?.username})
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-amber-200 dark:sm:border-amber-900/60 sm:pl-4">
                <span className="text-xs uppercase font-bold text-slate-500 block">
                  Base Inicial
                </span>
                <span className="text-base font-mono font-black text-amber-700 dark:text-amber-400">
                  ${Number(turnoAbierto?.baseInicialEfectivo || 0).toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* Cuadrícula de Métricas de Arqueo en Vivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Esperado en Gaveta (Físico) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-amber-500/60 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Esperado en Gaveta Física
                  </span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                    <Banknote className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                  ${Number(arqueoActual?.esperadoEnGavetaEfectivo || 0).toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Base (${Number(arqueoActual?.baseInicialEfectivo || 0).toLocaleString("es-CO")}) + Efectivo recaudado (${Number(arqueoActual?.totalEfectivo || 0).toLocaleString("es-CO")})
                </p>
              </div>

              {/* 2. Recaudo Digital (Nequi + Daviplata + Transf) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Recaudo Canales Digitales
                  </span>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400 mt-2 font-mono">
                  ${(
                    Number(arqueoActual?.totalNequi || 0) +
                    Number(arqueoActual?.totalDaviplata || 0) +
                    Number(arqueoActual?.totalTransferencia || 0)
                  ).toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Nequi: ${Number(arqueoActual?.totalNequi || 0).toLocaleString("es-CO")} | Daviplata: ${Number(arqueoActual?.totalDaviplata || 0).toLocaleString("es-CO")}
                </p>
              </div>

              {/* 3. Total Ventas y Abonos Recaudados */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Total Recaudado en Turno
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                    <Vault className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                  ${Number(arqueoActual?.totalRecaudado || 0).toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {arqueoActual?.cantidadAbonos || 0} pago(s) en {arqueoActual?.cantidadFacturas || 0} factura(s)
                </p>
              </div>

              {/* 4. Desglose Transferencias */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Transferencias Bancarias
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
                  ${Number(arqueoActual?.totalTransferencia || 0).toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Comprobantes bancarios verificados
                </p>
              </div>
            </div>

            {/* Layout de Cierre Definitivo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                  <Lock className="w-5 h-5 text-amber-600" />
                  <span>Arqueo y Cierre Definitivo de Caja</span>
                </div>
                <span className="text-xs text-slate-500">
                  Cuadre exacto de gaveta física vs. sistema
                </span>
              </div>

              <form onSubmit={handleCierre} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Efectivo Físico Contado en Gaveta ($ COP) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-extrabold text-base">
                        $
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        placeholder="Ingrese el monto contado..."
                        value={efectivoContadoInput}
                        onChange={(e) => setEfectivoContadoInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Tipo de Cierre
                      </label>
                      <select
                        value={tipoCierre}
                        onChange={(e) => setTipoCierre(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold"
                      >
                        <option value="DIARIO">Cierre Diario</option>
                        <option value="CONSOLIDADO_MENSUAL">Consolidado Mensual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Observaciones
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Cuadre exacto sin novedades"
                        value={obsCierre}
                        onChange={(e) => setObsCierre(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Comparación y Diferencia */}
                <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Resultado del Cuadre de Gaveta
                  </h2>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Total Físico Esperado (Base + Efectivo):</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ${esperadoGaveta.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Efectivo Físico Contado por Cajero:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ${contadoNumerico.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div
                      className={`flex justify-between items-center p-3 rounded-xl border ${
                        efectivoContadoInput === ""
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : diferenciaEnVivo === 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : diferenciaEnVivo > 0
                          ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                          : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}
                    >
                      <span className="font-bold uppercase tracking-wider text-xs">
                        {efectivoContadoInput === ""
                          ? "Pendiente de Conteo"
                          : diferenciaEnVivo === 0
                          ? "Cuadre Exacto"
                          : diferenciaEnVivo > 0
                          ? "Sobrante en Gaveta"
                          : "Faltante en Gaveta"}
                      </span>
                      <span className="text-base font-black font-mono">
                        {diferenciaEnVivo >= 0 ? "+" : ""}${diferenciaEnVivo.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={procesando || efectivoContadoInput === ""}
                    className={`w-full py-3.5 rounded-xl font-black text-sm md:text-base text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${
                      verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                        : "bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {procesando ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Consolidando Cierre...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>
                          {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                            ? "Cerrar Turno Anterior y Habilitar Apertura de Hoy"
                            : "Ejecutar Cierre Definitivo de Caja"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECCIÓN 3: HISTORIAL DE TURNOS CERRADOS PREVIOS           */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Historial de Turnos y Cierres Previos
            </h2>
            <span className="text-xs text-slate-400">
              Auditoría inmutable de transacciones
            </span>
          </div>

          <div className="overflow-x-auto">
            {historialTurnos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No hay turnos cerrados registrados todavía en el historial.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Apertura / Cierre</th>
                    <th className="px-3 py-3">Cajero</th>
                    <th className="px-3 py-3 text-right">Base Inicial</th>
                    <th className="px-3 py-3 text-right">Efectivo</th>
                    <th className="px-3 py-3 text-right">Nequi / Digital</th>
                    <th className="px-3 py-3 text-right">Total Recaudado</th>
                    <th className="px-3 py-3 text-center">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historialTurnos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {new Date(t.fechaApertura).toLocaleDateString("es-CO")}
                        </p>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(t.fechaApertura).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {t.fechaCierre ? new Date(t.fechaCierre).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Abierto"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {t.usuarioCajero?.nombre}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm">
                        ${Number(t.baseInicialEfectivo).toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        ${Number(t.totalEfectivo).toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-purple-700 dark:text-purple-400 text-sm">
                        ${(Number(t.totalNequi) + Number(t.totalDaviplata) + Number(t.totalTransferencia)).toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm md:text-base">
                        ${Number(t.totalRecaudado).toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            t.diferenciaEfectivo === 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : t.diferenciaEfectivo > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {t.diferenciaEfectivo >= 0 ? "+" : ""}${Number(t.diferenciaEfectivo).toLocaleString("es-CO")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
  );
}
