import { signInWithGoogle } from '../api';
import { getGoogleIdToken } from '../google';

jest.mock('../google', () => ({
  getGoogleIdToken: jest.fn(),
  isGoogleSignInEnabled: true,
}));

// api.ts arrastra módulos con AsyncStorage y nativos: aquí solo se prueba el flujo de Google.
jest.mock('@/features/appLock/store', () => ({ clearAppLock: jest.fn() }));
jest.mock('@/features/notifications/cleanup', () => ({ cleanupPushForSignOut: jest.fn() }));
jest.mock('@/lib/query', () => ({ clearQueryCache: jest.fn() }));
jest.mock('@/widgets/update', () => ({ saveAndRefresh: jest.fn() }));

const mockSignInWithIdToken = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: (...args: unknown[]) => mockSignInWithIdToken(...args) } },
}));

const token = getGoogleIdToken as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('signInWithGoogle', () => {
  it('manda el idToken y el nonce crudo a Supabase', async () => {
    token.mockResolvedValue({ idToken: 'id-token', rawNonce: 'crudo' });
    mockSignInWithIdToken.mockResolvedValue({ data: { session: { ok: true } }, error: null });
    await expect(signInWithGoogle()).resolves.toEqual({ session: { ok: true } });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'id-token',
      nonce: 'crudo',
    });
  });

  it('si la persona cancela devuelve null y no llama a Supabase', async () => {
    token.mockResolvedValue(null);
    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it('propaga el error de Supabase (p. ej. el hook rechazó la cuenta)', async () => {
    token.mockResolvedValue({ idToken: 'x', rawNonce: 'y' });
    const error = { name: 'AuthApiError', status: 403, message: 'signup_requires_google' };
    mockSignInWithIdToken.mockResolvedValue({ data: null, error });
    await expect(signInWithGoogle()).rejects.toBe(error);
  });
});
