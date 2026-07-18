import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { DeviceResponse, LookResponse, PatchDeviceRequest, Sticker, StickerComposition } from '@ingame/shared';
import { ScreenHead, HEADER_SEAM_GAP } from '../src/components/ScreenHead';
import { ScreenButton } from '../src/components/ScreenButton';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { MiniDevice } from '../src/components/MiniDevice';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { DeviceSectionRail, type DeviceSection } from '../src/components/device/DeviceSectionRail';
import { DeviceItemTile } from '../src/components/device/DeviceItemTile';
import { ThemeSwatch } from '../src/components/device/ThemeSwatch';
import { DevicePreviewStrip } from '../src/components/device/DevicePreviewStrip';
import { OfflineStrip } from '../src/components/device/OfflineStrip';
import { LooksGrid } from '../src/components/device/LooksGrid';
import { StickerTray } from '../src/components/device/StickerTray';
import { StickerRail } from '../src/components/device/StickerRail';
import { StickerSteppers } from '../src/components/device/StickerSteppers';
import { KeepBar, type KeepBarItem } from '../src/components/device/KeepBar';
import { STICKER_ASSET_BY_ID } from '../src/components/device/deviceStickers';
import { useStickerContext } from '../src/components/device/DeviceStickerContext';
import { CurrencyCounter } from '../src/components/commerce/CurrencyCounter';
import { useSheetLocked } from '../src/components/SheetLock';
import { PriceChip } from '../src/components/commerce/PriceChip';
import { OwnedTag, LockedTag } from '../src/components/commerce/Tags';
import {
  addSticker,
  canPlace,
  fitTransform,
  mintStickerId,
  withSticker,
  withoutSticker,
  type StickerTransform,
} from '../src/components/device/stickerGeometry';
import { placingReadout, previewSub } from '../src/components/device/deviceCopy';
import { themedStyles, useTheme } from '../src/theme';
import { useAnnounceOnChange } from '../src/a11y/announce';
import {
  SHELL_IDS,
  SCREEN_THEME_IDS,
  SHELL_NAMES,
  SCREEN_THEME_NAMES,
  resolveShellId,
  resolveScreenThemeId,
  type ShellId,
  type ScreenThemeId,
} from '../src/theme/palettes';
import { setShellId, setThemeId, setStickerComposition } from '../src/store/prefsSlice';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import {
  useGetDeviceQuery,
  useUpdateDeviceMutation,
  useGetLooksQuery,
  useSaveLookMutation,
  useDeleteLookMutation,
  useGetCosmeticsQuery,
  useGetWalletQuery,
  useAcquireCosmeticBatchMutation,
} from '../src/store/api';

// DEV-05 saved-looks cap (server-authoritative; mirrored here only to pre-dim the save-tile at the cap).
const LOOK_CAP = 12;

// The empty composition — a safe fallback for the ON NOW comparison before `saved`/`device` hydrate.
const EMPTY_COMPOSITION: StickerComposition = { version: 1, stickers: [] };

// The Device editor (M4 §3.5 · design-spec §2.15 · decision 0030) — the in-frame LIVE edit. A
// FlowTakeover from Profile's MY DEVICE strip: the DeviceShell frame + NavBand persist (PROFILE keycap
// active), and the device the user is editing IS the frame wrapping this screen. This route hosts the
// EDITOR SURFACE + the SHELL · THEME · LOOKS sections + the D9 offline strip; the STICKERS section is a
// placeholder the STICKERS packet fills. Everything writes through ONE debounced PATCH /me/device
// (ARCH 3) — LOOKS apply rides that same pipeline; SAVE CURRENT/delete are their own POST/DELETE. At M4
// every shell/theme/look is FREE (decision 0068) — a pick applies live + persists; no commerce chrome.

const AUTOSAVE_MS = 1500; // matches the styler AUTOSAVE_MS
const RETRY_MS = 3000;

type SaveState = 'saved' | 'saving' | 'error';

