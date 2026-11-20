/**
 * Avance de "La próxima vez" (la media luna), con una sola regla para la app y los widgets.
 *
 * La espera va desde el último día que se vieron hasta la fecha objetivo:
 *   1. el `end_date` de la visita más reciente de la tabla `visits` (<= hoy y < objetivo);
 *   2. si no hay, la última cuenta regresiva `events` de tipo visita que ya pasó;
 *   3. si no, el día en que se apuntó la cuenta regresiva;
 *   4. si nada sirve (o la espera total dura menos de 2 días), una ventana de 30 días.
 * Todas las fechas son 'YYYY-MM-DD' (día de la pareja); "hoy" se pasa de fuera.
 */
import { addDays, daysBetween, parseIsoDate, type IsoDate } from './dates';

/** Ventana (días) cuando no hay desde cuándo medir. */
export const WAIT_WINDOW_DAYS = 30;
/** Espera mínima (días) para medir desde una fecha real. */
export const MIN_WAIT_DAYS = 2;

export type WaitSource = 'visit' | 'created' | 'window';

export type WaitProgress = {
  /** 0 a 1; 1 si faltan 0 días. */
  progress: number;
  /** Desde cuándo se mide (en la ventana, 30 días antes del objetivo). */
  since: IsoDate;
  totalDays: number;
  elapsedDays: number;
  source: WaitSource;
};

export type WaitInput = {
  today: IsoDate;
  target: IsoDate;
  /** `end_date` de las visitas (tabla `visits`); se usa la más reciente que ya pasó. */
  visitEnds?: readonly (string | null | undefined)[];
  /** Fechas de cuentas regresivas `events` de tipo visita (respaldo si no hay `visits`). */
  eventVisitDates?: readonly (string | null | undefined)[];
  /** Alta (ISO) de la cuenta regresiva. */
  createdAt?: string | null;
};

const dayOf = (v: string | null | undefined): IsoDate | null =>
  v && parseIsoDate(v.slice(0, 10)) ? v.slice(0, 10) : null;

/** La fecha más reciente de `dates` que ya pasó (<= hoy) y es anterior al objetivo. */
export function latestBefore(
  dates: readonly (string | null | undefined)[] | undefined,
  today: IsoDate,
  target: IsoDate,
): IsoDate | null {
  let best: IsoDate | null = null;
  for (const raw of dates ?? []) {
    const d = dayOf(raw);
    if (d && d <= today && d < target && (best === null || d > best)) best = d;
  }
  return best;
}

export function waitProgress(input: WaitInput): WaitProgress {
  const { today, target } = input;
  if (!parseIsoDate(today) || !parseIsoDate(target)) {
    return { progress: 0, since: today, totalDays: 0, elapsedDays: 0, source: 'window' };
  }
  const created = dayOf(input.createdAt);
  const candidates: [WaitSource, IsoDate | null][] = [
    ['visit', latestBefore(input.visitEnds, today, target)],
    ['visit', latestBefore(input.eventVisitDates, today, target)],
    ['created', created && created < target ? created : null],
  ];
  const found = candidates.find(([, d]) => d !== null);
  if (found) {
    const since = found[1] as IsoDate;
    const totalDays = daysBetween(since, target);
    if (totalDays >= MIN_WAIT_DAYS) {
      const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(since, today)));
      return { progress: elapsedDays / totalDays, since, totalDays, elapsedDays, source: found[0] };
    }
  }
  const since = addDays(target, -WAIT_WINDOW_DAYS);
  const elapsedDays = Math.min(WAIT_WINDOW_DAYS, Math.max(0, daysBetween(since, today)));
  return {
    progress: elapsedDays / WAIT_WINDOW_DAYS,
    since,
    totalDays: WAIT_WINDOW_DAYS,
    elapsedDays,
    source: 'window',
  };
}

/** Con qué se compara el avance: "1 de 7 días desde que se vieron" (o "últimos 30 días"). */
export function waitCaption(w: Pick<WaitProgress, 'source' | 'elapsedDays' | 'totalDays'>): string {
  if (w.source === 'window') return 'últimos 30 días';
  const base = `${w.elapsedDays} de ${w.totalDays} días`;
  return w.source === 'visit' ? `${base} desde que se vieron` : `${base} desde que la apuntaron`;
}
