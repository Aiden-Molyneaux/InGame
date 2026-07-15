import { act, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AcquireBeat } from './AcquireBeat';
import prefsReducer from '../../store/prefsSlice';

let mockReduced = false;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// AcquireBeat (M5 F-9 G6) — the cosmetic-acquire celebration. It auto-settles (calls onDone) within its
// budget and works under reduce-motion (a glow pulse, no shards). It's a decorative overlay, so the
// contract we assert is: it fires onDone, and tearing down mid-beat leaks no timers.
describe('AcquireBeat — the acquire celebration (G6)', () => {
  beforeEach(() => {
    mockReduced = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('auto-settles within its ≤600ms budget (fires onDone)', () => {
    const onDone = jest.fn();
    render(wrap(<AcquireBeat onDone={onDone} />));
    act(() => jest.advanceTimersByTime(600));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('under reduce-motion still settles (a glow pulse, no shard travel)', () => {
    mockReduced = true;
    const onDone = jest.fn();
    render(wrap(<AcquireBeat onDone={onDone} />));
    act(() => jest.advanceTimersByTime(600));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('unmounting mid-beat clears its timer (no leak into an unmounted tree)', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const view = render(wrap(<AcquireBeat onDone={jest.fn()} />));
    clearSpy.mockClear();
    view.unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('renders without crashing inside a host view', () => {
    render(
      wrap(
        <View>
          <AcquireBeat />
        </View>,
      ),
    );
    expect(screen).toBeTruthy();
  });
});
