import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { MOON, TONAL_OFFSET, clampProgress, fillTop, shade } from '@/widgets/components/svg';
import { useTheme } from '@/theme';

import { bezierOf } from './motion';
import { fruitHex, type FruitLike } from './Symbol';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Props = {
  /** 0 a 1: qué tanto de la espera ya pasó. */
  progress: number;
  me: FruitLike;
  partner: FruitLike;
  /** Ancho en dp (el alto sale de la forma). */
  width?: number;
  /** Al aparecer se llena de 0 a `progress` (sin animación si piden reducir movimiento). */
  animated?: boolean;
};

/** Lo que dura el llenado al aparecer (§5: la espera "camina" junto con el camino). */
const FILL_MS = 600;

// Recorte del lienzo del widget (100×100) que solo deja la media luna y su base.
const VB_Y = 30;
const VB_H = 56;

/**
 * Media luna acostada de "La próxima vez": tu fruta, que se llena de abajo hacia arriba con la de
 * tu pareja. Usa la misma geometría que el widget (`nextShapeSvg`) para que se vean igual.
 */
export function HalfMoon({ progress, me, partner, width = 64, animated = false }: Props) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();
  const animate = animated && !reduced;
  // 0 = vacía, 1 = en su avance; sin animar arranca ya en su sitio.
  const t = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) {
      t.value = 0;
      t.value = withTiming(1, { duration: FILL_MS, easing: bezierOf(motion.base) });
    } else {
      t.value = 1;
    }
  }, [animate, t, motion]);
  const target = clampProgress(progress);
  const fillProps = useAnimatedProps(() => {
    const y = fillTop(target * t.value);
    return { y, height: 100 - y };
  });
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mine = fruitHex(me);
  const theirs = fruitHex(partner);
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
        <AnimatedRect
          animatedProps={fillProps}
          x={0}
          y={fillTop(animate ? 0 : target)}
          width={100}
          height={100 - fillTop(animate ? 0 : target)}
          fill={theirs}
          clipPath={`url(#moon-${id})`}
        />
        <Path d="M2 82 H98" stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
