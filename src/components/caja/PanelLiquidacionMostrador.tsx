"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Banknote,
  CreditCard,
  ShieldCheck,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Split,
  Wallet,
  Check,
  ChevronDown,
} from "lucide-react";
import InputDinero from "@/components/ui/InputDinero";
import { PagoAplicado, METODOS_PAGO_CATALOGO, OTROS_METODOS_CATALOGO } from "@/components/caja/PanelPagosSecuenciales";

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
  efectivoRecibidoOperacion: number;
  vueltasOperacion: number;
  efectivoRecibidoCustodia: number;
  vueltasCustodia: number;
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
  modalidadVenta?: ModalidadVentaCobro;
  onModalidadVentaChange?: (modalidad: ModalidadVentaCobro) => void;
  permiteCreditoCartera?: boolean;
  cupoDisponibleCliente?: number;
  montoOperacionHoyInput?: string;
  onMontoOperacionHoyInputChange?: (valor: string) => void;
  montoDepositoPactadoInput?: string;
  onMontoDepositoPactadoInputChange?: (valor: string) => void;
  depositoAbonadoPrevio?: number;
  cobrarDepositoHoyApartado?: boolean;
  onCobrarDepositoHoyApartadoChange?: (cobrarHoy: boolean) => void;
  montoDepositoHoyInput?: string;
  onMontoDepositoHoyInputChange?: (valor: string) => void;
  metodoOperacion?: MetodoPagoValido;
  onMetodoOperacionChange?: (metodo: MetodoPagoValido) => void;
  metodoDeposito?: MetodoPagoValido;
  onMetodoDepositoChange?: (metodo: MetodoPagoValido) => void;
  referenciaOperacion?: string;
  onReferenciaOperacionChange?: (ref: string) => void;
  onResultadoChange?: (resultado: ResultadoLiquidacionMostrador) => void;
  onConfirmarEnter?: () => void;
}

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

  // Entradas independientes de efectivo recibido (Operacion Tienda vs Custodia Garantia)
  const [efectivoOperacionStr, setEfectivoOperacionStr] = useState<string>("");
  const [efectivoCustodiaStr, setEfectivoCustodiaStr] = useState<string>("");

  const inputEfectivoOperacionRef = useRef<HTMLInputElement>(null);
  const inputEfectivoCustodiaRef = useRef<HTMLInputElement>(null);

  // Colorimetria estandar oficial del sistema por modulo:
  // VENTAS = Esmeralda | ALQUILERES = Naranja | APARTADOS = Indigo | CUSTODIA = Ambar
  const theme = useMemo(() => {
    if (modulo === "ALQUILERES") {
      return {
        cardBorder: "border-orange-200",
        headerIcon: "text-orange-600",
        softBg: "bg-orange-50/70 border-orange-200",
        inputBorder: "border-orange-300 focus:ring-orange-500",
        activeBtn: "bg-orange-600 hover:bg-orange-700 text-white border-orange-700 shadow-xs",
        exactoBtn: "bg-orange-600 hover:bg-orange-700 text-white border-orange-700",
        accentText: "text-orange-700",
        accentDark: "text-orange-950",
        summarySurface: "bg-orange-50/80 border-orange-200 text-orange-950",
        summaryDivider: "border-orange-200/80",
        summaryHighlight: "bg-white border-orange-300 text-orange-950",
        summaryLabel: "text-orange-800",
        summaryValue: "text-orange-700",
      };
    }
    if (modulo === "APARTADOS") {
      return {
        cardBorder: "border-indigo-200",
        headerIcon: "text-indigo-600",
        softBg: "bg-indigo-50/70 border-indigo-200",
        inputBorder: "border-indigo-300 focus:ring-indigo-500",
        activeBtn: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-xs",
        exactoBtn: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700",
        accentText: "text-indigo-700",
        accentDark: "text-indigo-950",
        summarySurface: "bg-indigo-50/80 border-indigo-200 text-indigo-950",
        summaryDivider: "border-indigo-200/80",
        summaryHighlight: "bg-white border-indigo-300 text-indigo-950",
        summaryLabel: "text-indigo-800",
        summaryValue: "text-indigo-700",
      };
    }
    return {
      cardBorder: "border-emerald-200",
      headerIcon: "text-emerald-600",
      softBg: "bg-emerald-50/70 border-emerald-200",
      inputBorder: "border-emerald-300 focus:ring-emerald-500",
      activeBtn: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs",
      exactoBtn: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
      accentText: "text-emerald-700",
      accentDark: "text-emerald-950",
      summarySurface: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
      summaryDivider: "border-emerald-200/80",
      summaryHighlight: "bg-white border-emerald-300 text-emerald-950",
      summaryLabel: "text-emerald-800",
      summaryValue: "text-emerald-700",
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

  // 3. Pagos comerciales (Modo Simple vs Modo Dividido)
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

    const vueltasTramo =
      metodoTramoNuevo === "EFECTIVO" && digitado > montoReal
        ? Math.round((digitado - montoReal) * 100) / 100
        : 0;

    const nuevo: PagoAplicado = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      metodoPago: metodoTramoNuevo,
      monto: montoReal,
      montoRecibido: metodoTramoNuevo === "EFECTIVO" ? Math.max(montoReal, digitado) : null,
      vueltasEntregadas: metodoTramoNuevo === "EFECTIVO" ? vueltasTramo : null,
      referencia: refTramoNuevo.trim() || null,
    };
    setTramosMixtos((prev) => [...prev, nuevo]);
    setMontoTramoNuevo("");
    setRefTramoNuevo("");
  }, [montoTramoNuevo, faltanteMixtoComercial, metodoTramoNuevo, refTramoNuevo]);

  const eliminarTramoMixto = (id: string) => {
    setTramosMixtos((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!modoMixtoActivo && tramosMixtos.length > 0) {
      setTramosMixtos([]);
    }
  }, [modoMixtoActivo, tramosMixtos.length]);

  // 4. Efectivo y Vueltas POR SEPARADO (Operacion vs Custodia)
  const efectivoComercialExigibleHoy = useMemo(() => {
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

  const efectivoCustodiaExigibleHoy = useMemo(() => {
    if (montoDepositoHoy <= 0) return 0;
    return metodoDeposito === "EFECTIVO" ? montoDepositoHoy : 0;
  }, [montoDepositoHoy, metodoDeposito]);

  const digitalCustodiaHoy = useMemo(() => {
    if (montoDepositoHoy <= 0) return 0;
    return metodoDeposito !== "EFECTIVO" ? montoDepositoHoy : 0;
  }, [montoDepositoHoy, metodoDeposito]);

  // Recibido en Operacion
  const efectivoOperacionNum = useMemo(() => {
    if (modoMixtoActivo) {
      return tramosMixtos
        .filter((t) => t.metodoPago === "EFECTIVO")
        .reduce((acc, t) => acc + (Number(t.montoRecibido ?? t.monto) || 0), 0);
    }
    if (metodoOperacion !== "EFECTIVO") return montoOperacionHoy;
    if (efectivoOperacionStr.trim() === "") return 0;
    return Math.max(0, Number(efectivoOperacionStr) || 0);
  }, [modoMixtoActivo, tramosMixtos, metodoOperacion, montoOperacionHoy, efectivoOperacionStr]);

  const vueltasOperacion = useMemo(() => {
    if (modoMixtoActivo) {
      return tramosMixtos.reduce((acc, t) => acc + (Number(t.vueltasEntregadas) || 0), 0);
    }
    if (metodoOperacion === "EFECTIVO" && montoOperacionHoy > 0 && efectivoOperacionNum > montoOperacionHoy) {
      return Math.round((efectivoOperacionNum - montoOperacionHoy) * 100) / 100;
    }
    return 0;
  }, [modoMixtoActivo, tramosMixtos, metodoOperacion, montoOperacionHoy, efectivoOperacionNum]);

  const faltaEfectivoOperacion =
    !modoMixtoActivo &&
    metodoOperacion === "EFECTIVO" &&
    montoOperacionHoy > 0 &&
    efectivoOperacionNum < montoOperacionHoy;

  // Recibido en Custodia (independiente de la operacion)
  const efectivoCustodiaNum = useMemo(() => {
    if (montoDepositoHoy <= 0) return 0;
    if (metodoDeposito !== "EFECTIVO") return montoDepositoHoy;
    if (efectivoCustodiaStr.trim() === "") return 0;
    return Math.max(0, Number(efectivoCustodiaStr) || 0);
  }, [montoDepositoHoy, metodoDeposito, efectivoCustodiaStr]);

  const vueltasCustodia = useMemo(() => {
    if (metodoDeposito === "EFECTIVO" && montoDepositoHoy > 0 && efectivoCustodiaNum > montoDepositoHoy) {
      return Math.round((efectivoCustodiaNum - montoDepositoHoy) * 100) / 100;
    }
    return 0;
  }, [metodoDeposito, montoDepositoHoy, efectivoCustodiaNum]);

  const faltaEfectivoCustodia =
    metodoDeposito === "EFECTIVO" &&
    montoDepositoHoy > 0 &&
    efectivoCustodiaNum < montoDepositoHoy;

  // 5. Tasacion final sumada del documento
  const totalTasadoDocumento = useMemo(() => {
    return Math.round((totalOperacion + montoDepositoPactado) * 100) / 100;
  }, [totalOperacion, montoDepositoPactado]);

  const totalRecibirClienteHoy = useMemo(() => {
    return Math.round((montoOperacionHoy + montoDepositoHoy) * 100) / 100;
  }, [montoOperacionHoy, montoDepositoHoy]);

  const efectivoExigibleEnManoHoy = useMemo(() => {
    return Math.round((efectivoComercialExigibleHoy + efectivoCustodiaExigibleHoy) * 100) / 100;
  }, [efectivoComercialExigibleHoy, efectivoCustodiaExigibleHoy]);

  const digitalExigibleHoy = useMemo(() => {
    return Math.round((digitalComercialHoy + digitalCustodiaHoy) * 100) / 100;
  }, [digitalComercialHoy, digitalCustodiaHoy]);

  const billetesRecibidosTotales = useMemo(() => {
    const efOp = metodoOperacion === "EFECTIVO" || modoMixtoActivo
      ? (modoMixtoActivo ? efectivoOperacionNum : (metodoOperacion === "EFECTIVO" ? efectivoOperacionNum : 0))
      : 0;
    const efDep = metodoDeposito === "EFECTIVO" ? efectivoCustodiaNum : 0;
    return Math.round((efOp + efDep) * 100) / 100;
  }, [metodoOperacion, modoMixtoActivo, efectivoOperacionNum, metodoDeposito, efectivoCustodiaNum]);

  const vueltasEntregarTotales = useMemo(() => {
    return Math.round((vueltasOperacion + vueltasCustodia) * 100) / 100;
  }, [vueltasOperacion, vueltasCustodia]);

  // 6. Resultado consolidado y validacion
  const resultadoConsolidado: ResultadoLiquidacionMostrador = useMemo(() => {
    let motivoBloqueo: string | null = null;

    if (modulo === "VENTAS" && modalidadVenta === "ADELANTO" && montoOperacionHoy <= 0) {
      motivoBloqueo = "Indique el valor del abono inicial a cobrar hoy.";
    } else if (modulo === "APARTADOS" && montoOperacionHoy <= 0 && montoDepositoHoy <= 0) {
      motivoBloqueo = "Ingrese un abono inicial mayor a $0 para registrar el apartado.";
    } else if (modoMixtoActivo && faltanteMixtoComercial > 0) {
      motivoBloqueo = `Falta asignar $${faltanteMixtoComercial.toLocaleString("es-CO")} en el pago dividido.`;
    } else if (faltaEfectivoOperacion) {
      const faltaOp = montoOperacionHoy - efectivoOperacionNum;
      motivoBloqueo = `Ingrese el efectivo recibido de ${modulo === "ALQUILERES" ? "alquiler" : "reserva"} (faltan $${faltaOp.toLocaleString("es-CO")}) o pulse Exacto.`;
    } else if (faltaEfectivoCustodia) {
      const faltaDep = montoDepositoHoy - efectivoCustodiaNum;
      motivoBloqueo = `Ingrese el efectivo recibido del depósito en custodia (faltan $${faltaDep.toLocaleString("es-CO")}) o pulse Exacto.`;
    }

    let pagosComerciales: PagoAplicado[] = [];
    if (montoOperacionHoy > 0) {
      if (modoMixtoActivo) {
        pagosComerciales = tramosMixtos;
      } else {
        pagosComerciales = [
          {
            id: "pago-comercial-unico",
            metodoPago: metodoOperacion,
            monto: montoOperacionHoy,
            montoRecibido: metodoOperacion === "EFECTIVO" ? efectivoOperacionNum : null,
            vueltasEntregadas: metodoOperacion === "EFECTIVO" ? vueltasOperacion : null,
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
      efectivoRecibidoOperacion: efectivoOperacionNum,
      vueltasOperacion,
      efectivoRecibidoCustodia: efectivoCustodiaNum,
      vueltasCustodia,
      billetesRecibidosCliente: billetesRecibidosTotales,
      vueltasEntregarCliente: vueltasEntregarTotales,
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
    faltaEfectivoOperacion,
    faltaEfectivoCustodia,
    efectivoOperacionNum,
    efectivoCustodiaNum,
    tramosMixtos,
    metodoOperacion,
    vueltasOperacion,
    vueltasCustodia,
    referenciaOperacion,
    totalOperacion,
    montoDepositoPactado,
    totalTasadoDocumento,
    totalRecibirClienteHoy,
    efectivoExigibleEnManoHoy,
    digitalExigibleHoy,
    billetesRecibidosTotales,
    vueltasEntregarTotales,
    metodoDeposito,
  ]);

  useEffect(() => {
    if (onResultadoChange) {
      onResultadoChange(resultadoConsolidado);
    }
  }, [resultadoConsolidado, onResultadoChange]);

  // Atajos rapidos F5 / F6 / F7 homologados sin provocar auto-scroll brusco
  useEffect(() => {
    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === "F5" || (e.altKey && e.key === "1")) {
        e.preventDefault();
        onMetodoOperacionChange?.("EFECTIVO");
        inputEfectivoOperacionRef.current?.focus({ preventScroll: true });
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

  // Selector de 3 columnas amplias (Efectivo | Bancolombia | Otros Medios) con color propio del bloque
  const renderSelectorMetodos = (
    seleccionado: MetodoPagoValido,
    onSelect: (m: MetodoPagoValido) => void,
    claseActivo: string
  ) => {
    const esOtroMedio = seleccionado !== "EFECTIVO" && seleccionado !== "BANCOLOMBIA";
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelect("EFECTIVO")}
          className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer w-full whitespace-nowrap ${
            seleccionado === "EFECTIVO"
              ? claseActivo
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Banknote className="w-4 h-4 shrink-0" />
          <span>Efectivo</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("BANCOLOMBIA")}
          className={`py-2 px-3 rounded-xl text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer w-full whitespace-nowrap ${
            seleccionado === "BANCOLOMBIA"
              ? claseActivo
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/iconos/bancolombia-logo.png"
              alt=""
              className={`w-3.5 h-3.5 object-contain ${
                seleccionado === "BANCOLOMBIA" ? "brightness-0 invert" : ""
              }`}
            />
          </span>
          <span>Bancolombia</span>
        </button>

        <div className="relative">
          <div
            className={`relative flex items-center rounded-xl border transition cursor-pointer w-full ${
              esOtroMedio
                ? claseActivo
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="pl-2.5 py-2 flex items-center pointer-events-none">
              <CreditCard className="w-4 h-4 shrink-0" />
            </div>
            <select
              value={esOtroMedio ? seleccionado : ""}
              onChange={(e) => {
                if (e.target.value) onSelect(e.target.value as MetodoPagoValido);
              }}
              className={`w-full py-2 pl-1.5 pr-7 text-xs font-bold bg-transparent outline-none cursor-pointer appearance-none ${
                esOtroMedio ? "text-white font-black" : "text-slate-700"
              }`}
            >
              <option value="" disabled className="text-slate-800 bg-white">
                Otros Medios
              </option>
              {OTROS_METODOS_CATALOGO.map((om) => (
                <option key={om.id} value={om.id} className="text-slate-800 bg-white">
                  {om.alias}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-75" />
          </div>
        </div>
      </div>
    );
  };

  const tituloRubroComercial =
    modulo === "VENTAS"
      ? "1. Cobro de Venta"
      : modulo === "ALQUILERES"
      ? "1. Cobro de Alquiler"
      : "1. Abono de Apartado Hoy";

  return (
    <div className="space-y-3">
      {/* BLOQUE SUPERIOR: OPERACION COMERCIAL + DEPOSITO EN CUSTODIA POR SEPARADO */}
      <div className={`grid grid-cols-1 ${manejaDeposito ? "xl:grid-cols-2" : ""} gap-3`}>
        {/* TARJETA 1: OPERACION PRINCIPAL (COLORIMETRIA DEL MODULO) */}
        <div className={`bg-white rounded-2xl border ${theme.cardBorder} p-4 shadow-2xs space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 shrink-0 ${theme.headerIcon}`} />
              <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${theme.accentDark}`}>
                {tituloRubroComercial}
              </h3>
            </div>
            {montoOperacionHoy > 0 && (
              <button
                type="button"
                onClick={() => setModoMixtoActivo((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  modoMixtoActivo
                    ? theme.activeBtn
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Split className="w-3 h-3" />
                <span>{modoMixtoActivo ? "Pago Único" : "Dividir Pago"}</span>
              </button>
            )}
          </div>

          {/* Modalidad exclusiva de Ventas */}
          {modulo === "VENTAS" && onModalidadVentaChange && (
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onModalidadVentaChange("TOTAL")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                  modalidadVenta === "TOTAL" ? "bg-white text-emerald-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Contado
              </button>
              <button
                type="button"
                disabled={!permiteCreditoCartera}
                onClick={() => onModalidadVentaChange("ADELANTO")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                  modalidadVenta === "ADELANTO" ? "bg-white text-emerald-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Abono
              </button>
              <button
                type="button"
                disabled={!permiteCreditoCartera}
                onClick={() => onModalidadVentaChange("PENDIENTE")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                  modalidadVenta === "PENDIENTE" ? "bg-white text-emerald-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Crédito
              </button>
            </div>
          )}

          {/* Valor del rubro comercial (Editable en Apartados, fijo en Alquileres) */}
          {modulo === "APARTADOS" || (modulo === "VENTAS" && modalidadVenta === "ADELANTO") ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  {modulo === "APARTADOS" ? "Valor Prendas:" : "Total Venta:"}{" "}
                  <strong className="text-slate-900 font-mono">${totalOperacion.toLocaleString("es-CO")}</strong>
                </span>
                <span className="font-semibold">
                  Saldo pendiente:{" "}
                  <strong className={`${theme.accentText} font-mono`}>
                    ${Math.max(0, saldoOperacionRestante - montoOperacionHoy).toLocaleString("es-CO")}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputDinero
                    value={montoOperacionHoyInput ?? ""}
                    onChange={(e) => {
                      onMontoOperacionHoyInputChange?.(e.target.value);
                      setEfectivoOperacionStr("");
                    }}
                    mostrarPrefijo
                    placeholder="Abono a recibir hoy"
                    className={`w-full px-3 py-2 rounded-xl border ${theme.inputBorder} font-mono font-black text-base text-slate-900 bg-white focus:outline-none focus:ring-2`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onMontoOperacionHoyInputChange?.(String(saldoOperacionRestante));
                    setEfectivoOperacionStr(String(saldoOperacionRestante));
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${theme.exactoBtn}`}
                  title="Insertar el valor exacto total de las prendas"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Exacto</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${theme.softBg}`}>
              <span className={`text-xs font-bold uppercase ${theme.accentDark}`}>
                {modulo === "VENTAS" && modalidadVenta === "PENDIENTE"
                  ? `Cargo a Cartera (Cupo: $${cupoDisponibleCliente.toLocaleString("es-CO")})`
                  : abonoPrevioOperacion > 0
                  ? `Alquiler $${totalOperacion.toLocaleString("es-CO")} - Abonado $${abonoPrevioOperacion.toLocaleString("es-CO")}`
                  : "Valor Neto a Cobrar"}
              </span>
              <span className={`text-lg font-mono font-black ${theme.accentDark}`}>
                ${(modulo === "VENTAS" && modalidadVenta === "PENDIENTE" ? totalOperacion : montoOperacionHoy).toLocaleString("es-CO")}
              </span>
            </div>
          )}

          {/* Selector de Metodo y Efectivo Recibido de la Operacion (Manejo Separado) */}
          {montoOperacionHoy > 0 && !modoMixtoActivo && (
            <div className="space-y-2.5">
              {renderSelectorMetodos(
                metodoOperacion,
                (m) => onMetodoOperacionChange?.(m),
                theme.activeBtn
              )}

              {metodoOperacion === "EFECTIVO" ? (
                <div className={`p-2.5 rounded-xl border ${theme.softBg} space-y-1.5`}>
                  <label className={`text-[11px] font-bold uppercase block ${theme.accentDark}`}>
                    Efectivo recibido ({modulo === "ALQUILERES" ? "Alquiler" : modulo === "APARTADOS" ? "Apartado" : "Venta"}):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputDinero
                        ref={inputEfectivoOperacionRef}
                        value={efectivoOperacionStr}
                        onChange={(e) => setEfectivoOperacionStr(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && resultadoConsolidado.esValido && onConfirmarEnter) {
                            e.preventDefault();
                            onConfirmarEnter();
                          }
                        }}
                        mostrarPrefijo
                        placeholder={montoOperacionHoy.toLocaleString("es-CO")}
                        className={`w-full pr-3 py-2 rounded-xl border ${theme.inputBorder} bg-white font-mono font-black text-base text-slate-900 focus:outline-none focus:ring-2`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEfectivoOperacionStr(String(montoOperacionHoy))}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${theme.exactoBtn}`}
                      title="Insertar el valor exacto recibido para esta operación"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Exacto</span>
                    </button>
                  </div>

                  {vueltasOperacion > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-xs font-black text-emerald-800">
                      <span>Vueltas operación:</span>
                      <span className="font-mono text-sm">${vueltasOperacion.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                </div>
              ) : (
                onReferenciaOperacionChange && (
                  <input
                    type="text"
                    value={referenciaOperacion}
                    onChange={(e) => onReferenciaOperacionChange(e.target.value)}
                    placeholder={`Referencia / comprobante ${metodoOperacion} (opcional)`}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 ${theme.inputBorder}`}
                  />
                )
              )}
            </div>
          )}

          {/* Modo Pago Dividido */}
          {montoOperacionHoy > 0 && modoMixtoActivo && (
            <div className={`space-y-2 p-3 rounded-xl border ${theme.softBg}`}>
              {faltanteMixtoComercial > 0 && (
                <div className="space-y-2">
                  {renderSelectorMetodos(metodoTramoNuevo, setMetodoTramoNuevo, theme.activeBtn)}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputDinero
                        value={montoTramoNuevo}
                        onChange={(e) => setMontoTramoNuevo(e.target.value)}
                        mostrarPrefijo
                        placeholder={faltanteMixtoComercial.toLocaleString("es-CO")}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-mono font-bold bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMontoTramoNuevo(String(faltanteMixtoComercial))}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${theme.exactoBtn}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Exacto</span>
                    </button>
                    <button
                      type="button"
                      onClick={agregarTramoMixto}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${theme.activeBtn}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aplicar</span>
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
                        <span className="font-mono font-black text-slate-900">${t.monto.toLocaleString("es-CO")}</span>
                        <button
                          type="button"
                          onClick={() => eliminarTramoMixto(t.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
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

        {/* TARJETA 2: DEPOSITO EN CUSTODIA (AMBAR ESTRICTO — DINERO EN CUSTODIA POR SEPARADO) */}
        {manejaDeposito && (
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-amber-950">
                  2. Depósito en Custodia (Garantía)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                Custodia Separada
              </span>
            </div>

            {/* Valor pactado del deposito (Sin chips de billetes) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-amber-900">
                <span className="font-semibold">Garantía pactada del contrato:</span>
                {depositoAbonadoPrevio > 0 && (
                  <span className="font-bold text-emerald-700 font-mono">
                    Previo en custodia: ${depositoAbonadoPrevio.toLocaleString("es-CO")}
                  </span>
                )}
              </div>
              <InputDinero
                value={montoDepositoPactadoInput}
                onChange={(e) => {
                  onMontoDepositoPactadoInputChange?.(e.target.value);
                  setEfectivoCustodiaStr("");
                }}
                permitirCeroVacio
                mostrarPrefijo
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-amber-300 font-mono font-black text-base text-amber-950 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* En Apartados: decidir si el deposito queda pendiente para el retiro o se recibe hoy */}
            {modulo === "APARTADOS" && saldoDepositoFaltante > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-amber-100/70 rounded-xl border border-amber-200">
                  <button
                    type="button"
                    onClick={() => {
                      onCobrarDepositoHoyApartadoChange?.(false);
                      onMontoDepositoHoyInputChange?.("0");
                      setEfectivoCustodiaStr("");
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      cobrarDepositoHoyApartado
                        ? "bg-white text-amber-950 shadow-2xs"
                        : "text-amber-800 hover:text-amber-950"
                    }`}
                  >
                    Recibir Custodia Hoy
                  </button>
                </div>

                {cobrarDepositoHoyApartado && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputDinero
                        value={montoDepositoHoyInput ?? ""}
                        onChange={(e) => {
                          onMontoDepositoHoyInputChange?.(e.target.value);
                          setEfectivoCustodiaStr("");
                        }}
                        mostrarPrefijo
                        placeholder="Custodia a recibir hoy"
                        className="w-full px-3 py-1.5 rounded-xl border border-amber-300 font-mono font-black text-sm text-amber-950 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onMontoDepositoHoyInputChange?.(String(saldoDepositoFaltante));
                        setEfectivoCustodiaStr(String(saldoDepositoFaltante));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Exacto</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selector de medio y Efectivo Recibido Independiente para Custodia */}
            {montoDepositoHoy > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Medio en que entrega la custodia hoy:</span>
                  <span className="font-mono">${montoDepositoHoy.toLocaleString("es-CO")}</span>
                </div>

                {renderSelectorMetodos(
                  metodoDeposito,
                  (m) => onMetodoDepositoChange?.(m),
                  "bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-xs"
                )}

                {metodoDeposito === "EFECTIVO" && (
                  <div className="p-2.5 rounded-xl bg-amber-100/50 border border-amber-300 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase block text-amber-950">
                      Efectivo recibido (Depósito en Custodia):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <InputDinero
                          ref={inputEfectivoCustodiaRef}
                          value={efectivoCustodiaStr}
                          onChange={(e) => setEfectivoCustodiaStr(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && resultadoConsolidado.esValido && onConfirmarEnter) {
                              e.preventDefault();
                              onConfirmarEnter();
                            }
                          }}
                          mostrarPrefijo
                          clasePrefijo="text-amber-800 font-bold text-sm"
                          placeholder={montoDepositoHoy.toLocaleString("es-CO")}
                          className="w-full pr-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-black text-base text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEfectivoCustodiaStr(String(montoDepositoHoy))}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        title="Insertar el valor exacto recibido para el depósito en custodia"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Exacto</span>
                      </button>
                    </div>

                    {vueltasCustodia > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-amber-300 text-xs font-black text-emerald-800">
                        <span>Vueltas custodia:</span>
                        <span className="font-mono text-sm">${vueltasCustodia.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-white/80 border border-amber-200 text-xs font-semibold text-amber-900">
                {montoDepositoPactado === 0
                  ? "Operación sin depósito en custodia ($0)."
                  : modulo === "APARTADOS"
                  ? `Queda pactado por $${saldoDepositoFaltante.toLocaleString("es-CO")} para recibir al entregar las prendas.`
                  : "Depósito en custodia cubierto previamente."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FRANJA FINAL DE TASACION DEL DOCUMENTO (COLORIMETRIA PROPIA DEL MODULO, SIN FONDO NEGRO) */}
      <div className={`rounded-2xl border p-3.5 shadow-2xs space-y-2.5 ${theme.summarySurface}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
          <div>
            <span className={`text-[10.5px] font-bold uppercase block ${theme.summaryLabel}`}>
              {modulo === "VENTAS" ? "Valor Venta" : modulo === "ALQUILERES" ? "Valor Alquiler" : "Valor Reserva"}
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-slate-900">
              ${totalOperacion.toLocaleString("es-CO")}
            </span>
          </div>

          {manejaDeposito && (
            <div>
              <span className="text-[10.5px] font-bold uppercase text-amber-800 block">
                + Depósito Custodia
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-amber-900">
                ${montoDepositoPactado.toLocaleString("es-CO")}
              </span>
            </div>
          )}

          <div>
            <span className={`text-[10.5px] font-bold uppercase block ${theme.summaryLabel}`}>
              = Total Tasado {modulo === "APARTADOS" ? "Comprobante" : "Factura"}
            </span>
            <span className={`text-sm sm:text-base font-mono font-black ${theme.summaryValue}`}>
              ${totalTasadoDocumento.toLocaleString("es-CO")}
            </span>
          </div>

          <div className={`rounded-xl px-3 py-2 border flex items-center justify-between ${theme.summaryHighlight}`}>
            <div>
              <span className={`text-[10px] font-bold uppercase block ${theme.summaryLabel}`}>
                Total a Recibir Hoy
              </span>
              <span className={`text-base font-mono font-black ${theme.accentDark}`}>
                ${totalRecibirClienteHoy.toLocaleString("es-CO")}
              </span>
            </div>
            {vueltasEntregarTotales > 0 ? (
              <div className="text-right pl-2 border-l border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center justify-end gap-1">
                  <Calculator className="w-3 h-3" />
                  Vueltas
                </span>
                <span className="text-sm font-mono font-black text-emerald-700">
                  ${vueltasEntregarTotales.toLocaleString("es-CO")}
                </span>
              </div>
            ) : resultadoConsolidado.esValido && totalRecibirClienteHoy > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : null}
          </div>
        </div>

        {resultadoConsolidado.motivoBloqueo && (
          <div className={`flex items-center gap-2 pt-2 border-t ${theme.summaryDivider} text-xs font-bold ${theme.accentDark}`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${theme.headerIcon}`} />
            <span>{resultadoConsolidado.motivoBloqueo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
