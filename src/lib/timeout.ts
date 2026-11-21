/**
 * `fetch` con tiempo límite real para el cliente de Supabase (D147).
 *
 * React Native en Android hace las peticiones con OkHttp **sin tiempo límite** (conexión, lectura
 * y escritura en 0 = esperar para siempre) y reutiliza conexiones abiertas. Si una conexión murió
 * en silencio (el celular en reposo, cambio de Wi-Fi a datos, el proxy cerró la conexión inactiva),
 * la siguiente petición que la usa nunca termina ni falla. Con TanStack Query, todo el que pide la
 * misma llave espera esa misma promesa: así se quedaban las stories de foto girando (v0.14.3).
 *
 * Aquí cada petición se **aborta** pasado su tope (`AbortController`), lo que cierra la conexión
 * muerta; la consulta falla con un error de red y `shouldRetry` la repite por una conexión nueva.
 */

/** Tope de una petición normal (JSON, URLs firmadas, RPC) en ms. */
export const REQUEST_TIMEOUT_MS = 20_000;
/** Tope de una subida de archivo (fotos, audio) en ms: con datos lentos tarda más. */
export const UPLOAD_TIMEOUT_MS = 120_000;

/** Error de tope de tiempo. Sin `code` ni `status`: `shouldRetry` lo reintenta como uno de red. */
export class TimeoutError extends Error {
  constructor(url = '') {
    super(`request_timeout${url ? `: ${url.split('?')[0]}` : ''}`);
    this.name = 'TimeoutError';
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** ¿Lleva un archivo? (subidas a Storage: Blob, ArrayBuffer, FormData o vista de bytes). */
export function isUpload(body: RequestInit['body']): boolean {
  if (body == null || typeof body === 'string') return false;
  return (
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

/** Tope que le toca a una petición. */
export function timeoutFor(init?: RequestInit): number {
  return isUpload(init?.body) ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
}

/** Envuelve `fetch` para que toda petición se aborte pasado su tope (respeta un `signal` propio). */
export function fetchWithTimeout(base?: FetchLike): FetchLike {
  return (input, init = {}) => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutFor(init));
    const outer = init.signal;
    const onOuterAbort = () => controller.abort();
    if (outer) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener('abort', onOuterAbort);
    }
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // `fetch` se busca al llamar (no al crear) por si alguien lo reemplaza después (pruebas).
    return (base ?? fetch)(input, { ...init, signal: controller.signal })
      .catch((error: unknown) => {
        throw timedOut ? new TimeoutError(url) : error;
      })
      .finally(() => {
        clearTimeout(timer);
        outer?.removeEventListener('abort', onOuterAbort);
      });
  };
}
