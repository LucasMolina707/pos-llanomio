/**
 * Helper universal seguro para realizar peticiones HTTP en el cliente
 * con validación estricta de JSON, deduplicación de peticiones en vuelo (Request Deduping)
 * y caché en memoria de alta velocidad (TTL) para optimizar la navegación interna.
 */

export interface SafeFetchResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export interface SafeFetchOptions extends RequestInit {
  cacheTtlMs?: number;
  forzarFresco?: boolean;
}

interface CacheEntry<T = unknown> {
  response: SafeFetchResponse<T>;
  timestamp: number;
  ttl: number;
}

// Caché en memoria en el cliente (RAM)
const memoryCache = new Map<string, CacheEntry<any>>();

// Peticiones en vuelo para deduplicar llamadas concurrentes simultáneas
const inFlightRequests = new Map<string, Promise<SafeFetchResponse<any>>>();

// TTLs inteligentes predeterminados para consultas maestras de solo lectura (en milisegundos)
const DEFAULT_TTLS: Record<string, number> = {
  "/api/empresa": 60_000,
  "/api/auth/me": 30_000,
  "/api/clientes": 15_000,
  "/api/inventario": 15_000,
};

/**
 * Invalida entradas de la caché en memoria por coincidencia exacta o por prefijo de ruta.
 * Si no se pasa argumento, limpia toda la memoria caché.
 */
export function invalidarCacheApi(prefijoOUrl?: string): void {
  if (!prefijoOUrl) {
    memoryCache.clear();
    return;
  }
  const keysToDelete: string[] = [];
  for (const key of memoryCache.keys()) {
    if (key === prefijoOUrl || key.startsWith(prefijoOUrl)) {
      keysToDelete.push(key);
    }
  }
  for (const k of keysToDelete) {
    memoryCache.delete(k);
  }
}

/**
 * Obtiene el TTL por defecto para una URL determinada si aplica.
 */
function resolverTtlPredeterminado(url: string, metodo: string): number {
  if (metodo !== "GET") return 0;
  // No cachear llamadas con parámetros de actualización forzada ni heartbeats
  if (url.includes("heartbeat=1") || url.includes("sync=true") || url.includes("force=true") || url.includes("t=")) {
    return 0;
  }
  const cleanUrl = url.split("?")[0];
  return DEFAULT_TTLS[cleanUrl] || 0;
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResponse<T>> {
  const method = (options?.method || "GET").toUpperCase();
  const cacheTtl = options?.cacheTtlMs ?? resolverTtlPredeterminado(url, method);
  const forzarFresco = Boolean(options?.forzarFresco);

  // Si es una mutación (POST, PUT, PATCH, DELETE), invalidar automáticamente la caché relacionada
  if (method !== "GET") {
    const cleanUrl = url.split("?")[0];
    invalidarCacheApi(cleanUrl);
    // Invalidaciones cruzadas habituales
    if (cleanUrl.startsWith("/api/facturas") || cleanUrl.startsWith("/api/apartados")) {
      invalidarCacheApi("/api/facturas");
      invalidarCacheApi("/api/caja");
      invalidarCacheApi("/api/inventario");
      invalidarCacheApi("/api/admin/dashboard");
    }
  }

  // 1. Verificar si hay datos válidos en caché para peticiones GET
  if (method === "GET" && cacheTtl > 0 && !forzarFresco) {
    const cached = memoryCache.get(url);
    if (cached) {
      const edad = Date.now() - cached.timestamp;
      if (edad < cached.ttl) {
        return cached.response as SafeFetchResponse<T>;
      }
      memoryCache.delete(url);
    }
  }

  // 2. Request Deduping: Si la misma petición GET ya está en curso, reutilizar la misma promesa
  if (method === "GET" && !forzarFresco && inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<SafeFetchResponse<T>>;
  }

  const fetchPromise = (async (): Promise<SafeFetchResponse<T>> => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options?.headers || {}),
        },
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        const snippet = text.slice(0, 150).replace(/\s+/g, " ");
        console.warn(
          `Respuesta no-JSON recibida desde ${url} (HTTP ${res.status}): ${snippet}`
        );
        return {
          ok: false,
          status: res.status,
          data: null,
          error: `El servidor no devolvió JSON válido en ${url} (HTTP ${res.status})`,
        };
      }

      const data = (await res.json()) as T;

      const responseObj: SafeFetchResponse<T> = {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok
          ? undefined
          : (data as { error?: string; message?: string })?.error ||
            (data as { error?: string; message?: string })?.message ||
            `Error en la petición (HTTP ${res.status})`,
      };

      // Si la petición fue exitosa y tiene TTL, guardarla en caché en memoria
      if (method === "GET" && res.ok && cacheTtl > 0) {
        memoryCache.set(url, {
          response: responseObj,
          timestamp: Date.now(),
          ttl: cacheTtl,
        });
      }

      return responseObj;
    } catch (err: unknown) {
      const esAbort =
        err instanceof Error &&
        (err.name === "AbortError" ||
          err.message?.toLowerCase().includes("aborted") ||
          err.message?.toLowerCase().includes("abort"));

      if (esAbort) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: "PETICION_ABORTADA",
        };
      }

      const errorMsg =
        err instanceof Error ? err.message : "Error de conexión con el servidor local";
      console.error(`Error en safeFetchJson a ${url}:`, err);
      return {
        ok: false,
        status: 500,
        data: null,
        error: errorMsg,
      };
    } finally {
      if (method === "GET") {
        inFlightRequests.delete(url);
      }
    }
  })();

  if (method === "GET" && !forzarFresco) {
    inFlightRequests.set(url, fetchPromise);
  }

  return fetchPromise;
}
