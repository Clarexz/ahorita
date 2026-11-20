import { latestBefore, waitCaption, waitProgress } from '../waitProgress';

describe('latestBefore', () => {
  it('toma la más reciente que ya pasó y es anterior al objetivo', () => {
    const dates = ['2026-05-01', '2026-06-05', '2026-06-20', '2026-06-25', 'no', null];
    expect(latestBefore(dates, '2026-06-15', '2026-06-25')).toBe('2026-06-05');
    expect(latestBefore(dates, '2026-06-22', '2026-06-25')).toBe('2026-06-20');
  });
  it('sin fechas válidas, null', () => {
    expect(latestBefore([], '2026-06-15', '2026-06-25')).toBeNull();
    expect(latestBefore(undefined, '2026-06-15', '2026-06-25')).toBeNull();
    expect(latestBefore(['2026-06-25'], '2026-06-25', '2026-06-25')).toBeNull();
  });
});

describe('waitProgress', () => {
  const base = { today: '2026-06-15', target: '2026-06-25' };

  it('mide desde el último día que se vieron (visits)', () => {
    const w = waitProgress({ ...base, visitEnds: ['2026-05-01', '2026-06-05'] });
    expect(w).toEqual({
      progress: 0.5,
      since: '2026-06-05',
      totalDays: 20,
      elapsedDays: 10,
      source: 'visit',
    });
  });

  it('1 de 7 días desde que se vieron', () => {
    const w = waitProgress({
      today: '2026-06-02',
      target: '2026-06-08',
      visitEnds: ['2026-06-01'],
    });
    expect(w.source).toBe('visit');
    expect(w.elapsedDays).toBe(1);
    expect(w.totalDays).toBe(7);
    expect(w.progress).toBeCloseTo(1 / 7);
    expect(waitCaption(w)).toBe('1 de 7 días desde que se vieron');
  });

  it('visits gana sobre events y sobre la fecha de alta', () => {
    const w = waitProgress({
      ...base,
      visitEnds: ['2026-06-10'],
      eventVisitDates: ['2026-06-01'],
      createdAt: '2026-06-12T10:00:00Z',
    });
    expect(w.since).toBe('2026-06-10');
    expect(w.source).toBe('visit');
  });

  it('sin visits usa la última visita de events', () => {
    const w = waitProgress({
      ...base,
      eventVisitDates: ['2026-05-01', '2026-06-05'],
      createdAt: '2026-06-12T10:00:00Z',
    });
    expect(w.since).toBe('2026-06-05');
    expect(w.source).toBe('visit');
  });

  it('sin visitas usa la fecha de alta', () => {
    const w = waitProgress({ ...base, createdAt: '2026-06-12T10:00:00Z' });
    expect(w).toMatchObject({
      since: '2026-06-12',
      totalDays: 13,
      elapsedDays: 3,
      source: 'created',
    });
    expect(waitCaption(w)).toBe('3 de 13 días desde que la apuntaron');
  });

  it('crearla ayer no la deja vacía: ya cuenta un día', () => {
    const w = waitProgress({
      today: '2026-06-15',
      target: '2026-06-22',
      createdAt: '2026-06-14T09:00:00Z',
    });
    expect(w.elapsedDays).toBe(1);
    expect(w.totalDays).toBe(8);
  });

  it('sin nada válido usa una ventana de 30 días', () => {
    const w = waitProgress(base);
    expect(w.source).toBe('window');
    expect(w.totalDays).toBe(30);
    expect(w.elapsedDays).toBe(20);
    expect(w.progress).toBeCloseTo(20 / 30);
    expect(waitCaption(w)).toBe('últimos 30 días');
    expect(waitProgress({ ...base, target: '2026-09-25' }).progress).toBe(0);
  });

  it('una espera total menor a 2 días cae a la ventana', () => {
    const w = waitProgress({
      today: '2026-06-15',
      target: '2026-06-16',
      visitEnds: ['2026-06-15'],
    });
    expect(w.source).toBe('window');
  });

  it('una visita que no ha terminado no cuenta', () => {
    const w = waitProgress({ ...base, visitEnds: ['2026-06-18'] });
    expect(w.source).toBe('window');
  });

  it('faltan 0 días: lleno', () => {
    const w = waitProgress({
      today: '2026-06-25',
      target: '2026-06-25',
      visitEnds: ['2026-06-05'],
    });
    expect(w.progress).toBe(1);
    expect(waitProgress({ today: '2026-06-25', target: '2026-06-25' }).progress).toBe(1);
  });

  it('el avance queda en [0, 1]', () => {
    expect(
      waitProgress({ today: '2026-06-01', target: '2026-06-25', visitEnds: ['2026-06-05'] }).source,
    ).toBe('window');
    const late = waitProgress({
      today: '2026-07-30',
      target: '2026-06-25',
      createdAt: '2026-06-01',
    });
    expect(late.progress).toBeGreaterThanOrEqual(0);
    expect(late.progress).toBeLessThanOrEqual(1);
  });

  it('fechas inválidas no truenan', () => {
    expect(waitProgress({ today: 'x', target: 'y' }).progress).toBe(0);
  });
});
