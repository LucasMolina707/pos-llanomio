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
  Receipt,
  LayoutDashboard,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";

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
    if (pathname === "/admin/gastos") {
      return { titulo: "Gastos Operativos & Nómina", seccion: "Tesorería", icono: Receipt };
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
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo compacto visible en móviles/tablets cuando la barra lateral está en drawer */}
        <div className="lg:hidden shrink-0">
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
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
        {/* Accesos Rápidos Exclusivos de Administrador */}
        {esAdmin && (
          <>
            <IconButtonTooltip
              icon={BarChart3}
              label="Métricas y Rendimiento Financiero del Sistema"
              href="/admin/dashboard"
              active={pathname === "/admin/dashboard"}
              size="md"
              variant="neutral"
              iconClassName="text-indigo-600"
            />

            <IconButtonTooltip
              icon={Settings}
              label="Configuración de Página y Factura"
              href="/admin/configuracion"
              active={pathname === "/admin/configuracion"}
              size="md"
              variant="neutral"
              iconClassName="text-purple-600"
            />
          </>
        )}

        {/* Acceso Rápido a Terminal POS si no estamos en la página del POS */}
        {pathname !== "/caja/pos" && (
          <Link
            href="/caja/pos"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-xs whitespace-nowrap"
            title="Abrir Terminal de Facturación POS"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Terminal POS</span>
            <span className="sm:hidden font-bold">POS</span>
          </Link>
        )}

        {/* Indicador de Red Local */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/90 text-xs font-semibold text-slate-700">
          <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
          <span>Red Local LAN</span>
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

            <IconButtonTooltip
              icon={LogOut}
              label="Cerrar sesión"
              onClick={handleLogout}
              disabled={cerrandoSesion}
              size="md"
              variant="ghost"
              iconClassName="text-slate-500 hover:text-rose-600"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
