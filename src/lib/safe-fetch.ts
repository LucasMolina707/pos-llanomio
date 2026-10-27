/**
 * Helper universal seguro para realizar peticiones HTTP en el cliente
 * y validar que la respuesta sea estrictamente JSON válido antes de parsear,
 * evitando de raíz el error:
 * "SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
 */

export interface SafeFetchResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResponse<T>> {
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

    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok
        ? undefined
        : (data as { error?: string; message?: string })?.error ||
          (data as { error?: string; message?: string })?.message ||
          `Error en la petición (HTTP ${res.status})`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Error de conexión con el servidor local";
    console.error(`Error en safeFetchJson a ${url}:`, err);
    return {
      ok: false,
      status: 500,
      data: null,
      error: errorMsg,
    };
  }
}
