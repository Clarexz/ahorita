// Dibujo de los widgets (react-native-android-widget). Contrato estable entre el task handler y
// los componentes: dado el nombre, el modelo (src/lib/widgets.ts) y el tamaño en dp, devuelve las
// variantes clara y oscura (Android elige según el tema del sistema). Los widgets de forma son 1×1,
// sin fondo, con una forma (tonal o Escarcha) y un dato debajo; el mensaje de tu pareja es una
// burbuja ancha (docs/DISENO.md §9).
import type { WidgetRepresentation } from 'react-native-android-widget';

import type { WidgetModel, WidgetName } from '@/lib/widgets';

import { MessageFrame, WidgetFrame, palettes, type WidgetSize } from './components';
import { isShapeName, messageView, widgetView } from './view';

export type { WidgetSize };

export function renderWidget(
  name: WidgetName,
  model: WidgetModel,
  size: WidgetSize,
): WidgetRepresentation {
  const draw = (palette: typeof palettes.light) =>
    isShapeName(name) ? (
      <WidgetFrame name={name} palette={palette} size={size} view={widgetView(name, model)} />
    ) : (
      <MessageFrame name={name} palette={palette} size={size} view={messageView(name, model)} />
    );
  return { light: draw(palettes.light), dark: draw(palettes.dark) };
}
