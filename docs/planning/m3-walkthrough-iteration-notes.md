# M3 acceptance walkthrough — combined iteration notes (Steps 1–4)

> Handoff draft for the client-iteration agent. Source: owner device pass on a physical iPhone
> (Expo Go), Steps 0–3 across the prior sessions + **Step 4 (Add-game) 2026-07-03**. Organised **by
> step** (as captured) — the dedup / regroup-by-surface + the Parvati punch-list come after the
> walkthrough finishes. IDs are preserved verbatim (lettering gaps are intentional; do **not**
> renumber). Canonical mockups referenced inline.
>
> Tags: ✅ real+owed (reference) · 🎨 build/refine now (iteration lane) · 🐛 bug · 🏗️ intentional stub ·
> ⛔ later-milestone, do **not** build now · ⚠️ milestone reconciliation (read the note) ·
> **(BIG)** = large/architectural.

## Locked owner decisions (these modify the notes below — honour them)
- **Count chip copy** (S3-j): unfiltered → **"N game(s)"**, filtered → **"N of M games"** (singular-aware).
- **Log Hours** (S3-m): **pre-fill the current value**.
- **Drawer look** (S3-c): the **orange-button version is accepted for now** — not an M3 redesign.
- **Game page / per-game actions** (S3-a): the whole per-game action surface is **deferred to the Game
  page @ M4**. M3 collection = **display + add + hero-only LOG HOURS**. (Audit slots the Game-page hub
  shell into M4.) **Accepted M3 limitation — do not build a stopgap host.**
- **Welcome/Auth** (Q5): **split** — the auth affordances (S2-g/h/i/j) are polish/do-now; the hero
  content (S1-e) is design-owed.
- **Username screening** (S2-d): **parked** (MOD-07 / later).
- **Register form divergence:** the centered form over the hero differs from the mockup but the owner
  is **keeping it** — do **not** "fix."
- **Suite Flow 3 correction:** the suite assumed a set-now-playing UI that doesn't exist; per-game
  actions are deferred (see S3-a). Hero + LOG HOURS are only reachable on the seeded demo shelf.

---

## Step 1 — Device shell
- **S1-a** 🎨 — Top bar (engraving + grille): nudge **up ~¼ cm**.
- **S1-b** 🎨 — Bottom nav bar: nudge **down ~¼ cm**.
- **S1-c** 🎨 — Nav keycaps render **flat on native**: the raised "physical key" depth uses a CSS-style
  **box-shadow** that RN native ignores. `NavKeycap` needs real RN shadow props (iOS
  `shadowColor/Offset/Radius/Opacity`, Android `elevation`).
- **S1-d** 🎨 — **DISCOVER** + **PROFILE** labels: a couple px **higher**.
- **S1-e** 🎨 design-owed — the **Welcome/Auth (sign-in) hero** is missing its mockup content: **3
  example cards + designer credits**, the **catalog / hours-logged metrics**, and the **copy differs**
  from the mockup. Ref §4.13 (Welcome & Auth board).

## Step 2 — Register / sign-in
**Main sign-in / Welcome & Auth** (reconcile against §4.13 Draft-A + the design-spec auth-state matrix):
- **S2-g** 🎨 — "Create account" should be a **text link**, not a full button.
- **S2-h** 🎨 functional-owed — add a **"Forgot?"** affordance on the password field (AUTH-04 reset).
- **S2-i** 🎨 functional-owed — add a placeholder **"Sign in with Apple"** button on Apple devices
  (AUTH-03 stub; real SIWA is enrollment-deferred).
- **S2-j** 🎨 functional-owed — add a **password show/hide toggle** (mask ↔ plaintext of the typed
  value, not the field).

**Register / create-account:**
- **S2-a** 🎨 functional — Create account should also stay **disabled when email/username/password are
  empty** or **any field is erroring** (today it only gates on the checkbox).
- **S2-c** 🎨 copy — availability copy is **context-dependent**: **"not available"** when taken; keep a
  **"not allowed"**-style message only when **screened/reserved**.
- **S2-e** 🎨 — the **"Must be a valid email address"** field-error text is **too small** for the DS.
- **S2-f** 🐛 — clear a field's **error state as the user types** in it (also restores the username
  availability line).
