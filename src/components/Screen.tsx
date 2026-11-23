import type { ReactNode } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Gutter de 20 dp a los lados (por defecto sí). Sin él, el contenido llega al borde. */
  padded?: boolean;
  /** Con `scroll`: activa el "jalar para refrescar" (DISENO §7). */
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * Solo con `scroll`: el contenido ocupa al menos el alto de la pantalla (para repartirlo con
   * `justifyContent`) y se quita el rebote, así lo que cabe no se desplaza.
   */
  fill?: boolean;
  /**
   * Contenido flotante sobre la parte baja de la pantalla (p. ej. un botón de guardar que solo
   * aparece cuando hay cambios), respetando safe area y gutter. Entra y sale con un fundido corto
   * (DISENO §5: sin subir ni rebotar). Con `scroll` se agrega aire abajo para que no tape lo
   * último. Pasa `null`/`false` para ocultarlo.
   */
  floating?: ReactNode;
};

/** Contenedor de pantalla: fondo `bg`, safe area y gutter de 20 dp (DISENO §7). */
export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshing = false,
  onRefresh,
  fill = false,
  floating,
}: Props) {
  const { colors, page, spacing, fruit, motion } = useTheme();
  const reduced = useReducedMotion();
  const fadeMs = reduced ? motion.reduced : motion.base.duration;
  const padding = {
    paddingHorizontal: padded ? page.gutter : 0,
    paddingTop: spacing.lg,
    // Con algo flotando, deja espacio para que no tape el final del contenido.
    paddingBottom: floating ? spacing.xxxl * 3 : spacing.xl,
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.root}>
        {scroll ? (
          <KeyboardAwareScrollView
            contentContainerStyle={fill ? [padding, styles.fill] : padding}
            showsVerticalScrollIndicator={false}
            bounces={!fill}
            overScrollMode={fill ? 'never' : 'auto'}
            keyboardShouldPersistTaps="handled"
            // Aire entre el campo y el teclado (el contador o el error de abajo también se ven).
            bottomOffset={spacing.xxl}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={fruit.me.hex}
                  colors={[fruit.me.hex]}
                  progressBackgroundColor={colors.surface}
                />
              ) : undefined
            }
          >
            {children}
          </KeyboardAwareScrollView>
        ) : (
          <View style={[styles.root, padding]}>{children}</View>
        )}
        {floating ? (
          <Animated.View
            entering={FadeIn.duration(fadeMs)}
            exiting={FadeOut.duration(reduced ? motion.reduced : motion.exit.duration)}
            style={[styles.floating, { left: page.gutter, right: page.gutter, bottom: spacing.lg }]}
          >
            {floating}
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flexGrow: 1 },
  floating: { position: 'absolute' },
});
