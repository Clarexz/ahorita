import {
  CLASSIC_FRUIT_KEYS,
  FRUIT_GROUPS,
  FRUIT_KEYS,
  FRUITS,
  contrastRatio,
  fruitClash,
  fruitOptions,
  fruitSections,
  isFruitKey,
  onColor,
  resolveFruits,
  tint,
} from '../fruits';

describe('frutas', () => {
  it('tiene 40 frutas y cada sugerida es de otro color y compatible', () => {
    expect(FRUIT_KEYS).toHaveLength(40);
    expect(new Set(FRUIT_KEYS).size).toBe(40);
    for (const key of FRUIT_KEYS) {
      const suggested = FRUITS[FRUITS[key].suggested];
      expect(suggested.group).not.toBe(FRUITS[key].group);
      expect(fruitClash(key, suggested.key)).toBeNull();
    }
  });

  it('las 7 del manual conservan su color, su texto encima y su sugerida', () => {
    expect(
      CLASSIC_FRUIT_KEYS.map((k) => [k, FRUITS[k].hex, FRUITS[k].on, FRUITS[k].suggested]),
    ).toEqual([
      ['sandia', '#F2495C', '#1B1B1F', 'mango'],
      ['mango', '#FFC24B', '#1B1B1F', 'sandia'],
      ['mandarina', '#FF8A3D', '#1B1B1F', 'uva'],
      ['limon', '#C5DC3A', '#1B1B1F', 'pitaya'],
      ['uva', '#8B5CF6', '#FFFDF8', 'limon'],
      ['arandano', '#3F6BFF', '#FFFDF8', 'mandarina'],
      ['pitaya', '#E83E9C', '#1B1B1F', 'limon'],
    ]);
  });

  it('cada color tiene al menos 4 frutas y el texto encima se lee (contraste >= 4)', () => {
    for (const group of FRUIT_GROUPS) {
      expect(FRUIT_KEYS.filter((k) => FRUITS[k].group === group).length).toBeGreaterThanOrEqual(4);
    }
    for (const key of FRUIT_KEYS) {
      expect(contrastRatio(FRUITS[key].hex, FRUITS[key].on)).toBeGreaterThanOrEqual(4);
      expect(FRUITS[key].hex).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(onColor('#FFFFFF')).toBe('#1B1B1F');
    expect(onColor('#000000')).toBe('#FFFDF8');
  });

  it('las del mismo color conviven; solo choca la misma', () => {
    expect(fruitClash('fresa', 'sandia')).toBeNull();
    expect(fruitClash('kiwi', 'aguacate')).toBeNull();
    expect(fruitClash('arandano', 'zarzamora')).toBeNull();
    expect(fruitClash('manzana_roja', 'manzana_verde')).toBeNull();
    expect(fruitClash('coco', 'platano')).toBeNull();
  });

  it('fruitSections agrupa todas en el orden de los grupos', () => {
    const sections = fruitSections('mango');
    expect(sections.map((s) => s.group)).toEqual([...FRUIT_GROUPS]);
    expect(sections.flatMap((s) => s.options.map((o) => o.fruit.key))).toEqual([...FRUIT_KEYS]);
    const yellow = sections.find((s) => s.group === 'amarillo')!;
    expect(yellow.label).toBe('Amarillas');
    expect(yellow.options.filter((o) => o.blocked).map((o) => o.fruit.key)).toEqual(['mango']);
  });

  it('bloquea solo la misma fruta', () => {
    expect(fruitClash('uva', 'uva')).toBe('same');
    expect(fruitClash('sandia', 'pitaya')).toBeNull();
    expect(fruitClash('mango', 'limon')).toBeNull();
    expect(fruitClash('sandia', 'mango')).toBeNull();
    expect(fruitClash('uva', 'limon')).toBeNull();
  });

  it('valida llaves', () => {
    expect(isFruitKey('pitaya')).toBe(true);
    expect(isFruitKey('fresa')).toBe(true);
    expect(isFruitKey('kiwano')).toBe(false);
    expect(isFruitKey(null)).toBe(false);
  });
});

describe('resolveFruits', () => {
  const A = { id: 'aaa', fruit: null };
  const B = { id: 'bbb', fruit: null };

  it('sin pareja usa la tuya o Sandía', () => {
    expect(resolveFruits(A, null)).toEqual({ me: 'sandia', partner: null });
    expect(resolveFruits({ id: 'x', fruit: 'uva' }, null)).toEqual({ me: 'uva', partner: null });
  });

  it('sin elegir: Sandía para el id menor y Mango para el mayor, igual en los dos celulares', () => {
    expect(resolveFruits(A, B)).toEqual({ me: 'sandia', partner: 'mango' });
    expect(resolveFruits(B, A)).toEqual({ me: 'mango', partner: 'sandia' });
  });

  it('si solo uno eligió, el otro toma la sugerida', () => {
    expect(resolveFruits({ ...A, fruit: 'uva' }, B)).toEqual({ me: 'uva', partner: 'limon' });
    expect(resolveFruits(B, { ...A, fruit: 'uva' })).toEqual({ me: 'limon', partner: 'uva' });
  });

  it('si eligieron la misma, el id menor se queda con la suya', () => {
    const a = { id: 'aaa', fruit: 'sandia' };
    const b = { id: 'bbb', fruit: 'sandia' };
    expect(resolveFruits(a, b)).toEqual({ me: 'sandia', partner: 'mango' });
    expect(resolveFruits(b, a)).toEqual({ me: 'mango', partner: 'sandia' });
  });

  it('si son del mismo color pero distintas, conserva cada quien la suya', () => {
    const a = { id: 'aaa', fruit: 'sandia' };
    const b = { id: 'bbb', fruit: 'fresa' };
    expect(resolveFruits(a, b)).toEqual({ me: 'sandia', partner: 'fresa' });
  });

  it('ignora valores desconocidos', () => {
    expect(resolveFruits({ id: 'aaa', fruit: 'kiwano' }, B)).toEqual({
      me: 'sandia',
      partner: 'mango',
    });
  });
});

describe('fruitOptions', () => {
  it('marca bloqueadas y sugerida según la fruta de tu pareja', () => {
    const opts = fruitOptions('sandia');
    const by = Object.fromEntries(opts.map((o) => [o.fruit.key, o]));
    expect(by.sandia.blocked).toBe('same');
    expect(by.pitaya.blocked).toBeNull();
    expect(by.fresa.blocked).toBeNull();
    expect(by.mango.suggested).toBe(true);
    expect(by.uva.blocked).toBeNull();
  });

  it('sin pareja no bloquea nada', () => {
    expect(fruitOptions(null).every((o) => !o.blocked && !o.suggested)).toBe(true);
  });
});

describe('tint', () => {
  it('mezcla en sRGB', () => {
    expect(tint('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(tint('#F2495C', '#FFFDF8', 0)).toBe('#FFFDF8');
    expect(tint('#F2495C', '#FFFDF8', 1)).toBe('#F2495C');
  });
});
