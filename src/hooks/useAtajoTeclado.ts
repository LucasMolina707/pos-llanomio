"use client";

import { useEffect, useCallback } from "react";

export type TeclaAtajo = "F2" | "F9" | "Escape" | "Enter" | string;

export interface OpcionesAtajo {
  habilitado?: boolean;
  prevenirPorDefecto?: boolean;
}

/**
 * Hook reutilizable para registrar atajos de teclado globales en el navegador.
 * Compatible con teclas de función (F2, F9) y combinaciones.
 * Escucha eventos 'keydown' en window de forma segura.
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
      const coincide = teclas.some((t) => t.toLowerCase() === e.key.toLowerCase());

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

export default useAtajoTeclado;
