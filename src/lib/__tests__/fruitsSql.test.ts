// Las reglas de frutas viven en TS y en SQL (y los colores en la función notify): esta prueba
// revisa que la migración vigente y `notify` digan lo mismo que src/lib/fruits.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FRUIT_HEX } from '../../../supabase/functions/notify/logic';
import { BLOCKED_PAIRS, FRUIT_KEYS, FRUITS } from '../fruits';

const ROOT = join(__dirname, '..', '..', '..');
const sql = readFileSync(
  join(ROOT, 'supabase', 'migrations', '20261118000000_more_fruits.sql'),
  'utf8',
);

/** Los `when 'x' then 'y'` del cuerpo de una función de la migración. */
function caseMap(fn: string): Record<string, string> {
  const start = sql.indexOf(`function private.${fn}(`);
  const body = sql.slice(start, sql.indexOf('$$;', start));
  return Object.fromEntries(
    [...body.matchAll(/when '([a-z_]+)' then '([a-z_]+)'/g)].map((m) => [m[1], m[2]]),
  );
}

describe('frutas en SQL', () => {
  it('fruit_group coincide con FRUITS[..].group', () => {
    expect(caseMap('fruit_group')).toEqual(
      Object.fromEntries(FRUIT_KEYS.map((k) => [k, FRUITS[k].group])),
    );
  });

  it('suggested_fruit coincide con FRUITS[..].suggested', () => {
    expect(caseMap('suggested_fruit')).toEqual(
      Object.fromEntries(FRUIT_KEYS.map((k) => [k, FRUITS[k].suggested])),
    );
  });

  it('los pares del manual coinciden con BLOCKED_PAIRS', () => {
    const start = sql.indexOf('function private.fruit_clash(');
    const body = sql.slice(start, sql.indexOf('$$;', start));
    const pairs = [...body.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)].map((m) => [m[1], m[2]]);
    const expected = BLOCKED_PAIRS.map(([a, b]) => (a < b ? [a, b] : [b, a]));
    expect(pairs).toEqual(expected);
  });

  it('los CHECK de profiles.fruit y stories.bg aceptan todas las llaves', () => {
    for (const constraint of ['profiles_fruit_valid', 'stories_bg check']) {
      const start = sql.indexOf(constraint);
      const body = sql.slice(start, sql.indexOf(');', start));
      for (const key of FRUIT_KEYS) expect(body).toContain(`'${key}'`);
    }
  });

  it('notify pinta cada fruta con su color', () => {
    expect(FRUIT_HEX).toEqual(Object.fromEntries(FRUIT_KEYS.map((k) => [k, FRUITS[k].hex])));
  });
});
