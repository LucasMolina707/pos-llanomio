import React from "react";

export default function AlquileresLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] p-3 sm:p-4 flex flex-col gap-3 animate-pulse">
      {/* Header Mostrador Alquiler */}
      <div className="h-14 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100" />
          <div className="h-5 w-48 rounded-lg bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-200" />
          <div className="h-9 w-32 rounded-xl bg-slate-200" />
        </div>
      </div>

      {/* Grid Mostrador Alquileres */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
          <div className="h-10 w-full rounded-xl bg-slate-100" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-50 border border-slate-100 p-3 flex flex-col justify-between">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-5 w-1/2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3 flex-1">
            <div className="h-6 w-40 rounded-lg bg-slate-200" />
            <div className="h-20 rounded-xl bg-orange-50/50 border border-orange-100" />
            <div className="h-16 rounded-xl bg-slate-50 border border-slate-100" />
            <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-4 w-28 rounded bg-slate-200" />
              </div>
              <div className="h-12 w-full rounded-xl bg-orange-600/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
