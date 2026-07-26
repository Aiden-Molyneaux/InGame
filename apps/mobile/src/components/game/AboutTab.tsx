import { useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { GameDetail, GameEditableField, GameEditValue } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';
import { GenreTag } from '../GenreTag';
import { ScreenButton } from '../ScreenButton';
import { TextField } from '../TextField';
import { InlineBanner } from '../InlineBanner';
import { LoadError } from '../lifecycle/LoadError';
import { useGetGameDetailQuery, useSubmitGameEditMutation } from '../../store/catalogRailsApi';
import { useGetFriendsWhoOwnQuery } from '../../store/friendApi';
import { useGetGenresQuery, useGetMeQuery } from '../../store/api';

// AboutTab (W-D1 · component-map §9 — the Game-page ABOUT tab) — the SHARED game-detail fill rendered
// IDENTICALLY across all three postures (OWN · FRIEND · CATALOG). Sourced from the W-C5 aggregate
// GET /catalog/games/:id (`gameDetailSchema`): the canonical facts (studio/publisher/release year) ·
// genre chips · CAT-05 contributor credit (→ the contributor screen) · CAT-09 PresenceStats (collections
// / friends-have) · the CAT-09c named friends-who-own list (rows → /user/:id). This replaces the OWN tab's
// old EXPECTED stub (game/[id].tsx) and is the W-C5 ABOUT client half.
//
// friends-who-own keeps the LIVE focused read (GET /catalog/games/:id/friends-who-own, CAT-09c) — the
// walk-signed section with its PROF-03 hours-gating + avatar rows — rather than re-render from
// gameDetail.friendsWhoOwn (the same cohort; the aggregate's copy is left unconsumed, a benign
// redundancy flagged for a later consolidation).
//
// M6 W-6 (CAT-13/14 — CAT-06's suggest-edit EXPECTED stub goes LIVE as wiki editing): the facts block
// gains ONE cream EDIT key (ScreenButton secondary/mini, sited on the facts block per the draft §3)
// flipping into PlayDossier-grammar per-field rows (STUDIO · PUBLISHER · RELEASE DATE · GENRES — the
// CAT-13 editable set; the TITLE is locked, fixed via report → MOD-14). Each row edits in place via
// the `bare` TextField (genres = the add-game GenreTag chip toggle) and each save submits JUST that
// field; refusals land on the row's own error line. A1: young accounts (<14d, non-admin) see the
// quiet disabled gate — the server enforces. CAT-14: the latest edit is attributed under the CAT-05
// credit (`EDITED BY X · 2D AGO`, dim body-11, routes to the editor's profile).
export function AboutTab({
  gameId,
  onViewContributor,
  onOpenUser,
  beforeFriends,
  editing,
  onEditingChange,
}: {
  gameId: string;
  /** CAT-05 — the contributor credit routes to the contributor profile (app-wide designer-tap). */
  onViewContributor: (userId: string) => void;
  /** CAT-09c — a friends-who-own row routes to that friend's profile. */
  onOpenUser: (userId: string) => void;
  /** W-D1 D-3 — an optional slot rendered AFTER the canonical game info and BEFORE the friends-who-own
   *  list. CATALOG passes its NOT-IN-YOUR-COLLECTION band here so the section order reads
   *  info → not-in-collection (+ ADD CTA) → friends-who-own. OWN/FRIEND omit it (no band). */
  beforeFriends?: ReactNode;
  /** Walk-4 P4-b — CONTROLLED wiki-edit mode, the ONLY entry: every posture (OWN · FRIEND · CATALOG)
   *  hosts the ⋯ overflow's "Edit catalog details" row and drives this flag. The inline W-6 facts-block
   *  EDIT key is RETIRED everywhere (owner re-ruling, supersedes W3-A). Omitting these props leaves the
   *  tab read-only — a host with no overflow simply offers no edit entry. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const styles = useStyles();
  const { data, isLoading, isError, refetch } = useGetGameDetailQuery(gameId);

  // F1 (Wave D review) — `beforeFriends` (the CATALOG NOT-IN-COLLECTION band + ADD CTA) MUST survive a
  // game-detail fetch that lags or fails: the route resolver gates posture on the COLLECTION query, not
  // this game-detail read, so the CATALOG page reaches these branches with the key action inside the slot.
  // Render it above the skeleton / above the error so ADD TO COLLECTION is never unreachable. (Pre-D-3 the
  // band was a sibling above AboutTab and always rendered; the slot must preserve that guarantee.)
  if (isLoading) {
    return (
      <View style={styles.wrap} accessibilityLabel="Loading">
        {beforeFriends}
        <View style={[styles.sk, { width: '46%', height: 21, alignSelf: 'center' }]} />
        <View style={[styles.sk, { width: '64%', height: 11, alignSelf: 'center' }]} />
        <View style={[styles.sk, { width: '90%', height: 11 }]} />
        <View style={[styles.sk, { width: '80%', height: 11 }]} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.wrap}>
        {beforeFriends}
        <LoadError
          title="Couldn't load the game facts"
          message="This section didn't answer. Try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* canonical facts — the title only; the studio/publisher/release/genres now read as the EXPLICIT
          labeled DETAILS block below (owner walk m6), so the old meta subtitle + DISC-02 chip strip
          (which rendered the genres a SECOND time right beside the subtitle) are retired. */}
      <View style={styles.facts}>
        <Text style={styles.title}>{data.name}</Text>
      </View>

      {/* CAT-13 (M6 W-6) — the facts block: the EXPLICIT labeled DETAILS list (PUBLISHER / STUDIO /
          RELEASE / GENRES — absent fields omit their row) in read mode, the per-field EDIT rows in edit
          mode. Walk-4 P4-b: edit mode is CONTROLLED by the page ⋯ overflow in EVERY posture — the
          inline EDIT key is retired (see the prop doc above). */}
      <FactsEditBlock game={data} editing={editing} onEditingChange={onEditingChange} />

      {/* CAT-05 contributor credit → the contributor profile */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Added to the catalog by ${data.contributor.username} — view contributions`}
        onPress={() => onViewContributor(data.contributor.userId)}
        style={({ pressed }) => [styles.credit, pressed && styles.creditPressed]}
      >
        <Text style={styles.creditText}>
          ADDED TO THE CATALOG BY <Text style={styles.creditName}>{data.contributor.username.toUpperCase()}</Text>
        </Text>
      </Pressable>

      {/* CAT-14 — the quiet edit attribution (latest edit only; absent when never edited). The same
          register as the ADDED BY credit above; routes to the editor's profile. Provenance is what
          makes a wiki trustworthy — and the soft deterrent (edits are signed in public, draft §3). */}
      {data.lastEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Last edited by ${data.lastEdit.editor.username} — view profile`}
          onPress={() => onOpenUser(data.lastEdit!.editor.userId)}
          style={({ pressed }) => [styles.credit, pressed && styles.creditPressed]}
        >
          <Text style={styles.editedByText}>
            EDITED BY <Text style={styles.editedByName}>{data.lastEdit.editor.username.toUpperCase()}</Text>
            {' · '}
            {agoLabel(data.lastEdit.editedAt)}
          </Text>
        </Pressable>
      ) : null}

      {/* CAT-09 community stats (owner walk m6) — laid out EXPLICITLY: collections + friends-have (always)
          + the community AVG RATING / AVG HOURS (each OMITTED when null — no ratings / no owners — rather
          than a misleading zero). Anonymous cross-user aggregates; the community-cards count reads in the
          CARDS tab. */}
      <View style={styles.presence}>
        <View style={styles.pstat}>
          <Text style={styles.pv}>{data.collectionsCount.toLocaleString('en-US')}</Text>
          <Text style={styles.pl}>{data.collectionsCount === 1 ? 'COLLECTION' : 'COLLECTIONS'}</Text>
        </View>
        <View style={styles.pstat}>
          <Text style={[styles.pv, styles.pvGold]}>{data.friendsHaveCount.toLocaleString('en-US')}</Text>
          {/* singularize the verb + noun at 1 — "1 FRIEND HAS IT" / "N FRIENDS HAVE IT" */}
          <Text style={styles.pl}>{data.friendsHaveCount === 1 ? 'FRIEND HAS IT' : 'FRIENDS HAVE IT'}</Text>
        </View>
        {data.avgRating != null ? (
          <View style={styles.pstat}>
            <Text style={[styles.pv, styles.pvGold]}>{data.avgRating.toFixed(1)}★</Text>
            <Text style={styles.pl}>AVG RATING</Text>
          </View>
        ) : null}
        {data.avgHours != null ? (
          <View style={styles.pstat}>
            <Text style={styles.pv}>{data.avgHours.toLocaleString('en-US')}</Text>
            <Text style={styles.pl}>AVG HOURS</Text>
          </View>
        ) : null}
      </View>

      {/* W-D1 D-3 — the CATALOG not-in-collection band slots HERE: after the game info, before friends */}
      {beforeFriends}

      {/* CAT-09c — the named friends-who-own list (LIVE focused read) */}
      <FriendsWhoOwnSection gameId={gameId} onOpenUser={onOpenUser} />
    </View>
  );
}

