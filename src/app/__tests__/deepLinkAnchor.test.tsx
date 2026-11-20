import { Stack, router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

// Misma configuración que exporta `src/app/_layout.tsx` (no se importa: arrastra toda la app).
const unstable_settings = { anchor: '(tabs)' };

// Comprueba la regla del ancla: un deep link directo (widget, notificación) a una pantalla suelta
// deja `(tabs)` debajo en la pila, así que "atrás" regresa a Inicio y no cierra la app.
const tree = () => ({
  _layout: {
    default: () => <Stack screenOptions={{ headerShown: false }} />,
    unstable_settings,
  },
  '(tabs)/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/index': () => <Text>inicio</Text>,
  'events/index': () => <Text>eventos</Text>,
});

describe('ancla (tabs)', () => {
  it('un deep link a /events deja Inicio debajo', async () => {
    const view = await renderRouter(tree(), { initialUrl: '/events' });
    expect(view.getByText('eventos')).toBeTruthy();
    expect(router.canGoBack()).toBe(true);
    await act(async () => router.back());
    expect(view.getByText('inicio')).toBeTruthy();
  });

  it('abrir Inicio no duplica la pila', async () => {
    const view = await renderRouter(tree(), { initialUrl: '/' });
    expect(view.getByText('inicio')).toBeTruthy();
    expect(router.canGoBack()).toBe(false);
  });
});
