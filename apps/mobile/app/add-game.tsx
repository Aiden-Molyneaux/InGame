import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { CatalogItem, CollectionItem, CollectionStatus, DedupSuggestion } from '@ingame/shared';
import { GameCard } from '../src/components/GameCard';
import { CardFan } from '../src/components/CardFan';
import { ScreenButton } from '../src/components/ScreenButton';
import { SearchField } from '../src/components/SearchField';
import { KeyboardLift } from '../src/components/KeyboardLift';
import { TextField } from '../src/components/TextField';
import { GenreTag } from '../src/components/GenreTag';
import { InlineBanner } from '../src/components/InlineBanner';

import { COLLECTION_STATUSES, STATUS_LABEL } from '../src/constants/collection';
import { theme, themedStyles } from '../src/theme';
import {
  useGetGenresQuery,
  useGetPopularQuery,
  useLazySearchCatalogQuery,
  useCreateGameMutation,
  useAddToCollectionMutation,
  useUpdateEntryMutation,
} from '../src/store/api';

// ADD GAME (§2.4, the §4.3 boards) — a FlowTakeover entered from the Collection's gold ADD.
// Search (CAT-01, bottom-docked field · never-blank POPULAR rail pre-query) → a tap-focused card
// fan with the focused card's meta + CAT-09 presence line + CAT-05 credit + gold ADD → the COL-02
// status beat. NONE OF THESE → create (CAT-02) with the CAT-03 InlineBanner dedup warn (409
// suggestions · CREATE ANYWAY = dedupOverride; an exact match never overrides). Per-field 422
// details render under their inputs (B1/W4). The M4 card step + the full celebration/report beats
// ride their milestones.

const SEARCH_DEBOUNCE_MS = 350;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: { path: string; message: string }[];
    suggestions?: DedupSuggestion[];
  };
};
function errOf(e: unknown): NonNullable<ApiErrorPayload['error']> {
  return (e as { data?: ApiErrorPayload })?.data?.error ?? {};
}

export default function AddGame() {
  const router = useRouter();
  const styles = useStyles();

  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<CollectionItem | null>(null); // the status beat

  return (
    // S4-d (M3-R R0-2): the old window-measuring KeyboardAvoidingView chronically mis-lifted inside
    // the device frame — replaced by the frame-aware KeyboardLift on the docked search bar itself.
    <View style={styles.flex}>
      <View style={styles.screen}>
        {/* FlowHeader (S4-a/e): LEFT-aligned title + a labeled RETURN link (no ✕), and NO count chip —
            add-game isn't a collection-count surface (board add-game-states :755–756). */}
        <View style={styles.flowHead}>
          <Text style={styles.flowTitle}>ADD GAME</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to collection"
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={styles.returnLink}>‹ RETURN TO COLLECTION</Text>
          </Pressable>
        </View>

        {added ? (
          <StatusBeat item={added} onDone={() => router.back()} />
        ) : mode === 'create' ? (
          <CreateForm
            initialName={q}
            onCancel={() => setMode('search')}
            onAdded={setAdded}
            onPickExisting={(name) => {
              setQ(name);
              setMode('search');
            }}
          />
        ) : (
          <SearchMode q={q} setQ={setQ} onNoneOfThese={() => setMode('create')} onAdded={setAdded} />
        )}
      </View>
    </View>
  );
}

