import { revealScrollOffset } from '../keyboardReveal';

describe('revealScrollOffset', () => {
  it('no mueve nada si el campo ya se ve', () => {
    expect(revealScrollOffset({ top: 100, bottom: 150, scrollY: 0, viewport: 400 })).toBeNull();
  });

  it('baja lo justo cuando el teclado tapa el campo', () => {
    // El campo de la nota del mood quedó debajo del borde de la hoja encogida.
    expect(
      revealScrollOffset({ top: 600, bottom: 660, scrollY: 0, viewport: 500, margin: 24 }),
    ).toBe(184);
  });

  it('sube cuando el campo quedó arriba del área visible', () => {
    expect(
      revealScrollOffset({ top: 50, bottom: 100, scrollY: 300, viewport: 400, margin: 10 }),
    ).toBe(40);
  });

  it('nunca pide un desplazamiento negativo', () => {
    expect(
      revealScrollOffset({ top: 5, bottom: 40, scrollY: 100, viewport: 400, margin: 24 }),
    ).toBe(0);
  });

  it('si el campo no cabe, enseña su parte de arriba', () => {
    expect(
      revealScrollOffset({ top: 300, bottom: 900, scrollY: 0, viewport: 400, margin: 0 }),
    ).toBe(300);
    expect(
      revealScrollOffset({ top: 300, bottom: 900, scrollY: 300, viewport: 400, margin: 0 }),
    ).toBeNull();
  });

  it('sin altura visible no hace nada', () => {
    expect(revealScrollOffset({ top: 0, bottom: 10, scrollY: 0, viewport: 0 })).toBeNull();
  });
});
