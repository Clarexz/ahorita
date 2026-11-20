import { shortDate } from '../format';

describe('shortDate', () => {
  it('escribe el día de la semana, el número y el mes corto', () => {
    expect(shortDate('2026-11-03')).toBe('martes 3 nov');
    expect(shortDate('2026-11-15')).toBe('domingo 15 nov');
    expect(shortDate('no')).toBe('');
  });
});
