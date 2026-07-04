# M3-R — the fidelity remediation (build brief)

> **What this is:** the remediation pass that takes the M1–M3 build from the owner's ~6/10
> acceptance verdict to a reference-grade base before M4 opens. Inputs:
> [`m3-walkthrough-iteration-notes.md`](m3-walkthrough-iteration-notes.md) (the owner's tagged
> S1–S6 notes — the fix list) + the canonical `*-states.html` boards. **This brief is also the
> shakedown of the M4 pipeline:** manifest-first · builder≠verifier · parvati-as-gate ·
> first-article stop. If the pipeline leaks here, we fix the machine before M4 depends on it.
>
> **Why M3 landed at 6/10 (so the fix sticks):** the mockup was read as vibes (no element
> inventory), the builder self-certified, and parvati was repositioned *after* the owner (no
> `m3-review-notes.md` exists). M3-R inverts all three. **Owner-facing rule: no screen reaches
> the owner without a parvati report attached.**

**Date:** 2026-07-03 · **Owner:** Aiden · **Executes in:** Claude Code (skills required —
OpenCode deferred, owner directive 2026-07-03) · **Branch:** continue on `m3`

---

## 0. Locked owner decisions — honour these; do NOT "fix" them

Carried from the notes + the M3-R kickoff rulings (2026-07-03):

1. **Register form divergence is KEPT** (centered form over the hero) — not a defect.
2. **Drawer look:** the orange-button version is **accepted for now** (S3-c) — mechanics get
   fixed (R0), the visual design does not get re-approached.
3. **Count chip copy** (S3-j): unfiltered → **"N game(s)"**, filtered → **"N of M games"**,
   singular-aware.
4. **Log Hours** (S3-m): **pre-fill the current value** (clearing it is what errors).
5. **Per-game actions stay deferred to the M4 Game page** (S3-a) — no stopgap host. The RTK
   hooks stay dormant.
6. **Add-game rails** (S4-b): POPULAR FIRST ADDS only. RECENTLY ADDED ≈ CAT-11 (M4) and FRIENDS
   ARE PLAYING = CAT-12 (M6) are **not built** — the manifest marks them EXPECTED-with-cite.
7. **S4-g interim tap (ruled at kickoff): FOCUS-ONLY** — tapping a side card rotates it to the
   fore (which auto-shows its details); tapping the fore card does nothing until the M4 Game
   page swaps it to NAVIGATE (CARD-23).
8. **S5-b (ruled): HIDE** the "SET YOUR NOW PLAYING" affordance entirely until M4. The NOW
   PLAYING *display* (seed/API-set) still renders.
9. **S6-a (ruled): leave the not-yet nav tabs exactly as they are** — out of M3-R scope.
10. **S2-d username screening: parked** (MOD-07, later). **S1-e Welcome hero content:
    design-owed** — a *design-lane* task (§5), not this build.
11. **Drawer does NOT block the nav band (OWNER-BLESSED, 2026-07-03 — murr's R0 owner-call):**
    the in-screen drawer covers only the routed screen; tapping a nav keycap with a drawer open
    switches tabs, and the drawer is still open on return (its state lives in the screen). This
    matches the in-screen drawer grammar (nav is plastic, not screen) and is the intended
    behavior going forward — do not "fix" it back to the Modal's full-window blocking.

## 1. The pipeline (every R1 surface runs this loop)

```
manifest → fix → murr (diff) → parvati (fresh agent, vs manifest) → loop until 0 flags → report filed
```

**The manifest (the contract).** Before touching a surface, extract
`docs/planning/m3r/<surface>-manifest.md` from its canonical states board — element by element,
state by state. The boards are structured HTML built from catalog classes: extraction is
substantially mechanical (walk the artboard DOM), then reconciled against §0 and the owner's
notes. Template:

```markdown
# <surface> — screen manifest (from <board>.html, <date>)
Scope filter: M3-R. Elements owned by later milestones are listed and marked
EXPECTED(<milestone> · <ID/cite>) — parvati must not flag them, the builder must not build them.

## State: <artboard id — e.g. P1 shelf-default>
| # | Element | Component (component-map) | Variant/size | Docks (section order) | Copy | Status |
|---|---------|---------------------------|--------------|----------------------|------|--------|
| 1 | …       | GameCard                  | /grid 161×225| section 2, 2-up      | —    | OWED |
| 2 | …       | …                         | …            | …                    | …    | EXPECTED(M6 · CAT-12) |

## State: <next artboard>  (every drawn state gets a section: default · empty · loading ·
error · offline · sheets/drawers open · keyboard open)

## Owner-notes fold-in
| Note | Manifest line(s) it lands on |
```

**Builder rules.** Compose from the component-map only (a bespoke near-dupe of a catalog
component is a review-reject); fix to the manifest line, not the vibe; `ui-craft` +
`failure-first` load on their task-types; no scope creep — anything discovered goes to
`open-questions.md`. Self-check your own render against the manifest before handing to review.

**Manifest recalibration — R1-1 first-article corrections (owner-blessed, 2026-07-04).** The R1-1
lane found the manifest's failure mode was `PRE` rows treated as extraction, not verification: six
structural build divergences (and a LOCKED-decision contradiction) sailed through stamped
"pre-existing, correct" without ever being checked against the running app. Two patches, binding
from R1-2:
1. **`PRE` requires evidence.** A row may read `PRE` (pre-existing, correct) only with a **code cite
   or a screenshot check against the build** — not just a board cite. Anything asserted-but-unchecked
   is marked **`UNVERIFIED`**, which parvati treats as a checklist row (a candidate flag), not a pass.
   Board fidelity is proven against the *build*, never assumed from the mockup.
2. **Adversarial predicate self-check.** Before handing off, the builder walks every **changed state
   predicate** (the boolean/enum that drives a pip, a count, a mode, a guard) through its full state
   table — the R1-1 major was one `active={…}` predicate that dropped a term. A changed predicate
   without an enumerated state-table walk in the receipt is an incomplete self-check.

**murr** runs on each surface's diff (runtime-first; the keyboard/sheet mechanics of R0 are
exactly his async/lifecycle lane).

