// Geometría y dibujo (cadenas SVG) del widget "Mensaje de tu pareja": un círculo con la inicial y
// una burbuja con colita hacia él. Todo en dp para que el widget real, la vista previa de la app
// y el script de vistas previas dibujen exactamente lo mismo. Mismas reglas que svg.ts para
// AndroidSVG (sin `rgba()`, sin `<text>`: la inicial y el mensaje son `TextWidget`).
import { FRUITS, type FruitKey } from '@/lib/fruits';
import type { WidgetStyle } from '@/lib/widgets';
import { lightColors } from '@/theme/tokens';

import { FROST, frostPiece, shade, TONAL_OFFSET } from './svg';

export type MessageSize = { width: number; height: number };

/** Aire alrededor del widget (dp). */
const PAD_X = 4;
const PAD_Y = 2;
/** Ancho de la colita y alto de su base (dp). */
const TAIL_W = 7;
const TAIL_H = 12;
/** Sombra tonal de la burbuja (dp): más sutil que la de las formas del lienzo de 100. */
export const BUBBLE_SHADOW = 3;
/** Relleno interior de la burbuja (dp). */
const PAD_IN = 5;
const PAD_IN_X = 10;
const AVATAR_MAX = 44;
const AVATAR_MIN = 30;
const RADIUS_MAX = 16;
const META_HEIGHT = 13;
const MAX_LINES = 4;

export type MessageLayout = {
  /** Diámetro del círculo de la inicial y su esquina superior izquierda (dp). */
  avatar: number;
  avatarTop: number;
  avatarLeft: number;
  /** Caja de la burbuja (incluye la colita a la izquierda y la sombra tonal abajo). */
  bubbleLeft: number;
  bubbleWidth: number;
  bubbleHeight: number;
  /** Cuerpo de la burbuja sin colita ni sombra. */
  bodyHeight: number;
  radius: number;
  /** Altura (en la caja de la burbuja) a la que apunta la colita. */
  tailY: number;
  fontSize: number;
  metaSize: number;
  initialSize: number;
  lineHeight: number;
  /** Líneas máximas del mensaje (2 en una celda de alto, hasta 4 si el widget es más alto). */
  lines: number;
  /** Si cabe la línea del mood debajo del mensaje. */
  showMeta: boolean;
  /** Relleno del texto dentro de la caja de la burbuja. */
  textLeft: number;
  textRight: number;
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Reparte el espacio de un widget de `size` dp (de 3×1 a 4×2 celdas o más). */
export function messageLayout(size: MessageSize, hasMeta: boolean): MessageLayout {
  const height = Math.max(36, Math.floor(size.height));
  const width = Math.max(120, Math.floor(size.width));
  const bubbleHeight = height - PAD_Y * 2;
  const bodyHeight = bubbleHeight - BUBBLE_SHADOW;
  const avatar = Math.round(Math.min(AVATAR_MAX, Math.max(AVATAR_MIN, bodyHeight)));
  const avatarLeft = PAD_X;
  const bubbleLeft = avatarLeft + avatar + 1;
  const bubbleWidth = Math.max(60, width - bubbleLeft - PAD_X);
  // En una celda el círculo va centrado con la burbuja; más alto, arriba junto a la colita.
  const avatarTop =
    PAD_Y + (bodyHeight <= avatar + 24 ? Math.max(0, Math.round((bodyHeight - avatar) / 2)) : 0);
  const radius = Math.min(RADIUS_MAX, Math.floor(bodyHeight / 2));
  const tailY = clamp(
    avatarTop - PAD_Y + avatar / 2,
    radius + TAIL_H / 2,
    Math.max(radius + TAIL_H / 2, bodyHeight - radius - TAIL_H / 2),
  );

  const tall = height >= 90;
  const fontSize = tall ? 14 : 12.5;
  const lineHeight = Math.ceil(fontSize * 1.2);
  const available = bodyHeight - PAD_IN * 2;
  let showMeta = hasMeta;
  let lines = Math.floor((available - (showMeta ? META_HEIGHT : 0)) / lineHeight);
  if (showMeta && lines < 2 && Math.floor(available / lineHeight) >= 2) {
    // Con el mood no caben dos líneas de mensaje: gana el mensaje.
    showMeta = false;
    lines = Math.floor(available / lineHeight);
  }
  lines = clamp(lines, 1, MAX_LINES);

  return {
    avatar,
    avatarTop,
    avatarLeft,
    bubbleLeft,
    bubbleWidth,
    bubbleHeight,
    bodyHeight,
    radius,
    tailY: Math.round(tailY * 10) / 10,
    fontSize,
    metaSize: 10.5,
    initialSize: Math.round(avatar * 0.46),
    lineHeight,
    lines,
    showMeta,
    textLeft: TAIL_W + PAD_IN_X,
    textRight: PAD_IN_X,
  };
}

const svgOpen = (w: number, h: number, viewBox: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(w))}" ` +
  `height="${Math.max(1, Math.round(h))}" viewBox="${viewBox}">`;

