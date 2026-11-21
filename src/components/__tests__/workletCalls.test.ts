/**
 * Los callbacks de `useAnimatedStyle`/`useAnimatedProps`/`useDerivedValue` corren en el hilo de UI
 * (worklets). Si llaman una función normal de JS importada de otro módulo, en el APK la app se
 * cierra al instante (pasó en la v0.14.0 con `fillTop` en HalfMoon); en web y en Jest no falla.
 * Esta prueba busca llamadas dentro de esos callbacks y solo permite las de Reanimated y `Math`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const HOOKS = /\b(useAnimatedStyle|useAnimatedProps|useDerivedValue)\(/g;
const ALLOWED = new Set([
  'withTiming',
  'withSpring',
  'withDelay',
  'withSequence',
  'withRepeat',
  'withDecay',
  'interpolate',
  'interpolateColor',
  'cancelAnimation',
  // Palabras clave y construcciones que parecen llamadas.
  'if',
  'for',
  'while',
  'switch',
  'return',
  'typeof',
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** El texto del primer argumento del hook (hasta su paréntesis de cierre). */
function callbackBody(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(open + 1, i);
  }
  return '';
}

describe('worklets sin llamadas a funciones de JS', () => {
  it('los callbacks animados solo llaman a Reanimated o a Math', () => {
    const problems: string[] = [];
    for (const file of files(ROOT)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(HOOKS)) {
        const body = callbackBody(src, m.index + m[0].length - 1);
        for (const call of body.matchAll(/(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g)) {
          const name = call[1]!;
          if (ALLOWED.has(name)) continue;
          const line = src.slice(0, m.index).split('\n').length;
          problems.push(`${relative(ROOT, file)}:${line} llama a ${name}()`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