// FriendsWhoOwn (P9 · CAT-09c) — the ABOUT-tab named list of friends who own this game (GET /catalog/
// games/:id/friends-who-own). Friend-gated + block-filtered server-side; PROF-03 hours-gating (a friend
// who hides hours has `hours` absent → the row omits the stat). A row → their profile (`/user/:id`).
// Migrated verbatim from game/[id].tsx (W-D1 — ABOUT is now shared across postures).
function FriendsWhoOwnSection({ gameId, onOpenUser }: { gameId: string; onOpenUser: (userId: string) => void }) {
  const styles = useStyles();
  const { data, isLoading } = useGetFriendsWhoOwnQuery(gameId);
  if (isLoading) return null; // a quiet no-op while loading (the facts above already carry the tab)
  const rows = data?.friendsWhoOwn ?? [];
  return (
    <View style={styles.fwoBlock}>
      <Text style={styles.fwoHead}>FRIENDS WHO OWN IT — {data?.count ?? 0}</Text>
      {rows.length === 0 ? (
        <Text style={styles.fwoEmpty}>None of your friends own this yet.</Text>
      ) : (
        <View style={styles.fwoList}>
          {rows.map((r) => (
            <Pressable
              key={r.userId}
              accessibilityRole="button"
              accessibilityLabel={`Open ${r.username}'s profile`}
              onPress={() => onOpenUser(r.userId)}
              style={({ pressed }) => [styles.fwoRow, pressed && styles.fwoRowPressed]}
            >
              <Avatar username={r.username} avatarUrl={r.avatarUrl} avatarConfig={r.avatarConfig} size={30} />
              <Text style={styles.fwoName} numberOfLines={1}>{r.username.toUpperCase()}</Text>
              <View style={styles.fwoSpacer} />
              {r.hours !== undefined ? <Text style={styles.fwoHours}>{r.hours.toLocaleString('en-US')} HRS</Text> : null}
              <Text style={styles.fwoChev}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** CAT-14 — the attribution moment, board-voiced: JUST NOW · 5M AGO · 3H AGO · 2D AGO. */
function agoLabel(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

/** A1 — the client pre-gate mirror of the server's 14-day editor age-gate (admins exempt). */
const EDIT_UNLOCK_AGE_MS = 14 * 24 * 60 * 60_000;

type EditableFactsField = GameEditableField; // 'studio' | 'publisher' | 'releaseDate' | 'genres'

const FACT_LABEL: Record<EditableFactsField, string> = {
  studio: 'STUDIO',
  publisher: 'PUBLISHER',
  releaseDate: 'RELEASE DATE',
  genres: 'GENRES',
};

/**
 * CAT-13 (M6 W-6) — the facts-block EDIT mode. The page ⋯ overflow's "Edit catalog details" row flips
 * the block into the PlayDossier row grammar (gate-5 B.8 + N-B8; walk-4 P4-b retired the inline key):
 * each field is a titled row; tapping ✎ opens THAT field's editor in place without shifting the others;
 * the input is the `bare` TextField (the row titles the field and owns the error line); each save
 * submits JUST that field (one request per row — the server's one-field-per-request contract).
 * Genres reuse add-game's GenreTag chip toggle against GET /genres. Refusals (`screened` ·
 * `no_change` · `unknown_genre` · 429 · ACCOUNT_TOO_NEW) render on the row's own error line.
 * A1: a young (<14d, non-admin) account sees the quiet disabled gate — honest, no roadmap voice;
 * the SERVER is the enforcement.
 */
function FactsEditBlock({
  game,
  editing = false,
  onEditingChange,
}: {
  game: GameDetail;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const styles = useStyles();
  const { data: me } = useGetMeQuery();
  // Walk-4 P4-b — the mode is CONTROLLED, always: the host page's ⋯ overflow owns the flag. A host that
  // threads neither prop simply never opens edit mode (read-only facts) — there is no inline key left.
  const setEditing = (v: boolean) => onEditingChange?.(v);
  // the genre chips fetch only once the block is flipped open (the closed key needs no roster)
  const { data: genres } = useGetGenresQuery(undefined, { skip: !editing });
  const [submitEdit, submitState] = useSubmitGameEditMutation();
  const [open, setOpen] = useState<EditableFactsField | null>(null);
  // L3 (W-6) — a "latest value" mirror of `open` so a slow save can tell, at settle time, whether
  // the user has since moved to a DIFFERENT row (see save()).
  const openRef = useRef(open);
  openRef.current = open;
  const [value, setValue] = useState('');
  const [genreDraft, setGenreDraft] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // A1 — the quiet pre-gate: account younger than 14 days (and not admin) can't edit yet.
  // L2 (W-6) — fail CLOSED on an unparseable memberSince: a NaN date must NOT silently open the
  // gate (Date.now() - NaN < X is false). Treat missing/malformed as not-yet-eligible; the SERVER
  // is the real enforcement, so the quiet pre-gate errs to the "unlocks after 14 days" state.
  const memberSinceMs = me != null ? Date.parse(me.memberSince) : NaN;
  const tooNew =
    me != null &&
    me.role !== 'admin' &&
    (Number.isNaN(memberSinceMs) || Date.now() - memberSinceMs < EDIT_UNLOCK_AGE_MS);

  function beginEdit(f: EditableFactsField) {
    setError(null);
    setOpen(f);
    if (f === 'genres') setGenreDraft(new Set(game.genres.map((g) => g.id)));
    else setValue((game[f] as string | null) ?? '');
  }
  function closeRow() {
    setOpen(null);
    setError(null);
  }

  async function save(f: EditableFactsField) {
    let newValue: GameEditValue;
    if (f === 'genres') {
      const ids = [...genreDraft];
      if (ids.length === 0) {
        setError('Pick at least one genre.'); // the min-1 floor (CAT-04) — client-guarded
        return;
      }
      newValue = ids;
    } else if (f === 'releaseDate') {
      const date = value.trim();
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError('Must be a date — YYYY-MM-DD (e.g. 2022-02-25).'); // the add-game validation copy
        return;
      }
      newValue = date || null; // empty CLEARS (the field is CAT-02 optional)
    } else {
      newValue = value.trim() || null; // studio / publisher — empty clears
    }
    try {
      await submitEdit({ gameId: game.id, field: f, newValue }).unwrap();
      // L3 (W-6) — a slow save settles ONLY its own row. If the user has since opened a different
      // row (openRef moved off `f`), leave that row and the input they started there untouched;
      // force-closing it would discard their in-progress edit. Otherwise close: the returned game
      // reconciled the cache and the row re-reads the applied value.
      if (openRef.current === f) closeRow();
    } catch (e) {
      const err = (e as {
        data?: { error?: { code?: string; message?: string; details?: { message?: string }[] } };
      })?.data?.error;
      if (err?.code === 'RATE_LIMITED') setError('Too many edits — give it a minute.');
      else if (err?.code === 'ACCOUNT_TOO_NEW') setError('Editing unlocks after 14 days.');
      else setError(err?.details?.[0]?.message ?? err?.message ?? "Couldn't save — try again.");
    }
  }

  if (!editing) {
    // Read mode — the EXPLICIT labeled DETAILS list (owner walk m6). Shown in EVERY posture (reading the
    // facts is never gated). Walk-4 P4-b: NO inline EDIT key — the page ⋯ overflow is the one door.
    return (
      <View style={styles.editWrap}>
        <FactReadRows game={game} />
      </View>
    );
  }

  // A1 — a young account that reached edit mode via the overflow entry. Show the honest quiet gate +
  // an exit; the SERVER is the enforcement.
  if (tooNew) {
    return (
      <View style={styles.editWrap}>
        <Text style={styles.editGateNote}>EDITING UNLOCKS AFTER 14 DAYS</Text>
        <ScreenButton
          label="Done"
          variant="secondary"
          size="mini"
          accessibilityLabel="Done editing game facts"
          onPress={() => setEditing(false)}
        />
      </View>
    );
  }

  const editorFor = (f: EditableFactsField, input: ReactNode) => (
    <View style={styles.factEditor}>
      {input}
      {error ? <Text style={styles.factErr}>{error}</Text> : null}
      <View style={styles.factEditorRow}>
        <ScreenButton
          label={submitState.isLoading ? '…' : '✓ Save'}
          variant="primary"
          onPress={() => void save(f)}
          disabled={submitState.isLoading}
          style={styles.factEditorBtn}
        />
        <ScreenButton
          label="Cancel"
          variant="secondary"
          onPress={closeRow}
          disabled={submitState.isLoading}
          style={styles.factEditorBtn}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.editWrap}>
      {/* Owner walk (m6) — the accuracy disclaimer atop the editable state. The catalog is a shared
          wiki (draft §3 "edits are signed in public"): the soft deterrent + the honest ask. Chrome
          label uppercase; the guidance is sentence case (the app's info-copy voice).
          Rendered with InlineBanner (component-map §6; decision 0042 named it THE in-flow notice — the
          same primitive carries the CAT-03 dedup warn on the Add-Game create form). The prior bespoke
          hairline + accent-left-bar box was a one-off pattern found nowhere else in the app; same
          approved copy, the app's established dress. Stretch wrapper — editWrap centres its children,
          and this banner (like the factRows below) spans the column. */}
      <View style={styles.disclaimerWrap}>
        <InlineBanner title="Editing catalog details">
          <Text style={styles.disclaimerBody}>
            These facts are shared with everyone. Please edit only with accurate information — your changes
            are public and attributed to you.
          </Text>
        </InlineBanner>
      </View>
      <View style={styles.factRows}>
        <FactRow
          label={FACT_LABEL.studio}
          display={game.studio ?? '—'}
          editing={open === 'studio'}
          onEdit={() => beginEdit('studio')}
          editor={editorFor(
            'studio',
            <TextField label="Studio" bare value={value} onChangeText={setValue} autoCapitalize="words" placeholder="Studio — empty clears" />,
          )}
        />
        <FactRow
          label={FACT_LABEL.publisher}
          display={game.publisher ?? '—'}
          editing={open === 'publisher'}
          onEdit={() => beginEdit('publisher')}
          editor={editorFor(
            'publisher',
            <TextField label="Publisher" bare value={value} onChangeText={setValue} autoCapitalize="words" placeholder="Publisher — empty clears" />,
          )}
        />
        <FactRow
          label={FACT_LABEL.releaseDate}
          display={game.releaseDate ?? '—'}
          editing={open === 'releaseDate'}
          onEdit={() => beginEdit('releaseDate')}
          editor={editorFor(
            'releaseDate',
            <TextField label="Release date" bare value={value} onChangeText={setValue} placeholder="YYYY-MM-DD" />,
          )}
        />
        <FactRow
          label={FACT_LABEL.genres}
          display={game.genres.map((g) => g.name).join(' · ') || '—'}
          editing={open === 'genres'}
          onEdit={() => beginEdit('genres')}
          editor={editorFor(
            'genres',
            <View style={styles.genreChips}>
              {(genres?.items ?? []).map((g) => (
                <GenreTag
                  key={g.id}
                  label={g.name}
                  selected={genreDraft.has(g.id)}
                  onPress={() => {
                    const next = new Set(genreDraft);
                    if (next.has(g.id)) next.delete(g.id);
                    else next.add(g.id);
                    setGenreDraft(next);
                  }}
                />
              ))}
            </View>,
          )}
        />
      </View>
      <ScreenButton
        label="Done"
        variant="secondary"
        size="mini"
        accessibilityLabel="Done editing game facts"
        onPress={() => {
          closeRow();
          setEditing(false);
        }}
      />
    </View>
  );
}

// The read-mode counterpart to the FactRow edit grammar (owner walk m6): the EXPLICIT labeled DETAILS
// list. Each PRESENT fact is a titled `label · value` row (genres = chips in the value area); an ABSENT
// fact omits its whole row (no empty labels). Same row grammar + labels as edit mode so toggling into
// edit doesn't reshuffle the block. Renders nothing when the game carries no facts at all.
function FactReadRows({ game }: { game: GameDetail }) {
  const styles = useStyles();
  const hasAny = Boolean(game.studio || game.publisher || game.releaseDate || game.genres.length > 0);
  if (!hasAny) return null;
  return (
    <View style={styles.factRows}>
      {game.studio ? <FactReadRow label={FACT_LABEL.studio} value={game.studio} /> : null}
      {game.publisher ? <FactReadRow label={FACT_LABEL.publisher} value={game.publisher} /> : null}
      {game.releaseDate ? <FactReadRow label={FACT_LABEL.releaseDate} value={game.releaseDate} /> : null}
      {game.genres.length > 0 ? (
        <View style={styles.factRowWrap}>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>{FACT_LABEL.genres}</Text>
            <View style={styles.factGenreChips}>
              {game.genres.map((g) => (
                <View key={g.id} style={styles.chip}>
                  <Text style={styles.chipText}>{g.name.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FactReadRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.factRowWrap}>
      <View style={styles.factRow}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// The PlayDossier row grammar (gate-5 B.8): label · value · ✎; the open editor renders BENEATH its
// own row so opening one field never shifts the siblings.
function FactRow({
  label,
  display,
  editing,
  onEdit,
  editor,
}: {
  label: string;
  display: string;
  editing: boolean;
  onEdit: () => void;
  editor: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.factRowWrap}>
      <View style={styles.factRow}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue} numberOfLines={2}>{display}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label.toLowerCase()}`}
          onPress={editing ? undefined : onEdit}
          hitSlop={8}
        >
          <Text style={[styles.factPencil, editing && styles.factPencilOn]}>✎</Text>
        </Pressable>
      </View>
      {editing ? editor : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.lg },
  sk: { backgroundColor: t.scr.panel },
  facts: { gap: t.space.xs, alignItems: 'center' },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, textAlign: 'center', letterSpacing: 0.5 },
  // GENRES read-row chips (owner walk m6) — the value area's wrapping chip cluster, right-aligned into
  // the label · value row so it reads as one labeled fact beside STUDIO / PUBLISHER / RELEASE.
  factGenreChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, justifyContent: 'flex-end' },
  chip: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panelHi,
    paddingHorizontal: t.space.md,
    paddingVertical: 3,
    borderRadius: t.corner.screen, // F-07 square
  },
  chipText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  credit: { alignSelf: 'center' },
  creditPressed: { opacity: 0.7 },
  creditText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  creditName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  // CAT-14 — the EDITED BY attribution: dim, body-11 (F-06), the ADDED-BY register (draft §3).
  editedByText: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  editedByName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  // CAT-13 — the A1 quiet young-account gate (the inline EDIT key it used to sit beside is retired, P4-b).
  editGateNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
  editWrap: { gap: t.space.md, alignItems: 'center' },
  // Owner walk (m6) — the accuracy disclaimer now rides the InlineBanner primitive (decision 0042).
  // The wrapper only stretches it to the column (editWrap centres its children); the banner owns its
  // own accent outline / panel / padding. The body copy keeps the app's sentence-case info voice.
  disclaimerWrap: { alignSelf: 'stretch' },
  disclaimerBody: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  factRows: { alignSelf: 'stretch', borderWidth: 1, borderColor: t.scr.hairline, gap: 1, backgroundColor: t.scr.hairline },
  factRowWrap: { backgroundColor: t.scr.panel },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  factLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  factValue: { flex: 1, textAlign: 'right', fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink },
  factPencil: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim },
  factPencilOn: { color: t.scr.accent },
  factEditor: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md, gap: t.space.md },
  factEditorRow: { flexDirection: 'row', gap: t.space.md },
  factEditorBtn: { flex: 1, paddingVertical: t.space.md },
  factErr: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert },
  genreChips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  // owner walk (m6) — up to four stats now (collections · friends-have · avg rating · avg hours), so the
  // row WRAPS on narrow screens rather than crushing the columns together.
  presence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: t.space.xl, rowGap: t.space.md },
  pstat: { alignItems: 'center', gap: 2 },
  pv: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  pvGold: { color: t.scr.value },
  pl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  // friends-who-own — walk-4 P4-a: the owner asked for MORE AIR between the CAT-09 stats row (or the
  // CATALOG band that follows it) and this section, so the block adds its own top margin ON TOP of the
  // tab's section gap (12 + 16 = 28). It reads as its own section instead of crowding the stats.
  fwoBlock: { gap: t.space.sm, marginTop: t.space.xl },
  fwoHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  fwoEmpty: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3 },
  fwoList: { gap: t.space.sm },
  fwoRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm },
  fwoRowPressed: { opacity: 0.7 },
  fwoName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5, flexShrink: 1 },
  fwoSpacer: { flex: 1 },
  fwoHours: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  fwoChev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
}));