- **S2-d** ⛔ parked — profanity/explicit-language **screening on username (and email?)** → parked
  (MOD-07 / later).

**Legal screens:**
- **S2-b** 🎨 — the **‹ BACK** link should sit **under** the screen title, not above it.

## Step 3 — Collection
**Scope:**
- **S3-a** ⛔ deferred → M4 — the **per-game action surface is unwired** (set now-playing,
  log-hours-anywhere, change-status-after-add, remove); tapping a card is inert (no Game page). RTK
  hooks (`setNowPlaying`/`updateEntry`/`removeEntry`) exist but only **hero-only LOG HOURS** is wired.
  **Deferred to the Game page @ M4** (accepted M3 limitation; the Game page must be slotted into the
  M4 entry plan — see the phase-coverage audit).

**Drawer (`PulledSheet`):**
- **S3-b** 🐛 **(BIG)** — the drawer opens from the **bottom of the iPhone**, escaping the device
  frame; it must open from the **bottom of the in-app screen** (it is a root Modal → render within the
  screen area). **Affects every sheet.**
- **S3-c** ✅ accepted — drawer look differs from the collection-states mockup; the **orange-button
  version is accepted for now** (may get a design pass later).
- **S3-d** 🎨 copy — the **TOP** view chip → **"TOP 10"** (explicit).
- **S3-f** 🎨 functional — the **Status** section needs an **"All"** option.
- **S3-g** 🎨 functional — the **Genre** section needs an **"All"** option.
- **S3-h** 🎨 design — the standalone **ASC/DESC** button in the drawer isn't needed there (fold
  direction into the Sort tool button, S3-i).

**Tools-bar:**
- **S3-i** 🎨 functional — the **Sort** tool button should indicate **asc/desc** when a sort is active.
- **S3-k** 🎨 — the **Filter** tool button should show an **orange pip** when filters are active.
- **S3-n** 🎨 design — the tools buttons (search/sort/filter/view) should be **icon-only, no labels**,
  using the **mockup icons** (`ToolButton` currently shows glyph + label).
- **S3-o** 🎨 — the gold **ADD (+)** button should be **larger**.
- **S3-p** 🎨 DS — the **ADD button needs the top-left + bottom-right pixel-stepped corners** (F-02
  GameCard signature, `theme.step`, decision 0041); today it's a plain square gold button.

**Count chip:**
- **S3-j** 🎨 copy — change **"N OF M"** → **"N game(s)"** when unfiltered, **"N of M games"** when a
  filter is active; singular-aware. (See locked decision.)

