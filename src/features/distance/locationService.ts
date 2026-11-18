// Servicio de ubicación de "Distancia": permisos, lectura (precisa si la persona la permite) y
// envío con throttle.
// Solo Android. Nunca pide permisos por su cuenta: `requestForeground`/`requestBackground` los
// llama la pantalla Distancia cuando la persona activa la función.
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { cityFromGeocode, roundPoint, shouldSendLocation, type ShareMode } from '@/lib/distance';
import type { LatLng } from '@/lib/geo';

import { clearMyLocation, setMyLocation } from './api';
import { readLastSent, writeLastSent, writeShareMode } from './preferences';

export const LOCATION_TASK = 'distance-location-task';
/** Android limita las actualizaciones en segundo plano; con esto pedimos pocas y baratas. */
export const BACKGROUND_INTERVAL_MS = 15 * 60_000;
export const BACKGROUND_DISTANCE_M = 100;
const POSITION_TIMEOUT_MS = 15_000;
/** Una lectura reciente y buena se usa tal cual (no prende el GPS). */
const FRESH_MAX_AGE_MS = 2 * 60_000;
const FRESH_MIN_ACCURACY_M = 100;
/** Si no hay lectura nueva, sirve una de hasta 30 min (mejor que nada). */
const LAST_KNOWN_MAX_AGE_MS = 30 * 60_000;

export function isLocationSupported(): boolean {
  return Platform.OS === 'android';
}

export type PermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  /** 'undetermined' = aún no se ha pedido. */
  status: 'granted' | 'denied' | 'undetermined';
  /** Android dio la ubicación precisa (no solo la aproximada). */
  precise: boolean;
};

function toState(r: Location.LocationPermissionResponse): PermissionState {
  return {
    granted: r.granted,
    canAskAgain: r.canAskAgain,
    status: r.granted ? 'granted' : r.status === 'undetermined' ? 'undetermined' : 'denied',
    precise: r.granted && r.android?.accuracy === 'fine',
  };
}

export async function getForegroundPermission(): Promise<PermissionState> {
  return toState(await Location.getForegroundPermissionsAsync());
}
export async function getBackgroundPermission(): Promise<PermissionState> {
  return toState(await Location.getBackgroundPermissionsAsync());
}
export async function requestForegroundPermission(): Promise<PermissionState> {
  return toState(await Location.requestForegroundPermissionsAsync());
}
/** Solo después de tener el permiso en primer plano. Android manda a Ajustes ("Permitir todo el tiempo"). */
export async function requestBackgroundPermission(): Promise<PermissionState> {
  return toState(await Location.requestBackgroundPermissionsAsync());
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Punto leído con su precisión en metros (null si Android no la dio). */
export type Reading = LatLng & { accuracy: number | null };

function toReading(p: Location.LocationObject): Reading {
  return {
    ...roundPoint({ lat: p.coords.latitude, lng: p.coords.longitude }),
    accuracy: p.coords.accuracy ?? null,
  };
}

/**
 * Posición actual redondeada (~11 m). Usa una lectura de hace menos de 2 min si es buena; si no,
 * pide una nueva con precisión equilibrada (Wi-Fi y antenas, casi sin GPS) y, si tarda, cae en
 * la última conocida de hasta 30 min. Con permiso "Aproximada" Android la degrada solo.
 */
export async function readPosition(): Promise<Reading | null> {
  try {
    const fresh = await Location.getLastKnownPositionAsync({
      maxAge: FRESH_MAX_AGE_MS,
      requiredAccuracy: FRESH_MIN_ACCURACY_M,
    });
    if (fresh) return toReading(fresh);
    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );
    if (current) return toReading(current);
    const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    return last ? toReading(last) : null;
  } catch {
    return null;
  }
}

/** Nombre de la ciudad (null en web, sin red o sin resultado). */
export async function cityFor(point: LatLng): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: point.lat,
      longitude: point.lng,
    });
    return cityFromGeocode(results);
  } catch {
    return null;
  }
}

export type SendResult = 'sent' | 'skipped';

