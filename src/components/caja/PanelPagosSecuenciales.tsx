"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Sparkles,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";

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
    descripcion: "Pago en efectivo en gaveta física con cálculo de vueltas",
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
    id: "LLAVE",
    nombre: "Bre-B",
    alias: "Bre-B / Llave",
    icono: Coins,
    descripcion: "Transferencia inmediata interoperable Bre-B / Llave",
  },
  {
    id: "DAVIPLATA",
    nombre: "Daviplata",
    alias: "Daviplata",
    icono: Smartphone,
    descripcion: "Transferencia electrónica a cuenta Daviplata",
  },
  {
    id: "TRANSFERENCIA",
    nombre: "Transferencia",
    alias: "Transf. Genérica",
    icono: CreditCard,
    descripcion: "Transferencia desde otros bancos o pasarelas",
  },
  {
    id: "CONSIGNACION",
    nombre: "Consignación",
    alias: "Consignación",
    icono: Landmark,
    descripcion: "Consignación o depósito bancario certificado",
  },
];

export const BILLETES_RAPIDOS_COL = [10000, 20000, 50000, 100000];

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
}: PanelPagosSecuencialesProps) {
  // 1. Cálculos de Totales y Saldos en Cascada
  const totalPagado = useMemo(() => {
    return pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [pagos]);

  const saldoFaltante = useMemo(() => {
    return Math.max(0, Math.round((totalExigible - totalPagado) * 100) / 100);
  }, [totalExigible, totalPagado]);

  // 2. Estado del formulario para agregar un nuevo tramo / abono
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>(metodoActivoAtajo || "EFECTIVO");
  const [montoAbonarInput, setMontoAbonarInput] = useState<string>("");
  const [montoModificadoManualmente, setMontoModificadoManualmente] = useState<boolean>(false);
  const [efectivoRecibidoInput, setEfectivoRecibidoInput] = useState<string>(efectivoRecibidoAtajo || "");
  const [referenciaInput, setReferenciaInput] = useState<string>("");
  const [errorInput, setErrorInput] = useState<string | null>(null);

  // Sincronizar el input de monto por defecto al saldo faltante si no ha sido editado a mano
  useEffect(() => {
    if (!montoModificadoManualmente) {
      setMontoAbonarInput(saldoFaltante > 0 ? String(saldoFaltante) : "0");
    }
  }, [saldoFaltante, montoModificadoManualmente]);

  // Notificar al padre el método seleccionado (para el atajo de 1 solo clic)
  useEffect(() => {
    if (onMetodoActivoAtajoChange) {
      onMetodoActivoAtajoChange(metodoSeleccionado);
    }
  }, [metodoSeleccionado, onMetodoActivoAtajoChange]);

  // Notificar al padre el efectivo recibido (para vueltas en atajo de 1 clic)
  useEffect(() => {
    if (onEfectivoRecibidoAtajoChange) {
      onEfectivoRecibidoAtajoChange(efectivoRecibidoInput);
    }
  }, [efectivoRecibidoInput, onEfectivoRecibidoAtajoChange]);

  // Si cambia externamente metodoActivoAtajo, reflejarlo
  useEffect(() => {
    if (metodoActivoAtajo && metodoActivoAtajo !== metodoSeleccionado) {
      setMetodoSeleccionado(metodoActivoAtajo);
    }
  }, [metodoActivoAtajo]);

  // Cálculos de vueltas si el método es efectivo
  const montoAbonarNum = Number(montoAbonarInput) || 0;
  const efectivoRecibidoNum = Number(efectivoRecibidoInput) || 0;
  const vueltasCalculadas =
    metodoSeleccionado === "EFECTIVO" && efectivoRecibidoNum > montoAbonarNum
      ? Math.max(0, efectivoRecibidoNum - montoAbonarNum)
      : 0;

  // Manejador para agregar un abono a la lista
  const agregarPagoALista = () => {
    setErrorInput(null);
    const monto = Math.round(montoAbonarNum * 100) / 100;

    if (monto <= 0) {
      setErrorInput("Digite un monto válido mayor a $0.");
      return;
    }

    if (saldoFaltante <= 0 && pagos.length > 0) {
      setErrorInput("El total de la operación ya se encuentra 100% cubierto.");
      return;
    }

    if (monto > saldoFaltante && saldoFaltante > 0) {
      setErrorInput(`El monto no puede exceder el saldo faltante de $${saldoFaltante.toLocaleString("es-CO")}.`);
      return;
    }

    let montoRecibido: number | null = null;
    let vueltasEntregadas: number | null = null;

    if (metodoSeleccionado === "EFECTIVO") {
      if (efectivoRecibidoNum > 0) {
        if (efectivoRecibidoNum < monto) {
          setErrorInput(`El efectivo recibido ($${efectivoRecibidoNum.toLocaleString("es-CO")}) es menor que el valor a abonar.`);
          return;
        }
        montoRecibido = efectivoRecibidoNum;
        vueltasEntregadas = vueltasCalculadas;
      } else {
        montoRecibido = monto;
        vueltasEntregadas = 0;
      }
    }

    const nuevoPago: PagoAplicado = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      metodoPago: metodoSeleccionado,
      monto,
      montoRecibido,
      vueltasEntregadas,
      referencia: referenciaInput.trim() || null,
    };

    const nuevaLista = [...pagos, nuevoPago];
    onChangePagos(nuevaLista);

    // Resetear formulario para el siguiente abono
    const nuevoTotalPagado = nuevaLista.reduce((acc, p) => acc + p.monto, 0);
    const nuevoSaldoFaltante = Math.max(0, totalExigible - nuevoTotalPagado);

    setMontoAbonarInput(nuevoSaldoFaltante > 0 ? String(nuevoSaldoFaltante) : "0");
    setMontoModificadoManualmente(false);
    setEfectivoRecibidoInput("");
    setReferenciaInput("");
    setErrorInput(null);
  };

  // Manejador para quitar un pago
  const eliminarPago = (id: string) => {
    const nuevaLista = pagos.filter((p) => p.id !== id);
    onChangePagos(nuevaLista);
    const nuevoTotalPagado = nuevaLista.reduce((acc, p) => acc + p.monto, 0);
    const nuevoSaldoFaltante = Math.max(0, totalExigible - nuevoTotalPagado);
    setMontoAbonarInput(String(nuevoSaldoFaltante));
    setMontoModificadoManualmente(false);
  };

  // Restablecer todos los pagos aplicados
  const limpiarTodosLosPagos = () => {
    onChangePagos([]);
    setMontoAbonarInput(String(totalExigible));
    setMontoModificadoManualmente(false);
    setEfectivoRecibidoInput("");
    setReferenciaInput("");
  };

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

  return (
    <div className={`space-y-3.5 select-none ${className}`}>
      {/* 1. Barra de Control de Montos: Total Exigible, Pagado y Saldo en Vivo */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {etiquetaTotal}
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
              ${totalExigible.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 block">
                Total Aplicado:
              </span>
              <span className={`font-mono text-base sm:text-lg font-black ${estilosColor.textoPrimario}`}>
                ${totalPagado.toLocaleString("es-CO")}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="text-right">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 block">
                Saldo Faltante:
              </span>
              <span
                className={`font-mono text-base sm:text-lg font-black ${
                  saldoFaltante === 0
                    ? "text-emerald-700"
                    : saldoFaltante > 0
                    ? "text-rose-600"
                    : "text-slate-900"
                }`}
              >
                ${saldoFaltante.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        </div>

        {/* Indicador de Progreso Visual */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full ${estilosColor.accentDot}`} />
            <span className="text-slate-600 font-semibold truncate text-[11px]">
              {subtitulo || "Abona con uno o varios métodos sucesivamente"}
            </span>
          </div>

          {saldoFaltante === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              100% Cubierto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
              <Clock className="w-3 h-3 text-amber-700" />
              Resta por Cubrir: ${saldoFaltante.toLocaleString("es-CO")}
            </span>
          )}
        </div>
      </div>

      {/* 2. Formulario de Selección de Método y Registro de Pago */}
      <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-slate-600" />
            <span>Seleccionar Medio y Aplicar Pago:</span>
          </label>
          <span className="text-[11px] font-semibold text-slate-400">
            Predeterminado: <strong className="text-slate-700">Efectivo</strong>
          </span>
        </div>

        {/* Grilla Simétrica de los 7 Métodos con Iconos y Tooltip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {METODOS_PAGO_CATALOGO.map((m) => {
            const IconM = m.icono;
            const esActivo = metodoSeleccionado === m.id;
            return (
              <Tooltip key={m.id} content={m.nombre} subtext={m.descripcion} position="top">
                <button
                  type="button"
                  onClick={() => {
                    setMetodoSeleccionado(m.id);
                    if (m.id === "EFECTIVO" && !efectivoRecibidoInput) {
                      setEfectivoRecibidoInput(String(montoAbonarNum || saldoFaltante));
                    }
                  }}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer w-full ${
                    esActivo
                      ? `${estilosColor.botonPrimario} shadow-xs ring-2 ${estilosColor.ringFocus}`
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/90"
                  }`}
                >
                  <IconM className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-semibold truncate max-w-full">{m.alias}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Campos de Entrada: Monto a Abonar + Efectivo Recibido / Referencia */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          {/* Campo Monto a Abonar */}
          <div className={`${metodoSeleccionado === "EFECTIVO" ? "sm:col-span-5" : "sm:col-span-8"} space-y-1`}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 block">
                Monto a Abonar con {metodoSeleccionado}:
              </label>
              {saldoFaltante > 0 && montoAbonarNum !== saldoFaltante && (
                <button
                  type="button"
                  onClick={() => {
                    setMontoAbonarInput(String(saldoFaltante));
                    setMontoModificadoManualmente(false);
                    if (metodoSeleccionado === "EFECTIVO") {
                      setEfectivoRecibidoInput(String(saldoFaltante));
                    }
                  }}
                  className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Resto ($ {saldoFaltante.toLocaleString("es-CO")})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
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
                  }
                }}
                placeholder={String(saldoFaltante)}
                className={`w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-900 focus:outline-none focus:ring-2 ${estilosColor.ringFocus}`}
              />
            </div>
          </div>

          {/* Subcampos Dinámicos: Si es Efectivo (Recibido y Vueltas) o si es Banco (Referencia) */}
          {metodoSeleccionado === "EFECTIVO" ? (
            <div className="sm:col-span-7 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Efectivo Recibido (Cálculo de Vueltas):
              </label>
              <div className="space-y-1.5">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={efectivoRecibidoInput}
                    onChange={(e) => setEfectivoRecibidoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarPagoALista();
                      }
                    }}
                    placeholder={String(montoAbonarNum || saldoFaltante)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Billetes Rápidos */}
                <div className="flex items-center gap-1">
                  {BILLETES_RAPIDOS_COL.map((den) => (
                    <Tooltip key={den} content={`Fijar billete de $${den.toLocaleString("es-CO")}`} position="top">
                      <button
                        type="button"
                        onClick={() => setEfectivoRecibidoInput(String(den))}
                        className="flex-1 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold transition font-mono cursor-pointer"
                      >
                        ${(den / 1000).toFixed(0)}k
                      </button>
                    </Tooltip>
                  ))}
                  <Tooltip content="Recibir monto exacto (vueltas $0)" position="top">
                    <button
                      type="button"
                      onClick={() => setEfectivoRecibidoInput(String(montoAbonarNum || saldoFaltante))}
                      className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Exacto
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : (
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                N° Aprobación / Referencia (Opcional):
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
                placeholder="Ej. Últimos 4 dígitos o comprobante"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Resumen de Vueltas en Efectivo si aplica */}
        {metodoSeleccionado === "EFECTIVO" && efectivoRecibidoNum > 0 && (
          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950">Vueltas / Cambio a Entregar en este Pago:</span>
            <span className="font-mono text-base font-black text-emerald-800">
              ${vueltasCalculadas.toLocaleString("es-CO")}
            </span>
          </div>
        )}

        {/* Alerta de Error si hay validación fallida */}
        {errorInput && (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorInput}</span>
          </div>
        )}

        {/* Botón de Acción Principal: Aplicar / Abonar Pago */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {saldoFaltante > 0
              ? `Aplica el pago de $${montoAbonarNum.toLocaleString("es-CO")} para reducir el saldo restante.`
              : "Operación 100% cubierta. Si deseas cambiar un pago, elimínalo de la lista abajo."}
          </p>

          <Tooltip content="Agregar este pago a la orden actual" position="top">
            <button
              type="button"
              disabled={montoAbonarNum <= 0 || (saldoFaltante <= 0 && pagos.length > 0)}
              onClick={agregarPagoALista}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs ${estilosColor.botonPrimario}`}
            >
              <Plus className="w-4 h-4" />
              <span>Aplicar / Registrar Pago</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 3. Lista de Pagos Aplicados en Cascada */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Pagos Registrados en la Operación ({pagos.length})
            </h4>
          </div>

          {pagos.length > 0 && (
            <Tooltip content="Eliminar todos los pagos y reiniciar desde cero" position="left">
              <button
                type="button"
                onClick={limpiarTodosLosPagos}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar Pagos</span>
              </button>
            </Tooltip>
          )}
        </div>

        {pagos.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">
              No se han agregado pagos a la lista (Modo Rápido Disponible)
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Si el cliente paga el 100% con un único método (ej. ${totalExigible.toLocaleString("es-CO")} en{" "}
              <strong className="text-slate-800">{metodoSeleccionado}</strong>), puedes confirmar y cobrar directamente
              sin necesidad de agregar filas manualmente.
            </p>
          </div>
        ) : (
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
                        <span className="text-[10px] text-slate-500 block">
                          Recibido: ${p.montoRecibido.toLocaleString("es-CO")} • Cambio: $
                          {(p.vueltasEntregadas || 0).toLocaleString("es-CO")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-black text-slate-900">
                      ${p.monto.toLocaleString("es-CO")}
                    </span>
                    <IconButtonTooltip
                      icon={Trash2}
                      label={`Quitar pago de $${p.monto.toLocaleString("es-CO")} en ${p.metodoPago}`}
                      variant="danger"
                      size="sm"
                      onClick={() => eliminarPago(p.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