// ── search → fan → focused meta → ADD ─────────────────────────────────────────────────────────────
function SearchMode({
  q,
  setQ,
  onNoneOfThese,
  onAdded,
}: {
  q: string;
  setQ: (v: string) => void;
  onNoneOfThese: () => void;
  onAdded: (item: CollectionItem) => void;
}) {
  const styles = useStyles();
  const { data: popular } = useGetPopularQuery();
  const [search, searchState] = useLazySearchCatalogQuery();
  const [foreIndex, setForeIndex] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);
  const [addToCollection, addState] = useAddToCollectionMutation();

  const trimmed = q.trim();
  useEffect(() => {
    if (trimmed.length === 0) return;
    const t = setTimeout(() => void search(trimmed, true), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, search]);

  const querying = trimmed.length > 0;
  const items: CatalogItem[] = useMemo(() => {
    if (querying) return searchState.data?.items ?? [];
    return popular?.items ?? []; // never blank — the POPULAR FIRST ADDS rail (CAT-09)
  }, [querying, searchState.data, popular]);

  // Reset the fore to the first card when the result set changes (a stale index must not carry over).
  useEffect(() => setForeIndex(0), [querying, searchState.data]);

  // §0.7 focus-only: the CardFan's centered FORE card is the focused card and always shows its meta +
  // ADD (the board's P1 static frame just isn't mid-interaction). Clamp in case the list shrank before
  // the reset effect runs. Add acts on the fore — a visible, meta-shown card, never a hidden one.
  const safeFore = items.length > 0 ? Math.min(foreIndex, items.length - 1) : 0;
  const focused = items[safeFore] ?? null;

  async function add() {
    if (!focused) return;
    setAddError(null);
    try {
      onAdded(await addToCollection({ gameId: focused.id }).unwrap());
    } catch (e) {
      setAddError(errOf(e).message ?? 'Couldn’t add. Try again.');
    }
  }

  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* R14 — the board's match COUNT, not a static "RESULTS" (board P2 "MATCHING…" · P3 "N MATCHES") */}
        <Text style={styles.railHead}>
          {querying
            ? searchState.isFetching
              ? 'MATCHING…'
              : `${items.length} ${items.length === 1 ? 'MATCH' : 'MATCHES'}`
            : 'POPULAR FIRST ADDS'}
        </Text>

        {querying && searchState.isFetching ? (
          <ActivityIndicator color={theme.brand.accent} />
        ) : items.length === 0 ? (
          <View style={styles.noneWrap}>
            <Text style={styles.noneTitle}>{querying ? 'NO MATCHES' : 'THE CATALOG IS EMPTY'}</Text>
            <Text style={styles.noneSub}>
              {querying
                ? 'Not in the community catalog yet — be the one who adds it.'
                : 'Someone has to go first.'}
            </Text>
          </View>
        ) : (
          <>
            {/* S4-f — the focused card's meta ABOVE the fan (name-first · CAT-09 presence · CAT-05 credit) */}
            {focused ? <FocusedMeta item={focused} /> : null}
            {/* S4-c — the 3-up CardFan: fore + rotated neighbours + ‹ dots › + SWIPE (focus-only, §0.7) */}
            <CardFan
              items={items.map((i) => ({ id: i.id, title: i.name }))}
              foreIndex={safeFore}
              onFocus={setForeIndex}
            />
            {addError ? <Text style={styles.errLine}>{addError}</Text> : null}
            <ScreenButton
              label={
                focused?.inCollection
                  ? 'In your collection ✓'
                  : addState.isLoading
                    ? '…'
                    : 'Add to collection'
              }
              variant="add"
              disabled={!focused || focused.inCollection || addState.isLoading}
              onPress={add}
              block
            />
          </>
        )}

        {querying ? (
          <View style={styles.noneHook}>
            {/* walk2 B8 ⚖ (owner ruling 2026-07-17) — the create-this-game prompt is the F-02
                ACQUISITIVE voice: GOLD with the pixel-stepped silhouette. ScreenButton/add IS that
                grammar (gold fill + steppedRectPath corners) — consumed, not hand-drawn; the quiet
                TertiaryLink it replaces undersold the catalog's be-first hook (CAT-02). */}
            <Text style={styles.noneLead}>NONE OF THESE?</Text>
            <ScreenButton label={`Create “${trimmed}”`} variant="add" onPress={onNoneOfThese} block />
          </View>
        ) : (
          // CAT-12 FRIENDS-ARE-PLAYING rail (0076 §0.8 · decision 0062) — pre-query context. The
          // `/catalog/friends-active` endpoint is NOT live yet (404 — only `friends-who-own` is on the
          // catalog router), so the rail renders an honest EXPECTED-empty with the cite, NEVER faked. It
          // hard-needs the P1 friend graph + a server route; ranked by `friendsHaveCount` when it lands.
          <View style={styles.friendsRail}>
            <Text style={styles.railHead}>FRIENDS ARE PLAYING</Text>
            <Text style={styles.friendsExpected}>
              See what your friends are adding here soon — the friends-active catalog feed lands with the
              server’s CAT-12 route.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* bottom-docked search (OQ-035) — rises above the keyboard within the frame (S4-d, R0-2) */}
      <KeyboardLift>
        <View style={styles.dock}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search the catalog" autoFocus />
        </View>
      </KeyboardLift>
    </>
  );
}

