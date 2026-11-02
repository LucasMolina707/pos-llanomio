"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { safeFetchJson } from "@/lib/safe-fetch";

interface UsuarioSesion {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("pos_user");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  // Consultar usuario en sesión de forma segura y optimizada (evita llamadas repetitivas en cada navegación si ya está en memoria)
  useEffect(() => {
    let activo = true;

    // Si ya disponemos del usuario en memoria y la ruta no es /login, no re-consultar en cada click
    if (usuario && pathname !== "/login") {
      return;
    }

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
  }, [pathname, usuario]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Detección estricta de consolas en pantalla completa (POS, Alquileres, Apartados, Impresión, Login)
  const isFullscreenTerminal =
    pathname === "/login" ||
    pathname?.startsWith("/caja/pos") ||
    pathname?.startsWith("/caja/alquileres") ||
    pathname?.startsWith("/caja/apartados") ||
    pathname?.startsWith("/impresion");

  if (isFullscreenTerminal) {
    return (
      <main className="w-screen h-screen overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F4F6F9] text-slate-900">
      {/* 1. Barra Lateral en Escritorio (Hover-Expand Rail Flotante Z-50) */}
      <Sidebar usuario={usuario} />

      {/* 2. Barra Lateral en Móvil (Overlay / Drawer) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-[292px] max-w-[85vw] h-full z-10 shadow-2xl">
            <Sidebar
              usuario={usuario}
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Contenedor Principal (Navbar + Margen Izquierdo Fijo de 68px en Escritorio para el Riel Compacto) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-[68px]">
        <Navbar
          onToggleSidebarMobile={() => setIsMobileOpen(!isMobileOpen)}
          isSidebarCollapsed={false}
          usuario={usuario}
        />
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
