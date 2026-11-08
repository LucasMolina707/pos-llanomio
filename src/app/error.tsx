"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, ShoppingBag } from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Error capturado en boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8] p-4 sm:p-6 overflow-x-hidden text-slate-800">
      <div className="mb-6">
        <LogoEmpresa size="md" showText orientation="horizontal" />
      </div>

      <div className="max-w-md w-full bg-[#FCFDFE] rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold tracking-wider uppercase mb-3">
          Error en la Vista
        </span>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          Ha Ocurrido un Problema Inesperado
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
          Se presentó una inconsistencia al procesar los datos de esta pantalla. Puede reintentar la operación o regresar al panel principal.
        </p>

        {error?.message && (
          <details className="mb-5 text-left p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <summary className="cursor-pointer font-bold text-slate-800 select-none">
              Ver detalle técnico
            </summary>
            <p className="mt-2 font-mono text-[11px] text-rose-700 break-words leading-tight">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                Código: {error.digest}
              </p>
            )}
          </details>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            <span>Reintentar Operación</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300/80"
            >
              <Home className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              <span>Panel Principal</span>
            </Link>

            <Link
              href="/caja/pos"
              className="inline-flex items-center justify-center min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300/80"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span>Terminal POS</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
