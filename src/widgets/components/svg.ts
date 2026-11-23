// Formas de los widgets 1×1 (docs/DISENO.md §9, D128). Dos estilos con la misma geometría:
// - tonal: color de fruta al 100 % y una copia más oscura de la misma fruta desplazada hacia
//   abajo, sin brillos ni transparencias.
// - frost ("Escarcha"): monocromático, blanco translúcido plano con un contorno fino. Android no
//   deja desenfocar lo que hay detrás de un widget, así que es solo transparencia: "tú" y "tu
//   pareja" se distinguen por la opacidad, no por el color.
// El widget de mood es la **mascota**: el símbolo de la app con cara, que reacciona al mood.
// Cadenas SVG puras, sin React. Las dibuja `SvgWidget` (AndroidSVG), así que se evita
// `paint-order`, `rgba()`, `<text>` y `href` sin espacio de nombres: el dato va aparte, en un
// `TextWidget` con sombra.
import { FRUITS, tint, type FruitKey } from '@/lib/fruits';
import type { WidgetStyle } from '@/lib/widgets';

/** Lienzo de las formas: 100×100 con margen para la sombra tonal. */
const VIEWBOX = '-2 -2 104 104';
/** La mascota necesita aire alrededor para inclinarse y para sus detalles (zz, confeti, …). */
const MASCOT_VIEWBOX = '-10 -14 120 120';

export type WidgetShapeOptions = {
  /** Fruta de cada quien (tú / tu pareja). */
  me: FruitKey;
  partner: FruitKey;
  /** Tamaño en dp del cuadrado de la forma. */
  size: number;
  /** Sufijo para los ids de degradados y recortes (únicos por SVG). */
  id?: string;
  /** Estilo de dibujo (tonal si se omite). */
  style?: WidgetStyle;
};

const hex = (key: FruitKey): string => FRUITS[key].hex;

const WHITE = '#FFFFFF';
/** Tinta del tema claro: la cara de la mascota se lee sobre las 7 frutas. */
const INK = '#1B1B1F';
/** Gotas (lágrimas, sudor, baba). */
const DROP = '#9FD3FF';
/** Brillo de los ojos tiernos y lengua: marcadores que `finishFace` pinta según el estilo. */
const GLINT = '#FFFFFE';
const TONGUE = '#FF7A8A';

/** Desplazamiento (en unidades del lienzo) y oscurecimiento de la sombra tonal. */
export const TONAL_OFFSET = 4;
export const TONAL_SHADE = 0.3;

/** La misma fruta, más oscura: el color de su sombra tonal. */
export const shade = (color: string): string => tint(color, '#000000', 1 - TONAL_SHADE);

/** Una pieza tonal: sombra más oscura desplazada hacia abajo y la fruta encima. */
export function tonal(d: string, fill: string, clip = ''): string {
  const body =
    `<path d="${d}" transform="translate(0,${TONAL_OFFSET})" fill="${shade(fill)}"/>` +
    `<path d="${d}" fill="${fill}"/>`;
  return clip ? `<g clip-path="url(#${clip})">${body}</g>` : body;
}

/** Opacidades y trazo del estilo Escarcha (blanco sobre el fondo de pantalla). */
export const FROST = {
  /** Gris neutro del relleno: se lee sobre fondos claros y oscuros. */
  base: '#8A8A90',
  /** Relleno de una pieza que no es ni tuya ni de tu pareja. */
  fill: 0.38,
  /** Tu pieza: un poco más cargada. */
  me: 0.45,
  /** La pieza de tu pareja: más tenue. */
  partner: 0.32,
  /** Contorno fino de toda pieza. */
  stroke: 0.5,
  /** Grosor del contorno en el lienzo de 100. */
  strokeWidth: 1.8,
  /** Relleno de avance (media luna) sobre la base translúcida. */
  progress: 0.75,
  /** Aro de la story. */
  ring: 0.38,
  /** Rastro oscuro (lágrima, brillo) que sustituye a los detalles de color. */
  glint: 0.3,
} as const;

