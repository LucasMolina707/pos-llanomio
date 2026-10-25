"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Settings,
  LogOut,
  User,
  LogIn,
} from "lucide-react";

interface UsuarioSesion {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
}

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.user) {
          setUsuario(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleCerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      // Disparar logout que ejecuta automáticamente VACUUM INTO
      await fetch("/api/auth/logout", { method: "POST" });
      setUsuario(null);
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setCerrandoSesion(false);
    }
  };

  const modulos = [
    {
      titulo: "Terminal de Facturación",
      descripcion: "Emisión de facturas para ventas directas, alquileres, separes y servicios libres de arreglo.",
      icono: ShoppingBag,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      etiqueta: "Caja Activa",
      href: "/caja/pos",
    },
    {
      titulo: "Alquileres y Control de Moras",
      descripcion: "Seguimiento riguroso de fechas de entrega, devoluciones pactadas y cálculo automático de mora.",
      icono: CalendarCheck,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      etiqueta: "Operativo",
      href: "/login",
    },
    {
      titulo: "Inventario y Prendas",
      descripcion: "Control de stock, estados de prendas (Disponible, Alquilado, Separado, Arreglo) y tarifas base.",
      icono: Package,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      etiqueta: "Catálogo",
      href: "/admin/inventario",
    },
    {
      titulo: "Configuración y Datos de Factura",
      descripcion: "Panel de administración de datos fiscales, logotipos, políticas de alquiler y formatos de impresión.",
      icono: Settings,
      color: "bg-purple-50 text-purple-700 border-purple-200",
      etiqueta: "Solo Admin",
      href: "/admin/configuracion",
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
              <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">
                POS LLANOMIO
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Sistema Operativo Local de Facturación e Inventario
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <Server className="h-3.5 w-3.5" />
              <span>Red Local LAN</span>
            </div>

            {usuario ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{usuario.username} ({usuario.rol})</span>
                </span>
                <button
                  onClick={handleCerrarSesion}
                  disabled={cerrandoSesion}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 text-xs font-semibold text-slate-700 transition"
                  title="Cerrar sesión y respaldar base de datos SQLite"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{cerrandoSesion ? "Respaldando..." : "Cerrar Sesión"}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Ingresar al Sistema</span>
              </Link>
            )}
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
                <Link
                  key={modulo.titulo}
                  href={modulo.href}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
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
                    <h3 className="font-semibold text-slate-900 text-base mb-1 group-hover:text-emerald-700 transition">
                      {modulo.titulo}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {modulo.descripcion}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                    <span>Acceder al módulo</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
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
              <span className="text-slate-500 block font-medium">Motor VACUUM INTO</span>
              <span className="font-bold text-slate-800 text-sm mt-1 block">C:\POS_LLANOMIO_BACKUPS</span>
              <span className="text-emerald-600 font-semibold mt-1 block">llanomio_ULTIMO.db en Logout</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-medium">Seguridad RBAC</span>
              <span className="font-bold text-slate-800 text-sm mt-1 block">ADMIN vs. CAJERO</span>
              <span className="text-emerald-600 font-semibold mt-1 block">Rutas /admin protegidas</span>
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
