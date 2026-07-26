import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GameDetail } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// M6 W-6 (CAT-13/14) — the ABOUT-tab wiki EDIT mode, the E2 test list: rows render current values ·
// one open editor doesn't shift siblings (the B.8 invariant) · per-field save fires the SINGLE-field
// request · screened/429 errors land on the owning row · the genres min-1 guard · the EDITED-BY
// attribution renders + routes · the A1 young-account quiet gate (admins exempt).
//
// WALK-4 P4-b (owner re-ruling, supersedes W3-A) — the INLINE facts-block EDIT key is RETIRED in every
// posture: the ⋯ page overflow's "Edit catalog details" is the one door, so every suite here drives the
// mode through the CONTROLLED props (the harness below stands in for that overflow).

const mockSubmit = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockRefetch = jest.fn();

let mockDetail: GameDetail;
let mockMe: { role: string; memberSince: string };

jest.mock('../../store/catalogRailsApi', () => ({
  useGetGameDetailQuery: () => ({ data: mockDetail, isLoading: false, isError: false, refetch: mockRefetch }),
  useSubmitGameEditMutation: () => [mockSubmit, { isLoading: false }],
}));
jest.mock('../../store/friendApi', () => ({
  useGetFriendsWhoOwnQuery: () => ({ data: { friendsWhoOwn: [], count: 0 }, isLoading: false }),
}));
jest.mock('../../store/api', () => ({
  useGetMeQuery: () => ({ data: mockMe }),
  useGetGenresQuery: () => ({
    data: { items: [ { id: '00000000-0000-4000-8000-00000000000a', name: 'RPG' }, { id: '00000000-0000-4000-8000-00000000000b', name: 'Soulslike' } ] },
  }),
}));

import { AboutTab } from './AboutTab';

const RPG = '00000000-0000-4000-8000-00000000000a';
const SOULSLIKE = '00000000-0000-4000-8000-00000000000b';
const OLD = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString(); // a 30-day-old account
const YOUNG = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(); // a 2-day-old account

function makeDetail(overrides: Partial<GameDetail> = {}): GameDetail {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Elden Ring',
    studio: 'FromSoftware',
    publisher: 'Bandai Namco',
    releaseDate: '2022-02-25',
    genres: [{ id: RPG, name: 'RPG' }],
    collectionsCount: 3,
    friendsHaveCount: 1,
    inCollection: true,
    contributor: { userId: '00000000-0000-4000-8000-000000000002', username: 'aiden' },
    friendsWhoOwn: [],
    avgRating: null, // CAT-09 community stats — omitted from these edit-mode suites
    avgHours: null,
    ...overrides,
  };
}

const onOpenUser = jest.fn();

// The harness stands in for the page ⋯ overflow ("Edit catalog details") — the ONE edit door on every
// posture after P4-b. Pressing OVERFLOW-EDIT is exactly what the overflow row does.
function renderTab() {
  function Harness() {
    const [editing, setEditing] = useState(false);
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
          <Text>OVERFLOW-EDIT</Text>
        </Pressable>
        <AboutTab
          gameId={mockDetail.id}
          onViewContributor={jest.fn()}
          onOpenUser={onOpenUser}
          editing={editing}
          onEditingChange={setEditing}
        />
      </>
    );
  }
  return render(
    <Provider store={configureStore({ reducer: { prefs: prefsReducer } })}>
      <Harness />
    </Provider>,
  );
}

/** Open edit mode the way the app does — through the page overflow. */
function openEdit() {
  fireEvent.press(screen.getByText('OVERFLOW-EDIT'));
}

beforeEach(() => {
  mockSubmit.mockClear();
  mockSubmit.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
  onOpenUser.mockClear();
  mockDetail = makeDetail();
  mockMe = { role: 'user', memberSince: OLD };
});

