import { View } from 'react-native';

import { Divider, GoogleButton, Notice, Text } from '@/components';
import { isGoogleSignInEnabled, useSignInWithGoogle } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * Separador "o" + "Continuar con Google": sirve para entrar y para crear cuenta (la misma función;
 * Supabase crea la cuenta si no existe). No se muestra sin EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
 * Cancelar no muestra nada. Tras entrar, el guardia de rutas decide si falta nombre o pareja
 * (onboarding), igual que con correo.
 */
export function GoogleSignInSection({
  busy = false,
  divider = true,
}: {
  busy?: boolean;
  /** Sin formulario arriba (Crear cuenta) no hace falta el separador "o". */
  divider?: boolean;
}) {
  if (!isGoogleSignInEnabled) return null;
  return <GoogleSignInBlock busy={busy} divider={divider} />;
}

function GoogleSignInBlock({ busy, divider }: { busy: boolean; divider: boolean }) {
  const { spacing } = useTheme();
  const google = useSignInWithGoogle();

  return (
    <View style={{ gap: spacing.lg }}>
      {divider ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Divider style={{ flex: 1 }} />
          <Text variant="note" tone="muted">
            o
          </Text>
          <Divider style={{ flex: 1 }} />
        </View>
      ) : null}
      {google.isError ? <Notice tone="danger">{errorMessage(google.error)}</Notice> : null}
      <GoogleButton onPress={() => google.mutate()} loading={google.isPending} disabled={busy} />
    </View>
  );
}
