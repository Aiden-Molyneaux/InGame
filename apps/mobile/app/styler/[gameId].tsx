import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CardDesignView, StylePresetStyle } from '@ingame/shared';
import { CardFace, parseComposition } from '../../src/components/CardFace';
import { CanvasSurface } from '../../src/components/canvas/CanvasSurface';
import { useBreakout } from '../../src/components/BreakoutContext';
import { SaveOption } from '../../src/components/styler/SaveOption';
import { BaseRail, type RailEntry } from '../../src/components/styler/BaseRail';
import { SectionChips, STYLER_SECTIONS, type StylerSection } from '../../src/components/styler/SectionChips';
import { AttributeSection, type AttributeOption } from '../../src/components/styler/AttributeSection';
import { IntensitySlider } from '../../src/components/styler/IntensitySlider';
import { ScrollLockContext, useScrollLockHost } from '../../src/components/ScrollLock';
import { KeepBeat } from '../../src/components/styler/KeepBeat';
import { ScreenButton } from '../../src/components/ScreenButton';
import { PulledSheet } from '../../src/components/PulledSheet';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { CurrencyCounter } from '../../src/components/commerce/CurrencyCounter';
import { PixelsMark } from '../../src/components/commerce/PixelsMark';
import { ReconcileSheet } from '../../src/components/commerce/ReconcileSheet';
import { PrintRitual } from '../../src/components/canvas/PrintRitual';
import type { TileBadge } from '../../src/components/styler/AttributeSection';
import type { PublishChecklist } from '../../src/components/canvas/PressSheet';
import { premiumStatusOf } from '../../src/styler/premium';
import { themedStyles, useTheme } from '../../src/theme';
import { useAnnounceOnChange } from '../../src/a11y/announce';
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
  useGetCosmeticsQuery,
  useGetWalletQuery,
  useAcquireCosmeticBatchMutation,
  usePublishCardMutation,
} from '../../src/store/api';
import { useLazyGetShareImageQuery } from '../../src/store/communityApi';
import { presentShareImage } from '../../src/store/shareCard';

// The Styler (§3.2 · design-spec §2.5 · decision 0014 stage 2) — the in-frame card editor over the
// CARD-24a draft document (decision 0066): pick a start (BaseRail, CARD-16 never-blank) → the live
// carousel (five closed attributes redrawing the skia hero) → the TWO-DOOR exit model (owner
// gate-5 D.23/24/26): ✕ = leave WITHOUT keeping (confirm-discard; a session-created row deletes, a
// resumed card REVERTS to its open-snapshot) · SAVE ▸ = one sheet with every keep-outcome (KEEP —
// EQUIP IT · SAVE PRIVATE · KEEP AS DRAFT · SAVE AS NEW · SAVE STYLE AS PRESET), each with its
// consequence named. The ⋯ overflow is gone. Autosave still runs underneath (crash-safety, CARD-24a)
// — the snapshot is what makes "without keeping" true. M4 = the 0063 FREE roster; premium surfaces
// are EXPECTED(M5). Route: /styler/:gameId (+?cardId= resume from the switcher / My Designs).

