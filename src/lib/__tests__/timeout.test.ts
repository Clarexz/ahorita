import { shouldRetry } from '../queryPolicy';
import {
  REQUEST_TIMEOUT_MS,
  TimeoutError,
  UPLOAD_TIMEOUT_MS,
  fetchWithTimeout,
  timeoutFor,
} from '../timeout';

/** Un fetch que nunca responde (la conexión muerta) pero sí obedece al `signal`. */
const hungFetch = jest.fn(
  (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    }),
);

describe('fetchWithTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('aborta una petición colgada y falla con un error que se reintenta', async () => {
    const f = fetchWithTimeout(hungFetch);
    const result = f('https://api.test/storage/v1/object/sign/stories/a.jpg?x=1', {
      method: 'POST',
      body: '{}',
    });
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    await expect(result).rejects.toBeInstanceOf(TimeoutError);
    await expect(result).rejects.toThrow('/object/sign/stories/a.jpg');
    const init = hungFetch.mock.calls[0]![1]!;
    expect(init.signal!.aborted).toBe(true);
    expect(shouldRetry(0, new TimeoutError())).toBe(true);
  });

  it('deja pasar la respuesta a tiempo', async () => {
    const ok = new Response('{}');
    const f = fetchWithTimeout(() => Promise.resolve(ok));
    await expect(f('https://api.test/rest/v1/x')).resolves.toBe(ok);
  });

  it('respeta el signal de quien llama sin convertirlo en TimeoutError', async () => {
    const f = fetchWithTimeout(hungFetch);
    const outer = new AbortController();
    const result = f('https://api.test/x', { signal: outer.signal });
    outer.abort();
    await expect(result).rejects.toThrow('Aborted');
    await expect(result).rejects.not.toBeInstanceOf(TimeoutError);
  });

  it('las subidas de archivos tienen más tiempo', () => {
    expect(timeoutFor({ body: '{"a":1}' })).toBe(REQUEST_TIMEOUT_MS);
    expect(timeoutFor({ body: new ArrayBuffer(8) })).toBe(UPLOAD_TIMEOUT_MS);
    expect(timeoutFor({ body: new Uint8Array(8) })).toBe(UPLOAD_TIMEOUT_MS);
    expect(timeoutFor()).toBe(REQUEST_TIMEOUT_MS);
  });
});
