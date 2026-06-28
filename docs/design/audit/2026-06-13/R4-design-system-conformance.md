# R4 — Design-System Conformance (tokens · buttons · components)

**Audit:** Design-Documentation Audit (see [`00-PLAN.md`](00-PLAN.md)) · **Run:** 2026-06-13 ·
**Audited against:** working tree at `c236303` · **Mode:** report-only

## Method & scope
Baseline-first: extracted the **canon** from the v0.4 Catalog + design-spec §1 Foundations (button
geometry, the token palette, the component inventory, F-01…F-09), locked it, then swept the **10 live
implements-from / in-pass boards** against it in four clusters — measuring every board against the
*same* yardstick. Superseded a/b/c draft variants (e.g. `store-draft-*`, `discover-draft-*`,
`add-game-draft-c2…c6`) were **deliberately excluded** — auditing exploration history for canon-drift
is noise; the build composes from the converged boards. Boards swept: `collection-states`,
`h2-underlay-v2`, `profile-states`, `store-states`, `add-game-states`, `styler-states`,
`canvas-states`, `discover-states`, `report-states`, `game-page-draft-a-cardled`, `settings-page`
(+ `settings-states` + the three `feedback-draft-*`).

## The headline: geometry discipline is excellent; the drift is in colour
The hard part — the **keycap physics** — is followed with real rigor on **every** board:
- **Drop-edge tiers correct everywhere:** 3px screen-action / 2px tool·chip / 4px shell-nav. **Zero**
  2px-on-an-action-keycap violations — including the **Game page, where the rev-2 "lighter 2px" miss
  is fixed** (`game-page-draft-a:944`-area `.btn`=`0 3px 0`, `.btn.gold`=`drop-shadow(0 3px 0)`).
- **Clipped/stepped keycaps use `filter: drop-shadow`, never `box-shadow`** — the exact thing the
  owner flagged on rev-2 — verified correct on `.btn.add`/`.btn.gold`/`.btn.act`/`.le-retry` across
  store, add-game, report, settings, game-page.
- **F-08 one-font:** Chakra Petch on all InGame chrome; the only non-Chakra text is on genuinely
  **OS-owned** surfaces (the iOS system keyboard, the StoreKit purchase sheet) — correct, not drift.
- **F-09 flat / no-sunken:** selection is everywhere a `scr.accent` border + pink `ChipPip`; insets
  confined to pressed keycaps + cream text fields (the two named exceptions). No pink-border or
  inset-shadow selections found. Round pips, square chrome throughout.

So the system's *geometry* is internalized. **The cracks are all in the colour token layer** — and
two of them point at the same gap.

---

## Findings

### R4-F01 — Off-palette success-green `#7fcf9b` across the Settings/feedback cluster · **Medium**
- **Locations (7×, 5 files):** `settings-page.html:124` (`.rsub.ok` → "✓ VERIFIED"), `settings-states.html:98`
  (`.rsub.ok`), `:101` (`.rv.on` → "4 ON"), `:222` (`.la-pl-tag`), `feedback-draft-a-inline.html:154`,
  `feedback-draft-b-sheet.html:117`, `feedback-draft-c-triage.html:135` (the LogAttach "ATTACHED" tag).
- **Evidence:** `color: #7fcf9b` for positive status. The canon palette (design-spec §1.1) has **no
  green/success token** — the sanctioned "on/affirmative" voice is `scr.accent` `#ff9f43`.
- **The tell — internal inconsistency in one line:** `settings-states.html:98` —
  `.rsub.ok { color: #7fcf9b; } .rsub.warn { color: var(--scr-accent); }`. The *warn* state uses the
  palette; the *ok* state reaches outside it. And the Toggle's "on" correctly uses `scr.accent`, so a
  notifications row literally reads "**ON**" in green next to a switch that says on in orange.
- **Root cause:** the just-gated Settings track needed a *positive/success* accent the palette doesn't
  provide, and improvised one. (See the cross-cutting note — Discover did the same with a different green.)
- **Impact:** an unsanctioned semantic hue hardening into a de-facto token across every status surface
  at the exact moment Settings is being formalized.
- **Suggested fix — design-system decision (not a silent edit):** either **add a sanctioned
  `scr.success` token** to design-spec §1.1 (if the system genuinely wants a positive accent — likely,
  given two tracks reached for one) **or route these to `scr.accent`**. Worth an open-questions entry +
  a one-line decision, since it changes the canonical palette.

### R4-F02 — Off-palette lime `#d3e95e` on the Discover FOIL tag · **Low**
- **Location:** `discover-states.html:144` — `.ftag { background: #d3e95e; color: #2a3505; … }` (used at L619/826/991).
- **Evidence:** lime fill + olive ink — in no palette row. The same card already carries a **gold**
  foil band + gold plate, so the in-system marker for "special/foil" is `brand.gold` `#ffd23f`.
