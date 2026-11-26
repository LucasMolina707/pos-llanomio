"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Banknote,
  Building2,
  Smartphone,
  Coins,
  CreditCard,
  Landmark,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Wallet,
  ArrowRight,
  Check,
  Receipt,
  ChevronDown,
  CornerDownLeft,
  Undo2,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import InputDinero from "@/components/ui/InputDinero";

export interface PagoAplicado {
  id: string;
  metodoPago: string;
  monto: number;
  montoRecibido?: number | null;
  vueltasEntregadas?: number | null;
  referencia?: string | null;
  notas?: string | null;
}

export interface MetodoOpcion {
  id: "EFECTIVO" | "BANCOLOMBIA" | "NEQUI" | "DAVIPLATA" | "LLAVE" | "TRANSFERENCIA" | "CONSIGNACION";
  nombre: string;
  alias: string;
  icono: React.ComponentType<{ className?: string }>;
  descripcion: string;
}

export const METODOS_PAGO_CATALOGO: MetodoOpcion[] = [
  {
    id: "EFECTIVO",
    nombre: "Efectivo",
    alias: "Efectivo",
    icono: Banknote,
    descripcion: "Efectivo en gaveta física con cálculo de vueltas",
  },
  {
    id: "BANCOLOMBIA",
    nombre: "Bancolombia",
    alias: "Bancolombia",
    icono: Building2,
    descripcion: "Transferencia a cuenta o código QR Bancolombia",
  },
  {
    id: "NEQUI",
    nombre: "Nequi",
    alias: "Nequi",
    icono: Smartphone,
    descripcion: "Transferencia electrónica a cuenta Nequi",
  },
  {
    id: "DAVIPLATA",
    nombre: "Daviplata",
    alias: "Daviplata",
    icono: Smartphone,
    descripcion: "Transferencia electrónica a cuenta Daviplata",
  },
  {
    id: "LLAVE",
    nombre: "Bre-B",
    alias: "Bre-B / Llave",
    icono: Coins,
    descripcion: "Transferencia interoperable Bre-B / Llave",
  },
  {
    id: "TRANSFERENCIA",
    nombre: "Transferencia",
    alias: "Transf. Genérica",
    icono: CreditCard,
    descripcion: "Transferencia desde otros bancos",
  },
  {
    id: "CONSIGNACION",
    nombre: "Consignación",
    alias: "Consignación",
    icono: Landmark,
    descripcion: "Depósito bancario certificado",
  },
];

export const OTROS_METODOS_CATALOGO: MetodoOpcion[] = [
  {
    id: "NEQUI",
    nombre: "Nequi",
    alias: "Nequi",
    icono: Smartphone,
    descripcion: "Transferencia a cuenta Nequi",
  },
  {
    id: "DAVIPLATA",
    nombre: "Daviplata",
    alias: "Daviplata",
    icono: Smartphone,
    descripcion: "Transferencia a Daviplata",
  },
  {
    id: "LLAVE",
    nombre: "Bre-B / Llave",
    alias: "Bre-B",
    icono: Coins,
    descripcion: "Transferencia Bre-B / Llave",
  },
  {
    id: "TRANSFERENCIA",
    nombre: "Transferencia",
    alias: "Transf. Genérica",
    icono: CreditCard,
    descripcion: "Transferencia desde otros bancos",
  },
  {
    id: "CONSIGNACION",
    nombre: "Consignación",
    alias: "Consignación",
    icono: Landmark,
    descripcion: "Depósito bancario certificado",
  },
];

export interface PanelPagosSecuencialesProps {
  totalExigible: number;
  pagos: PagoAplicado[];
  onChangePagos: (pagos: PagoAplicado[]) => void;
  // Sincronización para atajo de 1 solo clic cuando pagos está vacío
  metodoActivoAtajo?: string;
  onMetodoActivoAtajoChange?: (metodo: string) => void;
  efectivoRecibidoAtajo?: string;
  onEfectivoRecibidoAtajoChange?: (val: string) => void;
  accentColor?: "emerald" | "orange" | "indigo";
  permitirSaldoPendiente?: boolean; // false en alquileres (exige 100%)
  etiquetaTotal?: string;
  subtitulo?: string;
  className?: string;
  // Ergonomía de alta velocidad
  onCompletarCobroAuto?: (pagosFinales: PagoAplicado[]) => void;
  onCancelarOVolver?: () => void;
  autoFocus?: boolean;
}

