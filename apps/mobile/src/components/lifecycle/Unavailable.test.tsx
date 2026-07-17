import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Unavailable } from './Unavailable';
import prefsReducer from '../../store/prefsSlice';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// Unavailable (component-map §5.6 · design-spec §1.6 · MOD-09) — the TERMINAL state: no retry, GO BACK
// only; blocked/suspended/deleted collapse here indistinguishably. Lone exception: your OWN block → UNBLOCK.
describe('Unavailable (design-spec §1.6 · MOD-09 terminal)', () => {
  it('renders the terminal copy with no RETRY affordance', () => {
    render(wrap(<Unavailable onBack={jest.fn()} />));
    expect(screen.getByText('UNAVAILABLE')).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('GO BACK fires onBack', () => {
    const onBack = jest.fn();
    render(wrap(<Unavailable onBack={onBack} />));
    fireEvent.press(screen.getByText('GO BACK'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('MOD-09 exception — your own block shows UNBLOCK, replacing GO BACK', () => {
    const onUnblock = jest.fn();
    render(wrap(<Unavailable onBack={jest.fn()} onUnblock={onUnblock} />));
    expect(screen.queryByText('GO BACK')).toBeNull();
    fireEvent.press(screen.getByText('UNBLOCK'));
    expect(onUnblock).toHaveBeenCalledTimes(1);
  });

  it('does not disclose WHICH terminal reason (copy is generic)', () => {
    render(wrap(<Unavailable onBack={jest.fn()} />));
    expect(screen.queryByText(/blocked|suspended|deleted/i)).toBeNull();
  });
});
