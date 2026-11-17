import * as Crypto from 'expo-crypto';

import {
  bytesToHex,
  googleError,
  readGoogleResponse,
  toGoogleError,
  type GoogleResponse,
} from '@/lib/googleAuth';

/** Client ID OAuth de tipo *Web* (audiencia del idToken). Sin él no se muestra el botón. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const isGoogleSignInEnabled = GOOGLE_WEB_CLIENT_ID.length > 0;

type GoogleIdToken = { idToken: string; rawNonce: string } | null;

/**
 * Pide el idToken a Google con Credential Manager. Devuelve `null` si la persona cancela.
 * El nonce se genera por intento: a Google va su SHA-256 (queda en el token) y a Supabase el crudo.
 */
export async function getGoogleIdToken(): Promise<GoogleIdToken> {
  if (!isGoogleSignInEnabled) throw googleError('google_unavailable');
  // Carga perezosa: el módulo nativo no existe en web ni en Jest.
  const { GoogleOneTapSignIn } = await import('react-native-nitro-google-signin');
  try {
    const rawNonce = bytesToHex(await Crypto.getRandomBytesAsync(16));
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );
    GoogleOneTapSignIn.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, nonce: hashedNonce });
    await GoogleOneTapSignIn.checkPlayServices();
    // `createAccount` muestra todas las cuentas del celular (no solo las ya autorizadas).
    const outcome = readGoogleResponse(
      (await GoogleOneTapSignIn.createAccount()) as GoogleResponse,
    );
    if (outcome.kind === 'cancelled') return null;
    if (outcome.kind === 'failed') throw googleError('google_unavailable');
    return { idToken: outcome.idToken, rawNonce };
  } catch (error) {
    const mapped = toGoogleError(error);
    if (mapped === null) return null;
    throw mapped;
  }
}