function FocusedMeta({ item }: { item: CatalogItem }) {
  const styles = useStyles();
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;
  const sub = [year, item.studio].filter(Boolean).join(' · ').toUpperCase();
  return (
    <View style={styles.meta}>
      {/* R2 (owner) — NAME · YEAR · STUDIO on ONE line (name bold, meta dim); genre + CAT-05 credit removed. */}
      <Text style={styles.metaTitle}>
        {item.name.toUpperCase()}
        {sub ? <Text style={styles.metaSub}>{` · ${sub}`}</Text> : null}
      </Text>
      {/* the CAT-09 presence line */}
      <Text style={styles.metaPresence}>
        IN {item.collectionsCount} COLLECTION{item.collectionsCount === 1 ? '' : 'S'} ·{' '}
        {item.friendsHaveCount} FRIEND{item.friendsHaveCount === 1 ? '' : 'S'} HAVE IT
      </Text>
    </View>
  );
}

// ── the COL-02 status beat (chips OFF-card — no stamps on art) ────────────────────────────────────
function StatusBeat({ item, onDone }: { item: CollectionItem; onDone: () => void }) {
  const styles = useStyles();
  const [updateEntry, state] = useUpdateEntryMutation();
  const [status, setStatus] = useState<CollectionStatus>(item.status);

  async function pick(next: CollectionStatus) {
    setStatus(next);
    try {
      await updateEntry({ entryId: item.entryId, status: next }).unwrap();
    } catch {
      setStatus(item.status); // quiet revert — the beat is advisory, DONE closes either way
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.addedWrap}>
        <GameCard title={item.title} size="grid" />
        <Text style={styles.addedTitle}>ADDED TO YOUR SHELF</Text>
      </View>
      <Text style={styles.railHead}>SET A STATUS</Text>
      <View style={styles.chipRow}>
        {COLLECTION_STATUSES.map((s) => (
          <GenreTag key={s} label={STATUS_LABEL[s]} selected={status === s} onPress={() => void pick(s)} />
        ))}
      </View>
      <ScreenButton label={state.isLoading ? '…' : 'Done'} onPress={onDone} block />
    </ScrollView>
  );
}

