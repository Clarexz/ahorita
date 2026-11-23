// Geometría y dibujo (cadenas SVG) del widget "Mensaje de tu pareja": un círculo con la inicial y
// una burbuja con colita hacia él. Todo en dp para que el widget real, la vista previa de la app
// y el script de vistas previas dibujen exactamente lo mismo. Mismas reglas que svg.ts para
// AndroidSVG (sin `rgba()`, sin `<text>`: la inicial y el mensaje son `TextWidget`).
import { FRUITS, type FruitKey } from '@/lib/fruits';
import type { WidgetStyle } from '@/lib/widgets';
import { lightColors } from '@/theme/tokens';

import { FROST, frostPiece, shade, TONAL_OFFSET } from './svg';

export type MessageSize = { width: number; height: number };

/** Aire a los lados del widget (dp). */
const PAD_X = 4;
/** Ancho de la colita y alto de su base (dp). */
const TAIL_W = 7;
const TAIL_H = 10;
/** Sombra tonal de la burbuja (dp): más sutil que la de las formas del lienzo de 100. */
export const BUBBLE_SHADOW = 3;
/** Relleno interior de la burbuja (dp). */
const PAD_IN = 7;
const PAD_IN_X = 10;
const AVATAR = 36;
/** Letra del mensaje (v0.16: de 13 a 15, sin la línea del mood debajo). */
const FONT_SIZE = 15;
/** Renglones del mensaje cuando la celda da para ellos. */
const MAX_LINES = 2;

export type MessageLayout = {
  /** Diámetro del círculo de la inicial y su esquina superior izquierda (dp, desde el widget). */
  avatar: number;
  avatarTop: number;
  avatarLeft: number;
  /** Caja de la burbuja (incluye la colita a la izquierda y la sombra tonal abajo). */
  bubbleLeft: number;
  bubbleTop: number;
  bubbleWidth: number;
  bubbleHeight: number;
  /** Cuerpo de la burbuja sin colita ni sombra. */
  bodyHeight: number;
  radius: number;
  /** Altura (en la caja de la burbuja) a la que apunta la colita. */
  tailY: number;
  fontSize: number;
  initialSize: number;
  lineHeight: number;
  /** Renglones del mensaje (con "…" si no cabe): 2, o 1 si la celda es muy bajita. */
  lines: number;
  /** Relleno del texto dentro de la caja de la burbuja. */
  textLeft: number;
  textRight: number;
};

/**
 * Burbuja (v0.16): solo el mensaje, a la izquierda y en hasta dos renglones; mide lo que su contenido y
 * va centrada en el alto del widget, sin importar el tamaño de la celda. Si la celda no da para
 * dos renglones, se queda en uno.
 */
export function messageLayout(size: MessageSize): MessageLayout {
  const height = Math.max(36, Math.floor(size.height));
  const width = Math.max(120, Math.floor(size.width));
  const lineHeight = Math.ceil(FONT_SIZE * 1.25);
  const bodyFor = (n: number) => PAD_IN * 2 + lineHeight * n;
  const lines = bodyFor(MAX_LINES) + BUBBLE_SHADOW <= height ? MAX_LINES : 1;
  const bodyHeight = bodyFor(lines);
  const bubbleHeight = bodyHeight + BUBBLE_SHADOW;
  const avatar = Math.min(AVATAR, height - 2);
  const avatarLeft = PAD_X;
  const bubbleLeft = avatarLeft + avatar + 1;
  const bubbleWidth = Math.max(60, width - bubbleLeft - PAD_X);
  const bubbleTop = Math.max(0, Math.round((height - bubbleHeight) / 2));
  const avatarTop = Math.max(0, bubbleTop + Math.round((bodyHeight - avatar) / 2));
  // Deja recto el tramo del costado donde sale la colita.
  const radius = Math.min(16, Math.max(4, Math.floor(bodyHeight / 2) - TAIL_H / 2 - 1));

  return {
    avatar,
    avatarTop,
    avatarLeft,
    bubbleLeft,
    bubbleTop,
    bubbleWidth,
    bubbleHeight,
    bodyHeight,
    radius,
    tailY: Math.round((bodyHeight / 2) * 10) / 10,
    fontSize: FONT_SIZE,
    initialSize: Math.round(avatar * 0.46),
    lineHeight,
    lines,
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
      ? frostPiece(d, FROST.fill)
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
export function bubbleText(style: WidgetStyle): { message: string; shadow: boolean } {
  return style === 'frost'
    ? { message: '#FFFFFF', shadow: true }
    : { message: lightColors.ink, shadow: false };
}
