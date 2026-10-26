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
  Receipt,
  History,
  Lock,
  Unlock,
  AlertTriangle,
  User,
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
    <div className="w-full space-y-6 max-w-full overflow-x-hidden">
      {/* 1. Cabecera Principal Ergonómica */}
      <header className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl shrink-0">
            <Vault className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Control de Caja & Turnos
              </h1>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  hayTurnoAbierto
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                    : "bg-slate-100 text-slate-700 border border-slate-300"
                }`}
              >
                {hayTurnoAbierto ? "Caja Abierta" : "Caja Cerrada"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Apertura con base inicial, arqueo físico en gaveta y cierre diario por métodos de pago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={consultarEstadoCaja}
            disabled={cargando}
            className="flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300/80 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar Arqueo</span>
          </button>
          <Link
            href="/caja/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
            title="Abrir Terminal de Facturación POS en nueva ventana"
          >
            <Receipt className="w-4 h-4" />
            <span>Terminal POS (Nueva Ventana)</span>
          </Link>
        </div>
      </header>

      {/* 2. Banner Crítico de Alerta si hay Turno del Día Anterior Abierto Sin Cerrar */}
      {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR" && (
        <div className="p-5 rounded-2xl border-2 border-rose-400 bg-rose-50 text-rose-950 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-200 text-rose-900 border border-rose-300">
                  Alerta de Control Financiero POS
                </span>
                <span className="text-xs font-bold text-rose-700">
                  Terminal POS Bloqueada
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-rose-950">
                Turno de Caja Anterior Pendiente de Arqueo y Cierre
              </h3>
              <p className="text-xs sm:text-sm text-rose-900 leading-relaxed font-medium">
                Existe un turno de caja abierto el{" "}
                <strong className="text-rose-950 underline font-bold">
                  {verificacionSeguridad.turnoAbierto?.fechaAperturaLocal}
                </strong>{" "}
                ({verificacionSeguridad.turnoAbierto?.diasAbierto} día(s) sin cerrar) a cargo del cajero{" "}
                <strong className="text-rose-950 font-bold bg-white px-2 py-0.5 rounded-md border border-rose-300">
                  {verificacionSeguridad.turnoAbierto?.usuarioCajero.nombre}
                </strong>.
                Por política de seguridad financiera, ningún cajero puede facturar hoy hasta realizar el arqueo y cierre formal de esta jornada anterior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mensaje de Alerta / Éxito */}
      {mensaje && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-xs ${
            mensaje.tipo === "exito"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {mensaje.tipo === "exito" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span className="font-semibold">{mensaje.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensaje(null)}
            className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* CASO A: NO HAY TURNO ABIERTO (Formulario de Apertura)     */}
      {/* ========================================================= */}
      {!hayTurnoAbierto ? (
        <div className="bg-[#FCFDFE] rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/90 max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Unlock className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Apertura de Nuevo Turno de Caja
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium">
              Para iniciar la jornada en el mostrador POS, registre la base en efectivo disponible en la gaveta física para devueltas y cambio.
            </p>
          </div>

          <form onSubmit={handleApertura} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Base Inicial en Efectivo ($ COP) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-black text-lg">
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
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
              </div>
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {[50000, 100000, 150000, 200000].map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    onClick={() => setBaseInicialInput(String(monto))}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 transition cursor-pointer"
                  >
                    ${monto.toLocaleString("es-CO")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Observaciones de Apertura (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Billetes de 10.000 y 5.000 para cambio matutino"
                value={obsApertura}
                onChange={(e) => setObsApertura(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={procesando}
              className="w-full min-h-[46px] py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
          {/* Ficha Informativa del Turno en Curso (REDiseño Quirúrgico de Alto Contraste) */}
          <div
            className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border ${
              verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                ? "bg-amber-50/95 border-l-4 border-l-amber-600 border-amber-300"
                : "bg-emerald-50/90 border-l-4 border-l-emerald-600 border-emerald-200"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div
                className={`p-2.5 rounded-xl text-white shrink-0 shadow-xs ${
                  verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                    {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                      ? "Turno Pendiente del Día Anterior"
                      : "Turno Activo al Día"}
                    {" — "}
                    <span className="font-semibold text-slate-800">
                      {turnoAbierto?.fechaApertura
                        ? new Date(turnoAbierto.fechaApertura).toLocaleString("es-CO", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : ""}
                    </span>
                  </h2>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                        ? "bg-rose-100 text-rose-900 border-rose-300 font-bold animate-pulse"
                        : "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                    }`}
                  >
                    {verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                      ? "Requiere Cierre Urgente"
                      : "Operando en Mostrador"}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-sm md:text-base text-slate-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Cajero Responsable:</span>
                  </div>
                  <span className="text-slate-950 font-bold bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {turnoAbierto?.usuarioCajero?.nombre || "Cajero Asignado"} ({turnoAbierto?.usuarioCajero?.username})
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right sm:border-l sm:border-slate-300/80 sm:pl-5 shrink-0">
              <span className="text-xs uppercase font-bold text-slate-700 block tracking-wider">
                Base Inicial en Gaveta
              </span>
              <span className="text-lg md:text-xl font-mono font-black text-emerald-800">
                ${Number(turnoAbierto?.baseInicialEfectivo || 0).toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* Cuadrícula de Métricas de Arqueo en Vivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Esperado en Gaveta Física (Destacado en Azul Claro de Alto Contraste) */}
            <div className="bg-blue-50/80 p-5 rounded-2xl border-2 border-blue-300 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Esperado en Gaveta Física
                </span>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-2 font-mono">
                ${Number(arqueoActual?.esperadoEnGavetaEfectivo || 0).toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Base (${Number(arqueoActual?.baseInicialEfectivo || 0).toLocaleString("es-CO")}) + Efectivo recibido (${Number(arqueoActual?.totalEfectivo || 0).toLocaleString("es-CO")})
              </p>
            </div>

            {/* 2. Recaudo Canales Digitales */}
            <div className="bg-[#FCFDFE] p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  Recaudo Canales Digitales
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-950 mt-2 font-mono">
                ${(
                  Number(arqueoActual?.totalNequi || 0) +
                  Number(arqueoActual?.totalDaviplata || 0) +
                  Number(arqueoActual?.totalTransferencia || 0)
                ).toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Nequi: ${Number(arqueoActual?.totalNequi || 0).toLocaleString("es-CO")} | Daviplata: ${Number(arqueoActual?.totalDaviplata || 0).toLocaleString("es-CO")}
              </p>
            </div>

            {/* 3. Total Ventas y Abonos Recaudados */}
            <div className="bg-[#FCFDFE] p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Total Recaudado en Turno
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Vault className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950 mt-2 font-mono">
                ${Number(arqueoActual?.totalRecaudado || 0).toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                {arqueoActual?.cantidadAbonos || 0} pago(s) en {arqueoActual?.cantidadFacturas || 0} factura(s)
              </p>
            </div>

            {/* 4. Desglose Transferencias */}
            <div className="bg-[#FCFDFE] p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Transferencias Bancarias
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-2 font-mono">
                ${Number(arqueoActual?.totalTransferencia || 0).toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Comprobantes bancarios verificados
              </p>
            </div>
          </div>

          {/* Layout de Cierre Definitivo de Caja */}
          <div className="bg-[#FCFDFE] rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>Arqueo y Cierre Definitivo de Caja</span>
              </div>
              <span className="text-xs text-slate-600 font-medium">
                Cuadre exacto de gaveta física vs. sistema
              </span>
            </div>

            <form onSubmit={handleCierre} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Efectivo Físico Contado en Gaveta ($ COP) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-black text-lg">
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
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-950 text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Tipo de Cierre
                    </label>
                    <select
                      value={tipoCierre}
                      onChange={(e) => setTipoCierre(e.target.value as "DIARIO" | "CONSOLIDADO_MENSUAL")}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      <option value="DIARIO">Cierre Diario</option>
                      <option value="CONSOLIDADO_MENSUAL">Consolidado Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Observaciones
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Cuadre exacto sin novedades"
                      value={obsCierre}
                      onChange={(e) => setObsCierre(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta de Comparación y Diferencia de Alto Contraste */}
              <div className="lg:col-span-6 bg-slate-50 p-5 rounded-2xl border border-slate-200/90 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Resultado del Cuadre de Gaveta
                </h3>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span>Total Físico Esperado (Base + Efectivo):</span>
                    <span className="font-mono font-bold text-slate-900 text-sm md:text-base">
                      ${esperadoGaveta.toLocaleString("es-CO")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span>Efectivo Físico Contado por Cajero:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm md:text-base">
                      ${contadoNumerico.toLocaleString("es-CO")}
                    </span>
                  </div>

                  <div
                    className={`flex justify-between items-center p-3.5 rounded-xl border ${
                      efectivoContadoInput === ""
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : diferenciaEnVivo === 0
                        ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                        : diferenciaEnVivo > 0
                        ? "bg-blue-50 text-blue-950 border-blue-300"
                        : "bg-rose-50 text-rose-950 border-rose-300"
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
                    <span className="text-base sm:text-lg font-black font-mono">
                      {diferenciaEnVivo >= 0 ? "+" : ""}${diferenciaEnVivo.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={procesando || efectivoContadoInput === ""}
                  className={`w-full min-h-[46px] py-3.5 rounded-xl font-bold text-sm md:text-base text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer ${
                    verificacionSeguridad?.estado === "BLOQUEADO_DIA_ANTERIOR"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
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
      <div className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            Historial de Turnos y Cierres Previos
          </h2>
          <span className="text-xs text-slate-600 font-medium">
            Auditoría inmutable de transacciones
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {historialTurnos.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium text-center py-6">
              No hay turnos cerrados registrados todavía en el historial.
            </p>
          ) : (
            <table className="w-full text-left text-sm md:text-base border-collapse">
              <thead className="bg-slate-100 text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300">
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
              <tbody className="divide-y divide-slate-200 bg-white">
                {historialTurnos.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 text-sm md:text-base">
                        {new Date(t.fechaApertura).toLocaleDateString("es-CO")}
                      </p>
                      <span className="text-xs text-slate-700 font-mono block mt-0.5">
                        {new Date(t.fechaApertura).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {t.fechaCierre ? new Date(t.fechaCierre).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Abierto"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800 text-sm md:text-base">
                      {t.usuarioCajero?.nombre}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-800 font-medium text-sm md:text-base">
                      ${Number(t.baseInicialEfectivo).toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 text-sm md:text-base">
                      ${Number(t.totalEfectivo).toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-purple-800 text-sm md:text-base">
                      ${(Number(t.totalNequi) + Number(t.totalDaviplata) + Number(t.totalTransferencia)).toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-emerald-800 text-sm md:text-base">
                      ${Number(t.totalRecaudado).toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          t.diferenciaEfectivo === 0
                            ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                            : t.diferenciaEfectivo > 0
                            ? "bg-blue-50 text-blue-950 border-blue-300"
                            : "bg-rose-50 text-rose-950 border-rose-300"
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
