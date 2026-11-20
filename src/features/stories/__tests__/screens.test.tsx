import 'react-native-gesture-handler/jestSetup';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/Toast';
import { todayIn as mockTodayIn } from '@/lib/dates';
import { ThemeProvider, lightColors } from '@/theme';

import StoriesScreen from '../../../app/(tabs)/stories';
import { StoryViewer } from '../components/StoryViewer';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Ale', nickname: null, avatar_path: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null, avatar_path: null },
  }),
  useToday: () => ({
    today: mockTodayIn('America/Mexico_City', new Date()),
    timeZone: 'America/Mexico_City',
  }),
}));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Image: (props: { source?: { cacheKey?: string } }) => (
      <View {...props} testID={`img:${props.source?.cacheKey ?? ''}`} />
    ),
  };
});
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/profile', () => ({ useSignedUrl: () => null }));

const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
const row = (id: string, userId: string, extra: Record<string, unknown> = {}) => ({
  id,
  couple_id: 'c1',
  user_id: userId,
  kind: 'text',
  media_path: null,
  thumb_path: null,
  text: 'Hay café',
  bg: 'postit',
  font: 'hand',
  strokes: null,
  stickers: [],
  created_at: iso(2),
  expires_at: new Date(Date.parse(iso(2)) + 24 * 3_600_000).toISOString(),
  deleted_at: null,
  views: [],
  reactions: [],
  replies: [],
  ...extra,
});

