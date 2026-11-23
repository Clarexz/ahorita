import { useState } from 'react';
import { Platform, View } from 'react-native';

import {
  Button,
  Card,
  Notice,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  useToast,
} from '@/components';
import {
  MESSAGE_PREVIEW_SIZE,
  PREVIEW_SIZE,
  Wallpaper,
  WidgetPreview,
} from '@/components/widget-preview';
import { pinWidget } from '@/components/widget-preview/requestPin';
import { APP_NAME } from '@/constants/app';
import { useCouple } from '@/features/couple';
import { coupleDayZone } from '@/lib/coupleDay';
import { detectTimeZone } from '@/lib/timezone';
import { previewModel } from '@/lib/widgetPreview';
import { WIDGET_KINDS, widgetNameFor, type WidgetKind, type WidgetStyle } from '@/lib/widgets';
import { useTheme } from '@/theme';

const STEPS = [
  'Mantén presionado un espacio vacío de tu pantalla de inicio.',
  `Elige “Widgets” y busca ${APP_NAME}.`,
  'Arrastra el widget que quieras a tu pantalla.',
  'Casi todos ocupan un solo cuadro; el mensaje de tu pareja es más ancho. Acomoda los que quieras sobre tu fondo de pantalla.',
];

const INFO: Record<WidgetKind, { title: string; text: string }> = {
  DaysTogether: {
    title: 'Días juntos',
    text: 'El conteo de su historia. Toca para abrir el inicio.',
  },
  PartnerMood: {
    title: 'Mood de tu pareja',
    text: 'Cómo se siente, justo ahora. Toca para ver los moods de los dos.',
  },
  Countdown: {
    title: 'La próxima vez',
    text: 'Una media luna que se llena conforme se acerca lo próximo: su visita, su aniversario o sus cumples.',
  },
  PartnerStory: {
    title: 'Story de tu pareja',
    text: 'Lo último que subió tu pareja: foto, nota o dibujo. Toca para verla completa.',
  },
  Distance: {
    title: 'Distancia',
    text: 'A cuántos kilómetros están ahorita. Solo se ve si los dos activan su distancia.',
  },
  Streak: {
    title: 'Racha',
    text: 'Cuántos días seguidos llevan contestando la pregunta del día. Toca para contestar.',
  },
  PartnerMessage: {
    title: 'Mensaje de tu pareja',
    text: 'La nota que te dejó con su mood, en una burbuja. Mide de 3×1 a 4×2 cuadros. Toca para ver los moods.',
  },
};

const STYLE_OPTIONS = [
  { value: 'tonal', label: 'Tonal' },
  { value: 'frost', label: 'Escarcha' },
] as const;

const FROST_NOTE =
  'Escarcha es blanco translúcido: deja ver tu fondo de pantalla a través del widget.';

function WidgetCard({ kind, model }: { kind: WidgetKind; model: ReturnType<typeof previewModel> }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const [pinning, setPinning] = useState(false);
  const [style, setStyle] = useState<WidgetStyle>('tonal');
  const info = INFO[kind];
  const name = widgetNameFor(kind, style);
  const size = kind === 'PartnerMessage' ? MESSAGE_PREVIEW_SIZE : PREVIEW_SIZE;

  const add = async () => {
    setPinning(true);
    const ok = await pinWidget(name);
    setPinning(false);
    toast.show(
      ok
        ? { message: 'Confirma en tu pantalla de inicio para agregarlo.', tone: 'success' }
        : {
            message: 'Tu celular no deja agregarlo desde aquí. Hazlo con el paso a paso de arriba.',
            tone: 'info',
          },
    );
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="h3" accessibilityRole="header">
          {info.title}
        </Text>
        <Text variant="note" tone="muted">
          {info.text}
        </Text>
      </View>
      <Segmented
        options={STYLE_OPTIONS}
        value={style}
        onChange={setStyle}
        accessibilityLabel={`Estilo del widget ${info.title}`}
      />
      <Wallpaper height={size.height + spacing.xl * 2}>
        <WidgetPreview name={name} model={model} width={size.width} height={size.height} />
      </Wallpaper>
      {style === 'frost' ? (
        <Text variant="note" tone="muted">
          {FROST_NOTE}
        </Text>
      ) : null}
      {Platform.OS === 'android' ? (
        <Button
          title="Agregar a mi pantalla"
          variant="secondary"
          icon="plus"
          loading={pinning}
          onPress={add}
          fullWidth
        />
      ) : (
        <Text variant="note" tone="muted">
          Los widgets se agregan desde el celular.
        </Text>
      )}
    </Card>
  );
}

export default function WidgetsScreen() {
  const { spacing, colors, radius } = useTheme();
  const { couple, me, partner } = useCouple();
  const model = previewModel({
    anniversary: couple?.anniversary_date,
    timezone: couple
      ? coupleDayZone([detectTimeZone(), partner?.timezone], couple.timezone)
      : undefined,
    meName: me?.nickname || me?.display_name,
    meBirthday: me?.birthday,
    partnerName: partner?.nickname || partner?.display_name,
    partnerBirthday: partner?.birthday,
  });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Widgets" back="Más" />

        <View style={{ gap: spacing.lg }}>
          {STEPS.map((step, i) => (
            <View
              key={step}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodyStrong">{i + 1}</Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Notice>
          Se actualizan solos más o menos cada 30 minutos, al abrir la app y cuando tu pareja cambia
          su mood o sube una story.
        </Notice>

        <View style={{ gap: spacing.lg }}>
          {WIDGET_KINDS.map((kind) => (
            <WidgetCard key={kind} kind={kind} model={model} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
