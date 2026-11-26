"use client";

import { useState, useEffect, useCallback } from "react";

export type FormatoImpresionTipo =
  | "TIRILLA"
  | "TIRILLA_58"
  | "MEDIA_CARTA"
  | "MEDIA_CARTA_DOBLE"
  | "CARTA";

export const FORMATOS_IMPRESION_VALIDOS: readonly FormatoImpresionTipo[] = [
  "TIRILLA",
  "TIRILLA_58",
  "MEDIA_CARTA",
  "MEDIA_CARTA_DOBLE",
  "CARTA",
] as const;

export const CLAVE_STORAGE_PREFERENCIAS_IMPRESION = "pos_preferencias_impresion";
export const CLAVE_STORAGE_ULTIMO_FORMATO = "pos_ultimo_formato_impresion";
export const CLAVE_STORAGE_ULTIMAS_COPIAS = "pos_ultimas_copias_impresion";
export const CLAVE_STORAGE_ULTIMA_IMPRESORA = "pos_ultima_impresora_seleccionada";
export const EVENTO_CAMBIO_PREFERENCIAS_IMPRESION = "pos_cambio_preferencias_impresion";

export interface PreferenciasImpresion {
  formato: FormatoImpresionTipo;
  numCopias: 1 | 2;
  nombreImpresora?: string;
  actualizadoEn: number;
}

export interface OpcionesFallbackImpresion {
  formatoPredeterminado?: FormatoImpresionTipo;
  tipoOperacion?: string;
  numCopias?: 1 | 2;
  nombreImpresora?: string;
}

/**
 * Validador estricto para asegurar que el formato corresponde a una opción admitida.
 */
export function esFormatoImpresionValido(val: unknown): val is FormatoImpresionTipo {
  return typeof val === "string" && FORMATOS_IMPRESION_VALIDOS.includes(val as FormatoImpresionTipo);
}

/**
 * Resuelve el formato por defecto según las reglas de negocio si no existe historial guardado.
 */
export function resolverFormatoBasePorTipoOperacion(tipoOperacion?: string): FormatoImpresionTipo {
  const tipo = (tipoOperacion || "").toUpperCase();
  if (tipo === "ALQUILER") {
    return "MEDIA_CARTA_DOBLE";
  }
  if (tipo === "SEPARE" || tipo === "APARTADO") {
    return "MEDIA_CARTA";
  }
  return "MEDIA_CARTA";
}

/**
 * Obtiene de forma segura y síncrona las preferencias de impresión guardadas en el navegador.
 * Si no hay historial previo o los datos son inválidos, recurre al fallback contextual.
 */
export function obtenerPreferenciasImpresion(
  opciones?: OpcionesFallbackImpresion
): PreferenciasImpresion {
  const formatoPorDefecto =
    opciones?.formatoPredeterminado ||
    resolverFormatoBasePorTipoOperacion(opciones?.tipoOperacion);
  const copiasPorDefecto: 1 | 2 = opciones?.numCopias === 2 ? 2 : 1;

  if (typeof window === "undefined") {
    return {
      formato: formatoPorDefecto,
      numCopias: copiasPorDefecto,
      nombreImpresora: opciones?.nombreImpresora,
      actualizadoEn: 0,
    };
  }

  try {
    // 1. Intento de lectura de la clave estructurada principal
    const rawJSON = localStorage.getItem(CLAVE_STORAGE_PREFERENCIAS_IMPRESION);
    if (rawJSON) {
      const parsed = JSON.parse(rawJSON);
      if (parsed && typeof parsed === "object") {
        const formatoValido = esFormatoImpresionValido(parsed.formato)
          ? parsed.formato
          : null;
        const copiasValidas: 1 | 2 =
          parsed.numCopias === 1 || parsed.numCopias === 2
            ? parsed.numCopias
            : copiasPorDefecto;
        const nombreImpresora =
          typeof parsed.nombreImpresora === "string" && parsed.nombreImpresora.trim()
            ? parsed.nombreImpresora.trim()
            : localStorage.getItem(CLAVE_STORAGE_ULTIMA_IMPRESORA)?.trim() ||
              opciones?.nombreImpresora;

        if (formatoValido) {
          return {
            formato: formatoValido,
            numCopias: copiasValidas,
            nombreImpresora,
            actualizadoEn: Number(parsed.actualizadoEn) || Date.now(),
          };
        }
      }
    }

    // 2. Fallback de compatibilidad: lectura de clave legacy directa
    const rawFormatoDirecto = localStorage.getItem(CLAVE_STORAGE_ULTIMO_FORMATO);
    if (rawFormatoDirecto && esFormatoImpresionValido(rawFormatoDirecto)) {
      const rawCopiasDirectas = localStorage.getItem(CLAVE_STORAGE_ULTIMAS_COPIAS);
      const numCopias: 1 | 2 =
        rawCopiasDirectas === "2" ? 2 : 1;
      const nombreImpresora =
        localStorage.getItem(CLAVE_STORAGE_ULTIMA_IMPRESORA)?.trim() ||
        opciones?.nombreImpresora;

      return {
        formato: rawFormatoDirecto,
        numCopias,
        nombreImpresora,
        actualizadoEn: Date.now(),
      };
    }
  } catch (err) {
    console.warn("Aviso: No se pudieron leer las preferencias de impresión de localStorage:", err);
  }

  return {
    formato: formatoPorDefecto,
    numCopias: copiasPorDefecto,
    nombreImpresora: opciones?.nombreImpresora,
    actualizadoEn: 0,
  };
}

