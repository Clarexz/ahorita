/**
 * D147: marcar como vista la story de tu pareja cancelaba `['stories', …]`, incluida la firma de la
 * foto que estaba en vuelo; TanStack la dejaba pendiente sin datos y sin volver a pedirla, y el
 * visor giraba para siempre. Se reproduce con un QueryClient real.
 */
import { QueryClient } from '@tanstack/react-query';

import { dataQueries, isSignedUrlKey } from '@/lib/queryPolicy';

const mediaKey = ['stories', 'media', 'c1/u2/a.jpg'] as const;
const listKey = ['stories', 'active', 'c1'] as const;

function slow<T>(value: T, ms = 50): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

describe('cancelar lecturas de stories sin tocar las URLs firmadas', () => {
  it('cancelar todo el prefijo deja la firma pendiente para siempre (el error)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    void qc.prefetchQuery({ queryKey: mediaKey, queryFn: slow('https://x/sign/a.jpg') });
    await qc.cancelQueries({ queryKey: ['stories'] });
    await new Promise((r) => setTimeout(r, 80));
    const state = qc.getQueryState(mediaKey)!;
    expect(state.data).toBeUndefined();
    expect(state.fetchStatus).toBe('idle');
    qc.clear();
  });

  it('con dataQueries la firma llega y la lista sí se cancela', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    void qc.prefetchQuery({ queryKey: mediaKey, queryFn: slow('https://x/sign/a.jpg') });
    void qc.prefetchQuery({ queryKey: listKey, queryFn: slow([]) });
    await qc.cancelQueries(dataQueries(['stories']));
    await new Promise((r) => setTimeout(r, 80));
    expect(qc.getQueryData(mediaKey)).toBe('https://x/sign/a.jpg');
    expect(qc.getQueryState(listKey)!.data).toBeUndefined();
    qc.clear();
  });

  it('reconoce las llaves de URLs firmadas', () => {
    expect(isSignedUrlKey(mediaKey)).toBe(true);
    expect(isSignedUrlKey(['memories', 'urls', 'a', 'b'])).toBe(true);
    expect(isSignedUrlKey(['answers', 'audio', 'p'])).toBe(true);
    expect(isSignedUrlKey(listKey)).toBe(false);
  });
});
