"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Banknote,
  Building2,
  Smartphone,
  Coins,
  CreditCard,
  Landmark,
  ShieldCheck,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Split,
  Wallet,
} from "lucide-react";
import InputDinero from "@/components/ui/InputDinero";
import { PagoAplicado, METODOS_PAGO_CATALOGO } from "@/components/caja/PanelPagosSecuenciales";

export type ModuloLiquidacion = "VENTAS" | "ALQUILERES" | "APARTADOS";
export type ModalidadVentaCobro = "TOTAL" | "ADELANTO" | "PENDIENTE";
export type MetodoPagoValido =
  | "EFECTIVO"
  | "BANCOLOMBIA"
  | "NEQUI"
  | "DAVIPLATA"
  | "LLAVE"
  | "TRANSFERENCIA"
  | "CONSIGNACION";

export interface ResultadoLiquidacionMostrador {
  totalOperacion: number;
  montoDepositoPactado: number;
  totalTasadoDocumento: number;
  montoOperacionHoy: number;
  montoDepositoHoy: number;
  totalRecibirClienteHoy: number;
  efectivoExigibleEnManoHoy: number;
  digitalExigibleHoy: number;
  billetesRecibidosCliente: number;
  vueltasEntregarCliente: number;
  metodoPrincipalOperacion: MetodoPagoValido;
  metodoDeposito: MetodoPagoValido;
  pagosComerciales: PagoAplicado[];
  esValido: boolean;
  motivoBloqueo: string | null;
}

export interface PanelLiquidacionMostradorProps {
  modulo: ModuloLiquidacion;
  totalOperacion: number;
  abonoPrevioOperacion?: number;
  // Ventas: modalidad (Total, Abono parcial o Credito cartera)
  modalidadVenta?: ModalidadVentaCobro;
  onModalidadVentaChange?: (modalidad: ModalidadVentaCobro) => void;
  permiteCreditoCartera?: boolean;
  cupoDisponibleCliente?: number;
  // Monto comercial a cobrar hoy (editable en Apartados y en Ventas modo ADELANTO)
  montoOperacionHoyInput?: string;
  onMontoOperacionHoyInputChange?: (valor: string) => void;
  // Custodia de Deposito (solo Alquileres y Apartados)
  montoDepositoPactadoInput?: string;
  onMontoDepositoPactadoInputChange?: (valor: string) => void;
  depositoAbonadoPrevio?: number;
  cobrarDepositoHoyApartado?: boolean;
  onCobrarDepositoHoyApartadoChange?: (cobrarHoy: boolean) => void;
  montoDepositoHoyInput?: string;
  onMontoDepositoHoyInputChange?: (valor: string) => void;
  // Metodos seleccionados
  metodoOperacion?: MetodoPagoValido;
  onMetodoOperacionChange?: (metodo: MetodoPagoValido) => void;
  metodoDeposito?: MetodoPagoValido;
  onMetodoDepositoChange?: (metodo: MetodoPagoValido) => void;
  referenciaOperacion?: string;
  onReferenciaOperacionChange?: (ref: string) => void;
  // Callback consolidado
  onResultadoChange?: (resultado: ResultadoLiquidacionMostrador) => void;
  onConfirmarEnter?: () => void;
}

const METODOS_PRINCIPALES: MetodoPagoValido[] = ["EFECTIVO", "BANCOLOMBIA", "NEQUI"];
const METODOS_SECUNDARIOS: MetodoPagoValido[] = ["DAVIPLATA", "LLAVE", "TRANSFERENCIA", "CONSIGNACION"];

const DENOMINACIONES_RAPIDAS = [20000, 50000, 100000, 200000];
const CHIPS_DEPOSITO = [0, 20000, 30000, 50000];
const CHIPS_ABONO_RESERVA = [20000, 30000, 50000];

