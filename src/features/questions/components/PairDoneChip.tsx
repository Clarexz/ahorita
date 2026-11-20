import { View } from 'react-native';

import { FruitDot, Icon, Text } from '@/components';
import { useTheme } from '@/theme';

import { usePairFruits } from './usePairFruits';

/** Píldora de "ya contestaron los dos": las dos frutas encimadas y una palomita. */
export function PairDoneChip({ label = 'Contestaron los dos' }: { label?: string }) {
  const { colors, radius, spacing } = useTheme();
  const fruits = usePairFruits();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs + 2,
        backgroundColor: colors.surface2,
        borderRadius: radius.pill,
        paddingLeft: spacing.sm,
        paddingRight: spacing.md,
        paddingVertical: 6,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        <FruitDot fruit={fruits.me} size={16} />
        <View style={{ marginLeft: -5 }}>
          <FruitDot fruit={fruits.partner} size={16} />
        </View>
      </View>
      <Icon name="check" size={16} color={colors.ink} />
      <Text variant="ui" numberOfLines={1} style={{ fontSize: 14, lineHeight: 20, flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}