/** Una pieza Escarcha: blanco translúcido con contorno blanco fino, sin sombra desplazada. */
export function frostPiece(d: string, alpha: number, clip = ''): string {
  const body =
    `<path d="${d}" fill="${FROST.base}" fill-opacity="${alpha}" stroke="${WHITE}" ` +
    `stroke-opacity="${FROST.stroke}" stroke-width="${FROST.strokeWidth}" stroke-linejoin="round"/>`;
  return clip ? `<g clip-path="url(#${clip})">${body}</g>` : body;
}

const isFrost = (o: WidgetShapeOptions): boolean => o.style === 'frost';

/** Pieza de "tú" (`me`) o de tu pareja (`partner`) en el estilo de `o`. */
function piece(o: WidgetShapeOptions, role: 'me' | 'partner', d: string, clip = ''): string {
  return isFrost(o) ? frostPiece(d, FROST[role], clip) : tonal(d, hex(o[role]), clip);
}

function wrap(o: WidgetShapeOptions, defs: string, inner: string, viewBox = VIEWBOX): string {
  const px = Math.max(1, Math.round(o.size));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${px}" height="${px}" viewBox="${viewBox}">` +
    (defs ? `<defs>${defs}</defs>` : '') +
    `${inner}</svg>`
  );
}

const idOf = (o: WidgetShapeOptions, base: string): string => `${base}${o.id ?? ''}`;

/** Círculo como trazo `path`. */
const circle = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// ---------------------------------------------------------------------------
// Días juntos: corazón partido (mitad izquierda tu pareja, derecha tú).
// ---------------------------------------------------------------------------

const HEART =
  'M50 90 C18 68 8 48 8 32 C8 18 19 8 32 8 C40 8 47 12 50 19 C53 12 60 8 68 8 C81 8 92 18 92 32 C92 48 82 68 50 90 Z';

export function daysShapeSvg(o: WidgetShapeOptions): string {
  const id = idOf(o, 'd');
  const defs =
    `<clipPath id="cl${id}"><rect x="-2" y="-2" width="49.5" height="104"/></clipPath>` +
    `<clipPath id="cr${id}"><rect x="52.5" y="-2" width="49.5" height="104"/></clipPath>`;
  return wrap(o, defs, piece(o, 'partner', HEART, `cl${id}`) + piece(o, 'me', HEART, `cr${id}`));
}

// ---------------------------------------------------------------------------
// Mascota: el símbolo (dos medias lunas, izquierda tú, derecha tu pareja) con una sola cara en
// tinta que cruza la rendija. En el widget de mood siente lo que siente tu pareja: cambian la
// cara y la postura de las mitades, que se acercan o se alejan pero nunca se tocan.
// ---------------------------------------------------------------------------

export type MascotMood =
  | 'neutral'
  | 'happy'
  | 'calm'
  | 'smitten'
  | 'cuddly'
  | 'sleepy'
  | 'hungry'
  | 'excited'
  | 'cool'
  | 'party'
  | 'thinking'
  | 'meh'
  | 'angry'
  | 'stressed'
  | 'tender'
  | 'teary'
  | 'melting';

const HALF_LEFT = 'M46 4 A46 46 0 0 0 46 96 Z';
const HALF_RIGHT = 'M54 4 A46 46 0 0 1 54 96 Z';
/** Gotas de "me derrito" que se suman a cada mitad. */
const DRIPS_LEFT = ' M14 74 h7 v20 a3.5 3.5 0 0 1 -7 0Z M30 84 h7 v14 a3.5 3.5 0 0 1 -7 0Z';
const DRIPS_RIGHT = ' M66 84 h7 v12 a3.5 3.5 0 0 1 -7 0Z M80 74 h7 v18 a3.5 3.5 0 0 1 -7 0Z';