export default function DeviceEditor() {
  const router = useRouter();
  const styles = useStyles();
  const t = useTheme();
  const dispatch = useAppDispatch();
  const bgLocked = useSheetLocked(); // C2 (F-13) — freeze the editor scroll while a sheet (delete-look) is open

  // The LIVE frame reads shell/theme from the persisted prefs slice (P2's theme engine, useTheme).
  const liveShellId = resolveShellId(useAppSelector((s) => s.prefs.shellId));
  const liveThemeId = resolveScreenThemeId(useAppSelector((s) => s.prefs.themeId));
  // The OPTIMISTIC sticker composition (ARCH 2) — the same prefs value the persistent DeviceShell
  // paints on every screen. The editor writes it locally on each mutation (patchDevice below), so the
  // count, the ON NOW comparison, and the on-shell layer all reflect an edit the instant it happens.
  const liveComposition = useAppSelector((s) => s.prefs.stickerComposition) ?? EMPTY_COMPOSITION;
  const liveCompRef = useRef(liveComposition);
  liveCompRef.current = liveComposition;

  // STICKERS (D4/D5) — the selected placement + the D5 on-shell preview toggle. `setSession` publishes
  // the edit affordances UP to the shell's plastic-band layers (they own the gestures; ARCH 2).
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { setSession } = useStickerContext();

  const { data: device, isLoading, isError, refetch } = useGetDeviceQuery();
  const [updateDevice] = useUpdateDeviceMutation();
  // CARD-13 premium (M5 P7): the library prices + own-flags each shell/theme; the wallet feeds the
  // header counter + the KeepBar funded/short branch.
  const { data: cosmetics } = useGetCosmeticsQuery();
  const { data: wallet } = useGetWalletQuery();
  const [acquireBatch] = useAcquireCosmeticBatchMutation();
  // the Device premium CART (D7): unowned premium facets previewed live but not yet acquired/persisted.
  const [pendingPremium, setPendingPremium] = useState<{ shell: ShellId | null; theme: ScreenThemeId | null }>({
    shell: null,
    theme: null,
  });
  const [keepBusy, setKeepBusy] = useState(false);

  // LOOKS (D6) — the list + the three write triggers. The list drives the ON NOW computation + the cap.
  const { data: looks } = useGetLooksQuery();
  const [saveLook, { isLoading: savingLook }] = useSaveLookMutation();
  const [deleteLook] = useDeleteLookMutation();
  const [looksError, setLooksError] = useState<string | null>(null);
  // the look queued for delete-confirm (D6·4 — a look is NOT re-derivable, so it routes through ConfirmSheet).
  const [pendingDelete, setPendingDelete] = useState<LookResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [section, setSection] = useState<DeviceSection>('shell');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [inlineError, setInlineError] = useState<string | null>(null);
  // server-confirmed truth (the three facets) — hydrated ONCE from getDevice, then maintained by the
  // pipeline from each PATCH response. Drives the sticker count + the theme-preview "saved" comparison.
  const [saved, setSaved] = useState<DeviceResponse | null>(null);
  // the theme try-on: non-null while the picked theme differs from the saved theme (the PreviewStrip).
  const [previewTheme, setPreviewTheme] = useState<ScreenThemeId | null>(null);

  const savedRef = useRef<DeviceResponse | null>(null);
  savedRef.current = saved;
  const previewThemeRef = useRef<ScreenThemeId | null>(null);
  previewThemeRef.current = previewTheme;
  const liveThemeRef = useRef<ScreenThemeId>(liveThemeId);
  liveThemeRef.current = liveThemeId;

  // ── the ONE write pipeline (ARCH 3 / C5): pending facets → debounced PATCH → honest save-line ──────
  const pendingRef = useRef<PatchDeviceRequest>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  // a monotonic write sequence so the LAST-issued write wins `saved` regardless of resolution order —
  // this is what makes the theme EXIT-during-inflight revert land correctly (no strip re-appearance).
  const writeSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);

  // updateDevice must be readable from the unmount cleanup without re-running the effect per render
  const updateDeviceRef = useRef(updateDevice);
  updateDeviceRef.current = updateDevice;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      // EXIT FLUSH (walk 6 — "the device state is already persisted"): a pick made inside the
      // debounce window must not die with the timer, or the live frame (prefs) and the server
      // disagree until the next edit — a cold reload would silently revert it. Fire the pending
      // PATCH un-awaited; the RTK mutation completes after unmount, and aliveRef already gates
      // every state update. (Fable review of P3.)
      const fields = pendingRef.current;
      if (Object.keys(fields).length > 0) {
        pendingRef.current = {};
        void updateDeviceRef.current(fields);
      }
    };
  }, []);

  const flush = useCallback(() => {
    const fields = pendingRef.current;
    if (Object.keys(fields).length === 0 || !aliveRef.current) return;
    pendingRef.current = {};
    const seq = ++writeSeqRef.current;
    setSaveState('saving');
    updateDevice(fields)
      .unwrap()
      .then((res) => {
        if (!aliveRef.current) return;
        // last-issued-write-wins: ignore a stale response that resolved after a newer write.
        if (seq >= appliedSeqRef.current) {
          appliedSeqRef.current = seq;
          setSaved(res);
          // the previewed theme is saved now → the strip clears (it IS the saved theme).
          if (
            previewThemeRef.current &&
            resolveScreenThemeId(res.screenThemeId) === previewThemeRef.current
          ) {
            setPreviewTheme(null);
          }
        }
        setSaveState('saved');
      })
      .catch((e) => {
        if (!aliveRef.current) return;
        const status = (e as { status?: number })?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) {
          // a rejected write will never self-heal — surface it inline + stop retrying (styler grammar).
          setSaveState('error');
          setInlineError(errMsg(e, 'Could not save this change.'));
          return;
        }
        // transient — re-queue the fields (a newer queued facet still wins) + soft retry.
        pendingRef.current = { ...fields, ...pendingRef.current };
        setSaveState('error');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flush(), RETRY_MS);
      });
  }, [updateDevice]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('saving');
    timerRef.current = setTimeout(() => flush(), AUTOSAVE_MS);
  }, [flush]);

  /** Optimistic local apply (the LIVE frame re-wraps/re-themes via P2) → queue ONE debounced PATCH. */
  const patchDevice = useCallback(
    (fields: PatchDeviceRequest) => {
      setInlineError(null);
      if (fields.activeShellId) dispatch(setShellId(resolveShellId(fields.activeShellId)));
      if (fields.screenThemeId) dispatch(setThemeId(resolveScreenThemeId(fields.screenThemeId)));
      if (fields.stickerComposition) dispatch(setStickerComposition(fields.stickerComposition));
      pendingRef.current = { ...pendingRef.current, ...fields };
      scheduleFlush();
    },
    [dispatch, scheduleFlush],
  );

  // ── hydrate ONCE: seed `saved` + reconcile the live frame to server truth (DEV-03 resolvers) ───────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!device || hydratedRef.current) return;
    hydratedRef.current = true;
    setSaved(device);
    const s = resolveShellId(device.activeShellId);
    const th = resolveScreenThemeId(device.screenThemeId);
    if (s !== liveShellId) dispatch(setShellId(s));
    if (th !== liveThemeId) dispatch(setThemeId(th));
    // reconcile the optimistic sticker layer to server truth (ARCH 2 — the prefs value may be a stale
    // persisted blob from a prior session until this one-shot sync lands).
    dispatch(setStickerComposition(device.stickerComposition));
    // liveShell/Theme read once at hydration; the guard makes this a one-shot sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  // ── section switch — carries preview state (walk 1); clears the transient switch beat + the sticker
  // selection / on-shell preview (both are STICKERS-local) ───────────────────────────────────────────
  const changeSection = useCallback((s: DeviceSection) => {
    setSelectedStickerId(null);
    setPreviewing(false);
    setSection(s);
  }, []);

  // CARD-13 premium (M5 P7) — the library entry for a shell/theme id (tier present = premium).
  const balance = wallet?.balance ?? 0;
  const cosmeticFor = useCallback(
    (id: string, type: 'device_shell' | 'screen_theme') => cosmetics?.items.find((i) => i.id === id && i.type === type),
    [cosmetics],
  );

  // ── SHELL pick (D1/D2 · D7 premium) ──────────────────────────────────────────────────────────────
  const pickShell = useCallback(
    (id: ShellId) => {
      const c = cosmeticFor(id, 'device_shell');
      const isOffline = saveState === 'error' && inlineError === null;
      if (c?.tier && !c.owned) {
        if (isOffline) return; // D9 — acquiring premium is a write; gated offline
        dispatch(setShellId(id)); // preview live only (no server write until KEEP)
        setPendingPremium((p) => ({ ...p, shell: id }));
        return;
      }
      setPendingPremium((p) => ({ ...p, shell: null })); // a free/owned shell clears the premium preview
      patchDevice({ activeShellId: id });
    },
    [patchDevice, cosmeticFor, dispatch, saveState, inlineError],
  );

  // ── THEME pick (D3 · D7 premium) ─────────────────────────────────────────────────────────────────
  const pickTheme = useCallback(
    (id: ScreenThemeId) => {
      const c = cosmeticFor(id, 'screen_theme');
      const isOffline = saveState === 'error' && inlineError === null;
      if (c?.tier && !c.owned) {
        if (isOffline) return;
        dispatch(setThemeId(id)); // preview live only
        setPreviewTheme(null); // the KeepBar is the reconcile affordance, not the try-on strip
        setPendingPremium((p) => ({ ...p, theme: id }));
        return;
      }
      const savedTheme = resolveScreenThemeId(savedRef.current?.screenThemeId);
      setPendingPremium((p) => ({ ...p, theme: null }));
      setPreviewTheme(id === savedTheme ? null : id);
      patchDevice({ screenThemeId: id });
    },
    [patchDevice, cosmeticFor, dispatch, saveState, inlineError],
  );

  // ── D7 premium cart — KEEP acquires the previewed premium then commits the facets ──────────────────
  // (F-21 ruling 5) No explicit CANCEL: re-selecting a saved/owned shell/theme reverts the preview, and
  // leaving the editor reverts + drops the cart (endPreview useFocusEffect below).
  const keepPremium = useCallback(async () => {
    if (keepBusy) return;
    const ids: string[] = [pendingPremium.shell, pendingPremium.theme].filter((x): x is ShellId | ScreenThemeId => !!x);
    if (ids.length === 0) return;
    setKeepBusy(true);
    setInlineError(null);
    try {
      await acquireBatch({ cosmeticIds: ids }).unwrap();
      patchDevice({
        ...(pendingPremium.shell ? { activeShellId: pendingPremium.shell } : {}),
        ...(pendingPremium.theme ? { screenThemeId: pendingPremium.theme } : {}),
      });
      setPendingPremium({ shell: null, theme: null });
    } catch (e) {
      setInlineError(errMsg(e, 'Could not acquire — your pixels are unchanged.'));
    } finally {
      setKeepBusy(false);
    }
  }, [keepBusy, pendingPremium, acquireBatch, patchDevice]);

  // ── D7 (owner round-2, F-13) — the premium preview MUST END when leaving the editor ────────────────
  // A previewed-but-unowned premium shell/theme lives in the redux `prefs` (so the live frame repaints)
  // but is NOT persisted/acquired. Without this, navigating away (Top Up, the STORE keycap, a back-pop)
  // LEFT that preview painting the whole app — the user wore a premium theme they never bought until the
  // next edit reverted it. Tie it to the screen's focus lifecycle: on BLUR/UNMOUNT, revert the prefs to
  // the saved device and drop the cart (the KeepBeat lesson — the preview dies with the editor). A ref so
  // the focus effect never re-subscribes as the cart changes.
  const pendingPremiumRef = useRef(pendingPremium);
  pendingPremiumRef.current = pendingPremium;
  const endPreviewRef = useRef<() => void>(() => {});
  endPreviewRef.current = () => {
    if (!pendingPremiumRef.current.shell && !pendingPremiumRef.current.theme) return;
    const savedShell = resolveShellId(savedRef.current?.activeShellId);
    const savedTheme = resolveScreenThemeId(savedRef.current?.screenThemeId);
    if (pendingPremiumRef.current.shell) dispatch(setShellId(savedShell));
    if (pendingPremiumRef.current.theme) dispatch(setThemeId(savedTheme));
    // clear the cart too, so a return to the editor starts clean (the preview ended with the exit).
    setPendingPremium({ shell: null, theme: null });
  };
  useFocusEffect(
    useCallback(() => {
      return () => endPreviewRef.current();
    }, []),
  );

  // ── THEME EXIT — revert the pick to the saved theme (the one un-commit door, walk 4) ───────────────
  const exitPreview = useCallback(() => {
    const savedTheme = resolveScreenThemeId(savedRef.current?.screenThemeId);
    dispatch(setThemeId(savedTheme));
    setPreviewTheme(null);
    if ('screenThemeId' in pendingRef.current) {
      // the preview PATCH hasn't fired yet → just cancel the queued theme facet (no server write).
      const rest = { ...pendingRef.current };
      delete rest.screenThemeId;
      pendingRef.current = rest;
      if (Object.keys(rest).length === 0 && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setSaveState('saved');
      }
    } else {
      // already flushed/inflight → issue a corrective write so the SERVER returns to the saved theme
      // (a higher seq → it wins `saved`; previewTheme is already null so no strip re-appears).
      patchDevice({ screenThemeId: savedTheme });
    }
  }, [dispatch, patchDevice]);

  const goBack = useCallback(() => router.back(), [router]);

  // ── STICKERS (D4): place · transform · delete — all through the ONE pipeline (ARCH 2/3) ─────────────
  // Flush the pending PATCH immediately (called on gesture release so a save lands promptly instead of
  // waiting out the full debounce during rapid editing).
  const commitNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    flush();
  }, [flush]);

  // Clamp a transform to its zone (fitTransform ≡ the shared stickerFitsZone gate), write it
  // optimistically, and schedule the PATCH. Reads the CURRENT composition through the ref so a gesture's
  // per-frame calls always build on the latest state.
  const mutateSticker = useCallback(
    (id: string, patch: Partial<StickerTransform>) => {
      const comp = liveCompRef.current;
      const cur = comp.stickers.find((s) => s.id === id);
      if (!cur) return;
      const fitted = fitTransform(cur, patch);
      const next: Sticker = { ...cur, ...fitted };
      patchDevice({ stickerComposition: withSticker(comp, id, next) });
    },
    [patchDevice],
  );

  // Place a fresh decal in the forehead zone centre, selected (respects the per-zone/total caps).
  const placeSticker = useCallback(
    (assetId: string) => {
      const comp = liveCompRef.current;
      if (!canPlace(comp.stickers, 'forehead')) return;
      const fitted = fitTransform({ zone: 'forehead', x: 0.5, y: 0.5, scale: 1, rotation: 0 }, {});
      const sticker: Sticker = { id: mintStickerId(), assetId, ...fitted };
      patchDevice({ stickerComposition: addSticker(comp, sticker) });
      setSelectedStickerId(sticker.id);
      commitNow();
    },
    [patchDevice, commitNow],
  );

  // Delete the selected decal — undo-free, no confirm (0069 ruling 4 · 0040: re-adding is cheap).
  const deleteSticker = useCallback(
    (id: string) => {
      patchDevice({ stickerComposition: withoutSticker(liveCompRef.current, id) });
      setSelectedStickerId((cur) => (cur === id ? null : cur));
      commitNow();
    },
    [patchDevice, commitNow],
  );

  // ── walk2 W-A7 — the explicit SET/CONFIRM beat (⚖ 0078 records this shape) ───────────────────────
  // Placing/tapping a decal enters its transform state (TransformBox + steppers). It now EXITS through
  // an explicit commit beat: tap-AWAY commits (the band layer's empty-tap already deselects — the
  // editor-grammar low-friction default — and the editor body below now does too), a visible DONE key
  // on the transform chrome commits for clarity, and BLURRING the screen auto-commits (below) so an
  // editable state can never leave the editor. Commit = flush the pending PATCH + drop the selection
  // (the data itself saves continuously through the ONE pipeline — the beat ends the CHROME, the
  // TransformDrawer grammar's close). No confirm-sheet ceremony: stickers are free + reversible; the
  // KEEP/acquire grammar stays premium-only.
  const doneEditingSticker = useCallback(() => {
    setSelectedStickerId(null);
    commitNow();
  }, [commitNow]);

  // W-A7 blur auto-commit — leaving the Device editor (back/nav) commits the current placement and,
  // via the `focusedRef` gate on the session publish below, UNPUBLISHES the edit session: expo-router
  // keeps this screen MOUNTED while blurred, so before this gate the shell's plastic bands kept their
  // edit chrome (zones/handles) on every OTHER screen — the owner's "leave with stickers still
  // editable". A ref (not state) so the blur cleanup never depends on re-render timing.
  const [focused, setFocused] = useState(true);
  const doneRef = useRef(doneEditingSticker);
  doneRef.current = doneEditingSticker;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        doneRef.current(); // commit the in-progress placement — never carry an editable state out
        setFocused(false);
      };
    }, []),
  );

  // Publish the edit session to the shell's plastic bands while STICKERS is active + NOT previewing +
  // FOCUSED (W-A7 — a blurred editor publishes nothing; D5 preview hides the handles/zones the same
  // way). Cleared on section change / preview / blur / unmount.
  useEffect(() => {
    if (focused && section === 'stickers' && !previewing) {
      setSession({ selectedId: selectedStickerId, select: setSelectedStickerId, mutate: mutateSticker, commit: commitNow });
    } else {
      setSession(null);
    }
    return () => setSession(null);
  }, [focused, section, previewing, selectedStickerId, mutateSticker, commitNow, setSession]);

  // ── LOOKS: apply · save · delete ─────────────────────────────────────────────────────────────────
  // Apply = the ONE pipeline (walk 5): the snapshot's three facets swap in one PATCH; the optimistic
  // dispatch re-wraps/re-themes the live frame instantly. stickerComposition rides the same call — the
  // pipeline forwards it to the server whether or not the STICKERS packet's optimistic path has landed.
  const applyLook = useCallback(
    (look: LookResponse) => {
      setPreviewTheme(null); // applying a look COMMITS a theme — never a try-on (no lingering strip)
      patchDevice({
        activeShellId: look.activeShellId,
        screenThemeId: look.screenThemeId,
        stickerComposition: look.stickerComposition,
      });
    },
    [patchDevice],
  );

  // SAVE CURRENT — the server snapshots the LIVE device (empty POST). 409 LOOK_CAP_REACHED surfaces
  // inline (the shelf is full); other failures show the server message. Success → invalidation adds the tile.
  const onSaveCurrent = useCallback(() => {
    setLooksError(null);
    saveLook()
      .unwrap()
      .catch((e) => {
        const status = (e as { status?: number })?.status;
        setLooksError(
          status === 409
            ? '12 LOOKS SAVED — REMOVE ONE TO SAVE ANOTHER'
            : errMsg(e, 'Could not save this look.'),
        );
      });
  }, [saveLook]);

  const confirmDelete = useCallback(() => {
    const target = pendingDelete;
    if (!target) return;
    setDeleting(true);
    deleteLook(target.id)
      .unwrap()
      .then(() => {
        setPendingDelete(null);
        setLooksError(null);
      })
      .catch((e) => setLooksError(errMsg(e, 'Could not remove this look.')))
      .finally(() => setDeleting(false));
  }, [deleteLook, pendingDelete]);

  // NOTE — the D8/D10 lifecycle early-returns (isLoading / isError) live at the BOTTOM of this
  // component, right before the main return, NOT here. EVERY hook (incl. the two useAnnounceOnChange
  // below + the useFocusEffect above) must run on every render: returning early up here skipped those
  // trailing hooks, so when logout's `api.util.resetApiState()` flips this still-mounted editor's
  // getDevice query back to isLoading, React saw "Rendered fewer hooks than expected" and crashed the
  // whole tree (which in turn broke the profile signOut's router.replace — the F-16 logout crash).
  // rules-of-hooks: no hook may sit after a conditional return. (react-hooks lint doesn't cover app/.)
  const stickerCount = liveComposition.stickers.length;
  // the decal whose TransformBox + stepper rows show (STICKERS · not previewing · one selected).
  const selectedSticker =
    section === 'stickers' && !previewing
      ? liveComposition.stickers.find((s) => s.id === selectedStickerId) ?? null
      : null;

  // The offline signal (D9 · C6 · SYS-10): a device write failing TRANSIENTLY with a retry pending. The
  // pipeline sets saveState='error' for both 4xx (definitive — inlineError set) and transient (retrying —
  // inlineError null); the transient case IS the honest offline signal. No client-side NetInfo exists yet,
  // so this pipeline state is the app's one connectivity truth (choice recorded in the packet receipt).
  const offline = saveState === 'error' && inlineError === null;

  // ON NOW compares against the live device: optimistic shell/theme (prefs) + the persisted composition.
  const liveFacets = {
    activeShellId: liveShellId,
    screenThemeId: liveThemeId,
    stickerComposition: liveComposition,
  };
  const lookList = looks ?? [];
  const atCap = lookList.length >= LOOK_CAP;
  const saveDisabled = atCap || savingLook || offline; // SAVE CURRENT waits for the network (SYS-10)

  // C3 → walk2 W-B12 (owner ruling): the default "EDITING YOUR DEVICE" line AND the D2 "SWITCHED —
  // «shell» WRAP" beat readout are REMOVED (unnecessary chrome — the live device frame above IS the
  // state; completes the F-21 tail, whose r6 already dropped the beat's was→now MiniDevice pair). The
  // readout row now renders ONLY for the two informative states — the D5 on-shell preview and the
  // live PLACING transform line — and otherwise the space collapses cleanly.
  const readout: { title: string; sub: string; ok?: boolean } | null = previewing
    ? {
        title: 'YOUR DEVICE — AS IT WEARS',
        sub: previewSub(SHELL_NAMES[liveShellId], SCREEN_THEME_NAMES[liveThemeId], stickerCount),
        ok: true,
      }
    : selectedSticker
      ? {
          title: placingReadout(
            STICKER_ASSET_BY_ID[selectedSticker.assetId]?.name ?? 'DECAL',
            selectedSticker.scale,
            selectedSticker.rotation,
          ),
          sub: 'DECALS GO ON THE PLASTIC, NOT THE SCREEN',
        }
      : null;

  // CARD-16 live-region (0044 §105): the save-state line (SAVING… / NOT SAVED — RETRYING / an
  // inline error / SAVED LIVE — the inline error is folded in) is an async result the user can't see
  // — announce that transition.
  const saveLineText =
    saveState === 'saving'
      ? 'SAVING…'
      : saveState === 'error'
        ? inlineError
          ? inlineError.toUpperCase()
          : 'NOT SAVED — RETRYING'
        : 'SAVED LIVE';
  useAnnounceOnChange(saveLineText);
  // Announce the readout TITLE on transition (the preview line) — but SUPPRESS the PLACING readout,
  // whose title carries the live transform (scale/angle) and changes every drag frame; that would
  // flood the SR queue (transitions, never per-frame).
  const readoutAnnounce = selectedSticker ? null : (readout?.title ?? null);
  useAnnounceOnChange(readoutAnnounce);

  // ── D7 premium badging + the KeepBar cart ─────────────────────────────────────────────────────────
  // A tile's badge (top-left): owned → ✓; unowned online → PriceChip; unowned offline → 🔒 LOCKED (D9).
  const premiumBadge = (id: string, type: 'device_shell' | 'screen_theme') => {
    const c = cosmeticFor(id, type);
    if (!c?.tier) return undefined; // free — no badge
    if (c.owned) return <OwnedTag label="✓" />;
    if (offline) return <LockedTag label="LOCKED" />;
    return <PriceChip pixels={c.price} />;
  };
  const premiumLocked = (id: string, type: 'device_shell' | 'screen_theme') => {
    const c = cosmeticFor(id, type);
    return offline && !!c?.tier && !c.owned; // D9 — dim + writes gated
  };
  const cartItems: KeepBarItem[] = [];
  if (pendingPremium.shell) {
    cartItems.push({
      cosmeticId: pendingPremium.shell,
      name: SHELL_NAMES[pendingPremium.shell],
      type: 'device_shell',
      price: cosmeticFor(pendingPremium.shell, 'device_shell')?.price ?? 0,
    });
  }
  if (pendingPremium.theme) {
    cartItems.push({
      cosmeticId: pendingPremium.theme,
      name: SCREEN_THEME_NAMES[pendingPremium.theme],
      type: 'screen_theme',
      price: cosmeticFor(pendingPremium.theme, 'screen_theme')?.price ?? 0,
    });
  }
  const cartTotal = cartItems.reduce((s, i) => s + i.price, 0);

  // ── lifecycle: D8 Skeleton (first load) · D10 LoadError ────────────────────────────────────────
  // These early-returns sit AFTER every hook (rules-of-hooks): all the useState/useRef/useCallback/
  // useEffect/useFocusEffect/useAnnounceOnChange above run unconditionally, so a loading/error render
  // never renders a different hook count than a loaded one. The computations between the hooks and
  // here are all state-derived and null-safe, so running them in the loading/error frame is harmless.
  if (isLoading) {
    // D8 — chrome (head · return · rail) renders immediately; the body is solid skeleton fills.
    return (
      <Frame onBack={goBack} section={section} onSection={changeSection}>
        <DeviceSkeleton />
      </Frame>
    );
  }
  if (isError) {
    return (
      <Frame onBack={goBack} section={section} onSection={changeSection} railDim>
        <View style={styles.errWrap}>
          <Text style={styles.errEyebrow}>COULDN'T LOAD COSMETICS</Text>
          <Text style={styles.errTitle}>SIGNAL LOST</Text>
          <Text style={styles.errSub}>
            Your device and its current look are safe. Check your connection and try again.
          </Text>
          <ScreenButton label="↻ Retry" variant="primary" onPress={() => void refetch()} />
        </View>
      </Frame>
    );
  }

  return (
    <Frame
      onBack={goBack}
      section={section}
      onSection={changeSection}
      headRight={<CurrencyCounter balance={balance} onPress={() => router.push('/store')} />}
    >
      {previewTheme && !previewing ? (
        <DevicePreviewStrip name={SCREEN_THEME_NAMES[previewTheme]} onExit={exitPreview} />
      ) : null}
      {previewing ? (
        <View style={styles.onShellStrip}>
          <Text style={styles.onShellLabel}>◉ ON-SHELL PREVIEW — HOW IT WEARS</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit"
            onPress={() => setPreviewing(false)}
            hitSlop={8}
          >
            <Text style={styles.onShellEdit}>EDIT ◅</Text>
          </Pressable>
        </View>
      ) : null}
      {offline ? <OfflineStrip /> : null}

      {/* C3/W-B12 — the readout renders only for the preview/placing states; otherwise nothing. */}
      {readout ? (
        <View style={styles.readout}>
          <View style={[styles.dot, readout.ok && styles.dotOk]} />
          <View style={styles.readoutText}>
            <Text style={styles.readoutTitle}>{readout.title}</Text>
            <Text style={styles.readoutSub}>{readout.sub}</Text>
          </View>
        </View>
      ) : null}

      {/* F-13 D7 (owner round-2) — drop the resting "SAVED LIVE" display (the whole editor autosaves;
          announcing "saved" on every idle beat is clutter). The line now shows ONLY the in-flight/error
          states (SAVING… · NOT SAVED — RETRYING · an inline error); the ok-dot on the readout above
          already signals the settled/saved state. A11y still announces the transition (below). */}
      {saveState !== 'saved' ? (
        <Text accessibilityLiveRegion="polite" style={styles.saveLine}>
          {saveLineText}
        </Text>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!bgLocked}
      >
        {/* F-21 ruling 6 + walk2 W-B12 — no was→now MiniDevice pair AND no "SWITCHED" status line:
            the device chrome above IS the live preview; a switch needs no readout at all. */}
        {section === 'shell' ? (
          <>
            <Text style={styles.secTitle}>SHELL</Text>
            <Text style={styles.secSub}>Your colourway — one handheld, five wraps.</Text>
            <View style={styles.tray}>
              {SHELL_IDS.map((id) => (
                <DeviceItemTile
                  key={id}
                  name={SHELL_NAMES[id]}
                  selected={liveShellId === id}
                  onPress={() => pickShell(id)}
                  badge={premiumBadge(id, 'device_shell')}
                  dimmed={premiumLocked(id, 'device_shell')}
                >
                  <MiniDevice shellId={id} themeId={liveThemeId} />
                </DeviceItemTile>
              ))}
            </View>
          </>
        ) : section === 'theme' ? (
          <>
            <Text style={styles.secTitle}>THEME</Text>
            <Text style={styles.secSub}>How your whole screen looks — swapped live.</Text>
            <View style={styles.tray}>
              {SCREEN_THEME_IDS.map((id) => (
                <DeviceItemTile
                  key={id}
                  name={SCREEN_THEME_NAMES[id]}
                  selected={liveThemeId === id}
                  onPress={() => pickTheme(id)}
                  badge={premiumBadge(id, 'screen_theme')}
                  dimmed={premiumLocked(id, 'screen_theme')}
                >
                  <ThemeSwatch themeId={id} />
                </DeviceItemTile>
              ))}
            </View>
          </>
        ) : section === 'stickers' ? (
          <>
            <Text style={styles.secTitle}>STICKERS</Text>
            {previewing ? (
              <View style={styles.stickerBody}>
                <Text style={styles.floorNote}>
                  ☑ STICKERS RIDE THE REAL SHELL · NAV STAYS FULLY LEGIBLE
                </Text>
                <Text style={styles.secSub}>
                  Handles hidden, controls quiet — the true on-shell preview.
                </Text>
                <View style={styles.previewRow}>
                  <View style={styles.flexSpacer} />
                  <ScreenButton label="◅ Keep editing" variant="primary" size="mini" onPress={() => setPreviewing(false)} />
                  <ScreenButton label="Done" variant="secondary" size="mini" onPress={goBack} />
                </View>
              </View>
            ) : (
              // W-A7 tap-away — a tap on the body's empty space (not captured by the tray/rail/stepper
              // Pressables) commits the in-progress placement, mirroring the band layer's empty-tap
              // deselect. Display wrapper only — hidden from the SR (the DONE key is the a11y path).
              <Pressable
                style={styles.stickerBody}
                onPress={doneEditingSticker}
                accessible={false}
                importantForAccessibility="no"
              >
                <Text style={styles.secSub}>
                  Tap a decal to place it on the forehead plastic. The screen &amp; the nav keys stay clear.
                </Text>
                <StickerTray onPick={placeSticker} atCap={!canPlace(liveComposition.stickers, 'forehead')} />
                {/* the placed-decal rail (owner 2026-07-12) — select a sticker to transform it */}
                <StickerRail
                  stickers={liveComposition.stickers}
                  selectedId={selectedStickerId}
                  onSelect={setSelectedStickerId}
                />
                {selectedSticker ? (
                  <StickerSteppers
                    sticker={selectedSticker}
                    mutate={mutateSticker}
                    commit={commitNow}
                    onDone={doneEditingSticker}
                    onDelete={() => deleteSticker(selectedSticker.id)}
                    // guard the re-zone against the target zone's cap — else a move to a full band
                    // 422s and wedges the pipeline (murr M1). Only rendered while chin is enabled.
                    canReZone={canPlace(
                      liveComposition.stickers,
                      selectedSticker.zone === 'forehead' ? 'chin' : 'forehead',
                    )}
                  />
                ) : null}
                {stickerCount > 0 ? (
                  <ScreenButton
                    label="◉ On-shell preview"
                    variant="secondary"
                    size="mini"
                    onPress={() => {
                      setSelectedStickerId(null);
                      setPreviewing(true);
                    }}
                  />
                ) : null}
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.secTitle}>LOOKS</Text>
            <Text style={styles.secSub}>
              Save the whole styled combo — shell, stickers &amp; theme — and re-apply it in a tap.
            </Text>
            <Text style={styles.looksHead}>SAVED LOOKS</Text>
            <Text style={styles.looksReadout}>
              YOUR LOOKS — {lookList.length} SAVED · SHELL + STICKERS + THEME, SAVED AS ONE
            </Text>
            <LooksGrid
              looks={lookList}
              liveFacets={liveFacets}
              onApply={applyLook}
              onDelete={setPendingDelete}
              onSaveCurrent={onSaveCurrent}
              saveDisabled={saveDisabled}
            />
            {looksError ? <Text style={styles.looksError}>{looksError}</Text> : null}
            {lookList.length === 0 ? (
              <Text style={styles.looksHint}>
                No looks saved yet — style your device, then save the combo to wear it again in a tap.
              </Text>
            ) : (
              <Text style={styles.looksHint}>
                Tap a saved look to wear it instantly. × removes a look (switch off the ON NOW look
                first). SAVE CURRENT snapshots the live combo.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* D7 — the premium cart: preview live, KEEP acquires-all + applies (F-21 r5: no CANCEL — re-select
          or leave the editor reverts) */}
      <KeepBar
        items={cartItems}
        total={cartTotal}
        balance={balance}
        busy={keepBusy}
        onKeep={() => void keepPremium()}
        onTopUp={() => router.push('/store')}
      />

      {/* D6·4 — a saved look is not re-derivable, so removal confirms (ConfirmSheet §1.8). */}
      <ConfirmSheet
        visible={pendingDelete !== null}
        title="REMOVE THIS LOOK?"
        message={
          pendingDelete
            ? `${SHELL_NAMES[resolveShellId(pendingDelete.activeShellId)]} · ${SCREEN_THEME_NAMES[resolveScreenThemeId(pendingDelete.screenThemeId)]} — this saved combo can't be brought back once removed.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
        busy={deleting}
      />
    </Frame>
  );
}

// ── the flow frame: head "DEVICE" + return-link + the bottom SectionSwitch/rail (persistent chrome) ──
function Frame({
  children,
  onBack,
  section,
  onSection,
  railDim = false,
  headRight,
}: {
  children: React.ReactNode;
  onBack: () => void;
  section: DeviceSection;
  onSection: (s: DeviceSection) => void;
  railDim?: boolean;
  /** the trailing head slot — the PX CurrencyCounter (ECON-07 entry point, M5 P7). */
  headRight?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      {/* note-3 fix (owner 2026-07-10): the head had zero top padding — the "DEVICE" title sat flush to
          the screen top, jammed against the return-link. `headPad` gives it the game-page's breathing
          room (paddingTop + a gap before the link). */}
      <View style={styles.headPad}>
        <View style={styles.headRow}>
          <ScreenHead title="DEVICE" />
          <View style={styles.headSpacer} />
          {headRight}
        </View>
        <TertiaryLink label="Return to profile" chevron="leading-back" onPress={onBack} />
      </View>
      {children}
      {/* the rail is the shared SectionDock now (owns its own bed padding) — no `pad` wrapper. */}
      <View style={railDim ? styles.dim : undefined} pointerEvents={railDim ? 'none' : 'auto'}>
        <DeviceSectionRail value={section} onChange={onSection} />
      </View>
    </View>
  );
}

// D8 — the §1.6 Skeleton: solid scr.panel fills in the readout/title/tray shapes (never dashed).
function DeviceSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skWrap} accessibilityLabel="Loading">
      <View style={[styles.skBar, { height: 34, width: '86%' }]} />
      <View style={[styles.skBar, { height: 11, width: '40%' }]} />
      <View style={styles.skTray}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skTile} />
        ))}
      </View>
    </View>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const err = (e as { data?: { error?: { message?: string; details?: { message?: string }[] } } })?.data
    ?.error;
  return err?.details?.[0]?.message ?? err?.message ?? fallback;
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  headPad: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, gap: HEADER_SEAM_GAP, paddingBottom: t.space.md }, // W-B1/B2 — the fused under-title seam on the shared geometry (was gap xs, no bottom)
  headRow: { flexDirection: 'row', alignItems: 'center' },
  headSpacer: { flex: 1 },
  dim: { opacity: 0.4 },
  body: { paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: t.space.md },
  // readout
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.scr.accent },
  dotOk: { backgroundColor: t.brand.success }, // the D5 ok-dot (settled / saved-live)
  readoutText: { gap: 2 },
  readoutTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1 },
  readoutSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  saveLine: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.xs,
  },
  // sections
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  secSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md, paddingTop: t.space.sm },
  floorNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.brand.success,
    letterSpacing: 0.5,
    paddingTop: t.space.sm,
  },
  placeholder: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen,
    marginTop: t.space.sm,
  },
  // STICKERS (D4/D5)
  // breathing room between the STICKERS panel's stacked pieces (owner 2026-07-12 — the section read
  // too crowded); the tray/rail/steppers/preview each get a clear gap.
  stickerBody: { gap: t.space.lg, paddingTop: t.space.sm },
  onShellStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.scr.accent,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  onShellLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk, letterSpacing: 1 },
  onShellEdit: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk, letterSpacing: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingTop: t.space.md },
  flexSpacer: { flex: 1 },
  // LOOKS (D6)
  looksHead: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.dim,
    letterSpacing: 1,
    paddingTop: t.space.sm,
  },
  looksReadout: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.faint,
    letterSpacing: 0.5,
  },
  looksError: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.brand.alert,
    letterSpacing: 0.5,
    paddingTop: t.space.sm,
  },
  looksHint: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
    lineHeight: 13,
    paddingTop: t.space.sm,
  },
  // skeleton
  skWrap: { flex: 1, paddingHorizontal: t.space.lg, paddingTop: t.space.md, gap: t.space.md },
  skBar: { backgroundColor: t.scr.panel, borderRadius: 2 },
  skTray: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md, paddingTop: t.space.sm },
  skTile: { width: 60, height: 92, backgroundColor: t.scr.panel, borderRadius: 3 },
  // load error
  errWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.md, padding: t.space.xl },
  errEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1.5 },
  errSub: {
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.scr.dim,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
}));
