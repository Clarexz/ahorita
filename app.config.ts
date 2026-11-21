import { existsSync } from 'node:fs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { ANDROID_PACKAGE, APP_NAME, APP_SCHEME } from './src/constants/app.ts';

// En CI, release-apk.yml define APP_VERSION (tag sin la "v") y APP_VERSION_CODE (run number).
const version = process.env.APP_VERSION ?? '0.0.0';
const versionCode = Number(process.env.APP_VERSION_CODE ?? '1');
// google-services.json (Firebase, para push) no va en git: release-apk.yml lo decodifica del
// secreto GOOGLE_SERVICES_JSON_BASE64. Sin él el APK compila igual, pero sin push remoto.
const googleServicesFile = existsSync('./google-services.json')
  ? './google-services.json'
  : undefined;

// Vistas previas del selector de widgets: las genera el diseño; si aún no existen se omiten.
const widgetPreview = (name: string) => {
  const path = `./assets/widgets/${name}.png`;
  return existsSync(path) ? (path as `./${string}`) : undefined;
};

// Widgets 1×1 sin fondo (D103): 40 dp es el mínimo de una celda según Android.
const WIDGET_DEFAULTS = {
  minWidth: '40dp',
  minHeight: '40dp',
  targetCellWidth: 1,
  targetCellHeight: 1,
  resizeMode: 'none',
  updatePeriodMillis: 1800000,
  widgetCategory: 'home_screen',
} as const;

// Mensaje de tu pareja: burbuja ancha, 4×1 por defecto; se estira de 3 a 4+ celdas y hasta 2 de alto
// (el plugin no tiene `minResizeWidth`: el mínimo de ancho es `minWidth`, unos 3 cuadros).
const MESSAGE_WIDGET = {
  minWidth: '180dp',
  minHeight: '40dp',
  targetCellWidth: 4,
  targetCellHeight: 1,
  maxResizeHeight: '130dp',
  resizeMode: 'horizontal|vertical',
} as const;

// Cada widget se registra dos veces con el mismo `label` y `description`: tonal y Escarcha
// (`<Nombre>Frost`, D141). Los nombres tonales no cambian: los widgets ya puestos siguen vivos.
const widgetPair = (
  name: string,
  label: string,
  description: string,
  overrides: Partial<typeof WIDGET_DEFAULTS> | typeof MESSAGE_WIDGET = {},
) =>
  [name, `${name}Frost`].map((widgetName) => ({
    name: widgetName,
    label,
    description,
    previewImage: widgetPreview(widgetName),
    ...WIDGET_DEFAULTS,
    ...overrides,
  }));

// API key de Google Maps (secreto opcional): sin ella el APK compila igual, pero el mapa de las
// memorias es el "mapa de papel" propio en lugar de Google Maps.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || undefined;

const GOOGLE_FONTS = './node_modules/@expo-google-fonts';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'ahorita',
  version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'web'],
  android: {
    package: ANDROID_PACKAGE,
    versionCode,
    adaptiveIcon: {
      backgroundColor: '#FFFDF8',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    googleServicesFile,
    // Distancia: desde la v0.13.4 se permite la ubicación precisa (D130) para saber cuándo están
    // juntos; Android deja elegir "Precisa" o "Aproximada" en el diálogo del permiso.
  },
  // Web solo se usa en desarrollo para QA visual (npm run shots).
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFDF8',
        image: './assets/images/splash-icon.png',
        imageWidth: 288,
        dark: { backgroundColor: '#141417', image: './assets/images/splash-icon-dark.png' },
      },
    ],
    'expo-secure-store',
    // Galería y cámara (stories y memorias). Ojo: no poner `microphonePermission: false`; el plugin
    // lo convierte en un bloqueo de RECORD_AUDIO en el manifiesto y anula el permiso que agrega
    // expo-audio para las respuestas en audio (el micrófono no salía en los permisos de la app).
    [
      'expo-image-picker',
      {
        cameraPermission: 'Para tomar fotos de tus stories y memorias.',
      },
    ],
    // Guardar fotos en la galería; solo imágenes. `isAccessMediaLocationEnabled` permite leer el GPS
    // del EXIF de las fotos de una memoria para proponer el lugar.
    ['expo-media-library', { granularPermissions: ['photo'], isAccessMediaLocationEnabled: true }],
    // Distancia (Fase 8, precisa desde la v0.13.4): opt-in y sin servicio en primer plano (sin
    // notificación fija). `isAndroidBackgroundLocationEnabled` pide "Permitir todo el tiempo" solo
    // si la persona elige el modo en segundo plano. Android no tiene textos de permiso en el
    // manifiesto: la explicación vive en la pantalla Distancia.
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        // Ícono pequeño de la barra de estado: blanco sobre transparente (npm run brand).
        icon: './assets/images/notification-icon.png',
        color: '#F2495C',
        defaultChannel: 'actividad',
      },
    ],
    [
      'react-native-android-widget',
      {
        fonts: [
          `${GOOGLE_FONTS}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf`,
          `${GOOGLE_FONTS}/albert-sans/400Regular/AlbertSans_400Regular.ttf`,
          `${GOOGLE_FONTS}/albert-sans/500Medium/AlbertSans_500Medium.ttf`,
          `${GOOGLE_FONTS}/albert-sans/600SemiBold/AlbertSans_600SemiBold.ttf`,
          `${GOOGLE_FONTS}/albert-sans/700Bold/AlbertSans_700Bold.ttf`,
        ],
        widgets: [
          ...widgetPair('DaysTogether', 'Días juntos', 'Cuántos días llevan juntos.'),
          ...widgetPair('PartnerMood', 'Mood de mi pareja', 'Cómo anda tu pareja ahorita.'),
          ...widgetPair(
            'Countdown',
            'La próxima vez',
            'Cuánto falta para verse o para su próxima fecha.',
          ),
          ...widgetPair(
            'PartnerStory',
            'Story de tu pareja',
            'Lo último que subió tu pareja, sin abrir la app.',
          ),
          ...widgetPair(
            'Distance',
            'Distancia',
            'A cuántos kilómetros están ahorita, o si están juntos.',
          ),
          ...widgetPair('Streak', 'Racha', 'Cuántos días llevan contestando la pregunta del día.'),
          ...widgetPair(
            'PartnerMessage',
            'Mensaje de tu pareja',
            'El mensaje que te dejó tu pareja con su mood.',
            MESSAGE_WIDGET,
          ),
        ],
      },
    ],
    // Respuestas en audio (Fase 12): solo RECORD_AUDIO; nada de grabar en segundo plano.
    [
      'expo-audio',
      {
        recordAudioAndroid: true,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    // Compartir la tarjeta-imagen de racha / tiempo juntos / juegos.
    'expo-sharing',
    // Bloqueo con huella o rostro (opcional, Otros ajustes).
    'expo-local-authentication',
    // "Continuar con Google" (react-native-nitro-google-signin) no lleva config plugin: el de la
    // librería solo sirve para iOS o para aplicar Google Services, y aquí es solo Android con el
    // Client ID web explícito (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID); el módulo se autoenlaza.
    './plugins/with-android-signing',
    ...(googleMapsApiKey
      ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    mapsEnabled: Boolean(googleMapsApiKey),
  },
});
