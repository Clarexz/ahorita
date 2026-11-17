import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { LoadingSymbol } from './LoadingSymbol';
import { useTapScale } from './motion';
import { Text } from './Text';

// Colores de marca de Google: son de ellos y no se modifican (guías de marca del botón). Es la
// misma excepción que las frutas: dominio, no tokens del tema.
const GOOGLE_LOGO = {
  blue: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC05',
  red: '#EA4335',
} as const;
const GOOGLE_BUTTON = {
  light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3' },
} as const;

/** Logo "G" de Google, a color y sin modificar. */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path
        fill={GOOGLE_LOGO.red}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill={GOOGLE_LOGO.blue}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill={GOOGLE_LOGO.yellow}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill={GOOGLE_LOGO.green}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

type Props = {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Texto del botón; por defecto el de las guías de marca en español. */
  title?: string;
};

/** "Continuar con Google" (DISENO §7): píldora de 50 dp, tema claro/oscuro de Google. */
export function GoogleButton({ onPress, loading = false, disabled = false, title }: Props) {
  const { isDark, spacing, radius, type } = useTheme();
  const tap = useTapScale();
  const label = title ?? 'Continuar con Google';
  const palette = isDark ? GOOGLE_BUTTON.dark : GOOGLE_BUTTON.light;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      style={{ alignSelf: 'stretch', opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={[
          {
            height: 50,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.xl - 2,
            borderRadius: radius.pill,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.border,
          },
          tap.style,
        ]}
      >
        {loading ? (
          <LoadingSymbol size={24} accessibilityLabel="Cargando" />
        ) : (
          <>
            <GoogleLogo />
            <View>
              <Text
                variant="ui"
                numberOfLines={1}
                style={{
                  color: palette.text,
                  fontFamily: type.bodyStrong.fontFamily,
                  fontSize: 16,
                }}
              >
                {label}
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
