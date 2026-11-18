// Hooks de resolución para correr módulos puros de src/ desde Node (tipos quitados por Node):
// `@/x` → src/x y los imports sin extensión prueban .ts, .tsx y /index.ts.
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '/index.ts'];

function withExtension(path) {
  if (existsSync(path) && statSync(path).isFile()) return path;
  for (const ext of EXTENSIONS) {
    if (existsSync(path + ext)) return path + ext;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = join(SRC, specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const found = base ? withExtension(base) : null;
  if (found) return next(pathToFileURL(found).href, context);
  return next(specifier, context);
}
