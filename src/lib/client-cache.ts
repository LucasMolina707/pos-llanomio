/**
 * Cache Ligero en Memoria de Cliente (Stale-While-Revalidate)
 * Proporciona carga en 0 milisegundos entre navegaciones de páginas
 * con actualización silenciosa en segundo plano e invalidación reactiva.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

// TTL predeterminado: 30 segundos
const DEFAULT_TTL_MS = 30 * 1000;

export interface FetchCacheOptions extends RequestInit {
  ttlMs?: number;
  forceRefresh?: boolean;
}

/**
 * Realiza un fetch con caché en memoria del cliente.
 * Si los datos existen en memoria y están vigentes, retorna en 0 ms.
 * Si están stale (antiguos), retorna el contenido en caché de inmediato y
 * dispara una actualización silenciosa en segundo plano.
 */
export async function fetchConCache<T>(
  url: string,
  options: FetchCacheOptions = {}
): Promise<{ ok: boolean; data: T | null; fromCache: boolean; error?: string }> {
  if (typeof window === "undefined") {
    // Si corre en SSR, pasar directo al fetch nativo
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      return { ok: res.ok, data, fromCache: false };
    } catch (err) {
      return {
        ok: false,
        data: null,
        fromCache: false,
        error: err instanceof Error ? err.message : "Error de red",
      };
    }
  }

  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false, ...fetchOptions } = options;
  const now = Date.now();
  const cached = memoryCache.get(url) as CacheEntry<T> | undefined;

  // Si existe en caché y no se forza refresco
  if (cached && !forceRefresh) {
    const isFresh = now - cached.timestamp < ttlMs;
    if (isFresh) {
      return { ok: true, data: cached.data, fromCache: true };
    }

    // Stale-while-revalidate: retornar dato existente y refrescar silenciosamente
    revalidarEnSegundoPlano<T>(url, fetchOptions);
    return { ok: true, data: cached.data, fromCache: true };
  }

  // Si hay una petición en curso idéntica, deduplicar
  if (pendingRequests.has(url)) {
    try {
      const data = (await pendingRequests.get(url)) as T;
      return { ok: true, data, fromCache: true };
    } catch (err) {
      return {
        ok: false,
        data: null,
        fromCache: false,
        error: err instanceof Error ? err.message : "Error de red",
      };
    }
  }

  // Ejecutar petición fresca
  try {
    const promise = (async () => {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    })();

    pendingRequests.set(url, promise);
    const data = await promise;
    memoryCache.set(url, { data, timestamp: Date.now() });
    pendingRequests.delete(url);

    return { ok: true, data, fromCache: false };
  } catch (err) {
    pendingRequests.delete(url);
    // Si falló pero había caché previa, fallback seguro
    if (cached) {
      return { ok: true, data: cached.data, fromCache: true };
    }
    return {
      ok: false,
      data: null,
      fromCache: false,
      error: err instanceof Error ? err.message : "Error en conexión",
    };
  }
}

/**
 * Revalidación silenciosa en background sin bloquear la interfaz
 */
async function revalidarEnSegundoPlano<T>(url: string, fetchOptions: RequestInit): Promise<void> {
  if (pendingRequests.has(url)) return;

  try {
    const promise = (async () => {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    })();

    pendingRequests.set(url, promise);
    const data = await promise;
    memoryCache.set(url, { data, timestamp: Date.now() });
  } catch {
    // Falla silenciosa: preserva la caché anterior
  } finally {
    pendingRequests.delete(url);
  }
}

/**
 * Invalida entradas de caché que inicien con el prefijo indicado.
 * Ejemplo: invalidarCache('/api/clientes')
 */
export function invalidarCache(prefijo?: string): void {
  if (!prefijo) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefijo)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Actualiza directamente una entrada en caché sin requerir fetch.
 */
export function setCacheData<T>(url: string, data: T): void {
  memoryCache.set(url, { data, timestamp: Date.now() });
}
