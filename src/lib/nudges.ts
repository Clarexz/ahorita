/** Toques "Recuérdale a tu pareja": hasta 10 por día de la pareja, 5 s entre uno y otro (D118). */
export const NUDGE_DAILY_LIMIT = 10;
export const NUDGE_COOLDOWN_SECONDS = 5;

export type NudgeStatus = {
  /** Toques que llevo hoy (día de la pareja). */
  sentToday: number;
  /** Instante del último, en ms epoch; null si no hay. */
  lastAtMs: number | null;
};

export type NudgeView = {
  /** Cuántos me quedan hoy. */
  remaining: number;
  /** Segundos que faltan para poder tocar otra vez (0 = ya). */
  cooldown: number;
  /** El botón se puede tocar. */
  canSend: boolean;
  /** Ya se usaron todos los de hoy. */
  exhausted: boolean;
};

/** Estado del botón a partir de lo que llevo hoy y de cuándo fue el último toque. */
export function nudgeView(status: NudgeStatus, nowMs: number): NudgeView {
  const remaining = Math.max(0, NUDGE_DAILY_LIMIT - status.sentToday);
  const cooldown =
    status.lastAtMs == null
      ? 0
      : Math.min(
          NUDGE_COOLDOWN_SECONDS,
          Math.max(0, Math.ceil((status.lastAtMs + NUDGE_COOLDOWN_SECONDS * 1000 - nowMs) / 1000)),
        );
  const exhausted = remaining === 0;
  return { remaining, cooldown, canSend: !exhausted && cooldown === 0, exhausted };
}

/** Lo que devuelve la RPC `nudge_status` (jsonb) como estado; tolera datos raros. */
export function parseNudgeStatus(raw: unknown): NudgeStatus {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sent = Number(o.sent_today);
  const last = typeof o.last_at === 'string' ? Date.parse(o.last_at) : NaN;
  return {
    sentToday: Number.isFinite(sent) && sent > 0 ? Math.floor(sent) : 0,
    lastAtMs: Number.isNaN(last) ? null : last,
  };
}

/** Estado tras mandar un toque ahora mismo. */
export function afterNudge(status: NudgeStatus, nowMs: number): NudgeStatus {
  return { sentToday: status.sentToday + 1, lastAtMs: nowMs };
}

/** "Otra vez en 5…" / "Te quedan 7" / "ya fueron todos los de hoy". */
export function nudgeHint(view: NudgeView): string {
  if (view.exhausted) return 'Ya mandaste todos los toques de hoy. Mañana hay más.';
  if (view.cooldown > 0) return `Otra vez en ${view.cooldown}…`;
  return view.remaining === 1 ? 'Te queda 1' : `Te quedan ${view.remaining}`;
}
