// Sistema de frutas de "ahorita" (docs/DISENO.md §3, manual de marca §06). Cada quien elige su
// fruta: es su color en el símbolo, los widgets, sus respuestas y sus stories. Funciones puras;
// la misma regla vive en SQL (`private.fruit_group`, `private.effective_fruit`, `public.set_fruit`;
// la prueba `fruitsSql.test.ts` revisa que la migración coincida) y en los widgets.

/** Grupos de color, en el orden del selector. Dos frutas del mismo grupo no pueden convivir. */
export const FRUIT_GROUPS = [
  'rojo',
  'rosa',
  'naranja',
  'amarillo',
  'verde',
  'morado',
  'cafe',
] as const;

export type FruitGroup = (typeof FRUIT_GROUPS)[number];

export const FRUIT_GROUP_LABELS: Record<FruitGroup, string> = {
  rojo: 'Rojas',
  rosa: 'Rosas',
  naranja: 'Naranjas',
  amarillo: 'Amarillas',
  verde: 'Verdes',
  morado: 'Moradas y azules',
  cafe: 'Cafés',
};

/** Fruta sugerida para la pareja según el grupo (siempre de otro grupo). */
const GROUP_SUGGESTION: Record<FruitGroup, string> = {
  rojo: 'mango',
  rosa: 'limon',
  naranja: 'uva',
  amarillo: 'sandia',
  verde: 'pitaya',
  morado: 'limon',
  cafe: 'mango',
};

// [llave, nombre, color, grupo]. Las 7 originales (manual §06) conservan llave y color.
const CATALOG = [
  ['sandia', 'Sandía', '#F2495C', 'rojo'],
  ['fresa', 'Fresa', '#E8344E', 'rojo'],
  ['manzana_roja', 'Manzana roja', '#D42A3C', 'rojo'],
  ['frambuesa', 'Frambuesa', '#E0335F', 'rojo'],
  ['cereza', 'Cereza', '#B0173A', 'rojo'],
  ['granada', 'Granada', '#C0263F', 'rojo'],
  ['pitaya', 'Pitaya', '#E83E9C', 'rosa'],
  ['tuna', 'Tuna roja', '#C81F6E', 'rosa'],
  ['toronja', 'Toronja', '#FF7A8A', 'rosa'],
  ['lichi', 'Lichi', '#F2789E', 'rosa'],
  ['guayaba_rosa', 'Guayaba rosa', '#F7869B', 'rosa'],
  ['mandarina', 'Mandarina', '#FF8A3D', 'naranja'],
  ['naranja', 'Naranja', '#FF9A1F', 'naranja'],
  ['durazno', 'Durazno', '#FFA273', 'naranja'],
  ['papaya', 'Papaya', '#FF7F4A', 'naranja'],
  ['mamey', 'Mamey', '#EE6A3A', 'naranja'],
  ['chabacano', 'Chabacano', '#FBA73F', 'naranja'],
  ['melon', 'Melón', '#FFB482', 'naranja'],
  ['mango', 'Mango', '#FFC24B', 'amarillo'],
  ['platano', 'Plátano', '#FFDF4D', 'amarillo'],
  ['pina', 'Piña', '#F7C51E', 'amarillo'],
  ['maracuya', 'Maracuyá', '#F2B50F', 'amarillo'],
  ['carambola', 'Carambola', '#F4D83F', 'amarillo'],
  ['guayaba', 'Guayaba', '#E9CB4A', 'amarillo'],
  ['limon', 'Limón', '#C5DC3A', 'verde'],
  ['manzana_verde', 'Manzana verde', '#9CD03C', 'verde'],
  ['kiwi', 'Kiwi', '#8DB82F', 'verde'],
  ['pera', 'Pera', '#C9D35B', 'verde'],
  ['uva_verde', 'Uva verde', '#B4D25E', 'verde'],
  ['aguacate', 'Aguacate', '#6A9A35', 'verde'],
  ['uva', 'Uva', '#8B5CF6', 'morado'],
  ['arandano', 'Arándano', '#3F6BFF', 'morado'],
  ['ciruela', 'Ciruela', '#7B3592', 'morado'],
  ['higo', 'Higo', '#714283', 'morado'],
  ['zarzamora', 'Zarzamora', '#4E2C73', 'morado'],
  ['capulin', 'Capulín', '#5E2148', 'morado'],
  ['coco', 'Coco', '#8E603F', 'cafe'],
  ['tamarindo', 'Tamarindo', '#9C6235', 'cafe'],
  ['datil', 'Dátil', '#7B4B2B', 'cafe'],
  ['chicozapote', 'Chicozapote', '#A87550', 'cafe'],
] as const satisfies readonly (readonly [string, string, `#${string}`, FruitGroup])[];

export type FruitKey = (typeof CATALOG)[number][0];

/** Todas las llaves, en el orden del selector (por grupo de color). */
export const FRUIT_KEYS: readonly FruitKey[] = CATALOG.map(([key]) => key);

/** Las 7 frutas originales del manual (fondos de stories). */
export const CLASSIC_FRUIT_KEYS = [
  'sandia',
  'mango',
  'mandarina',
  'limon',
  'uva',
  'arandano',
  'pitaya',
] as const satisfies readonly FruitKey[];

export type Fruit = {
  key: FruitKey;
  name: string;
  /** Color de la fruta (igual en claro y oscuro). */
  hex: string;
  /** Color del texto o ícono encima de la fruta (Tinta u Hueso, el de más contraste). */
  on: string;
  group: FruitGroup;
  /** Fruta que mejor le queda a la pareja (siempre de otro grupo). */
  suggested: FruitKey;
};

