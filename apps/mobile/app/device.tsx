import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { DeviceResponse, LookResponse, PatchDeviceRequest, Sticker, StickerComposition } from '@ingame/shared';
import { ScreenHead } from '../src/components/ScreenHead';
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
import { StickerSteppers } from '../src/components/device/StickerSteppers';
import { STICKER_ASSET_BY_ID } from '../src/components/device/deviceStickers';
import { useStickerContext } from '../src/components/device/DeviceStickerContext';
import {
  addSticker,
  canPlace,
  fitTransform,
  mintStickerId,
  withSticker,
  withoutSticker,
  type StickerTransform,
} from '../src/components/device/stickerGeometry';
import { editReadoutSub, switchReadout, placingReadout, previewSub } from '../src/components/device/deviceCopy';
import { themedStyles, useTheme } from '../src/theme';
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
  // the D2 shell-switch beat (before→after minis) — cleared on a section change or the next pick.
  const [switchBeat, setSwitchBeat] = useState<{ from: ShellId; to: ShellId } | null>(null);

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
    setSwitchBeat(null);
    setSelectedStickerId(null);
    setPreviewing(false);
    setSection(s);
  }, []);

  // ── SHELL pick (D1/D2) ─────────────────────────────────────────────────────────────────────────
  const pickShell = useCallback(
    (id: ShellId) => {
      const from = liveShellId; // the shell the frame wears BEFORE this pick
      setSwitchBeat(id !== from ? { from, to: id } : null);
      patchDevice({ activeShellId: id });
    },
    [liveShellId, patchDevice],
  );

  // ── THEME pick (D3) ────────────────────────────────────────────────────────────────────────────
  const pickTheme = useCallback(
    (id: ScreenThemeId) => {
      const savedTheme = resolveScreenThemeId(savedRef.current?.screenThemeId);
      setPreviewTheme(id === savedTheme ? null : id);
      patchDevice({ screenThemeId: id });
    },
    [patchDevice],
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

  // Publish the edit session to the shell's plastic bands while STICKERS is active + NOT previewing (D5
  // hides the handles/zones by publishing null). Cleared on section change / preview / unmount.
  useEffect(() => {
    if (section === 'stickers' && !previewing) {
      setSession({ selectedId: selectedStickerId, select: setSelectedStickerId, mutate: mutateSticker, commit: commitNow });
    } else {
      setSession(null);
    }
    return () => setSession(null);
  }, [section, previewing, selectedStickerId, mutateSticker, commitNow, setSession]);

  // ── LOOKS: apply · save · delete ─────────────────────────────────────────────────────────────────
  // Apply = the ONE pipeline (walk 5): the snapshot's three facets swap in one PATCH; the optimistic
  // dispatch re-wraps/re-themes the live frame instantly. stickerComposition rides the same call — the
  // pipeline forwards it to the server whether or not the STICKERS packet's optimistic path has landed.
  const applyLook = useCallback(
    (look: LookResponse) => {
      setPreviewTheme(null); // applying a look COMMITS a theme — never a try-on (no lingering strip)
      setSwitchBeat(null);
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

  // ── lifecycle: D8 Skeleton (first load) · D10 LoadError ────────────────────────────────────────
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

  const stickerCount = liveComposition.stickers.length;
  const beatActive = switchBeat !== null && section === 'shell';
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

  // C3 — the edit-readout, one line for all states (precedence: D5 preview → D2 switch beat → a decal
  // being placed → the default editing line). The D2 beat + the placing line are section-exclusive.
  const readout: { title: string; sub: string; ok?: boolean } = previewing
    ? {
        title: 'YOUR DEVICE — AS IT WEARS',
        sub: previewSub(SHELL_NAMES[liveShellId], SCREEN_THEME_NAMES[liveThemeId], stickerCount),
        ok: true,
      }
    : beatActive && switchBeat
      ? switchReadout(SHELL_NAMES[switchBeat.to])
      : selectedSticker
        ? {
            title: placingReadout(
              STICKER_ASSET_BY_ID[selectedSticker.assetId]?.name ?? 'DECAL',
              selectedSticker.scale,
              selectedSticker.rotation,
            ),
            sub: 'DECALS GO ON THE PLASTIC, NOT THE SCREEN',
          }
        : {
            title: 'EDITING YOUR DEVICE',
            sub: editReadoutSub(SHELL_NAMES[liveShellId], SCREEN_THEME_NAMES[liveThemeId], stickerCount),
          };

  return (
    <Frame onBack={goBack} section={section} onSection={changeSection}>
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

      {/* C3 — the edit-readout (states unified above) */}
      <View style={styles.readout}>
        <View style={[styles.dot, readout.ok && styles.dotOk]} />
        <View style={styles.readoutText}>
          <Text style={styles.readoutTitle}>{readout.title}</Text>
          <Text style={styles.readoutSub}>{readout.sub}</Text>
        </View>
      </View>

      <Text style={styles.saveLine}>
        {saveState === 'saving'
          ? 'SAVING…'
          : saveState === 'error'
            ? inlineError
              ? inlineError.toUpperCase()
              : 'NOT SAVED — RETRYING'
            : 'SAVED LIVE'}
      </Text>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* the D2 before→after mini pair rides above the tray while the beat holds */}
        {beatActive && switchBeat ? (
          <View style={styles.pairRow}>
            <View style={styles.pairCol}>
              <MiniDevice shellId={switchBeat.from} themeId={liveThemeId} />
              <Text style={styles.pairLbl}>WAS · {SHELL_NAMES[switchBeat.from]}</Text>
            </View>
            <Text style={styles.pairArrow}>➔</Text>
            <View style={styles.pairCol}>
              <MiniDevice shellId={switchBeat.to} themeId={liveThemeId} />
              <Text style={[styles.pairLbl, { color: t.brand.gold }]}>NOW · {SHELL_NAMES[switchBeat.to]}</Text>
            </View>
          </View>
        ) : null}

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
                >
                  <ThemeSwatch themeId={id} />
                </DeviceItemTile>
              ))}
            </View>
            <Text style={styles.floorNote}>
              ☑ LEGIBILITY FLOOR HELD · THE SHELL STAYS {SHELL_NAMES[liveShellId]} PLASTIC
            </Text>
          </>
        ) : section === 'stickers' ? (
          <>
            <Text style={styles.secTitle}>STICKERS</Text>
            {previewing ? (
              <>
                <Text style={styles.floorNote}>
                  ☑ STICKERS RIDE THE REAL SHELL · NAV STAYS FULLY LEGIBLE
                </Text>
                <Text style={styles.secSub}>
                  Handles hidden, controls quiet — the true on-shell preview. Saved live to your device.
                </Text>
                <View style={styles.previewRow}>
                  <Text style={styles.savedLive}>SAVED LIVE</Text>
                  <View style={styles.flexSpacer} />
                  <ScreenButton label="◅ Keep editing" variant="primary" size="mini" onPress={() => setPreviewing(false)} />
                  <ScreenButton label="Done" variant="secondary" size="mini" onPress={goBack} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.secSub}>
                  Drag a decal onto the plastic — the forehead or chin. The screen &amp; the 5 keys stay clear.
                </Text>
                <StickerTray onPick={placeSticker} atCap={!canPlace(liveComposition.stickers, 'forehead')} />
                {selectedSticker ? (
                  <StickerSteppers
                    sticker={selectedSticker}
                    mutate={mutateSticker}
                    commit={commitNow}
                    onDelete={() => deleteSticker(selectedSticker.id)}
                  />
                ) : (
                  <Text style={styles.stickerHint}>
                    Tap a placed decal to select it — drag to move, the corners to scale, the stem to rotate.
                  </Text>
                )}
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
              </>
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
}: {
  children: React.ReactNode;
  onBack: () => void;
  section: DeviceSection;
  onSection: (s: DeviceSection) => void;
  railDim?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      {/* note-3 fix (owner 2026-07-10): the head had zero top padding — the "DEVICE" title sat flush to
          the screen top, jammed against the return-link. `headPad` gives it the game-page's breathing
          room (paddingTop + a gap before the link). */}
      <View style={styles.headPad}>
        <ScreenHead title="DEVICE" />
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
  headPad: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, gap: t.space.xs },
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
  stickerHint: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
    lineHeight: 13,
    paddingTop: t.space.sm,
  },
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
  savedLive: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
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
  // D2 pair
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.xl,
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.md,
  },
  pairCol: { alignItems: 'center', gap: t.space.sm },
  pairLbl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  pairArrow: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent },
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
