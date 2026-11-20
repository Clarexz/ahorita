import { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { MOON, TONAL_OFFSET, fillTop, shade } from '@/widgets/components/svg';
import { useTheme } from '@/theme';

import { fruitHex, type FruitLike } from './Symbol';

type Props = {
  /** 0 a 1: qué tanto de la espera ya pasó. */
  progress: number;
  me: FruitLike;
  partner: FruitLike;
  /** Ancho en dp (el alto sale de la forma). */
  width?: number;
};

// Recorte del lienzo del widget (100×100) que solo deja la media luna y su base.
const VB_Y = 30;
const VB_H = 56;

/**
 * Media luna acostada de "La próxima vez": tu fruta, que se llena de abajo hacia arriba con la de
 * tu pareja. Usa la misma geometría que el widget (`nextShapeSvg`) para que se vean igual.
 */
export function HalfMoon({ progress, me, partner, width = 64 }: Props) {
  const { colors } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mine = fruitHex(me);
  const theirs = fruitHex(partner);
  const top = fillTop(progress);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={(width * VB_H) / 100} viewBox={`0 ${VB_Y} 100 ${VB_H}`}>
        <Defs>
          <ClipPath id={`moon-${id}`}>
            <Path d={MOON} />
          </ClipPath>
        </Defs>
        <G transform={`translate(0,${TONAL_OFFSET})`}>
          <Path d={MOON} fill={shade(mine)} />
        </G>
        <Path d={MOON} fill={mine} />
        <Rect
          x={0}
          y={top}
          width={100}
          height={100 - top}
          fill={theirs}
          clipPath={`url(#moon-${id})`}
        />
        <Path d="M2 82 H98" stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