export default function PanelPagosSecuenciales({
  totalExigible,
  pagos,
  onChangePagos,
  metodoActivoAtajo = "EFECTIVO",
  onMetodoActivoAtajoChange,
  efectivoRecibidoAtajo = "",
  onEfectivoRecibidoAtajoChange,
  accentColor = "emerald",
  permitirSaldoPendiente = true,
  etiquetaTotal = "Total a Cobrar Hoy",
  subtitulo,
  className = "",
  onCompletarCobroAuto,
  onCancelarOVolver,
  autoFocus = true,
}: PanelPagosSecuencialesProps) {
  // 1. Cálculos de Totales y Saldos en Cascada
  const totalPagado = useMemo(() => {
    return pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [pagos]);

  const saldoFaltante = useMemo(() => {
    return Math.max(0, Math.round((totalExigible - totalPagado) * 100) / 100);
  }, [totalExigible, totalPagado]);

  // Vueltas registradas en los pagos ya aplicados
  const vueltasHistoricas = useMemo(() => {
    return pagos.reduce((acc, p) => acc + (Number(p.vueltasEntregadas) || 0), 0);
  }, [pagos]);

  // 2. Estado del formulario para agregar un nuevo tramo / abono
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>(metodoActivoAtajo || "EFECTIVO");
  const [montoAbonarInput, setMontoAbonarInput] = useState<string>("");
  const [montoModificadoManualmente, setMontoModificadoManualmente] = useState<boolean>(false);
  const [referenciaInput, setReferenciaInput] = useState<string>("");
  const [errorInput, setErrorInput] = useState<string | null>(null);
  const [ultimasVueltas, setUltimasVueltas] = useState<number>(0);

  // Referencias a los inputs para control de foco inmediato
  const inputMontoRef = useRef<HTMLInputElement>(null);
  const selectOtrosBancosRef = useRef<HTMLSelectElement>(null);

  // Foco automático al montar y cuando se active autoFocus
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputMontoRef.current?.focus();
        inputMontoRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Notificar al padre el método seleccionado
  useEffect(() => {
    if (onMetodoActivoAtajoChange) {
      onMetodoActivoAtajoChange(metodoSeleccionado);
    }
  }, [metodoSeleccionado, onMetodoActivoAtajoChange]);

  // Notificar al padre el efectivo recibido
  useEffect(() => {
    if (onEfectivoRecibidoAtajoChange) {
      onEfectivoRecibidoAtajoChange(montoAbonarInput);
    }
  }, [montoAbonarInput, onEfectivoRecibidoAtajoChange]);

  // Si cambia externamente metodoActivoAtajo, reflejarlo
  useEffect(() => {
    if (metodoActivoAtajo && metodoActivoAtajo !== metodoSeleccionado) {
      setMetodoSeleccionado(metodoActivoAtajo);
    }
  }, [metodoActivoAtajo]);

  // Cálculos de vueltas en vivo si el método es efectivo y el monto supera el saldo
  const montoAbonarNum = Number(montoAbonarInput) || 0;
  const vueltasEnVivo = useMemo(() => {
    if (metodoSeleccionado === "EFECTIVO" && montoAbonarNum > saldoFaltante && saldoFaltante > 0) {
      return montoAbonarNum - saldoFaltante;
    }
    return 0;
  }, [metodoSeleccionado, montoAbonarNum, saldoFaltante]);

  // Manejador para aplicar un abono (total o parcial)
  const agregarPagoALista = useCallback(() => {
    setErrorInput(null);
    // Si el usuario no digitó nada en el input pero presiona Enter, toma por defecto el saldo faltante
    const montoDigitado = montoAbonarInput.trim() === ""
      ? saldoFaltante
      : Math.round(montoAbonarNum * 100) / 100;

    if (montoDigitado <= 0) {
      setErrorInput("Digite un monto válido mayor a $0.");
      inputMontoRef.current?.focus();
      return;
    }

    if (saldoFaltante <= 0 && pagos.length > 0) {
      setErrorInput("El total de la operación ya se encuentra 100% cubierto.");
      if (onCompletarCobroAuto) {
        onCompletarCobroAuto(pagos);
      }
      return;
    }

    let montoAplicado = montoDigitado;
    let montoRecibido: number | null = null;
    let vueltasEntregadas: number | null = null;

    if (metodoSeleccionado === "EFECTIVO") {
      if (montoDigitado >= saldoFaltante && saldoFaltante > 0) {
        // Cubre o supera el saldo pendiente restante
        montoAplicado = saldoFaltante;
        montoRecibido = montoDigitado;
        vueltasEntregadas = montoDigitado - saldoFaltante;
      } else {
        // Abono parcial en efectivo
        montoAplicado = montoDigitado;
        montoRecibido = montoDigitado;
        vueltasEntregadas = 0;
      }
    } else {
      // Transferencia / Bancos / Bre-B: no permite cambio en efectivo
      if (montoDigitado > saldoFaltante && saldoFaltante > 0) {
        setErrorInput(
          `En transferencias el monto no puede exceder el saldo de $${saldoFaltante.toLocaleString("es-CO")}.`
        );
        inputMontoRef.current?.focus();
        inputMontoRef.current?.select();
        return;
      }
      montoAplicado = montoDigitado;
      montoRecibido = null;
      vueltasEntregadas = null;
    }

    const nuevoPago: PagoAplicado = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      metodoPago: metodoSeleccionado,
      monto: montoAplicado,
      montoRecibido,
      vueltasEntregadas,
      referencia: referenciaInput.trim() || null,
    };

    const nuevaLista = [...pagos, nuevoPago];
    onChangePagos(nuevaLista);

    // Calcular nuevo saldo faltante tras aplicar este pago
    const nuevoTotalPagado = nuevaLista.reduce((acc, p) => acc + p.monto, 0);
    const nuevoSaldo = Math.max(0, Math.round((totalExigible - nuevoTotalPagado) * 100) / 100);

    if (vueltasEntregadas && vueltasEntregadas > 0) {
      setUltimasVueltas(vueltasEntregadas);
    }

    // Si el saldo llega exactamente a 0 y existe callback de auto-completar:
    if (nuevoSaldo === 0 && onCompletarCobroAuto) {
      onCompletarCobroAuto(nuevaLista);
      return;
    }

    // Si el saldo sigue siendo mayor a 0 (Abono Parcial):
    setMontoAbonarInput("");
    setMontoModificadoManualmente(false);
    setReferenciaInput("");
    setErrorInput(null);

    // Re-enfocar automáticamente el input para el siguiente pago (Zero-Mouse)
    setTimeout(() => {
      inputMontoRef.current?.focus();
      inputMontoRef.current?.select();
    }, 40);
  }, [
    montoAbonarNum,
    saldoFaltante,
    pagos,
    metodoSeleccionado,
    referenciaInput,
    onChangePagos,
    totalExigible,
    onCompletarCobroAuto,
  ]);

  // Manejador para quitar el último abono (Deshacer rápido)
  const eliminarUltimoPago = useCallback(() => {
    if (pagos.length === 0) return;
    const nuevaLista = pagos.slice(0, pagos.length - 1);
    onChangePagos(nuevaLista);

    const nuevoTotalPagado = nuevaLista.reduce((acc, p) => acc + p.monto, 0);
    const nuevoSaldo = Math.max(0, Math.round((totalExigible - nuevoTotalPagado) * 100) / 100);

    setMontoAbonarInput("");
    setMontoModificadoManualmente(false);
    setUltimasVueltas(0);
    setErrorInput(null);

    setTimeout(() => {
      inputMontoRef.current?.focus();
      inputMontoRef.current?.select();
    }, 40);
  }, [pagos, onChangePagos, totalExigible]);

  // Manejador para quitar un pago individual
  const eliminarPago = (id: string) => {
    const nuevaLista = pagos.filter((p) => p.id !== id);
    onChangePagos(nuevaLista);
    const nuevoTotalPagado = nuevaLista.reduce((acc, p) => acc + p.monto, 0);
    const nuevoSaldo = Math.max(0, Math.round((totalExigible - nuevoTotalPagado) * 100) / 100);
    setMontoAbonarInput("");
    setMontoModificadoManualmente(false);
    setTimeout(() => {
      inputMontoRef.current?.focus();
      inputMontoRef.current?.select();
    }, 40);
  };

  // Restablecer todos los pagos aplicados
  const limpiarTodosLosPagos = () => {
    onChangePagos([]);
    setMontoAbonarInput("");
    setMontoModificadoManualmente(false);
    setReferenciaInput("");
    setUltimasVueltas(0);
    setTimeout(() => {
      inputMontoRef.current?.focus();
      inputMontoRef.current?.select();
    }, 40);
  };

  // Atajos de teclado en el panel de cobro (Zero-Mouse Priority)
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      // Alt+1 o F5 -> Efectivo
      if ((e.altKey && e.key === "1") || e.key === "F5") {
        e.preventDefault();
        setMetodoSeleccionado("EFECTIVO");
        inputMontoRef.current?.focus();
        inputMontoRef.current?.select();
        return;
      }
      // Alt+2 o F6 -> Bancolombia
      if ((e.altKey && e.key === "2") || e.key === "F6") {
        e.preventDefault();
        setMetodoSeleccionado("BANCOLOMBIA");
        inputMontoRef.current?.focus();
        inputMontoRef.current?.select();
        return;
      }
      // Alt+3 o F7 -> Otros Medios
      if ((e.altKey && e.key === "3") || e.key === "F7") {
        e.preventDefault();
        selectOtrosBancosRef.current?.focus();
        return;
      }
      // F3 o Alt+Z -> Deshacer último abono
      if (e.key === "F3" || (e.altKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        eliminarUltimoPago();
        return;
      }
      // Alt+L -> Limpiar todos los abonos
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        limpiarTodosLosPagos();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [eliminarUltimoPago]);

  // Clases por paleta de color
  const estilosColor = {
    emerald: {
      bordePrimario: "border-emerald-300",
      bgPrimario: "bg-emerald-50",
      textoPrimario: "text-emerald-700",
      botonPrimario: "bg-emerald-600 hover:bg-emerald-700 text-white",
      ringFocus: "focus:ring-emerald-500",
      badgePill: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accentDot: "bg-emerald-500",
    },
    orange: {
      bordePrimario: "border-orange-300",
      bgPrimario: "bg-orange-50",
      textoPrimario: "text-orange-700",
      botonPrimario: "bg-orange-600 hover:bg-orange-700 text-white",
      ringFocus: "focus:ring-orange-500",
      badgePill: "bg-orange-100 text-orange-900 border-orange-300",
      accentDot: "bg-orange-500",
    },
    indigo: {
      bordePrimario: "border-indigo-300",
      bgPrimario: "bg-indigo-50",
      textoPrimario: "text-indigo-700",
      botonPrimario: "bg-indigo-600 hover:bg-indigo-700 text-white",
      ringFocus: "focus:ring-indigo-500",
      badgePill: "bg-indigo-100 text-indigo-900 border-indigo-300",
      accentDot: "bg-indigo-500",
    },
  }[accentColor];

  const totalVueltasVisibles = vueltasEnVivo > 0 ? vueltasEnVivo : ultimasVueltas;

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {/* 1. Control Contable: Resumen de Saldos (Solo activo al registrar abonos parciales) */}
      {totalPagado > 0 && (
        <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Abonado:
            </span>
            <span className={`font-mono text-lg font-black tabular-nums ${estilosColor.textoPrimario}`}>
              ${totalPagado.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Saldo:
            </span>
            <span
              className={`font-mono text-lg font-black tabular-nums px-2 py-0.5 rounded-lg border transition ${
                saldoFaltante === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-rose-50 text-rose-700 border-rose-300"
              }`}
            >
              ${saldoFaltante.toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      )}

      {/* Banner Prominente de Vueltas / Cambio si aplica */}
      {totalVueltasVisibles > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 shrink-0 text-emerald-200" />
            <span className="text-xs font-black uppercase tracking-wider">
              Vueltas:
            </span>
          </div>
          <span className="font-mono text-2xl font-black tabular-nums">
            ${totalVueltasVisibles.toLocaleString("es-CO")}
          </span>
        </div>
      )}

      {/* 2. Formulario de Selección de Método y Registro de Pago */}
      <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-slate-600" />
            <span>Medio:</span>
          </label>

          <span className="text-[10.5px] font-semibold text-slate-400">
            Atajos: <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[9.5px]">Alt+1</kbd>{" "}
            <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[9.5px]">Alt+2</kbd>{" "}
            <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[9.5px]">Alt+3</kbd>
          </span>
        </div>

        {/* Selector de Métodos: Efectivo, Bancolombia y Desplegable de Otros Bancos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Efectivo */}
          <button
            type="button"
            onClick={() => {
              setMetodoSeleccionado("EFECTIVO");
              setTimeout(() => {
                inputMontoRef.current?.focus();
                inputMontoRef.current?.select();
              }, 30);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer w-full whitespace-nowrap ${
              metodoSeleccionado === "EFECTIVO"
                ? `${estilosColor.botonPrimario} shadow-xs ring-2 ${estilosColor.ringFocus}`
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Pagar con Efectivo (Alt+1)"
          >
            <Banknote className="w-4 h-4 shrink-0" />
            <span>Efectivo</span>
          </button>

          {/* 2. Bancolombia */}
          <button
            type="button"
            onClick={() => {
              setMetodoSeleccionado("BANCOLOMBIA");
              setTimeout(() => {
                inputMontoRef.current?.focus();
                inputMontoRef.current?.select();
              }, 30);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer w-full whitespace-nowrap ${
              metodoSeleccionado === "BANCOLOMBIA"
                ? `${estilosColor.botonPrimario} shadow-xs ring-2 ${estilosColor.ringFocus}`
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Pagar con Bancolombia (Alt+2)"
          >
            <span className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/iconos/bancolombia-logo.png"
                alt=""
                className={`w-3.5 h-3.5 object-contain ${
                  metodoSeleccionado === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                }`}
              />
            </span>
            <span>Bancolombia</span>
          </button>

          {/* 3. Desplegable Otros Bancos / Medios */}
          <div className="relative">
            <div
              className={`relative flex items-center rounded-xl border transition cursor-pointer w-full ${
                metodoSeleccionado !== "EFECTIVO" && metodoSeleccionado !== "BANCOLOMBIA"
                  ? `${estilosColor.botonPrimario} shadow-xs ring-2 ${estilosColor.ringFocus}`
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="pl-3 py-2 flex items-center gap-1.5 pointer-events-none">
                <CreditCard className="w-4 h-4 shrink-0" />
              </div>
              <select
                ref={selectOtrosBancosRef}
                value={
                  metodoSeleccionado !== "EFECTIVO" && metodoSeleccionado !== "BANCOLOMBIA"
                    ? metodoSeleccionado
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setMetodoSeleccionado(e.target.value);
                    setTimeout(() => {
                      inputMontoRef.current?.focus();
                      inputMontoRef.current?.select();
                    }, 30);
                  }
                }}
                className={`w-full py-2 pl-1.5 pr-8 text-xs font-bold bg-transparent outline-none cursor-pointer appearance-none ${
                  metodoSeleccionado !== "EFECTIVO" && metodoSeleccionado !== "BANCOLOMBIA"
                    ? "text-white font-black"
                    : "text-slate-700"
                }`}
              >
                <option value="" disabled className="text-slate-800 bg-white">
                  Otros Medios ▼
                </option>
                {OTROS_METODOS_CATALOGO.map((om) => (
                  <option key={om.id} value={om.id} className="text-slate-800 bg-white">
                    {om.alias}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 pointer-events-none opacity-70" />
            </div>
          </div>
        </div>

        {/* Campo Único de Entrada de Monto / Recibido + Botón Exacto */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          {/* Monto principal */}
          <div className={`${metodoSeleccionado === "EFECTIVO" ? "sm:col-span-8" : "sm:col-span-8"} space-y-1`}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 block">
                Recibido:
              </label>

              {saldoFaltante > 0 && montoAbonarNum !== saldoFaltante && (
                <button
                  type="button"
                  onClick={() => {
                    setMontoAbonarInput(String(saldoFaltante));
                    setMontoModificadoManualmente(false);
                    inputMontoRef.current?.focus();
                  }}
                  className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Resto ($ {saldoFaltante.toLocaleString("es-CO")})
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <InputDinero
                  ref={inputMontoRef}
                  id="input-recibido-panel-pagos"
                  mostrarPrefijo
                  value={montoAbonarInput}
                  onChange={(e) => {
                    setMontoAbonarInput(e.target.value);
                    setMontoModificadoManualmente(true);
                    setErrorInput(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarPagoALista();
                    } else if (e.key === "Escape") {
                      if (montoModificadoManualmente) {
                        setMontoAbonarInput(String(saldoFaltante));
                        setMontoModificadoManualmente(false);
                      } else if (pagos.length === 0 && onCancelarOVolver) {
                        onCancelarOVolver();
                      }
                    }
                  }}
                  placeholder={String(saldoFaltante)}
                  className={`w-full pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-base font-black tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${estilosColor.ringFocus}`}
                />
              </div>

              {/* Botón Exacto (Fija el saldo faltante exacto) */}
              <Tooltip content="Cobrar el valor exacto del saldo faltante" position="top">
                <button
                  type="button"
                  onClick={() => {
                    setMontoAbonarInput(String(saldoFaltante));
                    setMontoModificadoManualmente(false);
                    inputMontoRef.current?.focus();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Exacto</span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Si no es efectivo, campo de Referencia Opcional */}
          {metodoSeleccionado !== "EFECTIVO" && (
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Ref / Aprobacion:
              </label>
              <input
                type="text"
                value={referenciaInput}
                onChange={(e) => setReferenciaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarPagoALista();
                  }
                }}
                placeholder="Comprobante"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Botón Registrar Abono */}
          <div className={`${metodoSeleccionado === "EFECTIVO" ? "sm:col-span-4" : "sm:col-span-12"} flex items-end`}>
            <button
              type="button"
              disabled={montoAbonarNum <= 0 || (saldoFaltante <= 0 && pagos.length > 0)}
              onClick={agregarPagoALista}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs ${estilosColor.botonPrimario}`}
            >
              <CornerDownLeft className="w-4 h-4" />
              <span>{saldoFaltante <= montoAbonarNum && saldoFaltante > 0 ? "Cobrar [Enter]" : "Abonar [Enter]"}</span>
            </button>
          </div>
        </div>

        {/* Alerta de Error si hay validación fallida */}
        {errorInput && (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorInput}</span>
          </div>
        )}
      </div>

      {/* 3. Lista de Abonos Registrados (Solo visible cuando hay abonos) */}
      {pagos.length > 0 && (
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Abonos Registrados ({pagos.length})
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="Eliminar el último abono registrado (F3 o Alt+Z)" position="left">
                <button
                  type="button"
                  onClick={eliminarUltimoPago}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Deshacer [F3]</span>
                </button>
              </Tooltip>

              {pagos.length > 1 && (
                <Tooltip content="Eliminar todos los abonos y reiniciar desde cero" position="left">
                  <button
                    type="button"
                    onClick={limpiarTodosLosPagos}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer ml-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reiniciar</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {pagos.map((p, idx) => {
              const metaMetodo = METODOS_PAGO_CATALOGO.find((m) => m.id === p.metodoPago);
              const IconComp = metaMetodo?.icono || Wallet;
              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2 text-xs hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-slate-900 font-bold">
                          {metaMetodo?.nombre || p.metodoPago}
                        </strong>
                        {p.referencia && (
                          <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            Ref: {p.referencia}
                          </span>
                        )}
                      </div>
                      {p.metodoPago === "EFECTIVO" && p.montoRecibido && p.montoRecibido > p.monto && (
                        <span className="text-[10px] text-slate-500 block tabular-nums">
                          Recibido: ${p.montoRecibido.toLocaleString("es-CO")} • Cambio: $
                          {(p.vueltasEntregadas || 0).toLocaleString("es-CO")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-black tabular-nums text-slate-900">
                      ${p.monto.toLocaleString("es-CO")}
                    </span>
                    <IconButtonTooltip
                      icon={Trash2}
                      label={`Quitar abono de $${p.monto.toLocaleString("es-CO")}`}
                      variant="danger"
                      size="sm"
                      onClick={() => eliminarPago(p.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
