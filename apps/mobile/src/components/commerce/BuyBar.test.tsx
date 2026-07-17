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

  it('shows the prominent balance line (ruling 4) and an optional note', () => {
    render(wrap(<BuyBar price={4} balance={27} onBuy={jest.fn()} note="Spends pixels instantly" />));
    // F-21 ruling 4 — the balance is its own gold-marked line (label + count + glyph), read via its a11y label.
    expect(screen.getByLabelText('You have 27 pixels')).toBeTruthy();
    expect(screen.getByText('27')).toBeTruthy();
    expect(screen.getByText('Spends pixels instantly')).toBeTruthy();
  });

  // G3 (M5 F-9) — insufficient funds NEVER offer the hold; the bar renders NOT-ENOUGH + an inline TOP UP.
  it('G3: can’t-afford (balance < price, onTopUp given) shows NOT ENOUGH + TOP UP, never a hold key', () => {
    const onBuy = jest.fn();
    const onTopUp = jest.fn();
    render(wrap(<BuyBar price={8} balance={3} onBuy={onBuy} onTopUp={onTopUp} />));
    expect(screen.queryByLabelText('Hold to buy for 8 PX')).toBeNull(); // no hold offered
    expect(screen.getByText(/NOT ENOUGH/)).toBeTruthy();
    expect(screen.getByText(/— YOU HAVE 3/)).toBeTruthy(); // the G3 shortfall line (distinct from the meta)
    fireEvent.press(screen.getByText('TOP UP'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('G3 is not triggered without a top-up destination (the primitive keeps its hold key)', () => {
    render(wrap(<BuyBar price={8} balance={3} onBuy={jest.fn()} />)); // no onTopUp
    expect(screen.getByLabelText('Hold to buy for 8 PX')).toBeTruthy();
  });

  it('the ADOPT verb relabels the shared bar (one grammar, one knob)', () => {
    render(wrap(<BuyBar price={3} balance={9} onBuy={jest.fn()} verb="ADOPT" />));
    expect(screen.getByLabelText('Hold to adopt for 3 PX')).toBeTruthy();
  });
});
