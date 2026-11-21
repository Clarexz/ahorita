import { FRUITS } from '@/lib/fruits';

import {
  clampProgress,
  FROST,
  daysShapeSvg,
  distanceSeparation,
  distShapeSvg,
  emptyShapeSvg,
  fillTop,
  MASCOT_POSES,
  mascotSvg,
  nextShapeSvg,
  SPARK_OFF_OPACITY,
  storyShapeSvg,
  shade,
  streakShapeSvg,
  TONAL_OFFSET,
  tonal,
  type MascotMood,
  type WidgetShapeOptions,
} from '../components/svg';

const base: WidgetShapeOptions = { me: 'uva', partner: 'limon', size: 60 };
const frost: WidgetShapeOptions = { ...base, style: 'frost' };

const ids = (svg: string): string[] => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

describe('tonal', () => {
  it('sombra de la misma fruta más oscura, desplazada hacia abajo, y la fruta al 100 %', () => {
    const svg = tonal('M0 0 L10 10 Z', '#F2495C');
    expect(svg).toContain(`transform="translate(0,${TONAL_OFFSET})" fill="${shade('#F2495C')}"`);
    expect(svg).toContain('fill="#F2495C"/>');
    expect(svg).not.toContain('opacity');
    expect(shade('#FFFFFF')).toBe('#B3B3B3');
  });

  it('recorte opcional', () => {
    expect(tonal('M0 0Z', '#FFFFFF', 'c1')).toContain('<g clip-path="url(#c1)">');
    expect(tonal('M0 0Z', '#FFFFFF')).not.toContain('clip-path');
  });
});

describe('compatibilidad con AndroidSVG', () => {
  const all = (o: WidgetShapeOptions) => [
    daysShapeSvg(o),
    ...(Object.keys(MASCOT_POSES) as MascotMood[]).map((mood) => mascotSvg({ ...o, mood })),
    nextShapeSvg({ ...o, progress: 0.4 }),
    distShapeSvg({ ...o, km: 800 }),
    storyShapeSvg({ ...o, photo: 'data:image/jpeg;base64,AAAA', dot: true }),
    storyShapeSvg({ ...o, photo: null, dot: false }),
    streakShapeSvg({ ...o, active: true }),
    emptyShapeSvg(o),
  ];

  it('no usa paint-order, rgba() ni href sin espacio de nombres', () => {
    {
      for (const svg of [...all(base), ...all(frost)]) {
        expect(svg).not.toContain('paint-order');
        expect(svg).not.toContain('rgba(');
        expect(svg).not.toContain('<text');
        expect(svg).not.toMatch(/\shref=/);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
        expect(svg).toContain('width="60" height="60"');
      }
    }
  });

  it('los ids no se repiten dentro de un SVG y llevan el sufijo pedido', () => {
    for (const svg of [...all({ ...base, id: 'Z' }), ...all({ ...frost, id: 'Z' })]) {
      const found = ids(svg);
      expect(new Set(found).size).toBe(found.length);
      for (const id of found) expect(id.endsWith('Z')).toBe(true);
    }
  });
});

describe('Días juntos', () => {
  it('mitad izquierda de tu pareja, derecha tuya', () => {
    const svg = daysShapeSvg(base);
    const limon = svg.indexOf(FRUITS.limon.hex);
    const uva = svg.indexOf(FRUITS.uva.hex);
    expect(limon).toBeGreaterThan(-1);
    expect(uva).toBeGreaterThan(limon);
    expect(svg).toContain('<clipPath id="cld"><rect x="-2" y="-2" width="49.5"');
    expect(svg).toContain('<rect x="52.5" y="-2" width="49.5"');
  });
});

describe('Mascota (mood)', () => {
  it('mitad izquierda tuya, derecha de tu pareja, con cara en tinta', () => {
    const svg = mascotSvg(base);
    expect(svg.indexOf(FRUITS.uva.hex)).toBeLessThan(svg.indexOf(FRUITS.limon.hex));
    expect(svg).toContain('A46 46 0 0 0 46 96');
    expect(svg).toContain('A46 46 0 0 1 54 96');
    expect(svg).toContain('#1B1B1F');
  });

  it('cada mood tiene su propia cara', () => {
    const faces = Object.values(MASCOT_POSES).map((p) => p.face);
    expect(new Set(faces).size).toBe(faces.length);
  });

  it('la rendija nunca se cierra: las mitades se acercan como mucho 2', () => {
    for (const pose of Object.values(MASCOT_POSES))
      expect(pose.gap ?? 0).toBeGreaterThanOrEqual(-2);
  });

  it('las mitades se mueven con el mood', () => {
    expect(mascotSvg({ ...base, mood: 'angry' })).toContain('translate(-5,0)');
    expect(mascotSvg({ ...base, mood: 'smitten' })).toContain('rotate(9 46 96)');
    expect(mascotSvg({ ...base, mood: 'melting' })).toContain('a3.5 3.5');
    expect(mascotSvg(base)).not.toContain('a3.5 3.5');
  });
});

