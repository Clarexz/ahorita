import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { Input } from '../Input';
import { KeyboardRevealContext } from '../keyboardRevealContext';

describe('Input dentro de un contenedor que lleva el campo a la vista', () => {
  it('avisa al enfocarse y al perder el foco (así la hoja lo sube sobre el teclado)', async () => {
    const reveal = { focus: jest.fn(), blur: jest.fn() };
    await render(
      <ThemeProvider>
        <KeyboardRevealContext.Provider value={reveal}>
          <Input label="¿Algo más? (opcional)" value="" onChangeText={() => {}} />
        </KeyboardRevealContext.Provider>
      </ThemeProvider>,
    );
    const field = screen.getByLabelText('¿Algo más? (opcional)');
    fireEvent(field, 'focus');
    expect(reveal.focus).toHaveBeenCalledTimes(1);
    fireEvent(field, 'blur');
    expect(reveal.blur).toHaveBeenCalledWith(reveal.focus.mock.calls[0][0]);
  });
});