// ── create (CAT-02) + the CAT-03 dedup warn beat ─────────────────────────────────────────────────
function CreateForm({
  initialName,
  onCancel,
  onAdded,
  onPickExisting,
}: {
  initialName: string;
  onCancel: () => void;
  onAdded: (item: CollectionItem) => void;
  onPickExisting: (name: string) => void;
}) {
  const styles = useStyles();
  const { data: genres } = useGetGenresQuery();
  const [createGame, createState] = useCreateGameMutation();
  const [addToCollection] = useAddToCollectionMutation();

  const [name, setName] = useState(initialName);
  const [genreIds, setGenreIds] = useState<Set<string>>(new Set());
  const [studio, setStudio] = useState('');
  const [publisher, setPublisher] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DedupSuggestion[]>([]);

  const hasExact = suggestions.some((s) => s.exact);

  async function submit(dedupOverride: boolean) {
    setFieldErrors({});
    setTopError(null);
    setSuggestions([]);
    try {
      const body = {
        name: name.trim(),
        genreIds: [...genreIds],
        ...(studio.trim() ? { studio: studio.trim() } : {}),
        ...(publisher.trim() ? { publisher: publisher.trim() } : {}),
        ...(releaseDate.trim() ? { releaseDate: releaseDate.trim() } : {}),
        ...(dedupOverride ? { dedupOverride: true } : {}),
      };
      const created = await createGame(body).unwrap();
      onAdded(await addToCollection({ gameId: created.id }).unwrap());
    } catch (e) {
      const err = errOf(e);
      if (err.code === 'DUPLICATE_SUSPECTED') {
        setSuggestions(err.suggestions ?? []);
        return;
      }
      const fields: Record<string, string> = {};
      for (const d of err.details ?? []) if (d.path && !fields[d.path]) fields[d.path] = d.message;
      setFieldErrors(fields);
      setTopError(Object.keys(fields).length > 0 ? null : (err.message ?? 'Couldn’t create. Try again.'));
    }
  }

  const toggleGenre = (id: string) => {
    const next = new Set(genreIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGenreIds(next);
  };

  return (
    // R0-follow (murr R0 audit): the removed KAV left the create form with no keyboard handling — a
    // focused lower field (publisher / release date) + the Create button sat under the keyboard on
    // iOS. `automaticallyAdjustKeyboardInsets` insets the scroll content by the keyboard's own
    // intersection with THIS ScrollView (frame-correct, unlike the window-measuring KAV). Android's
    // adjustResize reflows; web is a no-op. Native — confirmed at the R2 device pass.
    <ScrollView
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.railHead}>CREATE A CATALOG ENTRY</Text>

      {suggestions.length > 0 ? (
        <InlineBanner title={hasExact ? 'Already in the catalog' : 'Did you mean…?'}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${s.name}`}
              onPress={() => onPickExisting(s.name)}
              style={styles.suggestionRow}
            >
              <GameCard title={s.name} size="thumb" />
              <View style={styles.suggestionMeta}>
                <Text style={styles.suggestionName}>{s.name}</Text>
                <Text style={styles.suggestionSub}>
                  {[s.releaseDate?.slice(0, 4), s.studio].filter(Boolean).join(' · ') || 'TAP TO ADD THIS ONE'}
                </Text>
              </View>
            </Pressable>
          ))}
          {!hasExact ? (
            <ScreenButton
              label="Create anyway"
              variant="secondary"
              onPress={() => void submit(true)}
              block
            />
          ) : null}
        </InlineBanner>
      ) : null}

      <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>GENRE(S)</Text>
        <View style={styles.chipRow}>
          {(genres?.items ?? []).map((g) => (
            <GenreTag
              key={g.id}
              label={g.name}
              selected={genreIds.has(g.id)}
              onPress={() => toggleGenre(g.id)}
            />
          ))}
        </View>
        {fieldErrors.genreIds ? <Text style={styles.errLine}>{fieldErrors.genreIds}</Text> : null}
      </View>
      <TextField label="Studio" value={studio} onChangeText={setStudio} error={fieldErrors.studio} />
      <TextField
        label="Publisher"
        value={publisher}
        onChangeText={setPublisher}
        error={fieldErrors.publisher}
      />
      <TextField
        label="Release date"
        value={releaseDate}
        onChangeText={setReleaseDate}
        placeholder="YYYY-MM-DD"
        error={fieldErrors.releaseDate}
      />

      {topError ? <Text style={styles.errLine}>{topError}</Text> : null}

      <ScreenButton
        label={createState.isLoading ? '…' : 'Create + add'}
        variant="add"
        disabled={createState.isLoading || name.trim().length === 0 || genreIds.size === 0}
        onPress={() => void submit(false)}
        block
      />
      <ScreenButton label="Back to search" variant="secondary" onPress={onCancel} block />
    </ScrollView>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  // N3 — no divider between the header and the POPULAR FIRST ADDS section (owner, 2026-07-04).
  flowHead: {
    alignItems: 'flex-start',
    gap: t.space.xs,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.lg,
  },
  // N2 — same size as the Collection ScreenHead title (display 21, F-06).
  flowTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  // N5 — the RETURN link is orange (the on-screen accent).
  returnLink: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  body: { padding: t.space.lg, gap: t.space.lg },
  railHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  friendsRail: { gap: t.space.sm, marginTop: t.space.xl, borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.lg },
  friendsExpected: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3, lineHeight: 14 },
  // N4 — the focused game's details are centered (owner, 2026-07-04).
  meta: { gap: 3, alignItems: 'center' },
  metaTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5, textAlign: 'center' },
  metaSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1 }, // R2 — inline year·studio (body/dim), baseline in the title line
  metaPresence: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1, textAlign: 'center' },
  noneWrap: { gap: t.space.sm, padding: t.space.lg, backgroundColor: t.scr.panel },
  noneTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  noneSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  noneHook: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md },
  // walk2 B8 — the quiet lead over the gold stepped create button (the be-first hook, CAT-02).
  noneLead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  dock: {
    padding: t.space.lg,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    backgroundColor: t.scr.bg,
  },
  addedWrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.lg },
  addedTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.success, letterSpacing: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  field: { gap: t.space.xs },
  fieldLabel: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  errLine: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.brand.alert },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  suggestionMeta: { flex: 1, gap: 1 },
  suggestionName: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.ink },
  suggestionSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
