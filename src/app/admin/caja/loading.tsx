import React from "react";

export default function CajaLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col gap-6 animate-pulse">
      {/* Header Arqueo de Caja */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-52 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-xl bg-slate-100" />
      </div>

      {/* Paneles de Cuadre y Desglose */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="h-24 rounded-xl bg-emerald-50/50 border border-emerald-100" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-50" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-50 border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