const line = (d: string, color = INK, width = 5.5): string =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" ` +
  `stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (cx: number, cy: number, r: number, color = INK): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
const heartAt = (x: number, y: number, s: number, color: string): string =>
  `<path transform="translate(${x},${y}) scale(${s}) translate(-50,-50)" d="${HEART}" fill="${color}"/>`;
const star = (cx: number, cy: number, r: number): string => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.sin(a)).toFixed(1)} ${(cy - rr * Math.cos(a)).toFixed(1)}`;
  }
  return `<path d="${d}Z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
};
const drop = (x: number, y: number): string =>
  `<path d="M${x} ${y} C${x - 4} ${y + 8} ${x - 4} ${y + 12} ${x} ${y + 12} ` +
  `C${x + 4} ${y + 12} ${x + 4} ${y + 8} ${x} ${y}Z" fill="${DROP}"/>`;
/** Detalle blanco con contorno oscuro fino: se lee sobre fondos claros y oscuros. */
const outlined = (d: string, width = 3.2): string =>
  line(d, '#000000', width + 2.4).replace('<path', '<path stroke-opacity="0.35"') +
  line(d, WHITE, width);
/** Trazo grueso translúcido (los bracitos en Escarcha). */
const softLine = (d: string, alpha: number): string =>
  `<path d="${d}" stroke="${FROST.base}" stroke-opacity="${alpha}" stroke-width="8" fill="none" ` +
  `stroke-linecap="round" stroke-linejoin="round"/>`;
const zz = (x: number, y: number, s: number): string => `M${x} ${y} h${s} l${-s} ${s} h${s}`;

const HAPPY_EYES = 'M22 48 Q30 37 38 48 M62 48 Q70 37 78 48';
const CLOSED_EYES = 'M22 44 Q30 52 38 44 M62 44 Q70 52 78 44';
const OPEN_SMILE = 'M33 60 Q50 82 67 60 Z';

type Pose = {
  /** Cuánto se separa cada mitad de la rendija (negativo: se acercan). */
  gap?: number;
  /** Inclinación de cada mitad hacia la otra, en grados. */
  lean?: number;
  /** Inclinación de toda la mascota, en grados. */
  tilt?: number;
  /** Brinco (negativo) o caída (positivo). */
  y?: number;
  blush?: boolean;
  melt?: boolean;
  face: string;
  /** Detalles alrededor (recibe las dos frutas: izquierda, derecha; `frost` en Escarcha). */
  extra?: (left: string, right: string, frost: boolean) => string;
};

