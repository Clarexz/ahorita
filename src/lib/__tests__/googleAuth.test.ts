import {
  bytesToHex,
  classifyGoogleError,
  googleError,
  readGoogleResponse,
  toGoogleError,
} from '../googleAuth';

describe('classifyGoogleError', () => {
  it('cancelar no es un error', () => {
    expect(classifyGoogleError({ code: 'SIGN_IN_CANCELLED' })).toBe('cancelled');
    expect(toGoogleError({ code: 'SIGN_IN_CANCELLED', message: 'x' })).toBeNull();
  });

  it('Play Services o Credential Manager no disponibles', () => {
    expect(classifyGoogleError({ code: 'PLAY_SERVICES_NOT_AVAILABLE' })).toBe('unavailable');
    expect(classifyGoogleError({ code: 'ONE_TAP_START_FAILED' })).toBe('unavailable');
    expect(toGoogleError({ code: 'PLAY_SERVICES_NOT_AVAILABLE' })).toMatchObject({
      code: 'google_unavailable',
    });
  });

  it('mala configuración (SHA-1, paquete) se muestra como fallo genérico', () => {
    expect(classifyGoogleError({ code: 'DEVELOPER_ERROR' })).toBe('config');
    expect(toGoogleError({ code: 'DEVELOPER_ERROR' })).toMatchObject({ code: 'google_failed' });
  });

  it('lo desconocido pasa tal cual (p. ej. errores de red)', () => {
    const net = new TypeError('Network request failed');
    expect(classifyGoogleError(net)).toBe('other');
    expect(toGoogleError(net)).toBe(net);
    expect(classifyGoogleError(null)).toBe('other');
    expect(toGoogleError('raro')).toMatchObject({ code: 'google_failed' });
  });
});

describe('readGoogleResponse', () => {
  it('éxito con idToken', () => {
    expect(readGoogleResponse({ type: 'success', data: { idToken: 'abc' } })).toEqual({
      kind: 'success',
      idToken: 'abc',
    });
  });

  it('la librería devuelve la cancelación en vez de lanzarla', () => {
    expect(readGoogleResponse({ type: 'cancelled', data: null })).toEqual({ kind: 'cancelled' });
  });

  it('sin token o sin credencial guardada es fallo', () => {
    expect(readGoogleResponse({ type: 'success', data: { idToken: null } })).toEqual({
      kind: 'failed',
    });
    expect(readGoogleResponse({ type: 'noSavedCredentialFound' })).toEqual({ kind: 'failed' });
  });
});

describe('helpers', () => {
  it('bytesToHex rellena con ceros', () => {
    expect(bytesToHex([0, 15, 16, 255])).toBe('000f10ff');
  });

  it('googleError lleva el code', () => {
    expect(googleError('google_failed')).toMatchObject({ code: 'google_failed' });
  });
});
