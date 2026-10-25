/**
 * Utilidades de sanitización, normalización de datos y deduplicación
 * para el proceso de migración de clientes e inventario desde Excel.
 */

import { CategoriaProducto, EstadoPrenda } from "@prisma/client";

/**
 * Sanitiza cualquier texto eliminando espacios redundantes y controlando valores nulos.
 * Preserva acentos, tildes y caracteres especiales del español (ñ, á, é, í, ó, ú).
 */
export function sanitizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\s+/g, " ").trim();
}

/**
 * Normaliza nombres propios a mayúsculas limpias, respetando acentos y eñes.
 * Ejemplo: "  maría   ángela peña  " -> "MARÍA ÁNGELA PEÑA"
 */
export function normalizarNombre(valor: unknown): string {
  const limpio = sanitizarTexto(valor);
  return limpio.toUpperCase();
}

/**
 * Sanitiza números de documento (Cédulas de Ciudadanía, Cédulas de Extranjería o NIT).
 * Elimina puntos, espacios y caracteres no alfanuméricos preservando el guión del dígito de verificación si existe.
 */
export function sanitizarDocumento(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let str = String(valor).trim();
  // Eliminar puntos de miles y comas
  str = str.replace(/[.,\s]/g, "");
  // Convertir a mayúsculas si tiene letras (ej. pasaportes o NITs)
  return str.toUpperCase();
}

/**
 * Normaliza números de teléfono al formato estándar colombiano (10 dígitos para celular o 7/10 para fijo).
 * Limpia prefijos como "+57", "(57)", caracteres especiales como paréntesis, guiones y espacios.
 */
export function normalizarTelefonoColombia(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let str = String(valor).trim();

  // Eliminar prefijo internacional colombiano si existe
  str = str.replace(/^\+?57\s*/, "");

  // Eliminar cualquier caracter que no sea dígito
  const digitos = str.replace(/\D/g, "");

  // Si tiene 10 dígitos (estándar móvil colombiano ej. 3101234567)
  if (digitos.length === 10) {
    return digitos;
  }

  // Si tiene 7 u 8 dígitos (fijo local), retornarlo limpio
  if (digitos.length >= 7 && digitos.length <= 12) {
    return digitos;
  }

  // Si no tiene una longitud razonable de teléfono, retornar vacío
  return digitos.length >= 7 ? digitos : "";
}

/**
 * Convierte cualquier celda de precio o tarifa a un número flotante positivo.
 * Si la celda está vacía, tiene texto inválido (ej. "N/A", "A convenir") o valor negativo, retorna el defaultVal (por defecto 0).
 */
export function parsearNumeroPositivo(valor: unknown, defaultVal: number = 0): number {
  if (valor === null || valor === undefined || valor === "") return defaultVal;

  if (typeof valor === "number") {
    return isNaN(valor) || valor < 0 ? defaultVal : valor;
  }

  // Si es cadena con signos de moneda o separadores: "$ 85.000,00" o "85,000"
  let str = String(valor).trim().replace(/[$COP\s]/gi, "");

  // Si tiene puntos como separador de miles y comas para decimales
  if (str.includes(".") && str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(".") && !str.includes(",")) {
    // Podría ser "85.000" (miles) o "85.50" (decimal)
    // En Colombia se usa típicamente punto para miles (ej. 85.000)
    const partes = str.split(".");
    if (partes.length === 2 && partes[1].length === 3) {
      str = str.replace(".", "");
    }
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) || num < 0 ? defaultVal : num;
}

/**
 * Normaliza la categoría del producto o prenda a los enums de Prisma.
 */
export function normalizarCategoria(valor: unknown): CategoriaProducto {
  const str = sanitizarTexto(valor).toUpperCase();
  if (str.includes("VENTA") || str.includes("VENDER")) {
    return CategoriaProducto.VENTA;
  }
  return CategoriaProducto.ALQUILER;
}

/**
 * Normaliza el estado de la prenda a los enums de Prisma.
 */
export function normalizarEstadoPrenda(valor: unknown): EstadoPrenda {
  const str = sanitizarTexto(valor).toUpperCase();
  if (str.includes("ALQUILAD")) return EstadoPrenda.ALQUILADO;
  if (str.includes("SEPARAD")) return EstadoPrenda.SEPARADO;
  if (str.includes("ARREGLO") || str.includes("TALLER") || str.includes("LAVADO")) {
    return EstadoPrenda.EN_ARREGLO;
  }
  return EstadoPrenda.DISPONIBLE;
}

/**
 * Deduplica un listado de registros por una clave única (ej. documento de cliente o código de producto).
 * Si encuentra duplicados, conserva el último registro procesado (más reciente) y cuenta las omisiones.
 */
export function desduplicarPorClave<T>(
  lista: T[],
  obtenerClave: (item: T) => string
): { registrosUnicos: T[]; duplicadosOmitidos: number } {
  const mapa = new Map<string, T>();
  let duplicados = 0;

  for (const item of lista) {
    const clave = obtenerClave(item);
    if (!clave) continue;

    if (mapa.has(clave)) {
      duplicados++;
    }
    // Sobrescribe para conservar el registro más reciente
    mapa.set(clave, item);
  }

  return {
    registrosUnicos: Array.from(mapa.values()),
    duplicadosOmitidos: duplicados,
  };
}
