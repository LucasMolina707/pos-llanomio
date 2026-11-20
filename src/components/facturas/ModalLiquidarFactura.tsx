"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Receipt,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Building2,
  Clock,
  Printer,
  FileDown,
  RefreshCw,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Coins,
  Split,
} from "lucide-react";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import Tooltip from "@/components/ui/Tooltip";
import { descargarPdfSegunFormato } from "@/lib/pdf-media-carta";
import { MetodoPagoPos } from "@/app/caja/pos/page";

interface ModalLiquidarFacturaProps {
  facturaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFacturaLiquidada?: (factura: any) => void;
  recargoMoraSugerido?: number;
  diasRetrasoSugerido?: number;
  horasRetrasoSugerido?: number;
}

export default function ModalLiquidarFactura({
  facturaId,
  isOpen,
  onClose,
  onFacturaLiquidada,
  recargoMoraSugerido = 0,
  diasRetrasoSugerido = 0,
  horasRetrasoSugerido = 0,
}: ModalLiquidarFacturaProps) {
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [factura, setFactura] = useState<any | null>(null);

  // Estados de liquidación
  const [moraACobrar, setMoraACobrar] = useState<number>(recargoMoraSugerido);
  const [confirmarDevolucion, setConfirmarDevolucion] = useState<boolean>(true);
  const [tipoDevolucionDeposito, setTipoDevolucionDeposito] = useState<"DEVUELTO_COMPLETO" | "RETENIDO_PARCIAL" | "RETENIDO_TOTAL">("DEVUELTO_COMPLETO");
  const [montoRetenido, setMontoRetenido] = useState<number>(0);
  const [motivoRetencion, setMotivoRetencion] = useState<string>("");
  const [estadoPrendasDevueltas, setEstadoPrendasDevueltas] = useState<"DISPONIBLE" | "EN_ARREGLO">("DISPONIBLE");
  const [metodoPago, setMetodoPago] = useState<MetodoPagoPos>("EFECTIVO");
  const [esPagoMixto, setEsPagoMixto] = useState<boolean>(false);
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState<string>("");
  const [montoDigitalMixto, setMontoDigitalMixto] = useState<string>("");
  const [metodoDigitalMixto, setMetodoDigitalMixto] = useState<MetodoPagoPos>("BANCOLOMBIA");
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Visor de impresión tras liquidar
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [datosImpresion, setDatosImpresion] = useState<DatosImpresionFactura | null>(null);

  // Cargar información de la factura al abrir el modal
  useEffect(() => {
    if (!isOpen || !facturaId) {
      setFactura(null);
      setMostrarImpresion(false);
      setDatosImpresion(null);
      setMensajeError(null);
      return;
    }

    let cancelado = false;
    const fetchFactura = async () => {
      try {
        setCargandoDetalle(true);
        setMensajeError(null);
        const res = await fetch(`/api/facturas/${facturaId}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelado && data.success) {
          setFactura(data.factura);
          const moraFinal = recargoMoraSugerido > 0 ? recargoMoraSugerido : (data.factura.recargoMoraAcumulado || 0);
          setMoraACobrar(moraFinal);
          const saldoBase = Math.max(0, (data.factura.totalFactura || 0) - (data.factura.totalAbonado || 0));
          const totalExigible = saldoBase + moraFinal;
          setEfectivoRecibido(String(totalExigible));
          setEsPagoMixto(false);
          setMontoEfectivoMixto(String(totalExigible));
          setMontoDigitalMixto("0");
          setMetodoDigitalMixto("BANCOLOMBIA");
          setTipoDevolucionDeposito("DEVUELTO_COMPLETO");
          setMontoRetenido(0);
          setMotivoRetencion("");
          setEstadoPrendasDevueltas("DISPONIBLE");
        } else if (!cancelado) {
          setMensajeError(data.error || "No se pudo cargar la factura.");
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setMensajeError("Error de red al consultar los detalles de la factura.");
        }
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    };

    fetchFactura();
    return () => {
      cancelado = true;
    };
  }, [isOpen, facturaId, recargoMoraSugerido]);

  if (!isOpen) return null;

  const saldoBase = factura
    ? Math.max(0, (factura.totalFactura || 0) - (factura.totalAbonado || 0))
    : 0;
  const totalACobrar = Math.round((saldoBase + moraACobrar) * 100) / 100;
  const montoObjetivoEfectivo = esPagoMixto
    ? (Number(montoEfectivoMixto) || 0)
    : (metodoPago === "EFECTIVO" ? totalACobrar : 0);

  const efectivoRecibidoNum = parseFloat(efectivoRecibido) || 0;
  const vueltasCalculadas =
    ((metodoPago === "EFECTIVO" && !esPagoMixto) || (esPagoMixto && Number(montoEfectivoMixto) > 0)) &&
      efectivoRecibidoNum >= montoObjetivoEfectivo
      ? Math.round((efectivoRecibidoNum - montoObjetivoEfectivo) * 100) / 100
      : 0;

  const sumarBillete = (monto: number) => {
    const actual = parseFloat(efectivoRecibido) || 0;
    setEfectivoRecibido(String(actual + monto));
  };

  const ejecutarPagoYDevolucion = async () => {
    setMensajeError(null);

    if (!factura) return;

    if (totalACobrar <= 0 && !confirmarDevolucion) {
      setMensajeError("La factura no tiene saldo pendiente ni recargo por mora.");
      return;
    }

    if (!esPagoMixto && metodoPago === "EFECTIVO" && totalACobrar > 0 && efectivoRecibidoNum < totalACobrar) {
      setMensajeError(
        `El efectivo recibido ($${efectivoRecibidoNum.toLocaleString("es-CO")}) es inferior al total a cobrar ($${totalACobrar.toLocaleString("es-CO")}).`
      );
      return;
    }

    if (esPagoMixto && Number(montoEfectivoMixto) > 0 && efectivoRecibidoNum < Number(montoEfectivoMixto)) {
      setMensajeError(
        `El efectivo recibido ($${efectivoRecibidoNum.toLocaleString("es-CO")}) es inferior a la porción de efectivo requerida ($${Number(montoEfectivoMixto).toLocaleString("es-CO")}).`
      );
      return;
    }

    try {
      setProcesando(true);

      const tieneDeposito = Boolean(factura.tipoOperacion === "ALQUILER" && (factura.montoDeposito || 0) > 0);
      const estDep = tieneDeposito ? tipoDevolucionDeposito : ((factura.montoDeposito || 0) > 0 ? "DEVUELTO_COMPLETO" : "SIN_DEPOSITO");
      const retDep = tipoDevolucionDeposito === "RETENIDO_PARCIAL"
        ? Math.min(factura.montoDeposito || 0, montoRetenido)
        : (tipoDevolucionDeposito === "RETENIDO_TOTAL" ? (factura.montoDeposito || 0) : 0);
      const devDep = tipoDevolucionDeposito === "DEVUELTO_COMPLETO"
        ? (factura.montoDeposito || 0)
        : (tipoDevolucionDeposito === "RETENIDO_PARCIAL" ? Math.max(0, (factura.montoDeposito || 0) - retDep) : 0);

      // Preparar arreglo de pagos/abonos
      const abonosLiquidacion = esPagoMixto && totalACobrar > 0
        ? [
          ...(Number(montoEfectivoMixto) > 0
            ? [{
              monto: Number(montoEfectivoMixto),
              metodoPago: "EFECTIVO",
              montoRecibido: efectivoRecibidoNum || Number(montoEfectivoMixto),
              vueltasEntregadas: vueltasCalculadas,
              notas: "Liquidación / Abono mixto - Efectivo",
            }]
            : []),
          ...(Number(montoDigitalMixto) > 0
            ? [{
              monto: Number(montoDigitalMixto),
              metodoPago: metodoDigitalMixto,
              referenciaComprobante: referencia.trim() || undefined,
              notas: `Liquidación / Abono mixto - ${metodoDigitalMixto}`,
            }]
            : []),
        ]
        : totalACobrar > 0
          ? [{
            monto: totalACobrar,
            metodoPago,
            montoRecibido: metodoPago === "EFECTIVO" ? efectivoRecibidoNum : undefined,
            vueltasEntregadas: metodoPago === "EFECTIVO" ? vueltasCalculadas : undefined,
            referenciaComprobante: referencia.trim() || undefined,
            notas: moraACobrar > 0 ? `Liquidación de saldo y mora (${diasRetrasoSugerido} días)` : "Liquidación total",
          }]
          : [];

      const res = await fetch(`/api/facturas/${factura.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: totalACobrar,
          recargoMora: moraACobrar,
          confirmarDevolucionPrendas: confirmarDevolucion,
          estadoDeposito: estDep,
          montoRetenidoDeposito: retDep,
          montoDevueltoDeposito: devDep,
          motivoRetencionDeposito: motivoRetencion.trim() || undefined,
          estadoPrendasDevueltas: estadoPrendasDevueltas,
          esPagoMixto,
          metodoPagoPrincipal: esPagoMixto ? "MIXTO" : metodoPago,
          metodoPago: esPagoMixto ? "EFECTIVO" : metodoPago,
          pagos: abonosLiquidacion,
          abonos: abonosLiquidacion,
          montoRecibido: efectivoRecibidoNum,
          vueltasEntregadas: vueltasCalculadas,
          referenciaComprobante: referencia.trim() || undefined,
          notas:
            notas.trim() ||
            (moraACobrar > 0
              ? `Liquidación de saldo y recargo por mora (${diasRetrasoSugerido} días / ${horasRetrasoSugerido} hrs)`
              : "Liquidación total y paz y salvo"),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar el pago en el servidor.");
      }

      const facturaActualizada = data.factura;
      setFactura(facturaActualizada);

      // Cargar datos formateados para impresión
      try {
        const resImp = await fetch(`/api/impresion/${facturaActualizada.id}`, { cache: "no-store" });
        const dataImp = await resImp.json();
        if (dataImp.success) {
          setDatosImpresion(dataImp);
          setMostrarImpresion(true);
        }
      } catch (errImp) {
        console.error("Error al preparar comprobante de impresión:", errImp);
      }

      if (onFacturaLiquidada) {
        onFacturaLiquidada(facturaActualizada);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar la liquidación.";
      setMensajeError(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal Fija */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {mostrarImpresion
                  ? "Certificado de Paz y Salvo Emitido"
                  : "Cobrar Saldo, Liquidar Mora y Devolución"}
              </h2>
              <p className="text-xs text-slate-500">
                Factura #{factura?.numeroFactura || "..."} — Cliente: {factura?.cliente?.nombre || "Cargando..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de Error */}
        {mensajeError && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}

        {/* CUERPO DEL MODAL (Con scroll interno) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {mostrarImpresion && datosImpresion ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>FACTURA LIQUIDADA AL 100% — PRENDAS DEVUELTAS Y PAZ Y SALVO</span>
                </div>
                <span className="font-mono bg-emerald-200 px-2.5 py-0.5 rounded text-emerald-900 text-xs">
                  SALDO: $0
                </span>
              </div>

              {/* Visor de Plantilla de Impresión */}
              <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50">
                <PlantillaImpresion datos={datosImpresion} onCerrar={onClose} />
              </div>
            </div>
          ) : cargandoDetalle ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p>Cargando información contable de la factura...</p>
            </div>
          ) : !factura ? (
            <div className="p-8 text-center text-rose-600 text-xs font-semibold">
              No se encontró la información de la factura.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tarjeta de Liquidación de Rubros */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-bold">Saldo Pendiente de Factura Base:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ${saldoBase.toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-rose-700 font-bold block">
                      Recargo por Mora en Entrega de Prendas:
                    </span>
                    {(diasRetrasoSugerido > 0 || horasRetrasoSugerido > 0) && (
                      <span className="text-[10px] text-slate-500 block">
                        Retraso calculado: {diasRetrasoSugerido > 0 ? `${diasRetrasoSugerido} días` : `${horasRetrasoSugerido} horas`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-rose-600 font-bold">+$</span>
                    <input
                      type="number"
                      min={0}
                      value={moraACobrar}
                      onChange={(e) => setMoraACobrar(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 px-2 py-1 text-right rounded border border-rose-300 font-bold text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <strong className="text-sm text-slate-900 uppercase block font-black">
                      Total Exigible para Paz y Salvo:
                    </strong>
                    <span className="text-[10px] text-slate-500">Saldo Factura + Mora Acumulada</span>
                  </div>
                  <span className="font-mono text-lg font-black text-emerald-700">
                    ${totalACobrar.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Casilla de Confirmación de Devolución de Prendas */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmarDevolucion}
                    onChange={(e) => setConfirmarDevolucion(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                  <div className="text-xs">
                    <strong className="text-blue-900 block font-bold">
                      Confirmar recepción física de las prendas en almacén
                    </strong>
                    <span className="text-blue-700 text-[11px] block">
                      Registra el reingreso al inventario de la tienda y cierra el préstamo al cliente.
                    </span>
                  </div>
                </label>

                {confirmarDevolucion && (
                  <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-950">
                      Estado de las prendas al recibir:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEstadoPrendasDevueltas("DISPONIBLE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${estadoPrendasDevueltas === "DISPONIBLE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        En Buen Estado (Disponible)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoPrendasDevueltas("EN_ARREGLO")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${estadoPrendasDevueltas === "EN_ARREGLO"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        A Lavandería / Taller
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gestión de Depósito en Custodia (Solo Alquileres con Depósito) */}
              {factura.tipoOperacion === "ALQUILER" && (factura.montoDeposito || 0) > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                        Liquidación de Depósito en Custodia
                      </span>
                    </div>
                    <span className="font-mono text-sm font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                      ${(factura.montoDeposito || 0).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    El depósito en garantía está físicamente en gaveta. Determina si se reintegra al cliente o si se retiene dinero por daños, suciedad o mora:
                  </p>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoDevolucionDeposito("DEVUELTO_COMPLETO");
                        setMontoRetenido(0);
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition border ${tipoDevolucionDeposito === "DEVUELTO_COMPLETO"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                        }`}
                    >
                      Devolver 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoDevolucionDeposito("RETENIDO_PARCIAL");
                        if (montoRetenido === 0) setMontoRetenido(Math.round((factura.montoDeposito || 0) / 2));
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition border ${tipoDevolucionDeposito === "RETENIDO_PARCIAL"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                        }`}
                    >
                      Descuento Parcial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoDevolucionDeposito("RETENIDO_TOTAL");
                        setMontoRetenido(factura.montoDeposito || 0);
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition border ${tipoDevolucionDeposito === "RETENIDO_TOTAL"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                        }`}
                    >
                      Retención Total
                    </button>
                  </div>

                  {tipoDevolucionDeposito === "DEVUELTO_COMPLETO" && (
                    <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-900 text-xs font-bold flex items-center justify-between">
                      <span>Devolver al cliente de la gaveta:</span>
                      <span className="font-mono text-sm">${(factura.montoDeposito || 0).toLocaleString("es-CO")}</span>
                    </div>
                  )}

                  {tipoDevolucionDeposito === "RETENIDO_PARCIAL" && (
                    <div className="space-y-2 pt-1 border-t border-amber-200">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-amber-950">
                          Monto a Retener ($):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={factura.montoDeposito || 0}
                          value={montoRetenido}
                          onChange={(e) => setMontoRetenido(Math.min(factura.montoDeposito || 0, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-28 px-2 py-1 text-right rounded border border-amber-400 font-mono font-bold text-rose-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                        <span>Devolver al cliente de la gaveta:</span>
                        <span className="font-mono text-sm">${Math.max(0, (factura.montoDeposito || 0) - montoRetenido).toLocaleString("es-CO")}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Motivo del descuento (ej: Costo de lavandería, rotura de botón)..."
                        value={motivoRetencion}
                        onChange={(e) => setMotivoRetencion(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {tipoDevolucionDeposito === "RETENIDO_TOTAL" && (
                    <div className="space-y-2 pt-1 border-t border-amber-200">
                      <div className="p-2 rounded-lg bg-rose-100/70 text-rose-900 text-xs font-bold flex items-center justify-between">
                        <span>Se retiene el 100% del depósito:</span>
                        <span className="font-mono text-sm">${(factura.montoDeposito || 0).toLocaleString("es-CO")}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Motivo de la retención total (ej: Daño irreparable de tela, prenda extraviada)..."
                        value={motivoRetencion}
                        onChange={(e) => setMotivoRetencion(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Selector de Método de Pago y Modo Mixto */}
              {totalACobrar > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-500" />
                        Método de Liquidación:
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Pago único o dividido entre efectivo y transferencia
                      </p>
                    </div>

                    <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                      <Tooltip content="Liquidar con un único método de pago" position="top">
                        <button
                          type="button"
                          onClick={() => {
                            if (esPagoMixto) {
                              setEsPagoMixto(false);
                              setEfectivoRecibido(String(totalACobrar));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${!esPagoMixto
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          <span>1 Solo Método</span>
                        </button>
                      </Tooltip>

                      <Tooltip content="Dividir la liquidación en dos montos: porción en efectivo y porción digital" position="top">
                        <button
                          type="button"
                          onClick={() => {
                            if (!esPagoMixto) {
                              setEsPagoMixto(true);
                              const mitad = Math.floor(totalACobrar / 2);
                              setMontoEfectivoMixto(String(mitad));
                              setMontoDigitalMixto(String(totalACobrar - mitad));
                              setEfectivoRecibido(String(mitad));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${esPagoMixto
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          <Split className="w-3.5 h-3.5" />
                          <span>Pago Mixto (2 Métodos)</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {!esPagoMixto ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { id: "EFECTIVO", label: "Efectivo", desc: "Pago en efectivo en gaveta física", icon: Banknote },
                        { id: "BANCOLOMBIA", label: "Bancolombia", desc: "Transferencia Bancolombia / QR", icon: Building2 },
                        { id: "NEQUI", label: "Nequi", desc: "Transferencia a cuenta Nequi", icon: Smartphone },
                        { id: "LLAVE", label: "Bre-B", desc: "Transferencia inmediata Bre-B / Llave", icon: Coins },
                        { id: "DAVIPLATA", label: "Daviplata", desc: "Transferencia a cuenta Daviplata", icon: Smartphone },
                        { id: "TRANSFERENCIA", label: "Transferencia", desc: "Otros bancos o consignación", icon: CreditCard },
                      ].map((met) => {
                        const IconComp = met.icon;
                        const esActivo = metodoPago === met.id;

                        return (
                          <Tooltip key={met.id} content={met.label} subtext={met.desc} position="top">
                            <button
                              type="button"
                              onClick={() => {
                                setMetodoPago(met.id as MetodoPagoPos);
                                if (met.id === "EFECTIVO") setEfectivoRecibido(String(totalACobrar));
                              }}
                              className={`w-full p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${esActivo
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold ring-2 ring-blue-600/20"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                                }`}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-xs">{met.label}</span>
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 space-y-3.5 shadow-2xs">
                      {/* Sub-Tarjetas de los Dos Montos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Monto 1: Efectivo */}
                        <div className="bg-white rounded-xl border border-emerald-200/90 p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              Monto 1: Efectivo
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMontoEfectivoMixto(String(totalACobrar));
                                setMontoDigitalMixto("0");
                                setEfectivoRecibido(String(totalACobrar));
                              }}
                              className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              100% Efectivo
                            </button>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={montoEfectivoMixto}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMontoEfectivoMixto(val);
                                const n = Number(val) || 0;
                                setEfectivoRecibido(String(n));
                              }}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Ingreso a registrar en caja física</p>
                        </div>

                        {/* Monto 2: Digital / Transferencia */}
                        <div className="bg-white rounded-xl border border-blue-200/90 p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                              Monto 2: Digital / Transferencia
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const ef = Number(montoEfectivoMixto) || 0;
                                const resto = Math.max(0, totalACobrar - ef);
                                setMontoDigitalMixto(String(resto));
                              }}
                              className="text-[10.5px] font-bold text-blue-700 hover:text-blue-800 hover:underline"
                            >
                              Completar Restante
                            </button>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={montoDigitalMixto}
                              onChange={(e) => {
                                setMontoDigitalMixto(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Liquidación por canal electrónico</p>
                        </div>
                      </div>

                      {/* Selector de Canal Digital con 5 Botones e Iconos con Tooltip */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Canal Digital: <strong className="text-blue-700">{metodoDigitalMixto}</strong>
                          </label>
                          <span className="text-[10.5px] font-semibold text-slate-400">
                            Predeterminado: <strong className="text-slate-700">Bancolombia</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { id: "BANCOLOMBIA", label: "Bancolombia", desc: "Transferencia / QR Bancolombia (Predeterminado)", icon: Building2 },
                            { id: "NEQUI", label: "Nequi", desc: "Transferencia a cuenta Nequi", icon: Smartphone },
                            { id: "LLAVE", label: "Bre-B", desc: "Transferencia inmediata Bre-B / Llave", icon: Coins },
                            { id: "DAVIPLATA", label: "Daviplata", desc: "Transferencia a cuenta Daviplata", icon: Smartphone },
                            { id: "TRANSFERENCIA", label: "Transferencia", desc: "Otros bancos o consignación", icon: CreditCard },
                          ].map((m) => {
                            const IconM = m.icon;
                            const esActivo = metodoDigitalMixto === m.id;
                            return (
                              <Tooltip key={m.id} content={m.label} subtext={m.desc} position="top">
                                <button
                                  type="button"
                                  onClick={() => setMetodoDigitalMixto(m.id as MetodoPagoPos)}
                                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer w-full ${esActivo
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/20"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                    }`}
                                >
                                  <IconM className="w-4 h-4 shrink-0" />
                                  <span className="hidden sm:inline text-[11px] font-semibold">{m.id === "TRANSFERENCIA" ? "Transf." : m.label}</span>
                                </button>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>

                      {/* Barra de Progreso y Resumen de Cuadre */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">Distribución de Liquidación Hoy:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ${((Number(montoEfectivoMixto) || 0) + (Number(montoDigitalMixto) || 0)).toLocaleString("es-CO")} de ${totalACobrar.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {/* Barra Bicromática */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{
                              width: `${totalACobrar > 0 ? Math.min(100, (Number(montoEfectivoMixto || 0) / totalACobrar) * 100) : 0}%`,
                            }}
                            className="bg-emerald-500 transition-all duration-300"
                            title="Efectivo"
                          />
                          <div
                            style={{
                              width: `${totalACobrar > 0 ? Math.min(100, (Number(montoDigitalMixto || 0) / totalACobrar) * 100) : 0}%`,
                            }}
                            className="bg-blue-500 transition-all duration-300"
                            title="Digital"
                          />
                        </div>

                        {/* Chips de Resumen */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Efectivo: ${Number(montoEfectivoMixto || 0).toLocaleString("es-CO")}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {metodoDigitalMixto}: ${Number(montoDigitalMixto || 0).toLocaleString("es-CO")}
                            </span>
                          </div>

                          {((Number(montoEfectivoMixto) || 0) + (Number(montoDigitalMixto) || 0)) === totalACobrar ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              100% Cubierto
                            </span>
                          ) : ((Number(montoEfectivoMixto) || 0) + (Number(montoDigitalMixto) || 0)) < totalACobrar ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              Faltan ${(totalACobrar - ((Number(montoEfectivoMixto) || 0) + (Number(montoDigitalMixto) || 0))).toLocaleString("es-CO")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Excede por ${(((Number(montoEfectivoMixto) || 0) + (Number(montoDigitalMixto) || 0)) - totalACobrar).toLocaleString("es-CO")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Calculadora de Efectivo y Vueltas (si es efectivo o pago mixto con porción de efectivo) */}
              {((metodoPago === "EFECTIVO" && !esPagoMixto) || (esPagoMixto && (Number(montoEfectivoMixto) || 0) > 0)) && totalACobrar > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Efectivo Recibido ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={efectivoRecibido}
                        onChange={(e) => setEfectivoRecibido(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div className="flex-1 text-right">
                      <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Vueltas / Cambio
                      </span>
                      <span className="font-mono text-lg font-black text-emerald-700 block">
                        ${vueltasCalculadas.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  {/* Botones de billetes rápidos */}
                  <div className="flex items-center flex-wrap gap-1.5 pt-1">
                    {[2000, 5000, 10000, 20000, 50000, 100000].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => sumarBillete(b)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-mono text-xs font-bold text-slate-700 transition"
                      >
                        +${(b / 1000).toFixed(0)}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEfectivoRecibido(String(totalACobrar))}
                      className="px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 font-sans text-xs font-bold text-blue-700 transition ml-auto"
                    >
                      Exacto
                    </button>
                  </div>
                </div>
              )}

              {/* Referencia Comprobante si aplica */}
              {metodoPago !== "EFECTIVO" && totalACobrar > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    N° de Comprobante / Aprobación
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: NEQ-182938 / Transf #8902"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de Acciones Fijo */}
        {!mostrarImpresion && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={procesando || cargandoDetalle}
              onClick={ejecutarPagoYDevolucion}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {procesando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Procesando Liquidación...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {totalACobrar > 0
                      ? `Cobrar $${totalACobrar.toLocaleString("es-CO")} y Emitir Paz y Salvo`
                      : "Confirmar Devolución y Paz y Salvo"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
