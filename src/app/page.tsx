import React from "react";
import {
  ShoppingBag,
  CalendarCheck,
  Package,
  Layers,
  ShieldCheck,
  Server,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const modulos = [
    {
      titulo: "Terminal de Facturación",
      descripcion: "Emisión de facturas para ventas directas, alquileres, separes y servicios libres de arreglo.",
      icono: ShoppingBag,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      etiqueta: "Caja Activa",
    },
    {
      titulo: "Alquileres y Control de Moras",
      descripcion: "Seguimiento riguroso de fechas de entrega, devoluciones pactadas y cálculo automático de mora.",
      icono: CalendarCheck,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      etiqueta: "Operativo",
    },
    {
      titulo: "Inventario y Prendas",
      descripcion: "Control de stock, estados de prendas (Disponible, Alquilado, Separado, Arreglo) y tarifas base.",
      icono: Package,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      etiqueta: "Catalogo",
    },
    {
      titulo: "Control y Cierre de Turno",
      descripcion: "Apertura de turno con base inicial, arqueo detallado por método de pago y consolidados periódicos.",
      icono: Layers,
      color: "bg-purple-50 text-purple-700 border-purple-200",
      etiqueta: "Auditoria",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Barra Superior Informativa */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                POS LLANOMIO
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Sistema Operativo Local de Facturación e Inventario
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <Server className="h-3.5 w-3.5" />
              <span>Red Local Activa (LAN)</span>
            </div>
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <Database className="h-3.5 w-3.5" />
              <span>SQLite Local Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Banner de Bienvenida y Estado */}
        <section className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium mb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Entorno de Tienda Local 100% Autónomo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bienvenido a POS Llanomio
            </h1>
            <p className="mt-2 text-emerald-100 text-sm sm:text-base leading-relaxed">
              Plataforma diseñada para alta disponibilidad sin depender de conexión a internet o servicios externos pagos. Todos los datos se almacenan de manera local y cifrada en el servidor de la tienda.
            </p>
          </div>
        </section>

        {/* Cuadrícula de Módulos */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Módulos Principales del Sistema
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Acceso Rápido
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modulos.map((modulo) => {
              const Icono = modulo.icono;
              return (
                <div
                  key={modulo.titulo}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl border ${modulo.color}`}>
                        <Icono className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {modulo.etiqueta}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      {modulo.titulo}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {modulo.descripcion}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                    <span>Acceder al módulo</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección de Estado Técnico y Seguridad */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Estado de los Servicios de Tienda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-medium">Base de Datos SQLite</span>
              <span className="font-bold text-slate-800 text-sm mt-1 block">/database/llanomio.db</span>
              <span className="text-emerald-600 font-semibold mt-1 block">Sincronizado vía Prisma</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-medium">Ubicación de Respaldos</span>
              <span className="font-bold text-slate-800 text-sm mt-1 block">C:\POS_LLANOMIO_BACKUPS</span>
              <span className="text-emerald-600 font-semibold mt-1 block">Doble copia automatizada</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-medium">Usuario Maestro Inicial</span>
              <span className="font-bold text-slate-800 text-sm mt-1 block">admin (Administrador General)</span>
              <span className="text-slate-600 font-semibold mt-1 block">Credenciales iniciales listas</span>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de Página */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>Sistema POS Local LLANOMIO - Desarrollado bajo arquitectura local de alta confiabilidad.</p>
      </footer>
    </div>
  );
}
