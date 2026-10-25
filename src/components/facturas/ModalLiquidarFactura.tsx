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
} from "lucide-react";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import { descargarPdfMediaCarta } from "@/lib/pdf-media-carta";

type MetodoPago = "EFECTIVO" | "NEQUI" | "DAVIPLATA" | "TRANSFERENCIA" | "CONSIGNACION";

interface ModalLiquidarFacturaProps {
  facturaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFacturaLiquidada?: (factura: any) => void;
}

export default function ModalLiquidarFactura({
  facturaId,
  isOpen,
  onClose,
  onFacturaLiquidada,
}: ModalLiquidarFacturaProps) {
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [factura, setFactura] = useState<any | null>(null);
  const [tipoPago, setTipoPago] = useState<"SALDO_TOTAL" | "ABONO_PARCIAL">("SALDO_TOTAL");
  const [montoAbono, setMontoAbono] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
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
        const res = await fetch(`/api/facturas/${facturaId}`);
        const data = await res.json();
        if (!cancelado && data.success) {
          setFactura(data.factura);
          setTipoPago("SALDO_TOTAL");
          setMontoAbono(String(data.factura.saldoPendiente || 0));
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
  }, [isOpen, facturaId]);

  if (!isOpen) return null;

  const saldoPendiente = factura ? Number(factura.saldoPendiente) || 0 : 0;
  const montoNumerico =
    tipoPago === "SALDO_TOTAL" ? saldoPendiente : parseFloat(montoAbono) || 0;

  const ejecutarPago = async () => {
    setMensajeError(null);

    if (!factura) return;

    if (montoNumerico <= 0) {
      setMensajeError("El monto a pagar debe ser mayor a $0.");
      return;
    }

    if (montoNumerico > saldoPendiente) {
      setMensajeError(
        `El monto ingresado ($${montoNumerico.toLocaleString("es-CO")}) supera el saldo pendiente de $${saldoPendiente.toLocaleString("es-CO")}.`
      );
      return;
    }

    try {
      setProcesando(true);

      const res = await fetch(`/api/facturas/${factura.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: montoNumerico,
          metodoPago,
          referenciaComprobante: referencia.trim() || null,
          notas:
            notas.trim() ||
            (tipoPago === "SALDO_TOTAL"
              ? "Liquidación total de saldo restante"
              : "Abono parcial registrado en caja"),
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
        const resImp = await fetch(`/api/impresion/${facturaActualizada.id}`);
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
      const msg = err instanceof Error ? err.message : "Error al registrar el pago.";
      setMensajeError(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {mostrarImpresion
                  ? "Comprobante de Pago Generado"
                  : "Liquidar Saldo / Registrar Abono"}
              </h2>
              <p className="text-xs text-slate-500">
                Factura #{factura?.numeroFactura || "..."} — Cliente: {factura?.cliente?.nombre || "Cargando..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vista A: Visor de Impresión tras Liquidar */}
        {mostrarImpresion && datosImpresion ? (
          <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {factura?.saldoPendiente <= 0
                    ? "Factura liquidada al 100% exitosamente (Paz y Salvo)"
                    : `Abono de $${montoNumerico.toLocaleString("es-CO")} registrado en caja`}
                </span>
              </div>
              <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">
                Saldo: ${factura?.saldoPendiente?.toLocaleString("es-CO") || 0}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() =>
                  descargarPdfMediaCarta(
                    datosImpresion,
                    `Comprobante_${factura?.numeroFactura}_MediaCarta.pdf`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF Media Carta</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
              >
                Cerrar Ventana
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
              <PlantillaImpresion datos={datosImpresion} onCerrar={onClose} />
            </div>
          </div>
        ) : cargandoDetalle ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p>Cargando información y saldo de la factura...</p>
          </div>
        ) : !factura ? (
          <div className="p-8 text-center text-rose-600 text-xs font-semibold">
            {mensajeError || "No se encontró la información de la factura."}
          </div>
        ) : (
          /* Vista B: Formulario de Pago / Liquidación */
          <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Resumen Financiero Actual */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Factura
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  ${factura.totalFactura?.toLocaleString("es-CO")}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Abonado
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                  ${factura.totalAbonado?.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Saldo Pendiente
                </span>
                <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                  ${saldoPendiente.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* Historial de Abonos Previos */}
            {factura.abonos && factura.abonos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Historial de Pagos Anteriores ({factura.abonos.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {factura.abonos.map((ab: any, idx: number) => (
                    <div
                      key={ab.id || idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(ab.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        {ab.cajero?.nombre && (
                          <span className="text-[10px] text-slate-500">
                            (Cajero: {ab.cajero.nombre})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {ab.metodoPago}
                        </span>
                        <strong className="text-emerald-700 font-bold">
                          ${ab.monto?.toLocaleString("es-CO")}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selección de Modalidad: Saldo Completo vs Abono Parcial */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Seleccione la modalidad de pago:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPago("SALDO_TOTAL");
                    setMontoAbono(String(saldoPendiente));
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                    tipoPago === "SALDO_TOTAL"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="text-xs font-black block">
                      Pagar Saldo Completo (100%)
                    </span>
                    <span
                      className={`text-[11px] ${
                        tipoPago === "SALDO_TOTAL" ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      Liquidación total y cierre definitivo
                    </span>
                  </div>
                  <strong className="text-sm font-mono font-black">
                    ${saldoPendiente.toLocaleString("es-CO")}
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPago("ABONO_PARCIAL");
                    setMontoAbono("");
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                    tipoPago === "ABONO_PARCIAL"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="text-xs font-black block">
                      Registrar Abono Parcial
                    </span>
                    <span
                      className={`text-[11px] ${
                        tipoPago === "ABONO_PARCIAL" ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      Abono parcial manteniendo saldo pendiente
                    </span>
                  </div>
                  <DollarSign className="w-5 h-5 opacity-70" />
                </button>
              </div>
            </div>

            {/* Input de Monto Parcial (Si aplica) */}
            {tipoPago === "ABONO_PARCIAL" && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-blue-900 block">
                  Monto del Abono Parcial (COP):
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1000"
                    max={saldoPendiente}
                    step="500"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    placeholder={`Ingrese valor (Máximo: $${saldoPendiente.toLocaleString("es-CO")})`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {parseFloat(montoAbono) > 0 && (
                  <p className="text-[11px] text-blue-700 font-medium">
                    Nuevo saldo restante: $
                    {Math.max(0, saldoPendiente - (parseFloat(montoAbono) || 0)).toLocaleString("es-CO")}
                  </p>
                )}
              </div>
            )}

            {/* Métodos de Pago */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Método de Pago Recibido:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                  { id: "NEQUI", label: "Nequi", icon: Smartphone },
                  { id: "DAVIPLATA", label: "Daviplata", icon: Wallet },
                  { id: "TRANSFERENCIA", label: "Transf.", icon: CreditCard },
                  { id: "CONSIGNACION", label: "Consig.", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const seleccionado = metodoPago === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMetodoPago(item.id as MetodoPago)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition gap-1.5 ${
                        seleccionado
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referencia o Comprobante */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">
                N° de Aprobación / Comprobante (opcional):
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej. N° de transacción Nequi o transferencia bancaria"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mensaje de Error */}
            {mensajeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mensajeError}</span>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={procesando}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={ejecutarPago}
                disabled={procesando || montoNumerico <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {procesando
                    ? "Registrando Pago en Caja..."
                    : tipoPago === "SALDO_TOTAL"
                    ? `Pagar Saldo Completo ($${saldoPendiente.toLocaleString("es-CO")}) & Finalizar`
                    : `Registrar Abono ($${montoNumerico.toLocaleString("es-CO")})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
