import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CardDesignView, StylePresetStyle } from '@ingame/shared';
import { CardFace, parseComposition } from '../../src/components/CardFace';
import { BaseRail, type RailEntry } from '../../src/components/styler/BaseRail';
import { SectionChips, STYLER_SECTIONS, type StylerSection } from '../../src/components/styler/SectionChips';
import { AttributeSection, type AttributeOption } from '../../src/components/styler/AttributeSection';
import { IntensitySlider } from '../../src/components/styler/IntensitySlider';
import { KeepBeat } from '../../src/components/styler/KeepBeat';
import { ScreenButton } from '../../src/components/ScreenButton';
import { PulledSheet } from '../../src/components/PulledSheet';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { theme } from '../../src/theme';
import type { CardComposition } from '../../src/render/composition';
import {
  DEFAULT_INTENSITY,
  EFFECTS,
  FINISHES,
  FONTS,
  FRAMES,
  INKS,
  NAMEPLATES,
  START_SOURCES,
  surpriseDeal,
} from '../../src/styler/roster';
import {
  useGetCollectionQuery,
  useGetMeQuery,
  useGetMyCardsQuery,
  useGetStylePresetsQuery,
  useCreateCardMutation,
  useUpdateCardMutation,
  useSavePrivateCardMutation,
  useDeleteCardMutation,
  useUpdateEntryMutation,
  useCreateStylePresetMutation,
} from '../../src/store/api';

// The Styler (§3.2 · design-spec §2.5 · decision 0014 stage 2) — the in-frame card editor over the
// CARD-24a draft document (decision 0066): pick a start (BaseRail, CARD-16 never-blank) → the live
// carousel (five closed attributes redrawing the skia hero) → KEEP (save-private + equip) / SAVE
// PRIVATE / quiet-exit autosave. M4 = the 0063 FREE roster; every premium surface is EXPECTED(M5)
// (styler-manifest). Route: /styler/:gameId (+?cardId= resume from the switcher / My Designs).

type Mode = 'pick' | 'edit' | 'kept';
type SaveState = 'saved' | 'saving' | 'error' | 'fresh';

const AUTOSAVE_MS = 1200;
const RETRY_MS = 3000;

function presetToComposition(style: StylePresetStyle, base: CardComposition): CardComposition {
  const next: CardComposition = { ...base };
  const frame = style.frameId ? FRAMES.find((f) => f.id === style.frameId) : undefined;
  if (frame?.kind) next.frame = { kind: frame.kind, color: frame.color, width: frame.width };
  const effect = style.effect ? EFFECTS.find((e) => e.id === style.effect!.id) : undefined;
  if (effect && effect.kind !== 'none') next.effect = { kind: effect.kind, intensity: style.effect!.intensity };
  const finish = style.finishId ? FINISHES.find((f) => f.id === style.finishId) : undefined;
  if (finish && finish.kind !== 'none') next.finish = { kind: finish.kind };
  const plateDef = style.nameplateId ? NAMEPLATES.find((p) => p.id === style.nameplateId) : undefined;
  if (next.nameplate && plateDef?.shape) next.nameplate = { ...next.nameplate, shape: plateDef.shape };
  if (next.nameplate && style.title) {
    next.nameplate = { ...next.nameplate, fontId: style.title.fontId, ink: style.title.ink };
  }
  return next;
}

/** Derive the CARD-24b recipe from the draft's closed attributes (the SAVE-AS-PRESET write). */
function draftToPresetStyle(d: CardComposition): StylePresetStyle {
  const style: StylePresetStyle = {};
  if (d.frame?.kind) {
    const f = FRAMES.find((x) => x.kind === d.frame!.kind);
    if (f) style.frameId = f.id;
  }
  if (d.effect && d.effect.kind !== 'none') {
    const e = EFFECTS.find((x) => x.kind === d.effect!.kind);
    if (e) style.effect = { id: e.id, intensity: d.effect.intensity };
  }
  if (d.finish && d.finish.kind !== 'none') {
    const f = FINISHES.find((x) => x.kind === d.finish!.kind);
    if (f) style.finishId = f.id;
  }
  if (d.nameplate) {
    const p = NAMEPLATES.find((x) => x.shape === (d.nameplate!.shape ?? 'slab'));
    if (p) style.nameplateId = p.id;
    style.title = { fontId: d.nameplate.fontId ?? 'clean-sans', ink: d.nameplate.ink };
  }
  return style;
}

