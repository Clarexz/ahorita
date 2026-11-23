/**
 * Cuánto hay que desplazar un scroll para que un campo quede completo a la vista.
 *
 * `top` y `bottom` son la posición del campo dentro del contenido del scroll; `scrollY` es el
 * desplazamiento actual y `viewport` la altura visible (ya encogida por el teclado). Deja `margin`
 * de aire arriba y abajo. Devuelve el nuevo desplazamiento, o `null` si el campo ya se ve.
 */
export function revealScrollOffset({
  top,
  bottom,
  scrollY,
  viewport,
  margin = 0,
}: {
  top: number;
  bottom: number;
  scrollY: number;
  viewport: number;
  margin?: number;
}): number | null {
  if (viewport <= 0) return null;
  const wantTop = Math.max(0, top - margin);
  const wantBottom = bottom + margin;
  // Si el campo (con su aire) no cabe, manda su parte de arriba: ahí está lo que escribes.
  if (wantBottom - wantTop > viewport) {
    return Math.abs(wantTop - scrollY) < 1 ? null : wantTop;
  }
  if (wantBottom > scrollY + viewport) return wantBottom - viewport;
  if (wantTop < scrollY) return wantTop;
  return null;
}
