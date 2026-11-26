import React from "react";

export default function InventarioLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col gap-5 animate-pulse">
      {/* Header Inventario */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-60 rounded bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 rounded-xl bg-slate-100" />
          <div className="h-10 w-36 rounded-xl bg-blue-600/30" />
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
            <div className="h-3.5 w-20 rounded bg-slate-200" />
            <div className="h-6 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Tabla / Grid de Productos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 flex-1">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-10 flex-1 rounded-xl bg-slate-100" />
          <div className="h-10 w-32 rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="h-4 w-48 rounded bg-slate-200" />
              </div>
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
