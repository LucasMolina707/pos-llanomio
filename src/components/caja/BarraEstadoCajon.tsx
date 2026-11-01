"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Vault,
  DollarSign,
  Users,
  Layers,
  RefreshCw,
  AlertTriangle,
  Lock,
  ExternalLink,
  ChevronDown,
  X,
  CreditCard,
  Banknote,
  RotateCcw,
} from "lucide-react";
import { InfoTurnoGabinete, EstadoSeguridadCajaInfo } from "@/hooks/useCajonSincronizado";

interface BarraEstadoCajonProps {
  cajonConectado: InfoTurnoGabinete | null;
  seguridadCaja?: EstadoSeguridadCajaInfo;
  estado?: "ABIERTO_HOY" | "BLOQUEADO_DIA_ANTERIOR" | "SIN_TURNO" | "REQUIERE_DECISION_MODALIDAD";
  motivoBloqueo?: string | null;
  saldoActualEnCajon: number;
  totalDigital: number;
  cargando?: boolean;
  onRefrescar?: () => void;
  onCambiarCajon?: () => void;
  onAbrirModalConexion?: () => void;
  onAbrirModal?: () => void;
  compacto?: boolean;
}

export default function BarraEstadoCajon({
  cajonConectado,
  seguridadCaja,
  estado,
  motivoBloqueo,
  saldoActualEnCajon,
  totalDigital,
  cargando = false,
  onRefrescar,
  onCambiarCajon,
  onAbrirModalConexion,
  onAbrirModal,
  compacto = false,
}: BarraEstadoCajonProps) {
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const abrirModalHandler = onAbrirModal || onAbrirModalConexion;
  const estadoActual = estado || seguridadCaja?.estado || (cajonConectado ? "ABIERTO_HOY" : "SIN_TURNO");

  // ESTADO: BLOQUEADO POR DÍA ANTERIOR
  if (estadoActual === "BLOQUEADO_DIA_ANTERIOR") {
    return (
      <Link
        href="/admin/caja"
        title="Alerta Crítica: Caja del día anterior pendiente de arqueo y cierre. Clic para resolver."
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 font-bold text-xs transition shadow-2xs animate-pulse"
      >
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="hidden sm:inline">Caja Bloqueada:</span>
        <span>Cerrar Día Anterior</span>
      </Link>
    );
  }

  // ESTADO: SIN TURNO ABIERTO
  if (estadoActual === "SIN_TURNO" || !cajonConectado) {
    return (
      <button
        type="button"
        onClick={abrirModalHandler}
        title="No hay turno de caja abierto hoy. Clic para aperturar con base inicial."
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs transition shadow-2xs cursor-pointer"
      >
        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Sin Cajón Abierto</span>
        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-md text-amber-900">
          Aperturar
        </span>
      </button>
    );
  }

  // ESTADO: REQUIERE DECISIÓN DE MODALIDAD
  if (estadoActual === "REQUIERE_DECISION_MODALIDAD") {
    return (
      <button
        type="button"
        onClick={abrirModalHandler}
        title="Debe elegir a qué cajón conectarse hoy."
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-950 font-bold text-xs transition shadow-2xs cursor-pointer"
      >
        <Users className="w-4 h-4 text-blue-600 shrink-0" />
        <span>Seleccionar Cajón</span>
      </button>
    );
  }

  // ESTADO: CAJÓN SINCRONIZADO EN TIEMPO REAL
  const esDividida = cajonConectado.modalidad === "DIVIDIDA";
  const arqueo = cajonConectado.arqueo;

  return (
    <>
      <div className="inline-flex items-center gap-1 sm:gap-2 p-1 pl-2 sm:pl-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-800">
        {/* Punto verde pulsante de Sincronización */}
        <div className="flex items-center gap-1.5 pr-1 sm:pr-2 border-r border-slate-200">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 leading-none">
              Sincronizado
            </span>
            <span className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[110px] sm:max-w-[140px]">
              {cajonConectado.nombreGabinete}
            </span>
          </div>
        </div>

        {/* Modo de Caja: Compartida vs Dividida */}
        <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
          {esDividida ? (
            <>
              <Layers className="w-3 h-3 text-indigo-600" />
              <span>Dividida</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3 text-emerald-600" />
              <span>Compartida</span>
            </>
          )}
        </div>

        {/* Saldo Actual en Cajón (Efectivo Real en Gaveta) */}
        <div
          onClick={() => setModalDetalleAbierto(true)}
          title="Efectivo físico estimado en gaveta en tiempo real. Clic para ver desglose."
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 text-emerald-950 font-black cursor-pointer transition"
        >
          <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[8.5px] font-bold text-emerald-800 uppercase tracking-wider leading-none">
              En Cajón
            </span>
            <span className="text-xs sm:text-sm font-mono tracking-tight leading-tight">
              ${saldoActualEnCajon.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Recaudo Digital del Turno (Opcional según pantalla) */}
        {!compacto && (
          <div
            title="Recaudo digital acumulado del turno (Nequi, Daviplata, Transferencias)"
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-bold text-xs"
          >
            <CreditCard className="w-3 h-3 text-blue-600 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[8.5px] font-bold text-blue-700 uppercase tracking-wider leading-none">
                Digital
              </span>
              <span className="text-xs font-mono font-black leading-tight">
                ${totalDigital.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        )}

        {/* Botón Refrescar en Vivo */}
        {onRefrescar && (
          <button
            type="button"
            onClick={onRefrescar}
            disabled={cargando}
            title="Actualizar saldo del cajón en tiempo real"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-blue-600" : ""}`} />
          </button>
        )}

        {/* Botón Ver / Cambiar Cajón */}
        <button
          type="button"
          onClick={() => setModalDetalleAbierto(true)}
          title="Ver detalle del turno o cambiar de cajón"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* MODAL FLOTANTE DE DETALLE RÁPIDO DE CAJÓN */}
      {modalDetalleAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-slate-800">
            {/* Cabecera Clara Antifatiga */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Vault className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {cajonConectado.nombreGabinete}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Cajón {esDividida ? "Dividido Independiente" : "Compartido"} &bull; Responsable: {cajonConectado.usuarioCajero.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalleAbierto(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido / Desglose Financiero */}
            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-emerald-950">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Efectivo Total Estimado en Cajón:</span>
                  <span className="text-base font-black font-mono text-emerald-950">
                    ${saldoActualEnCajon.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="border-t border-emerald-200/80 pt-2 space-y-1 text-[11px] font-medium text-emerald-900">
                  <div className="flex justify-between">
                    <span>Base Inicial de Efectivo:</span>
                    <span className="font-mono font-bold">${cajonConectado.baseInicialEfectivo.toLocaleString("es-CO")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventas y Cobros en Efectivo:</span>
                    <span className="font-mono font-bold">+${(arqueo?.totalEfectivo || 0).toLocaleString("es-CO")}</span>
                  </div>
                  {arqueo && arqueo.depositosEfectivoRecibidos > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Depósitos de Alquiler en Custodia:</span>
                      <span className="font-mono font-bold">+${arqueo.depositosEfectivoRecibidos.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  {arqueo && arqueo.depositosEfectivoDevueltos > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Depósitos de Alquiler Reintegrados:</span>
                      <span className="font-mono">- ${(arqueo.depositosEfectivoDevueltos || 0).toLocaleString("es-CO")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recaudo Digital */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-center justify-between">
                <div>
                  <span className="font-bold block">Recaudo Digital del Turno:</span>
                  <span className="text-[10px] text-blue-700">Nequi, Daviplata, Bancolombia, Transferencias</span>
                </div>
                <span className="font-mono font-black text-sm text-blue-900">
                  ${totalDigital.toLocaleString("es-CO")}
                </span>
              </div>

              {/* Cajeros Participantes en este gabinete */}
              {cajonConectado.cajerosParticipantes && cajonConectado.cajerosParticipantes.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Usuarios Vinculados a este Cajón:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {cajonConectado.cajerosParticipantes.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                      >
                        {c.nombre} ({c.username})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pie y Acciones */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <Link
                href="/admin/caja"
                target="_blank"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 underline"
              >
                <Vault className="w-3.5 h-3.5" />
                <span>Panel de Arqueo y Cierre</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2">
                {onCambiarCajon && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalDetalleAbierto(false);
                      onCambiarCajon();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    Cambiar Cajón
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalDetalleAbierto(false)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
