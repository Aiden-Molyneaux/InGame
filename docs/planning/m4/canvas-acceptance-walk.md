# canvas — device acceptance walk (M4 §3.4 + the breakout follow-up)

> **Purpose:** the owner's gate-5 first-article acceptance of the **entire** Canvas feature, walked
> up and down on device (Expo Go / iPhone) — not just the breakout bed-paint gate. This is the
> acceptance record; it is **reusable** as the §3.5 regression spine.
> **Surface:** M4 §3.4 Canvas — the Styler's **breakout** posture (decision 0014 stage-3 · design-spec
> §2.5b). **Authority:** `canvas-manifest.md` (+ its ADDENDUM) · `canvas-states.html` P1–P11 ·
> design-spec §2.5b/§1.5 · the CARD-16 gesture↔tap pairs table.
> **Enumeration is the manifest's**, not improvised: each row cites its manifest row / board panel.
>
> **Under test:** `m4` head `d9157fb` **+ the uncommitted breakout diff** (`BreakoutContext` +
> `_layout` wrap + styler-route posture flag + `DeviceShell` chrome-hide + `CanvasSurface`
> safe-area/BackHandler/swing). typecheck ✓ · lint ✓ · 20/20 mobile ✓ (builder-reported).
> **Environment:** device via the **native** Metro on `:8081` (the dev-stack `up` only serves
> web-only `:8082`; a native lane is started separately) · API `:4000` · login
> `demo@ingame.app` / `InGameDemo1!` · test card **Elden Ring → Aurora** (`00743d17`, carries a
> bright-yellow QA rect = an unmistakable "the bed is painting" tell).
>
> **Web caveat (recorded):** on the `:8082` web preview the press bed comes up blank on first open
> until a browser-window resize — a **react-native-skia-WEB CanvasKit surface-init race** with the
> breakout relayout, **not** drivable from React. **Confirmed device-only-clear:** on native the bed
> paints on first open (2026-07-08, owner). Web is a dev-only surface (CLAUDE.md); this quirk does
> **not** gate the native ship. (Owed: fold into the manifest ADDENDUM + qa-runbook.)

**Result legend:** ⬜ not walked · ✅ PASS · 🚩 CR-nn (change request → formalized for Claude Code) ·
🎨 POLISH-nn (owner taste / visual iteration lane) · ⏭️ EXPECTED (deferred per the cited manifest
row — proceed, not a flag).

---

## 0 · Breakout — the escape (NEW follow-up · §2.5b / 0014 stage-3 · the uncommitted diff)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 0.1 | Styler tools-bar **⤢ CANVAS** → shell chrome (top-band + plastic bezel + NavBand) **falls away**; full-screen workshop | diff `DeviceShell`/styler-route · board P1 · §2.5b | ✅ (owner, device) |
| 0.2 | Enter the other door: from a **kept** card, the KeepBeat **⤢ EDIT ART** door → same breakout | manifest P1 row 2 | ⬜ |
| 0.3 | Entry beat: shell-swing edge decor renders ~1.6s then **fades** (reduce-motion = fade only) | manifest C3 · ADDENDUM entry-beat | ✅ (owner) ↦ CR-01 |
| 0.4 | Safe-area: the **◂** head clears the notch; the rack/bench clears the home-indicator (surface consumes insets) | diff `CanvasSurface` insets | ✅ (owner) |
| 0.5 | **◂** (head) → returns to the **Styler** posture; shell chrome returns; Styler picks intact | diff · manifest state-walk 1 | ✅ (owner) ↦ CR-01 |
| 0.6 | Android hardware **back** = ◂ (Android only; N/A on iPhone) | diff `BackHandler` | N/A (iOS) |
| 0.7 | **No remount:** enter → edit → ◂ to Styler → re-enter — same draft, save-line keeps ticking, no white flash/reload | ARCH one-document rail | ✅ (owner) |

