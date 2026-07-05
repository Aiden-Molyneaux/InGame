# M3 Acceptance Walkthrough — session handoff (resume at Step 4)

> **You are a fresh session picking up an in-progress manual device acceptance pass with the owner
> (Aiden), on a physical iPhone via Expo Go.** Read this whole file first. Steps 0–3 are done; resume
> at **Step 4 (Add-a-game)** using the suite in [`m3-acceptance-suite.md`](m3-acceptance-suite.md).
> Keep the exact format: present each step, **tag every UI element** (see below), collect the owner's
> notes as `S{step}-{letter}`, then at the end **clean up the combined list and build a Parvati
> iteration-lane punch-list.**

## The tag system (use it on every element)
- ✅ **POLISHED** — real + owed by M3; a reference surface. *Judge it.*
- 🎨 **POLISH-LANE** — real, visual/DS refinement expected.
- 🏗️ **STUB** — intentional placeholder, deferred; leave it.
- ⛔ **NOT YET** — later milestone; expect nothing.

DS lens for ✅ items: **F-06** type 21/15/11/9 · **F-02** gold = acquisitive only · **F-05** pink = shell
LED only · **F-07** on-screen square, radius on the shell · **F-08** one font per surface.

---

## Environment — you MUST restart the API (it dies with the prior session)

The API server ran in the *previous* session's background and stops when that session ends. Restart it:

```bash
DATABASE_URL='postgresql://ingame:ingame@localhost:5432/local_ingame' \
  JWT_SIGNING_SECRET='ingame-local-dev-signing-secret-0001' NODE_ENV='development' \
  npm -w @ingame/api run dev        # run in background
```
- Dev DB `ingame-dev-db` (postgres:16-alpine) runs in Docker; migration **0004 is applied**, data seeded.
- If the phone can't reach it, the phone targets `http://192.168.68.58:4000` (this machine's WiFi IP,
  set in `apps/mobile/.env`); confirm the machine still owns that IP.
- **Demo account:** `demo@ingame.app` / `InGameDemo1!` — 12-game shelf, Elden Ring = now-playing,
  Hades = favourite. Use it for anything needing populated data (hero, stats, search).
- **Dev-env gap to note:** the API has **no `.env` loader**, so `DATABASE_URL`/`JWT_SIGNING_SECRET`
  must be supplied by hand every run. Worth a small fix (a follow-up item, not part of this pass).

## Git / project state
- M3 is committed at **`a83f20b`** on branch `m3` (89 files), **unpushed** — the owner is holding the
  push until the device gates pass, then: land m2 PR #5 → rebase/push m3 → PR → merge.
- The acceptance-suite + this handoff are **untracked** working-tree docs (QA aids, separate from the
  m3 code commit).
- Full six-check spine was green at `a83f20b`: unit 135 · integration 106.

---

## Notes captured so far (Steps 0–3) — carry these into the final cleanup

### Step 1 — Device shell
- **S1-a** — top bar (engraving + grille): nudge **up ~¼ cm**. `[polish]`
- **S1-b** — bottom nav bar: nudge **down ~¼ cm**. `[polish]`
- **S1-c** — nav keycaps render **flat on native**: the raised "physical key" depth uses a CSS-style
  **box-shadow** that RN native ignores. `NavKeycap` needs real RN shadow props (iOS
  `shadowColor/Offset/Radius/Opacity`, Android `elevation`). `[polish]`
- **S1-d** — **DISCOVER + PROFILE** labels: **a couple px higher**. `[polish]`
- **S1-e** — the **Welcome/Auth (sign-in) hero** is missing its mockup content: **3 example cards +
  their designer credits**, the **catalog / hours-logged metrics**, and the **copy differs** from the
  mockup. `[design-owed — §4.13]`

### Step 2 — Register / sign-in
Main sign-in / Welcome & Auth (reconcile against §4.13 Draft-A mockup + the auth-state matrix in
design-spec):
- **S2-g** — "Create account" should be a **text link**, not a full button. `[polish/design]`
- **S2-h** — add a **"Forgot?"** affordance on the password field (AUTH-04 reset). `[functional-owed]`
- **S2-i** — add a placeholder **"Sign in with Apple"** button on Apple devices (AUTH-03 stub; real
  SIWA is enrollment-deferred). `[functional-owed]`
- **S2-j** — add a **password-value show/hide toggle** (mask ↔ plaintext of the typed value, not the
  field). `[functional-owed]`
Register / create-account:
- **ACCEPTED DIVERGENCE** — the centered form over the hero differs from the mockup but the owner is
  **keeping it**. Do not "fix."
- **S2-a** — Create account should also stay **disabled when email/username/password are empty** or
  **any field is erroring** (today it only gates on the checkbox). `[functional]`
- **S2-c** — availability copy is **context-dependent**: **"not available"** when taken; keep a
  **"not allowed"**-style message only when **screened/reserved**. `[copy]`
