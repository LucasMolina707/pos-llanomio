"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, KeyRound, X, AlertCircle } from "lucide-react";

export interface ModalPinSupervisorProps {
  abierto: boolean;
  motivo: string;
  onCerrar: () => void;
  onAutorizado: (supervisor: { id: string; nombre: string; username: string }) => void;
}

export function ModalPinSupervisor({
  abierto,
  motivo,
  onCerrar,
  onAutorizado,
}: ModalPinSupervisorProps) {
  const [credencial, setCredencial] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setCredencial("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [abierto]);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credencial.trim()) {
      setError("Ingrese el PIN de 6 dígitos o la contraseña del supervisor.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verificar-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: credencial.trim(), motivo }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        onAutorizado(data.supervisor);
        onCerrar();
      } else {
        setError(data.error || "PIN o contraseña no válida para supervisor.");
      }
    } catch {
      setError("Error de conexión al verificar supervisor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                Autorización de Supervisor Requerida
              </h3>
              <p className="text-xs text-slate-500">Operación especial protegida en mostrador</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">Motivo de autorización:</span>
            {motivo}
          </div>

          {error && (
            <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              PIN numérico (6 dígitos) o Contraseña Administrador
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                value={credencial}
                onChange={(e) => setCredencial(e.target.value)}
                placeholder="******"
                disabled={cargando}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center text-lg tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={cargando}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !credencial.trim()}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-sm"
            >
              {cargando ? "Validando..." : "Autorizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalPinSupervisor;