/** Círculo de la inicial: fruta de tu pareja (tonal) o blanco translúcido (Escarcha). */
export function avatarSvg(l: MessageLayout, style: WidgetStyle, partner: FruitKey): string {
  const r = 46;
  const d = `M${50 - r} 50 a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const fill = FRUITS[partner].hex;
  const inner =
    style === 'frost'
      ? frostPiece(d, FROST.me)
      : `<path d="${d}" transform="translate(0,${TONAL_OFFSET})" fill="${shade(fill)}"/>` +
        `<path d="${d}" fill="${fill}"/>`;
  return `${svgOpen(l.avatar, l.avatar, '-2 -2 104 104')}${inner}</svg>`;
}

/** Color de la inicial: `on` de la fruta (tonal) o blanco (Escarcha). */
export const initialColor = (style: WidgetStyle, partner: FruitKey): string =>
  style === 'frost' ? '#FFFFFF' : FRUITS[partner].on;

/** Trazo de la burbuja con su colita a la izquierda; `inset` deja lugar al contorno. */
function bubblePath(l: MessageLayout, inset: number): string {
  const x0 = TAIL_W;
  const x1 = l.bubbleWidth - inset;
  const y0 = inset;
  const y1 = l.bodyHeight - inset;
  const r = Math.max(1, l.radius - inset);
  const ty = l.tailY;
  const half = TAIL_H / 2;
  return (
    `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1 - r} ` +
    `A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r} ` +
    `V${ty + half} L${inset} ${ty} L${x0} ${ty - half} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`
  );
}

/**
 * Burbuja con colita. Tonal: Hueso con una sombra tonal sutil de la fruta de tu pareja debajo.
 * Escarcha: blanco translúcido con el mismo contorno fino que las formas.
 */
export function bubbleSvg(l: MessageLayout, style: WidgetStyle, partner: FruitKey): string {
  const open = svgOpen(l.bubbleWidth, l.bubbleHeight, `0 0 ${l.bubbleWidth} ${l.bubbleHeight}`);
  if (style === 'frost') {
    return `${open}${frostPiece(bubblePath(l, 1), FROST.fill)}</svg>`;
  }
  const d = bubblePath(l, 0);
  return (
    `${open}<path d="${d}" transform="translate(0,${BUBBLE_SHADOW})" fill="${shade(FRUITS[partner].hex)}"/>` +
    `<path d="${d}" fill="${lightColors.bg}"/></svg>`
  );
}

/** Colores del texto de la burbuja. */
export function bubbleText(style: WidgetStyle): { message: string; meta: string; shadow: boolean } {
  return style === 'frost'
    ? { message: '#FFFFFF', meta: 'rgba(255,255,255,0.8)', shadow: true }
    : { message: lightColors.ink, meta: lightColors.inkMuted, shadow: false };
}
