import { afterNudge, nudgeHint, nudgeView, parseNudgeStatus, NUDGE_DAILY_LIMIT } from '../nudges';

const NOW = 1_000_000;

describe('nudgeView', () => {
  it('sin toques hoy: se puede y quedan 10', () => {
    const v = nudgeView({ sentToday: 0, lastAtMs: null }, NOW);
    expect(v).toEqual({ remaining: 10, cooldown: 0, canSend: true, exhausted: false });
  });

  it('recién tocado: espera 5 s y baja la cuenta', () => {
    const s = afterNudge({ sentToday: 2, lastAtMs: null }, NOW);
    expect(nudgeView(s, NOW)).toMatchObject({ remaining: 7, cooldown: 5, canSend: false });
    expect(nudgeView(s, NOW + 1500).cooldown).toBe(4);
    expect(nudgeView(s, NOW + 5000)).toMatchObject({ cooldown: 0, canSend: true });
  });

  it('con el reloj atrasado nunca pasa de 5 s', () => {
    expect(nudgeView({ sentToday: 1, lastAtMs: NOW + 60_000 }, NOW).cooldown).toBe(5);
  });

  it('al llegar al tope ya no se puede', () => {
    const v = nudgeView({ sentToday: NUDGE_DAILY_LIMIT, lastAtMs: NOW - 60_000 }, NOW);
    expect(v).toMatchObject({ remaining: 0, exhausted: true, canSend: false });
    expect(nudgeView({ sentToday: 99, lastAtMs: null }, NOW).remaining).toBe(0);
  });
});

describe('parseNudgeStatus', () => {
  it('lee la respuesta del servidor', () => {
    const s = parseNudgeStatus({
      sent_today: 3,
      daily_limit: 10,
      last_at: '2026-11-20T10:00:00Z',
    });
    expect(s).toEqual({ sentToday: 3, lastAtMs: Date.parse('2026-11-20T10:00:00Z') });
  });

  it('tolera datos raros', () => {
    expect(parseNudgeStatus(null)).toEqual({ sentToday: 0, lastAtMs: null });
    expect(parseNudgeStatus({ sent_today: 'x', last_at: 'no' })).toEqual({
      sentToday: 0,
      lastAtMs: null,
    });
  });
});

describe('nudgeHint', () => {
  it('cuenta regresiva, restantes y agotado', () => {
    const base = { remaining: 7, cooldown: 0, canSend: true, exhausted: false };
    expect(nudgeHint({ ...base, cooldown: 5, canSend: false })).toBe('Otra vez en 5…');
    expect(nudgeHint(base)).toBe('Te quedan 7');
    expect(nudgeHint({ ...base, remaining: 1 })).toBe('Te queda 1');
    expect(nudgeHint({ ...base, remaining: 0, exhausted: true, canSend: false })).toMatch(
      /todos los toques de hoy/,
    );
  });
});