/** Manda `point` al servidor respetando el throttle (salvo `force`). Lanza si el servidor falla. */
export async function sendLocation(
  point: LatLng & { accuracy?: number | null },
  opts: { now?: number; force?: boolean } = {},
): Promise<SendResult> {
  const now = opts.now ?? Date.now();
  const rounded = roundPoint(point);
  if (!opts.force && !shouldSendLocation(await readLastSent(), rounded, now)) return 'skipped';
  const city = await cityFor(rounded);
  await setMyLocation({ lat: rounded.lat, lng: rounded.lng, city, accuracy: point.accuracy });
  await writeLastSent({ ...rounded, at: now });
  return 'sent';
}

export type ShareNowResult = SendResult | 'no_position';

/** Lee la posición y la manda. Para cuando abres la app o activas el modo. */
export async function shareNow(opts: { force?: boolean } = {}): Promise<ShareNowResult> {
  const point = await readPosition();
  if (!point) return 'no_position';
  return sendLocation(point, opts);
}

// --- Segundo plano ---------------------------------------------------------------------------

export async function isBackgroundRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Actualizaciones de baja frecuencia: precisión equilibrada (sin GPS continuo), ~100 m o 15 min,
 * agrupadas. Sin servicio en primer plano (no hay notificación fija); Android decide cuándo
 * entregarlas (en segundo plano, pocas veces por hora).
 */
export async function startBackground(): Promise<void> {
  if (await isBackgroundRunning()) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: BACKGROUND_DISTANCE_M,
    timeInterval: BACKGROUND_INTERVAL_MS,
    deferredUpdatesDistance: BACKGROUND_DISTANCE_M,
    deferredUpdatesInterval: BACKGROUND_INTERVAL_MS,
    pausesUpdatesAutomatically: true,
  });
}

export async function stopBackground(): Promise<void> {
  try {
    if (await isBackgroundRunning()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // ya estaba detenida
  }
}

// --- Cambiar de modo ------------------------------------------------------------------------

export type ApplyModeResult =
  | { ok: true; mode: ShareMode; position: boolean }
  | {
      ok: false;
      reason: 'unsupported' | 'denied' | 'background_denied';
      /** Modo que quedó guardado (p. ej. 'foreground' si falló solo el de segundo plano). */
      mode: ShareMode;
      canAskAgain: boolean;
    };

/**
 * Cambia el modo de compartir. `off` detiene la tarea y borra la fila del servidor (lanza si no
 * se pudo borrar, sin cambiar el modo guardado). `foreground`/`background` piden permiso aquí (la
 * persona ya lo eligió) y mandan la ubicación enseguida.
 */
export async function applyShareMode(userId: string, mode: ShareMode): Promise<ApplyModeResult> {
  if (!isLocationSupported()) {
    return { ok: false, reason: 'unsupported', mode: 'off', canAskAgain: false };
  }

  if (mode === 'off') {
    await stopBackground();
    await clearMyLocation();
    await writeShareMode(userId, 'off');
    return { ok: true, mode: 'off', position: false };
  }

  let fg = await getForegroundPermission();
  if (!fg.granted) fg = await requestForegroundPermission();
  if (!fg.granted) {
    return { ok: false, reason: 'denied', mode: 'off', canAskAgain: fg.canAskAgain };
  }

  let finalMode: ShareMode = mode;
  let bgFailure: ApplyModeResult | null = null;
  if (mode === 'background') {
    let bg = await getBackgroundPermission();
    if (!bg.granted) bg = await requestBackgroundPermission();
    if (bg.granted) {
      await startBackground();
    } else {
      finalMode = 'foreground';
      bgFailure = {
        ok: false,
        reason: 'background_denied',
        mode: 'foreground',
        canAskAgain: bg.canAskAgain,
      };
    }
  }
  if (finalMode === 'foreground') await stopBackground();

  await writeShareMode(userId, finalMode);
  const result = await shareNow({ force: true });
  return bgFailure ?? { ok: true, mode: finalMode, position: result !== 'no_position' };
}
