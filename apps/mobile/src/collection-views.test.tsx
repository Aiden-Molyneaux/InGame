import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer, { setCollectionView, setCol12CoachmarkSeen, type CollectionView } from './store/prefsSlice';

// walk2 B6/B7 (⚖ owner rulings 2026-07-17, 0078) — the Collection view rows:
//   B6: now-playing chrome renders in the HERO ONLY — the pinned entry rides list/grid/shelf as a
//       plain row (the board's row ▶ NOW tags at collection-states :571/:681/:766 are superseded).
//   B7: shelf rows carry the List view's chevron — the quick-entry affordance into the Game page.

const CARD = { imageUrl: null, thumbUrl: null };
const CI = (n: number, nowPlaying = false) => ({
  entryId: `e${n}`,
  gameId: `g${n}`,
  title: `Game ${n}`,
  developer: 'Studio',
  publisher: 'Pub',
  releaseYear: 2014,
  genres: [],
  hours: 100 + n,
  status: 'playing',
  ownedSince: '2020-01-01',
  addedAt: '2020-01-01T00:00:00.000Z',
  nowPlaying,
  card: CARD,
});
// Mutable so the R3 windowing tests can seed a LARGE shelf; reset to the standing 3 per test.
const defaultItems = () => [CI(1, true), CI(2), CI(3)];
let mockItems = defaultItems();

jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => ({
    data: { items: mockItems, collectionTotal: mockItems.length },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
}));
jest.mock('./store/listsApi', () => ({
  TOP10_LIST_ID: 'top10',
  useGetListsQuery: () => ({ data: [{ id: 'top10', kind: 'top10', items: [] }], isLoading: false }),
  useAddListItemMutation: () => [jest.fn(), { isLoading: false }],
  useRemoveListItemMutation: () => [jest.fn(), {}],
  useRerankListMutation: () => [jest.fn(), {}],
}));
const mockPush = jest.fn();
const mockSetParams = jest.fn();
// walk-4 P2 (OC-3) — the ADD flow lands here with a one-shot `justAdded=<entryId>`.
let mockRouteParams: { focus?: string; justAdded?: string } = {};
// ONE stable router object (lazy — the mock factory is hoisted above the fns above): expo-router's
// real `router` is referentially stable, and the landing effect deps on it — a per-render fresh
// object re-armed the one-shot landing every render (an artifact impossible in the app, where
// setParams also clears the param; the R3 scroll-count assertions need the honest identity).
let mockRouterSingleton: Record<string, unknown> | undefined;
// walk-5 keep-flip — a REGISTERING useFocusEffect (was a no-op): it runs the focus callback like the
// real navigator and collects the blur cleanup, so tests can fire a BLUR while the screen stays
// MOUNTED (the Tabs-navigator reality the COL-12 ruling is about — leaving the tab never unmounts).
let mockFocusCleanups: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useRouter: () =>
    (mockRouterSingleton ??= {
      push: (...a: unknown[]) => mockPush(...a),
      back: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      setParams: (...a: unknown[]) => mockSetParams(...a),
    }),
  useLocalSearchParams: () => mockRouteParams,
  useFocusEffect: (cb: () => void | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => {
      const cleanup = cb();
      if (typeof cleanup !== 'function') return undefined;
      mockFocusCleanups.push(cleanup);
      return () => {
        mockFocusCleanups = mockFocusCleanups.filter((fn) => fn !== cleanup);
        cleanup();
      };
    }, [cb]);
  },
}));
// FlipCard renders REAL (its own suite proves it jest-safe) so the B6 shelf assertion pins the actual
// fix: the real FlipCard no longer passes nowPlaying into the row card. EntryCard is the probe.
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title, nowPlaying }: { title: string; nowPlaying?: boolean }) => {
    const { Text } = require('react-native');
    return <Text>{nowPlaying ? `CARD-NOW:${title}` : `CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/commerce', () => ({ CurrencyCounter: () => null }));

import Collection from '../app/(tabs)/collection';

function renderView(view: CollectionView, coachmarkSeen = false) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  store.dispatch(setCollectionView(view));
  store.dispatch(setCol12CoachmarkSeen(coachmarkSeen));
  return rtlRender(
    <Provider store={store}>
      <Collection />
    </Provider>,
  );
}

// A stable snapshot of the shelf's structural nodes — the hero eyebrow + every card label + every
// row chevron + every title. If the peek-flip hint participated in the shelf's flow, toggling it
// would add/remove a node here; docking it outside the scrollable stage (walk-4 P5-a) leaves it
// byte-identical whether the hint is an in-flow strip or, previously, an absolute overlay.
const HINT = 'Tap a card to flip it for your stats.';
function shelfShape() {
  return {
    hero: screen.queryAllByText('NOW PLAYING').length,
    cards: screen.queryAllByText(/^CARD:/).map((n) => n.props.children).sort(),
    chevrons: screen.queryAllByText('›').length,
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockSetParams.mockClear();
  mockRouteParams = {};
  mockItems = defaultItems();
  mockFocusCleanups = [];
});

// Fire a navigator BLUR: run every registered focus cleanup WITHOUT unmounting (the Tabs navigator
// keeps the Collection mounted while another tab shows — the store-preview-teardown pattern).
const fireBlur = () =>
  act(() => {
    [...mockFocusCleanups].forEach((fn) => fn());
  });

describe('COL-07 walk2-B6: now-playing chrome is HERO-ONLY', () => {
  it('list view — the hero carries the pin; rows have NO ▶ NOW inline tag', () => {
    renderView('list');
    expect(screen.getByText('NOW PLAYING')).toBeTruthy(); // the hero eyebrow — THE pin surface
    expect(screen.queryByText('▶ NOW')).toBeNull(); // no row inline tag (board :681 superseded)
    expect(screen.queryAllByText(/^CARD-NOW:/)).toHaveLength(0); // no card anywhere wears the on-card tag
  });

  it('shelf view — the pinned row renders as a plain card (no now-playing chrome outside the hero)', () => {
    renderView('shelf');
    // the hero eyebrow is the pin; NO card (hero's or the REAL FlipCard rows') wears the on-card
    // ▶ NOW tag — the row card for the pinned entry is plain, and the entry STAYS in the view.
    expect(screen.getByText('NOW PLAYING')).toBeTruthy();
    expect(screen.queryAllByText(/^CARD-NOW:/)).toHaveLength(0);
    expect(screen.getAllByText('CARD:Game 1').length).toBeGreaterThanOrEqual(1);
  });
});

describe('COL-12/CARD-16: the peek-flip hint is layout-neutral (owner walk — the relog jar)', () => {
  it('the surrounding shelf is structurally identical whether the hint shows or not', () => {
    // hint SHOWN (first-run: col12CoachmarkSeen=false, flippable shelf, non-empty, no query)
    const shown = renderView('shelf', false);
    expect(screen.getByText(HINT)).toBeTruthy();
    const withHint = shelfShape();
    shown.unmount();

    // hint HIDDEN (seen=true — the post-dismiss / post-first-flip state)
    renderView('shelf', true);
    expect(screen.queryByText(HINT)).toBeNull();
    const withoutHint = shelfShape();

    // the hint added/removed NOTHING from the shelf's flow — appearing or dismissing it (and the
    // relog that re-arms it) cannot shift the list, because the hint is docked OUTSIDE the stage
    // (a sibling above the tools bar), never a descendant of the scrollable shelf/grid.
    expect(withoutHint).toEqual(withHint);
    // sanity: a genuinely populated shelf underlay the comparison (one chevron per row)
    expect(withHint.chevrons).toBe(mockItems.length);
  });

  it('the hint is NOT a descendant of the shelf ScrollView (the assertion that fails on the pre-fix inline layout)', () => {
    // Murr walk-wave debt: shelfShape() ignores the hint node, so the structural test above ALSO passes
    // against the old in-flow layout. THIS is the discriminator — the user/[id] ReportSheet pattern:
    // the hint renders, but never inside the scroll (an in-flow regression puts it back in the scroll).
    const { within } = require('@testing-library/react-native');
    renderView('shelf', false);
    expect(screen.getByText(HINT)).toBeTruthy();
    const scroll = screen.getByTestId('collection-scroll');
    expect(within(scroll).queryByText(HINT)).toBeNull();
  });

  it('docks the hint as an in-flow strip directly above the tools bar (walk-4 P5-a: no floating elements)', () => {
    const { StyleSheet } = require('react-native');
    const rendered = renderView('shelf', false);
    expect(screen.getByText(HINT)).toBeTruthy();
    // no more absolute-overlay mechanism — the strip is a normal in-flow sibling now (docked, not floating)
    const strip = StyleSheet.flatten(screen.getByTestId('coachmark-overlay').props.style);
    expect(strip.position).not.toBe('absolute');
    // "directly above the tools bar": walking the rendered host tree, the strip's testID appears
    // BEFORE the tools bar's testID — pins the docking position without pinning exact adjacency.
    const ids: string[] = [];
    const collect = (node: unknown): void => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(collect);
        return;
      }
      const n = node as { props?: { testID?: string }; children?: unknown };
      if (n.props?.testID) ids.push(n.props.testID);
      if (n.children) collect(n.children);
    };
    collect(rendered.toJSON());
    const stripIndex = ids.indexOf('coachmark-overlay');
    const toolsIndex = ids.indexOf('collection-tools-bar');
    expect(stripIndex).toBeGreaterThanOrEqual(0);
    expect(toolsIndex).toBeGreaterThanOrEqual(0);
    expect(stripIndex).toBeLessThan(toolsIndex);
  });
});

describe('COL-07 walk2-B7: shelf rows carry the List-view chevron', () => {
  it('every shelf row has a › chevron that opens the Game page', () => {
    renderView('shelf');
    const chevrons = screen.getAllByText('›');
    expect(chevrons).toHaveLength(mockItems.length);
    fireEvent.press(chevrons[1]!); // row 2 → Game 2 (the chevron press bubbles to the row-body button)
    expect(mockPush).toHaveBeenCalledWith('/game/g2');
  });
});

describe('Owner walk (m6): the whole shelf row-body navigates; the card face still flips', () => {
  it('a tap on the row BODY (not the card) opens the Game page', () => {
    renderView('shelf');
    // the row-body is ONE button labeled "Open {title}" (a sibling of the card slot, not its ancestor)
    fireEvent.press(screen.getByLabelText('Open Game 2'));
    expect(mockPush).toHaveBeenCalledWith('/game/g2');
  });

  it('a tap on the CARD face flips it and does NOT navigate (nested-Pressable trap avoided)', () => {
    renderView('shelf');
    // the FlipCard front tap-layer is its own labeled control ("{title} card"); a tap flips it, so its
    // label swaps to the stats back — and it must NOT reach the row-body navigate (P13-F3: RN-web routes
    // a nested press to the OUTER responder — proven safe here because the card is a SIBLING, not nested).
    expect(screen.getByLabelText('Game 2 card')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Game 2 card'));
    expect(mockPush).not.toHaveBeenCalled(); // flipped, never navigated
    expect(screen.queryByLabelText('Game 2 card')).toBeNull(); // the front label is gone — it turned to the back
  });

  it('the card slot is NOT a descendant of the row-body navigate button (no button-in-button)', () => {
    const { within } = require('@testing-library/react-native');
    renderView('shelf');
    // the card's tap-layer control lives OUTSIDE the "Open Game 2" button — the structural guarantee
    // that lets the card win its own tap on RN-web (and keeps the web tree free of nested <button>s).
    const rowButton = screen.getByLabelText('Open Game 2');
    expect(within(rowButton).queryByLabelText('Game 2 card')).toBeNull();
  });
});

// WALK-4 P2 (OC-3) — the JUST-ADDED landing. The add flow ends by dismissing its whole stack to this
// screen carrying `justAdded=<entryId>`; the shelf marks that entry (a ~1.5s pulse) and scrolls it into
// view, because the default MY ORDER sort can bury a fresh add below the fold. It is a ONE-SHOT: the
// param is consumed into local state and cleared off the URL immediately, so nothing re-fires it.
describe('walk-4 P2: the just-added landing marks the new entry', () => {
  it('marks EXACTLY the landed entry — in shelf, grid and list alike', () => {
    mockRouteParams = { justAdded: 'e2' };
    for (const view of ['shelf', 'grid', 'list'] as const) {
      const r = renderView(view);
      expect(screen.getByTestId('just-added-e2')).toBeTruthy();
      expect(screen.queryByTestId('just-added-e1')).toBeNull();
      expect(screen.queryByTestId('just-added-e3')).toBeNull();
      r.unmount();
    }
  });

  it('consumes the param one-shot (cleared off the URL on arrival)', () => {
    mockRouteParams = { justAdded: 'e2' };
    renderView('shelf');
    expect(mockSetParams).toHaveBeenCalledWith({ justAdded: undefined });
  });

  it('marks nothing when the flow did not land here (the standing case)', () => {
    mockRouteParams = {};
    renderView('shelf');
    expect(screen.queryByTestId('just-added-e1')).toBeNull();
    expect(screen.queryByTestId('just-added-e2')).toBeNull();
    expect(mockSetParams).not.toHaveBeenCalled();
  });
});

// R3 (P6 §6 row 6) — the shelf is WINDOWED (FlatList), and the just-added landing rides
// scrollToIndex (the windowed mechanism; the old per-row y-map only covered MOUNTED rows). These
// pin the two seams the virtualization change opened — this is the ledger's deferred
// "scroll-mechanism test" debt, paid where jest can reach it (real momentum/measure behavior needs
// a device and stays with the owner walk).
describe('R3: the shelf is windowed and the landing scroll uses scrollToIndex', () => {
  const { act } = require('@testing-library/react-native');
  const { FlatList } = require('react-native');

  it('a large shelf mounts only the initial window, never all N rows', () => {
    mockItems = Array.from({ length: 40 }, (_, k) => CI(k + 1, k === 0));
    renderView('shelf');
    // One chevron per MOUNTED shelf row (the row cards themselves are aria-hidden inside FlipCard —
    // RTL's hidden filter excludes them — so the chevron is the countable row probe). jest fires no
    // layout events, so the FlatList renders exactly its initialNumToRender window: 10 rows. The
    // pre-R3 ScrollView+.map() mounted all 40 — if this count ever equals N again, the windowing
    // regressed (or the params moved: then re-pin deliberately).
    expect(screen.queryAllByText('›')).toHaveLength(10);
    // the full shelf still REPORTS its true size (windowing is render-only, never data truncation)
    expect(screen.getByText('40 GAMES')).toBeTruthy();
  });

  it('the landing scrolls via scrollToIndex with the entry index (shelf: 1 column)', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e3' };
      renderView('shelf');
      act(() => {
        jest.advanceTimersByTime(50); // the landing's one-frame rAF beat
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ index: 2 }));
    } finally {
      spy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('the grid landing divides by the column count (scrollToIndex takes ROW indexes under numColumns)', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e3' }; // item index 2 → grid row 1 (two per row)
      renderView('grid');
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ index: 1 }));
    } finally {
      spy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('a failed scroll RECOMPUTES at retry time — a stale captured index is never replayed (Murr major 3)', () => {
    // (walk-5 note: the retry lane survives the redesign — an in-flight FIRED landing still
    // recomputes; only USER acts — scroll/view/filter — close it, pinned in the walk-5 suite below.)
    jest.useFakeTimers();
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e3' };
      renderView('shelf');
      act(() => {
        jest.advanceTimersByTime(50); // the landing fires (index 2)
      });
      // The list reports the target unmeasured, carrying a STALE index (the shape left behind by a
      // view-switch remount or a shrunken refetch). The old code replayed 99 verbatim after 120ms —
      // a VirtualizedList range-invariant throw inside a setTimeout (uncaught).
      const list = screen.UNSAFE_getByType(FlatList);
      act(() => {
        (list.props as { onScrollToIndexFailed: (i: { index: number; averageItemLength: number }) => void })
          .onScrollToIndexFailed({ index: 99, averageItemLength: 100 });
      });
      expect(scrollToOffset).toHaveBeenCalledWith(expect.objectContaining({ offset: 9900 })); // the estimated advance
      act(() => {
        jest.advanceTimersByTime(130); // the recompute retry
      });
      const calls = scrollToIndex.mock.calls.map((c) => (c[0] as { index: number }).index);
      expect(calls.at(-1)).toBe(2); // recomputed against the CURRENT list at fire time
      expect(calls).not.toContain(99); // the stale index never reaches the list
    } finally {
      scrollToIndex.mockRestore();
      scrollToOffset.mockRestore();
      jest.useRealTimers();
    }
  });
});

// ── WALK-5 Batch-1 (owner rulings 2026-08-15) ────────────────────────────────────────────────────
// COL-12 keep-flip (spec 0.70): the blur-time flip reset is DROPPED — a flipped card stays as the
// user left it across tab switches (the deferred flip-back-on-return beat was rejected). The
// view-switch reset is the one the spec KEEPS.
describe('COL-12 walk-5 (spec 0.70): flips survive a tab round-trip; a view switch still resets', () => {
  it('a flipped card STAYS flipped across a blur (the Tabs navigator keeps the screen mounted)', () => {
    renderView('shelf', true);
    fireEvent.press(screen.getByLabelText('Game 2 card'));
    expect(screen.queryByLabelText('Game 2 card')).toBeNull(); // it turned to the stats back
    fireBlur(); // leave the tab — pre-walk-5 this cleanup rebuilt flippedIds and the front returned
    expect(screen.queryByLabelText('Game 2 card')).toBeNull(); // the ruling: the back stays
  });

  it('switching view mode still resets the flip (the reset COL-12 keeps)', () => {
    renderView('shelf', true);
    fireEvent.press(screen.getByLabelText('Game 2 card'));
    expect(screen.queryByLabelText('Game 2 card')).toBeNull();
    fireEvent.press(screen.getByLabelText('View')); // the tools View cycle: shelf → grid
    expect(screen.getByLabelText('Game 2 card')).toBeTruthy(); // front face again in the grid
  });
});

// The walk-5 landing redesign (owner-approved; replaces the never-expires open window):
//   (a) fire only when the fresh add is present under the current filters at fetch-settle;
//   (b) filter excludes it → NO pending landing, an immediate toast with CLEAR FILTERS instead;
//   (c) user scroll / view switch / filter change cancels a pending landing.
// These render with a live store handle (renderLive) so a test can re-render mid-flight — the param
// arriving AFTER a filter is active, or the fetch settling AFTER a cancellation.
describe('walk-5: filter-excluded adds toast; user acts cancel a pending landing', () => {
  const { FlatList } = require('react-native');
  const TOAST = 'Added — hidden by your current filter';
  const SEARCH_PLACEHOLDER = 'Title · developer · publisher';

  function renderLive(view: CollectionView) {
    const store = configureStore({ reducer: { prefs: prefsReducer } });
    store.dispatch(setCollectionView(view));
    store.dispatch(setCol12CoachmarkSeen(true));
    const ui = () => (
      <Provider store={store}>
        <Collection />
      </Provider>
    );
    const r = rtlRender(ui());
    return { ...r, refresh: () => r.rerender(ui()) };
  }

  it('(b) an active search that EXCLUDES the fresh add → immediate toast, no pulse, no scroll', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      const r = renderLive('shelf');
      fireEvent.press(screen.getByLabelText('Search'));
      fireEvent.changeText(screen.getByLabelText(SEARCH_PLACEHOLDER), 'Game 1'); // excludes e2
      mockRouteParams = { justAdded: 'e2' }; // the add flow lands; the shelf data already holds e2
      r.refresh();
      act(() => {
        // the cached-shelf mainline decides on the param effect's one-frame rAF beat (the shelf
        // data's identity is unchanged, so the settle effect has nothing to re-run on)
        jest.advanceTimersByTime(50);
      });
      expect(screen.getByText(TOAST)).toBeTruthy();
      expect(screen.queryByTestId('just-added-e2')).toBeNull(); // there IS no landing…
      expect(spy).not.toHaveBeenCalled(); // …and no scroll ever issues

      // CLEAR FILTERS drops the filters + exits search and dismisses the toast; the entry simply
      // appears under the unfiltered shelf — deliberately WITHOUT a landing (no yank, walk-5 b).
      fireEvent.press(screen.getByText('CLEAR FILTERS'));
      expect(screen.queryByText(TOAST)).toBeNull();
      expect(screen.getByText('3 GAMES')).toBeTruthy(); // unfiltered again (was "1 OF 3 GAMES")
      expect(screen.getByLabelText('Open Game 2')).toBeTruthy(); // the fresh add's row is on the shelf
      expect(screen.queryByTestId('just-added-e2')).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('(c) a USER scroll cancels a pending landing — the late fetch-settle fires nothing', () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e9' }; // not in the shelf yet — the fetch hasn't settled
      const r = renderLive('shelf');
      expect(screen.queryByTestId('just-added-e9')).toBeNull(); // pending, honestly unfired
      const list = screen.UNSAFE_getByType(FlatList);
      act(() => {
        // onScrollBeginDrag = TOUCH-initiated only; the landing's own scrollToIndex never fires it
        (list.props as { onScrollBeginDrag: () => void }).onScrollBeginDrag();
      });
      mockItems = [...defaultItems(), CI(9)]; // NOW the fetch settles with the entry present
      r.refresh();
      expect(screen.queryByTestId('just-added-e9')).toBeNull(); // cancelled — it never fires
      expect(spy).not.toHaveBeenCalled();
      expect(screen.queryByText(TOAST)).toBeNull(); // cancelled ≠ hidden-by-filter
    } finally {
      spy.mockRestore();
    }
  });

  it('(c) a view switch cancels a pending landing (replaces the R3 re-land lane)', () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e9' };
      const r = renderLive('shelf');
      fireEvent.press(screen.getByLabelText('View')); // shelf → grid — a user act, not a re-land cue
      mockItems = [...defaultItems(), CI(9)];
      r.refresh();
      expect(screen.queryByTestId('just-added-e9')).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('(c) a filter change cancels a pending landing — even one the new filter would SHOW', () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    try {
      mockRouteParams = { justAdded: 'e9' };
      const r = renderLive('shelf');
      fireEvent.press(screen.getByLabelText('Search'));
      fireEvent.changeText(screen.getByLabelText(SEARCH_PLACEHOLDER), 'Game'); // a filter CHANGE
      mockItems = [...defaultItems(), CI(9)]; // e9 matches 'Game' — it WOULD be visible now
      r.refresh();
      expect(screen.queryByTestId('just-added-e9')).toBeNull(); // but the user act already cancelled
      expect(spy).not.toHaveBeenCalled();
      expect(screen.queryByText(TOAST)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
