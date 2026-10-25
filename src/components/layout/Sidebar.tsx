"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Vault,
  CalendarClock,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Radio,
  UserCheck,
  Shield,
  Layers,
} from "lucide-react";

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

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "OPERACIÓN",
      items: [
        {
          name: "Terminal POS",
          href: "/caja/pos",
          icon: ShoppingBag,
          badge: "Mostrador",
        },
        {
          name: "Control de Caja",
          href: "/admin/caja",
          icon: Vault,
        },
        {
          name: "Historial de Facturas y Moras",
          href: "/admin/monitoreo",
          icon: CalendarClock,
          badge: "Cartera",
        },
        {
          name: "Directorio de Clientes",
          href: "/admin/clientes",
          icon: UserCheck,
        },
      ],
    },
    {
      title: "CATÁLOGO",
      items: [
        {
          name: "Inventario y Prendas",
          href: "/admin/inventario",
          icon: Package,
        },
      ],
    },
    {
      title: "GERENCIA",
      items: [
        {
          name: "Dashboard Métricas",
          href: "/admin/dashboard",
          icon: BarChart3,
        },
        {
          name: "Configuración Empresa",
          href: "/admin/configuracion",
          icon: Settings,
        },
        {
          name: "Menú Principal",
          href: "/",
          icon: LayoutDashboard,
        },
      ],
    },
  ];

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
      className={`fixed top-0 left-0 z-40 h-screen bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* 1. Cabecera de la Marca */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 min-w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Layers className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-base font-black tracking-tight text-white leading-none">
                  LLANOMIO
                </span>
                <span className="text-[11px] font-medium text-slate-400 tracking-wide mt-1">
                  POS EMPRESARIAL
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden md:flex items-center justify-center"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* 2. Navegación por Secciones */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-14rem)]">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
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
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform duration-150 ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full truncate">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isActive
                                  ? "bg-blue-700 text-blue-100"
                                  : "bg-slate-800 text-blue-400 border border-blue-900/60"
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
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
        {/* Indicador de Red Local */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800 text-xs font-medium text-slate-300 ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
          title="Servicio mDNS activo en http://llanomio.local (Puerto 80)"
        >
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-xs leading-tight">LAN Activa</span>
              <span className="text-xs text-slate-400">llanomio.local</span>
            </div>
          )}
        </div>

        {/* Datos de Usuario y Cerrar Sesión */}
        {usuario && (
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-800/90 text-xs sm:text-sm ${
              isCollapsed ? "justify-center px-0 flex-col gap-2" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-8 w-8 rounded-lg bg-blue-900/60 border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                {usuario.rol === "ADMIN" ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="font-bold text-white text-xs sm:text-sm truncate leading-tight">
                    {usuario.nombre || usuario.username}
                  </span>
                  <span className="text-xs text-blue-400 font-semibold tracking-wide">
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
