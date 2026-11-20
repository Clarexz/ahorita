import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

import { MoodSheet } from '../components/MoodSheet';
import type { Mood } from '../api';

const mockMutate = jest.fn();
jest.mock('../hooks', () => ({ useSetMood: () => ({ mutate: mockMutate }) }));
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: jest.fn() }),
}));

const current = { emoji: '😴', note: 'cansado ayer' } as unknown as Mood;

const ui = (visible: boolean, onClose = jest.fn()) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 400, height: 800 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}
  >
    <ThemeProvider>
      <MoodSheet visible={visible} onClose={onClose} current={current} />
    </ThemeProvider>
  </SafeAreaProvider>
);

describe('MoodSheet', () => {
  beforeEach(() => mockMutate.mockClear());

  it('el mensaje opcional arranca vacío aunque haya uno anterior', async () => {
    await render(ui(true));
    expect(await screen.findByLabelText('¿Algo más? (opcional)')).toHaveProp('value', '');
  });

  it('al reabrir vuelve a estar vacío (no arrastra lo escrito)', async () => {
    const view = await render(ui(true));
    await fireEvent.changeText(await screen.findByLabelText('¿Algo más? (opcional)'), 'borrador');
    await view.rerender(ui(false));
    await view.rerender(ui(true));
    expect(await screen.findByLabelText('¿Algo más? (opcional)')).toHaveProp('value', '');
  });

  it('escribir sin guardar no cambia el mood', async () => {
    await render(ui(true));
    await fireEvent.changeText(await screen.findByLabelText('¿Algo más? (opcional)'), 'x');
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
