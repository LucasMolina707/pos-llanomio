"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  CalendarCheck,
  Package,
  Layers,
  ShieldCheck,
  Server,
  Database,
  ArrowRight,
  Settings,
  Vault,
  BarChart3,
  Radio,
  FileText,
  Clock,
  Sparkles,
  QrCode,
  X,
  Wifi,
} from "lucide-react";
import TarjetaConexionLAN from "@/components/red/TarjetaConexionLAN";

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
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.user) {
          setUsuario(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const modulos = [
    {
      titulo: "Terminal de Facturación",
      descripcion: "Emisión ágil de facturas para ventas directas, alquileres, separes y servicios libres de arreglo.",
      icono: ShoppingBag,
      colorIcono: "bg-blue-50 text-blue-600 border-blue-100",
      etiqueta: "Mostrador POS",
      colorBadge: "bg-blue-50 text-blue-700 border-blue-200",
      href: "/caja/pos",
    },
    {
      titulo: "Control de Caja & Arqueos",
      descripcion: "Apertura con base inicial en efectivo, arqueo físico en gaveta y cierre diario por métodos de pago.",
      icono: Vault,
      colorIcono: "bg-emerald-50 text-emerald-600 border-emerald-100",
      etiqueta: "Caja y Turnos",
      colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/admin/caja",
    },
    {
      titulo: "Alquileres & Control de Moras",
      descripcion: "Seguimiento riguroso de fechas de entrega pactadas, cálculo automático de mora y contacto CRM vía WhatsApp.",
      icono: CalendarCheck,
      colorIcono: "bg-rose-50 text-rose-600 border-rose-100",
      etiqueta: "Auditoría en Vivo",
      colorBadge: "bg-rose-50 text-rose-700 border-rose-200",
      href: "/admin/monitoreo",
    },
    {
      titulo: "Inventario Especializado",
      descripcion: "Control de stock, prendas por talla y color, estados de disponibilidad y tarifas de penalización.",
      icono: Package,
      colorIcono: "bg-amber-50 text-amber-600 border-amber-100",
      etiqueta: "Catálogo",
      colorBadge: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/admin/inventario",
    },
    {
      titulo: "Dashboard Gerencial",
      descripcion: "Consolidado de métricas financieras, ingresos netos, cuentas por cobrar y rendimiento por líneas de negocio.",
      icono: BarChart3,
      colorIcono: "bg-indigo-50 text-indigo-600 border-indigo-100",
      etiqueta: "Inteligencia",
      colorBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      href: "/admin/dashboard",
    },
    {
      titulo: "Configuración y Datos Fiscales",
      descripcion: "Administración de datos de la empresa, NIT, políticas de factura, logotipos y formatos de impresión.",
      icono: Settings,
      colorIcono: "bg-purple-50 text-purple-600 border-purple-100",
      etiqueta: "Solo Administrador",
      colorBadge: "bg-purple-50 text-purple-700 border-purple-200",
      href: "/admin/configuracion",
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 1. Banner Corporativo Principal */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Radio className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span>Red Local LAN Activa &bull; llanomio.local</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Sistema POS Local LLANOMIO
          </h1>

          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            Plataforma autónoma de punto de venta, gestión de alquileres y control de inventario.
            Operando 100% en red de área local en Windows sin requerir conexión a internet ni costos en la nube.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/caja/pos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold transition shadow-sm shadow-blue-500/30"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Abrir Terminal POS (Nueva Ventana)</span>
            </Link>

            <button
              type="button"
              onClick={() => setMostrarModalQR(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition shadow-sm shadow-emerald-500/20"
            >
              <QrCode className="h-4 w-4" />
              <span>Conectar Celular / PC en Red</span>
            </button>

            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition"
            >
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span>Ver Métricas</span>
            </Link>
          </div>
        </div>

        {/* Decoración de fondo */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Layers className="w-64 h-64 text-white" />
        </div>
      </section>

      {/* 2. Cuadrícula de Módulos del Sistema */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-blue-600"></div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">
              Módulos Operativos del Negocio
            </h2>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Acceso Rápido
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {modulos.map((modulo, idx) => {
            const Icono = modulo.icono;
            const esPos = modulo.href === "/caja/pos";

            return (
              <Link
                key={idx}
                href={modulo.href}
                target={esPos ? "_blank" : undefined}
                rel={esPos ? "noopener noreferrer" : undefined}
                className="group bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${modulo.colorIcono}`}>
                      <Icono className="h-5 w-5" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${modulo.colorBadge}`}>
                      {modulo.etiqueta}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {modulo.titulo}
                  </h3>

                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {modulo.descripcion}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-blue-600">
                  <span>{esPos ? "Abrir Terminal en Nueva Ventana" : "Acceder al módulo"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Módulo Vivo de Conexión LAN y Código QR */}
      <TarjetaConexionLAN
        titulo="Dispositivos Conectados en Red Local (Wi-Fi de Tienda)"
        subtitulo="Inspección automática de direcciones IP y código QR para conectar tablets y celulares de cajeros sin internet."
      />

      {/* Modal Flotante de Conexión Rápida QR */}
      {mostrarModalQR && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={() => setMostrarModalQR(false)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md transition"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
            <TarjetaConexionLAN />
          </div>
        </div>
      )}
    </div>
  );
}
