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

  it('under reduce-motion the key is a single press → INLINE confirm → spend (no hold, no nested sheet)', () => {
    mockReduced = true;
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={12} onBuy={onBuy} />));
    // no hold affordance — a plain BUY key
    expect(screen.queryByLabelText('Hold to buy for 8 PX')).toBeNull();
    // pre-confirm: only the BUY key, no confirm/cancel yet
    expect(screen.queryByText('CONFIRM · 8 PX')).toBeNull();
    fireEvent.press(screen.getByLabelText('Buy for 8 PX'));
    // F-8 E3-C3: the confirm is INLINE in the bar (CONFIRM + CANCEL both present) — not a nested
    // ConfirmSheet that a PulledSheet parent would clip. The spend prompt shows in the meta line.
    expect(screen.getByText('CONFIRM · 8 PX')).toBeTruthy();
    expect(screen.getByLabelText('Cancel')).toBeTruthy();
    expect(screen.getByText('Spend 8 PX — pixels are spent instantly.')).toBeTruthy();
    fireEvent.press(screen.getByText('CONFIRM · 8 PX'));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('under reduce-motion CANCEL dismisses the inline confirm and spends nothing', () => {
    mockReduced = true;
    const onBuy = jest.fn();
    render(wrap(<BuyBar price={8} balance={12} onBuy={onBuy} />));
    fireEvent.press(screen.getByLabelText('Buy for 8 PX'));
    fireEvent.press(screen.getByLabelText('Cancel'));
    // back to the pre-confirm BUY key; nothing spent
    expect(screen.queryByText('CONFIRM · 8 PX')).toBeNull();
    expect(screen.getByLabelText('Buy for 8 PX')).toBeTruthy();
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('shows the balance and an optional note', () => {
    render(wrap(<BuyBar price={4} balance={27} onBuy={jest.fn()} note="Spends pixels instantly" />));
    expect(screen.getByText('YOU HAVE 27 PX')).toBeTruthy();
    expect(screen.getByText('Spends pixels instantly')).toBeTruthy();
  });
});
