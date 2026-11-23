import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { FruitPicker, blockedReason } from '../FruitPicker';
import { FRUIT_GROUP_LABELS, FRUIT_KEYS, fruitOptions } from '@/lib/fruits';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('FruitPicker', () => {
  it('muestra todas las frutas agrupadas por color', async () => {
    await wrap(<FruitPicker value="sandia" partnerFruit={null} onChange={() => {}} />);
    for (const name of ['Sandía', 'Fresa', 'Manzana roja', 'Manzana verde', 'Pitaya', 'Coco']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    for (const label of Object.values(FRUIT_GROUP_LABELS)) {
      expect(screen.getByRole('header', { name: label })).toBeTruthy();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(FRUIT_KEYS.length);
  });

  it('elegir una fruta libre llama onChange', async () => {
    const onChange = jest.fn();
    await wrap(<FruitPicker value="sandia" partnerFruit={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Uva' }));
    expect(onChange).toHaveBeenCalledWith('uva');
  });

  it('una fruta bloqueada no dispara onChange y queda deshabilitada', async () => {
    const onChange = jest.fn();
    // Pareja con Mango: solo Mango (la misma) se bloquea; Limón y Plátano siguen libres.
    await wrap(
      <FruitPicker value="sandia" partnerFruit="mango" partnerName="Ximena" onChange={onChange} />,
    );
    const same = screen.getByRole('radio', { name: /^Mango/ });
    const free = screen.getByRole('radio', { name: /^Limón/ });
    expect(same.props.accessibilityState.disabled).toBe(true);
    expect(free.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(same);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('es de Ximena')).toBeTruthy();
    expect(screen.getAllByText(/^es de /)).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /^Plátano/ }).props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it('marca la seleccionada y la sugerida', async () => {
    await wrap(<FruitPicker value="uva" partnerFruit="mango" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Uva' }).props.accessibilityState.selected).toBe(true);
    // Mango sugiere Sandía.
    expect(screen.getByText('sugerida')).toBeTruthy();
  });

  it('el motivo es de quién es la fruta', () => {
    const options = fruitOptions('sandia');
    const same = options.find((o) => o.fruit.key === 'sandia');
    const free = options.find((o) => o.fruit.key === 'uva');
    expect(blockedReason(same!, 'Ale')).toBe('es de Ale');
    expect(blockedReason(same!)).toBe('es de tu pareja');
    expect(blockedReason(free!)).toBeNull();
  });
});
