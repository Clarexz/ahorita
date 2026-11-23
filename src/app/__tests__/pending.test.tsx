import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

import PendingScreen from '../pending';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  router: { back: jest.fn() },
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ partner: { id: 'u2', display_name: 'Caleb', nickname: null } }),
}));

let mockPending: unknown[] = [];
let mockState = { isLoading: false, isError: false };
jest.mock('@/features/questions', () => ({
  usePendingForMe: () => ({
    pending: mockPending,
    isLoading: mockState.isLoading,
    isError: mockState.isError,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));

const row = (id: string, text: string) => ({
  question: { id, text, category: 'amor', category_emoji: '💌' },
  day: null,
  last_activity: new Date(Date.now() - 3 * 3_600_000).toISOString(),
});

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <PendingScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('Te toca a ti', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPending = [];
    mockState = { isLoading: false, isError: false };
  });

  it('lista todas las pendientes y abre la pregunta', async () => {
    mockPending = [row('q1', '¿Antojo de las once?'), row('q2', '¿Un lugar?')];
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Te toca a ti' })).toBeTruthy();
    expect(screen.getByText('Caleb contestó 2 preguntas que te faltan.')).toBeTruthy();
    expect(screen.getByText('¿Un lugar?')).toBeTruthy();
    expect(screen.getAllByText('hace 3 h')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar: ¿Antojo de las once?' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/question', params: { id: 'q1' } });
  });

  it('sin pendientes dice que están al día', async () => {
    await renderScreen();
    expect(screen.getByText('Estás al día')).toBeTruthy();
    expect(screen.getByText('No te falta ninguna de las que contestó Caleb.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ir a Preguntas' }));
    expect(mockReplace).toHaveBeenCalledWith('/questions');
  });

  it('con error ofrece reintentar', async () => {
    mockState = { isLoading: false, isError: true };
    await renderScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
