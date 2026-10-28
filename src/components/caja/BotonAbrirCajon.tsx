"use client";

import React, { useState, useEffect } from "react";
import { LockOpen, CheckCircle2, AlertCircle, X, Sparkles, KeyRound } from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";

interface BotonAbrirCajonProps {
  className?: string;
  variante?: "barra" | "destacado" | "icono";
  mostrarAtajo?: boolean;
}

const MOTIVOS_APERTURA = [
  {
    id: "CAMBIO_SENCILLO",
    titulo: "Dar cambio / Cambiar billete por sencillo",
    descripcion: "Para entregar o fraccionar billetes sin emitir una venta.",
  },
  {
    id: "BASE_INICIAL",
    titulo: "Ingresar Base Inicial / Efectivo a Gaveta",
    descripcion: "Al comenzar el turno para depositar el efectivo de caja.",
  },
  {
    id: "ARQUEO_VERIFICACION",
    titulo: "Conteo de Arqueo / Verificación de Caja",
    descripcion: "Para conteo físico de dinero en arqueos o cambio de turno.",
  },
  {
    id: "CUSTODIA_DEPOSITO",
    titulo: "Custodia o Revisión de Depósito en Efectivo",
    descripcion: "Comprobación de garantías de trajes o recepción de fianza.",
  },
  {
    id: "OTRO_AUTORIZADO",
    titulo: "Otro motivo operativo autorizado",
    descripcion: "Cualquier otra apertura requerida por el administrador.",
  },
];

export default function BotonAbrirCajon({
  className = "",
  variante = "barra",
  mostrarAtajo = true,
}: BotonAbrirCajonProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [notificacion, setNotificacion] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  // Escuchar atajo de teclado F9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        setModalAbierto((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const ejecutarApertura = async (motivoId: string, motivoTexto: string) => {
    try {
      setDisparando(true);
      const res = await safeFetchJson<{
        ok: boolean;
        mensaje: string;
        resultado?: { impresoraUsada: string; detalle?: string };
        error?: string;
      }>("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoTexto }),
      });

      if (res.ok && res.data) {
        setNotificacion({
          tipo: "exito",
          texto: res.data.resultado?.impresoraUsada
            ? `Cajón abierto (${res.data.resultado.impresoraUsada})`
            : "Pulso enviado al cajón monedero",
        });
      } else {
        setNotificacion({
          tipo: "error",
          texto: res.error || "No se pudo comunicar con el cajón",
        });
      }
    } catch {
      setNotificacion({
        tipo: "error",
        texto: "Error de red al intentar abrir el cajón",
      });
    } finally {
      setDisparando(false);
      setModalAbierto(false);

      // Limpiar notificación tras 3.5 segundos
      setTimeout(() => {
        setNotificacion(null);
      }, 3500);
    }
  };

  return (
    <>
      {/* Botón Principal */}
      {variante === "barra" && (
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          title="Abrir cajón monedero manualmente (Atajo: F9)"
          className={`h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 ${className}`}
        >
          <LockOpen className="h-4 w-4 text-amber-700 shrink-0" />
          <span className="hidden sm:inline">Abrir Cajón</span>
          {mostrarAtajo && (
            <span className="text-[10px] bg-amber-200/70 text-amber-950 font-mono px-1 py-0.5 rounded-md border border-amber-300">
              F9
            </span>
          )}
        </button>
      )}

      {variante === "destacado" && (
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className={`px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 ${className}`}
        >
          <LockOpen className="h-4 w-4 text-slate-950 shrink-0" />
          <span>Abrir Cajón Monedero</span>
          {mostrarAtajo && (
            <span className="text-[10px] bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded font-mono">
              F9
            </span>
          )}
        </button>
      )}

      {variante === "icono" && (
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          title="Abrir cajón monedero (F9)"
          className={`h-8 w-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center transition-all ${className}`}
        >
          <LockOpen className="h-4 w-4 text-amber-700" />
        </button>
      )}

      {/* Toast o Notificación Flotante */}
      {notificacion && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold ${
              notificacion.tipo === "exito"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            {notificacion.tipo === "exito" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notificacion.texto}</span>
          </div>
        </div>
      )}

      {/* Modal Rápido de 1 Clic para Motivo de Apertura */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Cabecera del Modal */}
            <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Apertura Manual de Cajón
                  </h3>
                  <p className="text-[11px] text-amber-900/80">
                    Seleccione el motivo operativo para abrir la gaveta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="h-7 w-7 rounded-lg hover:bg-amber-200/50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista de Motivos de 1 Clic */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {MOTIVOS_APERTURA.map((motivo) => (
                <button
                  key={motivo.id}
                  type="button"
                  disabled={disparando}
                  onClick={() => ejecutarApertura(motivo.id, motivo.titulo)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 bg-white transition flex items-start gap-3 group active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="h-7 w-7 rounded-lg bg-slate-100 group-hover:bg-amber-100 border border-slate-200 group-hover:border-amber-300 flex items-center justify-center text-slate-600 group-hover:text-amber-800 shrink-0 mt-0.5 transition">
                    <LockOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-900">
                      {motivo.titulo}
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      {motivo.descripcion}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pie del Modal con aviso informativo */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Disparo instantáneo vía cable RJ11
              </span>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-slate-200/70 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
