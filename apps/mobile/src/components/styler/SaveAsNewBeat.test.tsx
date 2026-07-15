import { act, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { SaveAsNewBeat } from './SaveAsNewBeat';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// SaveAsNewBeat (M5 D5) — the in-place SAVE-AS-NEW acknowledgment.
describe('SaveAsNewBeat — the in-place SAVE-AS-NEW beat', () => {
  it('shows the confirmation with the fork name and auto-dismisses after the dwell', async () => {
    jest.useFakeTimers();
    try {
      const onDone = jest.fn();
      render(wrap(<SaveAsNewBeat title="Hades" onDone={onDone} />));
      expect(screen.getByText('SAVED AS A NEW CARD')).toBeTruthy();
      expect(screen.getByText(/«Hades II»/)).toBeTruthy();
      expect(onDone).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(2200); // the DWELL
      });
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });
});
