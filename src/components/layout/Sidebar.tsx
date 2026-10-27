"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Vault,
  CalendarClock,
  Clock,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  usuario: {
    username: string;
    nombre: string;
    rol: "ADMIN" | "CAJERO";
  } | null;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badge?: string;
}

export default function Sidebar({ isCollapsed, onToggleCollapse, usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);

  if (
    pathname === "/login" ||
    pathname?.startsWith("/caja/pos") ||
    pathname?.startsWith("/caja/alquileres") ||
    pathname?.startsWith("/impresion")
  ) {
    return null;
  }

  const esAdmin =
    usuario?.rol === "ADMIN" ||
    usuario?.username === "admin" ||
    !usuario?.rol; // Fallback seguro mientras hidrata si ya pasó middleware

  // Definición de las secciones base con los 10 módulos oficiales
  const todasLasSecciones: { title: string; items: MenuItem[] }[] = [
    {
      title: "PANEL DE CONTROL",
      items: [
        {
          name: "Panel Principal",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          name: "Métricas y Rendimiento",
          href: "/admin/dashboard",
          icon: BarChart3,
          badge: "En Vivo",
        },
      ],
    },
    {
      title: "OPERACIÓN Y CAJA",
      items: [
        {
          name: "Terminal POS — Ventas y Arreglos",
          href: "/caja/pos",
          icon: ShoppingBag,
          badge: "Mostrador",
        },
        {
          name: "Sistema de Alquileres",
          href: "/caja/alquileres",
          icon: Clock,
          badge: "Alquiler",
        },
        {
          name: "Control y Arqueo de Caja",
          href: "/admin/caja",
          icon: Vault,
        },
        {
          name: "Historial y Monitoreo de Facturas",
          href: "/admin/monitoreo",
          icon: CalendarClock,
          badge: "Cartera",
        },
        {
          name: "Galería y Directorio de Clientes",
          href: "/admin/clientes",
          icon: UserCheck,
        },
      ],
    },
    {
      title: "CATÁLOGO Y STOCK",
      items: [
        {
          name: "Inventario de Productos y Prendas",
          href: "/admin/inventario",
          icon: Package,
        },
      ],
    },
    {
      title: "CONFIGURACIÓN Y SISTEMA",
      items: [
        {
          name: "Gestión de Usuarios y Cajeros",
          href: "/admin/usuarios",
          icon: Shield,
        },
        {
          name: "Configuración de Página y Factura",
          href: "/admin/configuracion",
          icon: Settings,
        },
      ],
    },
  ];

  // Filtrado estricto por rol:
  // Si es ADMIN, tiene acceso irrestricto a los 10 módulos.
  // Si es CAJERO, no se renderizan en el DOM módulos administrativos (Dashboard, Inventario, Usuarios, Configuración)
  const rutasExclusivasAdmin = [
    "/admin/inventario",
    "/admin/dashboard",
    "/admin/usuarios",
    "/admin/configuracion",
  ];

  const menuSections = todasLasSecciones
    .map((sec) => {
      const itemsPermitidos = sec.items.filter((item) => {
        if (esAdmin) return true;
        return !rutasExclusivasAdmin.includes(item.href);
      });
      return { ...sec, items: itemsPermitidos };
    })
    .filter((sec) => sec.items.length > 0);

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
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-[#F1F5F9] border-r border-slate-200/90 text-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-xs ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* 1. Cabecera con Logo Oficial de la Empresa */}
      <div>
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-200/90 bg-white/70 backdrop-blur-xs">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <LogoEmpresa
              size={isCollapsed ? "sm" : "md"}
              showText={!isCollapsed}
              showSubtitle={!isCollapsed}
              orientation="horizontal"
              textClassName="text-slate-800 font-extrabold text-sm tracking-tight"
              subtitleClassName="text-[10.5px] text-slate-500 font-medium"
            />
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition hidden md:flex items-center justify-center shrink-0"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* 2. Navegación por Secciones con Colores Antifatiga */}
        <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-14rem)]">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const esPos = item.href === "/caja/pos";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target={esPos ? "_blank" : undefined}
                      rel={esPos ? "noopener noreferrer" : undefined}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/75"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform duration-150 ${
                          isActive ? "text-white" : "text-slate-500 group-hover:text-slate-800"
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full truncate">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isActive
                                  ? "bg-blue-700 text-white"
                                  : "bg-slate-200 text-slate-700 border border-slate-300/80"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* 3. Pie de Barra Lateral (Estado de Red y Usuario) */}
      <div className="p-3 border-t border-slate-200/90 bg-white/60 space-y-2">
        {/* Indicador de Red Local */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-200/60 border border-slate-300/60 text-xs font-semibold text-slate-700 ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
          title="Servicio mDNS activo en http://llanomio.local (Puerto 80)"
        >
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-slate-800 text-xs leading-tight">LAN Activa</span>
              <span className="text-[11px] text-slate-500 font-medium">llanomio.local</span>
            </div>
          )}
        </div>

        {/* Datos de Usuario y Cerrar Sesión */}
        {usuario && (
          <div
            className={`flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#FCFDFE] border border-slate-200/90 shadow-2xs text-xs sm:text-sm ${
              isCollapsed ? "justify-center px-0 flex-col gap-2" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                {usuario.rol === "ADMIN" ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate leading-tight">
                    {usuario.nombre || usuario.username}
                  </span>
                  <span className="text-[11px] text-blue-600 font-bold tracking-wide">
                    {usuario.rol}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={cerrandoSesion}
              title="Cerrar sesión y generar respaldo SQLite automático"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
