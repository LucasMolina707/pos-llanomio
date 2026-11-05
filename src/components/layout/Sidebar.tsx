"use client";

import React, { useState, useEffect } from "react";
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
  UserCheck,
  Shield,
  LayoutDashboard,
  Receipt,
  Pin,
  X,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

interface SidebarProps {
  usuario: {
    username: string;
    nombre: string;
    rol: "ADMIN" | "CAJERO";
  } | null;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  // Compatibilidad hacia atrás opcional
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({
  usuario,
  isMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Estados de expansión por hover y pin persistente opcional
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("pos_sidebar_pinned") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // Guardar estado de pin en localStorage
  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pos_sidebar_pinned", String(next));
        } catch { }
      }
      return next;
    });
  };

  // En móvil siempre está expandido para mostrar opciones legibles
  const isExpanded = isMobile || isHovered || isPinned;

  // EXCLUSIÓN ESTRICTA: Las 3 terminales de caja y pantallas de pantalla completa NO renderizan menú lateral
  const isFullscreenTerminal =
    pathname === "/login" ||
    pathname?.startsWith("/caja/pos") ||
    pathname?.startsWith("/caja/alquileres") ||
    pathname?.startsWith("/caja/apartados") ||
    pathname?.startsWith("/impresion");

  if (isFullscreenTerminal) {
    return null;
  }

  const esAdmin =
    usuario?.rol === "ADMIN" ||
    usuario?.username === "admin" ||
    !usuario?.rol; // Fallback seguro mientras hidrata sesión

  // 11 MÓDULOS OFICIALES OPTIMIZADOS PARA ANCHO COMPLETO SIN RECORTES NI PUNTOS SUSPENSIVOS
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
        },
        {
          name: "Gastos y Nómina",
          href: "/admin/gastos",
          icon: Receipt,
        },
      ],
    },
    {
      title: "OPERACIÓN Y CAJA",
      items: [
        {
          name: "Terminal POS (Ventas)",
          href: "/caja/pos",
          icon: ShoppingBag,
        },
        {
          name: "Sistema de Alquileres",
          href: "/caja/alquileres",
          icon: Clock,
        },
        {
          name: "Apartados y Reservas",
          href: "/caja/apartados",
          icon: CalendarClock,
        },
        {
          name: "Control y Arqueo de Caja",
          href: "/admin/caja",
          icon: Vault,
        },
        {
          name: "Historial y Monitoreo",
          href: "/admin/monitoreo",
          icon: CalendarClock,
        },
        {
          name: "Directorio de Clientes",
          href: "/admin/clientes",
          icon: UserCheck,
        },
      ],
    },
    {
      title: "CATÁLOGO Y STOCK",
      items: [
        {
          name: "Inventario de Prendas",
          href: "/admin/inventario",
          icon: Package,
        },
      ],
    },
    {
      title: "CONFIGURACIÓN Y SISTEMA",
      items: [
        {
          name: "Usuarios y Permisos",
          href: "/admin/usuarios",
          icon: Shield,
        },
        {
          name: "Configuración y Factura",
          href: "/admin/configuracion",
          icon: Settings,
        },
      ],
    },
  ];

  // Restricción por rol: Módulos administrativos ocultos para cajeros
  const rutasExclusivasAdmin = [
    "/admin/inventario",
    "/admin/dashboard",
    "/admin/gastos",
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
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      className={`${isMobile
          ? "w-[292px] h-full flex flex-col bg-white border-r border-slate-200 select-none shadow-2xl"
          : `hidden lg:flex flex-col fixed top-0 left-0 h-screen z-50 bg-white border-r border-slate-200/90 select-none transition-all duration-200 ease-out ${isExpanded
            ? "w-[292px] shadow-2xl shadow-slate-900/10"
            : "w-[68px] shadow-xs"
          }`
        }`}
    >
      {/* ===================================================================== */}
      {/* 1. CABECERA CON LOGO Y BOTÓN DE PIN / CIERRE                           */}
      {/* ===================================================================== */}
      <div className="h-16 shrink-0 border-b border-slate-200/80 px-3 flex items-center justify-between bg-white">
        {!isExpanded ? (
          <Link
            href="/"
            className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-slate-50 transition"
            title="Ir al Panel Principal"
          >
            <LogoEmpresa size="sm" showText={false} />
          </Link>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 min-w-0">
            <Link
              href="/"
              onClick={() => isMobile && onCloseMobile && onCloseMobile()}
              className="flex items-center gap-2 min-w-0 truncate hover:opacity-90 transition"
            >
              <LogoEmpresa
                size="md"
                showText={true}
                showSubtitle={true}
                customSubtitle="POS & Facturación"
              />
            </Link>

            {/* Controles de fijado o cierre según escritorio o móvil */}
            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar menú lateral"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTogglePin}
                title={
                  isPinned
                    ? "Desfijar barra lateral (volver a auto-desplegable)"
                    : "Fijar barra lateral siempre abierta"
                }
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${isPinned
                    ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
              >
                <Pin
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${isPinned ? "rotate-45 text-blue-600" : ""
                    }`}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. NAVEGACIÓN Y SECCIONES DE MÓDULOS                                    */}
      {/* ===================================================================== */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-2.5 px-2 space-y-3">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {/* Título de sección si está expandido, o separador sutil si compacto */}
            {!isExpanded ? (
              <div className="h-px bg-slate-200/80 my-2 mx-2" />
            ) : (
              <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                {section.title}
              </div>
            )}

            {/* Lista de enlaces */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => isMobile && onCloseMobile && onCloseMobile()}
                    title={!isExpanded ? item.name : undefined}
                    className={`h-10 px-2.5 rounded-xl flex items-center transition-colors duration-150 ${isActive
                        ? "bg-blue-600 text-white font-semibold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-950 font-medium"
                      } ${!isExpanded ? "justify-center" : "gap-3 justify-start"}`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${isActive
                          ? "text-white"
                          : "text-slate-500 group-hover:text-slate-800"
                        } ${!isExpanded ? "mx-auto" : ""}`}
                    />

                    {isExpanded && (
                      <span className="text-[13px] font-semibold leading-tight tracking-tight whitespace-nowrap truncate">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ===================================================================== */}
      {/* 3. PIE DE BARRA: INDICADOR LAN Y TARJETA DE USUARIO                   */}
      {/* ===================================================================== */}
      <div className="border-t border-slate-200/80 p-2 space-y-1.5 bg-slate-50/70 shrink-0">
        {/* Indicador de Red Local */}
        {!isExpanded ? (
          <div
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-slate-100/90 border border-slate-200/80 text-slate-700 cursor-default"
            title="Red Local LAN Activa (Servicio mDNS y sincronización activa)"
          >
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
          </div>
        ) : (
          <div
            className="px-3 py-2 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-default"
            title="Servicio mDNS y acceso activo en red local"
          >
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="truncate">Red Local LAN Activa</span>
          </div>
        )}

        {/* Tarjeta de Usuario y Botón de Salir */}
        {usuario && (
          <div>
            {!isExpanded ? (
              <div
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-700 cursor-default"
                title={`${usuario.nombre || usuario.username} (${usuario.rol})`}
              >
                {usuario.rol === "ADMIN" ? (
                  <Shield className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                ) : (
                  <UserCheck className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                )}
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    {usuario.rol === "ADMIN" ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 truncate">
                    <span
                      className="text-xs font-bold text-slate-900 leading-tight truncate"
                      title={usuario.nombre || usuario.username}
                    >
                      {usuario.nombre || usuario.username}
                    </span>
                    <span className="text-[10px] font-extrabold text-blue-600 tracking-wider">
                      {usuario.rol}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={cerrandoSesion}
                  title="Cerrar Sesión"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition shrink-0 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
