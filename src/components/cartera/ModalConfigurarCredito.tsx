"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Check, X, ShieldCheck, AlertCircle, RefreshCw, Calendar, DollarSign } from "lucide-react";
import InputDinero from "@/components/ui/InputDinero";

interface ModalConfigurarCreditoProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  creditoHabilitadoInicial?: boolean;
  cupoCreditoInicial?: number;
  diasCreditoInicial?: number;
  notasCreditoInicial?: string | null;
  onCreditoActualizado: () => void;
}

export default function ModalConfigurarCredito({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  creditoHabilitadoInicial = false,
  cupoCreditoInicial = 0,
  diasCreditoInicial = 30,
  notasCreditoInicial = "",
  onCreditoActualizado,
}: ModalConfigurarCreditoProps) {
  const [habilitado, setHabilitado] = useState(creditoHabilitadoInicial);
  const [cupo, setCupo] = useState(String(cupoCreditoInicial || ""));
  const [dias, setDias] = useState(diasCreditoInicial || 30);
  const [notas, setNotas] = useState(notasCreditoInicial || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHabilitado(creditoHabilitadoInicial);
      setCupo(String(cupoCreditoInicial || ""));
      setDias(diasCreditoInicial || 30);
      setNotas(notasCreditoInicial || "");
      setError(null);
    }
  }, [isOpen, creditoHabilitadoInicial, cupoCreditoInicial, diasCreditoInicial, notasCreditoInicial]);

  if (!isOpen) return null;

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cupoNum = Math.max(0, parseFloat(cupo) || 0);

    if (habilitado && cupoNum <= 0) {
      setError("Si habilita la línea de crédito, debe asignar un cupo mayor a $0.");
      return;
    }

    try {
      setGuardando(true);
      const res = await fetch(`/api/clientes/${clienteId}/cartera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditoHabilitado: habilitado,
          cupoCredito: cupoNum,
          diasCredito: dias,
          notasCredito: notas.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar la configuración de crédito");
      }

      onCreditoActualizado();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de red al actualizar la cartera");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Línea de Crédito y Cartera
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {clienteNombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle de Habilitación */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 block">
                Estado de la Línea de Crédito
              </span>
              <span className="text-[11px] text-slate-500">
                {habilitado
                  ? "El cliente puede operar a crédito en ventas y alquileres"
                  : "Operaciones a crédito bloqueadas en mostrador"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setHabilitado(!habilitado)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                habilitado ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  habilitado ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Cupo de Crédito */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>Cupo Autorizado ($ COP):</span>
            </label>
            <div className="relative">
              <InputDinero
                mostrarPrefijo
                disabled={!habilitado}
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
                placeholder="0"
                className="w-full pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-60"
              />
            </div>
            <div className="flex gap-1.5 pt-1">
              {[200000, 500000, 1000000, 2000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={!habilitado}
                  onClick={() => setCupo(String(val))}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ${(val / 1000).toLocaleString("es-CO")}k
                </button>
              ))}
            </div>
          </div>

          {/* Días de Plazo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Plazo de Pago (Días):</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!habilitado}
                  onClick={() => setDias(d)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer disabled:opacity-50 ${
                    dias === d
                      ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>

          {/* Notas / Condiciones de Crédito */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Observaciones de Crédito (Opcional):
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Autorizado con codeudor, pagaré firmado, cliente corporativo..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Guardar Condiciones</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
