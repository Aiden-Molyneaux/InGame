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
// carousel (five closed attributes redrawing the skia hero) → the TWO-DOOR exit model (owner
// gate-5 D.23/24/26): ✕ = leave WITHOUT keeping (confirm-discard; a session-created row deletes, a
// resumed card REVERTS to its open-snapshot) · SAVE ▸ = one sheet with every keep-outcome (KEEP —
// EQUIP IT · SAVE PRIVATE · KEEP AS DRAFT · SAVE AS NEW · SAVE STYLE AS PRESET), each with its
// consequence named. The ⋯ overflow is gone. Autosave still runs underneath (crash-safety, CARD-24a)
// — the snapshot is what makes "without keeping" true. M4 = the 0063 FREE roster; premium surfaces
// are EXPECTED(M5). Route: /styler/:gameId (+?cardId= resume from the switcher / My Designs).

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
  const [saveOpen, setSaveOpen] = useState(false); // the SAVE ▸ outcome sheet (door 2)
  const [confirmDiscard, setConfirmDiscard] = useState(false); // the ✕ leave-without-keeping gate (door 1)
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

  // the "SAVED Ns AGO" clock ticks on its own — it only advanced on incidental re-renders (D.20)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mode !== 'edit' || saveState !== 'saved' || savedAt == null) return;
    const iv = setInterval(() => setTick((t) => (t + 1) % 3600), 1000);
    return () => clearInterval(iv);
  }, [mode, saveState, savedAt]);

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
    setSaveOpen(false);
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
    setSaveOpen(false);
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

  // ── door 1: ✕ — leave WITHOUT keeping (gate-5 D.23/24) ────────────────────────────────────────
  function requestExit() {
    if (mode !== 'edit' || !cardRow) {
      router.back();
      return;
    }
    // A never-edited, never-kept draft created HERE evaporates silently (no orphan rows) —
    // state-walk 6 — unless the user explicitly asked for the row (SAVE AS NEW, murr F3).
    if (createdHere && !explicitSave && userEdits === 0 && cardRow.status === 'draft') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void deleteCard(cardRow.id);
      router.back();
      return;
    }
    if (userEdits === 0) {
      router.back(); // nothing changed this session — nothing to ask about
      return;
    }
    setConfirmDiscard(true); // changes exist — ✕ must never lose work on one tap
  }

  // SAVE ▸ → KEEP AS DRAFT: leave with the edits kept ON the draft row (the CARD-24a promise) —
  // flush any pending debounced save first (murr F2) and go.
  function keepAsDraftExit() {
    setSaveOpen(false);
    if (timerRef.current) {
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
    setSaveOpen(false);
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
    setSaveOpen(false);
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
      <Frame onBack={() => router.back()} saveLine={null}>
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
          {/* START above SURPRISE — the forward action leads (gate-5 D.18) */}
          <ScreenButton
            label={busyStart ? '…' : 'Start with this'}
            variant="add"
            disabled={busyStart}
            onPress={() => fore && void startWith(fore.composition)}
          />
          <ScreenButton
            label="Surprise me — deal a start"
            variant="secondary"
            onPress={() => {
              setSurprise(surpriseDeal(title));
              setForeIndex(0);
            }}
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
      <Frame onBack={requestExit} saveLine={null}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.scr.accent} accessibilityLabel="Loading the draft" />
        </View>
      </Frame>
    );
  }

  // ONE header line — game · mode · save-state (gate-5 D.20; the LIVE context line is gone)
  const saveLine =
    saveState === 'saving'
      ? `${title.toUpperCase()} — EDITING · SAVING…`
      : saveState === 'error'
        ? `${title.toUpperCase()} — EDITING · NOT SAVED — RETRYING`
        : `${title.toUpperCase()} — EDITING · SAVED${savedAt ? ` ${Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s AGO` : ''}`;

  return (
    <Frame onBack={requestExit} closeGlyph="✕" saveLine={saveLine}>
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
            // PLATE previews the plate itself, TITLE previews the title in the font (gate-5 D.21)
            previewKind={section === 'plate' ? 'plate' : section === 'title' ? 'font' : 'card'}
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

      {/* the pinned tools bar (gate-5 D.20/D.23): the Canvas door + the ONE forward door */}
      <View style={styles.tools}>
        <ScreenButton
          label="⤢ Canvas"
          variant="primary"
          stepped
          disabled // the deep editor arrives at §3.4 — present-but-disabled, the drawn posture
          style={styles.toolBtn}
        />
        <View style={styles.spacer} />
        <ScreenButton label={busyKeep ? '…' : 'Save ▸'} variant="add" disabled={busyKeep} onPress={() => setSaveOpen(true)} />
      </View>

      {/* door 2 — every keep-outcome in one sheet, consequences named (OQ-108 labels) */}
      <PulledSheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Keep this design?">
        <SaveOption
          label="Keep — equip it ◆"
          sub="Your shelf wears it now."
          gold
          onPress={() => void keep()}
        />
        <SaveOption
          label="Save private"
          sub="Kept on your shelf — not worn."
          onPress={() => void savePrivateQuiet()}
        />
        {cardRow?.status === 'draft' ? (
          <SaveOption
            label="Keep as draft"
            sub="Finish it later — it waits in the game's card switcher."
            onPress={keepAsDraftExit}
          />
        ) : null}
        <SaveOption
          label="Save as new card"
          sub="The card you opened stays as it is — this becomes a copy."
          onPress={() => void saveAsNew()}
        />
        <SaveOption
          label="Save style as preset"
          sub="Remember this recipe — it rides the start rail for any game."
          onPress={() => void saveStyleAsPreset()}
        />
      </PulledSheet>

      {/* door 1's gate — ✕ with unsaved-session changes */}
      <ConfirmSheet
        visible={confirmDiscard}
        title="Leave without keeping?"
        message={
          createdHere
            ? 'Your edits from this session are discarded — the draft is deleted.'
            : `Your edits from this session are discarded — «${cardRow?.name ?? title}» stays as it was when you opened it.`
        }
        confirmLabel="Discard edits"
        onConfirm={() => void discardDraft()}
        onClose={() => setConfirmDiscard(false)}
      />
    </Frame>
  );
}

