import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ScreenButton } from './ScreenButton';
import prefsReducer from '../store/prefsSlice';

// F5 (Wave D review) — the D-4 assertions checked only the `stepped` PROP; this proves the prop actually
// DRAWS the F-02 pixel-stepped SVG polygon face (the same onLayout→polySize→Svg gate HoldFillButton uses).
const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;
const Svg = require('react-native-svg').Svg;

function layout(node: ReturnType<typeof screen.getByRole>) {
  act(() => {
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } } });
  });
}

describe('ScreenButton — the F-02 stepped silhouette (D-4)', () => {
  it('stepped=true paints the SVG polygon face once laid out (a plain fill before layout)', () => {
    render(wrap(<ScreenButton label="Add to collection" variant="primary" stepped onPress={jest.fn()} />));
    expect(screen.UNSAFE_queryAllByType(Svg).length).toBe(0); // pre-layout: the square-fill fallback
    layout(screen.getByRole('button'));
    expect(screen.UNSAFE_queryAllByType(Svg).length).toBeGreaterThan(0); // the stepped polygon mounts
  });

  it('a non-stepped button never draws the polygon (even after layout)', () => {
    render(wrap(<ScreenButton label="Cancel" variant="primary" onPress={jest.fn()} />));
    layout(screen.getByRole('button'));
    expect(screen.UNSAFE_queryAllByType(Svg).length).toBe(0);
  });

  it('variant="add" is stepped by construction (the F-02 gold create grammar)', () => {
    render(wrap(<ScreenButton label="Create" variant="add" onPress={jest.fn()} />));
    layout(screen.getByRole('button'));
    expect(screen.UNSAFE_queryAllByType(Svg).length).toBeGreaterThan(0);
  });
});
