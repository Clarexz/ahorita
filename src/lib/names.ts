/**
 * Cómo le decimos a alguien en espacios chicos (tarjeta de Distancia): su apodo si tiene; si no, la
 * primera palabra de su nombre; si no hay nada, `fallback`.
 */
export function callName(
  nickname: string | null | undefined,
  displayName: string | null | undefined,
  fallback = '',
): string {
  const nick = (nickname ?? '').replace(/\s+/g, ' ').trim();
  if (nick) return nick;
  const first = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  return first || fallback;
}
