import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GameCard } from './GameCard';
import prefsReducer from '../store/prefsSlice';

// GameCard reads the live theme (useTheme → useSelector), so it needs a redux Provider. A minimal
// prefs-only store (defaults = Midnight/Teal — the tokens it baked in before the theme engine) rather
// than the real one: the real store wires redux-persist/AsyncStorage, a native module jest lacks.
const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// GameCard (F-01/F-06) — the full face is always rendered (never cropped); the title is a plate
// label on /grid+/cell, while /mini + /thumb carry NO in-face text (C7/decision 0047 — the host
// names the game beside the card; a11y keeps the label).
describe('GameCard', () => {
  it('renders the title as a label on a plated size (grid)', () => {
    const { getByText } = render(wrap(<GameCard title="Hollow Knight" size="grid" />));
    expect(getByText('Hollow Knight')).toBeTruthy();
  });

  it('/mini carries NO in-face title (C7/0047) but keeps the a11y label', () => {
    const { queryByText, getByLabelText } = render(wrap(<GameCard title="Celeste" size="mini" />));
    expect(queryByText('Celeste')).toBeNull();
    expect(getByLabelText('Celeste card')).toBeTruthy();
  });

  it('shows the NOW tag when now-playing', () => {
    const { getByText } = render(wrap(<GameCard title="Hades" size="grid" nowPlaying />));
    expect(getByText('▶ NOW')).toBeTruthy();
  });

  // walk2 W-A3 (CARD-18) — the default face's plate band uses the SAME geometry as designed cards:
  // height = round(drawnHeight × PLATE_H_RATIO) (buildCard's plated draw), so default and designed
  // plates sit identically. Structural parity: read the plate view's height off the rendered tree.
  it('W-A3: the plate band height matches the designed-card PLATE_H_RATIO geometry', () => {
    const { PLATE_H_RATIO } = jest.requireActual<typeof import('../render/buildCard')>('../render/buildCard');
    const { getByText } = render(wrap(<GameCard title="Elden Ring" size="grid" />));
    // grid intrinsic h = 225 (the first-frame box before any onLayout). The plate view is the nearest
    // ancestor of the title carrying an explicit style height (style arrays may nest — flatten deep).
    const flat = (s: unknown): Array<Record<string, unknown>> =>
      Array.isArray(s) ? s.flatMap(flat) : s && typeof s === 'object' ? [s as Record<string, unknown>] : [];
    type Node = { props?: { style?: unknown }; parent: Node | null };
    let height: number | undefined;
    for (let node = getByText('Elden Ring').parent as Node | null; node && height === undefined; node = node.parent) {
      height = flat(node.props?.style).reduce<number | undefined>(
        (acc, s) => (typeof s.height === 'number' ? s.height : acc),
        undefined,
      );
    }
    expect(height).toBe(Math.round(225 * PLATE_H_RATIO));
  });
});
