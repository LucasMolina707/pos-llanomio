import React from "react";

export default function ClientesLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col gap-5 animate-pulse">
      {/* Header Clientes */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-64 rounded bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 rounded-xl bg-slate-100" />
          <div className="h-10 w-36 rounded-xl bg-indigo-600/30" />
        </div>
      </div>

      {/* Directorio de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 flex-1">
        <div className="h-10 w-full rounded-xl bg-slate-100" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-28 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-8 w-20 rounded-lg bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
