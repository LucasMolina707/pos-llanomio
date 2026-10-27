import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlantillaImpresion from "@/components/impresion/PlantillaImpresion";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

interface ImpresionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ImpresionFacturaPage({ params }: ImpresionPageProps) {
  const { id } = await params;

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9] select-none text-slate-800 antialiased font-sans">
      {/* Barra Superior con Botón Regresar y Accesos Rápidos */}
      <header className="min-h-[3.75rem] py-2 shrink-0 px-3 sm:px-4 bg-[#FCFDFE] text-slate-800 flex items-center justify-between border-b border-slate-200/90 shadow-2xs z-30 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold shadow-2xs flex items-center gap-2 transition shrink-0"
            title="Volver al panel principal"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Regresar</span>
          </Link>

          <div className="shrink-0">
            <LogoEmpresa size="sm" showText={false} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                VISOR OFICIAL DE COMPROBANTES E IMPRESIÓN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link
            href="/caja/apartados"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all shrink-0"
            title="Ir a Apartados y Reservas"
          >
            <span>Apartados</span>
          </Link>
          <Link
            href="/caja/alquileres"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition-all shrink-0"
            title="Ir a Sistema de Alquileres"
          >
            <span>Alquileres</span>
          </Link>
          <Link
            href="/caja/pos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-50 text-blue-900 border border-blue-300 hover:bg-blue-100 transition-all shrink-0"
            title="Ir a Terminal POS"
          >
            <span>Terminal POS</span>
          </Link>
          <Link
            href="/admin/monitoreo"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all shrink-0"
            title="Ir a Historial de Facturas y Moras"
          >
            <span>Historial Facturas</span>
          </Link>
        </div>
      </header>

      {/* Visor de Impresión y PDF en Contenedor Dedicado */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 max-w-5xl mx-auto w-full">
        <PlantillaImpresion facturaId={id} />
      </main>
    </div>
  );
}
