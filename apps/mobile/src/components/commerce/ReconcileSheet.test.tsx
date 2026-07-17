import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { ReconcileSheet } from './ReconcileSheet';

// reduce-motion on → the BuyBar renders its OQ-046 single-press BUY path (deterministic in jest).
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const ITEMS = [
  { cosmeticId: 'frost', name: 'FROST', type: 'effect' as const, price: 8 },
  { cosmeticId: 'thin-gold', name: 'GOLD', type: 'frame' as const, price: 3 },
];

// ReconcileSheet (CARD-13 · styler-states P6) — the ACQUIRE ALL bridge, funded + short fragments.
describe('ReconcileSheet — FUNDED (balance covers the total)', () => {
  it('lists every unowned item + total and confirms via the BuyBar → onAcquireAll', () => {
    const onAcquireAll = jest.fn();
    render(
      wrap(
        <ReconcileSheet
          visible
          onClose={jest.fn()}
          items={ITEMS}
          total={11}
          balance={20}
          onAcquireAll={onAcquireAll}
          onTopUp={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('FROST')).toBeTruthy();
    expect(screen.getByText('GOLD')).toBeTruthy();
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    // funded → the BuyBar path (reduce-motion = press → ConfirmSheet purchase tone)
    fireEvent.press(screen.getByLabelText('Buy for 11 PX'));
    fireEvent.press(screen.getByText('CONFIRM · 11 PX'));
    expect(onAcquireAll).toHaveBeenCalledTimes(1);
    // no TOP UP door in the funded fragment
    expect(screen.queryByText('TOP UP PIXELS ▸')).toBeNull();
  });
});

describe('ReconcileSheet — SHORT (balance below the total)', () => {
  it('shows the shortBy line + the TOP UP door; never a buy control', () => {
    const onTopUp = jest.fn();
    render(
      wrap(
        <ReconcileSheet
          visible
          onClose={jest.fn()}
          items={ITEMS}
          total={11}
          balance={4}
          onAcquireAll={jest.fn()}
          onTopUp={onTopUp}
        />,
      ),
    );
    // shortBy = 7
    expect(screen.getByText(/7 PX short/)).toBeTruthy();
    expect(screen.queryByLabelText('Buy for 11 PX')).toBeNull();
    fireEvent.press(screen.getByText('TOP UP PIXELS ▸'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
  });

  it('NOT NOW closes without spending', () => {
    const onClose = jest.fn();
    const onAcquireAll = jest.fn();
    render(
      wrap(
        <ReconcileSheet
          visible
          onClose={onClose}
          items={ITEMS}
          total={11}
          balance={0}
          onAcquireAll={onAcquireAll}
          onTopUp={jest.fn()}
        />,
      ),
    );
    fireEvent.press(screen.getByText('NOT NOW'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAcquireAll).not.toHaveBeenCalled();
  });
});
