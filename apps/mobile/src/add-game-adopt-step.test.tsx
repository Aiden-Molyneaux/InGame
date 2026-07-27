import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// W-D Wave D (OQ-136 / W-C10) → the m6 owner walk → WALK-4 P2 (the nodded exit-topology rework):
//   • the search/rail INSPECT chevron routes to /game/[id] (the adaptive Game page; CATALOG when unowned)
//   • add → stats + the COL-02 STATUS BEAT → NEXT → the card FORK
//   • THE INVARIANT: the flow asks WHICH GAME · WHAT STATUS · WHAT FACE exactly once each, and every
//     FACE-answer ENDS the flow in the Collection wearing the answer:
//       – strip adopt → the container chains the COL-06 equip onto the new entry → Done ends the flow
//         via `dismissTo` the Collection with the one-shot `justAdded`
//       – a FAILED equip is not a wall: the flow still ends, the settle just says so
//       – SEE ALL carries the add-flow context (?adopt=1&entryId=…) · DESIGN YOUR OWN carries ?from=add
//       – keep-the-default / a plain sheet cancel leave the face UNANSWERED (the fork legitimately stands)
//   • an EMPTY/errored gallery still renders the fork minus the strip (no silent auto-advance)
//   • the fork's sheet carries NO block affordance (it shipped a ⋯ that blocked nobody — walk-4 P2)

const CATALOG_ITEM = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  studio: 'FromSoftware',
  publisher: null,
  releaseDate: '2022-02-25',
  genres: [],
  collectionsCount: 4,
  friendsHaveCount: 1,
  inCollection: false,
  contributor: { userId: 'u1', username: 'curator' },
  ...over,
});

// the CollectionItem the add resolves to (only entryId/gameId/title/status are read downstream)
const ADDED = { entryId: 'e1', gameId: 'p1', title: 'Elden Ring', status: 'backlog' };

// one FREE community card for game p1 (GalleryCardView — the fields the gallery cell + sheet read)
const FREE_CARD = {
  id: 'c1',
  name: 'Neon Elden',
  imageUrl: null,
  thumbUrl: null,
  isPremium: false,
  adoptionCount: 3,
  priceForYou: 0,
  components: [],
  designer: { userId: 'd1', username: 'nova' },
  byViewer: false,
  adopted: false,
};

let mockGallery: {
  data?: { items: unknown[]; total?: number; nextCursor?: string | null };
  isLoading: boolean;
  isError: boolean;
} = {
  data: { items: [] },
  isLoading: false,
  isError: false,
};
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve(ADDED) }));
const mockAdopt = jest.fn(() => ({ unwrap: () => Promise.resolve({ granted: [], totalPaid: 0, balance: 500 }) }));
// The COL-06 equip the adopt chains (PATCH /me/collection/:entryId { activeCardDesignId }).
let equipFails = false;
const mockUpdateEntry = jest.fn(() => ({
  unwrap: () => (equipFails ? Promise.reject(new Error('nope')) : Promise.resolve({})),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [] } }),
  useGetPopularQuery: () => ({ data: { items: [CATALOG_ITEM('p1', 'Elden Ring')] } }),
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
  useLazySearchCatalogQuery: () => [jest.fn(), { isFetching: false, data: undefined }],
  useCreateGameMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [mockAdd, { isLoading: false }],
  useUpdateEntryMutation: () => [mockUpdateEntry, { isLoading: false }],
}));
jest.mock('./store/catalogRailsApi', () => ({
  useGetNewReleasesQuery: () => ({ data: { items: [] } }),
  useGetFriendsActiveQuery: () => ({ data: { items: [] } }),
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: () => mockGallery,
  useAdoptCardMutation: () => [mockAdopt, { isLoading: false }],
}));
// Walk-4 Murr fix — the fork sheet's SHARE is real now (the fourth useShareCard caller): the hook
// reads the auth token off the store and shares off-store; both stood in here.
jest.mock('./store/hooks', () => ({ useAppSelector: () => 'tok', useAppDispatch: () => jest.fn() }));
const mockShareImage = jest.fn(async (..._a: unknown[]) => 'shared' as const);
jest.mock('./store/shareCard', () => ({ shareCardImage: (...a: unknown[]) => mockShareImage(...a) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), dismissTo: mockDismissTo }),
}));

