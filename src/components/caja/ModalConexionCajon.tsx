"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Vault,
  Unlock,
  Users,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import {
  TipoModalCajonRequerido,
  EstadoSeguridadCajaInfo,
} from "@/hooks/useCajonSincronizado";

interface ModalConexionCajonProps {
  abierto: boolean;
  tipoModal?: TipoModalCajonRequerido;
  seguridadCaja?: EstadoSeguridadCajaInfo;
  estado?: string;
  motivoBloqueo?: string | null;
  turnoAbierto?: any;
  turnoParaCompartir?: any;
  turnosAbiertosHoy?: any[];
  arqueoTurno?: any;
  saldoActualEnCajon?: number;
  saldoActualCompartido?: number;
  cajonConectado?: any;
  cargando?: boolean;
  error?: string | null;
  onConectarCompartida: (turnoCajaId?: string) => Promise<boolean>;
  onAbrirNuevoCajon: (params: {
    baseInicial: number;
    nombreGabinete?: string;
    modalidad?: "COMPARTIDA" | "DIVIDIDA";
    observaciones?: string;
  }) => Promise<boolean>;
  onReverificar?: () => void;
  onCerrarModal?: () => void;
}

const BASES_SUGERIDAS = [50000, 100000, 150000, 200000];

export default function ModalConexionCajon({
  abierto,
  tipoModal,
  seguridadCaja,
  estado,
  motivoBloqueo,
  turnoAbierto,
  turnoParaCompartir,
  turnosAbiertosHoy,
  arqueoTurno,
  saldoActualEnCajon,
  saldoActualCompartido = 0,
  cajonConectado,
  cargando = false,
  error,
  onConectarCompartida,
  onAbrirNuevoCajon,
  onReverificar,
  onCerrarModal,
}: ModalConexionCajonProps) {
  // Estados para formulario de Apertura Inicial
  const [baseAperturaInicial, setBaseAperturaInicial] = useState<string>("100000");
  const [nombreGabineteInicial, setNombreGabineteInicial] = useState<string>("");
  const [obsAperturaInicial, setObsAperturaInicial] = useState<string>("");

  // Estados para formulario de Caja Dividida (Opción 2)
  const [baseDividida, setBaseDividida] = useState<string>("100000");
  const [nombreDividido, setNombreDividido] = useState<string>("");

  const [procesandoLocal, setProcesandoLocal] = useState<boolean>(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const tipoModalEfectivo: TipoModalCajonRequerido =
    tipoModal ||
    (seguridadCaja?.estado === "BLOQUEADO_DIA_ANTERIOR" || estado === "BLOQUEADO_DIA_ANTERIOR"
      ? "BLOQUEADO_DIA_ANTERIOR"
      : seguridadCaja?.estado === "REQUIERE_DECISION_MODALIDAD" || estado === "REQUIERE_DECISION_MODALIDAD"
      ? "DECISION_MODALIDAD"
      : "APERTURA_INICIAL");

  const seguridadFinal: EstadoSeguridadCajaInfo = seguridadCaja || {
    estado: (estado as any) || "SIN_TURNO",
    bloqueadoParaFacturar: true,
    motivoBloqueo: motivoBloqueo || null,
    turnoAbierto: turnoAbierto || null,
    turnoParaCompartir: turnoParaCompartir || null,
    turnosAbiertosHoy: turnosAbiertosHoy || [],
    arqueoTurno: arqueoTurno || null,
  };

  const saldoCompartidoReal = saldoActualCompartido || saldoActualEnCajon || 0;

  // Si no está abierto o no hay tipo de modal requerido, no renderizar nada
  if (!abierto || !tipoModalEfectivo) return null;

  const handleSubmitAperturaInicial = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = parseFloat(baseAperturaInicial);
    if (isNaN(base) || base < 0) {
      setErrorLocal("Ingrese una base inicial de efectivo válida.");
      return;
    }

    try {
      setProcesandoLocal(true);
      setErrorLocal(null);
      await onAbrirNuevoCajon({
        baseInicial: base,
        nombreGabinete: nombreGabineteInicial.trim() || undefined,
        modalidad: "COMPARTIDA",
        observaciones: obsAperturaInicial.trim() || undefined,
      });
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : "Error al abrir el cajón");
    } finally {
      setProcesandoLocal(false);
    }
  };

  const handleUnirseCompartidaClick = async () => {
    try {
      setProcesandoLocal(true);
      setErrorLocal(null);
      await onConectarCompartida(seguridadFinal.turnoParaCompartir?.id);
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : "Error al unirse al cajón");
    } finally {
      setProcesandoLocal(false);
    }
  };

  const handleSubmitCajaDividida = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = parseFloat(baseDividida);
    if (isNaN(base) || base < 0) {
      setErrorLocal("Ingrese una base inicial en efectivo válida para la caja dividida.");
      return;
    }

    try {
      setProcesandoLocal(true);
      setErrorLocal(null);
      await onAbrirNuevoCajon({
        baseInicial: base,
        nombreGabinete: nombreDividido.trim() || undefined,
        modalidad: "DIVIDIDA",
      });
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : "Error al abrir la caja dividida");
    } finally {
      setProcesandoLocal(false);
    }
  };

  const handleCerrarTurnoAnteriorYAbrirHoy = async () => {
    try {
      setProcesandoLocal(true);
      setErrorLocal(null);

      const turnoAnteriorId = seguridadFinal.turnoAbierto?.id;
      const efectivoEsperado =
        seguridadFinal.arqueoTurno?.efectivoEsperado ??
        seguridadFinal.arqueoTurno?.saldoActualEnCajon ??
        seguridadFinal.turnoAbierto?.baseInicialEfectivo ??
        0;

      // 1. Ejecutar el cierre formal del turno del día anterior
      const resCierre = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "CIERRE",
          turnoCajaId: turnoAnteriorId,
          efectivoFisicoContado: efectivoEsperado,
          observaciones: "Cierre formal de turno del día anterior ejecutado desde terminal de ventas para habilitar la jornada actual.",
        }),
      });

      const dataCierre = await resCierre.json();
      if (!resCierre.ok || !dataCierre.success) {
        throw new Error(dataCierre.error || "No se pudo cerrar el turno de caja anterior.");
      }

      // 2. Abrir turno de hoy automáticamente con base estándar
      const baseHoy = parseFloat(baseAperturaInicial) || 100000;
      await onAbrirNuevoCajon({
        baseInicial: baseHoy,
        nombreGabinete: "Gabinete #1 - Principal",
        modalidad: "COMPARTIDA",
        observaciones: "Apertura de turno de la jornada",
      });

      if (onReverificar) {
        onReverificar();
      }
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : "Error al procesar el cierre y la apertura.");
    } finally {
      setProcesandoLocal(false);
    }
  };

  // =========================================================================
  // CASO C: BLOQUEADO POR DÍA ANTERIOR
  // =========================================================================
  if (tipoModalEfectivo === "BLOQUEADO_DIA_ANTERIOR") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-[#FCFDFE] rounded-3xl border border-rose-300 shadow-2xl w-full max-w-lg p-6 sm:p-8 flex flex-col space-y-5 text-slate-800">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700 block mb-1">
                Alerta de Control Financiero
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Caja del Día Anterior Pendiente
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {seguridadFinal.motivoBloqueo ||
                "Existe un turno de caja del día anterior que aún no ha sido arqueado ni cerrado formalmente. Por políticas de arqueo diario estricto, debe cerrarse antes de operar hoy."}
            </p>
          </div>

          {errorLocal && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorLocal}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 space-y-1.5 font-medium">
            <div className="font-bold">Resolución rápida en mostrador:</div>
            <div>Puede cerrar el turno pendiente y abrir la jornada de hoy en 1 clic con la base de efectivo predeterminada ($100.000 COP), o realizar un arqueo manual billete a billete.</div>
          </div>

          <div className="space-y-3 pt-2">
            {/* Acción de 1 clic para resolver en mostrador */}
            <button
              type="button"
              onClick={handleCerrarTurnoAnteriorYAbrirHoy}
              disabled={procesandoLocal || cargando}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
            >
              {procesandoLocal ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Cerrando turno anterior y abriendo caja de hoy...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Cerrar Turno Anterior y Abrir Caja Hoy ($100.000 Base)</span>
                </>
              )}
            </button>

            <Link
              href="/admin/caja"
              target="_blank"
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-300 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Vault className="w-4 h-4 text-slate-600" />
              <span>Ir al Panel de Arqueo Detallado (Opcional)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-3">
              {onReverificar && (
                <button
                  type="button"
                  onClick={onReverificar}
                  disabled={cargando || procesandoLocal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-800 bg-slate-100 hover:bg-slate-200 transition border border-slate-300 flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <RefreshCw className={`w-4 h-4 text-blue-600 ${cargando ? "animate-spin" : ""}`} />
                  <span>Reverificar</span>
                </button>
              )}

              <Link
                href="/"
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 hover:text-slate-950 transition text-center"
              >
                Volver al Menú
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO A: APERTURA INICIAL DEL DÍA (SIN TURNO ABIERTO HOY)
  // =========================================================================
  if (tipoModalEfectivo === "APERTURA_INICIAL") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-[#FCFDFE] rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-8 flex flex-col space-y-5 text-slate-800">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
              <Unlock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Apertura de Caja Única &bull; Jornada Actual
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Apertura Única de Caja
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto font-medium">
              No hay una caja abierta para hoy en la tienda. Ingrese el dinero real físico total en gaveta para autorizar simultáneamente Ventas, Alquileres y Apartados.
            </p>
          </div>

          {(error || errorLocal) && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error || errorLocal}</span>
            </div>
          )}

          <form onSubmit={handleSubmitAperturaInicial} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Dinero Real Físico Total en Gaveta ($ COP) *
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
                  value={baseAperturaInicial}
                  onChange={(e) => setBaseAperturaInicial(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-950 text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Botones de sugerencia rápida */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {BASES_SUGERIDAS.map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    onClick={() => setBaseAperturaInicial(String(monto))}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 transition cursor-pointer"
                  >
                    ${monto.toLocaleString("es-CO")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Nombre del Cajón / Gabinete (Opcional)
              </label>
              <input
                type="text"
                placeholder="Gabinete #1 - Principal"
                value={nombreGabineteInicial}
                onChange={(e) => setNombreGabineteInicial(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Observaciones de Apertura (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Billetes de 10k y 20k para vueltas de la mañana"
                value={obsAperturaInicial}
                onChange={(e) => setObsAperturaInicial(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={procesandoLocal || cargando}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-50 cursor-pointer"
              >
                {procesandoLocal || cargando ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Iniciando Turno Único de Caja...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    <span>Abrir Caja y Habilitar Mostrador</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <Link
                  href="/admin/caja"
                  target="_blank"
                  className="text-blue-700 hover:text-blue-800 font-bold underline flex items-center gap-1"
                >
                  <Vault className="w-3.5 h-3.5" />
                  <span>Panel Avanzado de Caja</span>
                </Link>

                <Link
                  href="/"
                  className="text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Volver al Menú Principal
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO B: SELECCIÓN DE MODALIDAD (OTRO DISPOSITIVO O USUARIO NO ASIGNADO)
  // =========================================================================
  if (tipoModalEfectivo === "DECISION_MODALIDAD") {
    const turnoCompartible = seguridadFinal.turnoParaCompartir;
    const baseCompartida = turnoCompartible?.baseInicialEfectivo || 0;
    const nombreCompartido = turnoCompartible?.nombreGabinete || "Gabinete Principal";
    const responsableCompartido = turnoCompartible?.usuarioCajero.nombre || "Compañero de Tienda";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
        <div className="bg-[#FCFDFE] rounded-3xl border border-blue-200 shadow-2xl w-full max-w-3xl p-6 sm:p-8 flex flex-col space-y-6 text-slate-800 my-8">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 block mb-1">
                Sincronización por Dispositivo &bull; Multi-Cajero
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                ¿A qué Cajón de Dinero deseas conectarte?
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
              Ya existe una caja abierta en la tienda hoy. Elige si vas a compartir la misma gaveta de efectivo o si vas a habilitar un cajón físico separado.
            </p>
          </div>

          {(error || errorLocal) && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error || errorLocal}</span>
            </div>
          )}

          {/* Dos Opciones Claras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OPCIÓN 1: CAJA COMPARTIDA (RECOMENDADO) */}
            <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Opción Recomendada
                  </span>
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  1. Conectarme al Cajón Compartido
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Usarás el mismo gabinete físico que abrió{" "}
                  <strong className="text-slate-950">{responsableCompartido}</strong>{" "}
                  ({nombreCompartido}).
                </p>

                {/* Resumen del Saldo Actual en Vivo del Cajón Compartido */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span>Saldo Actual en Cajón:</span>
                    <span className="font-mono text-emerald-900 font-black text-sm">
                      ${saldoCompartidoReal.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-emerald-800">
                    <span>Base Inicial de Apertura:</span>
                    <span className="font-mono">${baseCompartida.toLocaleString("es-CO")}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200/80">
                    Todo el efectivo de tus ventas, arreglos o alquileres entrará a esta gaveta común, guardando tu nombre exacto como cajero responsable.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={procesandoLocal || cargando}
                onClick={handleUnirseCompartidaClick}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                {procesandoLocal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Conectarme a este Cajón Compartido</span>
              </button>
            </div>

            {/* OPCIÓN 2: CAJA DIVIDIDA (GABINETE SEPARADO) */}
            <form
              onSubmit={handleSubmitCajaDividida}
              className="rounded-2xl border-2 border-indigo-300 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500 hover:shadow-md transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    Gabinete Separado
                  </span>
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  2. Abrir un Nuevo Cajón Independiente
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Tendrás tu propia gaveta de dinero física separada, con su propio conteo y cierre independiente.
                </p>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Nombre del Nuevo Cajón:
                    </label>
                    <input
                      type="text"
                      placeholder="Gabinete #2"
                      value={nombreDividido}
                      onChange={(e) => setNombreDividido(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Base Inicial en Efectivo ($):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      required
                      value={baseDividida}
                      onChange={(e) => setBaseDividida(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {[0, 50000, 100000, 150000].map((monto) => (
                        <button
                          key={monto}
                          type="button"
                          onClick={() => setBaseDividida(String(monto))}
                          className="py-1 px-2 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer"
                        >
                          ${monto.toLocaleString("es-CO")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={procesandoLocal || cargando}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                {procesandoLocal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Vault className="w-4 h-4" />
                )}
                <span>Abrir Cajón Dividido</span>
              </button>
            </form>
          </div>

          {/* Pie de navegación */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
            <Link
              href="/admin/caja"
              target="_blank"
              className="text-blue-700 hover:text-blue-800 font-bold underline flex items-center gap-1"
            >
              <Vault className="w-3.5 h-3.5" />
              <span>Panel de Control de Caja</span>
            </Link>

            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 font-semibold"
            >
              Volver al Menú Principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
