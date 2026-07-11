# §3.4 Canvas — device-walk iteration handoff (paste-once, for a fresh Claude Fable session)

> You (Fable) are taking over the **M4 §3.4 Canvas** iteration. A prior Claude Code (Opus) session
> built the entire §3.4 gate-5 fix pass **plus two rounds of owner device-walk refinements** — all
> **uncommitted** on branch `m4`. Your job: **(1) ground in that work and review it, (2) take the
> owner's fresh in-app notes as your change list, (3) implement, (4) run fresh murr + parvati to 0
> flags, (5) receipt + HARD STOP.** You are a fresh session and the **spec-owner** for this pass.
> **Ground before touching anything.**

## 0 · The one thing to understand first
This is **not a greenfield build** and **not a fresh gate**. There is a large, coherent, **uncommitted**
body of work in the tree (58 files) that already answers the owner's earlier notes and passed murr +
parvati. **The owner is now giving you a NEW batch of in-app notes.** Treat those notes exactly like the
previous rounds were treated: triage → formalize any spec ripple → build → verify. Do **not** rewrite or
revert the existing work unless a note tells you to — extend it. Read the existing work first so you don't
re-solve solved problems or break a load-bearing invariant.

## 1 · Ground first (read in this order)
1. `AGENTS.md` / `CLAUDE.md` → `docs/00-INDEX.md` — truth-precedence + the **change protocol §4**
   (owning-doc-before-build; stable IDs; version bump + changelog + the §1 register).
2. **`docs/planning/m4/canvas-receipt.md`** — the GATE-5 FIX PASS section (top) is the map of everything
   built. Read it before the code.
3. **`docs/planning/m4/canvas-manifest.md`** — the surface contract. **The corrected C1/C3/ARCH rows +
   the "GATE-5 REVISION ADDENDUM" + the "DEVICE-WALK ROUND 2" note govern** (the original 2026-07-06 body
   is superseded where those say so).
4. `docs/planning/m4/canvas-gate-notes.md` — the owner's 23-CR ledger (round 0). `docs/decisions/0067-canvas-gate5-acceptance-batch.md` — the rulings + rationale (esp. **§2 copy-on-write**, the data-model change).
5. `docs/planning/m4-review-notes.md` — the verdict history. Read the **§3.4 gate-5 fix pass**, the
   **device-walk round 1** (parvati), and the **device-walk round 2** (parvati 8/8 + murr) entries — they
   name the **exit-model / copy-on-write data-loss** and **patch-correctness** bug classes that WILL recur.
