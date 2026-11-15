/**
 * Lógica pura de "Continuar con Google": clasificar los fallos de la librería nativa y armar el
 * nonce. El módulo nativo se carga aparte (src/features/auth/google.ts) para poder probar esto
 * sin él.
 */

/** Los códigos de `react-native-nitro-google-signin` (`statusCodes`) que nos importan. */
const CANCELLED_CODES = new Set(['SIGN_IN_CANCELLED']);
const UNAVAILABLE_CODES = new Set(['PLAY_SERVICES_NOT_AVAILABLE', 'ONE_TAP_START_FAILED']);

export type GoogleFailure = 'cancelled' | 'unavailable' | 'config' | 'other';

/** Cancelar no es un error; el resto se traduce a un mensaje en `errors.ts` por su `code`. */
export function classifyGoogleError(error: unknown): GoogleFailure {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : '';
  if (typeof code !== 'string') return 'other';
  if (CANCELLED_CODES.has(code)) return 'cancelled';
  if (UNAVAILABLE_CODES.has(code)) return 'unavailable';
  if (code === 'DEVELOPER_ERROR') return 'config';
  return 'other';
}

/** Error propio con un `code` que `errorMessage` sabe traducir. */
export function googleError(code: 'google_unavailable' | 'google_failed', cause?: unknown): Error {
  return Object.assign(new Error(code), { code, cause });
}

/**
 * Traduce lo que lance la librería: `null` si la persona canceló; si no, el error ya con `code`
 * propio. Los errores de red (u otros desconocidos) se devuelven tal cual.
 */
export function toGoogleError(error: unknown): Error | null {
  switch (classifyGoogleError(error)) {
    case 'cancelled':
      return null;
    case 'unavailable':
      return googleError('google_unavailable', error);
    case 'config':
      return googleError('google_failed', error);
    default:
      return error instanceof Error ? error : googleError('google_failed', error);
  }
}

export function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (b) => (b & 0xff).toString(16).padStart(2, '0')).join('');
}

/** Respuesta de `createAccount()` de la librería, reducida a lo que usamos. */
export type GoogleResponse = {
  type: string;
  data?: { idToken?: string | null } | null;
};

export type GoogleOutcome =
  { kind: 'success'; idToken: string } | { kind: 'cancelled' } | { kind: 'failed' };

/** Decide qué hacer con la respuesta (la librería devuelve la cancelación en vez de lanzarla). */
export function readGoogleResponse(response: GoogleResponse): GoogleOutcome {
  if (response.type === 'cancelled') return { kind: 'cancelled' };
  const idToken = response.data?.idToken;
  if (response.type === 'success' && idToken) return { kind: 'success', idToken };
  return { kind: 'failed' };
}
