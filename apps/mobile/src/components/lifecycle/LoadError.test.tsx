import { render, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoadError } from './LoadError';
import prefsReducer from '../../store/prefsSlice';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// LoadError (component-map §5.6 · design-spec §1.6) — the RETRYABLE state: "Signal Lost" + orange RETRY;
// `onRetry` maps to the RTK `refetch`. Announces on mount (CARD-16 §105).
describe('LoadError (design-spec §1.6 retryable)', () => {
  it('renders the "Signal Lost" title + message', () => {
    render(wrap(<LoadError />));
    expect(screen.getByText('SIGNAL LOST')).toBeTruthy();
    expect(screen.getByText(/couldn't reach the server/i)).toBeTruthy();
  });

  it('RETRY fires onRetry (the refetch adapter)', () => {
    const onRetry = jest.fn();
    render(wrap(<LoadError onRetry={onRetry} />));
    fireEvent.press(screen.getByText('RETRY'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the RETRY key when there is nothing to re-fetch', () => {
    render(wrap(<LoadError />));
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('announces the failure on mount (unseen async result — §105 live-region)', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(wrap(<LoadError title="Signal Lost" message="No connection." onRetry={jest.fn()} />));
    expect(spy).toHaveBeenCalledWith('Signal Lost. No connection.');
    spy.mockRestore();
  });
});
