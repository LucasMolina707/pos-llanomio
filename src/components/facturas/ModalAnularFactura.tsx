"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";

export interface FacturaParaAnular {
  id: string;
  numeroFactura: string;
  clienteNombre?: string;
  clienteDocumento?: string;
  tipoOperacion?: string;
  totalFactura: number;
  totalAbonado: number;
  cantidadPrendas?: number;
  prendaPrincipal?: string;
}

interface ModalAnularFacturaProps {
  abierto: boolean;
  factura: FacturaParaAnular | null;
  onCerrar: () => void;
  onAnulacionExitosa: (mensaje: string) => void;
}

export default function ModalAnularFactura({
  abierto,
  factura,
  onCerrar,
  onAnulacionExitosa,
}: ModalAnularFacturaProps) {
  const [pinSeguridad, setPinSeguridad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!abierto || !factura) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setErrorLocal("Debe indicar el motivo detallado de la anulación.");
      return;
    }
    if (!pinSeguridad.trim()) {
      setErrorLocal("El PIN o contraseña de supervisor es obligatorio.");
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
            motivo: motivo.trim(),
          }),
        }
      );

      if (res.ok && (res.data?.success || res.data?.ok)) {
        onAnulacionExitosa(
          res.data?.mensaje ||
            `Factura N° ${factura.numeroFactura} anulada exitosamente. Se restituyó el inventario y se ajustó la caja.`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden">
        {/* Encabezado de Advertencia */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-rose-950">
                Anulación y Reversión Real de Transacción
              </h3>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Factura N° {factura.numeroFactura} &bull; {factura.tipoOperacion || "VENTA / ALQUILER"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Reversión */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-2.5 text-xs">
            <p className="font-bold text-slate-900 text-xs sm:text-sm">
              Impacto de la Anulación en Base de Datos:
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-medium block">Inventario:</span>
                  <span className="font-bold text-slate-800">
                    Restitución a DISPONIBLE ({factura.prendaPrincipal || "Prendas asociadas"})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-medium block">Caja y Reportes:</span>
                  <span className="font-bold text-rose-600">
                    Se deducen ${factura.totalAbonado.toLocaleString("es-CO")} de recaudos
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 border-t border-slate-200/70 pt-2">
              Cliente: <strong className="text-slate-700">{factura.clienteNombre || "Consumidor Final"}</strong>
              {factura.clienteDocumento ? ` (CC: ${factura.clienteDocumento})` : ""}
            </p>
          </div>

          {errorLocal && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorLocal}</span>
            </div>
          )}

          {/* Campo: Motivo Obligatorio */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Motivo de la Anulación <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Solicitud de cancelación por cliente / Error en cobro..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={procesando}
              className="w-full h-10 px-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Campo: PIN de Supervisor o Contraseña */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>PIN de Supervisor (6 dígitos) o Clave Admin</span>
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              placeholder="Ingrese PIN o clave del administrador..."
              value={pinSeguridad}
              onChange={(e) => setPinSeguridad(e.target.value)}
              disabled={procesando}
              className="w-full h-10 px-3 font-mono text-center tracking-widest text-sm text-slate-900 border border-slate-300 rounded-xl outline-none focus:border-rose-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Doble confirmación de seguridad exigida para validar la anulación inmutable.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCerrar}
              disabled={procesando}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando || !motivo.trim() || !pinSeguridad.trim()}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {procesando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Revirtiendo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar y Ejecutar Reversión</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
