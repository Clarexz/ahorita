import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, FruitDot, Icon, Text } from '@/components';
import { pendingLine } from '@/lib/questionsView';
import { useTheme } from '@/theme';

import { usePendingForMe } from '../hooks';
import { usePairFruits } from './usePairFruits';

type Props = {
  partnerName: string;
  /** `compact` (Inicio): solo la más reciente y "Contestar". `list` (Preguntas): una fila que lleva a /pending. */
  variant?: 'compact' | 'list';
};

/** "Chu contestó 2 preguntas que te faltan": extras, temas y días pasados. Nada si no hay. */
export function PendingForMeCard({ partnerName, variant = 'list' }: Props) {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const fruits = usePairFruits();
  const { pending } = usePendingForMe();
  if (pending.length === 0) return null;

  const open = (id: string) => router.push({ pathname: '/question', params: { id } });
  const line = pendingLine(pending.length, partnerName);
  const first = pending[0]!;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <FruitDot fruit={fruits.partner} />
      <Text variant="label" tone="muted" style={{ flex: 1 }}>
        Te toca a ti
      </Text>
    </View>
  );

  if (variant === 'compact') {
    return (
      <Card tone="partner" style={{ padding: 20, gap: spacing.sm }}>
        {header}
        <Text variant="body">{line}</Text>
        <Text variant="bodyStrong" numberOfLines={3}>
          {first.question.text}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          <Button title="Contestar" size="sm" onPress={() => open(first.question.id)} />
          {pending.length > 1 ? (
            <Button
              title="Ver todas"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/pending')}
            />
          ) : null}
        </View>
      </Card>
    );
  }

  return (
    <Card
      tone="partner"
      onPress={() => router.push('/pending')}
      accessibilityLabel={`${line} Toca para verlas.`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <FruitDot fruit={fruits.partner} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {line}
        </Text>
        <Icon name="chevron" size={20} color={colors.inkMuted} />
      </View>
    </Card>
  );
}
