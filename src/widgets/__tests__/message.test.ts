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
  it('en una celda de alto: dos líneas con el mood debajo', () => {
    const l = messageLayout({ width: 320, height: 60 }, true);
    expect(l.lines).toBe(2);
    expect(l.showMeta).toBe(true);
    expect(l.avatar).toBeLessThanOrEqual(44);
  });

  it('si no caben las dos líneas con el mood, gana el mensaje', () => {
    const l = messageLayout({ width: 250, height: 52 }, true);
    expect(l.showMeta).toBe(false);
    expect(l.lines).toBeGreaterThanOrEqual(2);
  });

  it('más alto, hasta cuatro líneas', () => {
    expect(messageLayout({ width: 320, height: 140 }, true).lines).toBe(4);
    expect(messageLayout({ width: 250, height: 100 }, false).lines).toBeLessThanOrEqual(4);
  });

  it('la burbuja cabe en el widget y la colita queda dentro', () => {
    for (const size of [
      { width: 250, height: 60 },
      { width: 320, height: 60 },
      { width: 320, height: 140 },
    ]) {
      const l = messageLayout(size, true);
      expect(l.bubbleLeft + l.bubbleWidth).toBeLessThanOrEqual(size.width);
      expect(l.bubbleHeight).toBeLessThanOrEqual(size.height);
      expect(l.tailY).toBeGreaterThan(0);
      expect(l.tailY).toBeLessThan(l.bodyHeight);
      expect(l.bodyHeight + BUBBLE_SHADOW).toBe(l.bubbleHeight);
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
