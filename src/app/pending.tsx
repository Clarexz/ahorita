import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, EmptyState, Icon, LoadingSymbol, Screen, ScreenHeader, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { usePendingForMe } from '@/features/questions';
import { pendingLine } from '@/lib/questionsView';
import { formatAgo } from '@/lib/widgets';
import { useTheme } from '@/theme';

/** "Te toca a ti": todas las preguntas que la pareja ya contestó y a ti te faltan. */
export default function PendingScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const { pending, isLoading, isError, isRefetching, refetch } = usePendingForMe();
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const now = new Date();

  let body;
  if (isLoading) {
    body = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las preguntas" />
      </View>
    );
  } else if (isError) {
    body = (
      <EmptyState
        art="circles"
        title="No pudimos abrir las preguntas"
        body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
        action={{ label: 'Reintentar', onPress: () => void refetch() }}
      />
    );
  } else if (pending.length === 0) {
    body = (
      <EmptyState
        art="heart"
        title="Estás al día"
        body={`No te falta ninguna de las que contestó ${partnerName}.`}
        action={{ label: 'Ir a Preguntas', onPress: () => router.replace('/questions') }}
      />
    );
  } else {
    body = (
      <View style={{ gap: spacing.sm }}>
        {pending.map((p) => {
          const ago = formatAgo(p.last_activity, now);
          return (
            <Card
              key={p.question.id}
              onPress={() => router.push({ pathname: '/question', params: { id: p.question.id } })}
              accessibilityLabel={`Contestar: ${p.question.text}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text variant="h2" accessibilityElementsHidden>
                  {p.question.category_emoji}
                </Text>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {p.question.text}
                  </Text>
                  {ago ? (
                    <Text variant="note" tone="muted">
                      {ago}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevron" size={20} color={colors.inkMuted} />
              </View>
            </Card>
          );
        })}
      </View>
    );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.lg }}>
        <ScreenHeader title="Te toca a ti" back="Atrás" />
        {!isLoading && !isError && pending.length > 0 ? (
          <Text variant="body" tone="muted">
            {pendingLine(pending.length, partnerName)}
          </Text>
        ) : null}
        {body}
      </View>
    </Screen>
  );
}
