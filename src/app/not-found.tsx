import React from "react";
import Link from "next/link";
import { FileQuestion, Home, ShoppingBag, Clock, ArrowLeft } from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8] p-4 sm:p-6 overflow-x-hidden text-slate-800">
      <div className="mb-6">
        <LogoEmpresa size="md" showText orientation="horizontal" />
      </div>

      <div className="max-w-md w-full bg-[#FCFDFE] rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-5">
          <FileQuestion className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider uppercase mb-3">
          Error 404 &bull; Ruta No Encontrada
        </span>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          Página No Encontrada
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          La vista o dirección a la que intenta acceder no existe, ha sido movida o no está disponible en este momento.
        </p>

        <div className="space-y-2.5">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Home className="w-4 h-4 mr-2" />
            <span>Regresar al Panel Principal</span>
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/caja/pos"
              className="inline-flex items-center justify-center min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300/80"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span>Terminal POS</span>
            </Link>

            <Link
              href="/caja/alquileres"
              className="inline-flex items-center justify-center min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300/80"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Alquileres</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
