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
  ChevronRight,
  BarChart3,
  Vault,
  CalendarClock,
  Package,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

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

  if (
    pathname === "/login" ||
    pathname?.startsWith("/caja/pos") ||
    pathname?.startsWith("/caja/alquileres") ||
    pathname?.startsWith("/caja/apartados") ||
    pathname?.startsWith("/impresion")
  ) {
    return null;
  }

  // Mapeo de rutas a títulos e íconos para la cabecera
  const obtenerDetallesRuta = () => {
    if (pathname === "/caja/pos") {
      return { titulo: "Terminal de Facturación POS (Ventas y Arreglos)", seccion: "Mostrador", icono: ShoppingBag };
    }
    if (pathname === "/caja/alquileres") {
      return { titulo: "Sistema de Alquileres de Prendas", seccion: "Alquileres", icono: CalendarClock };
    }
    if (pathname === "/caja/apartados") {
      return { titulo: "Sistema de Apartados y Reservas", seccion: "Apartados", icono: CalendarClock };
    }
    if (pathname === "/admin/dashboard") {
      return { titulo: "Dashboard Gerencial & Métricas", seccion: "Gerencia", icono: BarChart3 };
    }
    if (pathname === "/admin/caja") {
      return { titulo: "Control de Caja & Arqueos", seccion: "Operaciones", icono: Vault };
    }
    if (pathname === "/admin/monitoreo") {
      return { titulo: "Historial de Facturas y Moras", seccion: "Cartera", icono: CalendarClock };
    }
    if (pathname.startsWith("/admin/clientes")) {
      return { titulo: "Directorio de Clientes & Historial", seccion: "Clientes", icono: User };
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

  const esAdmin =
    usuario?.rol === "ADMIN" ||
    usuario?.username === "admin" ||
    !usuario?.rol; // Fallback seguro mientras hidrata si ya pasó middleware

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-[#FCFDFE] border-b border-slate-200/90 shadow-2xs flex items-center justify-between px-3.5 sm:px-6">
      {/* 1. Lado Izquierdo: Botón Hamburguesa Móvil + Logo/Migas de Pan / Título */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          aria-label="Abrir menú de navegación"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition md:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo compacto visible en móviles cuando la barra lateral está oculta */}
        <div className="md:hidden shrink-0">
          <LogoEmpresa size="sm" showText={false} />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hidden sm:flex items-center justify-center shrink-0">
            <IconoRuta className="h-4 w-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate">
              <span className="truncate">Sistema</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="text-blue-600 font-bold truncate">{infoRuta.seccion}</span>
            </div>
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 tracking-tight leading-tight truncate">
              {infoRuta.titulo}
            </h1>
          </div>
        </div>
      </div>

      {/* 2. Lado Derecho: Acceso Rápido POS, Métricas, Configuración, Estado LAN y Perfil */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Accesos Rápidos Exclusivos de Administrador */}
        {esAdmin && (
          <>
            <Link
              href="/admin/dashboard"
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition border ${
                pathname === "/admin/dashboard"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs"
                  : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
              }`}
              title="Métricas y Rendimiento Financiero del Sistema"
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-indigo-600" />
              <span className="hidden lg:inline">Métricas</span>
            </Link>

            <Link
              href="/admin/configuracion"
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition border ${
                pathname === "/admin/configuracion"
                  ? "bg-purple-50 text-purple-700 border-purple-200 shadow-2xs"
                  : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
              }`}
              title="Configuración de Página y Factura"
            >
              <Settings className="h-4 w-4 shrink-0 text-purple-600" />
              <span className="hidden lg:inline">Configuración</span>
            </Link>
          </>
        )}

        {/* Acceso Rápido a Facturar en Nueva Ventana si no estamos en la página del POS */}
        {pathname !== "/caja/pos" && (
          <Link
            href="/caja/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-sm shadow-blue-500/20"
            title="Abrir Terminal de Facturación POS en nueva ventana"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Terminal POS</span>
            <span className="sm:hidden font-bold">POS</span>
          </Link>
        )}

        {/* Indicador de Red Local */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/90 text-xs font-semibold text-slate-700">
          <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
          <span>llanomio.local</span>
        </div>

        {/* Perfil del Usuario y Cierre de Sesión */}
        {usuario ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs sm:text-sm">
                {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden xl:flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {usuario.nombre || usuario.username}
                </span>
                <span className="text-[10.5px] font-semibold text-blue-600">
                  {usuario.rol}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={cerrandoSesion}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
