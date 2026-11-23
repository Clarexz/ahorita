// Qué dibuja cada widget 1×1: la forma (con sus parámetros), el dato de una línea que va debajo,
// la descripción para lectores de pantalla y a dónde lleva el toque. Función pura sobre el
// `WidgetModel` (src/lib/widgets.ts); la usan el widget real y la vista previa de la app.
import { APP_NAME } from '@/constants/app';
import { formatNumber } from '@/lib/dates';
import { distanceLabel, spokenKm } from '@/lib/distance';
import { FRUITS, type FruitKey } from '@/lib/fruits';
import {
  widgetKind,
  widgetStyle,
  type WidgetKind,
  type WidgetModel,
  type WidgetName,
  type WidgetStyle,
} from '@/lib/widgets';

import {
  daysShapeSvg,
  distShapeSvg,
  emptyShapeSvg,
  mascotSvg,
  nextShapeSvg,
  storyShapeSvg,
  streakShapeSvg,
  type MascotMood,
  type WidgetShapeOptions,
} from './components/svg';

export type WidgetFace =
  | { shape: 'days' }
  | { shape: 'mood'; mood: MascotMood }
  | { shape: 'next'; progress: number }
  | { shape: 'dist'; km: number | null }
  | { shape: 'story'; photo: string | null; dot: boolean }
  | { shape: 'streak'; active: boolean }
  | { shape: 'empty' };

/** Widgets con forma 1×1 (todos menos el mensaje, que es una burbuja ancha). */
export type ShapeKind = Exclude<WidgetKind, 'PartnerMessage'>;
export type ShapeName = ShapeKind | `${ShapeKind}Frost`;

/** ¿Es un widget de forma 1×1 (y no el mensaje de tu pareja)? */
export function isShapeName(name: WidgetName): name is ShapeName {
  return widgetKind(name) !== 'PartnerMessage';
}

export type WidgetView = {
  /** Estilo de dibujo: tonal o Escarcha. */
  style: WidgetStyle;
  face: WidgetFace;
  /** El dato de una línea, en minúsculas ("412 días", "feliz", "faltan 12"). */
  text: string;
  /** Descripción completa para lectores de pantalla. */
  a11y: string;
  /** Ruta del deep link si no es la de `WIDGET_ROUTES`. */
  route?: string;
  fruits: { me: FruitKey; partner: FruitKey };
};

/** Pose de la mascota para cada mood de `MOOD_OPTIONS` (src/lib/mood.ts). */
const MASCOT_BY_EMOJI: Record<string, MascotMood> = {
  '😄': 'happy',
  '😌': 'calm',
  '🥰': 'smitten',
  '🤗': 'cuddly',
  '😴': 'sleepy',
  '🤤': 'hungry',
  '🤩': 'excited',
  '😎': 'cool',
  '🥳': 'party',
  '🤔': 'thinking',
  '😅': 'meh',
  '😤': 'angry',
  '😫': 'stressed',
  '🥺': 'tender',
  '😢': 'teary',
  '🫠': 'melting',
};

/** Pose de la mascota según el emoji del mood (tranquila si no es uno de la lista). */
export function mascotMood(emoji: string): MascotMood {
  return MASCOT_BY_EMOJI[emoji] ?? 'neutral';
}

const plural = (n: number, one: string, many: string): string =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

const brand = (): string => APP_NAME.toLowerCase();

const fruitsOf = (model: WidgetModel): { me: FruitKey; partner: FruitKey } => {
  const me = model.fruits.me;
  return { me, partner: model.fruits.partner ?? FRUITS[me].suggested };
};

