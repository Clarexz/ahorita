import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, HalfMoon, LoadingSymbol, Text } from '@/components';
import { useFruits } from '@/features/couple';
import { useCountdowns } from '@/features/events';
import { formatNumber } from '@/lib/dates';
import type { Countdown } from '@/lib/events';
import { countdownSpoken } from '@/lib/eventsView';
import { FRUITS } from '@/lib/fruits';
import { waitCaption, type WaitProgress } from '@/lib/waitProgress';
import { useTheme } from '@/theme';

import { shortDate } from '../format';

type ViewProps = {
  countdown: Countdown | null;
  /** Avance de la espera (la regla única de `waitProgress`); null sin cuenta regresiva. */
  wait?: WaitProgress | null;
  loading?: boolean;
  onOpen: () => void;
  onCreate: () => void;
};

/** La tarjeta "La próxima vez" y sus tres estados: cargando, con cuenta y vacía. */
export function NextTimeCardView({
  countdown,
  wait = null,
  loading = false,
  onOpen,
  onCreate,
}: ViewProps) {
  const { spacing } = useTheme();
  const fruits = useFruits();
  const partnerFruit = fruits.partner ?? FRUITS[fruits.me.suggested];

  if (loading) {
    return (
      <Card style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSymbol size={32} accessibilityLabel="Cargando la próxima vez" />
      </Card>
    );
  }

  if (!countdown) {
    return (
      <Card style={{ padding: 20, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" tone="muted">
            La próxima vez
          </Text>
          <HalfMoon width={56} progress={0} me={fruits.me} partner={partnerFruit} />
        </View>
        <Text variant="h3">¿Cuándo se ven?</Text>
        <Text variant="note" tone="muted">
          Apunten la próxima vez que se ven y vayan contando los días.
        </Text>
        <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
          <Button title="Apuntar la fecha" variant="secondary" size="sm" onPress={onCreate} />
        </View>
      </Card>
    );
  }

  const today0 = countdown.daysUntil <= 0;
  const value = today0
    ? 'Hoy'
    : `${formatNumber(countdown.daysUntil)} ${countdown.daysUntil === 1 ? 'día' : 'días'}`;
  const where = [
    shortDate(countdown.date),
    countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      style={{ padding: 20, gap: spacing.xxs }}
      onPress={onOpen}
      accessibilityLabel={`La próxima vez, ${countdown.title}: ${countdownSpoken(countdown.daysUntil)}. Toca para ver las cuentas regresivas.`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" tone="muted">
          La próxima vez
        </Text>
        <HalfMoon
          width={56}
          progress={wait ? wait.progress : 0}
          me={fruits.me}
          partner={partnerFruit}
        />
      </View>
      {today0 ? null : (
        <Text variant="h3" style={{ marginTop: spacing.xs }}>
          Faltan
        </Text>
      )}
      <Text variant="display">{value}</Text>
      <Text variant="note" tone="muted" numberOfLines={2}>
        {today0 ? where : `para el ${where}`}
      </Text>
      {wait ? (
        <Text variant="note" tone="muted">
          {waitCaption(wait)}
        </Text>
      ) : null}
    </Card>
  );
}

/** Conectada a la cuenta regresiva destacada (la próxima visita o la más cercana). */
export function NextTimeCard() {
  const router = useRouter();
  const { featured, featuredWait, isLoading } = useCountdowns();
  return (
    <NextTimeCardView
      countdown={featured}
      wait={featuredWait ?? null}
      loading={isLoading}
      onOpen={() => router.push('/events')}
      onCreate={() => router.push({ pathname: '/events/edit', params: { kind: 'visit' } })}
    />
  );
}
