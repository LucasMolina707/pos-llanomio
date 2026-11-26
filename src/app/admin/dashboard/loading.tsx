import React from "react";

export default function DashboardLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col gap-6 animate-pulse">
      {/* Header Dashboard */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-40 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-xl bg-slate-100" />
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="w-8 h-8 rounded-lg bg-slate-100" />
            </div>
            <div className="h-7 w-32 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Tablas de Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-50 border border-slate-100" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-50 border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