- **S2-e** — the **"Must be a valid email address"** field-error text is **too small** for the DS. `[polish]`
- **S2-f** — clear a field's **error state as the user types** in it (also restores the username
  availability line). `[bug]`
- **S2-d** — profanity/explicit-language **screening on username (and email?)** → **PARKED** (MOD-07 /
  later). `[parked]`
Legal screens:
- **S2-b** — the **‹ BACK** link should sit **under the screen title**, not above it. `[polish]`

### Step 3 — Collection
Scope:
- **S3-a** — the **per-game action surface is unwired** in the M3 client (set now-playing, log-hours-
  anywhere, change-status-after-add, remove); tapping a card is inert (no Game page). The RTK hooks
  (`setNowPlaying`/`updateEntry`/`removeEntry`) exist but only LOG HOURS (hero-only) is wired.
  **DECISION (owner): defer the whole surface to the Game page @ M4.** Accepted M3 limitation: the M3
  collection is **display + add + hero-only log-hours**. The Game page must be **slotted into the M4
  entry plan** (it is currently in no milestone — see the phase-coverage audit). `[deferred → M4]`
Drawer (`PulledSheet`):
- **S3-b (BIG)** — the drawer opens from the **bottom of the iPhone**, escaping the device frame; it
  must open from the **bottom of the in-app screen** (it is a root Modal → render within the screen
  area). Affects every sheet. `[bug/architectural]`
- **S3-c** — drawer look differs from the collection-states mockup; the **orange-button version is
  accepted for now** (not an M3 redesign item; may get a design pass later). `[accepted]`
- **S3-d** — the **TOP** view chip → **"TOP 10"** (explicit). `[polish/copy]`
- **S3-f** — the **Status** section needs an **"All"** option. `[functional]`
- **S3-g** — the **Genre** section needs an **"All"** option. `[functional]`
- **S3-h** — the standalone **ASC/DESC** button in the drawer isn't needed there (fold direction into
  the Sort tool button, S3-i). `[design]`
Tools-bar:
- **S3-i** — the **Sort** tool button should indicate **asc/desc** when a sort is active. `[functional/polish]`
- **S3-k** — the **Filter** tool button should show an **orange pip** when filters are active. `[polish]`
- **S3-n** — the tools buttons (search/sort/filter/view) should be **icon-only, no labels**, using the
  **mockup icons** (`ToolButton` currently shows glyph + label). `[design]`
- **S3-o** — the gold **ADD (+)** button should be **larger**. `[polish]`
- **S3-p** — the **ADD button needs the top-left + bottom-right pixel-stepped corners** (F-02 GameCard
  signature, `theme.step`, decision 0041); today it's a plain square gold button. `[DS]`
Count chip:
- **S3-j** — change **"N OF M"** (always filtered-of-total today, so unfiltered reads "20 OF 20") →
  **"N game(s)"** when unfiltered, **"N of M games"** when a filter is active; singular-aware. `[polish/copy]`
Log Hours:
- ✅ the empty-entry **save-guard works** (won't zero-wipe).
- **S3-l (BIG)** — focusing the hours field, the **open drawer/keyboard covers it** — the input must
  **rise above the keyboard** (KeyboardAvoiding within the framed sheet). Pairs with S3-b. `[bug]`
- **S3-m** — **pre-fill the hours field with the current value** (e.g. 11) rather than showing "11" as
  a placeholder over an empty field, so Save-as-is keeps it and *clearing* is what triggers the error.
  `[UX — refines the empty-guard]`

### Walkthrough decisions (locked with the owner)
- Count chip (Q1): unfiltered `"N games"`, filtered `"N of M games"`.
- Log Hours (Q2/S3-m): pre-fill the current value.
- Drawer look (Q3/S3-c): orange accepted for now.
- Game page (Q4/S3-a): **deferred to M4**; slot it in the M4 entry plan; M3 collection limitation accepted.
- Welcome/Auth (Q5): **split** — auth affordances (S2-g/h/i/j) = polish/do; the hero (S1-e) = design-owed.
- Screening (Q6/S2-d): **parked**.

### Correction to the suite
The suite's **Flow 3 is wrong** — it assumes a set-now-playing UI that doesn't exist. Use the
"corrected Step 3" behavior above (per-game actions are deferred; hero + LOG HOURS only reachable on
the seeded demo). Update the suite doc when convenient.

---

## Resume here — Step 4 onward
Continue the suite: **Step 4 (Add-a-game)** → **Step 5 (Profile)** → the shell/DS polish pass. Present
each with the tag system, capture notes as `S4-x`, `S5-x`, then:
1. **Clean up** the full `S{n}-x` list with the owner (dedupe, confirm categories:
   `polish / design-owed / bug / functional / DS / parked / deferred`).
2. **Build the Parvati punch-list** (the iteration-lane deliverable) from the cleaned list, grouped by
   surface, so the reference surfaces are polished before M4 opens.
