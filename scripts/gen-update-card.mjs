// Imagen de novedades (npm run update-card -- v0.15.1 [v0.15.0 ...]): lienzo vertical en tema claro
// con el símbolo y el wordmark de ahorita, "Actualización vX.Y.Z" (la más nueva) y una caja de
// novedades para el público por versión. Una versión: 1080×1350; varias: 1080×1920 (historia).
// Lee docs/releases/novedades/<versión>.md y escribe docs/releases/img/<versión>.png (o
// <más vieja>_<más nueva>.png). Reglas en docs/releases/README.md ("Imagen de novedades").
//
// Formato de las novedades:
//   # Subtítulo opcional (una frase corta)
//   - **Título corto**: detalle en una o dos líneas
//   - **Otro título**: ...
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
if (!args.length || args.some((v) => !/^v\d+\.\d+\.\d+$/.test(v))) {
  console.error('Uso: npm run update-card -- vX.Y.Z [vX.Y.Z ...]');
  process.exit(1);
}
const num = (v) => v.slice(1).split('.').map(Number);
const cmp = (a, b) => {
  const [x, y] = [num(a), num(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
/** De la más nueva a la más vieja, sin repetidas. */
const versions = [...new Set(args)].sort((a, b) => cmp(b, a));
const version = versions[0];
const multi = versions.length > 1;

const OUT_DIR = 'docs/releases/img';
const OUT = `${OUT_DIR}/${multi ? `${versions.at(-1)}_${version}` : version}.png`;
const HEIGHT = multi ? 1920 : 1350;

// Paleta del tema claro y frutas por defecto (docs/DISENO.md §2.1–2.2).
const C = {
  bg: '#FFFDF8',
  surface: '#F4EFE3',
  surface2: '#EAE3D3',
  ink: '#1B1B1F',
  inkMuted: '#5E5E66',
  sandia: '#F2495C',
  mango: '#FFC24B',
};
const FRUITS = [C.sandia, C.mango];

const GF = 'node_modules/@expo-google-fonts';
const b64 = (p) => readFileSync(p).toString('base64');
const face = (family, weight, path) =>
  `@font-face{font-family:'${family}';font-weight:${weight};` +
  `src:url(data:font/ttf;base64,${b64(path)}) format('truetype')}`;
const fonts =
  face(
    'Bricolage',
    800,
    `${GF}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf`,
  ) +
  face('Albert Sans', 400, `${GF}/albert-sans/400Regular/AlbertSans_400Regular.ttf`) +
  face('Albert Sans', 600, `${GF}/albert-sans/600SemiBold/AlbertSans_600SemiBold.ttf`) +
  face('Albert Sans', 700, `${GF}/albert-sans/700Bold/AlbertSans_700Bold.ttf`);

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Lee el subtítulo y las novedades del markdown. */
function parse(md, src) {
  let subtitle = null;
  const items = [];
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('# ')) subtitle = line.slice(2).trim();
    else if (line.startsWith('- ')) {
      const m = line.slice(2).match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      items.push(
        m ? { title: m[1], detail: capitalize(m[2]) } : { title: line.slice(2), detail: '' },
      );
    } else if (line && items.length) {
      // Continuación de la novedad anterior.
      items[items.length - 1].detail += ` ${line}`;
    }
  }
  if (!items.length) throw new Error(`${src} no tiene novedades ("- **Título**: detalle").`);
  return { subtitle, items };
}

/** Símbolo: dos medias lunas con rendija de 8 % (DISENO §3). */
const symbol = (size, left = C.sandia, right = C.mango) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 100 100">` +
  `<path d="M46 4 A46 46 0 0 0 46 96 Z" fill="${left}"/>` +
  `<path d="M54 4 A46 46 0 0 1 54 96 Z" fill="${right}"/></svg>`;

/** Media luna sola (viñeta de la lista). */
const half = (size, color, side) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><path d="${
    side === 'left' ? 'M46 4 A46 46 0 0 0 46 96 Z' : 'M54 4 A46 46 0 0 1 54 96 Z'
  }" fill="${color}"/></svg>`;

/** Wordmark "ahorita" con la "o" partida en las dos frutas. */
const wordmark = (size) =>
  `<span class="wm" style="font-size:${size}px">ah<span class="o">o` +
  `<span class="ol">o</span><span class="or">o</span></span>rita</span>`;

