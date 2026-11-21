import type { WidgetModel, WidgetName } from '@/lib/widgets';

export type WidgetPreviewProps = {
  name: WidgetName;
  model: WidgetModel;
  width: number;
  height: number;
};

/** Tamaño de las vistas previas (dp) de los widgets de forma: una celda 1×1 de un launcher típico. */
export const PREVIEW_SIZE = { width: 84, height: 96 };

/** Tamaño de la vista previa del mensaje de tu pareja (dp): unos 4×1 cuadros. */
export const MESSAGE_PREVIEW_SIZE = { width: 300, height: 66 };

/**
 * Fondo de pantalla simulado: los widgets no tienen fondo, así que la vista previa lleva uno fijo.
 * La Escarcha es blanco translúcido y no se ve sobre un fondo liso claro: la muestra va sobre un
 * fondo oscuro con manchas de color, como un fondo de pantalla de verdad.
 */
export const WALLPAPER = '#2A2540';
export const WALLPAPER_BLOBS = [
  { color: '#E2557A', size: 150, left: -40, top: -50, opacity: 0.6 },
  { color: '#3F7FE0', size: 170, right: -50, bottom: -80, opacity: 0.55 },
  { color: '#F2B84B', size: 70, right: 60, top: -30, opacity: 0.45 },
] as const;