export function widgetView(name: ShapeName, model: WidgetModel): WidgetView {
  const style = widgetStyle(name);
  const fruits = fruitsOf(model);
  const who = model.partnerName;
  const empty = (text: string, a11y: string): WidgetView => ({
    style,
    face: { shape: 'empty' },
    text,
    a11y,
    fruits,
  });

  if (model.status === 'signed_out') {
    return empty(`abre ${brand()}`, `Abre ${APP_NAME} para empezar. Toca para abrirla.`);
  }
  if (model.status === 'no_couple') {
    return empty('sin pareja', `Todavía no tienes pareja en ${APP_NAME}. Toca para vincularla.`);
  }

  switch (widgetKind(name) as ShapeKind) {
    case 'DaysTogether': {
      const count = model.daysTogether ?? model.daysUntilStart;
      if (count === null) {
        return empty('sin fecha', 'Todavía no tienen fecha de aniversario. Toca para ponerla.');
      }
      const upcoming = model.daysTogether === null;
      return {
        style,
        face: { shape: 'days' },
        text: upcoming ? `faltan ${formatNumber(count)}` : plural(count, 'día', 'días'),
        a11y: upcoming
          ? `Faltan ${plural(count, 'día', 'días')} para su aniversario con ${who}.`
          : `${plural(count, 'día', 'días')} juntos con ${who}.`,
        fruits,
      };
    }
    case 'PartnerMood': {
      const mood = model.partnerMood;
      if (!mood) {
        return empty('sin mood', `${who} aún no comparte su mood. Toca para ver los moods.`);
      }
      return {
        style,
        face: { shape: 'mood', mood: mascotMood(mood.emoji) },
        text: mood.label ? mood.label.toLowerCase() : 'su mood',
        a11y: `${who} se siente ${mood.label ?? 'así'} ${mood.emoji}${
          mood.note ? `: ${mood.note}` : ''
        }${mood.ago ? `, ${mood.ago}` : ''}.`,
        fruits,
      };
    }
    case 'Countdown': {
      const ev = model.nextEvent;
      if (!ev) return empty('sin planes', 'No hay una fecha próxima. Toca para agregar una.');
      const n = ev.daysUntil;
      return {
        style,
        face: { shape: 'next', progress: n === 0 ? 1 : ev.progress },
        text: n === 0 ? 'hoy' : n === 1 ? 'mañana' : `faltan ${formatNumber(n)}`,
        a11y:
          n === 0
            ? `Hoy es ${ev.title}.`
            : n === 1
              ? `Mañana es ${ev.title}.`
              : `Faltan ${formatNumber(n)} días para ${ev.title}.`,
        fruits,
      };
    }
    case 'Distance': {
      const d = model.distance;
      if (!d || d.km === null) {
        const a11y = !d
          ? 'Activen su distancia en la app para ver cuántos kilómetros hay entre ustedes.'
          : !d.meSharing
            ? 'Activa tu distancia en la app para ver cuántos kilómetros hay entre ustedes.'
            : `Cuando ${who} active su distancia verás cuántos kilómetros hay entre ustedes.`;
        return empty('sin distancia', a11y);
      }
      return {
        style,
        face: { shape: 'dist', km: d.together ? 0 : d.km },
        text: distanceLabel(d.km, d.together),
        a11y: d.together ? `Están juntos.` : `Están a ${spokenKm(d.km)}.`,
        fruits,
      };
    }
    case 'PartnerStory': {
      const story = model.partnerStory;
      return {
        style,
        face: {
          shape: 'story',
          photo: story?.kind === 'photo' ? story.thumb : null,
          // El punto avisa solo de una story que todavía no has visto.
          dot: story !== null && !story.seen,
        },
        text: story && !story.seen ? 'nueva' : 'ver',
        a11y: story
          ? `${who} subió una story ${story.ago}${story.seen ? ' que ya viste' : ''}. Toca para verla.`
          : `${who} no ha subido nada hoy. Toca para abrir las stories.`,
        route: story && model.partnerId ? `/story/view?user=${model.partnerId}` : '/stories',
        fruits,
      };
    }
    case 'Streak': {
      const s = model.streak;
      if (!s) return empty(`abre ${brand()}`, 'Abre la app para ver su racha de preguntas.');
      const active = s.current > 0;
      return {
        style,
        face: { shape: 'streak', active },
        text: active ? plural(s.current, 'día', 'días') : 'a contestar',
        a11y: active
          ? `Llevan una racha de ${plural(s.current, 'día', 'días')} contestando la pregunta del día.${
              s.answeredToday ? '' : ' Falta contestar la de hoy.'
            }`
          : 'No tienen racha todavía. Contesten la pregunta del día para encenderla.',
        fruits,
      };
    }
  }
}