type Mode = 'pick' | 'edit' | 'kept' | 'published';
type Posture = 'styler' | 'canvas'; // ONE session, two postures (CARD-24a/0066 §6 — same row, same exits)
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
    // kind+color so a preset derived from THIN GOLD doesn't resolve to THIN LINE (decision 0068).
    const f = FRAMES.find((x) => x.kind === d.frame!.kind && x.color === d.frame!.color) ?? FRAMES.find((x) => x.kind === d.frame!.kind);
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
  const { setActive: setBreakout } = useBreakout();
  const styles = useStyles();
  const t = useTheme();

  const { data: shelf, isLoading: shelfLoading, isError: shelfError, refetch } = useGetCollectionQuery();
  const { data: presets } = useGetStylePresetsQuery();
  const {
    data: myCards,
    isFetching: cardsFetching,
    isSuccess: cardsSuccess,
  } = useGetMyCardsQuery(undefined, { skip: !cardId });
  const { data: me } = useGetMeQuery();
  // CARD-13 premium (M5 P7): the library gives every roster id its PX price + caller-scoped `owned`;
  // the wallet gives the balance the header counter + the reconcile funded/short branch read.
  const { data: cosmetics } = useGetCosmeticsQuery();
  const { data: wallet } = useGetWalletQuery();

  const [createCard] = useCreateCardMutation();
  const [updateCard] = useUpdateCardMutation();
  const [savePrivateCard] = useSavePrivateCardMutation();
  const [deleteCard] = useDeleteCardMutation();
  const [updateEntry] = useUpdateEntryMutation();
  const [createStylePreset] = useCreateStylePresetMutation();
  const [acquireBatch] = useAcquireCosmeticBatchMutation();
  const [publishCardMut] = usePublishCardMutation();
  const [fetchShareImage] = useLazyGetShareImageQuery();

  const entry = useMemo(() => shelf?.items.find((i) => i.gameId === gameId), [shelf, gameId]);
  const title = entry?.title ?? 'GAME';

  const [mode, setMode] = useState<Mode>(cardId ? 'edit' : 'pick');
  // The Canvas is a POSTURE of this session, not a route — the draft, autosave timer, snapshot and
  // exit flags never unmount across the switch (§3.4 canvas-manifest ARCH; the D.23 lane).
  const [posture, setPosture] = useState<Posture>('styler');
  // CR-20 — did this session ever enter the Canvas? If so, a save from the Styler discloses it also
  // persists the Canvas art (it's ONE document, CARD-24a — any save flushes both postures' edits).
  const [visitedCanvas, setVisitedCanvas] = useState(false);

  // BREAKOUT (§2.5b / 0014 stage-3 · CR-01 zoom): the canvas posture asks the DeviceShell to zoom the
  // screen to full-bleed. Boolean-only — the session stays entirely in this route.
  useEffect(() => {
    setBreakout(posture === 'canvas');
    if (posture === 'canvas') setVisitedCanvas(true);
    return () => setBreakout(false); // restore the shell if this route unmounts mid-breakout
  }, [posture, setBreakout]);
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
  // CARD-16 live-region (0044 §105): an inline error the user can't see arrive is spoken on appear
  // (assertive Text handles TalkBack; this is the VoiceOver + explicit-transition half).
  useAnnounceOnChange(inlineError);
  const [saveOpen, setSaveOpen] = useState(false); // the SAVE ▸ outcome sheet (door 2)
  const [confirmDiscard, setConfirmDiscard] = useState(false); // the ✕ leave-without-keeping gate (door 1)
  const [busyKeep, setBusyKeep] = useState(false);
  // one in-flight guard across the exit writes — a double-tap on DISCARD/SAVE PRIVATE/KEEP AS
  // DRAFT ran the write twice and popped the router twice (murr round-2)
  const [busyExit, setBusyExit] = useState(false);

  // ── CARD-13 premium reconcile (M5 P7) ────────────────────────────────────────────────────────
  const balance = wallet?.balance ?? 0;
  // the premium components in the live draft (owned + unowned) + the running cost-stack (unowned PX).
  const premium = useMemo(() => premiumStatusOf(draft, cosmetics?.items), [draft, cosmetics]);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [pxSpent, setPxSpent] = useState(0); // rode a KEEP → the KeepBeat PX-spent line
  // which commit to run once the components are acquired (KEEP equips · SAVE PRIVATE files · PUBLISH ships).
  const pendingCommitRef = useRef<null | 'keep' | 'savePrivate' | 'publish'>(null);
  const [busyPublish, setBusyPublish] = useState(false);
  // the FLATTENED render the publish response returns (0066 §1) — the PrintRitual "print emerges" beat
  // slides this real image up; null (e.g. web dev, flatten still pending) falls back to the live CardFace.
  const [publishedImageUrl, setPublishedImageUrl] = useState<string | null>(null);
  const [dupFailed, setDupFailed] = useState(false); // a DUPLICATE_COMPOSITION 409 flips the checklist
  // per-roster-id premium badge lookup (price + owned) — only PREMIUM ids get an entry.
  const badgeFor = useCallback(
    (ids: string[]): Record<string, TileBadge> => {
      const out: Record<string, TileBadge> = {};
      for (const id of ids) {
        const item = cosmetics?.items.find((i) => i.id === id);
        if (item && item.tier) out[id] = { owned: item.owned, price: item.price };
      }
      return out;
    },
    [cosmetics],
  );

  // The composition as it was when this session OPENED the card (resumed DRAFT rows only). Editing a
  // draft autosaves in-place, so "discard" on a resumed draft PATCHes this back (owner D.23). A
  // resumed PRIVATE card is copy-on-write (below) — the original is never mutated, so this snapshot
  // is unused on that path; discard simply deletes the throwaway copy.
  const resumeSnapshotRef = useRef<CardComposition | null>(null);

  // COPY-ON-WRITE (CARD-24a · decision 0067 · CR-21). Editing a COMMITTED (private) card must never
  // PATCH it in place: the first edit spins a draft COPY (`derivedFromCardId → origin`) and the copy
  // becomes the autosave target. `originRef` is the commit-back target so KEEP / SAVE-PRIVATE land on
  // the original (stable id + equip pointer); `copyingRef` guards the one-shot copy POST. A crash
  // leaves the copy as a resumable DRAFT and the original pristine.
  const originRef = useRef<{ id: string; name: string } | null>(null);
  const copyingRef = useRef(false);
  // the in-flight copy POST — exit/save paths await it before committing so they never race the copy
  // creation (murr M1). Tracked separately from inflightRef (which is the autosave PATCH).
  const copyInflightRef = useRef<Promise<unknown> | null>(null);

  // The session undo/redo stacks (CARD-09) — declared up here so the resume effect can clear them
  // for a fresh document; the pipeline functions live below with patchDraft.
  const pastRef = useRef<CardComposition[]>([]);
  const futureRef = useRef<CardComposition[]>([]);
  const [histVersion, setHistVersion] = useState(0);

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
    resumeSnapshotRef.current = comp; // DISCARD on a resumed DRAFT REVERTS to this (private = copy-on-write)
    // COPY-ON-WRITE resume (0067): a resumed DRAFT that carries `derivedFromCardId` is a crash-recovered
    // copy — edit it in place (it's already a draft), but KEEP merges it home onto the origin + discards
    // the copy. If the origin was since deleted the FK is null (ON DELETE SET NULL) → a plain draft.
    // A resumed PRIVATE card has no origin ref yet; ensureEditableCopy sets it on the first edit.
    originRef.current = row.derivedFromCardId ? { id: row.derivedFromCardId, name: row.name } : null;
    copyingRef.current = false;
    pastRef.current = [];
    futureRef.current = [];
    setHistVersion((v) => v + 1);
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
  // a held slider (the EFFECT intensity) must not scroll the edit body (round-3 scroll-lock rule)
  const { scrollEnabled: editScrollEnabled, api: editScrollLock } = useScrollLockHost();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The retry re-arm lives in flushSave's catch — without an alive guard, a PATCH that fails
  // in-flight across an unmount (or after DISCARD deletes the row) re-arms forever: a 404 loop
  // every RETRY_MS until app restart (murr F4).
  const aliveRef = useRef(true);

  // The in-flight autosave PATCH — exit writes (discard-revert, SAVE-AS-NEW settle) must await it
  // or the server can apply the autosave AFTER the revert and "discarded" edits survive (murr).
  const inflightRef = useRef<Promise<unknown> | null>(null);

  const flushSave = useCallback(async () => {
    const d = draftRef.current;
    const row = cardRef.current;
    if (!d || !row || !aliveRef.current) return;
    // COPY-ON-WRITE guard (CARD-24a/0067): autosave NEVER PATCHes a committed row. A private card is
    // display-only until the first edit spins a draft copy (ensureEditableCopy); until then this
    // no-ops so no autosave can overwrite the original (belt-and-braces alongside patchDraft's route).
    if (row.status !== 'draft') return;
    setSaveState('saving');
    const p = updateCard({ cardId: row.id, composition: d }).unwrap();
    inflightRef.current = p;
    try {
      await p;
      if (!aliveRef.current) return;
      setSaveState('saved');
      setSavedAt(Date.now());
    } catch (e) {
      if (!aliveRef.current) return;
      setSaveState('error'); // "NOT SAVED — RETRYING" (soft-fail; the local draft is intact)
      const status = (e as { status?: number })?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        // a rejected document will never self-heal — surface it instead of a silent 3s 400-loop
        setInlineError(errMsg(e, 'Could not save this change.'));
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushSave(), RETRY_MS);
    } finally {
      if (inflightRef.current === p) inflightRef.current = null;
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

  // the "SAVED Ns AGO" clock re-renders on its own — CR-04: a COARSE ~15s cadence (not 1s), both
  // postures. Display-only — the debounced autosave PATCH is untouched. (The owner found the 1s
  // ticking too busy at the gate-5 walk.)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mode !== 'edit' || saveState !== 'saved' || savedAt == null) return;
    const iv = setInterval(() => setTick((t) => (t + 1) % 3600), 15000);
    return () => clearInterval(iv);
  }, [mode, saveState, savedAt]);

  // ── the session history (CARD-09 undo/redo — ONE bounded stack across BOTH postures: styler
  // picks + canvas ops edit one document, so they share one history; surfaced by the Canvas
  // EditBar). Continuous gestures push ONE entry via beginGesture (+ history:false per move). ────
  const HISTORY_CAP = 60;

  const pushHistory = useCallback((snapshot: CardComposition) => {
    pastRef.current.push(snapshot);
    if (pastRef.current.length > HISTORY_CAP) pastRef.current.shift();
    futureRef.current = [];
    setHistVersion((v) => v + 1);
  }, []);

  // COPY-ON-WRITE (CARD-24a/0067): on the FIRST edit of a committed (private) card, spin a draft copy
  // (`derivedFromCardId → origin`) and retarget the session to it. The copy is created carrying the
  // current draft; later edits autosave the copy. Guarded to run once; if the POST fails the edits
  // stay in memory (the origin is never autosaved) and a later edit retries.
  const ensureEditableCopy = useCallback(async () => {
    const row = cardRef.current;
    if (!row || row.status === 'draft' || copyingRef.current || !gameId) return;
    copyingRef.current = true;
    originRef.current = { id: row.id, name: row.name }; // the commit-back target (set before the await)
    const p = createCard({
      gameId,
      composition: draftRef.current as CardComposition,
      name: row.name,
      derivedFromCardId: row.id,
    }).unwrap();
    // track the in-flight copy POST so an exit/save tapped mid-flight settles it FIRST (murr M1 — else
    // KEEP raced the copy creation, leaked an orphan, and re-pointed the kept session at it).
    copyInflightRef.current = p;
    try {
      const copy = await p;
      const next = { id: copy.id, name: copy.name, status: copy.status };
      cardRef.current = next; // hot ref: any in-flight scheduleSave / awaiting exit now sees the copy
      setCardRow(next);
      setCreatedHere(true); // a session-created copy → ✕ evaporates it, the original untouched
      setExplicitSave(false);
      setSaveState('saved');
      setSavedAt(Date.now());
      scheduleSave(); // flush any edits made while the copy POST was in flight
    } catch (e) {
      setInlineError(errMsg(e, 'Could not open this card for editing — retrying on the next change.'));
    } finally {
      copyingRef.current = false;
      if (copyInflightRef.current === p) copyInflightRef.current = null;
    }
  }, [gameId, createCard, scheduleSave]);

  const patchDraft = useCallback(
    (fn: (d: CardComposition) => CardComposition, opts?: { history?: boolean }) => {
      setInlineError(null);
      const cur = draftRef.current;
      if (!cur) return;
      const next = fn(cur);
      if (next === cur) return;
      if (opts?.history !== false) pushHistory(cur);
      draftRef.current = next; // keep the ref hot for same-tick follow-ups (gesture streams)
      setDraft(next);
      setUserEdits((n) => n + 1);
      // copy-on-write: a committed row spins a draft copy (which then autosaves); a draft row
      // autosaves in place (CARD-24a/0067).
      if (cardRef.current && cardRef.current.status !== 'draft') void ensureEditableCopy();
      else scheduleSave();
    },
    [scheduleSave, pushHistory, ensureEditableCopy],
  );

  /** One history entry for a coming continuous run (a drag / a nudge burst start). */
  const beginGesture = useCallback(() => {
    const cur = draftRef.current;
    if (cur) pushHistory(cur);
  }, [pushHistory]);

  const undo = useCallback(() => {
    const cur = draftRef.current;
    const prev = pastRef.current.pop();
    if (!cur || !prev) return;
    futureRef.current.push(cur);
    draftRef.current = prev;
    setDraft(prev);
    setUserEdits((n) => n + 1); // undone work still counts — ✕ stays conservative (state-walk 4)
    setHistVersion((v) => v + 1);
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const cur = draftRef.current;
    const next = futureRef.current.pop();
    if (!cur || !next) return;
    pastRef.current.push(cur);
    draftRef.current = next;
    setDraft(next);
    setUserEdits((n) => n + 1);
    setHistVersion((v) => v + 1);
    scheduleSave();
  }, [scheduleSave]);

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
      pastRef.current = [];
      futureRef.current = [];
      setHistVersion((v) => v + 1);
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
      // settle any in-flight copy-on-write POST first so cardRef reflects the copy (murr M1)
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      // COPY-ON-WRITE (0067): KEEP commits onto the ORIGIN — editing a copy folds the draft back onto
      // the original (stable id + equip pointer), and the throwaway copy is deleted after. Else (a
      // from-scratch / resumed draft) commitTarget is this row itself. Read the HOT ref, not the stale
      // `cardRow` closure — the copy's row lands via ensureEditableCopy's async continuation (murr M1).
      const curRow = cardRef.current ?? cardRow;
      const commitTarget = originRef.current?.id ?? curRow.id;
      const copyToDiscard = originRef.current && curRow.id !== commitTarget ? curRow.id : null;
      const d = draftRef.current;
      if (d) {
        // flush the draft onto the commit target — keep the save-state line honest either way (a KEEP
        // failure used to leave it stuck on "SAVING…").
        await updateCard({ cardId: commitTarget, composition: d })
          .unwrap()
          .then(() => {
            setSaveState('saved');
            setSavedAt(Date.now());
          })
          .catch((e) => {
            // re-arm the retry — "NOT SAVED — RETRYING" must not lie after a failed exit write (murr)
            setSaveState('error');
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => void flushSave(), RETRY_MS);
            throw e;
          });
      }
      await savePrivateCard(commitTarget).unwrap();
      // the committed card IS private now + becomes the session baseline. Record it before the equip
      // step, or a failed equip leaves local status 'draft' and ✕'s quiet-evaporate branch deletes a
      // KEPT card (murr, gate-5 round 2). Post-KEEP, discard means revert-to-kept, never delete (D.23).
      const keptRow = { id: commitTarget, name: curRow.name, status: 'private' };
      cardRef.current = keptRow;
      setCardRow(keptRow);
      originRef.current = null; // committed home — a later re-edit spins a fresh copy of this card
      resumeSnapshotRef.current = draftRef.current ?? resumeSnapshotRef.current;
      setCreatedHere(false);
      setExplicitSave(true);
      setUserEdits(0);
      // undo must not walk an EQUIPPED card behind its kept state with no door (murr owner-call —
      // conservative default: the KEEP boundary clears the stacks, like resume/START/SAVE-AS-NEW)
      pastRef.current = [];
      futureRef.current = [];
      setHistVersion((v) => v + 1);
      await updateEntry({ entryId: entry.entryId, activeCardDesignId: commitTarget }).unwrap();
      // discard the throwaway copy AFTER the origin is committed + equipped — never before, so a
      // failure above leaves the copy intact and no work is lost.
      if (copyToDiscard) void deleteCard(copyToDiscard);
      setMode('kept');
    } catch (e) {
      setInlineError(errMsg(e, 'Could not equip it. Your draft is safe — try again.'));
    } finally {
      setBusyKeep(false);
    }
  }

  async function savePrivateQuiet() {
    if (!cardRow || busyExit) return;
    setBusyExit(true);
    setSaveOpen(false);
    setInlineError(null);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // settle any in-flight copy-on-write POST first, then read the HOT ref (murr M1)
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      // COPY-ON-WRITE (0067): SAVE PRIVATE commits onto the ORIGIN (like KEEP, minus the equip) and
      // discards the throwaway copy after; else this row itself.
      const curRow = cardRef.current ?? cardRow;
      const commitTarget = originRef.current?.id ?? curRow.id;
      const copyToDiscard = originRef.current && curRow.id !== commitTarget ? curRow.id : null;
      const d = draftRef.current;
      if (d) {
        await updateCard({ cardId: commitTarget, composition: d })
          .unwrap()
          .then(() => {
            setSaveState('saved');
            setSavedAt(Date.now());
          })
          .catch((e) => {
            // re-arm the retry — "NOT SAVED — RETRYING" must not lie after a failed exit write (murr)
            setSaveState('error');
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => void flushSave(), RETRY_MS);
            throw e;
          });
      }
      await savePrivateCard(commitTarget).unwrap();
      const savedRow = { id: commitTarget, name: curRow.name, status: 'private' };
      cardRef.current = savedRow;
      setCardRow(savedRow);
      originRef.current = null;
      resumeSnapshotRef.current = draftRef.current ?? resumeSnapshotRef.current; // saved = the new baseline
      setCreatedHere(false);
      setExplicitSave(true);
      if (copyToDiscard) void deleteCard(copyToDiscard); // the copy's edits now live on the origin
      router.back(); // the quiet exit — it waits in the game's card switcher (no beat)
    } catch (e) {
      setInlineError(errMsg(e, 'Could not save. Your draft is safe — try again.'));
    } finally {
      setBusyExit(false);
    }
  }

  // ── CARD-13 reconcile bridge (M5 P7) — a KEEP / SAVE PRIVATE that carries unowned premium opens the
  // ReconcileSheet FIRST (ACQUIRE ALL), then proceeds. The server gates identically (PREMIUM_UNRECONCILED
  // on save-private); pre-checking here avoids a failed round-trip and drives the funded/short UI. ──
  function requestKeep() {
    if (premium.unowned.length > 0) {
      pendingCommitRef.current = 'keep';
      setSaveOpen(false);
      setReconcileOpen(true);
      return;
    }
    void keep();
  }

  function requestSavePrivate() {
    if (premium.unowned.length > 0) {
      pendingCommitRef.current = 'savePrivate';
      setSaveOpen(false);
      setReconcileOpen(true);
      return;
    }
    void savePrivateQuiet();
  }

  async function onAcquireAll() {
    if (reconcileBusy || premium.unowned.length === 0) return;
    setReconcileBusy(true);
    setInlineError(null);
    const ids = premium.unowned.map((u) => u.cosmeticId);
    try {
      const res = await acquireBatch({ cosmeticIds: ids }).unwrap();
      setReconcileOpen(false);
      const action = pendingCommitRef.current;
      pendingCommitRef.current = null;
      if (action === 'keep') {
        setPxSpent(res.totalPaid); // surfaced on the KeepBeat
        await keep();
      } else if (action === 'savePrivate') {
        await savePrivateQuiet();
      } else if (action === 'publish') {
        await publish();
      }
    } catch (e) {
      setInlineError(errMsg(e, 'Could not acquire the components. Your pixels are unchanged.'));
    } finally {
      setReconcileBusy(false);
    }
  }

  // ── CARD-19 publish (M5 P7 · canvas ◆ PUBLISH) ────────────────────────────────────────────────
  // The min-complexity gate is checkable live (≥3 elements OR ≥2 distinct kinds); dedup is a global
  // server check (surfaced as the checklist's UNIQUE row only if a DUPLICATE_COMPOSITION 409 fires);
  // premium-reconcile reuses the ReconcileSheet (context 'publish'). Any edit clears a stale dedup fail.
  const complexityOk = useMemo(() => {
    const els = draft?.elements ?? [];
    return els.length >= 3 || new Set(els.map((e) => e.type)).size >= 2;
  }, [draft]);
  useEffect(() => {
    setDupFailed(false);
  }, [userEdits]);
  const publishChecklist: PublishChecklist = {
    complexity: complexityOk ? 'ok' : 'fail',
    unique: dupFailed ? 'fail' : 'unknown',
    premium: premium.unowned.length === 0 ? 'ok' : 'debt',
    premiumCost: premium.costStack,
  };

  function requestPublish() {
    if (!cardRow || !complexityOk || busyPublish) return;
    if (premium.unowned.length > 0) {
      pendingCommitRef.current = 'publish';
      setReconcileOpen(true);
      return;
    }
    void publish();
  }

  async function publish() {
    if (!cardRow || busyPublish) return;
    setBusyPublish(true);
    setInlineError(null);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      // COPY-ON-WRITE (0067): publish commits onto the ORIGIN (like KEEP), discarding the throwaway copy.
      const curRow = cardRef.current ?? cardRow;
      const commitTarget = originRef.current?.id ?? curRow.id;
      const copyToDiscard = originRef.current && curRow.id !== commitTarget ? curRow.id : null;
      const d = draftRef.current;
      if (d) await updateCard({ cardId: commitTarget, composition: d }).unwrap(); // flatten reads the saved doc
      const published = await publishCardMut(commitTarget).unwrap();
      setPublishedImageUrl(published.imageUrl); // the PrintRitual "print emerges" beat (null → live fallback)
      const publishedRow = { id: commitTarget, name: curRow.name, status: 'published' };
      cardRef.current = publishedRow;
      setCardRow(publishedRow);
      originRef.current = null;
      resumeSnapshotRef.current = draftRef.current ?? resumeSnapshotRef.current;
      setCreatedHere(false);
      setExplicitSave(true);
      if (copyToDiscard) void deleteCard(copyToDiscard);
      setPosture('styler'); // leave the workshop; the ritual is a full-screen moment
      setMode('published');
    } catch (e) {
      const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
      if (code === 'DUPLICATE_COMPOSITION') {
        setDupFailed(true);
        setInlineError('This exact card already exists — tweak it to make it your own before publishing.');
      } else if (code === 'PREMIUM_UNRECONCILED') {
        pendingCommitRef.current = 'publish';
        setReconcileOpen(true);
      } else if (code === 'MIN_COMPLEXITY') {
        setInlineError('Add a little more — 3 elements or 2 kinds — before publishing.');
      } else {
        setInlineError(errMsg(e, 'Could not publish. Your card is safe — try again.'));
      }
    } finally {
      setBusyPublish(false);
    }
  }

  // CARD-21 share from the PrintRitual (F-2 fix): the just-published card is public, so
  // GET /cards/:id/share-image serves it — hand the branded PNG to the platform share/save path
  // (web opens/saves; native best-effort). Reuses the P8 shareCard util (gallery/game-page share).
  async function sharePublished(shareCardId: string, shareTitle: string): Promise<void> {
    try {
      const blob = await fetchShareImage(shareCardId).unwrap();
      await presentShareImage(blob, shareTitle); // best-effort — an 'unavailable' result just no-ops here
    } catch {
      // a not-yet-flattened / transient failure stays quiet — the celebration must not error out
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
  // the flush is AWAITED so an immediate re-resume can't read the stale cached row and overwrite
  // the newer draft (the murr-F1 pattern at the exit edge).
  async function keepAsDraftExit() {
    if (busyExit) return;
    setBusyExit(true);
    setSaveOpen(false);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // settle the copy-on-write POST so `row` is the COPY, never the committed origin (murr M1 —
      // else KEEP-AS-DRAFT could PATCH the private original mid-copy).
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      const d = draftRef.current;
      const row = cardRef.current;
      // flush whenever the row isn't clean — a prior exit write may have cleared the timer with
      // the flush FAILED (saveState 'error'), and gating on the timer alone dropped those edits
      // despite the row promise (murr)
      if (d && row && saveState !== 'saved') {
        await updateCard({ cardId: row.id, composition: d }).unwrap().catch(() => {}); // soft-fail: leave anyway (CARD-24a tolerance)
      }
    } finally {
      setBusyExit(false);
    }
    router.back();
  }

  async function saveAsNew() {
    if (!draft || !gameId || creatingRef.current) return;
    creatingRef.current = true;
    setSaveOpen(false);
    try {
      // the sheet promises "the card you opened stays as it is" — settle the OLD row before
      // adopting the copy (murr round-2 blocker: the autosave had already written the session
      // edits into a RESUMED original, and the pending timer could still fire against it):
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // an in-flight autosave against the OLD row must land before we settle it (murr — the
      // settle/revert otherwise races the PATCH and the session edits can survive the revert)
      if (inflightRef.current) await inflightRef.current.catch(() => {});
      // and the copy-on-write POST must settle so `oldRow` (the hot ref) is the copy, not the origin,
      // and `editingCopy` is decided from refs not stale closures (murr M1)
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      const settledOld = cardRef.current;
      const editingCopy = !!(originRef.current && settledOld && settledOld.id !== originRef.current.id);
      const oldSnapshot = resumeSnapshotRef.current;
      const row = await createCard({ gameId, composition: draft, name: `${title} II` }).unwrap();
      if (settledOld) {
        if (editingCopy) {
          // a copy-on-write copy folds into the fork — the card you opened (the origin) stays as-is
          void deleteCard(settledOld.id);
        } else if (!createdHere && oldSnapshot) {
          // the resumed original goes back to how it was when opened
          void updateCard({ cardId: settledOld.id, composition: oldSnapshot });
        } else if (createdHere && !explicitSave) {
          // an implicit session draft folds into the copy — don't leave near-identical twins
          void deleteCard(settledOld.id);
        }
      }
      setCardRow({ id: row.id, name: row.name, status: row.status });
      // SAVE AS NEW forks into an INDEPENDENT card (copy-on-write, 0067): clear the origin ref so a
      // later KEEP commits onto THIS fork, not back onto the card the user opened (which stays as-is).
      originRef.current = null;
      // the fork's creation state is the new baseline — ✕-discard on it must REVERT to what the user
      // saved, never delete it (murr blocker: the old snapshot pointed at the OLD row)
      resumeSnapshotRef.current = draft;
      pastRef.current = [];
      futureRef.current = [];
      setHistVersion((v) => v + 1);
      setCreatedHere(true);
      setExplicitSave(true); // the user ASKED for this row — no discard path may delete it (murr F3)
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

  // Discard DELETES only a row that is (a) session-created, (b) never explicitly saved, and
  // (c) still a draft — everything else REVERTS to the open/kept/saved baseline. One predicate,
  // shared with the ConfirmSheet copy (murr blocker: SAVE-AS-NEW copies and KEEP-partial rows
  // reached the delete branch through `createdHere` alone).
  const discardDeletes = createdHere && !explicitSave && cardRow?.status === 'draft';

  async function discardDraft() {
    if (!cardRow || busyExit) return;
    setBusyExit(true);
    try {
      // silence the autosave first — a pending PATCH would either 404-loop against a deleted row
      // (murr F4) or re-write the edits we are about to revert (owner D.23)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // and an ALREADY-DISPATCHED PATCH must land before the revert, or server ordering can put
      // the discarded edits back after it (murr)
      if (inflightRef.current) await inflightRef.current.catch(() => {});
      // settle the copy-on-write POST so the hot ref + the copy decision are correct (murr M1)
      if (copyInflightRef.current) await copyInflightRef.current.catch(() => {});
      const curRow = cardRef.current ?? cardRow;
      // a copy-on-write copy (origin set + a distinct row) IS a session-created draft — deleting it
      // discards it and leaves the committed origin untouched (it was never mutated). No revert.
      const editingCopy = !!(originRef.current && curRow.id !== originRef.current.id);
      if (discardDeletes || editingCopy) {
        // an implicit session draft (or a copy-on-write copy) IS the discard — deleting it discards it
        await deleteCard(curRow.id).unwrap();
      } else {
        // every other row pre-exists this session's claim on it (resumed draft, kept, or explicitly
        // saved-as-new); discard = revert to the baseline snapshot. NEVER delete (D.23).
        const snap = resumeSnapshotRef.current;
        if (snap) await updateCard({ cardId: curRow.id, composition: snap }).unwrap();
      }
      setConfirmDiscard(false);
      router.back();
    } catch (e) {
      setConfirmDiscard(false);
      setInlineError(errMsg(e, 'Could not discard.'));
    } finally {
      setBusyExit(false);
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
        // Match kind AND color — several frames share a kind (THIN LINE/GOLD/LIME/BUBBLEGUM are all
        // `thin-line`), so kind alone would highlight the wrong tile (decision 0068).
        const selected =
          FRAMES.find((f) => (f.kind ?? null) === (draft.frame?.kind ?? null) && f.color === (draft.frame?.color ?? ''))?.id ?? 'clean';
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
          <ActivityIndicator color={t.scr.accent} accessibilityLabel="Loading" />
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
          pxSpent={pxSpent}
          onDone={() => router.replace(`/game/${gameId}`)}
          onEditArt={() => {
            // the Canvas door goes live (§3.4): back onto the SAME document, canvas posture
            setMode('edit');
            setPosture('canvas');
          }}
        />
      </Frame>
    );
  }

  // ── published (P8 PrintRitual — the Canvas publish celebration) ───────────────────────────────
  if (mode === 'published' && draft) {
    return (
      <Frame onBack={() => router.replace(`/game/${gameId}`)} closeGlyph="✕" saveLine={null}>
        <PrintRitual
          title={title}
          composition={draft}
          imageUrl={publishedImageUrl}
          cardsDesigned={me?.stats.cardsDesigned ?? null}
          onDone={() => router.replace(`/game/${gameId}`)}
          onShare={cardRow ? () => void sharePublished(cardRow.id, title) : undefined}
        />
      </Frame>
    );
  }

  // ── pick (P1 BaseRail) ────────────────────────────────────────────────────────────────────────
  if (mode === 'pick') {
    const fore = railEntries[Math.min(foreIndex, railEntries.length - 1)];
    return (
      <Frame
        onBack={() => router.back()}
        saveLine={null}
        headRight={<CurrencyCounter balance={balance} onPress={() => router.push('/store')} />}
      >
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
        {inlineError ? <Text accessibilityLiveRegion="assertive" style={styles.inlineErr}>{inlineError}</Text> : null}
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
          <ActivityIndicator color={t.scr.accent} accessibilityLabel="Loading the draft" />
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

  // ── the CANVAS posture (§3.4 — the same session wearing the workshop; board P1–P7) ────────────
  // The DeviceShell hides its chrome while this is active (BreakoutContext), so CanvasSurface —
  // rendered in the normal screen slot, where skia paints correctly — fills the whole device.
  if (posture === 'canvas' && draft) {
    const canvasStatus = (cardRow?.status ?? 'draft').toUpperCase();
    const canvasSub =
      saveState === 'saving'
        ? `${title.toUpperCase()} · ${canvasStatus} · SAVING…`
        : saveState === 'error'
          ? `${title.toUpperCase()} · ${canvasStatus} · NOT SAVED — RETRYING`
          : `${title.toUpperCase()} · ${canvasStatus} · AUTOSAVED${savedAt ? ` ${Math.max(0, Math.round((Date.now() - savedAt) / 1000))}S AGO` : ''}`;
    return (
      <CanvasSurface
        title={title}
        composition={draft}
        subLine={canvasSub}
        inlineError={inlineError}
        patchDraft={patchDraft}
        beginGesture={beginGesture}
        canUndo={histVersion >= 0 && pastRef.current.length > 0}
        canRedo={histVersion >= 0 && futureRef.current.length > 0}
        onUndo={undo}
        onRedo={redo}
        busyExit={busyExit || busyKeep}
        onBackToStyler={() => setPosture('styler')}
        onSavePrivate={() => void requestSavePrivate()}
        publish={{
          checklist: publishChecklist,
          onPublish: requestPublish,
          busy: busyPublish,
          reconcile: {
            open: reconcileOpen,
            items: premium.unowned.map((u) => ({ cosmeticId: u.cosmeticId, name: u.name, price: u.price })),
            total: premium.costStack,
            balance,
            busy: reconcileBusy || busyPublish,
            onAcquireAll: () => void onAcquireAll(),
            onClose: () => {
              setReconcileOpen(false);
              pendingCommitRef.current = null;
            },
            onTopUp: () => router.push('/store'),
          },
        }}
      />
    );
  }

  return (
    <Frame
      onBack={requestExit}
      closeGlyph="✕"
      saveLine={saveLine}
      headRight={<CurrencyCounter balance={balance} onPress={() => router.push('/store')} />}
    >
      <View style={styles.heroWrap}>
        <CardFace title={title} composition={draft} width={189} height={264} animate />
      </View>

      <SectionChips value={section} onChange={setSection} />
      <View style={styles.dotsRow} accessibilityRole="tablist">
        {STYLER_SECTIONS.map((s) => (
          <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={s.label} accessibilityState={{ selected: s.id === section }} onPress={() => setSection(s.id)}>
            <View style={[styles.dot, s.id === section && styles.dotOn]} />
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.sectionBody} keyboardShouldPersistTaps="handled" scrollEnabled={editScrollEnabled}>
        {sectionUi ? (
          <AttributeSection
            heading={sectionUi.heading}
            options={sectionUi.list}
            selectedId={sectionUi.selectedId}
            onSelect={sectionUi.onSelect}
            // PLATE previews the plate itself, TITLE previews the title in the font (gate-5 D.21)
            previewKind={section === 'plate' ? 'plate' : section === 'title' ? 'font' : 'card'}
            badges={badgeFor(sectionUi.list.map((o) => o.id))}
          >
            {section === 'effect' && draft.effect && draft.effect.kind !== 'none' ? (
              <ScrollLockContext.Provider value={editScrollLock}>
                <IntensitySlider
                  value={draft.effect.intensity}
                  onChange={(v) => patchDraft((d) => (d.effect ? { ...d, effect: { ...d.effect, intensity: v } } : d))}
                />
              </ScrollLockContext.Provider>
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
        {inlineError ? <Text accessibilityLiveRegion="assertive" style={styles.inlineErr}>{inlineError}</Text> : null}
      </ScrollView>

      {/* CARD-13 cost-stack (M5 P7) — the running PX to keep the premium in the current design; owned
          premium reads clean (no debt). Absent when the card is all-free. */}
      {premium.costStack > 0 ? (
        <View style={styles.costStack}>
          <Text style={styles.costLabel}>PREMIUM IN THIS CARD</Text>
          <View style={styles.spacer} />
          <Text style={styles.costValue}>{premium.costStack}</Text>
          <PixelsMark size={11} />
          <Text style={styles.costTail}>TO KEEP</Text>
        </View>
      ) : premium.refs.length > 0 ? (
        <View style={styles.costStack}>
          <Text style={styles.costOwned}>✓ PREMIUM COMPONENTS OWNED</Text>
        </View>
      ) : null}

      {/* the pinned tools bar (gate-5 D.20/D.23): the Canvas door + the ONE forward door */}
      <View style={styles.tools}>
        <ScreenButton
          label="⤢ Canvas"
          variant="primary"
          stepped
          onPress={() => setPosture('canvas')} // §3.4 LIVE — the posture switch, same session/row
          style={styles.toolBtn}
        />
        <View style={styles.spacer} />
        <ScreenButton label={busyKeep ? '…' : 'Save ▸'} variant="add" disabled={busyKeep} onPress={() => setSaveOpen(true)} />
      </View>

      {/* door 2 — every keep-outcome in one sheet, consequences named (OQ-108 labels) */}
      <PulledSheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Keep this design?">
        {/* CR-20 — one document: disclose that a save also persists the Canvas art */}
        {visitedCanvas ? (
          <Text style={styles.crossPostureNote}>Saving keeps the whole card — your Canvas art too.</Text>
        ) : null}
        <SaveOption
          label="Keep — equip it ◆"
          sub={premium.costStack > 0 ? `Your shelf wears it now — acquires ${premium.costStack} PX of premium first.` : 'Your shelf wears it now.'}
          gold
          onPress={requestKeep}
        />
        <SaveOption
          label="Save private"
          sub={premium.costStack > 0 ? `Kept on your shelf — acquires ${premium.costStack} PX of premium first.` : 'Kept on your shelf — not worn.'}
          onPress={requestSavePrivate}
        />
        {cardRow?.status === 'draft' ? (
          <SaveOption
            label="Keep as draft"
            sub="Finish it later — it waits in the game's card switcher."
            onPress={() => void keepAsDraftExit()}
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
          discardDeletes
            ? 'Your edits from this session are discarded — the draft is deleted.'
            : `Your edits from this session are discarded — «${cardRow?.name ?? title}» keeps its last saved state.`
        }
        confirmLabel="Discard edits"
        busy={busyExit}
        onConfirm={() => void discardDraft()}
        onClose={() => setConfirmDiscard(false)}
      />

      {/* CARD-13 ACQUIRE ALL — KEEP / SAVE PRIVATE with unowned premium reconciles here (P6 ReconcileSheet) */}
      <ReconcileSheet
        visible={reconcileOpen}
        onClose={() => {
          setReconcileOpen(false);
          pendingCommitRef.current = null;
        }}
        items={premium.unowned.map((u) => ({ cosmeticId: u.cosmeticId, name: u.name, price: u.price }))}
        total={premium.costStack}
        balance={balance}
        busy={reconcileBusy || busyKeep}
        context="keep"
        onAcquireAll={() => void onAcquireAll()}
        onTopUp={() => router.push('/store')}
      />

    </Frame>
  );
}

// (SaveOption moved to src/components/styler/SaveOption.tsx — shared with the Canvas PressSheet
// so the outcome grammar can't drift between postures.)

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
  headRight,
}: {
  children: ReactNode;
  onBack: () => void;
  saveLine: string | null;
  closeGlyph?: string;
  /** the trailing head slot — the PX CurrencyCounter (ECON-07's entry point, M5 P7). */
  headRight?: ReactNode;
}) {
  const styles = useStyles();
  // CARD-16 live-region (0044 §105): the save-state settling to "NOT SAVED — RETRYING" / "SAVED …"
  // is an async result the user can't see — announce the transition (VoiceOver + explicit signal;
  // the polite liveRegion below is the TalkBack half). Only ONE Frame (the editing one) carries a
  // non-null saveLine. We STRIP the volatile "…30S AGO" counter (a 15s setTick re-renders it — see
  // the styler body) so the announce fires on real save-state transitions, never the ticking clock.
  useAnnounceOnChange(saveLine ? saveLine.replace(/\s*\d+S AGO/i, '') : saveLine);
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
        {headRight}
      </View>
      {saveLine ? <Text accessibilityLiveRegion="polite" style={styles.saveLine}>{saveLine}</Text> : null}
      {children}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  crossPostureNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    paddingHorizontal: t.space.xl,
    paddingBottom: t.space.sm,
  },
  screen: { flex: 1, backgroundColor: t.scr.bg, paddingHorizontal: t.space.lg, gap: t.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingTop: t.space.lg },
  backKey: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, paddingHorizontal: t.space.sm },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  saveLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  contextLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, textAlign: 'center' },
  contextBold: { color: t.scr.accent, fontFamily: t.font.screenBold },
  secHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  heroWrap: { alignItems: 'center', paddingVertical: t.space.sm },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: t.space.md },
  dot: { width: 6, height: 6, backgroundColor: t.scr.panelHi },
  dotOn: { backgroundColor: t.scr.accent },
  sectionBody: { gap: t.space.md, paddingBottom: t.space.lg },
  railHint: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 15 },
  inkRow: { flexDirection: 'row', gap: t.space.md, alignItems: 'center', paddingVertical: t.space.sm },
  inkSwatch: { width: 26, height: 26, borderWidth: 1, borderColor: t.scr.hairline },
  inkSel: { borderWidth: 2, borderColor: t.scr.accent },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
  },
  toolBtn: { paddingVertical: t.space.md, paddingHorizontal: t.space.lg },
  spacer: { flex: 1 },
  costStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
  },
  costLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  costValue: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, letterSpacing: 0.5 },
  costTail: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1, marginLeft: 2 },
  costOwned: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 1 },
  pickCtas: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md },
  adoptHint: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, textAlign: 'center' },
  inlineErr: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.md, padding: t.space.xl },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1.5 },
  errSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16 },
}));
