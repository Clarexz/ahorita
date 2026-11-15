import { useMutation } from '@tanstack/react-query';

import { changePassword, signIn, signInWithGoogle, signOut, signUp } from './api';
import { useSessionStore } from './store';

export function useSession() {
  const session = useSessionStore((s) => s.session);
  const isLoading = useSessionStore((s) => s.isLoading);
  return { session, user: session?.user ?? null, isLoading };
}

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUp(email, password),
  });
}

export function useSignInWithGoogle() {
  return useMutation({ mutationFn: signInWithGoogle });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (password: string) => changePassword(password) });
}