const INK = '#1B1B1F';
const BONE = '#FFFDF8';

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores hex (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Tinta u Hueso, el que más contraste tenga sobre `hex`. */
export function onColor(hex: string): string {
  return contrastRatio(hex, INK) >= contrastRatio(hex, BONE) ? INK : BONE;
}

/** Sugeridas que no siguen la regla del grupo (se conservan las del manual). */
const SUGGESTED_OVERRIDES: Partial<Record<FruitKey, FruitKey>> = {
  arandano: 'mandarina',
};

export const FRUITS = Object.fromEntries(
  CATALOG.map(([key, name, hex, group]) => [
    key,
    {
      key,
      name,
      hex,
      on: onColor(hex),
      group,
      suggested: SUGGESTED_OVERRIDES[key] ?? (GROUP_SUGGESTION[group] as FruitKey),
    },
  ]),
) as Record<FruitKey, Fruit>;

/**
 * Pares de grupos distintos que el manual bloqueó por parecerse (§06). Además de estos, chocan
 * todas las frutas del mismo grupo de color. El orden no importa.
 */
export const BLOCKED_PAIRS: readonly (readonly [FruitKey, FruitKey])[] = [
  ['sandia', 'pitaya'],
  ['sandia', 'mandarina'],
  ['mango', 'limon'],
  ['mango', 'mandarina'],
  ['uva', 'pitaya'],
];

/** Pareja por defecto: Sandía para quien tenga el id menor, Mango para el otro. */
export const DEFAULT_FRUITS: readonly [FruitKey, FruitKey] = ['sandia', 'mango'];

export function isFruitKey(value: unknown): value is FruitKey {
  return typeof value === 'string' && (FRUIT_KEYS as readonly string[]).includes(value);
}

export type FruitClash = 'same' | 'similar';

/**
 * Si dos frutas no pueden convivir en una pareja: la misma, una del mismo grupo de color o un par
 * del manual que se parece.
 */
export function fruitClash(a: FruitKey, b: FruitKey): FruitClash | null {
  if (a === b) return 'same';
  if (FRUITS[a].group === FRUITS[b].group) return 'similar';
  return BLOCKED_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    ? 'similar'
    : null;
}

export type FruitPerson = { id: string; fruit: string | null | undefined };

/**
 * Frutas que se ven de verdad para cada miembro. Reglas (deterministas en los dos celulares):
 * 1. Sin pareja: tu fruta, o Sandía si no has elegido.
 * 2. Ninguno eligió: Sandía para el id menor, Mango para el mayor.
 * 3. Solo uno eligió: el otro toma la sugerida de esa fruta.
 * 4. Los dos eligieron y chocan (pasa al volver a emparejarse): el id menor se queda con la suya
 *    y el mayor toma la sugerida.
 */
export function resolveFruits(
  me: FruitPerson,
  partner: FruitPerson | null | undefined,
): { me: FruitKey; partner: FruitKey | null } {
  const mine = isFruitKey(me.fruit) ? me.fruit : null;
  if (!partner) return { me: mine ?? DEFAULT_FRUITS[0], partner: null };
  const theirs = isFruitKey(partner.fruit) ? partner.fruit : null;
  const meFirst = me.id < partner.id;

  if (!mine && !theirs) {
    return meFirst
      ? { me: DEFAULT_FRUITS[0], partner: DEFAULT_FRUITS[1] }
      : { me: DEFAULT_FRUITS[1], partner: DEFAULT_FRUITS[0] };
  }
  if (mine && !theirs) return { me: mine, partner: FRUITS[mine].suggested };
  if (!mine && theirs) return { me: FRUITS[theirs].suggested, partner: theirs };

  const a = mine as FruitKey;
  const b = theirs as FruitKey;
  if (!fruitClash(a, b)) return { me: a, partner: b };
  return meFirst
    ? { me: a, partner: FRUITS[a].suggested }
    : { me: FRUITS[b].suggested, partner: b };
}

export type FruitOption = {
  fruit: Fruit;
  /** Por qué no se puede elegir: es la de tu pareja o se le parece. */
  blocked: FruitClash | null;
  suggested: boolean;
};

/** Opciones del selector, en orden de grupo, según la fruta (efectiva) de tu pareja. */
export function fruitOptions(partnerFruit: FruitKey | null): FruitOption[] {
  return FRUIT_KEYS.map((key) => ({
    fruit: FRUITS[key],
    blocked: partnerFruit ? fruitClash(key, partnerFruit) : null,
    suggested: partnerFruit ? FRUITS[partnerFruit].suggested === key : false,
  }));
}

export type FruitSection = { group: FruitGroup; label: string; options: FruitOption[] };

/** Las opciones del selector agrupadas por color. */
export function fruitSections(partnerFruit: FruitKey | null): FruitSection[] {
  const options = fruitOptions(partnerFruit);
  return FRUIT_GROUPS.map((group) => ({
    group,
    label: FRUIT_GROUP_LABELS[group],
    options: options.filter((o) => o.fruit.group === group),
  }));
}

/** Mezcla un color de fruta sobre un fondo (tinte de respuestas y burbujas). `amount` de 0 a 1. */
export function tint(hex: string, background: string, amount: number): string {
  const parse = (h: string) => {
    const v = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const a = parse(hex);
  const b = parse(background);
  const t = Math.min(1, Math.max(0, amount));
  const mix = a.map((c, i) => Math.round(c * t + b[i] * (1 - t)));
  return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
