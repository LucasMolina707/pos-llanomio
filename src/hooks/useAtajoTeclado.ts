"use client";

import { useEffect, useCallback } from "react";

export type TeclaAtajo = "F2" | "F4" | "F9" | "Escape" | "Enter" | string;

export interface OpcionesAtajo {
  habilitado?: boolean;
  prevenirPorDefecto?: boolean;
}

/**
 * Hook universal para registrar atajos de teclado individuales en el navegador.
 */
export function useAtajoTeclado(
  teclaOArray: TeclaAtajo | TeclaAtajo[],
  callback: (e: KeyboardEvent) => void,
  opciones: OpcionesAtajo = {}
) {
  const { habilitado = true, prevenirPorDefecto = true } = opciones;

  const manejador = useCallback(
    (e: KeyboardEvent) => {
      if (!habilitado) return;

      const teclas = Array.isArray(teclaOArray) ? teclaOArray : [teclaOArray];
      const coincide = teclas.some((t) => {
        if (t.toLowerCase() === "esc" && e.key.toLowerCase() === "escape") return true;
        return t.toLowerCase() === e.key.toLowerCase();
      });

      if (coincide) {
        if (prevenirPorDefecto) {
          e.preventDefault();
        }
        callback(e);
      }
    },
    [teclaOArray, callback, habilitado, prevenirPorDefecto]
  );

  useEffect(() => {
    if (!habilitado) return;
    window.addEventListener("keydown", manejador);
    return () => window.removeEventListener("keydown", manejador);
  }, [manejador, habilitado]);
}

/**
 * Hook para registrar un mapa completo de atajos en una sola llamada (ej. { F2: abrirCajon, F4: cobrar, F9: cliente, Escape: cancelar }).
 */
export function useMapaAtajosTeclado(
  mapaAtajos: Record<string, (e: KeyboardEvent) => void>,
  habilitado = true
) {
  useEffect(() => {
    if (!habilitado) return;

    const handler = (e: KeyboardEvent) => {
      for (const [tecla, callback] of Object.entries(mapaAtajos)) {
        const esMatch =
          tecla.toLowerCase() === e.key.toLowerCase() ||
          (tecla.toLowerCase() === "esc" && e.key.toLowerCase() === "escape");

        if (esMatch) {
          e.preventDefault();
          callback(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mapaAtajos, habilitado]);
}

export default useAtajoTeclado;
