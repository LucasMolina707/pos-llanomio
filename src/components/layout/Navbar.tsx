"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ShoppingBag,
  Radio,
  User,
  LogOut,
  Shield,
  Layers,
  ChevronRight,
  BarChart3,
  Vault,
  CalendarClock,
  Package,
  Settings,
  LayoutDashboard,
} from "lucide-react";

interface NavbarProps {
  onToggleSidebarMobile: () => void;
  isSidebarCollapsed: boolean;
  usuario: {
    username: string;
    nombre: string;
    rol: "ADMIN" | "CAJERO";
  } | null;
}

export default function Navbar({ onToggleSidebarMobile, isSidebarCollapsed, usuario }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);

  // Mapeo de rutas a títulos e íconos para la cabecera
  const obtenerDetallesRuta = () => {
    if (pathname === "/caja/pos") {
      return { titulo: "Terminal de Facturación POS", seccion: "Mostrador", icono: ShoppingBag };
    }
    if (pathname === "/admin/dashboard") {
      return { titulo: "Dashboard Gerencial & Métricas", seccion: "Gerencia", icono: BarChart3 };
    }
    if (pathname === "/admin/caja") {
      return { titulo: "Control de Caja & Arqueos", seccion: "Operaciones", icono: Vault };
    }
    if (pathname === "/admin/monitoreo") {
      return { titulo: "Monitoreo de Alquileres & Moras", seccion: "Operaciones", icono: CalendarClock };
    }
    if (pathname === "/admin/inventario") {
      return { titulo: "Inventario Especializado & Prendas", seccion: "Catálogo", icono: Package };
    }
    if (pathname === "/admin/configuracion") {
      return { titulo: "Configuración y Datos de Factura", seccion: "Sistema", icono: Settings };
    }
    return { titulo: "Panel Principal", seccion: "Inicio", icono: LayoutDashboard };
  };

  const infoRuta = obtenerDetallesRuta();
  const IconoRuta = infoRuta.icono;

  const handleLogout = async () => {
    try {
      setCerrandoSesion(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setCerrandoSesion(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white border-b border-slate-200/80 shadow-xs flex items-center justify-between px-4 sm:px-6">
      {/* 1. Lado Izquierdo: Botón Hamburguesa Móvil + Migas de Pan / Título */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          aria-label="Abrir menú de navegación"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hidden sm:flex items-center justify-center">
            <IconoRuta className="h-4 w-4" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span>LLANOMIO</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-blue-600 font-bold">{infoRuta.seccion}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
              {infoRuta.titulo}
            </h1>
          </div>
        </div>
      </div>

      {/* 2. Lado Derecho: Acceso Rápido POS, Estado LAN y Perfil */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Acceso Rápido a Facturar si no estamos en la página del POS */}
        {pathname !== "/caja/pos" && (
          <Link
            href="/caja/pos"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Ir a Facturar POS</span>
            <span className="sm:hidden">POS</span>
          </Link>
        )}

        {/* Indicador de Red Local */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
          <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
          <span>llanomio.local</span>
        </div>

        {/* Perfil del Usuario y Cierre de Sesión */}
        {usuario ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-none">
                  {usuario.nombre || usuario.username}
                </span>
                <span className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  {usuario.rol}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={cerrandoSesion}
              title="Cerrar sesión y generar respaldo SQLite automático"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            <User className="h-3.5 w-3.5" />
            <span>Ingresar</span>
          </Link>
        )}
      </div>
    </header>
  );
}
