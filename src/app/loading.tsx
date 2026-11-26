import React from "react";

export default function RootLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col gap-6 animate-pulse">
      {/* Barra superior de carga */}
      <div className="h-14 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200" />
          <div className="h-5 w-40 rounded-lg bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-xl bg-slate-200" />
          <div className="h-8 w-8 rounded-xl bg-slate-200" />
        </div>
      </div>

      {/* Contenido principal en esqueleto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        <div className="h-96 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col gap-4">
          <div className="h-6 w-32 rounded-lg bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-100" />
          <div className="space-y-3 pt-4 flex-1">
            <div className="h-12 w-full rounded-xl bg-slate-100" />
            <div className="h-12 w-full rounded-xl bg-slate-100" />
            <div className="h-12 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
        <div className="h-96 md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 rounded-lg bg-slate-200" />
            <div className="h-8 w-28 rounded-xl bg-slate-100" />
          </div>
          <div className="h-10 w-full rounded-xl bg-slate-100" />
          <div className="space-y-3 pt-4 flex-1">
            <div className="h-14 w-full rounded-xl bg-slate-50 border border-slate-100" />
            <div className="h-14 w-full rounded-xl bg-slate-50 border border-slate-100" />
            <div className="h-14 w-full rounded-xl bg-slate-50 border border-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
