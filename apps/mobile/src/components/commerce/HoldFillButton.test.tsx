import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HoldFillButton, HOLD_MS } from './HoldFillButton';
import prefsReducer from '../../store/prefsSlice';

// A flippable reduce-motion mock (the `mock` prefix lets the factory close over it).
let mockReduced = false;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// HoldFillButton (M5 F-9 G2) — the shared filling-hold primitive. Completing the hold fires onComplete;
// releasing early fires nothing; reduce-motion collapses to a plain immediate press.
describe('HoldFillButton — the filling hold-to-activate primitive', () => {
  beforeEach(() => {
    mockReduced = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('completing the hold fires onComplete once', () => {
    const onComplete = jest.fn();
    render(wrap(<HoldFillButton label="HOLD TO PAY" accessibilityLabel="Hold to pay" onComplete={onComplete} />));
    fireEvent(screen.getByLabelText('Hold to pay'), 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('releasing before the hold completes fires nothing', () => {
    const onComplete = jest.fn();
    render(wrap(<HoldFillButton label="HOLD TO PAY" accessibilityLabel="Hold to pay" onComplete={onComplete} />));
    const key = screen.getByLabelText('Hold to pay');
    fireEvent(key, 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS - 60));
    fireEvent(key, 'pressOut');
    act(() => jest.advanceTimersByTime(300));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('a disabled key never fires', () => {
    const onComplete = jest.fn();
    render(wrap(<HoldFillButton label="HOLD TO PAY" accessibilityLabel="Hold to pay" onComplete={onComplete} disabled />));
    fireEvent(screen.getByLabelText('Hold to pay'), 'pressIn');
    act(() => jest.advanceTimersByTime(HOLD_MS * 2));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('under reduce-motion a single press fires immediately (no timed hold)', () => {
    mockReduced = true;
    const onComplete = jest.fn();
    render(wrap(<HoldFillButton label="PAY" accessibilityLabel="Pay" onComplete={onComplete} />));
    fireEvent.press(screen.getByLabelText('Pay'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
