/**
 * Toques "Pícale a tu pareja" (D155, v0.16): sin tope ni espera, y cada pregunta pendiente lleva
 * su propia cuenta. El texto sube de tono conforme van más.
 */

/** Lo que devuelve una RPC de conteo (`integer`) como número ≥ 0; tolera datos raros. */
export function parseNudgeCount(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * "Ya le mandaste X toques" con una cola juguetona según cuántos van; null si todavía ninguno.
 * `name` es como se le dice a la pareja (apodo o nombre).
 */
export function nudgeCountText(count: number, name: string): string | null {
  if (count <= 0) return null;
  const base = count === 1 ? 'Ya le mandaste 1 toque' : `Ya le mandaste ${count} toques`;
  if (count === 1) return `${base}.`;
  if (count < 5) return `${base}. Ahí va.`;
  if (count < 10) return `${base}. Insistente, ¿eh?`;
  if (count < 20) return `${base}. ${name} ya se enteró, seguro.`;
  if (count < 50) return `${base}. Esto ya es amor del intenso.`;
  return `${base}. Leyenda. Ni el despertador insiste tanto.`;
}
