"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import InputDinero from "@/components/ui/InputDinero";
import PanelPagosSecuenciales, { PagoAplicado } from "@/components/caja/PanelPagosSecuenciales";
import { descargarPdfSegunFormato } from "@/lib/pdf-media-carta";
import { MetodoPagoPos } from "@/app/caja/pos/page";
import { safeFetchJson, invalidarCacheApi } from "@/lib/safe-fetch";

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
  const [pagosAplicados, setPagosAplicados] = useState<PagoAplicado[]>([]);
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
          setPagosAplicados([]);
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

  const totalPagadoEnCascada = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagosAplicados]);

  if (!isOpen) return null;

  const saldoAlquiler = factura
    ? Math.max(0, (factura.totalFactura || 0) - (factura.totalAbonado || 0))
    : 0;
  const saldoBase = saldoAlquiler; // Alias para compatibilidad

  const depositoPactado = factura ? Math.max(0, factura.montoDeposito || 0) : 0;
  const depositoAbonado = factura
    ? Math.max(
        0,
        factura.depositoAbonado !== undefined
          ? factura.depositoAbonado
          : factura.estadoDeposito === "RECIBIDO_EN_GARANTIA"
          ? depositoPactado
          : 0
      )
    : 0;
  const saldoDeposito = Math.max(0, depositoPactado - depositoAbonado);

  // Total exigible: Saldo de Alquiler + Mora + Saldo Faltante de Custodia (si no se ha entregado)
  const totalACobrar = Math.round((saldoAlquiler + moraACobrar + saldoDeposito) * 100) / 100;

  const efectivoRecibidoNum = parseFloat(efectivoRecibido) || 0;
  const vueltasCalculadas =
    metodoPago === "EFECTIVO" && totalACobrar > 0 && efectivoRecibidoNum >= totalACobrar
      ? Math.round((efectivoRecibidoNum - totalACobrar) * 100) / 100
      : 0;

  const ejecutarPagoYDevolucion = async () => {
    setMensajeError(null);

    if (!factura) return;

    if (totalACobrar <= 0 && !confirmarDevolucion) {
      setMensajeError("La factura no tiene saldo pendiente ni recargo por mora.");
      return;
    }

    if (pagosAplicados.length > 0 && totalPagadoEnCascada !== totalACobrar) {
      setMensajeError(
        `El total pagado (${totalPagadoEnCascada.toLocaleString("es-CO")}) debe coincidir con el total a liquidar hoy (${totalACobrar.toLocaleString("es-CO")}).`
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

      // Preparar arreglo de pagos/abonos en cascada
      let abonosLiquidacion: Array<{
        monto: number;
        metodoPago: string;
        montoRecibido?: number | null;
        vueltasEntregadas?: number | null;
        referenciaComprobante?: string | null;
        notas?: string | null;
      }> = [];

      if (pagosAplicados.length > 0) {
        abonosLiquidacion = pagosAplicados.map((p) => ({
          monto: p.monto,
          metodoPago: p.metodoPago,
          montoRecibido: p.montoRecibido ?? null,
          vueltasEntregadas: p.vueltasEntregadas ?? null,
          referenciaComprobante: p.referencia || undefined,
          notas: p.notas || `Liquidación ${p.metodoPago}`,
        }));
      } else if (totalACobrar > 0) {
        const efRecibido = Number(efectivoRecibido) || totalACobrar;
        if (metodoPago === "EFECTIVO" && efRecibido < totalACobrar) {
          setMensajeError(
            `El efectivo recibido (${efRecibido.toLocaleString("es-CO")}) es inferior al total a cobrar (${totalACobrar.toLocaleString("es-CO")}).`
          );
          return;
        }
        abonosLiquidacion = [
          {
            monto: totalACobrar,
            metodoPago,
            montoRecibido: metodoPago === "EFECTIVO" ? efRecibido : undefined,
            vueltasEntregadas: metodoPago === "EFECTIVO" ? Math.max(0, efRecibido - totalACobrar) : undefined,
            referenciaComprobante: referencia.trim() || undefined,
            notas: moraACobrar > 0 ? `Liquidación de saldo y mora (${diasRetrasoSugerido} días)` : "Liquidación total",
          },
        ];
      }

      const res = await safeFetchJson<{ success?: boolean; error?: string; factura?: any }>(
        `/api/facturas/${factura.id}`,
        {
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
            metodoPagoPrincipal: abonosLiquidacion.length === 1 ? abonosLiquidacion[0].metodoPago : abonosLiquidacion.length > 1 ? "MIXTO" : metodoPago,
            metodoPago: abonosLiquidacion.length === 1 ? abonosLiquidacion[0].metodoPago : abonosLiquidacion.length > 1 ? "MIXTO" : metodoPago,
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
        }
      );

      if (!res.ok || !res.data?.success) {
        throw new Error(res.data?.error || res.error || "Error al procesar el pago en el servidor.");
      }

      // Invalidación instantánea de caché para reflejar prendas liberadas de inmediato
      invalidarCacheApi("/api/inventario");
      invalidarCacheApi("/api/facturas");
      invalidarCacheApi("/api/apartados");
      invalidarCacheApi("/api/caja");
      invalidarCacheApi("/api/dashboard");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pos_inventario_actualizado"));
        window.dispatchEvent(new Event("pos_facturas_actualizadas"));
      }

      const facturaActualizada = res.data.factura;
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
              {/* Tarjeta de Liquidación de Rubros Desacoplados */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                {/* Rubro 1: Servicio de Alquiler */}
                <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-bold flex items-center gap-1.5 text-indigo-950">
                      1. Canon de Alquiler:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ${(factura.totalFactura || 0).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                    <span>Abonos Previos al Alquiler:</span>
                    <span className="font-mono">-${(factura.totalAbonado || 0).toLocaleString("es-CO")}</span>
                  </div>
                  <div className="flex justify-between font-black text-rose-700 pt-1 border-t border-slate-100">
                    <span>Saldo Faltante de Alquiler:</span>
                    <span className="font-mono">${saldoAlquiler.toLocaleString("es-CO")}</span>
                  </div>
                </div>

                {/* Rubro 2: Recargo por Mora */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100">
                  <div className="space-y-0.5">
                    <span className="text-rose-700 font-bold block">
                      2. Recargo por Mora en Retorno:
                    </span>
                    {(diasRetrasoSugerido > 0 || horasRetrasoSugerido > 0) && (
                      <span className="text-[10px] text-slate-500 block">
                        Retraso calculado: {diasRetrasoSugerido > 0 ? `${diasRetrasoSugerido} días` : `${horasRetrasoSugerido} horas`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-rose-600 font-bold">+$</span>
                    <InputDinero
                      value={moraACobrar}
                      onValueChange={(val) => setMoraACobrar(Math.max(0, val))}
                      className="w-24 px-2 py-1 text-right rounded border border-rose-300 font-bold text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>

                {/* Rubro 3: Depósito en Custodia (Garantía Reembolsable) */}
                {depositoPactado > 0 && (
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span className="text-amber-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        3. Depósito en Custodia (Garantía):
                      </span>
                      <span className="font-mono text-slate-900">${depositoPactado.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Abonado Previamente a Custodia:</span>
                      <span className="font-mono">-${depositoAbonado.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between font-black text-amber-900 pt-1 border-t border-slate-100">
                      <span>Saldo Pendiente de Custodia:</span>
                      <span className="font-mono">${saldoDeposito.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                )}

                {/* Rubro 4: Sumatoria Consolidada para Paz y Salvo */}
                <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                  factura.tipoOperacion === "ALQUILER"
                    ? "bg-orange-50 border-orange-200 text-orange-950"
                    : factura.tipoOperacion === "SEPARE"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-950"
                    : "bg-emerald-50 border-emerald-200 text-emerald-950"
                }`}>
                  <div>
                    <strong className="text-xs uppercase block font-black">
                      Total Exigible para Paz y Salvo:
                    </strong>
                    <span className="text-[10.5px] opacity-80">
                      Saldo (${saldoAlquiler.toLocaleString("es-CO")}) + Mora (${moraACobrar.toLocaleString("es-CO")}){saldoDeposito > 0 ? ` + Custodia ($${saldoDeposito.toLocaleString("es-CO")})` : ""}
                    </span>
                  </div>
                  <span className="font-mono text-base font-black">
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
                        <InputDinero
                          value={montoRetenido}
                          onValueChange={(val) => setMontoRetenido(Math.min(factura.montoDeposito || 0, Math.max(0, val)))}
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

              {/* Flujo de Pagos Secuenciales en Cascada */}
              {totalACobrar > 0 && (
                <div className="space-y-3 pt-1">
                  <PanelPagosSecuenciales
                    totalExigible={totalACobrar}
                    pagos={pagosAplicados}
                    onChangePagos={setPagosAplicados}
                    metodoActivoAtajo={metodoPago}
                    onMetodoActivoAtajoChange={(m) => setMetodoPago(m as MetodoPagoPos)}
                    efectivoRecibidoAtajo={efectivoRecibido}
                    onEfectivoRecibidoAtajoChange={setEfectivoRecibido}
                    accentColor="indigo"
                    permitirSaldoPendiente={true}
                    etiquetaTotal="Total a Liquidar"
                    subtitulo="Registre uno o varios pagos para cubrir el saldo pendiente"
                  />
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