// A SAVE-sheet row: the action + its consequence in one tile (the two-door model's legibility).
function SaveOption({ label, sub, gold = false, onPress }: { label: string; sub: string; gold?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[saveOptStyles.row, gold && saveOptStyles.rowGold]}
    >
      <Text style={[saveOptStyles.label, gold && saveOptStyles.labelGold]}>{label.toUpperCase()}</Text>
      <Text style={[saveOptStyles.sub, gold && saveOptStyles.subGold]}>{sub}</Text>
    </Pressable>
  );
}

const saveOptStyles = StyleSheet.create({
  row: {
    gap: 2,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panelHi,
  },
  rowGold: { backgroundColor: theme.brand.gold, borderColor: theme.brand.gold },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink, letterSpacing: 1 },
  labelGold: { color: theme.brand.goldInk },
  sub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, lineHeight: 15 },
  subGold: { color: theme.brand.goldInk, opacity: 0.85 },
});

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

// ── the flow frame: ◂/✕ · STYLER · the CARD-24a save-state line (the ⋯ overflow died with the
// two-door exit model — its actions live in ✕ and SAVE ▸ now; gate-5 D.24) ───────────────────────
function Frame({
  children,
  onBack,
  saveLine,
  closeGlyph = '◂',
}: {
  children: ReactNode;
  onBack: () => void;
  saveLine: string | null;
  closeGlyph?: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeGlyph === '✕' ? 'Leave without keeping' : 'Back'}
          onPress={onBack}
          hitSlop={8}
        >
          <Text style={styles.backKey}>{closeGlyph}</Text>
        </Pressable>
        <Text style={styles.title}>STYLER</Text>
        <View style={styles.spacer} />
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
  toolBtn: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.lg },
  spacer: { flex: 1 },
  pickCtas: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.md },
  adoptHint: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, textAlign: 'center' },
  inlineErr: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.md, padding: theme.space.xl },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1.5 },
  errSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, textAlign: 'center', lineHeight: 16 },
});
