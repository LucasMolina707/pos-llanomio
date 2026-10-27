"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface UsuarioSesion {
  userId: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  // Consultar usuario en sesión
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.user) {
          setUsuario(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Detección de consolas en pantalla completa (POS, Alquileres, Impresión, Login)
  const isFullscreenTerminal =
    pathname === "/login" ||
    pathname?.startsWith("/caja/pos") ||
    pathname?.startsWith("/caja/alquileres") ||
    pathname?.startsWith("/impresion");

  if (isFullscreenTerminal) {
    return (
      <main className="w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9]">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F4F6F8] flex max-w-full overflow-x-hidden">
      {/* 1. Barra Lateral en Escritorio */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          usuario={usuario}
        />
      </div>

      {/* 2. Barra Lateral en Móvil (Overlay / Drawer) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 shadow-2xl">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileOpen(false)}
              usuario={usuario}
            />
          </div>
        </div>
      )}

      {/* 3. Contenedor Principal (Navbar + Contenido Full-Width) */}
      <div
        className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <Navbar
          onToggleSidebarMobile={() => setIsMobileOpen(!isMobileOpen)}
          isSidebarCollapsed={isCollapsed}
          usuario={usuario}
        />
        <main className="flex-1 w-full max-w-full p-3.5 sm:p-5 lg:p-7 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
