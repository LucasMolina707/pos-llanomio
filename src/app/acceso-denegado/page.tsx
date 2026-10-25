"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

export default function AccesoDenegadoPage() {
  const router = useRouter();

  const handleCerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-6">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold tracking-wider uppercase mb-3">
          Error 403 - Permisos Insuficientes
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Acceso Restringido
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          El módulo al que intenta acceder está reservado exclusivamente para usuarios con rol de <strong>Administrador General</strong>. Su sesión actual tiene permisos de <strong>Cajero</strong>.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar a la Terminal Principal
          </Link>

          <button
            onClick={handleCerrarSesion}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition border border-slate-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión / Cambiar de Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