// Stub the AdoptCardSheet so the adopt/close wiring is drivable without its hold-to-adopt gesture. The
// REAL CommunityGallery still renders (so "the step renders the gallery" is genuine); this shim only
// stands in for the sheet's confirm UX and calls back through the container's onAdopt/onAdopted/onClose.
// It also EXPOSES the settle note + whether a block affordance was wired, which are contract now.
jest.mock('./components/game/AdoptCardSheet', () => {
  const React2 = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    AdoptCardSheet: ({ card, visible, onAdopt, onAdopted, onClose, onShare, onBlock, settleNote }: any) =>
      visible && card
        ? React2.createElement(
            View,
            null,
            React2.createElement(Text, null, `ADOPT SHEET — ${card.name}`),
            settleNote ? React2.createElement(Text, null, `SETTLE — ${settleNote}`) : null,
            onBlock
              ? React2.createElement(
                  Pressable,
                  { accessibilityLabel: 'sheet-block', onPress: onBlock },
                  React2.createElement(Text, null, 'SHEET BLOCK'),
                )
              : null,
            React2.createElement(
              Pressable,
              { accessibilityLabel: 'sheet-share', onPress: onShare },
              React2.createElement(Text, null, 'SHEET SHARE'),
            ),
            React2.createElement(
              Pressable,
              {
                accessibilityLabel: 'do-adopt',
                onPress: async () => {
                  const r = await onAdopt();
                  if (r?.ok) onAdopted(r.result, card);
                },
              },
              React2.createElement(Text, null, 'DO ADOPT'),
            ),
            React2.createElement(
              Pressable,
              { accessibilityLabel: 'sheet-done', onPress: onClose },
              React2.createElement(Text, null, 'SHEET DONE'),
            ),
          )
        : null,
  };
});

import AddGame from '../app/add-game';

function renderAddGame() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return rtlRender(
    <Provider store={store}>
      <AddGame />
    </Provider>,
  );
}

beforeEach(() => {
  mockAdd.mockClear();
  mockAdopt.mockClear();
  mockUpdateEntry.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  mockDismissTo.mockClear();
  mockShareImage.mockClear();
  equipFails = false;
  mockGallery = { data: { items: [] }, isLoading: false, isError: false };
});

/** Add p1 from the POPULAR rail, then walk the (reordered) STATUS BEAT to reach the card fork. */
async function addAndReachFork() {
  fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
  expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });
  fireEvent.press(await screen.findByText('NEXT'));
  expect(await screen.findByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeTruthy();
}

/** The one end-of-flow shape: the WHOLE add stack dismissed to the Collection + the justAdded one-shot. */
const ENDS_IN_COLLECTION = {
  pathname: '/(tabs)/collection',
  params: { justAdded: 'e1' },
};

describe('W-D Q3: the Add-Game INSPECT chevron', () => {
  it('routes the focused search/rail card to the adaptive Game page /game/[id]', () => {
    renderAddGame();
    // the POPULAR rail's focused card (p1) carries the INSPECT affordance under its meta
    fireEvent.press(screen.getByLabelText('Inspect Elden Ring'));
    expect(mockPush).toHaveBeenCalledWith('/game/p1');
  });
});

describe('m6 reorder: add → stats → STATUS BEAT → the card fork', () => {
  it('the STATUS BEAT renders FIRST after the add; NEXT advances to the fork', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();

    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
    expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });

    // the status beat is the FIRST post-add screen now (the card step comes after)
    expect(await screen.findByText('SET A STATUS')).toBeTruthy();
    expect(screen.queryByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeNull();

    fireEvent.press(screen.getByText('NEXT'));
    expect(await screen.findByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeTruthy();
    expect(screen.queryByText('SET A STATUS')).toBeNull();
  });
});