**parvati — M3-R calibration (binding for this brief):**
- She runs as a **fresh-context agent** — never inline in the builder's session — and captures
  her **own** screenshots (Expo web at ~390×844, per state; the web-loop recipe applies).
- **Step 1 is: read the manifest.** She never improvises the enumeration.
- **Divergence from the board = 🚩 FLAG** at this milestone (the anti-pixel-fidelity leniency was
  for M1/M2 scaffolds; M3's DoD is "matches the converged boards"). EXPECTED requires the
  manifest's cite. 🎨 POLISH is reserved for token-level slips only.
- Every verdict table is **appended to [`m3-review-notes.md`](m3-review-notes.md)** (seeded,
  same format as M2's). A surface without a filed report is not done, by definition.

## 2. Phase R0 — frame & input mechanics (the cross-cutting BIGs)

The two (BIG) bug families every later surface-pass depends on — fix once, verify everywhere:

- **R0-1 (S3-b):** sheets/drawers (`PulledSheet` + every root Modal) must open from the bottom
  of the **in-app screen**, inside the device frame — never from the iPhone's bottom edge.
  Affects every sheet in the app.
- **R0-2 (S3-l + S4-d):** focused inputs inside framed sheets/docked bars must **rise above the
  keyboard** (KeyboardAvoiding within the frame): Log-Hours field, Add-game search bar.
- **R0-3 (S1-c):** `NavKeycap` raised depth uses CSS box-shadow that RN native ignores → real RN
  shadow props (iOS `shadowColor/Offset/Radius/Opacity` + Android `elevation`).

**Exit:** murr on the diff (double-fire the sheets, rotate, keyboard open/close races) +
parvati spot-checks of drawer-open, log-hours-focused, and add-search-focused states on all
three affected surfaces. **These are native-rendering behaviors — the physical-iPhone check at
R2 confirms them; Expo web is the iteration loop only.**

## 3. Phase R1 — per-surface fidelity (the loop, in this order)

### R1-1 · Collection — **THE FIRST ARTICLE**
Items: S3-d (TOP → "TOP 10") · S3-f/g (All options in Status + Genre) · S3-h (fold ASC/DESC into
the Sort tool) · S3-i (Sort shows active direction) · S3-k (Filter pip when active) · S3-n
(tools icon-only, mockup icons) · S3-o (ADD larger) · S3-p (ADD gets the F-02 TL+BR pixel-step,
`theme.step`, decision 0041) · S3-j (count-chip copy, §0.3) · S3-m (Log-Hours pre-fill, §0.4).
**⛔ HARD STOP after this surface passes parvati clean: it goes to the owner ALONE** — screen +
manifest + report. The owner is judging the screen *and* the pipeline; corrections recalibrate
the manifest template and parvati's checklist **before R1-2 starts.**

### R1-2 · Add-game
S4-a (left-aligned title; X → labeled "return to collection" link) · **S4-c (BIG): the CardFan**
— 3-up fan, center fore card + two rotated neighbours, ‹ pips › + SWIPE hint beneath (board's
`.cfan`/`.fan-nav`) · S4-f (fan-meta format: NAME first, meta above the fan, line 2 = CAT-09
presence + CAT-05 "ADDED BY" credit, per board P2) · S4-g (focus-only tap, §0.7) · S4-e (the
count chip must not render on this screen) · **R0-follow (murr, R0 audit): CREATE-mode keyboard
handling** — the removed KAV also (non-functionally) wrapped `CreateForm`; nothing replaced it, so
on iOS a focused lower field (publisher/release-date) + the Create button sit under the keyboard —
give the form a real fix (KeyboardLift on the form tail, or `automaticallyAdjustKeyboardInsets`
on its ScrollView), verified at the R2 device pass.

### R1-3 · Welcome/Auth + Register + Legal
S2-g (Create account → text link) · S2-h ("Forgot?" affordance, AUTH-04) · S2-i (placeholder
Sign-in-with-Apple on Apple devices, AUTH-03 stub) · S2-j (password show/hide) · S2-a (submit
disabled on empty/erroring fields, not just the checkbox) · S2-c (availability copy: "not
available" vs screened-only "not allowed") · S2-e (field-error text up to the DS floor — F-06:
9px minimum) · S2-f (errors clear as the user types) · S2-b (legal ‹ BACK under the title).
*(S1-e hero content is design-owed — §5, not here.)*

### R1-4 · Profile
S5-a (render the `.screen-head` "PROFILE" title band — `profile-states.html:487`; the
EDIT/SHARE/Settings tools in that region stay ⛔ M7) · S5-b (hide SET-NOW-PLAYING, §0.8).

### R1-5 · Shell polish (one small pass)
S1-a (top bar up ~¼cm) · S1-b (nav band down ~¼cm) · S1-d (DISCOVER/PROFILE labels a couple px
higher) · S6-b (thinner black border between frame and screen). Parvati checks against the
shell across any board's frame rendering; final judgment is the owner's device look at R2.

## 4. Phase R2 — owner re-acceptance

Compile a **delta walkthrough** (acceptance-walkthrough discipline): only the fixed surfaces +
the R0 mechanics, each step "do X → expect Y — that's <note-id / manifest line>", on the
physical iPhone via Expo Go (the frame/keyboard/shadow fixes are native behaviors).

**R0 device probes (from the murr audit — run these verbatim at R2):**
- Drawer/log-hours/add-search: sheets open from the **in-app screen bottom**, inputs rise above
  the keyboard, nav keycaps show the hard 4px drop edge (idle) / sunk 1px (active). *(the core R0 AC)*
- **Lifted-sheet hit-test:** with the log-hours sheet lifted by the keyboard, tap its UPPER half
  (the title/field area) — if the tap closes the sheet, the anchor layer is dropping
  out-of-bounds touches (Fabric overflowInset should cover it; verify, iOS + Android).
- **Keyboard-type switch while lifted:** focus the add-game search (dock lifted), switch to the
  emoji keyboard / collapse QuickType — the dock must track the new height exactly (no double-lift).
- **Seed-vs-dismiss bounce:** open the in-place collection search (keyboard up), then tap Filter —
  watch for a transient bounce as the drawer opens (self-correcting; if visible, dismiss-first in
  a layout effect).
- **Android resize:** keyboard open/close on Android — the DeviceShell must not squish oddly
  (adjustResize shrinks the window; the shell is flex-based and should compress gracefully). Every
screen arrives with its parvati report attached. **M3 closes when the owner signs R2** — the
remaining M3 tail (the M2+M3 gate batch · G-K lever values · OQ-119/125/126 rulings ·
`/code-review` + `/security-review` at PR time) rides the same sitting or its existing plan.

## 5. Out of scope (accounted, not forgotten)

- **Game page hub shell** — P0 ORPHAN → M4. The copy-pasteable roadmap-patch bullet is ready in
  [`phase-coverage-audit-findings.md`](phase-coverage-audit-findings.md); it gets dropped into
  the M4 entry plan when M4 opens. Nothing built now (§0.5/0.7 interim behaviors cover the seam).
- **S1-e Welcome hero content** — a design-lane task against the §4.13 board (3 example cards +
  designer credits, catalog/hours metrics, copy reconcile). Schedule as its own small pass;
  burt audits it; the build then implements from the updated board.
- **S2-d** username screening (MOD-07, parked) · **S4-b** extra rails (M4/M6) · **S6-a** not-yet
  nav (owner: leave as-is) · everything ⛔-tagged in the notes.

## 6. M3-R Definition of Done

- [ ] R0 mechanics fixed and verified on device (sheets in-frame · inputs above keyboard ·
      native keycap depth).
- [ ] Every R1 surface: manifest on file · parvati report filed in `m3-review-notes.md` with
      **0 open flags** · murr clean on the diff · CONVENTIONS per-task DoD met.
- [ ] The first-article stop happened (owner reviewed Collection alone before R1-2 began).
- [ ] No locked decision (§0) was "fixed."
- [ ] R2 delta walkthrough passed by the owner on device.
- [ ] Receipt: what changed per surface + IDs touched + anything filed to `open-questions.md`.