let mockStories: ReturnType<typeof row>[] = [];
const mockReact = jest.fn();
const mockRefresh = jest.fn(() => Promise.resolve());
const mockReply = jest.fn();
const mockMarkSeen = jest.fn();
jest.mock('../hooks', () => ({
  useActiveStories: () => ({
    stories: mockStories,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useStory: () => ({ story: null, isLoading: false, isError: false, refetch: jest.fn() }),
  useStoryMediaUrl: (path: string | null) => ({
    url: path ? `https://x.supabase.co/storage/v1/object/sign/stories/${path}?token=t` : null,
    isLoading: false,
    isError: false,
    refresh: mockRefresh,
  }),
  useMarkStorySeen: () => ({ mutate: mockMarkSeen }),
  useReactToStory: () => ({ mutate: mockReact }),
  useReplyToStory: () => ({ mutate: mockReply }),
  useSaveStoryToGallery: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteStory: () => ({ mutate: jest.fn() }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockStories = [];
});

describe('pestaña Stories', () => {
  it('sin stories dice que no hay nada, con humor', async () => {
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Nada hoy')).toBeTruthy();
    expect(screen.getByText('Nada por aquí')).toBeTruthy();
  });

  it('con la story de tu pareja sin ver la marca como nueva y abre el visor', async () => {
    mockStories = [row('s1', 'u2')];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Nueva')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Story nueva de Caleb' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story/view', params: { user: 'u2' } });
  });

  it('muestra quién vio las tuyas', async () => {
    mockStories = [
      row('s2', 'u1', { views: [{ user_id: 'u2', seen_at: iso(1) }], created_at: iso(0) }),
      row('s3', 'u1', { created_at: iso(0) }),
    ];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Vista')).toBeTruthy();
    expect(screen.getByText('Sin ver')).toBeTruthy();
  });

  it('las de ayer que siguen vivas salen aparte, no en "de hoy"', async () => {
    mockStories = [
      row('s5', 'u1', { created_at: iso(0) }),
      row('s6', 'u1', {
        created_at: iso(30),
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    ];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Las tuyas de hoy')).toBeTruthy();
    expect(screen.getByText('De ayer')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Tu story de/ })).toHaveLength(2);
    expect(screen.getByText(/quedan 1 h|queda un minuto|quedan \d+ min/)).toBeTruthy();
  });

  it('si solo hay de ayer, hoy dice que no has subido nada', async () => {
    mockStories = [
      row('s7', 'u1', {
        created_at: iso(30),
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    ];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Hoy todavía no subes nada.')).toBeTruthy();
    expect(screen.getByText('De ayer')).toBeTruthy();
  });

  it('"Crear una story" abre las opciones y manda a crear', async () => {
    await wrap(<StoriesScreen />);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Crear una story' })[0]);
    await fireEvent.press(screen.getByRole('button', { name: 'Dibujar' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story/new',
      params: { kind: 'drawing' },
    });
  });
});

describe('visor de stories', () => {
  it('marca como vista la de tu pareja y manda reacción y respuesta', async () => {
    mockStories = [row('s1', 'u2', { reactions: [{ user_id: 'u1', emoji: '😍' }] })];
    await wrap(<StoryViewer userId="u2" />);
    expect(mockMarkSeen).toHaveBeenCalledWith('s1');

    // Tocar otra reacción la manda; tocar la elegida la quita.
    await fireEvent.press(screen.getByRole('radio', { name: 'Reaccionar con 😂' }));
    expect(mockReact).toHaveBeenCalledWith({ id: 's1', emoji: '😂' }, expect.anything());
    await fireEvent.press(screen.getByRole('radio', { name: 'Reaccionar con 😍' }));
    expect(mockReact).toHaveBeenCalledWith({ id: 's1', emoji: null }, expect.anything());

    await fireEvent.changeText(screen.getByLabelText('Respóndele a Caleb'), 'Qué rico se ve');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(mockReply).toHaveBeenCalledWith({ id: 's1', body: 'Qué rico se ve' }, expect.anything());
  });

  it('en una story tuya dice si ya la vio y no deja reaccionar', async () => {
    mockStories = [
      row('s2', 'u1', {
        views: [{ user_id: 'u2', seen_at: iso(1) }],
        replies: [
          {
            id: 'r1',
            story_id: 's2',
            couple_id: 'c1',
            user_id: 'u2',
            body: 'Jaja',
            created_at: iso(1),
          },
        ],
      }),
    ];
    await wrap(<StoryViewer userId="u1" />);
    expect(screen.getByText(/Vista por Caleb/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Respuestas (1)' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Reaccionar con 😂' })).toBeNull();
    expect(mockMarkSeen).not.toHaveBeenCalled();
  });

  it('dibuja la story con colores fijos aunque el visor sea de noche', async () => {
    mockStories = [row('s4', 'u2', { kind: 'drawing', text: null, bg: 'paper', strokes: [] })];
    await wrap(<StoryViewer userId="u2" />);
    const frame = screen.getByLabelText('Story con un dibujo');
    expect(StyleSheet.flatten(frame.props.style).backgroundColor).toBe(lightColors.bg);
  });

  it('con foto muestra la carga hasta que se pinta, y la siguiente se baja de antemano', async () => {
    mockStories = [
      row('p1', 'u2', {
        kind: 'photo',
        media_path: 'c1/u2/a.jpg',
        thumb_path: 'c1/u2/a_thumb.jpg',
      }),
      row('p2', 'u2', {
        kind: 'photo',
        media_path: 'c1/u2/b.jpg',
        thumb_path: 'c1/u2/b_thumb.jpg',
      }),
    ];
    mockStories[1].created_at = iso(1);
    await wrap(<StoryViewer userId="u2" />);
    expect(screen.getByLabelText('Cargando la foto')).toBeTruthy();
    // La visible usa la ruta de Storage como llave de caché; la oculta es la siguiente.
    // (antes de cargar hay una copia difuminada detrás; la foto de verdad es la última)
    const visible = screen.getAllByTestId('img:storage:stories/c1/u2/a.jpg').at(-1)!;
    expect(
      screen.getByTestId('img:storage:stories/c1/u2/b.jpg', { includeHiddenElements: true }),
    ).toBeTruthy();
    await fireEvent(visible, 'load', { source: { width: 1600, height: 900 } });
    expect(screen.queryByLabelText('Cargando la foto')).toBeNull();
  });

  it('si la foto falla pide URL nueva y luego ofrece reintentar', async () => {
    mockStories = [
      row('p3', 'u2', {
        kind: 'photo',
        media_path: 'c1/u2/c.jpg',
        thumb_path: 'c1/u2/c_thumb.jpg',
      }),
    ];
    await wrap(<StoryViewer userId="u2" />);
    const find = () => screen.getAllByTestId('img:storage:stories/c1/u2/c.jpg').at(-1)!;
    await fireEvent(find(), 'error', {});
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    await fireEvent(find(), 'error', {});
    expect(screen.getByText('La foto no cargó.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  it('sin stories dice que ya se borró', async () => {
    await wrap(<StoryViewer userId="u2" />);
    expect(screen.getByText('Esta story ya se borró')).toBeTruthy();
  });
});
