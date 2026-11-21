import {
  avatarSvg,
  BUBBLE_SHADOW,
  bubbleSvg,
  bubbleText,
  initialColor,
  messageLayout,
} from '../components/message';
import { FRUITS } from '@/lib/fruits';

describe('messageLayout', () => {
  it('una sola línea de mensaje con el mood debajo', () => {
    const l = messageLayout({ width: 320, height: 60 }, true);
    expect(l.lines).toBe(1);
    expect(l.showMeta).toBe(true);
  });

  it('la burbuja es delgadita: no crece con el alto de la celda', () => {
    const short = messageLayout({ width: 320, height: 60 }, true);
    const tall = messageLayout({ width: 320, height: 110 }, true);
    expect(tall.bubbleHeight).toBe(short.bubbleHeight);
    expect(short.bubbleHeight).toBeLessThanOrEqual(48);
    // Centrada en el alto del widget.
    expect(tall.bubbleTop).toBe(Math.round((110 - tall.bubbleHeight) / 2));
  });

  it('en una celda muy bajita se va el mood, no el mensaje', () => {
    const l = messageLayout({ width: 250, height: 40 }, true);
    expect(l.showMeta).toBe(false);
    expect(l.lines).toBe(1);
  });

  it('sin mood, la burbuja es todavía más delgada', () => {
    const a = messageLayout({ width: 320, height: 80 }, true);
    const b = messageLayout({ width: 320, height: 80 }, false);
    expect(b.bubbleHeight).toBeLessThan(a.bubbleHeight);
  });

  it('la burbuja cabe en el widget y la colita queda en el tramo recto', () => {
    for (const size of [
      { width: 250, height: 40 },
      { width: 250, height: 60 },
      { width: 320, height: 60 },
      { width: 320, height: 110 },
    ]) {
      for (const meta of [true, false]) {
        const l = messageLayout(size, meta);
        expect(l.bubbleLeft + l.bubbleWidth).toBeLessThanOrEqual(size.width);
        expect(l.bubbleTop + l.bubbleHeight).toBeLessThanOrEqual(size.height);
        expect(l.avatarTop + l.avatar).toBeLessThanOrEqual(size.height);
        expect(l.tailY - 5).toBeGreaterThanOrEqual(l.radius);
        expect(l.tailY + 5).toBeLessThanOrEqual(l.bodyHeight - l.radius);
        expect(l.bodyHeight + BUBBLE_SHADOW).toBe(l.bubbleHeight);
      }
    }
  });
});

describe('dibujo del mensaje', () => {
  const l = messageLayout({ width: 320, height: 60 }, true);
  const partner = 'mango';

  it('tonal: fruta al 100 % y burbuja Hueso con sombra de la fruta', () => {
    expect(avatarSvg(l, 'tonal', partner)).toContain(FRUITS[partner].hex);
    const bubble = bubbleSvg(l, 'tonal', partner);
    expect(bubble).toContain('#FFFDF8');
    expect(bubble).not.toContain('opacity');
    expect(initialColor('tonal', partner)).toBe(FRUITS[partner].on);
  });

  it('Escarcha: blanco translúcido con contorno y sin colores de fruta', () => {
    for (const svg of [avatarSvg(l, 'frost', partner), bubbleSvg(l, 'frost', partner)]) {
      expect(svg).toContain('fill-opacity');
      expect(svg).toContain('stroke-opacity');
      expect(svg).not.toContain(FRUITS[partner].hex);
      expect(svg).not.toContain('rgba(');
    }
    expect(initialColor('frost', partner)).toBe('#FFFFFF');
    expect(bubbleText('frost').message).toBe('#FFFFFF');
    expect(bubbleText('tonal').shadow).toBe(false);
  });
});
