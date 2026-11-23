// Web (solo QA visual): dibuja las mismas formas SVG del widget real como imagen y el dato (o el
// mensaje) en texto. En Android se usa `WidgetPreview.android.tsx`, que dibuja el widget de verdad.
import { Image, Text, View } from 'react-native';

import {
  avatarSvg,
  BUBBLE_SHADOW,
  bubbleSvg,
  bubbleText,
  initialColor,
  messageLayout,
} from '@/widgets/components/message';
import { labelFontSize, shapeSide } from '@/widgets/components/WidgetFrame';
import { isShapeName, messageView, widgetShapeSvg, widgetView } from '@/widgets/view';

import type { WidgetPreviewProps } from './types';

const uri = (svg: string): { uri: string } => ({
  uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
});

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.65)',
  textShadowRadius: 3,
  textShadowOffset: { width: 0, height: 1 },
} as const;

function MessagePreview({ name, model, width, height }: WidgetPreviewProps) {
  const view = messageView(name, model);
  const l = messageLayout({ width, height });
  const text = bubbleText(view.style);
  const shadow = text.shadow ? SHADOW : {};
  return (
    <View
      accessible
      accessibilityLabel={`Vista previa del widget ${name}. ${view.a11y}`}
      style={{ width, height }}
    >
      <View style={{ position: 'absolute', left: l.avatarLeft, top: l.avatarTop }}>
        <Image
          source={uri(avatarSvg(l, view.style, view.fruits.partner))}
          style={{ width: l.avatar, height: l.avatar }}
          accessibilityElementsHidden
        />
        <View
          style={{
            position: 'absolute',
            width: l.avatar,
            height: l.avatar,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontWeight: '800',
              fontSize: l.initialSize,
              color: initialColor(view.style, view.fruits.partner),
              ...shadow,
            }}
          >
            {view.initial}
          </Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: l.bubbleLeft, top: l.bubbleTop }}>
        <Image
          source={uri(bubbleSvg(l, view.style, view.fruits.partner))}
          style={{ width: l.bubbleWidth, height: l.bubbleHeight }}
          accessibilityElementsHidden
        />
        <View
          style={{
            position: 'absolute',
            width: l.bubbleWidth,
            height: l.bubbleHeight,
            justifyContent: 'center',
            paddingLeft: l.textLeft,
            paddingRight: l.textRight,
            paddingBottom: view.style === 'tonal' ? BUBBLE_SHADOW : 0,
          }}
        >
          <Text
            numberOfLines={l.lines}
            style={{
              fontWeight: '500',
              fontSize: l.fontSize,
              lineHeight: l.lineHeight,
              color: text.message,
              ...shadow,
            }}
          >
            {view.message}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function WidgetPreview(props: WidgetPreviewProps) {
  const { name, model, width, height } = props;
  if (!isShapeName(name)) return <MessagePreview {...props} />;
  const view = widgetView(name, model);
  const side = shapeSide(width, height);
  const svg = widgetShapeSvg(view, { size: side, id: name });
  return (
    <View
      accessible
      accessibilityLabel={`Vista previa del widget ${name}. ${view.a11y}`}
      style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
    >
      <Image source={uri(svg)} style={{ width: side, height: side }} accessibilityElementsHidden />
      <Text
        numberOfLines={1}
        style={{
          width: '100%',
          marginTop: 2,
          textAlign: 'center',
          color: '#FFFFFF',
          fontWeight: '600',
          fontSize: labelFontSize(view.text),
          ...SHADOW,
        }}
      >
        {view.text}
      </Text>
    </View>
  );
}