export default function Styler() {
  const { gameId, cardId } = useLocalSearchParams<{ gameId: string; cardId?: string }>();
  const router = useRouter();

  const { data: shelf, isLoading: shelfLoading, isError: shelfError, refetch } = useGetCollectionQuery();
  const { data: presets } = useGetStylePresetsQuery();
  const {
    data: myCards,
    isFetching: cardsFetching,
    isSuccess: cardsSuccess,
  } = useGetMyCardsQuery(undefined, { skip: !cardId });
  const { data: me } = useGetMeQuery();

  const [createCard] = useCreateCardMutation();
  const [updateCard] = useUpdateCardMutation();
  const [savePrivateCard] = useSavePrivateCardMutation();
  const [deleteCard] = useDeleteCardMutation();
  const [updateEntry] = useUpdateEntryMutation();
  const [createStylePreset] = useCreateStylePresetMutation();

  const entry = useMemo(() => shelf?.items.find((i) => i.gameId === gameId), [shelf, gameId]);
  const title = entry?.title ?? 'GAME';

  const [mode, setMode] = useState<Mode>(cardId ? 'edit' : 'pick');
  const [section, setSection] = useState<StylerSection>('frame');
  const [foreIndex, setForeIndex] = useState(0);
  const [surprise, setSurprise] = useState<CardComposition | null>(null);
  const [draft, setDraft] = useState<CardComposition | null>(null);
  const [cardRow, setCardRow] = useState<{ id: string; name: string; status: string } | null>(null);
  const [createdHere, setCreatedHere] = useState(false);
  const [explicitSave, setExplicitSave] = useState(false); // SAVE-AS-NEW — vetoes the zero-edit delete
  const [resumeFailed, setResumeFailed] = useState(false);
  const [userEdits, setUserEdits] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('fresh');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busyKeep, setBusyKeep] = useState(false);

  // The composition as it was when this session OPENED the card (resumed rows only). The autosave
  // writes to the same row (CARD-24a), so "discard" on an existing card must PATCH this back —
  // the gate-5 walk proved the old delete path destroyed the user's real card (owner D.23).
  const resumeSnapshotRef = useRef<CardComposition | null>(null);

  // ── resume (?cardId= — the switcher's EDIT IN STYLER / a DRAFT tile; CARD-24a) ────────────────
  // Gated on FRESH data: the autosave PATCH invalidates ['Cards'], so a cached getMyCards row can be
  // the pre-edit composition — resuming from it would overwrite the newer server draft on the next
  // autosave (murr F1, the blocker). A fresh fetch with no matching/parseable row is a dead resume
  // link (deleted card / foreign id) → the not-found state, not an eternal spinner.
  useEffect(() => {
    if (!cardId || draft || !cardsSuccess || cardsFetching || !myCards) return;
    const row = myCards.items.find((c) => c.id === cardId);
    const comp = row ? parseComposition(row.composition) : null;
    if (!row || !comp) {
      setResumeFailed(true);
      return;
    }
    resumeSnapshotRef.current = comp; // DISCARD on a resumed card REVERTS to this — never deletes
    setDraft(comp);
    setCardRow({ id: row.id, name: row.name, status: row.status });
    setMode('edit');
    setSaveState('saved');
    setSavedAt(Date.now());
  }, [cardId, draft, myCards, cardsSuccess, cardsFetching]);

  // ── the autosave document (CARD-24a · 0066 §6): debounced PATCH; failure-tolerant ─────────────
  const draftRef = useRef<CardComposition | null>(null);
  draftRef.current = draft;
  const cardRef = useRef(cardRow);
  cardRef.current = cardRow;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The retry re-arm lives in flushSave's catch — without an alive guard, a PATCH that fails
  // in-flight across an unmount (or after DISCARD deletes the row) re-arms forever: a 404 loop
  // every RETRY_MS until app restart (murr F4).
  const aliveRef = useRef(true);

  const flushSave = useCallback(async () => {
    const d = draftRef.current;
    const row = cardRef.current;
    if (!d || !row || !aliveRef.current) return;
    setSaveState('saving');
    try {
      await updateCard({ cardId: row.id, composition: d }).unwrap();
      if (!aliveRef.current) return;
      setSaveState('saved');
      setSavedAt(Date.now());
    } catch {
      if (!aliveRef.current) return;
      setSaveState('error'); // "NOT SAVED — RETRYING" (soft-fail; the local draft is intact)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushSave(), RETRY_MS);
    }
  }, [updateCard]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('saving');
    timerRef.current = setTimeout(() => void flushSave(), AUTOSAVE_MS);
  }, [flushSave]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const patchDraft = useCallback(
    (fn: (d: CardComposition) => CardComposition) => {
      setInlineError(null);
      setDraft((d) => (d ? fn(d) : d));
      setUserEdits((n) => n + 1);
      scheduleSave();
    },
    [scheduleSave],
  );

  // ── the BaseRail sources: system bases + [CARD-24b] saved presets, merged client-side ─────────
  const railEntries = useMemo<RailEntry[]>(() => {
    const sys: RailEntry[] = START_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      kindLabel: s.kindLabel,
      composition: s.compose(title),
    }));
    const fromPresets: RailEntry[] = (presets ?? []).map((p) => ({
      id: `preset-${p.id}`,
      name: p.name.toUpperCase(),
      kindLabel: 'PRESET',
      composition: presetToComposition(p.style as StylePresetStyle, START_SOURCES[0]!.compose(title)),
    }));
    const deal: RailEntry[] = surprise
      ? [{ id: 'surprise', name: 'SURPRISE', kindLabel: 'KIT', composition: surprise }]
      : [];
    return [...deal, ...sys, ...fromPresets];
  }, [title, presets, surprise]);

  // One in-flight guard for the three non-idempotent creates — a double-tap must not POST twice
  // (an orphan draft / a duplicate preset).
  const creatingRef = useRef(false);
  const [busyStart, setBusyStart] = useState(false);

  async function startWith(comp: CardComposition) {
    if (!gameId || creatingRef.current) return;
    creatingRef.current = true;
    setBusyStart(true);
    setInlineError(null);
    try {
      const row = await createCard({ gameId, composition: comp, name: title }).unwrap();
      setCardRow({ id: row.id, name: row.name, status: row.status });
      setDraft(comp);
      setCreatedHere(true);
      setExplicitSave(false);
      setUserEdits(0);
      setMode('edit');
      setSaveState('saved');
      setSavedAt(Date.now());
    } catch (e) {
      setInlineError(errMsg(e, 'Could not start the card. Try again.'));
    } finally {
      creatingRef.current = false;
      setBusyStart(false);
    }
  }

  // ── outcomes (OQ-108 labels; state-walks 5–7) ─────────────────────────────────────────────────
  async function keep() {
    if (!cardRow || !entry) return;
    setBusyKeep(true);
    setInlineError(null);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const d = draftRef.current;
      if (d) {
        // flush the draft first — and keep the save-state line honest either way (a KEEP failure
        // used to leave it stuck on "SAVING…").
        await updateCard({ cardId: cardRow.id, composition: d })
          .unwrap()
          .then(() => {
            setSaveState('saved');
            setSavedAt(Date.now());
          })
          .catch((e) => {
            setSaveState('error');
            throw e;
          });
      }
      await savePrivateCard(cardRow.id).unwrap();
      await updateEntry({ entryId: entry.entryId, activeCardDesignId: cardRow.id }).unwrap();
      setCardRow((r) => (r ? { ...r, status: 'private' } : r));
      setMode('kept');
    } catch (e) {
      setInlineError(errMsg(e, 'Could not equip it. Your draft is safe — try again.'));
    } finally {
      setBusyKeep(false);
    }
  }

  async function savePrivateQuiet() {
    if (!cardRow) return;
    setInlineError(null);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const d = draftRef.current;
      if (d) {
        await updateCard({ cardId: cardRow.id, composition: d })
          .unwrap()
          .then(() => {
            setSaveState('saved');
            setSavedAt(Date.now());
          })
          .catch((e) => {
            setSaveState('error');
            throw e;
          });
      }
      await savePrivateCard(cardRow.id).unwrap();
      router.back(); // the quiet exit — it waits in the game's card switcher (no beat)
    } catch (e) {
      setInlineError(errMsg(e, 'Could not save. Your draft is safe — try again.'));
    }
  }

  function quietExit() {
    // ◂ = the draft is autosaved (CARD-24a). A never-edited, never-kept draft created HERE is
    // deleted silently (no orphan rows) — state-walk 6 — UNLESS the user explicitly asked for the
    // row (SAVE AS NEW; deleting it would silently destroy an explicit save — murr F3).
    if (mode === 'edit' && cardRow && createdHere && !explicitSave && userEdits === 0 && cardRow.status === 'draft') {
      void deleteCard(cardRow.id);
    } else if (timerRef.current) {
      // A save is still debounced/retrying — ◂ promised "the draft is autosaved", so flush it
      // fire-and-forget before leaving (murr F2; the last edit inside the 1.2s window was dropped).
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const d = draftRef.current;
      const row = cardRef.current;
      if (d && row) void updateCard({ cardId: row.id, composition: d });
    }
    router.back();
  }

  async function saveAsNew() {
    if (!draft || !gameId || creatingRef.current) return;
    creatingRef.current = true;
    setOverflowOpen(false);
    try {
      const row = await createCard({ gameId, composition: draft, name: `${title} II` }).unwrap();
      setCardRow({ id: row.id, name: row.name, status: row.status });
      setCreatedHere(true);
      setExplicitSave(true); // the user ASKED for this row — quiet-exit must never delete it (murr F3)
      setUserEdits(0);
      setSaveState('saved');
      setSavedAt(Date.now());
    } catch (e) {
      setInlineError(errMsg(e, 'Could not duplicate. Try again.'));
    } finally {
      creatingRef.current = false;
    }
  }

  async function saveStyleAsPreset() {
    if (!draft || creatingRef.current) return;
    creatingRef.current = true;
    setOverflowOpen(false);
    try {
      await createStylePreset({ name: `${title} style`.slice(0, 40), style: draftToPresetStyle(draft) }).unwrap();
    } catch (e) {
      setInlineError(errMsg(e, 'Could not save the preset.'));
    } finally {
      creatingRef.current = false;
    }
  }

  async function discardDraft() {
    if (!cardRow) return;
    try {
      // silence the autosave first — a pending PATCH would either 404-loop against a deleted row
      // (murr F4) or re-write the edits we are about to revert (owner D.23)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (createdHere) {
        // a row this session created IS the draft — deleting it discards it
        await deleteCard(cardRow.id).unwrap();
      } else {
        // a RESUMED card pre-exists this session; the autosave already wrote into it, so discard
        // = revert the row to the composition captured at open. NEVER delete (D.23 data loss).
        const snap = resumeSnapshotRef.current;
        if (snap) await updateCard({ cardId: cardRow.id, composition: snap }).unwrap();
      }
      setConfirmDiscard(false);
      router.back();
    } catch (e) {
      setConfirmDiscard(false);
      setInlineError(errMsg(e, 'Could not discard.'));
    }
  }

  // ── the section options (previews = the draft wearing JUST that option) ──────────────────────
  const sectionUi = useMemo(() => {
    if (!draft) return null;
    const opts = (list: AttributeOption[], selectedId: string, heading: string, onSelect: (id: string) => void) => ({
      list,
      selectedId,
      heading,
      onSelect,
    });
    switch (section) {
      case 'frame': {
        const selected = FRAMES.find((f) => f.kind === (draft.frame?.kind ?? null))?.id ?? 'clean';
        return opts(
          FRAMES.map((f) => ({
            id: f.id,
            name: f.name,
            preview: f.kind ? { ...draft, frame: { kind: f.kind, color: f.color, width: f.width } } : stripKey(draft, 'frame'),
          })),
          selected,
          'FRAME — THE BORDER OBJECT',
          (id) => {
            const f = FRAMES.find((x) => x.id === id)!;
            patchDraft((d) => (f.kind ? { ...d, frame: { kind: f.kind, color: f.color, width: f.width } } : stripKey(d, 'frame')));
          },
        );
      }
      case 'effect': {
        const selected = EFFECTS.find((e) => e.kind === (draft.effect?.kind ?? 'none'))?.id ?? 'none';
        return opts(
          EFFECTS.map((e) => ({
            id: e.id,
            name: e.name,
            preview:
              e.kind === 'none'
                ? stripKey(draft, 'effect')
                : { ...draft, effect: { kind: e.kind, intensity: draft.effect?.intensity ?? DEFAULT_INTENSITY } },
          })),
          selected,
          'EFFECT — ONE AT A TIME',
          (id) => {
            const e = EFFECTS.find((x) => x.id === id)!;
            patchDraft((d) =>
              e.kind === 'none'
                ? stripKey(d, 'effect')
                : { ...d, effect: { kind: e.kind, intensity: d.effect?.intensity ?? DEFAULT_INTENSITY } },
            );
          },
        );
      }
      case 'finish': {
        const selected = FINISHES.find((f) => f.kind === (draft.finish?.kind ?? 'none'))?.id ?? 'none';
        return opts(
          FINISHES.map((f) => ({
            id: f.id,
            name: f.name,
            preview: f.kind === 'none' ? stripKey(draft, 'finish') : { ...draft, finish: { kind: f.kind } },
          })),
          selected,
          'FINISH — STACKS OVER THE EFFECT',
          (id) => {
            const f = FINISHES.find((x) => x.id === id)!;
            patchDraft((d) => (f.kind === 'none' ? stripKey(d, 'finish') : { ...d, finish: { kind: f.kind } }));
          },
        );
      }
      case 'plate': {
        // Every pick — NONE included — patches ONLY `shape`; the nameplate object (title/font/ink)
        // always survives in the document, so a later ink/font pick can never resurrect defaults
        // (the parvati ink-clobbers-font flag, 2026-07-06).
        const selected = draft.nameplate ? (NAMEPLATES.find((p) => p.shape === (draft.nameplate!.shape ?? 'slab'))?.id ?? 'slab') : 'none';
        return opts(
          NAMEPLATES.map((p) => ({
            id: p.id,
            name: p.name,
            preview: { ...draft, nameplate: { ...(draft.nameplate ?? basePlate(title)), shape: p.shape } },
          })),
          selected,
          'NAMEPLATE — SHAPE',
          (id) => {
            const p = NAMEPLATES.find((x) => x.id === id);
            if (!p) return;
            patchDraft((d) => ({ ...d, nameplate: { ...(d.nameplate ?? basePlate(title)), shape: p.shape } }));
          },
        );
      }
      case 'title': {
        const selected = draft.nameplate?.fontId ?? 'clean-sans';
        return opts(
          FONTS.map((f) => ({
            id: f.id,
            name: f.name,
            preview: { ...draft, nameplate: { ...(draft.nameplate ?? basePlate(title)), fontId: f.id } },
          })),
          selected,
          'TITLE STYLING — FONT + INK',
          (id) => patchDraft((d) => ({ ...d, nameplate: { ...(d.nameplate ?? basePlate(title)), fontId: id } })),
        );
      }
    }
  }, [draft, section, title, patchDraft]);

  // ── lifecycle (P9 skeleton · P10 draft-safe error · not-owned) ────────────────────────────────
  if (shelfLoading) {
    return (
      <Frame onBack={() => router.back()} saveLine={null}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.scr.accent} accessibilityLabel="Loading" />
        </View>
      </Frame>
    );
  }
  if (shelfError || !shelf) {
    return (
      <Frame onBack={() => router.back()} saveLine={null}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>SIGNAL LOST</Text>
          <Text style={styles.errSub}>We couldn't reach your collection. Your draft is saved.</Text>
          <ScreenButton label="Retry" onPress={() => void refetch()} />
        </View>
      </Frame>
    );
  }
  if (!entry) {
    return (
      <Frame onBack={() => router.back()} saveLine={null}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>NOT IN YOUR COLLECTION</Text>
          <Text style={styles.errSub}>Add the game first — cards are designed for games on your shelf.</Text>
        </View>
      </Frame>
    );
  }

  // ── kept (P7 KeepBeat) ────────────────────────────────────────────────────────────────────────
  if (mode === 'kept' && draft) {
    return (
      <Frame onBack={() => router.replace(`/game/${gameId}`)} closeGlyph="✕" saveLine={null}>
        <KeepBeat
          title={title}
          composition={draft}
          cardsDesigned={me?.stats.cardsDesigned ?? null}
          onDone={() => router.replace(`/game/${gameId}`)}
        />
      </Frame>
    );
  }

  // ── pick (P1 BaseRail) ────────────────────────────────────────────────────────────────────────
  if (mode === 'pick') {
    const fore = railEntries[Math.min(foreIndex, railEntries.length - 1)];
    return (
      <Frame onBack={quietExit} saveLine={null}>
        <Text style={styles.contextLine}>
          {title.toUpperCase()} · NEW CARD — <Text style={styles.contextBold}>PICK A START</Text>
        </Text>
        <Text style={styles.secHead}>START FROM — BASES &amp; YOUR PRESETS</Text>
        <BaseRail
          entries={railEntries}
          foreIndex={Math.min(foreIndex, railEntries.length - 1)}
          onFocus={setForeIndex}
          title="Templates are single faces · kits arrive wearing a frame + effect bundle · your saved presets ride alongside"
        />
        {inlineError ? <Text style={styles.inlineErr}>{inlineError}</Text> : null}
        <View style={styles.pickCtas}>
          <ScreenButton
            label="Surprise me — deal a start"
            variant="secondary"
            onPress={() => {
              setSurprise(surpriseDeal(title));
              setForeIndex(0);
            }}
          />
          <ScreenButton
            label={busyStart ? '…' : 'Start with this'}
            variant="add"
            disabled={busyStart}
            onPress={() => fore && void startWith(fore.composition)}
          />
          <Text style={styles.adoptHint}>Looking for community faces? Adopting arrives with the gallery.</Text>
        </View>
      </Frame>
    );
  }

  // ── edit (P2–P5b: the carousel surface) ───────────────────────────────────────────────────────
  if (!draft) {
    // A dead resume link (?cardId= for a deleted card / someone else's id / an unreadable
    // composition) gets an honest state, not an eternal spinner.
    if (resumeFailed) {
      return (
        <Frame onBack={() => router.back()} saveLine={null}>
          <View style={styles.center}>
            <Text style={styles.errTitle}>CARD NOT FOUND</Text>
            <Text style={styles.errSub}>This card isn't on your shelf anymore — it may have been deleted. Head back and pick another.</Text>
          </View>
        </Frame>
      );
    }
    return (
      <Frame onBack={quietExit} saveLine={null}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.scr.accent} accessibilityLabel="Loading the draft" />
        </View>
      </Frame>
    );
  }

  const saveLine =
    saveState === 'saving'
      ? `EDITING «${cardRow?.name ?? title}» · SAVING…`
      : saveState === 'error'
        ? `EDITING «${cardRow?.name ?? title}» · NOT SAVED — RETRYING`
        : `EDITING «${cardRow?.name ?? title}» · SAVED${savedAt ? ` ${Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s AGO` : ''}`;

  return (
    <Frame onBack={quietExit} saveLine={saveLine} onOverflow={() => setOverflowOpen(true)}>
      <Text style={styles.contextLine}>
        {title.toUpperCase()} · <Text style={styles.contextBold}>LIVE</Text> — EVERY PICK REDRAWS THE CARD
      </Text>

      <View style={styles.heroWrap}>
        <CardFace title={title} composition={draft} width={189} height={264} />
      </View>

      <SectionChips value={section} onChange={setSection} />
      <View style={styles.dotsRow} accessibilityRole="tablist">
        {STYLER_SECTIONS.map((s) => (
          <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={s.label} onPress={() => setSection(s.id)}>
            <View style={[styles.dot, s.id === section && styles.dotOn]} />
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.sectionBody} keyboardShouldPersistTaps="handled">
        {sectionUi ? (
          <AttributeSection
            heading={sectionUi.heading}
            options={sectionUi.list}
            selectedId={sectionUi.selectedId}
            onSelect={sectionUi.onSelect}
            // the renderer drops the plate below 96px (F-06) — PLATE/TITLE tiles must draw at cell
            // size or every option previews identically (murr F6)
            previewW={section === 'plate' || section === 'title' ? 96 : 64}
            previewH={section === 'plate' || section === 'title' ? 134 : 89}
          >
            {section === 'effect' && draft.effect && draft.effect.kind !== 'none' ? (
              <IntensitySlider
                value={draft.effect.intensity}
                onChange={(v) => patchDraft((d) => (d.effect ? { ...d, effect: { ...d.effect, intensity: v } } : d))}
              />
            ) : null}
            {section === 'effect' ? (
              <Text style={styles.railHint}>Picking another effect swaps it — the slot holds one.</Text>
            ) : null}
            {section === 'title' ? (
              <View style={styles.inkRow}>
                {INKS.map((ink) => {
                  const sel = draft.nameplate?.ink === ink.color;
                  return (
                    <Pressable
                      key={ink.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${ink.name} ink`}
                      accessibilityState={{ selected: sel }}
                      onPress={() => patchDraft((d) => ({ ...d, nameplate: { ...(d.nameplate ?? basePlate(title)), ink: ink.color } }))}
                      style={[styles.inkSwatch, { backgroundColor: ink.color }, sel && styles.inkSel]}
                    />
                  );
                })}
              </View>
            ) : null}
          </AttributeSection>
        ) : null}
        {inlineError ? <Text style={styles.inlineErr}>{inlineError}</Text> : null}
      </ScrollView>

      {/* the pinned outcome bar (OQ-108 labels) */}
      <View style={styles.tools}>
        <Pressable accessibilityRole="button" onPress={() => void savePrivateQuiet()} hitSlop={8}>
          <Text style={styles.savePrivate}>SAVE PRIVATE</Text>
        </Pressable>
        <View style={styles.spacer} />
        <ScreenButton label={busyKeep ? '…' : 'Keep — equip it'} variant="add" disabled={busyKeep} onPress={() => void keep()} />
      </View>

      {/* the C4 overflow: SAVE AS NEW · SAVE STYLE AS PRESET · DISCARD (CARD-24a/b · OQ-108) */}
      <PulledSheet visible={overflowOpen} onClose={() => setOverflowOpen(false)} title="This draft">
        <ScreenButton label="Save as new card" variant="secondary" onPress={() => void saveAsNew()} block />
        <ScreenButton label="Save style as preset" variant="secondary" onPress={() => void saveStyleAsPreset()} block />
        <ScreenButton
          label={createdHere ? 'Discard draft' : 'Discard changes'}
          variant="destructive"
          onPress={() => {
            setOverflowOpen(false);
            setConfirmDiscard(true);
          }}
          block
        />
      </PulledSheet>
      <ConfirmSheet
        visible={confirmDiscard}
        title={createdHere ? 'Discard this draft?' : 'Discard your changes?'}
        message={
          createdHere
            ? 'The draft is deleted — the card you started from is not affected.'
            : `«${cardRow?.name ?? title}» goes back to how it was when you opened it.`
        }
        confirmLabel="Discard"
        onConfirm={() => void discardDraft()}
        onClose={() => setConfirmDiscard(false)}
      />
    </Frame>
  );
}

function basePlate(title: string) {
  return { shape: 'slab' as const, fontId: 'clean-sans', title: title.toUpperCase(), plate: '#141026', ink: '#f3ecd9', size: 0.05 };
}

function stripKey(d: CardComposition, key: 'frame' | 'effect' | 'finish'): CardComposition {
  const next = { ...d };
  delete next[key];
  return next;
}

function errMsg(e: unknown, fallback: string): string {
  const err = (e as { data?: { error?: { message?: string; details?: { message?: string }[] } } })?.data?.error;
  return err?.details?.[0]?.message ?? err?.message ?? fallback;
}

// ── the flow frame: ◂/✕ · STYLER · the CARD-24a save-state line + ⋯ ───────────────────────────────
function Frame({
  children,
  onBack,
  saveLine,
  onOverflow,
  closeGlyph = '◂',
}: {
  children: ReactNode;
  onBack: () => void;
  saveLine: string | null;
  onOverflow?: () => void;
  closeGlyph?: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8}>
          <Text style={styles.backKey}>{closeGlyph}</Text>
        </Pressable>
        <Text style={styles.title}>STYLER</Text>
        <View style={styles.spacer} />
        {onOverflow ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Draft options" onPress={onOverflow} hitSlop={8}>
            <Text style={styles.ovf}>⋯</Text>
          </Pressable>
        ) : null}
      </View>
      {saveLine ? <Text style={styles.saveLine}>{saveLine}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.scr.bg, paddingHorizontal: theme.space.lg, gap: theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingTop: theme.space.lg },
  backKey: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, paddingHorizontal: theme.space.sm },
  title: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.ink, letterSpacing: 1.5 },
  ovf: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.dim, marginTop: -6 },
  saveLine: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  contextLine: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1, textAlign: 'center' },
  contextBold: { color: theme.scr.accent, fontFamily: theme.font.screenBold },
  secHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  heroWrap: { alignItems: 'center', paddingVertical: theme.space.sm },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.space.md },
  dot: { width: 6, height: 6, backgroundColor: theme.scr.panelHi },
  dotOn: { backgroundColor: theme.scr.accent },
  sectionBody: { gap: theme.space.md, paddingBottom: theme.space.lg },
  railHint: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, lineHeight: 15 },
  inkRow: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center', paddingVertical: theme.space.sm },
  inkSwatch: { width: 26, height: 26, borderWidth: 1, borderColor: theme.scr.hairline },
  inkSel: { borderWidth: 2, borderColor: theme.scr.accent },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
  },
  savePrivate: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  spacer: { flex: 1 },
  pickCtas: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.md },
  adoptHint: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, textAlign: 'center' },
  inlineErr: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.md, padding: theme.space.xl },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1.5 },
  errSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, textAlign: 'center', lineHeight: 16 },
});