export default function PanelLiquidacionMostrador({
  modulo,
  totalOperacion,
  abonoPrevioOperacion = 0,
  modalidadVenta = "TOTAL",
  onModalidadVentaChange,
  permiteCreditoCartera = false,
  cupoDisponibleCliente = 0,
  montoOperacionHoyInput,
  onMontoOperacionHoyInputChange,
  montoDepositoPactadoInput = "0",
  onMontoDepositoPactadoInputChange,
  depositoAbonadoPrevio = 0,
  cobrarDepositoHoyApartado = false,
  onCobrarDepositoHoyApartadoChange,
  montoDepositoHoyInput,
  onMontoDepositoHoyInputChange,
  metodoOperacion = "EFECTIVO",
  onMetodoOperacionChange,
  metodoDeposito = "EFECTIVO",
  onMetodoDepositoChange,
  referenciaOperacion = "",
  onReferenciaOperacionChange,
  onResultadoChange,
  onConfirmarEnter,
}: PanelLiquidacionMostradorProps) {
  const manejaDeposito = modulo === "ALQUILERES" || modulo === "APARTADOS";

  // Estado local de modo mixto opcional para el rubro comercial
  const [modoMixtoActivo, setModoMixtoActivo] = useState(false);
  const [tramosMixtos, setTramosMixtos] = useState<PagoAplicado[]>([]);
  const [metodoTramoNuevo, setMetodoTramoNuevo] = useState<MetodoPagoValido>("EFECTIVO");
  const [montoTramoNuevo, setMontoTramoNuevo] = useState<string>("");
  const [refTramoNuevo, setRefTramoNuevo] = useState<string>("");

  // Unico input de billetes fisicos recibidos en mano
  const [billetesRecibidosStr, setBilletesRecibidosStr] = useState<string>("");
  const inputBilletesRef = useRef<HTMLInputElement>(null);

  // Colores de identidad por modulo manteniendo anatomia identica
  const theme = useMemo(() => {
    if (modulo === "ALQUILERES") {
      return {
        ring: "focus:ring-orange-500",
        activeBtn: "bg-orange-600 text-white border-orange-700 shadow-xs",
        softBg: "bg-orange-50/70 border-orange-200",
        accentText: "text-orange-700",
        badge: "bg-orange-100 text-orange-900 border-orange-300",
      };
    }
    if (modulo === "APARTADOS") {
      return {
        ring: "focus:ring-indigo-500",
        activeBtn: "bg-indigo-600 text-white border-indigo-700 shadow-xs",
        softBg: "bg-indigo-50/70 border-indigo-200",
        accentText: "text-indigo-700",
        badge: "bg-indigo-100 text-indigo-900 border-indigo-300",
      };
    }
    return {
      ring: "focus:ring-emerald-500",
      activeBtn: "bg-emerald-600 text-white border-emerald-700 shadow-xs",
      softBg: "bg-emerald-50/70 border-emerald-200",
      accentText: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    };
  }, [modulo]);

  // 1. Calculo de saldo comercial neto exigible en esta operacion
  const saldoOperacionRestante = useMemo(() => {
    return Math.max(0, Math.round((totalOperacion - abonoPrevioOperacion) * 100) / 100);
  }, [totalOperacion, abonoPrevioOperacion]);

  const montoOperacionHoy = useMemo(() => {
    if (modulo === "VENTAS") {
      if (modalidadVenta === "PENDIENTE") return 0;
      if (modalidadVenta === "ADELANTO") {
        const val = Number(montoOperacionHoyInput || 0);
        return Math.max(0, Math.min(saldoOperacionRestante, Math.round(val * 100) / 100));
      }
      return saldoOperacionRestante;
    }
    if (modulo === "APARTADOS") {
      const val = Number(montoOperacionHoyInput || 0);
      return Math.max(0, Math.min(saldoOperacionRestante, Math.round(val * 100) / 100));
    }
    // En ALQUILERES se liquida el 100% del canon restante al retirar las prendas
    return saldoOperacionRestante;
  }, [modulo, modalidadVenta, montoOperacionHoyInput, saldoOperacionRestante]);

  // 2. Calculo del Deposito en Custodia (separado del ingreso tienda)
  const montoDepositoPactado = useMemo(() => {
    if (!manejaDeposito) return 0;
    return Math.max(0, Math.round((Number(montoDepositoPactadoInput) || 0) * 100) / 100);
  }, [manejaDeposito, montoDepositoPactadoInput]);

  const saldoDepositoFaltante = useMemo(() => {
    if (!manejaDeposito) return 0;
    return Math.max(0, Math.round((montoDepositoPactado - depositoAbonadoPrevio) * 100) / 100);
  }, [manejaDeposito, montoDepositoPactado, depositoAbonadoPrevio]);

  const montoDepositoHoy = useMemo(() => {
    if (!manejaDeposito) return 0;
    if (modulo === "ALQUILERES") {
      return saldoDepositoFaltante;
    }
    // En APARTADOS depende de si eligio cobrar hoy en custodia o al retirar
    if (!cobrarDepositoHoyApartado) return 0;
    if (montoDepositoHoyInput !== undefined && montoDepositoHoyInput !== "") {
      const v = Number(montoDepositoHoyInput) || 0;
      return Math.max(0, Math.min(saldoDepositoFaltante, Math.round(v * 100) / 100));
    }
    return saldoDepositoFaltante;
  }, [
    manejaDeposito,
    modulo,
    saldoDepositoFaltante,
    cobrarDepositoHoyApartado,
    montoDepositoHoyInput,
  ]);

  // 3. Pagos comerciales (Modo Simple 1-clic vs Modo Mixto en tramos)
  const sumaTramosMixtos = useMemo(() => {
    return tramosMixtos.reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  }, [tramosMixtos]);

  const faltanteMixtoComercial = useMemo(() => {
    return Math.max(0, Math.round((montoOperacionHoy - sumaTramosMixtos) * 100) / 100);
  }, [montoOperacionHoy, sumaTramosMixtos]);

  const agregarTramoMixto = useCallback(() => {
    const digitado = montoTramoNuevo.trim() === "" ? faltanteMixtoComercial : Number(montoTramoNuevo) || 0;
    const montoReal = Math.min(faltanteMixtoComercial, Math.round(digitado * 100) / 100);
    if (montoReal <= 0) return;

    const nuevo: PagoAplicado = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      metodoPago: metodoTramoNuevo,
      monto: montoReal,
      referencia: refTramoNuevo.trim() || null,
    };
    setTramosMixtos((prev) => [...prev, nuevo]);
    setMontoTramoNuevo("");
    setRefTramoNuevo("");
  }, [montoTramoNuevo, faltanteMixtoComercial, metodoTramoNuevo, refTramoNuevo]);

  const eliminarTramoMixto = (id: string) => {
    setTramosMixtos((prev) => prev.filter((t) => t.id !== id));
  };

  // Si desactiva modo mixto o cambia monto objetivo por debajo de los tramos, limpiar tramos invalidos
  useEffect(() => {
    if (!modoMixtoActivo && tramosMixtos.length > 0) {
      setTramosMixtos([]);
    }
  }, [modoMixtoActivo, tramosMixtos.length]);

  // 4. Consolidacion de Efectivo en Mano vs Digital (Operacion + Custodia)
  const efectivoComercialHoy = useMemo(() => {
    if (montoOperacionHoy <= 0) return 0;
    if (modoMixtoActivo) {
      return tramosMixtos
        .filter((t) => t.metodoPago === "EFECTIVO")
        .reduce((acc, t) => acc + t.monto, 0);
    }
    return metodoOperacion === "EFECTIVO" ? montoOperacionHoy : 0;
  }, [montoOperacionHoy, modoMixtoActivo, tramosMixtos, metodoOperacion]);

  const digitalComercialHoy = useMemo(() => {
    if (montoOperacionHoy <= 0) return 0;
    if (modoMixtoActivo) {
      return tramosMixtos
        .filter((t) => t.metodoPago !== "EFECTIVO")
        .reduce((acc, t) => acc + t.monto, 0);
    }
    return metodoOperacion !== "EFECTIVO" ? montoOperacionHoy : 0;
  }, [montoOperacionHoy, modoMixtoActivo, tramosMixtos, metodoOperacion]);

  const efectivoCustodiaHoy = useMemo(() => {
    if (montoDepositoHoy <= 0) return 0;
    return metodoDeposito === "EFECTIVO" ? montoDepositoHoy : 0;
  }, [montoDepositoHoy, metodoDeposito]);

  const digitalCustodiaHoy = useMemo(() => {
    if (montoDepositoHoy <= 0) return 0;
    return metodoDeposito !== "EFECTIVO" ? montoDepositoHoy : 0;
  }, [montoDepositoHoy, metodoDeposito]);

  const totalTasadoDocumento = useMemo(() => {
    return Math.round((totalOperacion + montoDepositoPactado) * 100) / 100;
  }, [totalOperacion, montoDepositoPactado]);

  const totalRecibirClienteHoy = useMemo(() => {
    return Math.round((montoOperacionHoy + montoDepositoHoy) * 100) / 100;
  }, [montoOperacionHoy, montoDepositoHoy]);

  const efectivoExigibleEnManoHoy = useMemo(() => {
    return Math.round((efectivoComercialHoy + efectivoCustodiaHoy) * 100) / 100;
  }, [efectivoComercialHoy, efectivoCustodiaHoy]);

  const digitalExigibleHoy = useMemo(() => {
    return Math.round((digitalComercialHoy + digitalCustodiaHoy) * 100) / 100;
  }, [digitalComercialHoy, digitalCustodiaHoy]);

  // 5. Calculo unificado de Billetes Recibidos y Vueltas (CERO cuentas mentales)
  const billetesDigitadosNum = Number(billetesRecibidosStr) || 0;
  const usaPagoExactoAutomatico = billetesRecibidosStr.trim() === "";

  const billetesRecibidosEfectivos = useMemo(() => {
    if (efectivoExigibleEnManoHoy <= 0) return 0;
    if (usaPagoExactoAutomatico) return efectivoExigibleEnManoHoy;
    return billetesDigitadosNum;
  }, [efectivoExigibleEnManoHoy, usaPagoExactoAutomatico, billetesDigitadosNum]);

  const vueltasEntregarCliente = useMemo(() => {
    if (efectivoExigibleEnManoHoy <= 0) return 0;
    if (billetesRecibidosEfectivos > efectivoExigibleEnManoHoy) {
      return Math.round((billetesRecibidosEfectivos - efectivoExigibleEnManoHoy) * 100) / 100;
    }
    return 0;
  }, [efectivoExigibleEnManoHoy, billetesRecibidosEfectivos]);

  const efectivoInsuficiente =
    efectivoExigibleEnManoHoy > 0 &&
    !usaPagoExactoAutomatico &&
    billetesDigitadosNum < efectivoExigibleEnManoHoy;

  // 6. Validacion integral y construccion de lista PagoAplicado comercial
  const resultadoConsolidado: ResultadoLiquidacionMostrador = useMemo(() => {
    let motivoBloqueo: string | null = null;

    if (modulo === "VENTAS" && modalidadVenta === "ADELANTO" && montoOperacionHoy <= 0) {
      motivoBloqueo = "Indique el valor del abono inicial a cobrar hoy.";
    } else if (modulo === "APARTADOS" && montoOperacionHoy <= 0 && montoDepositoHoy <= 0) {
      motivoBloqueo = "El apartado requiere registrar un abono inicial mayor a $0.";
    } else if (modoMixtoActivo && faltanteMixtoComercial > 0) {
      motivoBloqueo = `Falta asignar $${faltanteMixtoComercial.toLocaleString("es-CO")} en el pago dividido.`;
    } else if (efectivoInsuficiente) {
      const falta = efectivoExigibleEnManoHoy - billetesDigitadosNum;
      motivoBloqueo = `Faltan $${falta.toLocaleString("es-CO")} en billetes recibidos para cubrir el efectivo total.`;
    }

    let pagosComerciales: PagoAplicado[] = [];
    if (montoOperacionHoy > 0) {
      if (modoMixtoActivo) {
        pagosComerciales = tramosMixtos.map((t, idx) => ({
          ...t,
          montoRecibido: t.metodoPago === "EFECTIVO" && idx === 0 ? billetesRecibidosEfectivos : null,
          vueltasEntregadas: t.metodoPago === "EFECTIVO" && idx === 0 ? vueltasEntregarCliente : null,
        }));
      } else {
        pagosComerciales = [
          {
            id: "pago-comercial-unico",
            metodoPago: metodoOperacion,
            monto: montoOperacionHoy,
            montoRecibido: metodoOperacion === "EFECTIVO" ? billetesRecibidosEfectivos : null,
            vueltasEntregadas: metodoOperacion === "EFECTIVO" ? vueltasEntregarCliente : null,
            referencia: referenciaOperacion.trim() || null,
          },
        ];
      }
    }

    const metodoPrincipalResuelto: MetodoPagoValido =
      modoMixtoActivo && tramosMixtos.length > 0
        ? (tramosMixtos[0].metodoPago as MetodoPagoValido)
        : metodoOperacion;

    return {
      totalOperacion,
      montoDepositoPactado,
      totalTasadoDocumento,
      montoOperacionHoy,
      montoDepositoHoy,
      totalRecibirClienteHoy,
      efectivoExigibleEnManoHoy,
      digitalExigibleHoy,
      billetesRecibidosCliente: billetesRecibidosEfectivos,
      vueltasEntregarCliente,
      metodoPrincipalOperacion: metodoPrincipalResuelto,
      metodoDeposito,
      pagosComerciales,
      esValido: motivoBloqueo === null,
      motivoBloqueo,
    };
  }, [
    modulo,
    modalidadVenta,
    montoOperacionHoy,
    montoDepositoHoy,
    modoMixtoActivo,
    faltanteMixtoComercial,
    efectivoInsuficiente,
    efectivoExigibleEnManoHoy,
    billetesDigitadosNum,
    tramosMixtos,
    metodoOperacion,
    billetesRecibidosEfectivos,
    vueltasEntregarCliente,
    referenciaOperacion,
    totalOperacion,
    montoDepositoPactado,
    totalTasadoDocumento,
    totalRecibirClienteHoy,
    digitalExigibleHoy,
    metodoDeposito,
  ]);

  useEffect(() => {
    if (onResultadoChange) {
      onResultadoChange(resultadoConsolidado);
    }
  }, [resultadoConsolidado, onResultadoChange]);

  // Atajos rapidos F5 / F6 / F7 homologados en los 3 modulos
  useEffect(() => {
    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === "F5" || (e.altKey && e.key === "1")) {
        e.preventDefault();
        onMetodoOperacionChange?.("EFECTIVO");
        inputBilletesRef.current?.focus();
      } else if (e.key === "F6" || (e.altKey && e.key === "2")) {
        e.preventDefault();
        onMetodoOperacionChange?.("BANCOLOMBIA");
      } else if (e.key === "F7" || (e.altKey && e.key === "3")) {
        e.preventDefault();
        onMetodoOperacionChange?.("NEQUI");
      }
    };
    window.addEventListener("keydown", manejarTeclado);
    return () => window.removeEventListener("keydown", manejarTeclado);
  }, [onMetodoOperacionChange]);

  const renderSelectorMetodos = (
    seleccionado: MetodoPagoValido,
    onSelect: (m: MetodoPagoValido) => void,
    etiquetaAtajos: boolean
  ) => {
    const esSecundarioActivo = METODOS_SECUNDARIOS.includes(seleccionado);
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {METODOS_PRINCIPALES.map((idMetodo, idx) => {
          const info = METODOS_PAGO_CATALOGO.find((m) => m.id === idMetodo)!;
          const Icono = info.icono;
          const activo = seleccionado === idMetodo;
          const tecla = idx === 0 ? "F5" : idx === 1 ? "F6" : "F7";
          return (
            <button
              key={idMetodo}
              type="button"
              onClick={() => onSelect(idMetodo)}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                activo
                  ? theme.activeBtn
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icono className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{info.nombre}</span>
              {etiquetaAtajos && (
                <span className={`text-[10px] px-1 rounded ${activo ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {tecla}
                </span>
              )}
            </button>
          );
        })}

        <select
          value={esSecundarioActivo ? seleccionado : ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value as MetodoPagoValido);
          }}
          className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition outline-none ${
            esSecundarioActivo
              ? theme.activeBtn
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <option value="" className="text-slate-700 bg-white">
            Otros medios...
          </option>
          {METODOS_SECUNDARIOS.map((idSec) => {
            const info = METODOS_PAGO_CATALOGO.find((m) => m.id === idSec)!;
            return (
              <option key={idSec} value={idSec} className="text-slate-800 bg-white">
                {info.nombre}
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  const tituloRubroComercial =
    modulo === "VENTAS"
      ? "1. Cobro de Venta (Ingreso Tienda)"
      : modulo === "ALQUILERES"
      ? "1. Canon de Alquiler (Ingreso Tienda)"
      : "1. Abono de Reserva Hoy (Ingreso Tienda)";

  return (
    <div className="space-y-3">
      {/* BLOQUE SUPERIOR: RUBRO COMERCIAL + RUBRO DEPOSITO EN CUSTODIA */}
      <div className={`grid grid-cols-1 ${manejaDeposito ? "xl:grid-cols-2" : ""} gap-3`}>
        {/* TARJETA A: RUBRO COMERCIAL (INGRESO TIENDA) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 ${theme.accentText}`} />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900">
                {tituloRubroComercial}
              </h3>
            </div>
            {montoOperacionHoy > 0 && (
              <button
                type="button"
                onClick={() => setModoMixtoActivo((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                  modoMixtoActivo
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Split className="w-3 h-3" />
                {modoMixtoActivo ? "Pago Único" : "Dividir Pago"}
              </button>
            )}
          </div>

          {/* Modalidad exclusiva de Ventas: Pago Total | Abono Inicial | Credito Cartera */}
          {modulo === "VENTAS" && onModalidadVentaChange && (
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onModalidadVentaChange("TOTAL")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                  modalidadVenta === "TOTAL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pago Total
              </button>
              <button
                type="button"
                disabled={!permiteCreditoCartera}
                onClick={() => onModalidadVentaChange("ADELANTO")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                  modalidadVenta === "ADELANTO" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Abono Inicial
              </button>
              <button
                type="button"
                disabled={!permiteCreditoCartera}
                onClick={() => onModalidadVentaChange("PENDIENTE")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                  modalidadVenta === "PENDIENTE" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Crédito Cartera
              </button>
            </div>
          )}

          {/* Resumen o Input del monto comercial de hoy */}
          {modulo === "APARTADOS" || (modulo === "VENTAS" && modalidadVenta === "ADELANTO") ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  {modulo === "APARTADOS" ? "Valor Total Prendas:" : "Total Venta:"}{" "}
                  <strong className="text-slate-900">${totalOperacion.toLocaleString("es-CO")}</strong>
                </span>
                <span className="font-semibold">
                  Queda pendiente:{" "}
                  <strong className="text-rose-600">
                    ${Math.max(0, saldoOperacionRestante - montoOperacionHoy).toLocaleString("es-CO")}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputDinero
                    value={montoOperacionHoyInput ?? ""}
                    onChange={(e) => onMontoOperacionHoyInputChange?.(e.target.value)}
                    mostrarPrefijo
                    placeholder="Abono a recibir hoy"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-base text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {CHIPS_ABONO_RESERVA.filter((c) => c <= saldoOperacionRestante).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onMontoOperacionHoyInputChange?.(String(chip))}
                      className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700"
                    >
                      ${chip / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onMontoOperacionHoyInputChange?.(String(saldoOperacionRestante))}
                    className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-800"
                  >
                    100%
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${theme.softBg}`}>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-600 block">
                  {modulo === "VENTAS" && modalidadVenta === "PENDIENTE"
                    ? `Cargo a Cartera (Cupo disp: $${cupoDisponibleCliente.toLocaleString("es-CO")})`
                    : abonoPrevioOperacion > 0
                    ? `Canon $${totalOperacion.toLocaleString("es-CO")} - Abonado $${abonoPrevioOperacion.toLocaleString("es-CO")}`
                    : "Valor Neto a Cobrar"}
                </span>
              </div>
              <span className="text-lg font-black text-slate-900">
                ${(modulo === "VENTAS" && modalidadVenta === "PENDIENTE" ? totalOperacion : montoOperacionHoy).toLocaleString("es-CO")}
              </span>
            </div>
          )}

          {/* Selector de Metodo Comercial (Simple vs Mixto) */}
          {montoOperacionHoy > 0 && !modoMixtoActivo && (
            <div className="space-y-2">
              {renderSelectorMetodos(
                metodoOperacion,
                (m) => onMetodoOperacionChange?.(m),
                true
              )}
              {metodoOperacion !== "EFECTIVO" && onReferenciaOperacionChange && (
                <input
                  type="text"
                  value={referenciaOperacion}
                  onChange={(e) => onReferenciaOperacionChange(e.target.value)}
                  placeholder={`Referencia / comprobante ${metodoOperacion} (opcional)`}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              )}
            </div>
          )}

          {/* Desglose Mixto cuando el cajero activa "Dividir Pago" */}
          {montoOperacionHoy > 0 && modoMixtoActivo && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              {faltanteMixtoComercial > 0 && (
                <div className="space-y-2">
                  {renderSelectorMetodos(metodoTramoNuevo, setMetodoTramoNuevo, false)}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputDinero
                        value={montoTramoNuevo}
                        onChange={(e) => setMontoTramoNuevo(e.target.value)}
                        mostrarPrefijo
                        placeholder={`Faltan $${faltanteMixtoComercial.toLocaleString("es-CO")}`}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={agregarTramoMixto}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aplicar
                    </button>
                  </div>
                </div>
              )}

              {tramosMixtos.length > 0 && (
                <div className="space-y-1 pt-1">
                  {tramosMixtos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-slate-700">{t.metodoPago}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">${t.monto.toLocaleString("es-CO")}</span>
                        <button
                          type="button"
                          onClick={() => eliminarTramoMixto(t.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TARJETA B: DEPOSITO EN CUSTODIA (SEPARADO DEL INGRESO TIENDA — SOLO ALQUILERES Y APARTADOS) */}
        {manejaDeposito && (
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-amber-950">
                  2. Depósito en Custodia (Garantía)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                No es ingreso tienda
              </span>
            </div>

            {/* Valor pactado del deposito + chips rapidos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-amber-900">
                <span className="font-semibold">Garantía pactada del contrato:</span>
                {depositoAbonadoPrevio > 0 && (
                  <span className="font-bold text-emerald-700">
                    Ya en custodia: ${depositoAbonadoPrevio.toLocaleString("es-CO")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputDinero
                    value={montoDepositoPactadoInput}
                    onChange={(e) => onMontoDepositoPactadoInputChange?.(e.target.value)}
                    permitirCeroVacio
                    mostrarPrefijo
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 font-black text-base text-amber-950 bg-white"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {CHIPS_DEPOSITO.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onMontoDepositoPactadoInputChange?.(String(chip))}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition ${
                        montoDepositoPactado === chip
                          ? "bg-amber-600 text-white border-amber-700"
                          : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {chip === 0 ? "$0" : `$${chip / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* En Apartados: decidir si el deposito se cobra el dia del retiro ($0 hoy) o hoy */}
            {modulo === "APARTADOS" && saldoDepositoFaltante > 0 && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-amber-100/70 rounded-xl border border-amber-200">
                <button
                  type="button"
                  onClick={() => {
                    onCobrarDepositoHoyApartadoChange?.(false);
                    onMontoDepositoHoyInputChange?.("0");
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                    !cobrarDepositoHoyApartado
                      ? "bg-white text-amber-950 shadow-2xs"
                      : "text-amber-800 hover:text-amber-950"
                  }`}
                >
                  Cobrar al Retirar ($0 hoy)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCobrarDepositoHoyApartadoChange?.(true);
                    onMontoDepositoHoyInputChange?.(String(saldoDepositoFaltante));
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                    cobrarDepositoHoyApartado
                      ? "bg-white text-amber-950 shadow-2xs"
                      : "text-amber-800 hover:text-amber-950"
                  }`}
                >
                  Recibir Hoy (${saldoDepositoFaltante.toLocaleString("es-CO")})
                </button>
              </div>
            )}

            {/* Selector de medio del deposito si se recibe dinero en custodia hoy */}
            {montoDepositoHoy > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Medio en que entrega la custodia hoy:</span>
                  <span>${montoDepositoHoy.toLocaleString("es-CO")}</span>
                </div>
                {renderSelectorMetodos(
                  metodoDeposito,
                  (m) => onMetodoDepositoChange?.(m),
                  false
                )}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-white/80 border border-amber-200 text-xs font-semibold text-amber-900">
                {montoDepositoPactado === 0
                  ? "Contrato sin depósito en garantía ($0)."
                  : modulo === "APARTADOS"
                  ? `Queda estipulado por $${saldoDepositoFaltante.toLocaleString("es-CO")} para cobrar al entregar las prendas.`
                  : "Depósito ya cubierto previamente."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BLOQUE INFERIOR UNIFICADO: TASACION TOTAL Y CALCULADORA UNICA DE BILLETES RECIBIDOS */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm space-y-3">
        {/* Fila 1: Tasacion completa del documento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10.5px] font-bold uppercase text-slate-400 block">
              {modulo === "VENTAS" ? "Valor Venta" : "Valor Alquiler"}
            </span>
            <span className="text-sm sm:text-base font-black text-white">
              ${totalOperacion.toLocaleString("es-CO")}
            </span>
          </div>

          {manejaDeposito && (
            <div>
              <span className="text-[10.5px] font-bold uppercase text-amber-400 block">
                + Custodia Garantía
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300">
                ${montoDepositoPactado.toLocaleString("es-CO")}
              </span>
            </div>
          )}

          <div>
            <span className="text-[10.5px] font-bold uppercase text-sky-400 block">
              = Total Tasado Doc.
            </span>
            <span className="text-sm sm:text-base font-black text-sky-300">
              ${totalTasadoDocumento.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl px-3 py-1.5 border border-slate-700">
            <span className="text-[10.5px] font-bold uppercase text-emerald-400 block">
              Total a Recibir Hoy
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-300">
              ${totalRecibirClienteHoy.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Fila 2: Ventanilla unica de Efectivo Fisico y Vueltas (evita partir billetes mentalmente) */}
        {efectivoExigibleEnManoHoy > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-4 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Efectivo en mano hoy:</span>
                <strong className="text-white text-sm">
                  ${efectivoExigibleEnManoHoy.toLocaleString("es-CO")}
                </strong>
              </div>
              {manejaDeposito && efectivoCustodiaHoy > 0 && efectivoComercialHoy > 0 && (
                <p className="text-[11px] text-slate-400">
                  Separa en gaveta: ${efectivoComercialHoy.toLocaleString("es-CO")} Tienda + $
                  {efectivoCustodiaHoy.toLocaleString("es-CO")} Custodia
                </p>
              )}
              {digitalExigibleHoy > 0 && (
                <p className="text-[11px] text-sky-300">
                  + ${digitalExigibleHoy.toLocaleString("es-CO")} por transferencia digital
                </p>
              )}
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <InputDinero
                  ref={inputBilletesRef}
                  value={billetesRecibidosStr}
                  onChange={(e) => setBilletesRecibidosStr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && resultadoConsolidado.esValido && onConfirmarEnter) {
                      e.preventDefault();
                      onConfirmarEnter();
                    }
                  }}
                  mostrarPrefijo
                  clasePrefijo="text-slate-400 font-black text-sm"
                  placeholder={`Exacto ($${efectivoExigibleEnManoHoy.toLocaleString("es-CO")})`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-white font-black text-base focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBilletesRecibidosStr("")}
                  className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition ${
                    usaPagoExactoAutomatico
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  Exacto
                </button>
                {DENOMINACIONES_RAPIDAS.filter((d) => d >= efectivoExigibleEnManoHoy).map((den) => (
                  <button
                    key={den}
                    type="button"
                    onClick={() => setBilletesRecibidosStr(String(den))}
                    className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition ${
                      billetesDigitadosNum === den && !usaPagoExactoAutomatico
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    ${den / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              {efectivoInsuficiente ? (
                <div className="px-3 py-2 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase">Falta Efectivo</span>
                  <span className="text-sm font-black">
                    ${(efectivoExigibleEnManoHoy - billetesDigitadosNum).toLocaleString("es-CO")}
                  </span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    Vueltas
                  </span>
                  <span className="text-base font-black text-emerald-300">
                    ${vueltasEntregarCliente.toLocaleString("es-CO")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {totalRecibirClienteHoy === 0
                ? "Operación sin recaudo en efectivo inmediato ($0 hoy)."
                : `Cobro 100% digital por $${digitalExigibleHoy.toLocaleString("es-CO")} (sin cambio en efectivo).`}
            </span>
          </div>
        )}

        {resultadoConsolidado.motivoBloqueo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{resultadoConsolidado.motivoBloqueo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