/** SVG de la forma de un widget; `size` es el lado en dp. */
export function widgetShapeSvg(view: WidgetView, opts: { size: number; id?: string }): string {
  const o: WidgetShapeOptions = { ...view.fruits, ...opts, style: view.style };
  const face = view.face;
  switch (face.shape) {
    case 'days':
      return daysShapeSvg(o);
    case 'mood':
      return mascotSvg({ ...o, mood: face.mood });
    case 'next':
      return nextShapeSvg({ ...o, progress: face.progress });
    case 'dist':
      return distShapeSvg({ ...o, km: face.km });
    case 'story':
      return storyShapeSvg({ ...o, photo: face.photo, dot: face.dot });
    case 'streak':
      return streakShapeSvg({ ...o, active: face.active });
    case 'empty':
      return emptyShapeSvg(o);
  }
}

// ---------------------------------------------------------------------------
// Mensaje de tu pareja: la nota de su mood en una burbuja (widget ancho, no cuadrado).
// ---------------------------------------------------------------------------

export type MessageView = {
  style: WidgetStyle;
  /** Primera letra del nombre de tu pareja, en mayúscula. */
  initial: string;
  /** Lo que dice la burbuja. */
  message: string;
  /** "🥰 enamorado · hace 25 min", solo si hay mood y nota. */
  meta: string | null;
  a11y: string;
  fruits: { me: FruitKey; partner: FruitKey };
};

/** Primera letra (en mayúscula) de un nombre; "·" si no hay nombre. */
export function initialOf(name: string): string {
  const first = [...name.trim()][0];
  return first ? first.toUpperCase() : '·';
}

export function messageView(name: WidgetName, model: WidgetModel): MessageView {
  const style = widgetStyle(name);
  const fruits = fruitsOf(model);
  const who = model.partnerName;
  const base = { style, initial: initialOf(who), fruits, meta: null };

  if (model.status === 'signed_out') {
    return {
      ...base,
      message: `Abre ${APP_NAME} para empezar`,
      a11y: `Abre ${APP_NAME} para empezar. Toca para abrirla.`,
    };
  }
  if (model.status === 'no_couple') {
    return {
      ...base,
      message: 'Todavía no tienes pareja',
      a11y: `Todavía no tienes pareja en ${APP_NAME}. Toca para vincularla.`,
    };
  }

  const mood = model.partnerMood;
  if (!mood) {
    return {
      ...base,
      message: 'Todavía no te deja mensaje',
      a11y: `${who} todavía no te deja mensaje. Toca para ver los moods.`,
    };
  }
  const label = mood.label ? mood.label.toLowerCase() : null;
  const note = mood.note?.trim() ?? '';
  const feeling = label ?? 'su mood';
  const ago = mood.ago ? `, ${mood.ago}` : '';
  if (!note) {
    return {
      ...base,
      message: label ? `Anda ${label} ${mood.emoji}` : `Su mood: ${mood.emoji}`,
      a11y: `${who} se siente ${feeling} ${mood.emoji}${ago}. No te dejó mensaje.`,
    };
  }
  return {
    ...base,
    message: note,
    meta: `${mood.emoji} ${feeling}${mood.ago ? ` · ${mood.ago}` : ''}`,
    a11y: `Mensaje de ${who}: ${note}. Se siente ${feeling} ${mood.emoji}${ago}.`,
  };
}
