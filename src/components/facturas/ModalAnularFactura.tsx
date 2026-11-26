"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Package,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  User,
} from "lucide-react";
import { safeFetchJson, invalidarCacheApi } from "@/lib/safe-fetch";

export interface FacturaParaAnular {
  id: string;
  numeroFactura: string;
  clienteNombre?: string;
  clienteDocumento?: string;
  tipoOperacion?: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente?: number;
  cantidadPrendas?: number;
  prendaPrincipal?: string;
}

interface ModalAnularFacturaProps {
  abierto: boolean;
  factura: FacturaParaAnular | null;
  onCerrar: () => void;
  onAnulacionExitosa: (mensaje: string) => void;
}

const MOTIVOS_PREDETERMINADOS = [
  "Cancelación solicitada por el cliente",
  "Error de digitación o monto incorrecto en mostrador",
  "Prenda devuelta antes de su retiro o uso",
  "Cambio de prenda o reestructuración de contrato",
  "Otro motivo específico",
];

export default function ModalAnularFactura({
  abierto,
  factura,
  onCerrar,
  onAnulacionExitosa,
}: ModalAnularFacturaProps) {
  // Stepper de 2 pasos
  const [paso, setPaso] = useState<1 | 2>(1);

  // Paso 1: Motivo
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_PREDETERMINADOS[0]);
  const [motivoDetalle, setMotivoDetalle] = useState("");

  // Paso 2: Doble Confirmación de Seguridad
  const [palabraConfirmacion, setPalabraConfirmacion] = useState("");
  const [pinSeguridad, setPinSeguridad] = useState("");

  // Estados de proceso y feedback
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Reiniciar estados al abrir/cerrar
  useEffect(() => {
    if (abierto) {
      setPaso(1);
      setMotivoSeleccionado(MOTIVOS_PREDETERMINADOS[0]);
      setMotivoDetalle("");
      setPalabraConfirmacion("");
      setPinSeguridad("");
      setErrorLocal(null);
      setProcesando(false);
    }
  }, [abierto, factura]);

  if (!abierto || !factura) return null;

  const motivoFinal =
    motivoSeleccionado === "Otro motivo específico"
      ? motivoDetalle.trim()
      : motivoDetalle.trim()
      ? `${motivoSeleccionado}: ${motivoDetalle.trim()}`
      : motivoSeleccionado;

  const puedeAvanzarPaso1 = motivoFinal.trim().length >= 5;
  const palabraValida = palabraConfirmacion.trim().toUpperCase() === "ANULAR";
  const pinValido = pinSeguridad.trim().length >= 4;
  const puedeEjecutarPaso2 = palabraValida && pinValido && !procesando;

  const handleAvanzarPaso2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeAvanzarPaso1) {
      setErrorLocal("Debe indicar un motivo detallado de al menos 5 caracteres.");
      return;
    }
    setErrorLocal(null);
    setPaso(2);
  };

  const handleEjecutarAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEjecutarPaso2) {
      setErrorLocal("Complete la confirmación de seguridad y el PIN de supervisor.");
      return;
    }

    try {
      setProcesando(true);
      setErrorLocal(null);

      const res = await safeFetchJson<{ success: boolean; ok?: boolean; mensaje?: string; error?: string }>(
        `/api/facturas/${factura.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinSeguridad: pinSeguridad.trim(),
            motivo: motivoFinal,
          }),
        }
      );

      if (res.ok && (res.data?.success || res.data?.ok)) {
        // Invalidar de inmediato la caché en cliente para sincronización instantánea
        invalidarCacheApi("/api/inventario");
        invalidarCacheApi("/api/facturas");
        invalidarCacheApi("/api/apartados");
        invalidarCacheApi("/api/caja");
        invalidarCacheApi("/api/dashboard");

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("pos_inventario_actualizado"));
          window.dispatchEvent(new Event("pos_facturas_actualizadas"));
        }

        onAnulacionExitosa(
          res.data?.mensaje ||
            `Factura N° ${factura.numeroFactura} anulada exitosamente. Se restituyó el inventario y se reversó la caja.`
        );
        onCerrar();
      } else {
        setErrorLocal(res.data?.error || res.error || "No se pudo anular la factura. Verifique credenciales.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de comunicación con el servidor local";
      setErrorLocal(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Encabezado con Indicador de Paso */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-rose-950">
                  Anulación y Reversión Contable
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 border border-rose-300">
                  Paso {paso} de 2
                </span>
              </div>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Comprobante N° {factura.numeroFactura} &bull; {factura.tipoOperacion || "OPERACION"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================================================================== */}
        {/* PASO 1: Resumen de Operación, Impacto y Selección de Motivo */}
        {/* ==================================================================== */}
        {paso === 1 && (
          <form onSubmit={handleAvanzarPaso2} className="p-5 sm:p-6 space-y-4">
            {/* Resumen Detallado de la Operación */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Resumen de la Transacción:
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {factura.tipoOperacion}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-medium block text-[11px]">Cliente:</span>
                    <span className="font-bold text-slate-800">
                      {factura.clienteNombre || "Consumidor Final"}
                    </span>
                    {factura.clienteDocumento && (
                      <span className="text-[10px] text-slate-500 block">Doc: {factura.clienteDocumento}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-medium block text-[11px]">Prendas / Artículos:</span>
                    <span className="font-bold text-slate-800">
                      {factura.prendaPrincipal || "Prendas vinculadas"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Impacto Financiero y Reversión en Caja */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-500 font-medium block text-[11px]">Total Facturado:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    ${Number(factura.totalFactura || 0).toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                  <span className="text-rose-800 font-bold block text-[11px]">Reversión de Caja / Recaudos:</span>
                  <span className="font-mono font-black text-rose-700 text-sm">
                    -${Number(factura.totalAbonado || 0).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Advertencia Legal / Contable */}
              <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Impacto Inmediato:</strong> Todas las prendas asociadas volverán a quedar en estado <strong>DISPONIBLE</strong> en inventario. El dinero recaudado se descontará del saldo de caja y la operación quedará excluida de métricas de ingresos.
              </div>
            </div>

            {errorLocal && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorLocal}</span>
              </div>
            )}

            {/* Motivo Obligatorio */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Motivo Obligatorio de Anulación: <span className="text-rose-600">*</span>
              </label>

              <select
                value={motivoSeleccionado}
                onChange={(e) => setMotivoSeleccionado(e.target.value)}
                disabled={procesando}
                className="w-full h-10 px-3 text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-rose-500 font-medium"
              >
                {MOTIVOS_PREDETERMINADOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Especifique detalles adicionales del motivo de anulación..."
                value={motivoDetalle}
                onChange={(e) => setMotivoDetalle(e.target.value)}
                disabled={procesando}
                rows={2}
                className="w-full p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Botones Paso 1 */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onCerrar}
                disabled={procesando}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!puedeAvanzarPaso1 || procesando}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span>Continuar a Seguridad</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ==================================================================== */}
        {/* PASO 2: Doble Confirmación con Palabra 'ANULAR' y PIN Supervisor */}
        {/* ==================================================================== */}
        {paso === 2 && (
          <form onSubmit={handleEjecutarAnulacion} className="p-5 sm:p-6 space-y-4">
            <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirmación Crítica de Anulación</span>
              </div>
              <p className="text-slate-700">
                Está a punto de marcar como <strong>ANULADA</strong> la Factura <strong>N° {factura.numeroFactura}</strong>.
              </p>
              <p className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-rose-100">
                <strong>Motivo asentado:</strong> {motivoFinal}
              </p>
            </div>

            {errorLocal && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorLocal}</span>
              </div>
            )}

            {/* Confirmación por Palabra Clave */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                1. Escriba la palabra <span className="font-mono text-rose-600 font-black">ANULAR</span> para desbloquear:
              </label>
              <input
                type="text"
                placeholder="Escriba ANULAR aquí..."
                value={palabraConfirmacion}
                onChange={(e) => setPalabraConfirmacion(e.target.value)}
                disabled={procesando}
                className="w-full h-10 px-3 font-mono text-center tracking-widest text-sm text-slate-900 border border-slate-300 rounded-xl outline-none focus:border-rose-500 uppercase font-black"
                autoFocus
              />
            </div>

            {/* Autorización por PIN o Clave */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>2. PIN de Supervisor (6 dígitos) o Clave Admin:</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                placeholder="Ingrese credencial de supervisor..."
                value={pinSeguridad}
                onChange={(e) => setPinSeguridad(e.target.value)}
                disabled={procesando}
                className="w-full h-10 px-3 font-mono text-center tracking-widest text-sm text-slate-900 border border-slate-300 rounded-xl outline-none focus:border-rose-500"
              />
            </div>

            {/* Botones Paso 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaso(1)}
                disabled={procesando}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Paso 1</span>
              </button>

              <button
                type="submit"
                disabled={!puedeEjecutarPaso2}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {procesando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Ejecutando Reversión...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar y Anular</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
