import { nudgeCountText, parseNudgeCount } from '../nudges';

describe('parseNudgeCount', () => {
  it('acepta números y cadenas numéricas', () => {
    expect(parseNudgeCount(3)).toBe(3);
    expect(parseNudgeCount('7')).toBe(7);
  });
  it('lo raro cuenta como cero', () => {
    for (const raw of [null, undefined, 'x', -2, NaN, {}]) expect(parseNudgeCount(raw)).toBe(0);
  });
});

describe('nudgeCountText', () => {
  it('sin toques no dice nada', () => {
    expect(nudgeCountText(0, 'Chu')).toBeNull();
  });
  it('singular y plural', () => {
    expect(nudgeCountText(1, 'Chu')).toBe('Ya le mandaste 1 toque.');
    expect(nudgeCountText(2, 'Chu')).toMatch(/^Ya le mandaste 2 toques\./);
  });
  it('sube de tono conforme van más', () => {
    const texts = [1, 3, 6, 12, 30, 80].map((n) => nudgeCountText(n, 'Chu'));
    expect(new Set(texts.map((t) => t?.split('. ').slice(1).join('. '))).size).toBe(6);
    expect(nudgeCountText(12, 'Chu')).toContain('Chu');
    for (const [i, n] of [1, 3, 6, 12, 30, 80].entries()) expect(texts[i]).toContain(`${n} toque`);
  });
});
