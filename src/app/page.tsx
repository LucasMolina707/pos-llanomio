"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  CalendarCheck,
  CalendarClock,
  Package,
  ShieldCheck,
  BarChart3,
  Radio,
  Settings,
  Vault,
  Receipt,
  ArrowRight,
  QrCode,
} from "lucide-react";
import TarjetaConexionLAN from "@/components/red/TarjetaConexionLAN";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import BannerMetricasInicio from "@/components/dashboard/BannerMetricasInicio";

import { safeFetchJson } from "@/lib/safe-fetch";

interface UsuarioSesion {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
}

export default function HomePage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [mostrarModalQR, setMostrarModalQR] = useState(false);

  useEffect(() => {
    let activo = true;

    try {
      const cached = sessionStorage.getItem("pos_user");
      if (cached) setUsuario(JSON.parse(cached));
    } catch {}
    safeFetchJson<{ ok?: boolean; user?: UsuarioSesion }>("/api/auth/me").then(({ ok, data }) => {
      if (!activo) return;
      if (ok && data?.ok && data?.user) {
        setUsuario(data.user);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("pos_user", JSON.stringify(data.user));
          } catch {}
        }
      } else {
        setUsuario(null);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("pos_user");
          } catch {}
        }
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  // Cierre del modal con tecla Escape y bloqueo del scroll de la página de fondo
  useEffect(() => {
    if (!mostrarModalQR) return;

    // Bloquear scroll de la página de fondo mientras el modal esté abierto
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMostrarModalQR(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mostrarModalQR]);

  const modulos = [
    {
      titulo: "Ventas POS",
      descripcion: "Facturación y sastrería",
      icono: ShoppingBag,
      colorIcono: "bg-blue-50 text-blue-600 border-blue-200",
      etiqueta: "POS",
      colorBadge: "bg-blue-50 text-blue-700 border-blue-200",
      href: "/caja/pos",
    },
    {
      titulo: "Alquileres",
      descripcion: "Contratos, garantías y entregas",
      icono: CalendarCheck,
      colorIcono: "bg-emerald-50 text-emerald-600 border-emerald-200",
      etiqueta: "Alquiler",
      colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/caja/alquileres",
    },
    {
      titulo: "Apartados",
      descripcion: "Reservas y abonos",
      icono: CalendarClock,
      colorIcono: "bg-amber-50 text-amber-600 border-amber-200",
      etiqueta: "Apartado",
      colorBadge: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/caja/apartados",
    },
    {
      titulo: "Arqueo de Caja",
      descripcion: "Apertura, turnos y balance",
      icono: Vault,
      colorIcono: "bg-emerald-50 text-emerald-600 border-emerald-200",
      etiqueta: "Caja",
      colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/admin/caja",
    },
    {
      titulo: "Métricas",
      descripcion: "Balances e indicadores",
      icono: BarChart3,
      colorIcono: "bg-indigo-50 text-indigo-600 border-indigo-200",
      etiqueta: "Métricas",
      colorBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      href: "/admin/dashboard",
      adminOnly: true,
    },
    {
      titulo: "Gastos y Nómina",
      descripcion: "Egresos operativos y salarios",
      icono: Receipt,
      colorIcono: "bg-emerald-50 text-emerald-600 border-emerald-200",
      etiqueta: "Gastos",
      colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/admin/gastos",
      adminOnly: true,
    },
    {
      titulo: "Configuración",
      descripcion: "Parámetros de tienda y respaldo",
      icono: Settings,
      colorIcono: "bg-purple-50 text-purple-600 border-purple-200",
      etiqueta: "Sistema",
      colorBadge: "bg-purple-50 text-purple-700 border-purple-200",
      href: "/admin/configuracion",
      adminOnly: true,
    },
    {
      titulo: "Inventario",
      descripcion: "Catálogo, tallas y tarifas",
      icono: Package,
      colorIcono: "bg-amber-50 text-amber-600 border-amber-200",
      etiqueta: "Inventario",
      colorBadge: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/admin/inventario",
      adminOnly: true,
    },
    {
      titulo: "Clientes",
      descripcion: "Padrón, contratos y cartera",
      icono: ShieldCheck,
      colorIcono: "bg-cyan-50 text-cyan-600 border-cyan-200",
      etiqueta: "Clientes",
      colorBadge: "bg-cyan-50 text-cyan-700 border-cyan-200",
      href: "/admin/clientes",
    },
    {
      titulo: "Monitoreo",
      descripcion: "Cartera y facturas pendientes",
      icono: CalendarCheck,
      colorIcono: "bg-rose-50 text-rose-600 border-rose-200",
      etiqueta: "Monitoreo",
      colorBadge: "bg-rose-50 text-rose-700 border-rose-200",
      href: "/admin/monitoreo",
    },
    {
      titulo: "Usuarios",
      descripcion: "Cuentas, roles y accesos",
      icono: ShieldCheck,
      colorIcono: "bg-blue-50 text-blue-600 border-blue-200",
      etiqueta: "Usuarios",
      colorBadge: "bg-blue-50 text-blue-700 border-blue-200",
      href: "/admin/usuarios",
      adminOnly: true,
    },
  ];

  // Blindaje para garantizar acceso al administrador
  const esAdmin =
    usuario?.rol === "ADMIN" ||
    usuario?.username === "admin" ||
    !usuario?.rol; // Fallback seguro mientras hidrata si ya pasó middleware

  const modulosVisibles = modulos.filter((m) => {
    if (esAdmin) return true;
    if (m.adminOnly) return false;
    return true;
  });

  return (
    <div className="w-full space-y-6 max-w-full overflow-x-hidden">
      {/* 1. Banner Corporativo Antifatiga Visual */}
      <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 rounded-2xl p-5 sm:p-7 text-slate-800 shadow-xs border border-slate-200/90 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <LogoEmpresa
              size="lg"
              showText
              showSubtitle
              orientation="horizontal"
              textClassName="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              subtitleClassName="text-xs sm:text-sm text-slate-500 font-medium"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>Red Local LAN Activa &bull; Punto de Venta Local</span>
            </div>
          </div>

          <p className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed">
            Plataforma autónoma de punto de venta, gestión de alquileres y control de inventario para mostrador.
            Operando 100% en red de área local en Windows sin requerir conexión a internet ni costos en la nube.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/caja/pos"
              prefetch={true}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold transition shadow-xs cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Facturar POS</span>
            </Link>

            <button
              type="button"
              onClick={() => setMostrarModalQR(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition shadow-sm shadow-emerald-500/20 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Conectar Terminal</span>
            </button>

            {esAdmin && (
              <>
                <Link
                  href="/admin/dashboard"
                  prefetch={true}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs sm:text-sm font-bold transition shadow-2xs"
                  title="Ver Métricas"
                >
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span>Métricas</span>
                </Link>

                <Link
                  href="/admin/configuracion"
                  prefetch={true}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs sm:text-sm font-bold transition shadow-2xs"
                  title="Configurar Sistema"
                >
                  <Settings className="h-4 w-4 text-purple-600" />
                  <span>Configuración</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Banner Ejecutivo de Datos, Gráficas y Métricas del Sistema en Vivo */}
      <BannerMetricasInicio esAdmin={Boolean(esAdmin)} />

      {/* 3. Cuadrícula de Módulos del Sistema */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-blue-600"></div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800">
              Panel Operativo
            </h2>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Acceso Rápido
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {modulosVisibles.map((modulo, idx) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={idx}
                href={modulo.href}
                prefetch={false}
                className="group bg-[#FCFDFE] rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-400 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${modulo.colorIcono}`}>
                      <Icono className="h-5 w-5" />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${modulo.colorBadge}`}>
                      {modulo.etiqueta}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                    {modulo.descripcion}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-blue-600">
                  <span>Acceder</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Módulo Vivo de Conexión LAN y Código QR */}
      <TarjetaConexionLAN
        titulo="Red Local (LAN)"
        subtitulo="Escanea el QR para conectar dispositivos en la red."
      />

      {/* Modal Flotante de Conexión Rápida QR (Sin duplicación de cabeceras ni scroll de fondo) */}
      {mostrarModalQR && (
        <div
          onClick={() => setMostrarModalQR(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-in zoom-in-95 duration-150"
          >
            <TarjetaConexionLAN
              onClose={() => setMostrarModalQR(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
