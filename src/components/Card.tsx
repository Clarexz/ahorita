import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { useTapScale } from './motion';

/** Alto de la franja `pair` (y de la rendija entre las dos frutas). */
const PAIR_BAND = 6;

type Props = {
  children: ReactNode;
  /** `me`/`partner`: tinte de la fruta de quien lo escribió. */
  tone?: 'surface' | 'me' | 'partner';
  /** `pair`: franja de arriba partida en las dos frutas (algo que ya hicieron los dos). */
  accent?: 'pair';
  /** Si se pasa, la tarjeta es tocable y se achica al presionar. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Superficie `surface`, radio 24, padding 18, sin sombra (DISENO §7). */
export function Card({
  children,
  tone = 'surface',
  accent,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const { colors, spacing, radius, fruit, tint } = useTheme();
  const tap = useTapScale();
  const partner = fruit.partner;
  const backgroundColor =
    tone === 'me' ? tint(fruit.me) : tone === 'partner' && partner ? tint(partner) : colors.surface;
  const body = (
    <View
      style={[
        { backgroundColor, borderRadius: radius.card, padding: 18, gap: spacing.sm },
        accent ? { overflow: 'hidden', paddingTop: 18 + PAIR_BAND } : null,
        style,
      ]}
    >
      {accent === 'pair' ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: PAIR_BAND,
            flexDirection: 'row',
            gap: PAIR_BAND,
          }}
        >
          <View style={{ flex: 1, backgroundColor: fruit.me.hex }} />
          <View style={{ flex: 1, backgroundColor: (partner ?? fruit.me).hex }} />
        </View>
      ) : null}
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
    >
      <Animated.View style={tap.style}>{body}</Animated.View>
    </Pressable>
  );
}