describe('CAT-13 — the facts-block EDIT mode (per-field rows, bare TextField grammar)', () => {
  it('the overflow entry flips the block into per-field rows rendering the CURRENT values', () => {
    renderTab();
    openEdit();
    expect(screen.getByText('STUDIO')).toBeTruthy();
    expect(screen.getByText('FromSoftware')).toBeTruthy();
    expect(screen.getByText('PUBLISHER')).toBeTruthy();
    expect(screen.getByText('Bandai Namco')).toBeTruthy();
    expect(screen.getByText('RELEASE DATE')).toBeTruthy();
    expect(screen.getByText('2022-02-25')).toBeTruthy();
    expect(screen.getByText('GENRES')).toBeTruthy();
    // no TITLE row — the name is LOCKED (CAT-03 dedup identity; fixes ride the report path)
    expect(screen.queryByText('NAME')).toBeNull();
    expect(screen.queryByText('TITLE')).toBeNull();
  });

  it('opening ONE editor keeps the sibling rows in place (the B.8 invariant)', () => {
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit studio'));
    expect(screen.getByLabelText('Studio')).toBeTruthy(); // the bare TextField input is open
    // the siblings still render their labels + values, unshifted into editors
    expect(screen.getByText('PUBLISHER')).toBeTruthy();
    expect(screen.getByText('Bandai Namco')).toBeTruthy();
    expect(screen.getByText('RELEASE DATE')).toBeTruthy();
    expect(screen.queryByLabelText('Publisher')).toBeNull(); // no second editor opened
  });

  it('a per-field save fires the SINGLE-field request (studio only)', async () => {
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit studio'));
    fireEvent.changeText(screen.getByLabelText('Studio'), 'FromSoftware Inc.');
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      gameId: mockDetail.id,
      field: 'studio',
      newValue: 'FromSoftware Inc.',
    });
  });

  it('clearing a text field submits null (empty clears — the CAT-02 optional posture)', () => {
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit publisher'));
    fireEvent.changeText(screen.getByLabelText('Publisher'), '   ');
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(mockSubmit).toHaveBeenCalledWith({ gameId: mockDetail.id, field: 'publisher', newValue: null });
  });

  it('a `screened` refusal lands on the OWNING row’s error line', async () => {
    mockSubmit.mockImplementationOnce(() => ({
      unwrap: () =>
        Promise.reject({
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              reason: 'screened',
              message: 'That text isn’t allowed.',
              details: [{ path: 'studio', message: 'That text isn’t allowed.' }],
            },
          },
        }),
    }));
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit studio'));
    fireEvent.changeText(screen.getByLabelText('Studio'), 'admin');
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(await screen.findByText('That text isn’t allowed.')).toBeTruthy();
    expect(screen.getByLabelText('Studio')).toBeTruthy(); // the row stays open for a fix-up
  });

  it('a 429 lands as the rate-limit line on the owning row', async () => {
    mockSubmit.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ data: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } } }),
    }));
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit studio'));
    fireEvent.changeText(screen.getByLabelText('Studio'), 'Anything');
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(await screen.findByText('Too many edits — give it a minute.')).toBeTruthy();
  });

  it('the genres editor guards min-1 (deselect-all → no request, the floor line shows)', async () => {
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit genres'));
    // 'RPG' renders twice in edit mode (the genres row's display value + the editor's GenreTag) — the
    // editor chip is last
    fireEvent.press(screen.getAllByText('RPG').at(-1)!); // deselect the only current genre
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(await screen.findByText('Pick at least one genre.')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('a genres save submits the toggled id set', () => {
    renderTab();
    openEdit();
    fireEvent.press(screen.getByLabelText('Edit genres'));
    fireEvent.press(screen.getByText('SOULSLIKE')); // add to the current [RPG]
    fireEvent.press(screen.getByText('✓ SAVE'));
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const arg = (mockSubmit as jest.Mock).mock.calls[0]![0] as { field: string; newValue: string[] };
    expect(arg.field).toBe('genres');
    expect([...arg.newValue].sort()).toEqual([RPG, SOULSLIKE].sort());
  });
});

describe('CAT-14 — the EDITED BY attribution', () => {
  it('renders the latest-edit line and routes to the editor’s profile', () => {
    mockDetail = makeDetail({
      lastEdit: {
        editor: { userId: '00000000-0000-4000-8000-000000000009', username: 'kate' },
        editedAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
      },
    });
    renderTab();
    const line = screen.getByLabelText('Last edited by kate — view profile');
    expect(screen.getByText(/EDITED BY/)).toBeTruthy();
    expect(screen.getByText(/2D AGO/)).toBeTruthy();
    fireEvent.press(line);
    expect(onOpenUser).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000009');
  });

  it('is ABSENT when the game has never been edited (no phantom attribution)', () => {
    renderTab();
    expect(screen.queryByText(/EDITED BY/)).toBeNull();
  });
});

describe('Walk-4 P4-b — the inline facts-block EDIT key is RETIRED (the overflow is the one door)', () => {
  it('read mode shows the DETAILS list with NO inline edit affordance (aged account)', () => {
    renderTab();
    expect(screen.getByText('STUDIO')).toBeTruthy(); // reading the facts is never gated
    expect(screen.getByText('FromSoftware')).toBeTruthy();
    expect(screen.queryByLabelText('Edit game facts')).toBeNull(); // the W-6 key is gone
    expect(screen.queryByLabelText('Edit studio')).toBeNull(); // …and no per-field pencils
    expect(screen.queryByText('EDITING CATALOG DETAILS')).toBeNull();
  });

  it('a young account sees no key either — read mode stays clean, the gate lives past the door', () => {
    mockMe = { role: 'user', memberSince: YOUNG };
    renderTab();
    expect(screen.queryByLabelText('Edit game facts')).toBeNull();
    expect(screen.queryByText('EDITING UNLOCKS AFTER 14 DAYS')).toBeNull(); // not shouted in read mode
    expect(screen.getByText('STUDIO')).toBeTruthy();
  });

  it('a host that threads NO edit props renders read-only (no way into edit mode)', () => {
    render(
      <Provider store={configureStore({ reducer: { prefs: prefsReducer } })}>
        <AboutTab gameId={mockDetail.id} onViewContributor={jest.fn()} onOpenUser={onOpenUser} />
      </Provider>,
    );
    expect(screen.getByText('STUDIO')).toBeTruthy();
    expect(screen.queryByLabelText('Edit game facts')).toBeNull();
    expect(screen.queryByLabelText('Edit studio')).toBeNull();
  });
});

describe('A1 — the young-account quiet gate (server-enforced; this is the honest pre-gate)', () => {
  it('a <14d account that opens the overflow entry hits the honest gate (no rows, no disclaimer)', () => {
    mockMe = { role: 'user', memberSince: YOUNG };
    renderTab();
    openEdit();
    expect(screen.getByText('EDITING UNLOCKS AFTER 14 DAYS')).toBeTruthy();
    expect(screen.queryByText('STUDIO')).toBeNull();
    expect(screen.queryByText('EDITING CATALOG DETAILS')).toBeNull();
  });

  it('a young ADMIN is exempt (the rows open)', () => {
    mockMe = { role: 'admin', memberSince: new Date().toISOString() };
    renderTab();
    openEdit();
    expect(screen.queryByText('EDITING UNLOCKS AFTER 14 DAYS')).toBeNull();
    expect(screen.getByText('STUDIO')).toBeTruthy();
  });

  it('an aged (≥14d) account edits freely — no gate line', () => {
    renderTab();
    openEdit();
    expect(screen.queryByText('EDITING UNLOCKS AFTER 14 DAYS')).toBeNull();
    expect(screen.getByText('STUDIO')).toBeTruthy();
  });
});

describe('Owner walk (m6) — the accuracy disclaimer on entering edit mode', () => {
  it('the disclaimer renders atop the editable state', () => {
    renderTab();
    expect(screen.queryByText('EDITING CATALOG DETAILS')).toBeNull(); // not shown until edit mode is on
    openEdit();
    expect(screen.getByText('EDITING CATALOG DETAILS')).toBeTruthy();
    expect(screen.getByText(/Please edit only with accurate information/)).toBeTruthy();
  });
});

describe('Walk-4 P4-a — friends-who-own gets air from the stats block above it', () => {
  it('the FRIENDS WHO OWN IT block carries its own top margin (not just the tab’s section gap)', () => {
    renderTab();
    // walk up from the section head to its wrapper and read the resolved margin (the block sets its
    // own marginTop ON TOP of the tab's uniform section gap — that extra air IS the fix).
    let node: { parent: unknown; props: { style?: unknown } } | null = screen.getByText('FRIENDS WHO OWN IT — 0');
    let marginTop: number | undefined;
    for (let i = 0; i < 5 && node && marginTop === undefined; i += 1) {
      marginTop = (StyleSheet.flatten(node.props.style) as { marginTop?: number } | undefined)?.marginTop;
      node = node.parent as typeof node;
    }
    expect(marginTop).toBeGreaterThan(0);
  });
});
