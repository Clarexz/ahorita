import { dayMonth, waitPath } from '../waitPath';
import { waitProgress } from '../waitProgress';

const base = { today: '2026-11-15', target: '2026-11-19' };
const visit = { visitEnds: ['2026-11-12'] };

describe('dayMonth', () => {
  it('día y mes corto', () => {
    expect(dayMonth('2026-11-12')).toBe('12 nov');
    expect(dayMonth('2026-01-03')).toBe('3 ene');
    expect(dayMonth('no')).toBe('');
  });
});

describe('waitPath', () => {
  it('sin fecha real de inicio no se dibuja', () => {
    expect(waitPath(waitProgress(base), base.target)).toBeNull();
  });

  it('desde la última visita: puntos, etiquetas y frase', () => {
    const p = waitPath(waitProgress({ ...base, ...visit }), base.target);
    expect(p).toMatchObject({
      ticks: 7,
      elapsed: 3,
      total: 7,
      startLabel: '12 nov',
      endLabel: '19 nov',
      met: false,
    });
    expect(p?.progress).toBeCloseTo(3 / 7);
    expect(p?.spoken).toBe(
      'Se vieron el 12 de nov. y se ven el 19 de nov.: ya pasaron 3 de 7 días.',
    );
  });

  it('desde que se apuntó', () => {
    const w = waitProgress({ ...base, createdAt: '2026-11-12T10:00:00Z' });
    expect(waitPath(w, base.target)?.spoken).toBe(
      'La apuntaron el 12 de nov. y se ven el 19 de nov.: ya pasaron 3 de 7 días.',
    );
  });

  it('día cero, uno y el día de verse', () => {
    const zero = waitPath(waitProgress({ ...base, ...visit, today: '2026-11-12' }), base.target);
    expect(zero?.spoken).toContain('faltan los 7 días');
    const one = waitPath(waitProgress({ ...base, ...visit, today: '2026-11-13' }), base.target);
    expect(one?.spoken).toContain('ya pasó 1 de 7 días');
    const done = waitPath(waitProgress({ ...base, ...visit, today: '2026-11-19' }), base.target);
    expect(done).toMatchObject({ met: true, progress: 1 });
    expect(done?.spoken).toBe('Se vieron el 12 de nov. y hoy se ven: ya pasaron los 7 días.');
  });

  it('con más de 21 días, línea continua', () => {
    const long = waitProgress({ today: '2026-11-15', target: '2026-12-22', ...visit });
    expect(waitPath(long, '2026-12-22')?.ticks).toBeNull();
    const edge = waitProgress({ today: '2026-11-15', target: '2026-12-03', ...visit });
    expect(waitPath(edge, '2026-12-03')?.ticks).toBe(21);
  });
});