- **Impact:** a 9th on-screen accent hue with no token meaning; erodes the "every accent has a job" discipline.
- **Suggested fix — design-doc/mockup hygiene:** recolour the FOIL tag to `brand.gold` (already the
  card's foil voice). Lane (b) presentation.

> **Cross-cutting (F01 + F02): two independent tracks reached outside the palette for *green*.**
> Settings for "success/verified/on/attached", Discover for "foil/special". Different semantics, same
> tell — when a designer needs *positive* or *special* and the palette offers only orange/pink/gold/red,
> they improvise. **The actionable signal is a palette gap, not two typos.** Decide F01's `scr.success`
> question first; F02 then just falls back to gold.

### R4-F03 — `NOTIFY ME` is a gold+step keycap on a non-card action (F-02) · **Low–Medium**
- **Location:** `game-page-draft-a-cardled.html:944` — `<button class="btn gold mini">…NOTIFY ME</button>`
  (`.btn.gold` = `brand.gold` + 2/4 clip-step + `drop-shadow(0 3px 0)`).
- **Evidence / canon:** F-02 — **gold + step = a card-creating action only** (ADD / ADD TO COLLECTION /
  adopt); a prominent **non-card** action is `/action-alt` (`scr.accent` + step). NOTIFY ME sets a
  release reminder (NOTIF-01, per the board's own caption L968-969) — it creates no card.
- **Aggravator:** on the same P7 band, **ADOPT** (true gold, card-creating) sits two lines below — so
  the screen uses gold for two different meanings, exactly what F-02 exists to prevent.
- **Impact:** dilutes the "gold = you're adding a card to your shelf" grammar on a cold-start screen.
- **Suggested fix — mockup correction before converge:** make NOTIFY ME `/action-alt` (orange + step).
  The Game page is in-pass (A just won the gate) — fix it before the converge so the formalized board is clean.

### R4-F04 — Sub-9px micro labels below the F-06 floor (store-states + the collection lineage) · **Low**
- **Locations:** `store-states.html` — `.d-s` 8px (`:185`), `.pack .val` **7.5px** (`:190`), tag text 8px
  (`:201/203/206`), `.rt-type` 7px (`:261`), `.idx .n` 8.5px (`:268`), `.ps-lbl` 8px (`:277`), `.it-type`
  8.5px (`:282`), `.plbl` 8px (`:296`). (Same pattern inherited in the already-converged collection-states lineage.)
- **Evidence / canon:** F-06 screen scale is 21/15/11/**9**; these are genuine screen labels (tags, ledger
  timestamps, pack value-math, aisle counts) — **not** card plates, so the plate exemption doesn't cover them.
- **Impact:** real-but-tiny type-scale drift in dense commerce rows; cosmetic. It's *systemic* (predates
  these boards), so it's a question for the F-06 formalization, not a board blocker.
- **Suggested fix — design-spec footnote:** either document a "dense-commerce micro" sub-step in F-06 or
  bump these to 9px when the Store/Collection boards are (re)formalized.

### R4-F05 — Now-Playing marker uses brand-pink — literal breach of the pink-usage rule · **Low (rule-clarification)**
- **Locations:** `discover-states.html` — `.nowpin` border `var(--accent)` (`:180`), `.nowtag` fill
  `var(--accent)` (`:182`); `--accent` = `#ff3d77`.
- **Evidence / canon:** `brand.accent #ff3d77` is reserved for "pips / notifications / Collection-nav **only**".
  The selection/lift states nearby correctly use `scr.accent` `#ff9f43`, so the pink here is a deliberate
  semantic choice (Now-Playing = live/attention), not a slip — but it's a literal rule breach.
- **Suggested fix — rule clarification:** the owner either **widens the rule** to bless pink for
  "now-playing / live presence" or **recolours** the pin. Lane (b)/design-spec §1.1 note.

**Minor (noted, not numbered):** a `10px` inline override on the game-page `RECOMMEND` tertiary link
(off the 11/9 scale — trivial); and latent off-ladder base `border-radius` values (e.g. `.gcard` 11px)
in the collection/profile boards that the `.c5` cascade always overrides to square — dead values, a
reuse-hygiene tidy only.

---

## Summary
**1 Medium · 4 Low** (one Low–Medium). The encouraging result: the **geometry canon is followed with
discipline on all 10 boards** — the keycap drop-edge tiers, drop-shadow-on-clipped-keycaps (the rev-2
miss is fixed and recurs nowhere), gold+step grammar, one-font, and F-09 flatness all hold. The drift
is concentrated in the **colour layer**, and its sharpest signal is **R4-F01 + F02: two tracks
independently improvised off-palette greens** because the palette lacks a *positive/success* slot —
exactly the cross-page convention divergence this pass was meant to surface. Deciding the
`scr.success` question (add a token vs. route to `scr.accent`) retires both. The one semantic slip
(R4-F03, NOTIFY ME gold) should be fixed before the Game page converges; the type-scale items
(R4-F04/F05) are formalization footnotes.
