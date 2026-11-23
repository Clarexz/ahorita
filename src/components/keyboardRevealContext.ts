import { createContext, useContext } from 'react';
import type { HostInstance } from 'react-native';

/**
 * Lo que un contenedor con scroll propio ofrece a sus campos para llevarlos a la vista cuando
 * aparece el teclado. Hace falta dentro de un `Modal` (el `Sheet`): ahí keyboard-controller sí
 * sigue la altura del teclado pero no sabe qué campo tiene el foco, así que su
 * `KeyboardAwareScrollView` no hace scroll solo.
 */
export type KeyboardReveal = {
  focus: (field: HostInstance) => void;
  blur: (field: HostInstance) => void;
};

export const KeyboardRevealContext = createContext<KeyboardReveal | null>(null);

export const useKeyboardReveal = () => useContext(KeyboardRevealContext);
