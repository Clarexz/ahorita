import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type HostInstance,
  type ScrollViewInstance,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { revealScrollOffset } from '@/lib/keyboardReveal';
import { useTheme } from '@/theme';

import { KeyboardRevealContext, type KeyboardReveal } from './keyboardRevealContext';
import { bezierOf } from './motion';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Hoja inferior de radio 28 sobre el velo, con agarradera (DISENO §7). */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors, spacing, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const veil = useSharedValue(0);

  // Montar en el mismo render en que se pide abrir (patrón de estado derivado).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      veil.value = withTiming(1, { duration: reduced ? motion.reduced : motion.base.duration });
      y.value = reduced
        ? withTiming(0, { duration: motion.reduced })
        : withTiming(0, { duration: motion.base.duration, easing: bezierOf(motion.base) });
    } else if (mounted) {
      veil.value = withTiming(0, { duration: reduced ? motion.reduced : motion.exit.duration });
      y.value = withTiming(
        height,
        {
          duration: reduced ? motion.reduced : motion.exit.duration,
          easing: bezierOf(motion.exit),
        },
        (done) => {
          if (done) runOnJS(setMounted)(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // El contenido hace scroll dentro de la hoja: con el teclado abierto la hoja se encoge y lo de
  // abajo (la nota del mood, por ejemplo) quedaba recortado sin forma de alcanzarlo. Dentro del
  // Modal nadie más sabe qué campo tiene el foco, así que la hoja lo lleva a la vista ella misma:
  // al enfocarlo y cada vez que cambia su altura (el teclado la encoge mientras sube).
  const scroll = useRef<ScrollViewInstance>(null);
  const content = useRef<HostInstance>(null);
  const field = useRef<HostInstance | null>(null);
  const scrollY = useRef(0);
  const viewport = useRef(0);

  const revealField = useCallback(
    (animated: boolean) => {
      const target = field.current;
      const container = content.current;
      if (!target || !container) return;
      target.measureLayout(container, (_x, top, _w, h) => {
        const next = revealScrollOffset({
          top,
          bottom: top + h,
          scrollY: scrollY.current,
          viewport: viewport.current,
          margin: spacing.lg,
        });
        if (next !== null) scroll.current?.scrollTo({ y: next, animated });
      });
    },
    [spacing.lg],
  );

  const reveal = useMemo<KeyboardReveal>(
    () => ({
      focus: (view) => {
        field.current = view;
        // Si el teclado ya estaba abierto (se pasó de un campo a otro) no habrá cambio de altura.
        requestAnimationFrame(() => revealField(true));
      },
      blur: (view) => {
        if (field.current === view) field.current = null;
      },
    }),
    [revealField],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      {/* Con el teclado abierto la hoja sube y se encoge (maxHeight en %); su contenido hace scroll. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, veilStyle]}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: colors.scrim }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              maxHeight: '90%',
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl + insets.bottom,
              boxShadow: shadows.float,
            },
            sheetStyle,
          ]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.surface2,
              marginBottom: spacing.md,
            }}
          />
          {title ? (
            <Text variant="h2" accessibilityRole="header" style={{ marginBottom: spacing.md }}>
              {title}
            </Text>
          ) : null}
          <ScrollView
            ref={scroll}
            style={{ flexGrow: 0, flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
            }}
            onLayout={(e) => {
              viewport.current = e.nativeEvent.layout.height;
              // Sin animación: acompaña cuadro a cuadro a la hoja que se encoge.
              revealField(false);
            }}
          >
            <View ref={content}>
              <KeyboardRevealContext.Provider value={reveal}>
                {children}
              </KeyboardRevealContext.Provider>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
