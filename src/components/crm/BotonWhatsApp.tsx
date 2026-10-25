"use client";

import React from "react";
import { PhoneCall } from "lucide-react";
import {
  normalizarTelefonoWhatsApp,
  generarMensajeCobroWhatsApp,
} from "@/lib/whatsapp";

export interface BotonWhatsAppProps {
  telefono?: string | null;
  nombreCliente: string;
  nombrePrenda?: string;
  diasRetraso?: number;
  horasRetraso?: number;
  unidadMora?: "HORA" | "DIA";
  saldoPendiente: number;
  tipoMensaje?: "MORA" | "RECORDATORIO" | "SALDO_PENDIENTE";
  numeroFactura?: string;
  className?: string;
  mostrarTexto?: boolean;
}

/**
 * Componente Botón WhatsApp CRM
 */
export default function BotonWhatsApp({
  telefono,
  nombreCliente,
  nombrePrenda,
  diasRetraso = 0,
  horasRetraso = 0,
  unidadMora = "DIA",
  saldoPendiente,
  tipoMensaje = "MORA",
  numeroFactura,
  className = "",
  mostrarTexto = true,
}: BotonWhatsAppProps) {
  const numeroLimpio = normalizarTelefonoWhatsApp(telefono);

  if (!numeroLimpio) {
    return (
      <span
        title="Sin número telefónico válido para WhatsApp"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-60"
      >
        <PhoneCall className="w-3.5 h-3.5" />
        {mostrarTexto && <span>Sin Teléfono</span>}
      </span>
    );
  }

  const mensaje = generarMensajeCobroWhatsApp({
    nombreCliente,
    nombrePrenda,
    diasRetraso,
    horasRetraso,
    unidadMora,
    saldoPendiente,
    tipoMensaje,
    numeroFactura,
  });

  const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a
      href={urlWhatsApp}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800 transition shadow-xs active:scale-95 ${className}`}
      title={`Enviar recordatorio por WhatsApp a ${nombreCliente} (${numeroLimpio})`}
    >
      {/* Icono vectorial SVG oficial de WhatsApp */}
      <svg
        className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400 shrink-0"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.115-.515-1.745-.724-2.85-2.52-2.936-2.635-.088-.115-.718-.957-.718-1.825 0-.867.452-1.294.613-1.469.16-.175.352-.218.47-.218.118 0 .237.001.341.006.109.006.255-.041.399.303.144.346.495 1.206.538 1.294.043.088.072.19.014.303-.058.117-.087.19-.174.293-.087.103-.184.23-.263.309-.088.088-.18.184-.077.36.103.18.459.756.985 1.225.677.604 1.248.79 1.425.879.176.088.278.074.382-.045.103-.117.442-.513.56-.689.118-.175.236-.146.398-.088.16.059 1.017.479 1.192.566.175.088.293.131.336.204.043.074.043.427-.101.832zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.436 5.178L2 22l4.981-1.306C8.423 21.524 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.636 0-3.155-.49-4.43-1.328l-.317-.207-2.955.775.789-2.88-.227-.361C3.987 14.887 3.5 13.486 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
      </svg>
      {mostrarTexto && <span>Cobro WhatsApp</span>}
    </a>
  );
}
export { normalizarTelefonoWhatsApp, generarMensajeCobroWhatsApp };
