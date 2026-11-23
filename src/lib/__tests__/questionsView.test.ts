import type { HistoryItem } from '../questions';
import {
  answerDisplay,
  answerExcerpt,
  categoryRowState,
  filterByAnswer,
  historyPartnerLine,
  pendingByCategory,
  pendingForMe,
  pendingLine,
  sortForMe,
  spicyCopy,
  streakHeadline,
} from '../questionsView';

const answer = (text: string | null, choice: number | null = null) => ({
  id: 'a',
  user_id: 'u',
  text,
  choice,
  audio_path: null,
  audio_ms: null,
  created_at: '',
  updated_at: '',
});
const item = (over: Partial<HistoryItem>): HistoryItem => ({
  question: {
    id: 'q1',
    slug: 'q',
    category: 'amor',
    category_name: 'Amor',
    category_emoji: '',
    type: 'open',
    text: '¿?',
    options: ['Playa', 'Monte'],
    intensity: 'ligera',
  },
  day: null,
  mine: null,
  partner: null,
  partner_answered: false,
  comment_count: 0,
  last_activity: '2026-10-29T03:00:00Z',
  ...over,
});

describe('questionsView', () => {
  it('answerExcerpt recorta y usa la opción elegida', () => {
    expect(answerExcerpt(answer('a'.repeat(200)), { options: null }, 10)).toBe('aaaaaaaaaa…');
    expect(answerExcerpt(answer('con sol', 1), { options: ['Playa', 'Monte'] })).toBe(
      'Monte · con sol',
    );
  });

  it('"Otra" muestra la opción propia y un índice raro no truena', () => {
    const q = { options: ['Playa', 'Monte'] };
    expect(answerExcerpt(answer('Un crucero', -1), q)).toBe('Otra: Un crucero');
    expect(answerDisplay(answer(null, -1), q)).toBe('Otra');
    expect(answerDisplay(answer('x', 9), q)).toBe('x');
  });

  it('oculta la respuesta de la pareja si yo no contesté', () => {
    const partner = answer('secreto');
    expect(historyPartnerLine(item({ partner, partner_answered: true }))).toEqual({
      kind: 'locked',
    });
    expect(
      historyPartnerLine(item({ mine: answer('yo'), partner, partner_answered: true })),
    ).toEqual({ kind: 'answer', text: 'secreto' });
    expect(historyPartnerLine(item({ mine: answer('yo') }))).toEqual({ kind: 'pending' });
  });

  it('categoryRowState y streakHeadline', () => {
    expect(categoryRowState({ answered_by_me: true, answered_by_partner: true })).toBe('both');
    expect(categoryRowState({ answered_by_me: false, answered_by_partner: true })).toBe('partner');
    expect(streakHeadline(0)).toMatch(/Todavía no hay racha/);
    expect(streakHeadline(23)).toBe('23 días seguidos contestando.');
  });

  it('spicyCopy según el opt-in de cada quien', () => {
    const m = (me: boolean, p: boolean) => [
      { user_id: 'me', spicy_opt_in: me },
      { user_id: 'p', spicy_opt_in: p },
    ];
    expect(spicyCopy(m(true, true), 'me', 'Caleb')).toMatchObject({
      partnerLine: 'Caleb ya las activó.',
      result: 'Activas para los dos.',
      active: true,
    });
    expect(spicyCopy(m(false, true), 'me', 'Caleb').active).toBe(false);
    expect(spicyCopy(m(true, false), 'me', 'Caleb').partnerLine).toBe('Caleb todavía no.');
  });

  it('pendingForMe: solo lo que contestó la pareja y me falta, sin la de hoy ni picantes', () => {
    const q = (id: string, over: Partial<HistoryItem['question']> = {}) => ({
      ...item({}).question,
      id,
      ...over,
    });
    const items = [
      item({ question: q('vieja'), partner_answered: true, last_activity: '2026-11-01T00:00:00Z' }),
      item({ question: q('nueva'), partner_answered: true, last_activity: '2026-11-18T00:00:00Z' }),
      item({ question: q('hoy'), partner_answered: true }),
      item({ question: q('mia'), mine: answer('x'), partner_answered: true }),
      item({ question: q('sola'), mine: answer('x') }),
      item({ question: q('picante', { intensity: 'picante' }), partner_answered: true }),
    ];
    const ids = (spicyActive: boolean) =>
      pendingForMe(items, { excludeId: 'hoy', spicyActive }).map((p) => p.question.id);
    expect(ids(false)).toEqual(['nueva', 'vieja']);
    expect(ids(true)).toContain('picante');
    expect(pendingByCategory(pendingForMe(items, {}))).toEqual({ amor: 3 });
    expect(pendingLine(1, 'Chu')).toBe('Chu contestó una pregunta que te falta.');
    expect(pendingLine(3, 'Chu')).toBe('Chu contestó 3 preguntas que te faltan.');
  });

  it('sortForMe sube las que me faltan y contestó la pareja; estable', () => {
    const r = (id: string, me: boolean, partner: boolean) => ({
      id,
      answered_by_me: me,
      answered_by_partner: partner,
    });
    const sorted = sortForMe([
      r('a', true, true),
      r('b', false, false),
      r('c', false, true),
      r('d', true, false),
      r('e', false, true),
      r('f', false, false),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['c', 'e', 'b', 'f', 'd', 'a']);
  });

  it('filterByAnswer filtra por lo que contesté yo y conserva el orden', () => {
    const qs = [
      { id: 'a', answered_by_me: true },
      { id: 'b', answered_by_me: false },
      { id: 'c', answered_by_me: true },
      { id: 'd', answered_by_me: false },
    ];
    expect(filterByAnswer(qs, 'all')).toEqual(qs);
    expect(filterByAnswer(qs, 'unanswered').map((x) => x.id)).toEqual(['b', 'd']);
    expect(filterByAnswer(qs, 'answered').map((x) => x.id)).toEqual(['a', 'c']);
  });
});
