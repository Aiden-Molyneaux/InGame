import { Text, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
import { ScreenHead, HEADER_CONTENT_HEIGHT } from './ScreenHead';
import { CurrencyCounter } from './commerce/CurrencyCounter';

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

  // F-1 height harmony — owner-explicit ruling that the Games CountTag and the Pixel CurrencyCounter
  // read as the SAME container height. It regressed when the header band went fixed-height (c8f4fe1):
  // the CountTag stretched to the 26px band but the CurrencyCounter's inner wrap centred its keycap at
  // its ~24px natural height. Pin the invariant: both keycaps fill the same stretched band via the SAME
  // mechanism (`alignSelf:'stretch'`), so neither can silently drift a third time. RED before the fix.
  it('docks the count chip and the CurrencyCounter at the SAME band height', () => {
    render(wrap(<ScreenHead title="Collection" count="7 GAMES" trailing={<CurrencyCounter balance={27} />} />));
    // the trailing cluster stretches its children across the fixed header band
    const band = StyleSheet.flatten(screen.getByTestId('screen-head-trailing').props.style);
    expect(band.alignItems).toBe('stretch');
    const countChip = StyleSheet.flatten(screen.getByTestId('screen-head-count').props.style);
    const counter = StyleSheet.flatten(screen.getByLabelText('27 pixels — open wallet').props.style);
    // shared-style identity: both keycaps fill the band the same way → identical resolved height
    expect(countChip.alignSelf).toBe('stretch');
    expect(counter.alignSelf).toBe('stretch');
    // …and neither pins a divergent fixed height that would defeat the stretch (the drift vector)
    expect(countChip.height).toBeUndefined();
    expect(counter.height).toBeUndefined();
    // walk-4 P3-d — the counter's own floor IS this band, so the stretch here changes nothing and
    // the unstretched heads (Store/Device/Styler) land on the identical height.
    expect(counter.minHeight).toBe(HEADER_CONTENT_HEIGHT);
  });
});
