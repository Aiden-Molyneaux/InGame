# M4 — Parvati review notes

> Per-screen build-vs-design verdicts, appended by parvati as each M4 surface exits its loop
> (`m4-build-task.md` §2). **A surface without a filed report here is not done, by definition —
> and this file being empty at a milestone exit is itself a red flag.** Same conventions as
> [`m3-review-notes.md`](m3-review-notes.md); measured against the surface's
> `docs/planning/m4/<surface>-manifest.md` (never an improvised enumeration), at the **M4
> calibration: divergence-from-board = 🚩 FLAG; EXPECTED requires the manifest's cite; 🎨 POLISH is
> reserved for token-level slips in the built app**.
>
> **Milestone map (do not confuse with the board's state labels).** The `game-page-states.html`
> board labels its artboards **M1–M8** as *ownership/lifecycle STATES*, **not** milestones. The M4
> **build** scope is board-states **M1 PLAY · M2 EDIT-STATS · M3 CARDS-switcher (own cards) +
> CardDetail INSPECT + L1/L2/L3 lifecycle**. Board-state **M4** (community gallery + adopt) is
> `EXPECTED(milestone M5)`; board **M5 ABOUT → M5**, **M6 neutral → M6**, **M7 friend → M7**,
> **M8 upcoming → M8**, **L4 moderation → M6/M7**.

<!-- parvati appends per-surface verdicts below, most recent last -->

---

## Game page hub shell (§3.1 — THE FIRST ARTICLE) · parvati (M4, 2026-07-05)

**Verdict:** 1 🚩 flag · 12 ✅ expected · 3 🎨 polish · (many ✔ matches) — measured vs the M4 DoD (§8),
the `game-page-manifest.md` enumeration, the `game-page-states.html` board (M1 PLAY · M2 EDIT-STATS · M3
CARDS · CardDetail · L1/L2), and the `/me/collection` + `/me/now-playing` seams.
**Reviewed from:** own 390×844-ish Expo-web screenshots, full login → CARD-23 list-row NAVIGATE →
PLAY · EDIT-STATS (+DONE round-trip) · CARDS · CardDetail INSPECT · Overflow → ConfirmSheet (CANCELLED) ·
ABOUT placeholder. BOOT check: page MOUNTS via a real list-row tap without hook/early-return crash; NavBand
stays COLLECTION-active through every state. L1/L2 not exercised (need a loading/failed fetch — see below).

### 🚩 Flag (owed at M4)
- **EDIT-STATS · STATUS chips — WISHLIST is present** — MISPLACED/extra — the EDIT-STATS status form renders
  **6 chips** (BACKLOG · PLAYING · BEATEN · COMPLETED 100% · DROPPED · **WISHLIST**). The converged board M2
  draws **5** and omits WISHLIST, and this is a **settled ruling**: OQ-070 (resolved 2026-06-18) — "WISHLIST
  stays out of the owned-entry editor… the converged Game-page board (M2) already omits it. No spec change
  (decision 0025)." WISHLIST is the pre-ownership/unowned state (WTP-02); an owned entry must not be settable
  to it. → **Remove the WISHLIST chip from the owned EDIT-STATS status field.** Cite: board
  `game-page-states.html:561` (5 chips, no WISHLIST) · manifest EDIT row 5 · OQ-070 (`open-questions.md:479`)
  / decision 0025. *(Note: the manifest's own EDIT-row-5 parenthetical lists the full enum incl. `wishlist`
  from 0058 §4 — that's the DB enum, not the owned-editor's offer-set; the board + OQ-070 govern the UI.
  Manifest wording could be tightened so the next builder isn't misled, but the board/ruling are unambiguous.)*

### ✅ Expected (deferred — proceed)
- **Composed CARD-15 custom FACE** — the FACE renders the CARD-18 default placeholder (flat purple card + game
  name plate), not a composed render. Cite: manifest PLAY row 3 / decision 0058 §6.
- **CARD ARTIST = "DEFAULT"** on the stats back (gold) — real designer arrives with `card_designs`. Cite:
  manifest PLAY row 4.
- **PLAY dossier PLATFORMS row** — shown as a present row with an em-dash empty marker (not fabricated). Cite:
  manifest PLAY row 7 — COL-04 / decision 0058 §7 (no `platformIds` substrate). *(Interim renders the row
  with "—" rather than omitting it; not fabricated — acceptable; see 🎨 below.)*
- **PLAY dossier NOTES row** — "—" / "Add a note", write-only, no pre-fill. Cite: manifest PLAY row 9 — OQ-134
  (`CollectionItem` omits `notes`).
- **RATING = PENDING (OQ-058)** — 5 greyed non-interactive stars + "PENDING (OQ-058)" in both PLAY readout and
  EDIT form. Cite: manifest PLAY row 8 / EDIT row 8.
- **PLAY · SHARE action** — present but disabled. Cite: manifest PLAY row 12 — CARD-21 · M5.
- **EDIT-STATS · PLATFORMS chips** — absent from the form (not fabricated). Cite: manifest EDIT row 6 — COL-04.
- **CARDS · switcher = 1 default card + DESIGN NEW** — single EQUIPPED default card, multi-card roster deferred.
  Cite: manifest CARDS rows 1–3 — OQ-133 / Styler §3.2.
- **CARDS · SET AS MAIN / EDIT IN STYLER / DELETE** — SET-AS-MAIN + EDIT greyed; DELETE non-functional (default
  card non-deletable). Cite: manifest CARDS rows 6/7/8 — `activeCardDesignId` / `/cards/:id` deferred (0058 §7).
- **CARDS · DESIGN NEW tile** — present (gold dashed); Styler target unbuilt. Cite: manifest CARDS row 3 — §3.2.
- **CARDS · BROWSE THE COMMUNITY** — rendered as an explicit "Adopt other players' cards — arrives in M5"
  placeholder, not a live gallery/link (not fabricated). Cite: manifest CARDS row 9 — M5 / decision 0062.
- **CardDetail · SHARE / EDIT actions** — both present but disabled; credit reads "STANDARD CARD · THE DEFAULT
  FACE (CARD-18)". Cite: manifest CardDetail rows 4/6 — CARD-21·M5 / Styler §3.2.
- **ABOUT tab** — clean EXPECTED(M5) placeholder ("Catalog facts · community presence · friends-who-own arrive
  in M5 (needs the game-detail read + CAT-09)"), no crash, no fabricated panel. Cite: manifest state-walk 1 —
  board-state M5.

### 🎨 Polish / iteration (built-app visual/DS)
- **CardDetail sheet — no visible ✕ close glyph in the sheet head.** The a11y tree exposes a "Close" node, and
  scrim-tap dismisses the sheet, but no ✕ renders top-right of the `sh-h` and neither the a11y-"Close" click nor
  a top-right tap dismissed it (only the scrim did). The board's sheet head carries a "✕ close" (board `:691`).
  → surface a visible, tappable ✕ in the sheet head. Not a blocker (scrim closes it).
- **CARDS · DELETE button styling** — DELETE renders in full danger-red while its sibling disabled actions
  (SET AS MAIN, EDIT IN STYLER) are greyed; since DELETE is a non-functional affordance on a non-deletable
  default card, its danger-red styling reads as enabled/actionable. → match the disabled/greyed treatment of
  its siblings (or hide until the card-delete substrate lands).
- **STATUS/label copy — "COMPLETED 100%"** vs the board's "COMPLETED" chip label (`:561`); same string appears
  as the collection-row status ("HOLLOW KNIGHT · COMPLETED 100%"). Consistent across the app, so a shared label
  choice rather than a page-local slip — noting for the owner's eye, not a page flag.
- *(Token note, not a finding: screen palette is the app's Midnight `theme.scr.bg #14121f`, not the board's
  `--scr-bg #232045` — intentional per the manifest chrome note.)*

### ✔ Matches (present · placed · on-aesthetic)
- CARD-23 NAVIGATE: collection list-row (View→list) tap → `/game/:gameId` mounts cleanly; the M3 S4-g deferral
  is realized.
- ScreenHead "GAME" + `▸ NOW PLAYING` tag (accent, conditional on the pin) + `⋯` overflow keycap + `‹ RETURN TO
  COLLECTION` return-link.
- PLAY: hero title "Elden Ring" (display) + facts line "FROMSOFTWARE · 2022 · SOULSLIKE"; dual-face hero — FACE
  (label "THE FACE") + STATS BACK (label "YOUR STATS", accent) with HOURS 11 / COMPLETE 55% / STATUS PLAYING /
  SINCE 2026 + CARD ARTIST DEFAULT; YOUR PLAY section head + dossier; action row EDIT STATS (primary) · SWITCH
  CARD (cream) · SHARE (disabled).
- EDIT-STATS: readout → form; stats-back label flips to "↻ UPDATES LIVE"; HOURS · COMPLETION % · OWNED SINCE
  fields; STATUS chips (PLAYING selected, accent); NOTES multiline (write-only placeholder); pinned
  ✓ DONE EDITING (block) + CANCEL bar above the dock; DONE round-trips (idempotent PATCH) back to PLAY.
- CARDS: "YOUR CARDS FOR ELDEN RING — 1" head; default card with ◆ EQUIPPED tag + orange stepped select-ring;
  DESIGN NEW tile; inline card-opts (title + EquipReadout FRAME/EFFECT/FINISH/NAMEPLATE chips).
- CardDetail INSPECT: hero tap → PulledSheet scrim + enlarged card + "YOUR ELDEN RING CARD" head + EquipReadout
  + disabled SHARE/EDIT.
- Overflow: ⋯ → GAME OPTIONS sheet with CLEAR NOW PLAYING (correct, Elden Ring IS the pin) + REMOVE FROM
  COLLECTION (danger) → 0040 ConfirmSheet ("REMOVE FROM COLLECTION?", REMOVE danger + CANCEL, cancel-default);
  CANCEL dismisses, seed intact.
- Bottom section dock PLAY · CARDS · ABOUT (accent border + on-state on active, not a pressed keycap); NavBand
  COLLECTION-active persists through every state.

### Not exercised
- **L1 loading Skeleton · L2 SIGNAL-LOST + RETRY** — reachable only via a loading/failed fetch; not triggerable
  from the UI on a warm, authenticated, already-loaded collection. Marked not-exercised (per manifest BOOT
  note + lifecycle state-walk 7). **L3 offline is EXPECTED(SYS-10) — no offline infra at M4 — not built, not
  flagged** (manifest L3).

### Fix-round (builder, 2026-07-05 — commit `03eb3f0`) → **0 open flags**
- **🚩 WISHLIST chip — CLOSED.** New shared `OWNED_STATUSES` (= the storage enum minus `wishlist`, OQ-070 ·
  decision 0025); the owned EDIT-STATS status field now offers **5 chips** (PLAYING·BACKLOG·BEATEN·COMPLETED·
  DROPPED) — **verified live** (the form's status row dropped from 6 buttons to 5). Manifest EDIT-row-5 wording
  reconciled to the owned offer-set.
- **🎨 CardDetail ✕ — addressed.** A visible, tappable ✕ now renders in a custom sheet head (board `sh-h` :691);
  dismissal is no longer scrim-only.
- **🎨 CARDS DELETE styling — addressed.** DELETE greyed (secondary) to match its disabled siblings while the
  card-delete substrate is deferred (it becomes destructive-red when the substrate lands).
- **🎨 "COMPLETED 100%"** — left as-is (the app-wide COL-02 display name, consistent with the collection rows;
  owner's-eye copy call, not a page slip).
- **murr fixes** (`763beb2`) also landed this pass: EDIT save-error surfacing + client date-guard, DONE
  double-fire guard, and the cross-game state-reset effect.
- **Result:** **0 open 🚩 flags** · 12 ✅ expected (all cited) · 2 🎨 addressed / 1 🎨 owner-copy-call.
  Surface reads "matches the converged board" within its declared EXPECTED/OQ envelope. → the first-article
  owner stop (screen + manifest + this report + the receipt).

---

## The Fable-audit stop (§4 — pulled forward by the owner, 2026-07-05) · verdict: **GO, two adjustments noted**

**Mechanic:** the owner switched THIS session to Fable ahead of the §3.3 placement (usage window), with
"focus on the hard decisions/work first." Run as the §4 architect read over the CARD-15 render module +
the card-substrate architecture (the Styler aesthetic half re-runs at the §3.2 first-article, when a
Styler exists to judge). Post-first-article: the owner reviewed §3.1 on device (found the GameCard
container-overflow regression — fixed `8572156` — and the missing-entry-point gap — fixed `23b5f18`).

- **(1) The render module — GO.** Boundary clean (elements shared / closed attrs render-local, 0064);
  `buildCardElements` source-agnostic (one builder for the live `<Canvas>` + headless flatten); F-02 clip
  via the shared helper; cap enforced at schema AND draw; effect = runtime overlay (CARD-12/15 faithful).
  **Adjustment (a):** the text-width approximation (canvaskit-web lacks `measureText`) can drift a
  headless flatten from the device render on text-heavy cards → **M5-entry item** (mooted at M4 by the
  flatten-at-publish ruling). **Adjustment (b):** the untyped `SkiaCtx` interop is fine at current size;
  revisit on a third consumer.
- **(3) Architecture — the load-bearing rulings filed as decision 0066:** flatten-at-publish under the
  0062 boundary (save-private validates + hashes; owner surfaces render live) · the `card_designs` /
  `style_presets` model (adoption grants deliberately NOT in `card_designs` — a separate M5 table) ·
  COL-06 equip semantics (own · same-game · private|published; drafts not equippable; `ON DELETE SET
  NULL` backs the CARD-18 guarantee behind the 0040 409-guard) · the CARD-24a draft document (one row =
  the draft; autosave PATCH; SAVE-AS-NEW = fresh POST; crash recovery = the row; the Styler↔Canvas
  switch edits the same row) · the owner-only `composition` rider (the CARD-15 viewers-get-images
  guarantee enforced at the serializer split).
- **(4) Completeness critic — what's missing before the editors scale:** the card-substrate BACKEND
  (in flight, this batch) · a seeded private design (so the Styler/switcher demo real data) · the COSM-02
  roster as consumable assets (0063 is spec'd; the Styler build seeds the free set) · the CARD-16
  a11y board (decision 0062 §4 — design-first, still owed before M4 exit) · the M5-entry ledger
  (flatten/storage/CDN + text-measure + adoption grants + the cross-user composition-strip guard test).

**Verdict: GO** — the render approach and the substrate architecture hold; no course-correction owed.
The Styler §3.2 builds on 0066; its first-article (aesthetic half of this stop) still runs the full
pipeline + the owner's gate-5 taste.

