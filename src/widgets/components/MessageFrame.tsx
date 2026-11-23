'use no memo';
// Widget "Mensaje de tu pareja": a la izquierda un círculo con su inicial y a la derecha una
// burbuja con colita que lleva la nota de su mood. Sin fondo propio: la burbuja es un SVG
// (tonal: Hueso con sombra de su fruta; Escarcha: blanco translúcido con contorno).
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { MessageView } from '../view';
import {
  avatarSvg,
  BUBBLE_SHADOW,
  bubbleSvg,
  bubbleText,
  initialColor,
  messageLayout,
} from './message';
import { col, FONT, tapProps, type WidgetProps } from './palette';

type Props = WidgetProps & { view: MessageView };

const TEXT_SHADOW = {
  textShadowColor: col('rgba(0,0,0,0.65)'),
  textShadowRadius: 3,
  textShadowOffset: { width: 0, height: 1 },
} as const;

export function MessageFrame({ name, size, view }: Props) {
  const layout = messageLayout(size, view.meta !== null);
  const { style, fruits } = view;
  const text = bubbleText(style);
  const shadow = text.shadow ? TEXT_SHADOW : {};

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: layout.avatarLeft,
      }}
      {...tapProps(name, view.a11y)}
    >
      <OverlapWidget
        style={{
          width: layout.avatar,
          height: layout.avatar,
          marginTop: layout.avatarTop,
          marginRight: 1,
        }}
      >
        <SvgWidget
          svg={avatarSvg(layout, style, fruits.partner)}
          style={{ width: layout.avatar, height: layout.avatar }}
        />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={view.initial}
            maxLines={1}
            allowFontScaling={false}
            style={{
              fontFamily: FONT.display,
              fontSize: layout.initialSize,
              textAlign: 'center',
              color: col(initialColor(style, fruits.partner)),
              ...shadow,
            }}
          />
        </FlexWidget>
      </OverlapWidget>

      <OverlapWidget
        style={{
          width: layout.bubbleWidth,
          height: layout.bubbleHeight,
          marginTop: layout.bubbleTop,
        }}
      >
        <SvgWidget
          svg={bubbleSvg(layout, style, fruits.partner)}
          style={{ width: layout.bubbleWidth, height: layout.bubbleHeight }}
        />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingLeft: layout.textLeft,
            paddingRight: layout.textRight,
            paddingBottom: style === 'tonal' ? BUBBLE_SHADOW : 0,
          }}
        >
          <TextWidget
            text={view.message}
            maxLines={layout.lines}
            truncate="END"
            allowFontScaling={false}
            style={{
              width: 'match_parent',
              fontFamily: FONT.medium,
              fontSize: layout.fontSize,
              color: col(text.message),
              ...shadow,
            }}
          />
          {layout.showMeta && view.meta ? (
            <TextWidget
              text={view.meta}
              maxLines={1}
              truncate="END"
              allowFontScaling={false}
              style={{
                width: 'match_parent',
                marginTop: 1,
                fontFamily: FONT.semiBold,
                fontSize: layout.metaSize,
                color: col(text.meta),
                ...shadow,
              }}
            />
          ) : null}
        </FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}
