// Vistas previas del selector de widgets de Android (npm run widget-previews): dibuja cada widget
// con la misma forma SVG y el mismo dato que el widget real (src/widgets/view.ts) sobre datos de
// ejemplo y lo guarda en assets/widgets/<Nombre>.png. app.config.ts los pasa como `previewImage`.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire, register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(pathToFileURL('./scripts/lib/src-loader.mjs'));

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const { previewModel } = await import('../src/lib/widgetPreview.ts');
const { widgetShapeSvg, widgetView } = await import('../src/widgets/view.ts');
const { WIDGET_NAMES } = await import('../src/lib/widgets.ts');

const OUT = 'assets/widgets';
const FONT = 'node_modules/@expo-google-fonts/albert-sans/600SemiBold/AlbertSans_600SemiBold.ttf';
/** Lado de la forma en px (la imagen es cuadrada y Android la escala en el selector). */
const SHAPE = 220;
const LABEL = 40;
const PAD = 12;
const SIDE = SHAPE + LABEL + PAD * 2;

// Datos fijos para que las imágenes no cambien con cada corrida.
const model = previewModel({
  anniversary: '2025-02-14',
  timezone: 'America/Mexico_City',
  meName: 'Tú',
  partnerName: 'Tu pareja',
  now: new Date('2026-11-18T18:00:00Z'),
});

const fontB64 = readFileSync(FONT).toString('base64');
const head =
  `<style>@font-face{font-family:'Albert Sans';font-weight:600;` +
  `src:url(data:font/ttf;base64,${fontB64}) format('truetype')}` +
  `html,body{margin:0;background:transparent}` +
  `.w{width:${SIDE}px;height:${SIDE}px;display:flex;flex-direction:column;align-items:center;justify-content:center}` +
  `.t{margin-top:4px;height:${LABEL}px;font:600 30px 'Albert Sans';color:#fff;` +
  `text-shadow:0 2px 6px rgba(0,0,0,.65);white-space:nowrap}</style>`;

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIDE, height: SIDE } });
  for (const name of WIDGET_NAMES) {
    const view = widgetView(name, model);
    const svg = widgetShapeSvg(view, { size: SHAPE, id: name });
    await page.setContent(
      `<html><head>${head}</head><body><div class="w">${svg}` +
        `<div class="t">${escape(view.text)}</div></div></body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
    console.log(`${name}: "${view.text}" -> ${OUT}/${name}.png`);
  }
} finally {
  await browser.close();
}