export const MASCOT_POSES: Record<MascotMood, Pose> = {
  neutral: {
    face: dot(30, 46, 5.5) + dot(70, 46, 5.5) + line('M36 64 Q50 74 64 64'),
  },
  happy: {
    y: -3,
    blush: true,
    face: line(HAPPY_EYES) + `<path d="${OPEN_SMILE}" fill="${INK}"/>`,
  },
  calm: {
    gap: -2,
    face: line(CLOSED_EYES) + line('M40 64 Q50 70 60 64'),
  },
  smitten: {
    lean: 9,
    blush: true,
    face: heartAt(30, 46, 0.17, INK) + heartAt(70, 46, 0.17, INK) + line('M38 64 Q50 74 62 64'),
    extra: (l, r) => heartAt(10, 8, 0.15, l) + heartAt(90, 2, 0.12, r),
  },
  cuddly: {
    lean: 6,
    gap: -2,
    blush: true,
    face: line(HAPPY_EYES) + line('M38 62 Q50 72 62 62'),
    // Bracitos abiertos hacia afuera, pidiendo abrazo.
    extra: (l, r, frost) =>
      frost
        ? softLine('M9 63 Q-2 59 -6 45', FROST.me) +
          softLine('M91 63 Q102 59 106 45', FROST.partner)
        : line('M9 64 Q-2 60 -6 46', shade(l), 8) +
          line('M9 62 Q-2 58 -6 44', l, 8) +
          line('M91 64 Q102 60 106 46', shade(r), 8) +
          line('M91 62 Q102 58 106 44', r, 8),
  },
  sleepy: {
    tilt: 12,
    y: 4,
    face:
      line('M22 48 Q30 53 38 48 M62 48 Q70 53 78 48') +
      `<ellipse cx="50" cy="66" rx="5" ry="6" fill="${INK}"/>`,
    extra: () => outlined(zz(78, 0, 10)) + outlined(zz(94, -12, 7), 2.6),
  },
  hungry: {
    face:
      line(HAPPY_EYES) +
      `<path d="M34 58 Q50 80 66 58 Z" fill="${INK}"/>` +
      `<ellipse cx="54" cy="68" rx="7" ry="4.5" fill="${TONGUE}"/>` +
      drop(64, 66),
  },
  excited: {
    y: -4,
    face: star(30, 45, 9) + star(70, 45, 9) + `<path d="M34 60 Q50 84 66 60 Z" fill="${INK}"/>`,
  },
  cool: {
    tilt: -4,
    face:
      `<path d="M18 38 H44 V46 A10 10 0 0 1 34 56 H28 A10 10 0 0 1 18 46 Z" fill="${INK}"/>` +
      `<path d="M56 38 H82 V46 A10 10 0 0 1 72 56 H66 A10 10 0 0 1 56 46 Z" fill="${INK}"/>` +
      line('M44 41 H56', INK, 4) +
      line('M38 68 Q52 74 64 64'),
  },
  party: {
    y: -4,
    blush: true,
    face: line(HAPPY_EYES) + `<path d="M34 58 Q50 84 66 58 Z" fill="${INK}"/>`,
    extra: (l, r) =>
      dot(4, 12, 3.5, l) +
      `<rect x="88" y="4" width="7" height="7" rx="1.5" fill="${r}" transform="rotate(25 91 7)"/>` +
      dot(98, 30, 3, l) +
      `<rect x="-2" y="34" width="6" height="6" rx="1.5" fill="${r}" transform="rotate(-20 1 37)"/>`,
  },
  thinking: {
    tilt: -6,
    face: dot(34, 42, 5.5) + dot(74, 42, 5.5) + line('M40 66 H58'),
    extra: () =>
      outlined('M84 2 h0.1', 6) + outlined('M93 -4 h0.1', 6) + outlined('M102 -10 h0.1', 6),
  },
  meh: {
    face: dot(30, 46, 5.5) + dot(70, 46, 5.5) + line('M38 66 Q48 70 62 62') + drop(84, 18),
  },
  angry: {
    gap: 5,
    face:
      line('M20 36 L38 43 M80 36 L62 43') +
      dot(30, 51, 5) +
      dot(70, 51, 5) +
      line('M38 72 Q50 62 62 72'),
  },
  stressed: {
    gap: 3,
    face:
      line('M22 40 L36 47 L22 54 M78 40 L64 47 L78 54') +
      line('M36 68 Q40 63 44 68 Q48 73 52 68 Q56 63 60 68 Q62 70 64 68', INK, 4.5),
    extra: () => outlined('M-6 40 Q-10 50 -6 60', 3) + outlined('M106 40 Q110 50 106 60', 3),
  },
  tender: {
    gap: -1,
    blush: true,
    face:
      dot(30, 48, 9) +
      dot(70, 48, 9) +
      dot(27, 44, 3, GLINT) +
      dot(67, 44, 3, GLINT) +
      line('M42 70 Q46 66 50 70 Q54 74 58 70', INK, 4.5),
  },
  teary: {
    y: 3,
    face:
      line('M22 46 Q30 40 38 46 M62 46 Q70 40 78 46') +
      line('M38 70 Q50 62 62 70') +
      drop(28, 52) +
      drop(72, 52),
  },
  melting: {
    y: 3,
    melt: true,
    face: dot(30, 50, 5) + dot(70, 53, 5) + line('M34 66 Q50 74 66 62'),
  },
};

/** Pinta la cara según el estilo: en Escarcha la tinta pasa a blanco y no queda nada de color. */
function finishFace(face: string, frost: boolean): string {
  if (!frost) return face.split(GLINT).join(WHITE);
  const dark = `fill="#000000" fill-opacity="${FROST.glint}"`;
  return face
    .split(`fill="${GLINT}"`)
    .join(dark)
    .split(`fill="${TONGUE}"`)
    .join(dark)
    .split(INK)
    .join(WHITE)
    .split(DROP)
    .join(WHITE);
}