## 1 · P1 — the press bed (manifest P1)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 1.1 | Bed shows **base + vector elements BARE** — no frame/plate/effect (those live only on PROOF); Aurora's yellow QA rect visible | manifest P1 row 3 | ✅ (owner, device) |
| 1.2 | Registration **corner brackets** + dashed **thumbnail safe-area** on the bed | P1 row 3 · board :424 | ⬜ |
| 1.3 | **Cap-meter "N / 30"** in gold (Aurora's real element count) | P1 row 5 | ⬜ |
| 1.4 | Top bar: **◂** · "CANVAS" · sub "«ELDEN RING» · DRAFT/PRIVATE · AUTOSAVED Ns AGO" (ticking) | manifest C2 | ⬜ |
| 1.5 | On a **bare** card: empty-rack honest state "NO SLIPS YET — ADD ONE TO START LAYERING"; editbar dim | P1 row 4 | ⬜ |

## 2 · P2 — pull · isolation · sel-ring (manifest P2)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 2.1 | **Tap a slip** → pulls (raised + accent ring + square pip); tap again releases; **one pulled at a time**; tap another switches | P2 row 1 | ⬜ |
| 2.2 | **Isolation:** other elements ghost to ~28%, pulled draws full; **"ISOLATION · ON"** chip top-right | P2 row 2 | ⬜ |
| 2.3 | **Sel-ring:** accent box + 4 cream corner handles ride the pulled element | P2 row 3 | ⬜ |
| 2.4 | **Drag body = move**, **drag corner = scale**; center-snap guides flash near x/y centre | P2 row 3 · P5 row 7 | ⬜ |
| 2.5 | **Stacked-tap:** overlapping elements select topmost; repeat-tap cycles deeper | P2 row 4 | ⬜ |
| 2.6 | **Editbar:** RESET SLIP (scoped) · UNDO · REDO; dim when nothing to undo | P2 row 6 | ⬜ |
| 2.7 | **Bench row:** + ADD A SLIP · EDIT THIS SLIP (disabled unless pulled) · 👁 PROOF · **PRESS ▸** (gold) | P2 row 7 | ⬜ |

## 3 · P3 — ADD (the AssetShelf drawer · manifest P3)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 3.1 | **ADD A SLIP** raises the drawer over the **dimmed** bed; head "ADD A SLIP — ALL FREE" | P3 rows 1–2 | ⬜ |
| 3.2 | Categories **SHAPES · LETTERS · NUMBERS · ICONS · BASE · ★** (active pip); ★ favourites **disabled**, no search | P3 rows 3–4 · ADDENDUM | ⏭️/⬜ |
| 3.3 | **SHAPES** grid ~13 (square·rounded·circle·ellipse·triangle·pentagon·hexagon·octagon·star·diamond·line·heart·arrow) | P3 row 5 | ⬜ |
| 3.4 | **ICONS** = the 20-real subset (star·bolt·crown·heart·ring·moon·invader·arrow·trophy·sword·shield·potion·coin·flame·crosshair·dpad·joystick·flag·sparkle·medal) | ADDENDUM "Icons 20 real" | ⬜ |
| 3.5 | **LETTERS** A–Z + **ADD TEXT…** (typed text slip); **NUMBERS** 0–9 | P3 row 6 | ⬜ |
| 3.6 | **BASE** row solid/gradient swatches; picking **patches base** (not an element) | P3 row 7 | ⬜ |
| 3.7 | A picked glyph **lands on the bed pulled**, sheet closes, **cap ticks** | P3 row 8 | ⬜ |
| 3.8 | (If near cap) at **30/30** the meter reds + picks disable | P3 row 8 · P5 row 8 | ⬜ |

## 4 · P4 — the EDIT slip-sheet (manifest P4)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 4.1 | **EDIT THIS SLIP** raises the 2nd drawer; the bed stays **LIT in isolation above** — **no scrim-dim on the work** | P4 row 1 | ⬜ |
| 4.2 | Head "THE «NAME» SLIP" + kind meta | P4 row 2 | ⬜ |
| 4.3 | **OPACITY** slider moves the element opacity live | P4 row 3 | ⬜ |
| 4.4 | **FILL** palette + in-card **used-colours** row + **SOLID/GRADIENT** toggle (gradient → **STOP 2**/fill2 live) | P4 row 4 | ⬜ |
| 4.5 | **STROKE** none/thin/thick (+ ink row) · **GLOW** on/off · **BLEND** normal/screen/multiply | P4 row 5 | ⬜ |
| 4.6 | **MORE:** FLIP ↔ · FLIP ↕ · **RADIUS (rect only** — absent on non-rect) · DUP · DELETE | P4 row 6 | ⬜ |
| 4.7 | **Text slip** sheet: content editable · **FONT** CHAKRA/PAYTONE · **CURVE** none/**ARC** | P4 row 7 | ⬜ |

## 5 · P5 — ops · precision · cap (manifest P5)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 5.1 | **Long-press** a slip → the **ops row** (twin: the pulled slip's **⋯ badge** opens it) | P5 row 1 | ⬜ |
| 5.2 | Ops: **RENAME** (inline) · **LOCK** · **HIDE** · **DUPLICATE** · **DELETE** (danger, undo-covered, no ConfirmSheet) | P5 row 2 | ⬜ |
| 5.3 | **GROUP** present-but-**disabled** | P5 row 3 · ADDENDUM | ⏭️/⬜ |
| 5.4 | **◂ ▸ MOVE** ops (non-gesture Z-reorder twin) | P5 row 4 | ⬜ |
| 5.5 | **Drag-Z:** long-press-drag a slip L/R reorders; **Z-order = rack order** (visible on bed) | P5 row 5 | ⬜ |
| 5.6 | **NumPop:** X·Y op → popover **X/Y/W/H/ROT** steppers + **tap-to-type**; live readout while dragging | P5 row 6 | ⬜ |
| 5.7 | **LOCK** refuses **both** bed-drag **and** NumPop steppers; **HIDE** removes from bed (still pullable via rack) | P2 row 5 | ⬜ |

## 6 · P6 — PROOF (manifest P6)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 6.1 | **Hold 👁 PROOF** (momentary) → the true print stamps: flatten + **closed attributes live** (frame · plate · effect/finish overlays) | P6 row 1 | ⬜ |
| 6.2 | **Tap** toggles PROOF on/off (the non-hold twin) | P6 row 2 | ⬜ |
| 6.3 | **Size ladder** CELL·96 · MINI·64 · THUMB·48; **plate legible at 96, dropped at 64/48** | P6 row 3 | ⬜ |
| 6.4 | Ladder hint "what you proof is what the shelf, top lists & rows show" | P6 row 4 | ⬜ |
| 6.5 | Top-bar sub reads **"· PROOFING"** during; returns to AUTOSAVED on lift | P6 row 5 | ⬜ |
| 6.6 | **No server call** during proof (client flatten) | manifest data-seams | ⬜ |

## 7 · P7 — PRESS (the finish-up sheet · manifest P7)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 7.1 | **PRESS ▸** raises the finish-up sheet over the dimmed bed; head "THE PRESS — WHERE DOES IT GO?" | P7 rows 1–2 | ⬜ |
| 7.2 | **◆ PUBLISH** present-but-**DISABLED** (gold) + "arrives with the community release" sub | P7 row 4 (⏭️ M5) | ⏭️ |
| 7.3 | **SAVE PRIVATE** → flush + save-private + back to the **Game page**; card lists **PRIVATE** | P7 row 5 | ⬜ |
| 7.4 | **TO THE STYLER** → posture back (session continues; **nothing written**) | P7 row 6 | ⬜ |
| 7.5 | **CANCEL** → sheet closes, editing continues | P7 row 7 | ⬜ |
| — | CARD-19 checklist (P7 row 3) + P8 PrintRitual = **EXPECTED(M5)** — not present, not a flag | P7 row 3 · P8 | ⏭️ |

## 8 · Exit model + autosave (the load-bearing invariants · manifest state-walks 3/4/7/8)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 8.1 | Canvas edits count as **userEdits** → ✕ (in Styler, after canvas work) **confirms before discarding** | state-walk 8 | ⬜ |
| 8.2 | **Resumed** card: canvas-edit → ◂ → ✕ → DISCARD → **REVERTS** to open-snapshot (deleted element restored) | state-walk 8 · D.23 | ⬜ |
| 8.3 | Session-created **never-kept zero-edit** draft **evaporates** on ✕ (no orphan) | state-walk 8 | ⬜ |
| 8.4 | **KEEP rebaselines:** after KEEP, re-enter via EDIT-ART, ✕ **never deletes** the kept card | ADDENDUM KEEP-rebaselines | ⬜ |
| 8.5 | **Autosave:** each mutation fires the debounced PATCH ("SAVING…" → "AUTOSAVED 0S AGO"); save-line honest | manifest C4 | ⬜ |
| 8.6 | Session **survives** a full reload + re-login + resume (same composition) | CARD-24a | ⬜ |

## 9 · Lifecycle (EXPECTED — verify no crash)

| # | Do → expect | Cite | Result |
|---|-------------|------|--------|
| 9.1 | P9/P10 loading/error **subsumed** by the Styler lifecycle (the posture switch fetches nothing) | P9–P11 row 1 (⏭️) | ⏭️ |
| 9.2 | P11 **offline** = EXPECTED(SYS-10); PROOF from cache, autosave soft-fails "NOT SAVED — RETRYING" | P9–P11 row 2 (⏭️) | ⏭️ |

---

## Change requests captured (→ formalized for Claude Code)

The owner did a **full self-walk** of the entire feature (2026-07-08) and surfaced **23 change
requests**, formalized + triaged in **[`canvas-gate-notes.md`](canvas-gate-notes.md)**. All 7
open decisions were **RULED by the owner same-day**. Shape of the batch:

- **FIX (build as stated):** CR-02 copy · CR-03 cap-meter orange · CR-04 15s save-tick (Styler too) ·
  CR-06 drag-Z held-slip highlight · CR-07 bigger ADD tiles · CR-12 ops-row close · CR-13 lock glyph ·
  CR-14 PROOF 👁→glyph (hold-only rejected) · CR-15 hide editbar in PROOF · CR-16 drop bottom hints ·
  CR-18 drop PRESS CANCEL · CR-19 drop selected-slip pip · CR-22 game-page 3-up revert.
- **DESIGN (buildable from the note):** CR-05 toggle isolation · CR-09 add→open EDIT · CR-11
  colourpicker+hex everywhere · CR-20 cross-posture save disclaimer.
- **RULED (owner decided; carry the ruling into build):** CR-01 **zoom REPLACES** the cabinet-swing ·
  CR-08 base = field-backed **pseudo-slip** · CR-10 **TRANSFORM drawer** (subsumes NumPop) · CR-17
  SAVE-PRIVATE gold + **lighter** press beat · CR-21 **copy-on-write** crash-draft (STOP-and-file →
  spec-owner) · CR-23 canvas presets → **M5** (file OQ).

**Blocks the branch-A close:** CR-01 supersedes the uncommitted breakout diff → do **not** commit it
as-final; murr/parvati + the manifest C1/ARCH fix run on the reworked **zoom** impl, not the chrome-hide.

## Polish / taste notes (iteration lane)

_None yet._

## Walk log

- **2026-07-08** — device acceptance opened. Pre-gate on device (owner): **0.1 shell falls away ✅** ·
  **1.1 bed paints ✅** (Aurora yellow QA rect visible). Web bed-blank confirmed rn-skia-web-only.
  Native Metro `:8081` + API `:4000` up (durable via `Start-Process`). Walking sections 0→9 next.
- **2026-07-08** — owner ran a **full self-walk** of the entire feature and returned **23 change
  requests** across §0–P7 + Misc → triaged in `canvas-gate-notes.md`. §0 breakout + §1 bed + P7
  PRESS pass functionally; the rest is CR-driven. Direction change on the breakout (CR-01: zoom, not
  chrome-hide) → the shipped follow-up is superseded, not committed.
