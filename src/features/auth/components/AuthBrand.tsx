import { View } from 'react-native';

import { Text, Wordmark } from '@/components';
import { useTheme } from '@/theme';

type Props = {
  /** Versión baja para pantallas que deben caber sin desplazarse: sin la frase y más pequeña. */
  compact?: boolean;
};

/** Marca de las pantallas de entrada: wordmark apilado y la frase de la marca (DISENO §6). */
export function AuthBrand({ compact = false }: Props) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: compact ? spacing.sm : spacing.lg,
      }}
    >
      <Wordmark layout={compact ? 'horizontal' : 'stacked'} size={compact ? 32 : 40} />
      {compact ? null : (
        <Text variant="ui" tone="muted" style={{ textAlign: 'center' }}>
          Falta menos de lo que parece.
        </Text>
      )}
    </View>
  );
}
