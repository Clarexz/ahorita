// Vistas previas del selector de widgets de Android (npm run widget-previews): dibuja cada widget
// con la misma forma SVG y el mismo dato que el widget real (src/widgets/view.ts) sobre datos de
// ejemplo y lo guarda en assets/widgets/<Nombre>.png (tonal y <Nombre>Frost). El mensaje de tu
// pareja no es una forma: se arma en HTML con la misma geometría (`messageLayout`) y los mismos
// SVG de la burbuja. Fondo transparente. app.config.ts los pasa como `previewImage`.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire, register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(pathToFileURL('./scripts/lib/src-loader.mjs'));

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const { previewModel } = await import('../src/lib/widgetPreview.ts');
const { widgetShapeSvg, widgetView } = await import('../src/widgets/view.ts');
const { WIDGET_NAMES } = await import('../src/lib/widgets.ts');
const { isShapeName, messageView } = await import('../src/widgets/view.ts');
const { avatarSvg, bubbleSvg, bubbleText, initialColor, messageLayout, BUBBLE_SHADOW } =
  await import('../src/widgets/components/message.ts');

const OUT = 'assets/widgets';
const GF = 'node_modules/@expo-google-fonts';
const FONT = `${GF}/albert-sans/600SemiBold/AlbertSans_600SemiBold.ttf`;
const FONT_MEDIUM = `${GF}/albert-sans/500Medium/AlbertSans_500Medium.ttf`;
const FONT_DISPLAY = `${GF}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf`;
/** El mensaje se dibuja en dp (como el widget de 4×1) y se escala por esto a píxeles. */
const MSG = { width: 300, height: 66, scale: 2 };
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

const b64 = (path) => readFileSync(path).toString('base64');
const face = (family, weight, path) =>
  `@font-face{font-family:'${family}';font-weight:${weight};` +
  `src:url(data:font/ttf;base64,${b64(path)}) format('truetype')}`;
const head =
  `<style>${face('Albert Sans', 600, FONT)}${face('Albert Sans', 500, FONT_MEDIUM)}` +
  `${face('Bricolage', 800, FONT_DISPLAY)}` +
  `html,body{margin:0;background:transparent}` +
  `.w{width:${SIDE}px;height:${SIDE}px;display:flex;flex-direction:column;align-items:center;justify-content:center}` +
  `.t{margin-top:4px;height:${LABEL}px;font:600 30px 'Albert Sans';color:#fff;` +
  `text-shadow:0 2px 6px rgba(0,0,0,.65);white-space:nowrap}</style>`;

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** HTML del mensaje de tu pareja con la misma geometría que el widget real. */
function messageHtml(name) {
  const view = messageView(name, model);
  const l = messageLayout({ width: MSG.width, height: MSG.height }, view.meta !== null);
  const text = bubbleText(view.style);
  const shadow = text.shadow ? 'text-shadow:0 1px 3px rgba(0,0,0,.65);' : '';
  const abs = (left, top, w, h, inner, extra = '') =>
    `<div style="position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;${extra}">${inner}</div>`;
  const avatar = abs(
    l.avatarLeft,
    l.avatarTop,
    l.avatar,
    l.avatar,
    avatarSvg(l, view.style, view.fruits.partner) +
      `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
      `font:800 ${l.initialSize}px Bricolage;color:${initialColor(view.style, view.fruits.partner)};${shadow}">` +
      `${escape(view.initial)}</div>`,
  );
  const meta =
    l.showMeta && view.meta
      ? `<div style="margin-top:1px;font:600 ${l.metaSize}px 'Albert Sans';color:${text.meta};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${shadow}">${escape(view.meta)}</div>`
      : '';
  const bubble = abs(
    l.bubbleLeft,
    l.bubbleTop,
    l.bubbleWidth,
    l.bubbleHeight,
    bubbleSvg(l, view.style, view.fruits.partner) +
      `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;` +
      `padding:0 ${l.textRight}px ${view.style === 'tonal' ? BUBBLE_SHADOW : 0}px ${l.textLeft}px;box-sizing:border-box">` +
      `<div style="font:500 ${l.fontSize}px/${l.lineHeight}px 'Albert Sans';color:${text.message};${shadow}` +
      `display:-webkit-box;-webkit-line-clamp:${l.lines};-webkit-box-orient:vertical;overflow:hidden">` +
      `${escape(view.message)}</div>${meta}</div>`,
  );
  return (
    `<div style="position:relative;width:${MSG.width}px;height:${MSG.height}px;` +
    `transform:scale(${MSG.scale});transform-origin:0 0">${avatar}${bubble}</div>`
  );
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: SIDE, height: SIDE } });
  for (const name of WIDGET_NAMES) {
    if (!isShapeName(name)) {
      const w = MSG.width * MSG.scale;
      const h = MSG.height * MSG.scale;
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(`<html><head>${head}</head><body>${messageHtml(name)}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
      console.log(`${name}: mensaje -> ${OUT}/${name}.png`);
      continue;
    }
    await page.setViewportSize({ width: SIDE, height: SIDE });
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
