import { callName } from '../names';

describe('callName', () => {
  it('prefiere el apodo', () => {
    expect(callName('  Pau ', 'Paulina Gómez')).toBe('Pau');
  });
  it('si no hay apodo, el primer nombre', () => {
    expect(callName(null, 'Paulina Gómez')).toBe('Paulina');
    expect(callName('   ', '  Luis  Ángel ')).toBe('Luis');
  });
  it('sin nada, el respaldo', () => {
    expect(callName(null, null, 'Tú')).toBe('Tú');
    expect(callName('', '', '')).toBe('');
  });
});
