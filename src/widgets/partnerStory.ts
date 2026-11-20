// Story de tu pareja para el widget: consulta directa a `stories` (la RLS ya oculta lo borrado y
// caducado) y miniatura incrustada como data URI. Corre también en la tarea headless, así que
// solo usa supabase y fetch (nada de la UI).
import { arrayBufferToBase64 } from '@/lib/base64';
import { isValidStrokes } from '@/lib/drawing';
import type { StoryBg, StoryFont, StoryKind } from '@/lib/stories';
import { supabase } from '@/lib/supabase';
import { latestActiveStory, type SnapshotInput, type WidgetSnapshot } from '@/lib/widgets';

const STORIES_BUCKET = 'stories';
const SIGNED_URL_SECONDS = 600;
/** Una miniatura de 320 px pesa ~20 KB; si pasa de esto no se incrusta. */
export const MAX_THUMB_BYTES = 150 * 1024;

export type PartnerStoryRow = {
  id: string;
  user_id: string;
  kind: string;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
  thumb_path: string | null;
  text: string | null;
  bg: StoryBg | string | null;
  font: StoryFont | string | null;
  strokes: unknown;
  /** `views:story_views(user_id)`: quién ya la vio (la RLS deja leerlas a la pareja). */
  views?: { user_id: string }[] | null;
};

type StoryInput = NonNullable<SnapshotInput['partnerStory']>;

/** Descarga la miniatura (URL firmada) como `data:image/jpeg;base64,…`; null si falla o pesa mucho. */
export async function downloadThumb(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORIES_BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_THUMB_BYTES) return null;
    return `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    return null;
  }
}

/**
 * Convierte una fila de `stories` en la entrada del snapshot. La miniatura de una photo se
 * reutiliza del snapshot anterior si es la misma story (no se baja en cada refresco).
 * Devuelve null si la story no se puede dibujar (p. ej. trazos inválidos).
 */
export async function storyToSnapshotInput(
  row: PartnerStoryRow,
  previous: WidgetSnapshot | null,
  download: (path: string) => Promise<string | null> = downloadThumb,
  viewerId?: string | null,
): Promise<StoryInput | null> {
  if (row.kind !== 'photo' && row.kind !== 'text' && row.kind !== 'drawing') return null;
  const kind: StoryKind = row.kind;
  let strokes: StoryInput['strokes'] = null;
  if (kind === 'drawing') {
    if (!isValidStrokes(row.strokes)) return null;
    strokes = row.strokes;
  }
  let thumb: string | null = null;
  if (kind === 'photo') {
    const before = previous?.partnerStory;
    thumb =
      before && before.id === row.id && before.thumb
        ? before.thumb
        : row.thumb_path
          ? await download(row.thumb_path)
          : null;
  }
  // Se conserva "vista" si el snapshot ya la marcó (la vista pudo no llegar aún al servidor).
  const seen =
    (!!viewerId && (row.views ?? []).some((v) => v.user_id === viewerId)) ||
    (previous?.partnerStory?.id === row.id && previous.partnerStory.seen === true);
  return {
    id: row.id,
    kind,
    created_at: row.created_at,
    expires_at: row.expires_at,
    thumb,
    text: row.text,
    bg: (row.bg as StoryBg | null) ?? null,
    font: (row.font as StoryFont | null) ?? null,
    strokes,
    seen,
  };
}

/** Elige la story activa más nueva de una lista que ya tiene la app y la convierte. */
export async function pickPartnerStory(
  rows: readonly PartnerStoryRow[],
  partnerId: string | null | undefined,
  previous: WidgetSnapshot | null,
  now = new Date(),
  viewerId?: string | null,
): Promise<StoryInput | null> {
  const row = latestActiveStory(rows, partnerId, now);
  return row ? storyToSnapshotInput(row, previous, downloadThumb, viewerId) : null;
}

/** Lee del servidor la story activa más nueva de tu pareja. Lanza si la consulta falla. */
export async function fetchPartnerStory(
  partnerId: string,
  previous: WidgetSnapshot | null,
  viewerId: string | null,
  now = new Date(),
): Promise<StoryInput | null> {
  const { data, error } = await supabase
    .from('stories')
    .select(
      'id, user_id, kind, created_at, expires_at, deleted_at, thumb_path, text, bg, font, strokes, views:story_views(user_id)',
    )
    .eq('user_id', partnerId)
    .is('deleted_at', null)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? storyToSnapshotInput(data as PartnerStoryRow, previous, downloadThumb, viewerId)
    : null;
}
