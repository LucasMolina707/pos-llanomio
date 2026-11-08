"use client";

import React, { useState, useEffect } from "react";
import {
  PauseCircle,
  PlayCircle,
  Trash2,
  X,
  Clock,
  User,
  ShoppingBag,
  Shirt,
  CalendarClock,
  AlertCircle,
  Tag,
  DollarSign,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";

export interface TicketEnEspera {
  id: string;
  fechaCreacion: string;
  modulo: "ALQUILERES" | "VENTAS" | "APARTADOS";
  cliente: {
    id: string;
    nombre: string;
    documento?: string;
    telefono?: string;
  } | null;
  itemsConteo: number;
  resumenPrendas: string;
  totalEstimado: number;
  datosCompletos: any; // Snapshot completo del estado para restaurar sin pérdidas
  notaEspera?: string;
}

interface ModalTicketsEnEsperaProps {
  abierto: boolean;
  onCerrar: () => void;
  modulo: "ALQUILERES" | "VENTAS" | "APARTADOS";
  operacionActualTieneDatos: boolean;
  onGuardarTicketActual: (nota?: string) => void;
  onRestaurarTicket: (ticket: TicketEnEspera) => void;
  storageKey?: string;
}

export default function ModalTicketsEnEspera({
  abierto,
  onCerrar,
  modulo,
  operacionActualTieneDatos,
  onGuardarTicketActual,
  onRestaurarTicket,
  storageKey = "pos_tickets_en_espera",
}: ModalTicketsEnEsperaProps) {
  const [tickets, setTickets] = useState<TicketEnEspera[]>([]);
  const [notaNueva, setNotaNueva] = useState("");
  const [mostrarConfirmacionReemplazo, setMostrarConfirmacionReemplazo] = useState<TicketEnEspera | null>(null);

  const cargarTickets = () => {
    if (typeof window === "undefined") return;
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed: TicketEnEspera[] = JSON.parse(data);
        setTickets(parsed);
      } else {
        setTickets([]);
      }
    } catch {
      setTickets([]);
    }
  };

  useEffect(() => {
    if (abierto) {
      cargarTickets();
      setNotaNueva("");
      setMostrarConfirmacionReemplazo(null);
    }
  }, [abierto, storageKey]);

  if (!abierto) return null;

  const ticketsModulo = tickets.filter((t) => t.modulo === modulo);

  const handlePausarActual = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardarTicketActual(notaNueva.trim() || undefined);
    setNotaNueva("");
    cargarTickets();
    onCerrar();
  };

  const handleEliminarTicket = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const actualizados = tickets.filter((t) => t.id !== id);
      setTickets(actualizados);
      localStorage.setItem(storageKey, JSON.stringify(actualizados));
      window.dispatchEvent(new Event("pos_tickets_actualizados"));
    } catch {}
  };

  const intentarRestaurar = (ticket: TicketEnEspera) => {
    if (operacionActualTieneDatos) {
      setMostrarConfirmacionReemplazo(ticket);
    } else {
      ejecutarRestauracion(ticket);
    }
  };

  const ejecutarRestauracion = (ticket: TicketEnEspera) => {
    try {
      // Remover ticket de la lista de pendientes
      const actualizados = tickets.filter((t) => t.id !== ticket.id);
      setTickets(actualizados);
      localStorage.setItem(storageKey, JSON.stringify(actualizados));
      window.dispatchEvent(new Event("pos_tickets_actualizados"));
      onRestaurarTicket(ticket);
      onCerrar();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shadow-xs">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Operaciones en Espera (Pausar / Reanudar)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
                  {ticketsModulo.length} en fila
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Guarde temporalmente la orden actual si llega otro cliente a devolver prendas o consultar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Formulario para Pausar la Operación Actual */}
          {operacionActualTieneDatos && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-amber-700" />
                  Pausar Orden Actual del Mostrador
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  Se liberará el mostrador inmediatamente
                </span>
              </div>

              <form onSubmit={handlePausarActual} className="flex gap-2">
                <input
                  type="text"
                  value={notaNueva}
                  onChange={(e) => setNotaNueva(e.target.value)}
                  placeholder="Nota u observación opcional (ej. 'Cliente fue al cajero', 'Probándose saco azul')..."
                  className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Pausar y Guardar</span>
                </button>
              </form>
            </div>
          )}

          {/* Confirmación si se va a reemplazar una orden con datos cargados */}
          {mostrarConfirmacionReemplazo && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>¿Deseas reemplazar la orden que tienes actualmente en pantalla?</span>
              </div>
              <p className="text-xs text-rose-700">
                Tienes datos cargados en el mostrador. Si reanudas esta orden sin pausar la actual, se perderán los datos en curso.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => ejecutarRestauracion(mostrarConfirmacionReemplazo)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Sí, Reanudar y Sobrescribir
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacionReemplazo(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de Tickets en Espera */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Órdenes Pausadas Disponibles</span>
              <span className="text-[11px] font-normal text-slate-400">
                Haz clic en una orden para reanudarla
              </span>
            </h3>

            {ticketsModulo.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay órdenes en espera en este momento.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cuando estés armando un contrato o venta y llegue otro cliente, usa el botón Pausar.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {ticketsModulo.map((ticket) => {
                  const fechaObj = new Date(ticket.fechaCreacion);
                  const horaStr = fechaObj.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => intentarRestaurar(ticket)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 transition-all shadow-2xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-mono font-bold">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {horaStr}
                          </span>

                          <span className="text-xs font-black text-slate-900 truncate">
                            {ticket.cliente?.nombre || "Cliente Ocasional / Mostrador"}
                          </span>

                          {ticket.cliente?.telefono && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              Tel: {ticket.cliente.telefono}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="font-semibold text-slate-800">
                            {ticket.itemsConteo} prenda(s) / artículo(s):
                          </span>
                          <span className="text-slate-500 truncate max-w-sm">
                            {ticket.resumenPrendas || "Sin descripción"}
                          </span>
                        </div>

                        {ticket.notaEspera && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                            Nota: {ticket.notaEspera}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                          <span className="text-xs sm:text-sm font-black font-mono text-emerald-700">
                            ${ticket.totalEstimado.toLocaleString("es-CO")}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            intentarRestaurar(ticket);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 group-hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition shadow-2xs"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Reanudar</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleEliminarTicket(ticket.id, e)}
                          title="Eliminar de la fila"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Atajo rápido: Pulsa Esc para volver al mostrador
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