/** Una caja "Lo nuevo" con sus viñetas de media luna. */
function box([title, version], items) {
  const list = items
    .map(
      (it, i) =>
        `<li><div class="bullet">${half(44, FRUITS[i % 2], i % 2 ? 'right' : 'left')}</div>` +
        `<div><div class="t">${escape(it.title)}</div>` +
        (it.detail ? `<div class="d">${escape(it.detail)}</div>` : '') +
        `</div></li>`,
    )
    .join('');
  // La versión va en minúscula aunque la etiqueta sea MAYÚSCULAS ("LO NUEVO EN v0.15.1").
  const v = version ? `<span class="v">${escape(version)}</span>` : '';
  return `<div class="box"><h2>${escape(title)}${v}</h2><ul>${list}</ul></div>`;
}

/** "la v0.15.0 y la v0.15.1" (de la más vieja a la más nueva). */
const joinVersions = (vs) => {
  const xs = [...vs].reverse().map((v) => `la ${v}`);
  return xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`;
};

function html(sections) {
  const subtitle = multi ? `Todo lo nuevo de ${joinVersions(versions)}` : sections[0].subtitle;
  const boxes = sections
    .map((s) => box(multi ? ['Lo nuevo en ', s.version] : ['Lo nuevo'], s.items))
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg}}
  #card{position:relative;width:1080px;min-height:${HEIGHT}px;background:${C.bg};overflow:hidden;
    padding:80px 88px 72px;display:flex;flex-direction:column;color:${C.ink};font-family:'Albert Sans'}
  .deco{position:absolute;top:-130px;right:-150px;opacity:.18}
  .brand{display:flex;align-items:center;gap:20px}
  .wm{font-family:Bricolage;font-weight:800;letter-spacing:-0.045em;line-height:1;color:${C.ink}}
  .o{position:relative;color:transparent}
  .o{display:inline-block;letter-spacing:0;margin-right:-0.045em}
  .ol,.or{position:absolute;left:0;top:0}
  .ol{color:${C.sandia};clip-path:inset(0 54% 0 0)}
  .or{color:${C.mango};clip-path:inset(0 0 0 54%)}
  .hero{margin-top:64px}
  .label{font-weight:600;font-size:30px;letter-spacing:.1em;text-transform:uppercase;color:${C.inkMuted}}
  .ver{font-family:Bricolage;font-weight:800;font-size:172px;line-height:.95;letter-spacing:-0.03em;
    margin-top:12px;font-variant-numeric:tabular-nums}
  .sub{font-size:38px;line-height:1.3;margin-top:20px;color:${C.ink};max-width:860px}
  .box{margin-top:${multi ? 40 : 48}px;background:${C.surface};border-radius:48px;padding:48px 52px 16px}
  .box h2{font-weight:600;font-size:28px;letter-spacing:.1em;text-transform:uppercase;color:${C.inkMuted};margin-bottom:32px}
  .box h2 .v{text-transform:none}
  ul{list-style:none}
  li{display:flex;gap:28px;align-items:flex-start;margin-bottom:32px}
  .bullet{flex:none;margin-top:2px}
  .t{font-weight:700;font-size:36px;line-height:1.2}
  .d{font-size:30px;line-height:1.38;color:${C.inkMuted};margin-top:6px}
  .foot{margin-top:auto;padding-top:40px;display:flex;align-items:center;justify-content:space-between;
    font-size:28px;color:${C.inkMuted}}
  .foot b{font-weight:600;color:${C.ink}}
  /* Varias versiones: todo un poco más compacto para que quepa en 1080×1920. */
  .multi .hero{margin-top:48px}
  .multi .ver{font-size:144px}
  .multi .sub{font-size:34px;margin-top:16px}
  .multi .box{padding:40px 48px 8px;border-radius:44px}
  .multi .box h2{margin-bottom:26px}
  .multi li{margin-bottom:26px;gap:24px}
  .multi .t{font-size:32px}
  .multi .d{font-size:27px;margin-top:4px}
  .multi .bullet svg{width:38px;height:38px}
  </style></head><body><div id="card" class="${multi ? 'multi' : ''}">
    <div class="deco">${symbol(460)}</div>
    <div class="brand">${symbol(76)}${wordmark(76)}</div>
    <div class="hero">
      <div class="label">Actualización</div>
      <div class="ver">${escape(version)}</div>
      ${subtitle ? `<div class="sub">${escape(subtitle)}</div>` : ''}
    </div>
    ${boxes}
    <div class="foot"><span>Actualiza en <b>Más → Buscar versión nueva</b></span>${symbol(48)}</div>
  </div></body></html>`;
}

const sections = versions.map((v) => {
  const src = `docs/releases/novedades/${v}.md`;
  return { version: v, ...parse(readFileSync(src, 'utf8'), src) };
});
mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: HEIGHT } });
  await page.setContent(html(sections));
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#card').screenshot({ path: OUT });
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const box = await page.locator('#card').boundingBox();
  console.log(`${versions.join(' + ')}: ${total} novedades, ${box.width}×${box.height} -> ${OUT}`);
} finally {
  await browser.close();
}