describe('m6 card FORK: adopt-from-strip · SEE ALL · DESIGN YOUR OWN · keep-the-default', () => {
  it('renders the TOP strip + all the doors when the game has community cards', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 9 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // the strip (the real CommunityGallery, total-count head) + the adoptable cell
    expect(screen.getByText('COMMUNITY CARDS — 9')).toBeTruthy();
    expect(screen.getByLabelText(/Neon Elden by nova/i)).toBeTruthy();
    // the doors: SEE ALL {N} › (total > strip) · DESIGN YOUR OWN › · keep-the-default tertiary
    expect(screen.getByText('SEE ALL 9 ›')).toBeTruthy();
    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
  });

  it('the fork sheet’s SHARE runs the real authenticated share for THAT card (walk-4 Murr — it was a no-op)', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('sheet-share'));
    await waitFor(() => expect(mockShareImage).toHaveBeenCalledWith('c1', 'Neon Elden', 'tok'));
  });

  it('the fork sheet wires NO block affordance — a ⋯ that blocked nobody is worse than none (walk-4 P2)', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    expect(await screen.findByLabelText('sheet-share')).toBeTruthy(); // the sheet IS open…
    expect(screen.queryByLabelText('sheet-block')).toBeNull(); // …and carries no block door
  });

  it('SEE ALL carries the ADD-FLOW CONTEXT (entryId); DESIGN YOUR OWN carries from=add', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 9 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByText('SEE ALL 9 ›'));
    expect(mockPush).toHaveBeenCalledWith('/game/p1/cards?adopt=1&entryId=e1');

    fireEvent.press(screen.getByText('DESIGN YOUR OWN ›'));
    // entryId rides BOTH design doors too (Murr re-verify minor) — the styler's equip/exit must not
    // hang on a shelf-cache lookup a failed refetch can leave cold.
    expect(mockPush).toHaveBeenCalledWith('/styler/p1?from=add&entryId=e1');
  });

  it('P2-a: adopting CHAINS the COL-06 equip onto the new entry; Done ENDS the flow in the Collection', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // open the card → the adopt sheet → adopt
    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('do-adopt'));

    // adopt targets the CARD only (`adoptCard(cardId)` — adoption is entry-independent)…
    expect(mockAdopt).toHaveBeenCalledWith('c1');
    // …so the CONTAINER chains the equip that makes the new entry actually wear it (COL-06).
    await waitFor(() =>
      expect(mockUpdateEntry).toHaveBeenCalledWith({ entryId: 'e1', activeCardDesignId: 'c1' }),
    );
    // and the settle says so, instead of the game-page "it's in your switcher" voice
    expect(await screen.findByText(/SETTLE — It’s on your shelf/)).toBeTruthy();

    // Done ends the WHOLE flow: dismiss the add stack → the Collection, carrying the justAdded one-shot
    fireEvent.press(screen.getByLabelText('sheet-done'));
    expect(mockDismissTo).toHaveBeenCalledWith(ENDS_IN_COLLECTION);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('an ALREADY-ADOPTED card still answers WHAT FACE — the equip chains and Done ends the flow (Murr fix)', async () => {
    // The grant provably exists (adopted earlier via Discover / a friend's gallery / a remove→re-add
    // loop) — pre-fix this dead-ended on "it's in your switcher" with the invariant unmet.
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    mockAdopt.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ data: { error: { code: 'ALREADY_ADOPTED' } } }),
    }));
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('do-adopt'));

    await waitFor(() =>
      expect(mockUpdateEntry).toHaveBeenCalledWith({ entryId: 'e1', activeCardDesignId: 'c1' }),
    );
    fireEvent.press(screen.getByLabelText('sheet-done'));
    expect(mockDismissTo).toHaveBeenCalledWith(ENDS_IN_COLLECTION);
  });

  it('a FAILED equip is never a wall — the flow still ends in the Collection, the settle just says so', async () => {
    equipFails = true;
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('do-adopt'));
    expect(await screen.findByText(/SETTLE — It’s in your switcher/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('sheet-done'));
    expect(mockDismissTo).toHaveBeenCalledWith(ENDS_IN_COLLECTION);
  });

  it('a plain sheet CANCEL (no adopt) leaves the face unanswered — the fork stands, nothing ends', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('sheet-done')); // closed without adopting
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
    // the fork is still on screen, and its keep-the-default label is therefore still TRUE
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
  });

  it('keep-the-default ENDS the flow without adopting or equipping', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByText('KEEP THE DEFAULT FOR NOW'));
    expect(mockDismissTo).toHaveBeenCalledWith(ENDS_IN_COLLECTION);
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
  });

  it('an EMPTY community renders the fork minus the strip — NO silent auto-advance', async () => {
    mockGallery = { data: { items: [], total: 0 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // the fork STAYS on screen (the old auto-advance is retired) with the two remaining doors
    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
    // no strip, no SEE ALL (nothing to see)
    expect(screen.queryByText(/COMMUNITY CARDS/)).toBeNull();
    expect(screen.queryByText(/SEE ALL/)).toBeNull();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('an ERRORED gallery degrades exactly like empty (the doors never depend on the fetch)', async () => {
    mockGallery = { data: undefined, isLoading: false, isError: true };
    renderAddGame();
    await addAndReachFork();

    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
    expect(screen.queryByText(/COMMUNITY CARDS/)).toBeNull();
  });
});
