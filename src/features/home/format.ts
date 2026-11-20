import { parseIsoDate, type IsoDate } from '@/lib/dates';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "martes 3 nov": día de la semana, número y mes corto, en minúsculas. */
export function shortDate(iso: IsoDate): string {
  const p = parseIsoDate(iso);
  if (!p) return '';
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  return `${WEEKDAYS[d.getUTCDay()]} ${p.day} ${MONTHS[p.month - 1]}`;
}
