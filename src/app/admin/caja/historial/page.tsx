"use client";

import React from "react";
import Link from "next/link";
import { Vault, ArrowLeft, History, ShieldCheck, ArrowRight } from "lucide-react";
import HistorialArqueosView from "@/components/caja/HistorialArqueosView";

export default function HistorialArqueosCajaPage() {
  return (
    <div className="w-full space-y-6 max-w-full overflow-x-hidden">
      {/* 1. Cabecera Ergonómica de Historial Multi-Periodo */}
      <header className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/caja"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
            title="Volver al Control de Caja Activa"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Historial de Arqueos & Novedades de Caja
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
                Auditoría Multi-Periodo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Consolidación periódica de recaudos en efectivo y digitales (Diario, Mensual, Anual) con registro inmutable de novedades.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/caja"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center gap-2 shadow-2xs"
          >
            <Vault className="w-4 h-4 text-emerald-600" />
            <span>Turnos Activos</span>
          </Link>
          <Link
            href="/caja/pos"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 shadow-xs shadow-blue-500/20"
          >
            <span>Ir a Facturar al POS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* 2. Componente Central de Historial Multi-Periodo */}
      <HistorialArqueosView modoPaginaCompleta={true} />
    </div>
  );
}
