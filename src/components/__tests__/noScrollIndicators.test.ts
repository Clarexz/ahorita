import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** La app no muestra barra de desplazamiento en ningún scroll ni lista (v0.14.0). */
const SRC = join(__dirname, '..', '..');
const OPENING =
  /<(ScrollView|KeyboardAwareScrollView|FlashList|FlatList|SectionList|Animated\.ScrollView|Animated\.FlatList)\b/g;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** Texto de las props: desde el nombre del componente hasta el `>` que cierra la apertura. */
function propsBlock(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0 && source[i - 1] !== '=') return source.slice(from, i);
  }
  return source.slice(from);
}

describe('barras de desplazamiento', () => {
  it('todo scroll o lista las oculta', () => {
    const missing: string[] = [];
    for (const file of tsxFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(OPENING)) {
        const block = propsBlock(source, match.index);
        const horizontal = /\shorizontal(\s|=\{true\}|$)/.test(block);
        const needed = horizontal
          ? 'showsHorizontalScrollIndicator={false}'
          : 'showsVerticalScrollIndicator={false}';
        if (!block.includes(needed)) {
          const line = source.slice(0, match.index).split('\n').length;
          missing.push(`${file.slice(SRC.length + 1)}:${line} <${match[1]}> sin ${needed}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
