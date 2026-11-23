/**
 * Lo que dibuja "el camino" de La próxima vez (D143): las dos frutas que se acercan desde los
 * extremos hasta juntarse el día de verse. Pura: el componente `WaitPath` solo la pinta.
 */
import { parseIsoDate, type IsoDate } from './dates';
import type { WaitProgress } from './waitProgress';

/** Hasta cuántos días de espera se dibuja un punto por día; más allá, una línea continua. */
export const MAX_TICK_DAYS = 21;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export type WaitPathData = {
  /** Días de la espera, uno por punto; null = línea continua. */
  ticks: number | null;
  elapsed: number;
  total: number;
  /** 0 a 1. */
  progress: number;
  /** "12 nov". */
  startLabel: string;
  endLabel: string;
  /** Ya llegó el día. */
  met: boolean;
  /** Frase completa para el lector de pantalla. */
  spoken: string;
};

/** "2026-11-12" -> "12 nov". */
export function dayMonth(iso: IsoDate): string {
  const p = parseIsoDate(iso);
  return p ? `${p.day} ${MONTHS[p.month - 1]}` : '';
}

/** "2026-11-12" -> "12 de nov.". */
function spokenDay(iso: IsoDate): string {
  const p = parseIsoDate(iso);
  return p ? `${p.day} de ${MONTHS[p.month - 1]}.` : '';
}

/**
 * El camino de la espera. Sin desde cuándo medir (`source === 'window'`) no hay nada que dibujar.
 */
export function waitPath(wait: WaitProgress, target: IsoDate): WaitPathData | null {
  if (wait.source === 'window' || wait.totalDays < 1 || !parseIsoDate(target)) return null;
  const { totalDays: total, elapsedDays: elapsed } = wait;
  const met = elapsed >= total;
  const from =
    wait.source === 'visit'
      ? `Se vieron el ${spokenDay(wait.since)}`
      : `La apuntaron el ${spokenDay(wait.since)}`;
  const to = met ? 'hoy se ven' : `se ven el ${spokenDay(target)}`;
  const count = met
    ? `ya pasaron los ${total} días`
    : elapsed === 0
      ? `faltan los ${total} días`
      : `ya ${elapsed === 1 ? 'pasó' : 'pasaron'} ${elapsed} de ${total} días`;
  return {
    ticks: total <= MAX_TICK_DAYS ? total : null,
    elapsed,
    total,
    progress: wait.progress,
    startLabel: dayMonth(wait.since),
    endLabel: dayMonth(target),
    met,
    spoken: `${from} y ${to}: ${count}.`,
  };
}
