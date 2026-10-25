/**
 * Motor Utilitario Universal de Búsqueda Difusa (Fuzzy & Multi-Campo)
 * Soporta normalización sin acentos/diacríticos, división en tokens,
 * coincidencia por prefijo, inclusión, distancia de edición tipográfica
 * y ordenamiento estricto por puntuación de relevancia.
 */

/**
 * Normaliza un texto convirtiéndolo a minúsculas, eliminando tildes y diacríticos,
 * suprimiendo caracteres especiales y unificando espacios en blanco.
 */
export function normalizarTexto(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve diacríticos/tildes
    .replace(/[^a-z0-9\s]/g, " ") // Convierte signos y caracteres especiales en espacios
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula la distancia de edición (Levenshtein con tolerancia a transposición simple)
 * entre dos cadenas de caracteres. Retorna 0 si son idénticas, 1 para error leve,
 * o >= 2 si difieren sustancialmente.
 */
export function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;

  let edits = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      edits++;
      if (edits > 1) return 2;

      if (a.length > b.length) {
        i++;
      } else if (a.length < b.length) {
        j++;
      } else {
        // Posible transposición de dos caracteres adyacentes
        if (
          i + 1 < a.length &&
          j + 1 < b.length &&
          a[i] === b[j + 1] &&
          a[i + 1] === b[j]
        ) {
          i += 2;
          j += 2;
          continue;
        }
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }

  if (i < a.length || j < b.length) {
    edits++;
  }

  return edits;
}

/**
 * Determina si una palabra o fragmento del registro coincide de forma
 * aproximada con un token de búsqueda (tolerancia a 1 letra equivocada/invertida
 * únicamente cuando el token tiene al menos 4 caracteres para evitar falsos positivos).
 */
export function esCoincidenciaAproximada(palabra: string, token: string): boolean {
  if (!palabra || !token) return false;
  if (palabra.includes(token)) return true;
  if (token.length < 4) return false;

  if (Math.abs(palabra.length - token.length) <= 1) {
    return distanciaEdicion(palabra, token) <= 1;
  }

  if (palabra.length > token.length) {
    for (let i = 0; i <= palabra.length - token.length; i++) {
      const sub = palabra.substring(i, i + token.length);
      if (distanciaEdicion(sub, token) <= 1) return true;
    }
  }

  return false;
}

export interface EvaluacionToken {
  coincide: boolean;
  score: number;
}

/**
 * Evalúa una lista de campos de texto de un registro frente a los tokens de búsqueda.
 * Aplica criterios de ponderación por relevancia:
 * - Coincidencia exacta de prefijo en campo principal (código, documento o nombre): 100 pts
 * - Substring en campos primarios: 60 pts
 * - Substring en campos secundarios (teléfono, color, talla, etc.): 35 pts
 * - Coincidencia aproximada por Levenshtein: 15 pts
 */
export function evaluarCoincidenciaMultiCampo(
  tokens: string[],
  camposPrimarios: string[],
  camposSecundarios: string[] = []
): EvaluacionToken {
  let scoreTotal = 0;

  // Extraer todas las palabras normalizadas del registro
  const todasLasPalabras: string[] = [];
  for (const c of [...camposPrimarios, ...camposSecundarios]) {
    const palabras = normalizarTexto(c).split(" ").filter(Boolean);
    todasLasPalabras.push(...palabras);
  }

  for (const token of tokens) {
    let tokenScore = 0;
    let tokenCoincidio = false;

    // 1. Evaluar en campos primarios
    for (const c of camposPrimarios) {
      const norm = normalizarTexto(c);
      if (!norm) continue;

      if (norm.startsWith(token)) {
        tokenScore = Math.max(tokenScore, 100);
        tokenCoincidio = true;
      } else if (norm.includes(token)) {
        tokenScore = Math.max(tokenScore, 60);
        tokenCoincidio = true;
      }
    }

    // 2. Evaluar en campos secundarios
    if (tokenScore < 60) {
      for (const c of camposSecundarios) {
        const norm = normalizarTexto(c);
        if (!norm) continue;

        if (norm.startsWith(token)) {
          tokenScore = Math.max(tokenScore, 50);
          tokenCoincidio = true;
        } else if (norm.includes(token)) {
          tokenScore = Math.max(tokenScore, 35);
          tokenCoincidio = true;
        }
      }
    }

    // 3. Evaluar coincidencia aproximada/tipográfica si no hubo match directo
    if (!tokenCoincidio && token.length >= 4) {
      const aprox = todasLasPalabras.some((p) => esCoincidenciaAproximada(p, token));
      if (aprox) {
        tokenScore = 15;
        tokenCoincidio = true;
      }
    }

    if (!tokenCoincidio) {
      return { coincide: false, score: 0 };
    }

    scoreTotal += tokenScore;
  }

  return { coincide: true, score: scoreTotal };
}

/**
 * Función genérica de autofiltrado y ordenamiento difuso por relevancia.
 * Si query está vacío, devuelve todos los elementos en su orden original.
 */
export function filtrarPorRelevancia<T>(
  items: T[],
  query: string,
  camposExtractor: (item: T) => {
    primarios: (string | null | undefined)[];
    secundarios?: (string | null | undefined)[];
  }
): T[] {
  if (!items || items.length === 0) return [];
  if (!query || !query.trim()) return items;

  const tokens = normalizarTexto(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return items;

  const resultados: { item: T; score: number }[] = [];

  for (const item of items) {
    const extraidos = camposExtractor(item);
    const primarios = (extraidos.primarios || []).filter((v): v is string => Boolean(v));
    const secundarios = (extraidos.secundarios || []).filter((v): v is string => Boolean(v));

    const evaluacion = evaluarCoincidenciaMultiCampo(tokens, primarios, secundarios);
    if (evaluacion.coincide && evaluacion.score > 0) {
      resultados.push({ item, score: evaluacion.score });
    }
  }

  // Ordenar de mayor a menor puntuación de relevancia
  resultados.sort((a, b) => b.score - a.score);

  return resultados.map((r) => r.item);
}
