// Fondo de pantalla de muestra para las vistas previas de widgets (ver `WALLPAPER`).
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { WALLPAPER, WALLPAPER_BLOBS } from './types';

export function Wallpaper({ height, children }: { height: number; children: ReactNode }) {
  return (
    <View
      style={{
        alignSelf: 'stretch',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: WALLPAPER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {WALLPAPER_BLOBS.map((b, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: b.color,
            opacity: b.opacity,
            ...('left' in b ? { left: b.left } : { right: b.right }),
            ...('top' in b ? { top: b.top } : { bottom: b.bottom }),
          }}
        />
      ))}
      {children}
    </View>
  );
}
