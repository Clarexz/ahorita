import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { WaitPathData } from '@/lib/waitPath';
import { useTheme } from '@/theme';
import { TONAL_OFFSET, shade } from '@/widgets/components/svg';

import { bezierOf } from './motion';
import { SYMBOL_LEFT, SYMBOL_RIGHT, fruitHex, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  /** Lo que dibuja el camino (`waitPath`). */
  path: WaitPathData;
  /** Tu fruta: la ficha de la izquierda y los puntos que ya pasó. */
  me: FruitLike;
  /** La de tu pareja: la ficha de la derecha. */
  partner: FruitLike;
};

const AREA_H = 36;
/** Alto de cada ficha (incluye su sombra tonal). */
const PIECE_H = 32;
/** Lo que mide la ficha en el lienzo del símbolo (100 de alto): 48 de ancho y rendija de 6. */
const PIECE_RATIO = 0.48;
const GAP_UNITS = 6;
const DOT = 6;
const LINE_H = 3;
const BAR_H = 4;
const MOVE_MS = 600;

/**
 * "El camino" de La próxima vez (D143): tu ficha sale del extremo izquierdo y la de tu pareja del
 * derecho, y se acercan según pasan los días; el día de verse quedan juntas en el centro, como el
 * símbolo. Las fichas son las mitades del símbolo con el estilo tonal de la marca. Los puntos que
 * ya recorrió cada quien se pintan con su fruta; con más de 21 días es una barra continua.
 */
export function WaitPath({ path, me, partner }: Props) {
  const { colors, spacing, motion } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);
  const mine = fruitHex(me);
  const theirs = fruitHex(partner);

  useEffect(() => {
    if (width <= 0) return;
    t.value = 0;
    t.value = withTiming(1, {
      duration: reduced ? motion.reduced : MOVE_MS,
      easing: bezierOf(motion.base),
    });
  }, [width, reduced, motion, t]);

  const unit = PIECE_H / 100;
  const pieceW = 100 * PIECE_RATIO * unit;
  // Lo que recorre cada ficha: de su extremo hasta tocar la rendija del centro.
  const travel = Math.max(0, width / 2 - (50 + GAP_UNITS / 2 + 1) * unit);
  const p = Math.min(1, Math.max(0, path.progress));

  const leftStyle = useAnimatedStyle(() => ({
    opacity: reduced ? t.value : 1,
    transform: [{ translateX: reduced ? travel * p : travel * p * t.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: reduced ? t.value : 1,
    transform: [{ translateX: width - pieceW - (reduced ? travel * p : travel * p * t.value) }],
  }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: reduced ? t.value : 1 }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const piece = (d: string, color: string, viewBoxX: number) => (
    <Svg width={pieceW} height={PIECE_H} viewBox={`${viewBoxX} 2 48 100`}>
      <Path d={d} transform={`translate(0,${TONAL_OFFSET})`} fill={shade(color)} />
      <Path d={d} fill={color} />
    </Svg>
  );

  const dots: number[] = [];
  if (path.ticks && width > 0) {
    for (let i = 1; i < path.ticks; i++) {
      const x = (i / path.ticks) * width;
      // El del centro cae en la rendija del símbolo: no se dibuja.
      if (Math.abs(x - width / 2) > GAP_UNITS * unit) dots.push(x);
    }
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={path.spoken}
      style={{ alignSelf: 'stretch', gap: spacing.xxs }}
    >
      <View onLayout={onLayout} style={{ height: AREA_H, justifyContent: 'center' }}>
        {width > 0 ? (
          <>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: (AREA_H - LINE_H) / 2,
                  height: LINE_H,
                  borderRadius: LINE_H,
                  backgroundColor: colors.line,
                },
                trackStyle,
              ]}
            />
            {path.ticks ? (
              dots.map((x) => (
                <Dot
                  key={x}
                  x={x}
                  t={t}
                  reduced={reduced}
                  reach={travel * p}
                  width={width}
                  pieceW={pieceW}
                  mine={mine}
                  theirs={theirs}
                  idle={colors.inkMuted}
                />
              ))
            ) : (
              <>
                <Bar
                  side="left"
                  t={t}
                  reduced={reduced}
                  reach={travel * p}
                  pieceW={pieceW}
                  color={mine}
                />
                <Bar
                  side="right"
                  t={t}
                  reduced={reduced}
                  reach={travel * p}
                  pieceW={pieceW}
                  color={theirs}
                />
              </>
            )}
            <Animated.View
              style={[{ position: 'absolute', left: 0, top: (AREA_H - PIECE_H) / 2 }, leftStyle]}
            >
              {piece(SYMBOL_LEFT, mine, -1)}
            </Animated.View>
            <Animated.View
              style={[{ position: 'absolute', left: 0, top: (AREA_H - PIECE_H) / 2 }, rightStyle]}
            >
              {piece(SYMBOL_RIGHT, theirs, 53)}
            </Animated.View>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="note" tone="muted">
          {path.startLabel}
        </Text>
        <Text variant="note" tone="muted">
          {path.endLabel}
        </Text>
      </View>
    </View>
  );
}

type DotProps = {
  x: number;
  t: SharedValue<number>;
  reduced: boolean;
  /** Lo que recorre cada ficha al final. */
  reach: number;
  width: number;
  pieceW: number;
  mine: string;
  theirs: string;
  idle: string;
};

/** Un día de la espera: se pinta con la fruta de quien ya pasó por encima. */
function Dot({ x, t, reduced, reach, width, pieceW, mine, theirs, idle }: DotProps) {
  const style = useAnimatedStyle(() => {
    const k = reduced ? 1 : t.value;
    const leftEdge = reach * k + pieceW;
    const rightEdge = width - pieceW - reach * k;
    // Bajo una ficha no se ve ni asoma: el punto reaparece cuando la ficha ya lo pasó.
    const r = DOT / 2;
    if (x > leftEdge - pieceW - r && x < leftEdge + r) return { backgroundColor: mine, opacity: 0 };
    if (x > rightEdge - r && x < rightEdge + pieceW + r) {
      return { backgroundColor: theirs, opacity: 0 };
    }
    if (x <= leftEdge) return { backgroundColor: mine, opacity: 1 };
    if (x >= rightEdge) return { backgroundColor: theirs, opacity: 1 };
    return { backgroundColor: idle, opacity: 0.4 };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - DOT / 2,
          top: (AREA_H - DOT) / 2,
          width: DOT,
          height: DOT,
          borderRadius: DOT,
        },
        style,
      ]}
    />
  );
}

type BarProps = {
  side: 'left' | 'right';
  t: SharedValue<number>;
  reduced: boolean;
  reach: number;
  pieceW: number;
  color: string;
};

/** El tramo ya recorrido de la línea continua, del extremo hasta su ficha. */
function Bar({ side, t, reduced, reach, pieceW, color }: BarProps) {
  const style = useAnimatedStyle(() => ({
    width: reach * (reduced ? 1 : t.value) + pieceW / 2,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: (AREA_H - BAR_H) / 2,
          height: BAR_H,
          borderRadius: BAR_H,
          backgroundColor: color,
        },
        side === 'left' ? { left: 0 } : { right: 0 },
        style,
      ]}
    />
  );
}
