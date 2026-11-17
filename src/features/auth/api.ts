import { clearAppLock } from '@/features/appLock/store';
import { cleanupPushForSignOut } from '@/features/notifications/cleanup';
import { clearQueryCache } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { emptyWidgetSnapshot } from '@/lib/widgets';
import { saveAndRefresh } from '@/widgets/update';

import { getGoogleIdToken } from './google';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

/** Sin metadata: el nombre se pide en el onboarding. */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

/**
 * "Continuar con Google": idToken de Google (con nonce) -> sesión de Supabase. Devuelve `null` si
 * la persona canceló (no es un error). Si la cuenta de Google tiene el mismo correo que una cuenta
 * existente, GoTrue vincula la identidad; si es nueva, el hook del servidor decide si la deja pasar.
 */
export async function signInWithGoogle() {
  const google = await getGoogleIdToken();
  if (!google) return null;
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: google.idToken,
    nonce: google.rawNonce,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  // Antes de cerrar sesión (después ya no hay permiso para quitar el token).
  await cleanupPushForSignOut();
  // Los widgets pasan a invitar a iniciar sesión (best effort, sin bloquear).
  void saveAndRefresh(emptyWidgetSnapshot('signed_out'));
  const { error } = await supabase.auth.signOut();
  // Memoria y disco: la caché persistida no debe sobrevivir a la sesión.
  await clearQueryCache().catch(() => {});
  // El bloqueo con huella es de la persona: se quita de este celular.
  await clearAppLock();
  if (error) throw error;
}

/** Cambia la contraseña de la sesión actual. */
export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