6. `docs/design/design-spec.md` **§2.5b** + §1.5 Canvas set (the §2.5b "Gate-5 acceptance batch" + "Gate-5
   iteration" notes) · `docs/design/component-map.md` (ColorField/TransformDrawer/base rows).
7. The board: `docs/design/mockups/canvas/canvas-states.html` (P1–P11) — the print-shop grammar (note the
   owner has since **superseded** several drawn behaviours; the docs above win over the board where noted).

## 2 · Current state — what's built (all uncommitted on `m4`, head `d9157fb`)
The whole §3.4 Canvas + three iteration rounds. Key pieces + their files:

**Session / data (the load-bearing, murr-hammered lane):**
- **CR-21 copy-on-write** (decision 0067 §2 — the **data-model change awaiting the owner's sign-off**).
  Editing a committed (private) card spins a **draft copy** on the first edit (`card_designs.derived_from_card_id → origin`, additive nullable FK `ON DELETE SET NULL`, migration **0006**); autosave targets the copy; **KEEP** commits copy→origin + deletes the copy; **SAVE AS NEW** forks; **✕** deletes the copy; a crash leaves the copy as a resumable DRAFT, the original pristine. Server: `apps/api/src/db/schema.ts`, `card-service.ts` (`createDraft` validates the origin own+same-game), `card-repo.ts`, `packages/shared/src/schemas/{request,response}/cards.ts` (product-spec 0.53, api-contract 0.54). Client: `apps/mobile/app/styler/[gameId].tsx` — the session machinery: `ensureEditableCopy`, `copyInflightRef`/`originRef`/`copyingRef`, and **every exit/save path (`keep`/`savePrivateQuiet`/`keepAsDraftExit`/`saveAsNew`/`discardDraft`) awaits `copyInflightRef` then reads the HOT `cardRef` (not the stale `cardRow` closure)** — this is the fix for the in-flight-copy race murr caught. `flushSave` no-ops on a non-draft row; `patchDraft` routes committed rows through `ensureEditableCopy` not `scheduleSave`. **Do not disturb this without re-running murr on it.**
- The **two-door exit model** (✕ revert-to-snapshot / session-delete · SAVE ▸ outcome sheet) is unchanged for the DRAFT-edit path; copy-on-write only *adds* the committed-card path.

**Canvas surface (the owner's device-walk shape):**
- **Breakout = a ZOOM** (`DeviceShell.tsx`): a **dip-through-`scr.bg` cross-dissolve** that masks the framed↔full-bleed layout swap (the cover is a **sibling** of `{children}` — the `/styler` route + rn-skia bed NEVER remount; that is the CARD-24a no-remount invariant). Native-only; web skips it (rn-skia-web compositing quirk). `BreakoutContext.tsx` carries a boolean.
- **Drawers → a BOTTOM PANEL** (`CanvasSurface.tsx`): ADD/EDIT/TRANSFORM render **inline** below the card (card stays visible/undimmed) via an `inline` prop on `AssetShelf`/`EditSlipSheet`/`TransformDrawer`; **PRESS stays a `PulledSheet` drawer**. One mode at a time (`panelMode`), with a ✕ back to the bench.
- **Base = a slip IN the rail** (`LayerRack.tsx` `BaseRailSlip`): non-deletable, colour-only EDIT (`EditSlipSheet` `baseMode`). Not an element — no cap/Z/ops/drag.
- **Colour = `ColorField`** (`ColorPicker.tsx`): picker CLOSED by default (last-10 recents + PICK button + a **FROM-CARD pipette** eyedropper that grabs a colour already on the card). Recents commit on discrete picks + a debounce on the inner picker. `IntensitySlider` gained a `valueText` prop (rotation shows `°`, sizes show size-%).
- **Transform** (`TransformDrawer.tsx`): **4 direction arrows only** (press-and-hold repeats ~70ms via a `setInterval` + latest-ref; cleaned up on press-out/close/unmount) + **W/H sliders** + a **rotation SLIDER** + a **RESIZE BOX on/off** toggle (`CanvasStage.tsx` `showHandles` gates both the corner handles AND the corner-scale hit-test). `NumPop.tsx` was **deleted** (subsumed). Flip buttons use **drawn glyphs** (no emoji).
- The rest of the 23 CRs (cap-meter orange, PROOF glyph, editbar-hidden-in-PROOF, hints/pip/CANCEL removed, drag-Z held highlight, etc.) — see the manifest ADDENDUM.

**Docs rippled:** product-spec 0.53, api-contract 0.54, design-spec 0.53, component-map 0.5, decision 0067, OQ-139 (resolved), OQ-140 (canvas presets → M5), OQ-141 (copy-POST idempotency edge, deferred), OQ-007 re-resolved, the manifest, receipt, review-notes. `/health` is 🟢. There may also be an owner-in-progress file or two in the tree (e.g. `apps/mobile/src/render/animated.tsx`) — review the full `git status`/`git diff HEAD` so nothing surprises you.

## 3 · The load-bearing invariants (do NOT break — murr will hunt these)
1. **Autosave never PATCHes a committed (private) row.** The copy is the only autosave target. The original survives a crash. (CR-21.)
2. **The `/styler` route + rn-skia bed never unmount** across the posture switch — the zoom animates a transform / masks a swap; `{children}` is one node in one slot. (CARD-24a.)
3. **One document, two-door exit** — ✕ on a resumed DRAFT reverts to snapshot; a session-created zero-edit draft evaporates; a copy-on-write copy is deleted on ✕ (origin untouched); KEEP rebaselines.
4. **Patch-correctness** — a pick/edit patches ONLY its own slot; base recolour patches `composition.base` only; the base rail-slip must not corrupt the elements/pull/reorder index math.
5. **Bottom-panel mode exclusivity** — exactly one of bench/add/edit/transform/base shows; no orphaned overlay renders.
6. **Timer hygiene** — the hold-to-repeat interval + the recents debounce clear on unmount/close.

## 4 · The workflow for this pass
1. **Ground** (§1) + **review** the existing work against the docs (spot-audit the manifest vs the code; run `git diff HEAD`). You are the reviewer-of-record before you change anything.
2. **Take the owner's in-app notes** (they will give them to you). Triage each per 00-INDEX §4: behaviour/data → product-spec (+ api-contract); pure look/flow → design-spec. **Formalize any spec/data ripple FIRST** (owning doc → stable ID → version bump + changelog + §1 register → `/health` 🟢). Anything touching **auth / SYS-01 / economy / IAP / destructive-migration / the CR-21 data-model** is **STOP-and-file** before build.
3. **Build** to the manifest. Compose from `component-map`; don't fork. Match the surrounding style (theme.* tokens, F-07 square, on-screen type 21/15/11/9, **no emoji in UI**).
4. **Verify (builder ≠ verifier):**
   - **Fresh murr** — a fresh-context adversarial code-review **subagent** (not a skill) on `git diff HEAD` + the untracked new files. Point it at the lanes in §3 above (the copy-on-write/exit data-loss class is the #1 target) + whatever the owner's notes touch. Fix to **0 blockers/majors**.
   - **Fresh parvati** — the **`parvati` skill**, on the **running `:8082` web preview** (it is fixable/up — see §5). Review the running app vs the manifest + the owner's directives. Route → **0 flags**.
   - typecheck / lint / unit / integration / mobile all green; `/health` 🟢 after doc edits.
5. **Receipt + HARD STOP.** Update `canvas-receipt.md` + `m4-review-notes.md`; restore the seed (`db:seed-dev`) if a walk churned it. **Commit only when the owner asks** (feature branch → green CI → self-merge; **never direct-to-main**; docs + code separate, IDs cited). **Do NOT start §3.5 Device.**

## 5 · Environment — READ THIS (the preview is now FIXED)
- **The web preview `:8082` works.** The prior "metro crash" was a Windows cascade-kill, not a real crash. `EXPO_OFFLINE=1` is now **baked into `scripts/dev-stack.mjs` `startDetached`**. Bring the stack up and, if `:8082` won't stay up under the bash tool, **launch it detached via PowerShell** (`Start-Process -WindowStyle Hidden node scripts/dev-stack.mjs up`) and poll `:8082` for HTTP 200 (~2 min first bundle). **This is how parvati views the screen.** The `up` prewarm may log a non-fatal SSR `window is not defined` — ignore it.
- **`node scripts/dev-stack.mjs up` then `doctor`** (decisions 0060/0065). QA friction → the **doctor-nick** skill + `docs/qa-runbook.md` (recent entries: the metro-cascade fix; **don't `resize_window` mid-walk on the skia surface** — use a fresh tab + re-login; the rn-skia-**web** bed comes up blank until a viewport nudge — **native paints on first open**, owner-verified).
- **Device tests need a NATIVE Metro on `:8081`** (dev-stack `up` only serves web `:8082`) — start it under the firewall-allowed node `C:/Users/aiden.molyneaux/AppData/Local/nvm/v20.19.6/node.exe`, detached via PowerShell `Start-Process -WindowStyle Hidden`; point Expo Go at `exp://<LAN-IP>:8081`. LAN IP is in `apps/mobile/.env` (gitignored; moves on dock).
- **Migration 0006 is applied to the dev DB** and the live API `:4000` serves the new schema (verified with an end-to-end copy-on-write POST). API `:4000` is shared + restart-safe; `dev:local` is `tsx watch` (hot-reloads app src) — but a **shared-schema change needs an API restart** (kill the real `:4000` owner via `Get-NetTCPConnection -LocalPort 4000` + `dev-stack up`; the pidfile can be stale). Login `demo@ingame.app` / `InGameDemo1!`. Seed: `set -a; . apps/api/.env.dev; set +a; npm -w @ingame/api run db:seed-dev` (idempotent; restores Aurora private+equipped).
- Suite: `npm run typecheck` · `npm run lint` · `npm test` (unit+integration, ~2min Testcontainers) · `cd apps/mobile && npx jest`.

## 6 · Rails (non-negotiable)
Ask-don't-assume (when unattended, pick the reasonable interpretation + record it) · **STOP-and-file** for the CR-21 data-model + auth/SYS-01/economy/IAP/destructive-migration · reference behaviour by stable ID · manifest-first · **builder ≠ verifier** (fresh murr + parvati) · **0 flags** · owner **HARD STOP** for taste · **commit only when asked**.

## 7 · Owner decisions still owed (surface these, don't silently resolve)
- **CR-21 `derived_from_card_id` data-model sign-off** (decision 0067 §2) — the one migration; the owner is reviewing the copy-on-write behaviour.
- **The zoom feel** and the **reworked-surface taste** are the owner's **native** gate-5 call (web can't show the native zoom).
- **OQ-141** (copy-POST idempotency edge) is deferred; **OQ-140** (canvas presets) is M5; **OQ-137** (Styler title-ink free-pick) stays M5 — CR-11's picker serves Canvas element colours only.
- Nothing is committed. The owner has NOT signed off on the reworked Canvas yet — this is mid-iteration.
