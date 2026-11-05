"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Wallet,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  X,
  ExternalLink,
  Vault,
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

  // Turno activo efectivo (evaluado con tolerancia total a fallos)
  const turnoEfectivo = cajonConectado || seguridadCaja?.turnoAbierto || null;
  const hayTurnoActivo =
    Boolean(turnoEfectivo) ||
    estado === "ABIERTO_HOY" ||
    seguridadCaja?.estado === "ABIERTO_HOY" ||
    Boolean(seguridadCaja?.turnosAbiertosHoy && seguridadCaja.turnosAbiertosHoy.length > 0);

  // ESTADO: BLOQUEADO POR DÍA ANTERIOR (Solo si no hay un turno activo hoy)
  if (
    !hayTurnoActivo &&
    (estado === "BLOQUEADO_DIA_ANTERIOR" || seguridadCaja?.estado === "BLOQUEADO_DIA_ANTERIOR")
  ) {
    return (
      <Link
        href="/admin/caja"
        title="Alerta Crítica: Caja del día anterior pendiente de arqueo y cierre. Clic para resolver."
        className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-950 flex items-center gap-2 transition-all cursor-pointer shadow-2xs animate-pulse"
      >
        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
        <span className="text-xs font-bold text-rose-900 whitespace-nowrap">
          Caja Bloqueada
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200/80 px-2 py-0.5 rounded-md text-rose-950">
          Cerrar Día Anterior
        </span>
      </Link>
    );
  }

  // =========================================================================
  // REGLA FUNDAMENTAL DE NEGOCIO:
  // Cuando YA SE INICIÓ el turno en caja:
  // Renderiza SIEMPRE en verde: "Turno Activo" y el "Caja: $XX.XXX"
  // =========================================================================
  if (hayTurnoActivo) {
    const arqueo = turnoEfectivo?.arqueo;
    const nombreCajero =
      turnoEfectivo?.usuarioCajero?.nombre ||
      seguridadCaja?.turnoAbierto?.usuarioCajero?.nombre ||
      "Cajero Principal";
    const nombreGabinete =
      turnoEfectivo?.nombreGabinete ||
      seguridadCaja?.turnoAbierto?.nombreGabinete ||
      "Turno Activo en Tienda";
    const baseInicial =
      turnoEfectivo?.baseInicialEfectivo ??
      seguridadCaja?.turnoAbierto?.baseInicialEfectivo ??
      0;

    const tooltipDesglose = `Turno Conectado (Ventas, Alquileres y Apartados) · Cajero: ${nombreCajero} · Efectivo en Caja: $${saldoActualEnCajon.toLocaleString("es-CO")} · Digital: $${totalDigital.toLocaleString("es-CO")}`;

    return (
      <>
        <div className="h-9 px-3 rounded-xl bg-emerald-50/90 border border-emerald-300 text-slate-900 flex items-center gap-2.5 shadow-2xs">
          {/* 1. Indicador de Sesión de Caja Conectada */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-emerald-900 whitespace-nowrap">
              Turno Activo
            </span>
          </div>

          {/* 2. Separador vertical sutil */}
          <div className="h-4 w-[1px] bg-emerald-200" />

          {/* 3. Saldo en Caja en Vivo */}
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-xs sm:text-sm font-mono font-black text-emerald-950 whitespace-nowrap">
              Caja: ${saldoActualEnCajon.toLocaleString("es-CO")}
            </span>
          </div>

          {/* 4. Botón cuadrado discreto de refresco/detalle */}
          <div className="flex items-center gap-1">
            {onRefrescar && (
              <button
                type="button"
                onClick={onRefrescar}
                disabled={cargando}
                title="Actualizar saldo en caja en vivo"
                className="w-6 h-6 rounded-lg hover:bg-emerald-200/60 flex items-center justify-center transition-colors cursor-pointer text-emerald-800 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-emerald-700" : ""}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalDetalleAbierto(true)}
              title={tooltipDesglose}
              className="w-6 h-6 rounded-lg hover:bg-emerald-200/60 flex items-center justify-center transition-colors cursor-pointer text-emerald-800"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
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
                      {nombreGabinete}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ventas, Alquileres y Apartados &bull; Responsable: {nombreCajero}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDetalleAbierto(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido / Desglose Financiero */}
              <div className="p-5 space-y-3.5 text-xs">
                {/* Dinero de la Tienda */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Dinero de la Tienda (Ventas y Alquileres):</span>
                    <span className="text-sm font-black font-mono text-emerald-950">
                      ${((arqueo?.totalEfectivo || 0) + totalDigital).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-emerald-900">
                    <span>Efectivo cobrado: ${(arqueo?.totalEfectivo || 0).toLocaleString("es-CO")}</span>
                    <span>Digital: ${totalDigital.toLocaleString("es-CO")}</span>
                  </div>
                </div>

                {/* Dinero en Custodia */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Dinero en Custodia (Depósitos en Garantía):</span>
                    <span className="text-sm font-black font-mono text-amber-950">
                      ${Math.max(0, (arqueo?.depositosEfectivoRecibidos || 0) - (arqueo?.depositosEfectivoDevueltos || 0)).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Depósitos en garantía pertenecientes a los clientes (permanece en gaveta física hasta la devolución del traje).
                  </p>
                </div>

                {/* Total Estimado en Gaveta Física */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-900">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Total Físico en Caja:</span>
                    <span className="text-base font-black font-mono text-slate-950">
                      ${saldoActualEnCajon.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 space-y-1 text-[11px] font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span>Base Inicial de Efectivo:</span>
                      <span className="font-mono font-bold text-slate-800">${baseInicial.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo Tienda (Ventas y Abonos):</span>
                      <span className="font-mono font-bold text-slate-800">+${(arqueo?.totalEfectivo || 0).toLocaleString("es-CO")}</span>
                    </div>
                    {arqueo && (arqueo.depositosEfectivoRecibidos > 0 || arqueo.depositosEfectivoDevueltos > 0) && (
                      <div className="flex justify-between text-amber-800">
                        <span>Custodia Neta en Gaveta:</span>
                        <span className="font-mono font-bold">
                          +${Math.max(0, (arqueo.depositosEfectivoRecibidos || 0) - (arqueo.depositosEfectivoDevueltos || 0)).toLocaleString("es-CO")}
                        </span>
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
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Cambiar Cajón
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalDetalleAbierto(false)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
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

  // =========================================================================
  // ESTADO A: ÚNICAMENTE CUANDO NO SE HA INICIADO EL TURNO EN CAJA
  // =========================================================================
  return (
    <button
      type="button"
      onClick={abrirModalHandler}
      title="Turno cerrado. Clic para iniciar turno en caja (aplica para Ventas, Alquileres y Apartados)"
      className="h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
    >
      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
      <span className="text-xs font-extrabold tracking-tight whitespace-nowrap px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950">
        Iniciar Turno en Caja
      </span>
    </button>
  );
}
