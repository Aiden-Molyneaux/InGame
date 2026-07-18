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

  it('W-B3 — the key wears the ScreenButton keycap height grammar (lg/12 vertical, xl/16 horizontal), ONCE here', () => {
    // the ONE-place height fix: every buy surface (BuyBar sheets · the ConfirmSheet PAY) composes this
    // primitive, so asserting the base padding HERE covers the whole family — no per-surface forks.
    const { StyleSheet } = require('react-native');
    const { theme } = require('../../theme');
    render(wrap(<HoldFillButton label="HOLD TO PAY" accessibilityLabel="Hold to pay" onComplete={jest.fn()} />));
    const style = StyleSheet.flatten(screen.getByLabelText('Hold to pay').props.style) as {
      paddingVertical?: number;
      paddingHorizontal?: number;
    };
    expect(style.paddingVertical).toBe(theme.space.lg); // 12 — the ScreenButton `base` vertical
    expect(style.paddingHorizontal).toBe(theme.space.xl); // 16 — the ScreenButton `base` horizontal
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

  // F-21 ruling 1 — once laid out, the key paints the house stepped-edge silhouette (an SVG polygon face);
  // before layout it falls back to a plain fill. Fire a layout to prove the stepped face mounts.
  it('paints the stepped SVG face once laid out (ruling 1)', () => {
    render(wrap(<HoldFillButton label="HOLD TO PAY" accessibilityLabel="Hold to pay" onComplete={jest.fn()} />));
    const key = screen.getByLabelText('Hold to pay');
    expect(screen.UNSAFE_queryAllByType(require('react-native-svg').Svg).length).toBe(0); // no face pre-layout
    act(() => {
      fireEvent(key, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 220, height: 40 } } });
    });
    expect(screen.UNSAFE_queryAllByType(require('react-native-svg').Svg).length).toBeGreaterThan(0);
  });
});