/**
 * Guarda y propaga de inmediato las nuevas preferencias de impresión seleccionadas por el usuario.
 */
export function guardarPreferenciasImpresion(
  cambios: Partial<Omit<PreferenciasImpresion, "actualizadoEn">>
): PreferenciasImpresion {
  const actuales = obtenerPreferenciasImpresion();

  const nuevoFormato: FormatoImpresionTipo =
    cambios.formato && esFormatoImpresionValido(cambios.formato)
      ? cambios.formato
      : actuales.formato;

  const nuevasCopias: 1 | 2 =
    cambios.numCopias === 1 || cambios.numCopias === 2
      ? cambios.numCopias
      : actuales.numCopias;

  const nuevaImpresora: string | undefined =
    cambios.nombreImpresora !== undefined
      ? cambios.nombreImpresora?.trim() || undefined
      : actuales.nombreImpresora;

  const actualizadas: PreferenciasImpresion = {
    formato: nuevoFormato,
    numCopias: nuevasCopias,
    nombreImpresora: nuevaImpresora,
    actualizadoEn: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        CLAVE_STORAGE_PREFERENCIAS_IMPRESION,
        JSON.stringify(actualizadas)
      );
      localStorage.setItem(CLAVE_STORAGE_ULTIMO_FORMATO, nuevoFormato);
      localStorage.setItem(CLAVE_STORAGE_ULTIMAS_COPIAS, String(nuevasCopias));
      if (nuevaImpresora) {
        localStorage.setItem(CLAVE_STORAGE_ULTIMA_IMPRESORA, nuevaImpresora);
      }

      // Notificar a otras vistas/componentes en la misma ventana
      window.dispatchEvent(
        new CustomEvent(EVENTO_CAMBIO_PREFERENCIAS_IMPRESION, {
          detail: actualizadas,
        })
      );
    } catch (err) {
      console.warn("Aviso: No se pudieron persistir las preferencias de impresión en localStorage:", err);
    }
  }

  return actualizadas;
}

/**
 * Hook de React para leer y reaccionar en tiempo real a las preferencias de impresión.
 * Se sincroniza tanto con eventos internos como con el evento 'storage' de otras pestañas.
 */
export function usePreferenciasImpresion(opciones?: OpcionesFallbackImpresion) {
  const [preferencias, setPreferencias] = useState<PreferenciasImpresion>(() =>
    obtenerPreferenciasImpresion(opciones)
  );

  const formatoPredeterminado = opciones?.formatoPredeterminado;
  const tipoOperacion = opciones?.tipoOperacion;
  const numCopiasOpcion = opciones?.numCopias;
  const nombreImpresoraOpcion = opciones?.nombreImpresora;

  useEffect(() => {
    // Si cambia el tipoOperacion en caliente o no había historial, re-evaluar
    setPreferencias(
      obtenerPreferenciasImpresion({
        formatoPredeterminado,
        tipoOperacion,
        numCopias: numCopiasOpcion,
        nombreImpresora: nombreImpresoraOpcion,
      })
    );
  }, [formatoPredeterminado, tipoOperacion, numCopiasOpcion, nombreImpresoraOpcion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const manejarCambioLocal = (e: Event) => {
      const detalle = (e as CustomEvent<PreferenciasImpresion>).detail;
      if (detalle && detalle.formato) {
        setPreferencias(detalle);
      } else {
        setPreferencias(
          obtenerPreferenciasImpresion({
            formatoPredeterminado,
            tipoOperacion,
            numCopias: numCopiasOpcion,
            nombreImpresora: nombreImpresoraOpcion,
          })
        );
      }
    };

    const manejarCambioStorage = (e: StorageEvent) => {
      if (
        e.key === CLAVE_STORAGE_PREFERENCIAS_IMPRESION ||
        e.key === CLAVE_STORAGE_ULTIMO_FORMATO ||
        e.key === CLAVE_STORAGE_ULTIMAS_COPIAS ||
        e.key === CLAVE_STORAGE_ULTIMA_IMPRESORA
      ) {
        setPreferencias(
          obtenerPreferenciasImpresion({
            formatoPredeterminado,
            tipoOperacion,
            numCopias: numCopiasOpcion,
            nombreImpresora: nombreImpresoraOpcion,
          })
        );
      }
    };

    window.addEventListener(EVENTO_CAMBIO_PREFERENCIAS_IMPRESION, manejarCambioLocal);
    window.addEventListener("storage", manejarCambioStorage);

    return () => {
      window.removeEventListener(EVENTO_CAMBIO_PREFERENCIAS_IMPRESION, manejarCambioLocal);
      window.removeEventListener("storage", manejarCambioStorage);
    };
  }, [formatoPredeterminado, tipoOperacion, numCopiasOpcion, nombreImpresoraOpcion]);

  const cambiarFormato = useCallback((nuevoFormato: FormatoImpresionTipo) => {
    const act = guardarPreferenciasImpresion({ formato: nuevoFormato });
    setPreferencias(act);
  }, []);

  const cambiarNumCopias = useCallback((nuevasCopias: 1 | 2) => {
    const act = guardarPreferenciasImpresion({ numCopias: nuevasCopias });
    setPreferencias(act);
  }, []);

  const cambiarImpresora = useCallback((nombre: string) => {
    const act = guardarPreferenciasImpresion({ nombreImpresora: nombre });
    setPreferencias(act);
  }, []);

  return {
    preferencias,
    formato: preferencias.formato,
    numCopias: preferencias.numCopias,
    nombreImpresora: preferencias.nombreImpresora,
    cambiarFormato,
    cambiarNumCopias,
    cambiarImpresora,
  };
}