/** Mitad de la mascota con su pose; `side` -1 es la izquierda (tú), 1 la derecha (tu pareja). */
function mascotHalf(o: WidgetShapeOptions, pose: Pose, side: -1 | 1, clipId: string): string {
  const frost = isFrost(o);
  const dx = side * (pose.gap ?? 0);
  const rot = side * -(pose.lean ?? 0) + (pose.tilt ?? 0);
  const pivot = side < 0 ? 46 : 54;
  const d =
    (side < 0 ? HALF_LEFT : HALF_RIGHT) + (pose.melt ? (side < 0 ? DRIPS_LEFT : DRIPS_RIGHT) : '');
  const role = side < 0 ? 'me' : 'partner';
  const fill = hex(o[role]);
  const blushFill = frost
    ? `fill="${WHITE}" opacity="0.4"`
    : `fill="${tint(fill, '#FF3D6E', 0.55)}" opacity="0.8"`;
  const blush = pose.blush
    ? `<clipPath id="${clipId}"><path d="${d}"/></clipPath>` +
      `<ellipse cx="${side < 0 ? 20 : 80}" cy="62" rx="7" ry="4.5" ` +
      `${blushFill} clip-path="url(#${clipId})"/>`
    : '';
  return (
    `<g transform="translate(${dx},${pose.y ?? 0}) rotate(${rot} ${pivot} 96)">` +
    piece(o, role, d) +
    blush +
    `</g>`
  );
}

export function mascotSvg(o: WidgetShapeOptions & { mood?: MascotMood }): string {
  const id = idOf(o, 'm');
  const frost = isFrost(o);
  const pose = MASCOT_POSES[o.mood ?? 'neutral'];
  const left = frost ? WHITE : hex(o.me);
  const right = frost ? WHITE : hex(o.partner);
  return wrap(
    o,
    '',
    mascotHalf(o, pose, -1, `bl${id}`) +
      mascotHalf(o, pose, 1, `br${id}`) +
      `<g transform="translate(0,${pose.y ?? 0}) rotate(${pose.tilt ?? 0} 50 96)">` +
      `${finishFace(pose.face, frost)}</g>` +
      (pose.extra ? pose.extra(left, right, frost) : ''),
    MASCOT_VIEWBOX,
  );
}

// ---------------------------------------------------------------------------
// La próxima vez: media luna de tu fruta que se llena con la de tu pareja.
// ---------------------------------------------------------------------------

export const MOON = 'M6 76 A44 44 0 0 1 94 76 Z';
export const MOON_BASE = 76;
export const MOON_RADIUS = 44;

/** Nivel de llenado (0 a 1) con el que se dibuja la media luna. */
export const clampProgress = (p: number): number =>
  Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.5;

/** Coordenada Y del borde superior del llenado. */
export const fillTop = (progress: number): number =>
  MOON_BASE - MOON_RADIUS * clampProgress(progress);

export function nextShapeSvg(o: WidgetShapeOptions & { progress: number }): string {
  const id = idOf(o, 'n');
  const top = fillTop(o.progress);
  const height = MOON_BASE - top;
  const defs = `<clipPath id="cd${id}"><path d="${MOON}"/></clipPath>`;
  return wrap(
    o,
    defs,
    piece(o, 'me', MOON) +
      `<rect x="0" y="${top}" width="100" height="${height}" ` +
      (isFrost(o)
        ? `fill="${WHITE}" fill-opacity="${FROST.progress}" `
        : `fill="${hex(o.partner)}" `) +
      `clip-path="url(#cd${id})"/>` +
      `<path d="M2 82 H98" stroke="${WHITE}" stroke-width="3.5" stroke-linecap="round"/>`,
  );
}

// ---------------------------------------------------------------------------
// Distancia: dos círculos, más juntos mientras más cerca.
// ---------------------------------------------------------------------------

const DIST_R = 22;
const DIST_NEAR = 36;
const DIST_FAR = 56;
const DIST_CAP_KM = 3000;

/** Separación de los centros: de 36 (0 km) a 56 (3,000 km o más), en escala logarítmica. */
export function distanceSeparation(km: number | null | undefined): number {
  if (km == null || !Number.isFinite(km) || km < 0) return DIST_FAR - 4;
  const t = Math.min(1, Math.log10(1 + km) / Math.log10(1 + DIST_CAP_KM));
  return DIST_NEAR + (DIST_FAR - DIST_NEAR) * t;
}