describe('La próxima vez', () => {
  it('media luna de tu fruta y llenado de la de tu pareja', () => {
    const svg = nextShapeSvg({ ...base, progress: 0.62 });
    expect(svg).toContain(`fill="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`fill="${FRUITS.limon.hex}" clip-path`);
    expect(svg).toContain('M2 82 H98');
  });

  it('el nivel de llenado sube con el progreso y se acota de 0 a 1', () => {
    expect(fillTop(0)).toBe(76);
    expect(fillTop(1)).toBe(32);
    expect(fillTop(0.5)).toBe(54);
    expect(fillTop(2)).toBe(32);
    expect(fillTop(-3)).toBe(76);
    expect(clampProgress(Number.NaN)).toBe(0.5);
    const svg = nextShapeSvg({ ...base, progress: 0.62 });
    expect(svg).toContain(`y="${76 - 44 * 0.62}"`);
    expect(nextShapeSvg({ ...base, progress: 0 })).toContain('y="76"');
    expect(nextShapeSvg({ ...base, progress: 1 })).toContain('y="32"');
  });
});

describe('Distancia', () => {
  it('más cerca, más juntos, con tope', () => {
    const near = distanceSeparation(0);
    const mid = distanceSeparation(100);
    const far = distanceSeparation(1240);
    expect(near).toBeLessThan(mid);
    expect(mid).toBeLessThan(far);
    expect(distanceSeparation(3000)).toBe(56);
    expect(distanceSeparation(20000)).toBe(56);
    expect(distanceSeparation(null)).toBeGreaterThan(near);
  });

  it('dos círculos, tú y tu pareja', () => {
    const svg = distShapeSvg({ ...base, km: 1240 });
    expect(svg).toContain(`fill="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`fill="${FRUITS.limon.hex}"`);
    expect(svg).toContain('stroke-dasharray="0.1 7"');
  });
});

describe('Story', () => {
  it('con foto: imagen recortada, aro de las dos frutas y punto en la de tu pareja', () => {
    const svg = storyShapeSvg({ ...base, photo: 'data:image/png;base64,AAAA', dot: true });
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('xlink:href="data:image/png;base64,AAAA"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(svg).toContain(`stop-color="${FRUITS.limon.hex}"`);
    expect(svg).toContain(`stop-color="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`<circle cx="84" cy="16" r="8" fill="${FRUITS.limon.hex}"`);
  });

  it('sin foto ni story nueva: sin imagen y sin punto', () => {
    const svg = storyShapeSvg({ ...base, photo: null, dot: false });
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('cx="84"');
  });
});

describe('Racha', () => {
  it('chispa grande tuya y chica de tu pareja', () => {
    const svg = streakShapeSvg({ ...base, active: true });
    expect(svg.indexOf(FRUITS.uva.hex)).toBeLessThan(svg.indexOf(FRUITS.limon.hex));
    expect(svg).not.toContain('<g opacity=');
  });

  it('con racha 0 se ve apagada al 35 %', () => {
    expect(SPARK_OFF_OPACITY).toBe(0.35);
    expect(streakShapeSvg({ ...base, active: false })).toContain('<g opacity="0.35">');
  });
});

describe('Estado vacío', () => {
  it('la mascota tranquila', () => {
    expect(emptyShapeSvg(base)).toBe(mascotSvg({ ...base, mood: 'neutral' }));
  });
});

describe('frutas', () => {
  it('cada fruta usa su hex', () => {
    for (const fruit of Object.values(FRUITS)) {
      expect(daysShapeSvg({ ...base, me: fruit.key, partner: fruit.key })).toContain(fruit.hex);
    }
  });
});

describe('estilo Escarcha', () => {
  const fruitHexes = (): string[] => Object.values(FRUITS).map((f) => f.hex.toUpperCase());
  const shapes = (o: WidgetShapeOptions) => [
    daysShapeSvg(o),
    ...(Object.keys(MASCOT_POSES) as MascotMood[]).map((mood) => mascotSvg({ ...o, mood })),
    nextShapeSvg({ ...o, progress: 0.4 }),
    distShapeSvg({ ...o, km: 800 }),
    storyShapeSvg({ ...o, photo: null, dot: true }),
    streakShapeSvg({ ...o, active: true }),
  ];

  it('es monocromático: sin colores de fruta ni sombra tonal, con transparencia', () => {
    for (const svg of shapes(frost)) {
      for (const hex of fruitHexes()) expect(svg.toUpperCase()).not.toContain(hex);
      expect(svg).not.toContain(`translate(0,${TONAL_OFFSET})" fill=`);
      expect(svg).not.toContain('Gradient');
      expect(svg).toContain('opacity');
    }
  });

  it('la mascota lleva la cara en blanco, sin tinta', () => {
    const svg = mascotSvg({ ...frost, mood: 'happy' });
    expect(svg).not.toContain('#1B1B1F');
    expect(svg).toContain('stroke="#FFFFFF"');
  });

  it('tú y tu pareja se distinguen por la opacidad', () => {
    const svg = daysShapeSvg(frost);
    expect(svg).toContain(`fill-opacity="${FROST.me}"`);
    expect(svg).toContain(`fill-opacity="${FROST.partner}"`);
    expect(FROST.me).toBeGreaterThan(FROST.partner);
  });

  it('el avance de la media luna es blanco más opaco', () => {
    expect(nextShapeSvg({ ...frost, progress: 0.5 })).toContain(`fill-opacity="${FROST.progress}"`);
  });

  it('la foto de la story se queda en color', () => {
    const svg = storyShapeSvg({ ...frost, photo: 'data:image/jpeg;base64,AAAA', dot: false });
    expect(svg).toContain('<image');
  });

  it('el tonal no usa transparencia en las formas', () => {
    expect(daysShapeSvg(base)).not.toContain('fill-opacity');
  });
});
