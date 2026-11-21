/**
 * Nombre visible de la app (siempre en minúscula, manual de marca); si cambia, se cambia aquí
 * (y `app.config.ts` lo toma de este mismo archivo).
 */
export const APP_NAME = 'ahorita';

/**
 * Identificador del paquete Android. **Definitivo**: Play Store no deja cambiarlo nunca después
 * de publicar (D138). `release-apk.yml` lo lee de aquí para validar `google-services.json`.
 */
export const ANDROID_PACKAGE = 'mx.ahorita.app';

/** Esquema para deep links (`ahorita://...`). */
export const APP_SCHEME = 'ahorita';

/** Repo de GitHub cuyos Releases publican los APK (buscador de versiones nuevas). */
export const GITHUB_REPO = 'Clarexz/ahorita';

/**
 * Canal de distribución del build (`EXPO_PUBLIC_DISTRIBUTION`, lo define `release-apk.yml`):
 * - `github` (por defecto): APK en GitHub Releases, con buscador de versiones dentro de la app.
 * - `play`: AAB para Play Store. Play prohíbe que la app se actualice por fuera de Play, así que
 *   el buscador de versiones se apaga.
 */
export const DISTRIBUTION: 'github' | 'play' =
  process.env.EXPO_PUBLIC_DISTRIBUTION === 'play' ? 'play' : 'github';

/** ¿Este build busca versiones nuevas en GitHub Releases? */
export const SELF_UPDATES_ENABLED = DISTRIBUTION === 'github';