export function distShapeSvg(o: WidgetShapeOptions & { km: number | null }): string {
  const sep = distanceSeparation(o.km);
  const ax = 50 - sep / 2;
  const bx = 50 + sep / 2;
  const cy = 52;
  return wrap(
    o,
    '',
    piece(o, 'me', circle(ax, cy, DIST_R)) +
      piece(o, 'partner', circle(bx, cy, DIST_R)) +
      `<path d="M${ax} ${cy - 28} Q50 ${cy - 50} ${bx} ${cy - 28}" fill="none" stroke="${WHITE}" ` +
      `stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0.1 7"/>`,
  );
}

// ---------------------------------------------------------------------------
// Story de tu pareja: foto en círculo con aro de las dos frutas y punto si hay nueva.
// ---------------------------------------------------------------------------

export function storyShapeSvg(
  o: WidgetShapeOptions & { photo: string | null; dot: boolean },
): string {
  const id = idOf(o, 's');
  const frost = isFrost(o);
  const p = hex(o.partner);
  const m = hex(o.me);
  const gradient = (gid: string, a: string, b: string) =>
    `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const defs =
    (frost ? '' : gradient(`g${id}`, p, m) + gradient(`h${id}`, shade(p), shade(m))) +
    `<clipPath id="cs${id}"><circle cx="50" cy="50" r="34"/></clipPath>`;
  // Sin foto el círculo queda en la fruta de tu pareja. La foto es contenido: siempre en color.
  const inner = o.photo
    ? `<image xlink:href="${o.photo}" x="16" y="16" width="68" height="68" ` +
      `preserveAspectRatio="xMidYMid slice" clip-path="url(#cs${id})"/>`
    : piece(o, 'partner', circle(50, 50, 30));
  const newDot = o.dot
    ? frost
      ? `<circle cx="84" cy="16" r="8" fill="${WHITE}"/>`
      : `<circle cx="84" cy="16" r="8" fill="${p}" stroke="${WHITE}" stroke-width="2.5"/>`
    : '';
  const ring = frost
    ? `<circle cx="50" cy="50" r="42" fill="none" stroke="${FROST.base}" stroke-opacity="${FROST.ring}" ` +
      `stroke-width="8"/>`
    : `<circle cx="50" cy="${50 + TONAL_OFFSET}" r="42" fill="none" stroke="url(#h${id})" stroke-width="8"/>` +
      `<circle cx="50" cy="50" r="42" fill="none" stroke="url(#g${id})" stroke-width="8"/>`;
  return wrap(o, defs, ring + inner + newDot);
}

// ---------------------------------------------------------------------------
// Racha: chispa grande (tu fruta) y chica (la de tu pareja).
// ---------------------------------------------------------------------------

const SPARK_BIG =
  'M46 4 C51 30 66 46 92 52 C66 58 51 74 46 100 C41 74 26 58 0 52 C26 46 41 30 46 4Z';
const SPARK_SMALL =
  'M80 6 C81 16 85 20 95 22 C85 24 81 28 80 38 C79 28 75 24 65 22 C75 20 79 16 80 6Z';

/** Opacidad de la chispa apagada (racha en 0). */
export const SPARK_OFF_OPACITY = 0.35;

export function streakShapeSvg(o: WidgetShapeOptions & { active: boolean }): string {
  const group = o.active ? '<g>' : `<g opacity="${SPARK_OFF_OPACITY}">`;
  return wrap(
    o,
    '',
    `${group}<g transform="translate(5,-4) scale(0.9)">${piece(o, 'me', SPARK_BIG)}</g>` +
      `<g transform="translate(2,10)">${piece(o, 'partner', SPARK_SMALL)}</g></g>`,
  );
}

// ---------------------------------------------------------------------------
// Estado vacío: la mascota tranquila.
// ---------------------------------------------------------------------------

export function emptyShapeSvg(o: WidgetShapeOptions): string {
  return mascotSvg({ ...o, mood: 'neutral' });
}
