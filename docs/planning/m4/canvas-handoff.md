# §3.4 Canvas — the paste-once build brief (Fable session handoff)

> Written 2026-07-06 at the gate-5 exit: the Styler (§3.2) + Game page (§3.1) amendment round is
> **owner-accepted**; `m4` head `c1fb5f1`. You are a fresh Fable session building the **Canvas —
> the deep gesture editor, the hardest M4 surface**. The owning brief is
> [`m4-build-task.md`](../m4-build-task.md) **§3.4** — read it first; this file is the handoff
> context that brief can't know.

## 0 · Ground before anything
1. `CLAUDE.md` (auto) → `docs/00-INDEX.md` truth-precedence → `m4-build-task.md` §3.4 + §0 (the
   standing rules) + §4 (the Fable-stop mechanics — **spent**, the §4 architect read already ran;
   verdict GO, filed in `m4-review-notes.md`).
2. The board: `docs/design/mockups/canvas-states.html` P1–P11 (the diegetic press-shop breakout).
   Component names: `docs/design/component-map.md` (CanvasStage · AssetShelf/ElementTray ·
   LayerRack + Slip + EditBar + NumPop · ProofView · PressSheet · PrintRitual).
3. The verdict history: `docs/planning/m4-review-notes.md` (both §3.2 rounds + the gate-5
   amendment round — the exit-model and patch-correctness bug classes that WILL recur here).

## 1 · The standing process (non-negotiable, proven twice this milestone)
**Manifest-first → build → fresh murr on the diff → fresh parvati vs the manifest → 0 flags →
receipt → the owner's first-article + taste HARD STOP.**
- Write `docs/planning/m4/canvas-manifest.md` BEFORE code: element-by-element from the board,
  every PRE row carries a code cite, every deferral carries its cite (0062/M5/OQ). Interims land
  in an ADDENDUM, never silently.
- Builder ≠ verifier: murr and parvati run as FRESH subagents. parvati walks the RUNNING app vs
  the manifest (M4 calibration: divergence-from-board = 🚩).
- Receipt: `docs/planning/m4/canvas-receipt.md` + a review-notes entry. `/health` after any doc
  edit. Commit early, stage only your paths.

## 2 · Scope (m4-build-task §3.4, condensed)
The **free-asset vector editor** → **PROOF** (flattened preview via the render module) →
**SAVE-PRIVATE / TO-STYLER**. Build-order: CARD-15 is DONE (§1 spike) → the depth tails
CARD-08/09/10/11. **⟨M5?⟩ defaults hold:** PressSheet **PUBLISH** + CARD-19 publish-integrity +
CARD-20 immutability are **EXPECTED(M5)** (§0.8) — drawn-not-built under the 0062 boundary.
Risk lanes named by the brief: **gesture editing** (pull-slip · drag-Z · long-press ops ·
precision NumPop) and **the flatten at PROOF**.

## 3 · What the brief can't know (learned since it was written)
- **The entry point exists and is disabled:** the Styler tools bar's orange stepped `⤢ Canvas`
  button (`apps/mobile/app/styler/[gameId].tsx`) — wire it; it sits beside `SAVE ▸`.
- **Styler↔Canvas is ONE draft document** (CARD-24a/0066: one row, debounced autosave PATCH,
  crash-recovery by row) — AND the Styler now runs the owner-approved **two-door exit model**:
  ✕ = leave-without-keeping (a session-created row DELETEs; a resumed card REVERTS to
  `resumeSnapshotRef`, captured at open) · `SAVE ▸` = the outcome sheet. **The posture switch
  must not break these semantics**: entering the Canvas continues the same session (the snapshot
  and `userEdits`/`createdHere`/`explicitSave` state must survive the switch or move to a shared
  session holder). Two data-loss bugs shipped and were caught in this exact lane (see the §3.2
  fix rounds + murr round-2: discard-deleted-a-real-card; SAVE-AS-NEW left the original mutated).
  Extend the model, don't fork it.
- **The render module is the single draw source** (`apps/mobile/src/render/`): `buildCardElements`
  is source-agnostic (live `<Canvas>` + headless flatten consume the same tree); elements =
  rect/ellipse/poly/text at normalized 0..1 coords, **cap 30 enforced at schema AND draw**
  (CARD-15/OQ-008); `flattenComposition()` exists for PROOF. Known limit: canvaskit-web lacks
  `measureText` (text width approximated — flatten drift on text-heavy cards is an M5-entry
  ledger item; don't fight it).
- **A plate is REQUIRED** (OQ-135 ruled; 0063 §4 amended): the nameplate object (title/font/ink)
  is never stripped by any operation; legacy `shape:'none'` renders SLAB. The Canvas must not
  reintroduce a plateless/titleless face.
- **Composition schema:** the shared zod envelope is `.passthrough()` (packages/shared
  `composition.ts`) — element additions must stay inside `cardElementSchema` or bump per F21.
- **Free assets only at M4:** OQ-009 starter vector packs are owner-approved in decision 0063
  (placeable glyphs ride the title fonts; check §4). No premium, no prices, no PX — 0062.
- **Faces are display-only** (`pointerEvents="none"` on CardFace/GameCard roots) — the
  CanvasStage needs its OWN gesture surface; don't hang responders off a CardFace.
- **CARD-16 posture:** every gesture needs a non-gesture alternative eventually (§3.6 pass rides
  later) — build tap/NumPop alternatives alongside, don't retrofit.

## 4 · Environment (the traps are all runbooked — `docs/qa-runbook.md`)
- Stack: `node scripts/dev-stack.mjs up` then `doctor` — **but spawn from the firewall-allowed
  node** or the phone can't connect and Expo Go replays a stale cached bundle:
  `PATH="/c/Users/aiden.molyneaux/AppData/Local/nvm/v20.19.6:$PATH" EXPO_OFFLINE=1
  "C:/Users/aiden.molyneaux/AppData/Local/nvm/v20.19.6/node.exe" scripts/dev-stack.mjs up`
  (EXPO_OFFLINE dodges the expo-cli "Body is unusable" crash). Verify with
  `(Get-Process -Id <pid-of-:8082>).Path`.
- LAN IP is currently **192.168.68.64** (`apps/mobile/.env`) — it moves when the owner docks;
  on "phone can't connect", check `ipconfig` first, update `.env`, restart the stack.
- Web lane: :8082 only (never :8081); login `demo@ingame.app` / `InGameDemo1!`; RN-web inputs
  via `form_input` by ref; deep-link via `history.pushState` + `PopStateEvent` (a hard URL nav
  logs the web session out); hidden tabs freeze timers + screenshots (verify via a11y/JS).
- `react-native-worklets` is pinned 0.5.1 via a root npm override (Expo Go 54's native side) —
  don't "fix" the override; expo-install any new native dep and diff it against
  `node_modules/expo/bundledNativeModules.json`.
- Seed restore: `set -a; . apps/api/.env.dev; set +a; DISPOSABLE_DB=1 npm -w @ingame/api run
  db:seed-dev`.

## 5 · Stops
1. **Manifest filed** → build.
2. murr (fresh) on the diff → fix → parvati (fresh) vs the manifest → **0 flags**.
3. Receipt + review-notes + `/health` 🟢 → **HARD STOP: the owner's first-article + taste gate**
   (the Canvas is an aesthetic surface — gate-5 grade). Do not start §3.5 Device.
