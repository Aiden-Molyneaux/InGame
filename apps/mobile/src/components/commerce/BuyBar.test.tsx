import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BuyBar, HOLD_MS } from './BuyBar';
import prefsReducer from '../../store/prefsSlice';

// A flippable reduce-motion mock (the `mock` prefix lets the factory close over it).
let mockReduced = false;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// BuyBar (OQ-046 launch gate) — the hold-to-buy path + the reduce-motion non-hold accessible alt. Both
// must funnel to the same spend; a released hold must spend nothing.
describe('BuyBar — the OQ-046 buy gate (both paths)', () => {
  beforeEach(() => {
    mockReduced = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('completing the hold spends once', () => {
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={12} onBuy={onBuy} />));
    const key = screen.getByLabelText('Hold to buy for 8 PX');
    fireEvent(key, 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('releasing before the hold completes spends nothing', () => {
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={12} onBuy={onBuy} />));
    const key = screen.getByLabelText('Hold to buy for 8 PX');
    fireEvent(key, 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS - 50));
    fireEvent(key, 'pressOut');
    act(() => jest.advanceTimersByTime(200));
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('a disabled bar never spends', () => {
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={2} onBuy={onBuy} disabled />));
    const key = screen.getByLabelText('Hold to buy for 8 PX');
    fireEvent(key, 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS * 2));
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('under reduce-motion the key is a single press → ConfirmSheet → spend (no hold)', () => {
    mockReduced = true;
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={12} onBuy={onBuy} />));
    // no hold affordance — a plain BUY key
    expect(screen.queryByLabelText('Hold to buy for 8 PX')).toBeNull();
    fireEvent.press(screen.getByLabelText('Buy for 8 PX'));
    // the confirm gate opens; confirming spends (ScreenButton uppercases the label)
    fireEvent.press(screen.getByText('CONFIRM · 8 PX'));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('shows the balance and an optional note', () => {
    render(wrap(<BuyBar price={4} balance={27} onBuy={jest.fn()} note="Spends pixels instantly" />));
    expect(screen.getByText('YOU HAVE 27 PX')).toBeTruthy();
    expect(screen.getByText('Spends pixels instantly')).toBeTruthy();
  });
});
