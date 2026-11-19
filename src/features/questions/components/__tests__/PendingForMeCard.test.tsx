import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { PendingForMeCard } from '../PendingForMeCard';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
let mockPending: unknown[] = [];
jest.mock('../../hooks', () => ({ usePendingForMe: () => ({ pending: mockPending }) }));

const p = (id: string, text: string) => ({
  question: { id, text, category: 'amor', category_emoji: '💌' },
  day: null,
  last_activity: '2026-11-19T00:00:00Z',
});

const renderCard = (variant: 'compact' | 'list') =>
  render(
    <ThemeProvider>
      <PendingForMeCard partnerName="Chu" variant={variant} />
    </ThemeProvider>,
  );

describe('PendingForMeCard', () => {
  beforeEach(() => mockPush.mockClear());

  it('no pinta nada si no hay pendientes', async () => {
    mockPending = [];
    await renderCard('list');
    expect(screen.queryByText('Te toca a ti')).toBeNull();
  });

  it('en Inicio muestra la más reciente y lleva a contestarla', async () => {
    mockPending = [p('q1', '¿Antojo de las once?'), p('q2', '¿Otra?')];
    await renderCard('compact');
    expect(screen.getByText('Chu contestó 2 preguntas que te faltan.')).toBeTruthy();
    expect(screen.getByText('¿Antojo de las once?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/question', params: { id: 'q1' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todas' }));
    expect(mockPush).toHaveBeenCalledWith('/questions');
  });

  it('en Preguntas lista hasta 3 y cuenta las demás', async () => {
    mockPending = [p('a', 'A'), p('b', 'B'), p('c', 'C'), p('d', 'D'), p('e', 'E')];
    await renderCard('list');
    expect(screen.getByRole('button', { name: 'Contestar: A' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Contestar: D' })).toBeNull();
    expect(screen.getByText('Y 2 más en sus categorías.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar: C' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/question', params: { id: 'c' } });
  });
});