**Log Hours:**
- ✅ the empty-entry **save-guard works** (won't zero-wipe) — reference-good.
- **S3-l** 🐛 **(BIG)** — focusing the hours field, the **open drawer/keyboard covers it** — the input
  must **rise above the keyboard** (KeyboardAvoiding within the framed sheet). **Pairs with S3-b** (and
  S4-d).
- **S3-m** 🎨 UX — **pre-fill the hours field with the current value** (e.g. 11) rather than showing
  "11" as a placeholder over an empty field, so Save-as-is keeps it and *clearing* is what triggers the
  error. (See locked decision.)

## Step 4 — Add a game
Canonical mockup: [`add-game-states.html`](../design/mockups/add-game/add-game-states.html)
(the c-series `*-cardled` drafts are the earlier fan-direction studies).

- **S4-a** 🎨 — **Header.** Title should be **left-aligned**; the **X** becomes a labeled **"return to
  collection"** link, not a bare X.
- **S4-b** ⛔ ⚠️ — **Rails.** Only **POPULAR FIRST ADDS** (CAT-09) renders; the mockup shows **three**
  rails — also **RECENTLY ADDED** and **FRIENDS ARE PLAYING**. **Do not build the extra two at M3:**
  **FRIENDS ARE PLAYING = CAT-12 (M6 — needs the SOC-01 friend graph)**; **RECENTLY ADDED ≈ CAT-11
  (M4-era new-releases rail)**. Mockup depicts the eventual state.
- **S4-c** 🎨 **(BIG)** — **CardFan missing entirely.** Core add-game interaction is a **3-up card
  fan** (center "fore" card + two rotated neighbours) with a **swipe affordance** beneath (‹ pagination
  dots › + SWIPE hint). See `add-game-states.html` (`.cfan`, `.fan-nav`).
- **S4-d** 🐛 — **Search field hidden by the keyboard.** The bottom search-catalog bar is covered when
  the keyboard opens; the docked field must **rise above the keyboard**. Mockup **P2** draws this.
  *Same family as S3-l + S3-b — fix together.*
- **S4-e** 🐛 — **Count chip leaks onto Add-game.** The yellow game-count indicator ("12 N") shows
  top-right on Add-game; it **should not appear on this screen at all** (same chip as S3-j).
- **S4-f** 🎨 — **Focused-card details: right content, wrong format.** Correct = mockup **P2**
  `.fan-meta`: **NAME first**, meta block **above** the fan, line 2 = the CAT-09 presence read ("IN n
  COLLECTIONS · n FRIENDS HAVE IT") + the CAT-05 "ADDED BY {contributor}" credit.
- **S4-g** 🎨 **(BIG)** ⚠️ — **Focus/navigate interaction model is wrong.** Today: tapping a card shows
  details. Correct: the **center-focused (fore) card auto-shows its details**, and **tapping a card
  NAVIGATES to that game's Game page**. This is **CARD-23 → the Game page** (audit ORPHAN → M4), so the
  auto-focus half lands now but **tap-to-navigate waits for the M4 Game page** — pick an M3 interim tap
  (inert / focus-only).

## Step 5 — Profile
Canonical mockup: [`profile-states.html`](../design/mockups/profile/profile-states.html).
Owner verdict: **otherwise reference-good** — identity, STATS (PROF-04), PINNED FAVOURITE, TOP 3 chips,
and the NOW PLAYING *display* all pass as an M4 reference surface. Two notes:

- **S5-a** 🎨 — **Missing the Profile screen header.** The `.screen-head` **"PROFILE"** title band
  (`profile-states.html:487`) is not rendered on the built screen. *(The EDIT · SHARE · Settings tools
  that sit in the header region are separately ⛔ NOT-YET → M7 — not part of this note.)*
- **S5-b** ⛔ deferred → M4 (confirms **S3-a**) — **No reachable set-now-playing picker.** The WTP-03
  backend (`PUT /me/now-playing`) + the `setNowPlaying` hook exist, but the picker UI is unwired — the
  same deferral as S3-a (per-game / now-playing set UI → the Game page @ M4). **Verify + confirm:** if a
  "SET YOUR NOW PLAYING" affordance renders but is inert, hide/stub it until M4 so there's no dead-end.

## Step 6 — Nav shell + DS scrutiny
- **S6-a** 🐛 / decision — **NavBand does not switch on the not-yet tabs.** Tapping **STORE / DISCOVER /
  FRIENDS** does nothing — the active keycap doesn't change (this **corrects the suite**, which claimed
  "the NavBand switches, no screen behind"). Decide the M3 behaviour: **keep inert but visually mark the
  empty keycaps** as not-yet/disabled, **or** switch active + show a "coming in Mn" placeholder
  (Store M5 · Friends M6 · Discover M7).
- **S6-b** 🎨 — **Frame:** the **black border between the device frame and the in-app screen** could be
  a little **thinner**. *(Joins the shell-frame polish family — S1-a/b/c/d.)*
- **DS (F-0x) pass:** no F-06 / F-02 / F-05 / F-07 / F-08 / spacing violations called out by the owner
  on this pass (screens judged acceptable on the device).

---

## Milestone reconciliations / decisions to confirm with the owner
1. **S4-b** — leave RECENTLY ADDED (≈CAT-11/M4) and FRIENDS ARE PLAYING (CAT-12/M6) out of the M3 build.
2. **S4-g** — tap-to-navigate targets the Game page (M4); define the M3 interim tap behaviour.
3. **S3-a / S4-g / S5-b** all depend on the **Game-page hub shell → M4** slot (phase-coverage audit).
4. **S5-b** — set-now-playing is deferred to the M4 Game page (per S3-a); decide whether the M3 profile
   **hides** the "SET YOUR NOW PLAYING" affordance or shows an **inert stub** until then.
5. **S6-a** — decide the not-yet nav tabs' M3 behaviour (inert+disabled-look vs switch+placeholder).
