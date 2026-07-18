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

  // walk2 W-A3/A3b (CARD-18) — the default face's plate composes INSIDE the card silhouette with the
  // SAME geometry as designed cards: band height = round(drawnHeight × PLATE_H_RATIO), LIFTED off the
  // bottom edge by buildCard's plateGroup formula (max(2, round(H×0.012))) — never a strip pinned at
  // (or hanging past) the bottom edge. Structural parity: read the plate view's style off the tree.
  it('W-A3b: the plate band sits INSIDE the card box with designed-card geometry (height + lift)', () => {
    const { PLATE_H_RATIO } = jest.requireActual<typeof import('../render/buildCard')>('../render/buildCard');
    const { getByText } = render(wrap(<GameCard title="Elden Ring" size="grid" />));
    // grid intrinsic h = 225 (the first-frame box before any onLayout). The plate view is the nearest
    // ancestor of the title carrying an explicit style height (style arrays may nest — flatten deep).
    const flat = (s: unknown): Array<Record<string, unknown>> =>
      Array.isArray(s) ? s.flatMap(flat) : s && typeof s === 'object' ? [s as Record<string, unknown>] : [];
    type Node = { props?: { style?: unknown }; parent: Node | null };
    let plateStyle: Record<string, unknown> | undefined;
    for (let node = getByText('Elden Ring').parent as Node | null; node && plateStyle === undefined; node = node.parent) {
      const merged = flat(node.props?.style).reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...s }), {});
      if (typeof merged.height === 'number') plateStyle = merged;
    }
    const plateH = Math.round(225 * PLATE_H_RATIO);
    const lift = Math.max(2, Math.round(225 * 0.012));
    expect(plateStyle?.height).toBe(plateH);
    // INSIDE the box: lifted off the bottom edge (never 0 / never overhanging), and the band's full
    // extent (bottom + height) stays within the card height.
    expect(plateStyle?.bottom).toBe(lift);
    expect(lift + plateH).toBeLessThan(225);
  });

  it('W-A3b: sub-gate sizes stay label-DROPPED in-face (the 0047 external side-title is the host row’s, untouched)', () => {
    // /thumb + /mini render NO in-face plate at all — the title the owner sees beside a LIST row is
    // the host row's own <Text>, not this component's. The a11y label remains.
    const { queryByText, getByLabelText } = render(wrap(<GameCard title="Hades" size="thumb" />));
    expect(queryByText('Hades')).toBeNull();
    expect(getByLabelText('Hades card')).toBeTruthy();
  });
});
