import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { CatalogItem, CollectionItem, CollectionStatus, DedupSuggestion } from '@ingame/shared';
import { GameCard } from '../src/components/GameCard';
import { ScreenButton } from '../src/components/ScreenButton';
import { CountTag } from '../src/components/ScreenHead';
import { SearchField } from '../src/components/SearchField';
import { TextField } from '../src/components/TextField';
import { GenreTag } from '../src/components/GenreTag';
import { InlineBanner } from '../src/components/InlineBanner';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { theme } from '../src/theme';
import {
  useGetCollectionQuery,
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
const STATUSES: CollectionStatus[] = ['backlog', 'playing', 'beaten', 'completed', 'dropped', 'wishlist'];
const STATUS_LABEL: Record<CollectionStatus, string> = {
  backlog: 'BACKLOG',
  playing: 'PLAYING',
  beaten: 'BEATEN',
  completed: 'COMPLETED 100%',
  dropped: 'DROPPED',
  wishlist: 'WISHLIST',
};

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
  const { data: collection } = useGetCollectionQuery();

  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<CollectionItem | null>(null); // the status beat

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        {/* FlowHeader — ✕ · ADD GAME · CountTag (the +1 tick rides the invalidated query) */}
        <View style={styles.flowHead}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <Text style={styles.flowTitle}>ADD GAME</Text>
          <CountTag label={`${collection?.collectionTotal ?? 0} IN`} />
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
    </KeyboardAvoidingView>
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
  const { data: popular } = useGetPopularQuery();
  const [search, searchState] = useLazySearchCatalogQuery();
  const [focusedId, setFocusedId] = useState<string | null>(null);
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

  // Clear the focus when the result set changes so a stale focusedId can't linger into a new list.
  useEffect(() => setFocusedId(null), [querying, searchState.data]);

  // No silent items[0] fallback: Add acts on `focused`, so a game must be EXPLICITLY tapped (else null →
  // Add disabled). A fallback would let Add target a game the user never selected after a query change.
  const focused = items.find((i) => i.id === focusedId) ?? null;

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
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.railHead}>{querying ? 'RESULTS' : 'POPULAR FIRST ADDS'}</Text>

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
            {focused ? <FocusedMeta item={focused} /> : null}
            {/* the fan — tap focuses; the focused seat carries the F-09 accent ring */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fan}>
              {items.map((i) => (
                <Pressable
                  key={i.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Focus ${i.name}`}
                  onPress={() => setFocusedId(i.id)}
                  style={[styles.fanSeat, focused?.id === i.id && styles.fanSeatFocused]}
                >
                  <GameCard title={i.name} size="cell" />
                </Pressable>
              ))}
            </ScrollView>
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
            <TertiaryLink label={`None of these — create “${trimmed}”`} onPress={onNoneOfThese} />
          </View>
        ) : null}
      </ScrollView>

      {/* bottom-docked search (OQ-035) */}
      <View style={styles.dock}>
        <SearchField value={q} onChangeText={setQ} placeholder="Search the catalog" autoFocus />
      </View>
    </>
  );
}

function FocusedMeta({ item }: { item: CatalogItem }) {
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;
  return (
    <View style={styles.meta}>
      <Text style={styles.metaTitle}>{item.name.toUpperCase()}</Text>
      <Text style={styles.metaSub}>
        {[year, item.studio].filter(Boolean).join(' · ').toUpperCase() || '—'}
      </Text>
      {item.genres.length > 0 ? (
        <Text style={styles.metaGenres}>{item.genres.map((g) => g.name.toUpperCase()).join(' · ')}</Text>
      ) : null}
      {/* the CAT-09 presence line */}
      <Text style={styles.metaPresence}>
        IN {item.collectionsCount} COLLECTION{item.collectionsCount === 1 ? '' : 'S'} ·{' '}
        {item.friendsHaveCount} FRIEND{item.friendsHaveCount === 1 ? '' : 'S'} HAVE IT
      </Text>
      {/* the CAT-05 contributor credit */}
      <Text style={styles.metaCredit}>ADDED BY {item.contributor.username.toUpperCase()}</Text>
    </View>
  );
}

// ── the COL-02 status beat (chips OFF-card — no stamps on art) ────────────────────────────────────
function StatusBeat({ item, onDone }: { item: CollectionItem; onDone: () => void }) {
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
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.addedWrap}>
        <GameCard title={item.title} size="grid" />
        <Text style={styles.addedTitle}>ADDED TO YOUR SHELF</Text>
      </View>
      <Text style={styles.railHead}>SET A STATUS</Text>
      <View style={styles.chipRow}>
        {STATUSES.map((s) => (
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
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  flowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.scr.hairline,
  },
  close: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, padding: theme.space.sm },
  flowTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 2 },
  body: { padding: theme.space.lg, gap: theme.space.lg },
  railHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  meta: { gap: 3 },
  metaTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 0.5 },
  metaSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  metaGenres: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1 },
  metaPresence: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
  metaCredit: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  fan: { gap: theme.space.md, paddingVertical: theme.space.sm },
  fanSeat: { padding: 3, borderWidth: 1, borderColor: 'transparent' },
  fanSeatFocused: { borderColor: theme.scr.accent }, // F-09 selection
  noneWrap: { gap: theme.space.sm, padding: theme.space.lg, backgroundColor: theme.scr.panel },
  noneTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1 },
  noneSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, lineHeight: 16 },
  noneHook: { alignItems: 'center', paddingVertical: theme.space.md },
  dock: {
    padding: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    backgroundColor: theme.scr.bg,
  },
  addedWrap: { alignItems: 'center', gap: theme.space.lg, paddingVertical: theme.space.lg },
  addedTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.brand.success, letterSpacing: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  field: { gap: theme.space.xs },
  fieldLabel: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  errLine: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.brand.alert },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  suggestionMeta: { flex: 1, gap: 1 },
  suggestionName: { fontFamily: theme.font.screenSemi, fontSize: theme.type.body, color: theme.scr.ink },
  suggestionSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
});
