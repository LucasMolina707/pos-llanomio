"use client";

import { useEffect, useRef, useCallback } from "react";

export interface OpcionesBarcodeScanner {
  onScan: (codigo: string) => void;
  habilitado?: boolean;
  enabled?: boolean;
  maxIntervaloMs?: number; // Tiempo maximo entre pulsaciones para considerarse pistola laser (default: 45ms)
  longitudMinima?: number; // Longitud minima del codigo escaneado (default: 3)
}

/**
 * Hook para deteccion automatica de pistolas lectoras de codigo de barras USB.
 * Las pistolas envian rafagas ultrarrapidas (<45ms entre caracteres) finalizadas con 'Enter'.
 * Captura codigos de barras sin requerir que el usuario haga clic manual en un campo de texto.
 */
export function useBarcodeScanner({
  onScan,
  habilitado = true,
  enabled,
  maxIntervaloMs = 45,
  longitudMinima = 3,
}: OpcionesBarcodeScanner) {
  const activo = enabled !== undefined ? enabled : habilitado;
  const bufferRef = useRef<string[]>([]);
  const ultimoTiempoRef = useRef<number>(0);
  const callbackRef = useRef(onScan);

  useEffect(() => {
    callbackRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!activo) return;

      const ahora = Date.now();
      const tiempoTranscurrido = ahora - ultimoTiempoRef.current;
      ultimoTiempoRef.current = ahora;

      // Si ha pasado mucho tiempo desde la ultima tecla, reiniciar buffer
      if (tiempoTranscurrido > maxIntervaloMs * 2) {
        bufferRef.current = [];
      }

      // Finalizador de lectura: Tecla Enter
      if (e.key === "Enter") {
        if (bufferRef.current.length >= longitudMinima) {
          const codigoCompleto = bufferRef.current.join("").trim();
          bufferRef.current = [];

          if (codigoCompleto.length >= longitudMinima) {
            e.preventDefault();
            e.stopPropagation();
            callbackRef.current(codigoCompleto);
          }
        } else {
          bufferRef.current = [];
        }
        return;
      }

      // Solo acumular caracteres imprimibles de longitud 1
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Si el caracter entra en menos de maxIntervaloMs o es el primer caracter
        if (bufferRef.current.length === 0 || tiempoTranscurrido <= maxIntervaloMs) {
          bufferRef.current.push(e.key);
        } else {
          // Si fue mas lento, reiniciar con este nuevo caracter
          bufferRef.current = [e.key];
        }
      }
    },
    [habilitado, maxIntervaloMs, longitudMinima]
  );

  useEffect(() => {
    if (!habilitado) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleKeyDown, habilitado]);
}

export default useBarcodeScanner;

