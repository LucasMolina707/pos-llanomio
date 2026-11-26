"use client";

import React, { useState, useEffect, useRef } from "react";
import { Receipt, Check, X, AlertCircle, RefreshCw, Banknote, Building2, CreditCard } from "lucide-react";
import InputDinero from "@/components/ui/InputDinero";

interface ModalAbonarCarteraProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  saldoCarteraActual: number;
  onAbonoCompletado: () => void;
}

export default function ModalAbonarCartera({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  saldoCarteraActual,
  onAbonoCompletado,
}: ModalAbonarCarteraProps) {
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputMontoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMonto(saldoCarteraActual > 0 ? String(saldoCarteraActual) : "");
      setMetodoPago("EFECTIVO");
      setReferencia("");
      setNotas("");
      setError(null);
      setTimeout(() => {
        inputMontoRef.current?.focus();
        inputMontoRef.current?.select();
      }, 50);
    }
  }, [isOpen, saldoCarteraActual]);

  if (!isOpen) return null;

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const montoNum = Math.max(0, parseFloat(monto) || 0);
    if (montoNum <= 0) {
      setError("Ingrese un monto válido a abonar mayor a $0.");
      inputMontoRef.current?.focus();
      return;
    }

    try {
      setGuardando(true);
      const res = await fetch(`/api/clientes/${clienteId}/cartera`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: montoNum,
          metodoPago,
          referenciaComprobante: referencia.trim() || null,
          notas: notas.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo procesar el abono a cartera");
      }

      onAbonoCompletado();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de red al procesar el abono");
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
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Registrar Abono a Cartera
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
        <form onSubmit={handleRegistrarAbono} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Tarjeta de Saldo Actual */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Saldo Total Adeudado en Cartera:
              </span>
              <span className="font-mono text-xl font-black text-rose-600 tabular-nums">
                ${saldoCarteraActual.toLocaleString("es-CO")}
              </span>
            </div>
            {saldoCarteraActual > 0 && (
              <button
                type="button"
                onClick={() => setMonto(String(saldoCarteraActual))}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer"
              >
                Pagar Todo
              </button>
            )}
          </div>

          {/* Monto del Abono */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Monto del Abono ($ COP):
            </label>
            <div className="relative">
              <InputDinero
                ref={inputMontoRef}
                mostrarPrefijo
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Medio de Pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Medio de Pago:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago("EFECTIVO")}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metodoPago === "EFECTIVO"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago("BANCOLOMBIA")}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metodoPago === "BANCOLOMBIA"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                title="Bancolombia"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/iconos/bancolombia-logo.png"
                  alt="Bancolombia"
                  className={`h-3.5 max-h-4 w-auto max-w-[85px] object-contain transition-all ${
                    metodoPago === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago("NEQUI")}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metodoPago === "NEQUI"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Nequi</span>
              </button>
            </div>
          </div>

          {/* Referencia si no es efectivo */}
          {metodoPago !== "EFECTIVO" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                N° Comprobante / Referencia:
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Código de aprobación o transferencia"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Observaciones (Opcional):
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle o justificación del pago"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              disabled={guardando || parseFloat(monto) <= 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Abono</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
