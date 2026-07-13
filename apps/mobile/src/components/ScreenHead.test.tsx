import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
import { ScreenHead } from './ScreenHead';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// ScreenHead (component-map §5.4 + F-1 fix 7) — the display title, the optional gold count chip, and
// the additive `trailing` slot the CurrencyCounter docks into on Collection/Profile.
describe('ScreenHead', () => {
  it('renders the uppercased title alone', () => {
    render(wrap(<ScreenHead title="Profile" />));
    expect(screen.getByText('PROFILE')).toBeTruthy();
  });

  it('renders the count chip when given', () => {
    render(wrap(<ScreenHead title="Collection" count="7 GAMES" />));
    expect(screen.getByText('COLLECTION')).toBeTruthy();
    expect(screen.getByText('7 GAMES')).toBeTruthy();
  });

  it('docks a trailing control (the header counter) beside the count', () => {
    render(wrap(<ScreenHead title="Collection" count="7 GAMES" trailing={<Text>27PX</Text>} />));
    expect(screen.getByText('7 GAMES')).toBeTruthy();
    expect(screen.getByText('27PX')).toBeTruthy();
  });

  it('renders trailing without a count', () => {
    render(wrap(<ScreenHead title="Profile" trailing={<Text>27PX</Text>} />));
    expect(screen.getByText('27PX')).toBeTruthy();
  });
});
