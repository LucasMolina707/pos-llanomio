"use client";

import React from "react";
import {
  ArrowLeft,
  ShoppingCart,
  Shirt,
  CalendarClock,
  PlusCircle,
  History,
  RefreshCw,
  RotateCcw,
  LogOut,
  User,
  ShoppingBag,
  Wallet,
  DollarSign,
  Printer,
  Check,
  Tag,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import IconButtonTooltip, { IconButtonVariant } from "@/components/ui/IconButtonTooltip";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";

export type ModuloCaja = "VENTAS" | "ALQUILERES" | "APARTADOS";

interface ModuloConfig {
  titulo: string;
  badge: string;
  icon: typeof ShoppingCart;
  topBorderClass: string;
  badgeClass: string;
  iconClass: string;
  activeVariant: IconButtonVariant;
  stepperActiveClass: string;
  defaultEtiquetas: [string, string, string, string];
}

const MODULO_CONFIG: Record<ModuloCaja, ModuloConfig> = {
  VENTAS: {
    titulo: "CAJA DE VENTAS Y SASTRERÍA",
    badge: "VENTAS POS",
    icon: ShoppingCart,
    topBorderClass: "border-t-4 border-t-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
    iconClass: "text-emerald-600",
    activeVariant: "emerald",
    stepperActiveClass: "bg-emerald-600 text-white border-emerald-700 shadow-xs",
    defaultEtiquetas: ["1. Cliente", "2. Productos", "3. Cobro y Caja", "4. Comprobante"],
  },
  ALQUILERES: {
    titulo: "CAJA DE ALQUILERES Y DEPÓSITOS",
    badge: "ALQUILERES",
    icon: Shirt,
    topBorderClass: "border-t-4 border-t-orange-600",
    badgeClass: "bg-orange-50 text-orange-900 border-orange-300",
    iconClass: "text-orange-600",
    activeVariant: "orange",
    stepperActiveClass: "bg-orange-600 text-white border-orange-700 shadow-xs",
    defaultEtiquetas: ["1. Cliente", "2. Trajes / Prendas", "3. Cobro y Depósito", "4. Comprobante"],
  },
  APARTADOS: {
    titulo: "CAJA DE APARTADOS Y RESERVAS",
    badge: "APARTADOS",
    icon: CalendarClock,
    topBorderClass: "border-t-4 border-t-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-900 border-indigo-300",
    iconClass: "text-indigo-600",
    activeVariant: "indigo",
    stepperActiveClass: "bg-indigo-600 text-white border-indigo-700 shadow-xs",
    defaultEtiquetas: ["1. Cliente", "2. Artículos a Apartar", "3. Cobro y Abono", "4. Comprobante"],
  },
};

export interface HeaderMostradorUnificadoProps {
  modulo: ModuloCaja;
  cajon: any;
  onNuevaOperacion: () => void;
  nuevaOperacionActiva: boolean;
  nuevaOperacionLabel?: string;
  onHistorial: () => void;
  historialActivo: boolean;
  historialLabel?: string;
  historialBadgeCount?: number;
  historialBadgeVariant?: "danger" | "amber" | "indigo" | "emerald" | "orange";
  onSincronizar: () => void;
  onLimpiar: () => void;
  limpiarLabel?: string;
  extraHerramientas?: React.ReactNode;
  onCerrarSesion?: () => void;
}

export function HeaderMostradorUnificado({
  modulo,
  cajon,
  onNuevaOperacion,
  nuevaOperacionActiva,
  nuevaOperacionLabel,
  onHistorial,
  historialActivo,
  historialLabel,
  historialBadgeCount,
  historialBadgeVariant = "amber",
  onSincronizar,
  onLimpiar,
  limpiarLabel = "Limpiar Mostrador",
  extraHerramientas,
  onCerrarSesion,
}: HeaderMostradorUnificadoProps) {
  const cfg = MODULO_CONFIG[modulo];
  const IconoModulo = cfg.icon;

  const handleLogoutDefault = async () => {
    if (confirm("¿Desea cerrar la sesión y liberar la cuenta en este equipo?")) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {} finally {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("pos_user");
            sessionStorage.removeItem("pos_llanomio_user");
          } catch {}
          window.location.href = "/login";
        }
      }
    }
  };

  return (
    <header
      className={`h-14 shrink-0 w-full px-3 bg-white text-slate-800 flex items-center justify-between border-b border-slate-200 shadow-2xs z-30 gap-2 flex-nowrap overflow-hidden ${cfg.topBorderClass}`}
    >
      {/* 1. Bloque Izquierdo: Botón Regresar + Logo + Título Superior Destacado */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
        <IconButtonTooltip
          icon={ArrowLeft}
          label="Regresar al Panel Principal"
          modulo="Navegación"
          destino="Ruta: /"
          href="/"
          variant="neutral"
          size="md"
        />

        <div className="shrink-0 hidden md:block">
          <LogoEmpresa size="sm" showText={false} />
        </div>

        {/* Título Superior Visible de Mostrador con Icono y Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <IconoModulo className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${cfg.iconClass}`} />
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase truncate">
              {cfg.titulo}
            </span>
          </div>

          <span
            className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10.5px] font-black tracking-wider uppercase border shrink-0 ${cfg.badgeClass}`}
          >
            {cfg.badge}
          </span>
        </div>
      </div>

      {/* 2. Bloque Central: Conmutador de 3 Terminales + Estado en Vivo de Cajón */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <IconButtonTooltip
            icon={ShoppingCart}
            label={modulo === "VENTAS" ? "Terminal POS Activa" : "Ir a Terminal de Ventas POS"}
            modulo="Mostrador"
            destino="Ventas y facturación en mostrador"
            href="/caja/pos"
            active={modulo === "VENTAS"}
            variant={modulo === "VENTAS" ? "emerald" : "neutral"}
            size="sm"
          />
          <IconButtonTooltip
            icon={Shirt}
            label={modulo === "ALQUILERES" ? "Terminal de Alquileres Activa" : "Ir a Terminal de Alquileres"}
            modulo="Mostrador"
            destino="Control y liquidación de prendas alquiladas"
            href="/caja/alquileres"
            active={modulo === "ALQUILERES"}
            variant={modulo === "ALQUILERES" ? "orange" : "neutral"}
            size="sm"
          />
          <IconButtonTooltip
            icon={CalendarClock}
            label={modulo === "APARTADOS" ? "Terminal de Apartados Activa" : "Ir a Terminal de Apartados y Reservas"}
            modulo="Mostrador"
            destino="Reservas y abonos en mostrador"
            href="/caja/apartados"
            active={modulo === "APARTADOS"}
            variant={modulo === "APARTADOS" ? "indigo" : "neutral"}
            size="sm"
          />
        </div>

        <BarraEstadoCajon
          cargando={cajon.cargando}
          cajonConectado={cajon.cajonConectado}
          seguridadCaja={cajon.seguridadCaja}
          saldoActualEnCajon={cajon.saldoActualEnCajon}
          totalDigital={cajon.totalDigital}
          estado={cajon.estado}
          motivoBloqueo={cajon.motivoBloqueo}
          onRefrescar={() => cajon.actualizarCajon(true)}
          onAbrirModal={cajon.abrirModal}
          compacto={true}
        />

        <BotonAbrirCajon soloIcono={true} size="md" />
      </div>

      {/* 3. Bloque Derecho: Botonera Uniforme de Herramientas de Mostrador */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="sm:hidden">
          <BotonAbrirCajon soloIcono={true} size="md" />
        </div>

        {/* Herramienta adicional específica (ej. FolderDown en Alquileres) */}
        {extraHerramientas}

        {/* Nueva Operación */}
        <IconButtonTooltip
          icon={PlusCircle}
          label={nuevaOperacionLabel || (modulo === "VENTAS" ? "Nueva Venta en Blanco" : modulo === "ALQUILERES" ? "Nuevo Alquiler en Blanco" : "Nuevo Apartado en Blanco")}
          modulo={cfg.titulo}
          destino="Inicia un nuevo flujo en blanco"
          active={nuevaOperacionActiva}
          variant={nuevaOperacionActiva ? cfg.activeVariant : "neutral"}
          size="md"
          onClick={onNuevaOperacion}
        />

        {/* Historial */}
        <IconButtonTooltip
          icon={History}
          label={historialLabel || (modulo === "VENTAS" ? "Historial y Cartera Pendiente" : modulo === "ALQUILERES" ? "Historial, Devoluciones y Moras" : "Historial de Reservas")}
          modulo="Facturación"
          destino="Ver comprobantes emitidos, abonos y moras"
          badgeCount={historialBadgeCount}
          badgeVariant={historialBadgeVariant}
          active={historialActivo}
          variant={historialActivo ? cfg.activeVariant : "neutral"}
          size="md"
          onClick={onHistorial}
        />

        {/* Sincronizar */}
        <IconButtonTooltip
          icon={RefreshCw}
          label="Sincronizar Mostrador"
          modulo="Datos"
          destino="Recarga catálogos, clientes y turno en caja"
          variant="neutral"
          size="md"
          onClick={onSincronizar}
        />

        {/* Limpiar */}
        <IconButtonTooltip
          icon={RotateCcw}
          label={limpiarLabel}
          modulo="Acción"
          destino="Reinicia la operación en curso y deselecciona el cliente"
          variant="danger"
          size="md"
          onClick={onLimpiar}
        />

        {/* Minimizar Ventana hacia la barra de tareas */}
        <BotonMinimizarVentana size="md" />

        {/* Cerrar Sesión */}
        <IconButtonTooltip
          icon={LogOut}
          label="Cerrar Sesión"
          modulo="Seguridad y Respaldo"
          destino="Sale del sistema y libera la cuenta"
          variant="danger"
          size="md"
          onClick={onCerrarSesion || handleLogoutDefault}
        />
      </div>
    </header>
  );
}

export interface StepperMostradorUnificadoProps {
  modulo: ModuloCaja;
  pasoActual: number;
  onSeleccionarPaso: (paso: any) => void;
  clienteSeleccionado: boolean;
  tieneItems: boolean;
  conteoItems?: number;
  puedeCobrar?: boolean;
  puedeImprimir?: boolean;
  etiquetasPasos?: [string, string, string, string];
}

export function StepperMostradorUnificado({
  modulo,
  pasoActual,
  onSeleccionarPaso,
  clienteSeleccionado,
  tieneItems,
  conteoItems = 0,
  puedeCobrar,
  puedeImprimir,
  etiquetasPasos,
}: StepperMostradorUnificadoProps) {
  const cfg = MODULO_CONFIG[modulo];
  const etiquetas = etiquetasPasos || cfg.defaultEtiquetas;

  const IconoPaso2 = modulo === "VENTAS" ? ShoppingBag : modulo === "ALQUILERES" ? Shirt : Tag;
  const IconoPaso3 = modulo === "VENTAS" ? Wallet : DollarSign;

  return (
    <div className="h-11 shrink-0 w-full bg-slate-50 border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between z-20 gap-2">
      {/* Stepper de 4 Pasos Homologado */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-3xl">
        {/* Paso 1: Cliente */}
        <button
          type="button"
          onClick={() => onSeleccionarPaso(1)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate ${
            pasoActual === 1
              ? `${cfg.stepperActiveClass} ring-1 ring-black/5`
              : clienteSeleccionado
              ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{etiquetas[0]}</span>
          {clienteSeleccionado && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
        </button>

        {/* Paso 2: Catálogo / Prendas */}
        <button
          type="button"
          disabled={!clienteSeleccionado}
          onClick={() => onSeleccionarPaso(2)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
            pasoActual === 2
              ? `${cfg.stepperActiveClass} ring-1 ring-black/5`
              : tieneItems
              ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <IconoPaso2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {etiquetas[1]} {conteoItems > 0 ? `(${conteoItems})` : ""}
          </span>
          {tieneItems && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
        </button>

        {/* Paso 3: Cobro y Caja */}
        <button
          type="button"
          disabled={!tieneItems}
          onClick={() => onSeleccionarPaso(3)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
            pasoActual === 3
              ? `${cfg.stepperActiveClass} ring-1 ring-black/5`
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <IconoPaso3 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{etiquetas[2]}</span>
        </button>

        {/* Paso 4: Comprobante */}
        <button
          type="button"
          disabled={!puedeImprimir}
          onClick={() => puedeImprimir && onSeleccionarPaso(4)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
            pasoActual === 4
              ? `${cfg.stepperActiveClass} ring-1 ring-black/5`
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{etiquetas[3]}</span>
        </button>
      </div>

      {/* Leyenda Uniforme de Atajos de Teclado */}
      <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200 text-[11px] font-mono text-slate-600 shrink-0">
        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F2</span> Cajón
        <span className="text-slate-300">·</span>
        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F4</span> Cobrar
        <span className="text-slate-300">·</span>
        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F9</span> Cliente
        <span className="text-slate-300">·</span>
        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">Esc</span> Cerrar
      </div>
    </div>
  );
}
