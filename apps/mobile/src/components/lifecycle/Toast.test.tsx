import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Toast } from './Toast';
import prefsReducer from '../../store/prefsSlice';

// Reduce-motion mocked ON so the slide docks instantly (no Animated.timing under fake timers) — the
// dwell/setTimeout is what these tests pin.
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// Toast (component-map §5.6 · design-spec §1.6) — the TRANSIENT banner: auto-dismiss, one at a time,
// optional orange RETRY (failures), announced on show.
describe('Toast (design-spec §1.6 transient)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('renders the message and announces it on show', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(wrap(<Toast message="Sent" tone="success" onDismiss={jest.fn()} />));
    expect(screen.getByText('Sent')).toBeTruthy();
    expect(spy).toHaveBeenCalledWith('Sent');
    spy.mockRestore();
  });

  it('auto-dismisses after the default dwell (3500ms for a confirmation)', () => {
    const onDismiss = jest.fn();
    render(wrap(<Toast message="Sent" tone="success" onDismiss={onDismiss} />));
    act(() => jest.advanceTimersByTime(3499));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('an error with RETRY dwells longer (6000ms) and RETRY fires onRetry', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    render(wrap(<Toast message="Save failed — nothing was charged" tone="error" onRetry={onRetry} onDismiss={onDismiss} />));
    fireEvent.press(screen.getByText('RETRY'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(5999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('duration={0} makes the toast sticky (no auto-dismiss)', () => {
    const onDismiss = jest.fn();
    render(wrap(<Toast message="Still here" onDismiss={onDismiss} duration={0} />));
    act(() => jest.advanceTimersByTime(60000));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('the ✕ dismiss fires onDismiss', () => {
    const onDismiss = jest.fn();
    render(wrap(<Toast message="Sent" onDismiss={onDismiss} duration={0} />));
    fireEvent.press(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
