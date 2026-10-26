"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8] p-4 sm:p-6 overflow-x-hidden">
      <div className="mb-6">
        <LogoEmpresa size="md" showText orientation="horizontal" />
      </div>

      <div className="max-w-md w-full bg-[#FCFDFE] rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold tracking-wider uppercase mb-3">
          Error 403 &bull; Permisos Insuficientes
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-2">
          Acceso Restringido
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          El módulo al que intenta acceder está reservado para usuarios con rol de{" "}
          <strong className="text-slate-800 font-semibold">Administrador General</strong>. Su sesión actual tiene permisos de{" "}
          <strong className="text-slate-800 font-semibold">Cajero</strong>.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar al Menú Principal
          </Link>

          <button
            type="button"
            onClick={handleCerrarSesion}
            className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition border border-slate-300/80"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión / Cambiar de Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
