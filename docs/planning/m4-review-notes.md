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

---

## Styler (§3.2 — the in-frame card editor) · parvati (M4, 2026-07-06)

**Verdict:** 2 🚩 flag · 13 ✅ expected (all cited) · 4 🎨 polish · (extensive ✔ matches) — measured vs
the M4 DoD (§8), `styler-manifest.md` **+ its ADDENDUM** (the fixed enumeration; 0062 boundary banner
governing), `styler-states.html` P1–P11, the 0066/0063 seams (`POST/PATCH/DELETE /cards`,
`/cards/:id/save-private`, `/me/style-presets`, COL-06 equip `PATCH /me/collection/:entryId`), and the
game-page manifest ADDENDUM rows (CARDS switcher gone live — re-verified here).
**Reviewed from:** own Expo-web walk (fresh session, real login), full P1→P7 + the game-page switcher +
Collection wear-through. **Environment caveat:** desktop-web viewport only (~1045–1280×470–575 CSS — the
review rig's window would not shrink to the ~390×844 phone target), and the screenshot lane degraded
mid-run (Chrome background-tab throttling froze CDP captures + the tooling's `zoom` action left a stuck
viewport-metrics override — doctor-nick candidates, filed below). States whose pixels couldn't be
captured fresh were verified via the a11y tree, page text, and the network log instead; key visual
states (P1 fan ×4 rotations, P2 surface, live hero redraw w/ pixel-frame+glow, overflow sheet, 0040
ConfirmSheets, KeepBeat, game-page wearing, switcher tags) have own screenshots.

### 🚩 Flag (owed at M4)
- **Composition patch — an INK pick rewrites the FONT** — behavior/coherence — the draft (a SURPRISE
  deal) read `NAMEPLATE · RIBBON / FONT · PAYTONE` in the switcher readout; the Styler session's picks
  were frame PIXEL · effect SOFT GLOW · finish SUBTLE GLOSS · plate NONE→SLAB · **GOLD ink** — *no font
  pick* — yet the kept card reads `FONT · CHAKRA`. A pick in the TITLE-ink slot (or the plate re-pick)
  reset the font to its default — cross-attribute contamination in the roster→composition patch, exactly
  the "patch correctness" lane the build receipt flagged for murr. The closed attributes are independent
  objects (CARD-12 grammar); a pick must patch only its own slot. → Fix the title/ink patch to preserve
  the sibling font (and audit every roster patch for wholesale-object overwrites). Cite: manifest P3–P5b
  row 5 (font + ink are separate picks) · `styler-receipt.md` "roster→composition patch correctness"
  (murr priority) · repro above (readouts before/after, same document `32abbbd5…`).
- **CARDS head — the ⇅ SORT affordance is still absent now the switcher is live multi-card** — ABSENT —
  the board's switcher head draws `YOUR CARDS FOR <GAME> — N` **+ a ⇅ SORT link** (board
  `game-page-states.html:610`); the built head shows the (real, correct) count but no SORT. The §3.1
  cite that covered this ("SORT inert while N=1", game-page manifest CARDS row 1) no longer applies —
  N=3 real cards render today and the Styler pass explicitly flipped this surface to live multi-card.
  Small: add the (even inert-but-present) SORT tertiary or record the deferral in the game-page
  manifest ADDENDUM. Cite: board `:610` · game-page manifest CARDS row 1 · ADDENDUM (rows 2/3/6/7/8
  flipped, row 1 not addressed).

### ✅ Expected (deferred — proceed; the 0062 banner governs)
- **PX wallet counter (ccount)** in the flow head — absent. Cite: manifest C3 — EXPECTED(M5 ·
  wallet/ECON-07, 0062).
- **Price-chips · PREVIEW flag · cost-stack · premium-picks header line · owned-tags** across P2–P5b —
  none rendered; every rail is FREE-only. Cite: manifest banner + P3–P5b rows — EXPECTED(M5 ·
  CARD-13/COSM-03, 0062 §2).
- **P6 ReconcileSheet + funded/short fragment** — whole state absent; KEEP never owes a reconcile at M4.
  Cite: manifest P6 — EXPECTED(M5).
- **Received-base / adopt-then-edit P1 fragment** ("CHANGE BASE", credit line) — absent. Cite: manifest
  P1 row 8 — EXPECTED(M5 · adopt · board `:534–547`).
- **⤢ CANVAS chip + the KeepBeat EDIT-ART door — present-but-disabled** — both render (chip orange in
  the row, `aria-disabled="true"`, SR label "Open the Canvas"; the beat's door says "the Canvas arrives
  with the deep editor"). Cite: manifest P2 row 2 / P7 row 4 — EXPECTED(§3.4), exactly the drawn
  posture.
- **Section swipe gesture + "SWIPE SECTIONS" label** — sections switch by chip-tap (+ the dots are
  tab-role tappables); no pan gesture, no swipe label. Cite: manifest ADDENDUM (recorded interim; the
  gesture rides §3.6). *Note: the BaseRail's swipe shares the interim in practice (its label honestly
  reads "BROWSE", chevron-rotate works) — the fan's gesture deferral isn't explicitly recorded in the
  ADDENDUM; worth a one-line fold-in.*
- **Fonts 2-of-5** — CHAKRA + PAYTONE real; pixel/serif/script absent. Cite: ADDENDUM (roster design
  pass owns the rest). The 6 free inks all present (CREAM/MIDNIGHT/GOLD/PINK/CYAN/MOSS, SR-labeled).
- **`GET /games/:gameId/card-bases` + `/surprise` unimplemented** — the BaseRail composes client-side;
  SURPRISE ME is a client deal (dealt a real multi-attribute start: VIGNETTE + RIBBON + PAYTONE). Cite:
  manifest banner ASSUMPTION(card-bases client-side), recorded 0058-style.
- **"ALL N ›" full-attribute browser** — absent; the free roster fits the rails. Cite: manifest P2 row 4
  — EXPECTED(CARD-17 at-scale).
- **P11 Offline** — not built. Cite: manifest P9–P11 row 3 — EXPECTED(SYS-10, same stance as §3.1 L3).
- **Dev premium-preview (0063 §6)** — nothing premium exists client-side to unlock. Cite: ADDENDUM
  (carried to M5).
- **Community gallery row** on the game page — still the clean "arrives in a later release" placeholder.
  Cite: game-page manifest CARDS row 9 — EXPECTED(M5), unchanged.
- **Publish** — nowhere on the surface. Correct: not even on this board (canvas-tier, 0014).
- **KeepBeat PX-spent ledger line** — the ok-strip subline is "Your shelf wears it now." with no spend
  fragment. Cite: manifest P7 row 1 — EXPECTED(M5).

### 🎨 Polish / iteration (built-app visual/DS; the owner's gate-5 eye)
- **START WITH THIS renders gold/stepped** — the board draws it as the plain primary `btn` (board
  `:520`); built wears the gold create-family treatment (matching DESIGN NEW + KEEP). Coherent as a
  family, but it's a token-level divergence from the drawn control — owner's taste call.
- **KEEP — EQUIP IT is missing its ◆ diamond icon** — the board/manifest spec the gold stepped button
  *with* the ◆ glyph (board `:615`, manifest P2 row 5); built is text-only. One glyph.
- **BaseRail fore-label doubles on the default** — "MIDNIGHT GILT · **DEFAULT — DEFAULT · FOREFRONT** ·
  NEBULA" (name — type · role grammar collides when name=type=DEFAULT); board grammar is "DEFAULT —
  FOREFRONT" (`:516`). Suppress the type token when it equals the name.
- **Two skins of "the default face"** — the switcher/collection DEFAULT tile is the M2/M3 static purple
  CARD-18 asset, while the BaseRail's DEFAULT base (and any near-default composition) renders the skia
  module's dark-indigo face. Adjacent surfaces show different "defaults"; resolves whenever the CARD-18
  face becomes one composition render everywhere — flagging for coherence, not blocking.
- *(Owner/spec-owner note, not a flag: plate **NONE** — sanctioned by decision 0063 §4 ("none · SLAB ·
  RIBBON · BEVEL") and built — renders a face with **no title at all**, which sits oddly against the
  board's "THE NAME ALWAYS RENDERS (CURATED SHAPES)" hint (`:907`) and the CARD-01 legibility instinct.
  If the guarantee is meant to survive plate-NONE, that's a spec/OQ line for the owner; the build
  faithfully implements 0063 as written.)*

### ✔ Matches (present · placed · behaving · on-aesthetic)
- **P1 BaseRail (CARD-16 never-blank):** opens already-composed; 3-up fan (fore + 2 neighbours) with 8
  bases — DEFAULT · NEBULA/HORIZON (TEMPLATE) · ARCADE/MUSEUM (KIT) · **QUIET SLATE / MIDNIGHT GILT
  typed PRESET — the CARD-24b merge is real** (`GET /me/style-presets` feeds the rail); ‹ › chevron
  rotate walks the fan with the dot rail tracking; label line names the 3 visible with the fore bolded;
  templates-vs-kits hint extended honestly ("your saved presets ride alongside"); **⯒ SURPRISE ME dealt
  a genuine composed start** (vignette + ribbon plate + Paytone font — inserted forefront, re-dealable);
  START WITH THIS → `POST /cards` → P2 on the new draft; adopt-door hint clean ("Adopting arrives with
  the gallery" — OQ-110-clean, no spec-IDs anywhere on the surface).
- **P2 the surface:** C4 save-state line LIVE and honest — "EDITING «Elden Ring» · SAVING…" → "SAVED 0s
  AGO" → ticks up ("SAVED 87s AGO"), debounced `PATCH /cards/:id` 200s observed per pick; C5 context
  line ("ELDEN RING · LIVE — EVERY PICK REDRAWS THE CARD"); **the skia hero renders the draft
  composition on web and REDRAWS on picks** (verified visually: the cyan PIXEL frame + SOFT GLOW beam +
  plate-NONE→SLAB transitions all appeared on the hero; CanvasKit boot clean); SectionChips = proper
  ARIA tabs (FRAME·EFFECT·FINISH·PLATE·TITLE + the always-present orange disabled ⤢ CANVAS); 5
  section dots, tap-navigable; pinned outcome bar exactly as drawn — SAVE PRIVATE quiet tert left, gold
  stepped KEEP — EQUIP IT right.
- **The five rails = decision 0063 to the letter:** FRAME 6 free (CLEAN·THIN LINE·DOUBLE LINE·TICKET·
  BRACKETS·PIXEL) · EFFECT none+5 (SOFT GLOW·SCANLINE·SHEEN·DUST·VIGNETTE), **NONE row first**, head
  "ONE AT A TIME", swap-hint cleaned ("Picking another effect swaps it — the slot holds one.") ·
  FINISH none+2 (STANDARD·MATTE·SUBTLE GLOSS), head "STACKS OVER THE EFFECT" · NAMEPLATE none+3
  (NONE·SLAB·RIBBON·BEVEL), head "NAMEPLATE — SHAPE" (premium MATERIAL correctly stripped) · TITLE
  2 fonts + 6 SR-labeled ink swatches. Every tile FREE-tagged; atile samples are live 64×100 skia
  renders (the manifest's allowed judgment call — noted).
- **IntensitySlider:** appears with an active effect, `role=slider` + "Effect intensity" label, bound at
  the deal's persisted 58% (OQ-048's intensity-in-composition write verified via the persisted value).
- **C4 ⋯ overflow = the ADDENDUM set exactly:** THIS DRAFT sheet → SAVE AS NEW CARD · SAVE STYLE AS
  PRESET · DISCARD DRAFT (danger). **Preset write verified live:** POST `/me/style-presets` → 201 +
  list refetch (and the client recovered a 401 via token-refresh-and-retry en route — resilience
  observed). DISCARD DRAFT → the 0040 ConfirmSheet ("DISCARD THIS DRAFT?" + consequence line + danger/
  CANCEL pair) → CANCEL leaves the draft intact.
- **KEEP (state-walk 5, end to end):** `POST /cards/:id/save-private` 200 → COL-06 equip
  `PATCH /me/collection/:entryId` 200 → **KeepBeat**: header ◂ flips to ✕, the finished card centered
  wearing a gold edge (the 0015 light tier), ✓ strip "EQUIPPED FOR ELDEN RING / Your shelf wears it
  now.", **honest-real clout "3 CARDS DESIGNED · 0 ADOPTIONS"** (incremented from the builder's 2 by
  this very review's card — live `/me` stats), disabled Canvas door, DONE — BACK TO THE GAME → lands on
  `/game/:gameId` **wearing the card** (PLAY hero face + CARD ARTIST YOU), collection caches invalidated
  (refetches observed).
- **SAVE PRIVATE (the quiet exit):** second draft → SAVE PRIVATE → no beat, straight back to the Game
  page; the card lists PRIVATE and NOT equipped. (The OQ-108 toast copy itself expired before capture —
  see not-exercised.)
- **Resume + crash-safety:** EDIT IN STYLER → `/styler/:gameId?cardId=` skips P1 and edits the same
  document; a mid-edit browser-tab kill lost nothing — the draft survived server-side and listed as
  DRAFT in the switcher (the CARD-24a document doing its job).
- **The game-page ADDENDUM rows (re-verified live):** multi-card switcher with real state tags
  (DEFAULT · DRAFT · ◆ EQUIPPED · PRIVATE) and live CardFace tiles; count line tracked 3→4→3 truthfully
  through my create/delete; select-ring moves on plain tap (ACT-IN-PLACE); per-state guards all correct —
  equipped → SET-AS-MAIN + DELETE disabled **with the note** ("Your shelf wears this card. Equip another
  before deleting it."), draft → SET-AS-MAIN disabled with "A draft resumes in the Styler — finish it
  (KEEP or SAVE PRIVATE) to equip it." + DELETE enabled, private → all live with DELETE danger-red,
  default → EDIT/DELETE disabled; **equip round-trip verified** (SET AS MAIN moved ◆ EQUIPPED to the
  walk card, PATCH 200); DELETE → 0040 sheet ("DELETE THIS CARD?" + "deleted everywhere… can't be
  undone.") → confirmed on my own cards only; EquipReadout chips derive the real composition (my kept
  card read exactly FRAME·PIXEL / EFFECT·SOFT GLOW / FINISH·SUBTLE GLOSS / NAMEPLATE·SLAB).
- **CARD-07 wear-through:** the Collection hero + row thumb render the equipped composition as live skia
  canvases (2 `<canvas>` mounts verified; the hero face visibly matches the equipped design, not the
  DEFAULT tile).
- **Shared chrome:** NavBand COLLECTION-active through every Styler state; flow-head ◂/STYLER; screen
  palette the app Midnight `theme.scr.*` (the recorded token note, not a finding).

### Not exercised
- **P9 loading skeleton · P10 LoadError (draft-safe copy)** — need a slow/failed fetch; not triggerable
  on a warm authenticated stack (same stance as the §3.1 L1/L2 rows). **Autosave failure-tolerance**
  ("NOT SAVED — RETRYING" + soft-fail) likewise — that's murr's named autosave lane; I did not kill the
  shared :4000 API to fake it.
- **IntensitySlider drag/tap** — RN-web PanResponder ignores CDP synthetic drags (known web-loop
  automation flakiness); value binding + persistence verified read-only at 58%.
- **KeepBeat pulse + reduce-motion honoring** — no OS reduce-motion toggle on the rig; the strip/static
  composition verified.
- **◂ quiet-exit tap + the zero-edit silent draft delete** (state-walk 6's no-orphan rule) — the
  autosave-survival half is proven (tab-kill), the silent-delete half isn't.
- **SAVE PRIVATE toast copy** (OQ-108 label) — the landing was verified; the transient toast (if
  rendered) expired before capture.
- **PRESET_LIMIT (cap-30 → 409)** — would need 29 more presets; the 201 write + refetch verified.
- **Profile favourite/now-playing CardFace** — "if quick" walk item; not visited (Collection wearing
  verified instead).
- **BaseRail growth after the preset save** — the POST + list refetch verified; P1 not re-opened to
  count 9 dots.

### Residue + workflow notes (doctor-nick / qa-runbook candidates)
- **Seed state restored:** walk card "Elden Ring" re-equipped as MAIN; both review-created cards
  deleted (0040-confirmed); Aurora untouched. **One residue:** a style preset created by the
  walk-ordered CARD-24b write test now lives in `/me/style-presets` (harmless under cap-30; owner may
  delete).
- **Workflow friction (capture for the ladder):** (1) Chrome MCP `zoom` left a stuck device-metrics
  override on the tab (viewport frozen at the zoom-region size; `resize_window`/Ctrl+0 don't clear it —
  only a fresh tab does). (2) A **hidden/backgrounded tab** throttles RN-web: CDP screenshots time out
  ("renderer frozen") or serve stale frames, timers freeze (the C4 ticker read "SAVED 0s AGO"
  perpetually) — check `document.visibilityState` before trusting captures; keep the review tab
  foreground (closing sibling tabs is not sufficient if the WINDOW's active tab is a non-group tab).
  (3) At ≤~575px viewport height the Styler's fixed column squeezes — the hero can measure 0 and the
  attr-rail slides under the pinned tools bar; desktop-web-only artifact (phone heights fit), but it
  makes short-window web QA misleading.

### The read of it
The Styler is **the board's free/private path, built for real, end to end** — never-blank entry with
the preset shelf merged in, a genuinely live skia hero that redraws per pick on web, the five 0063
rails exact, the draft document autosaving/ surviving crashes/ resuming by id, both outcomes (KEEP's
light beat with honest clout · SAVE PRIVATE's quiet exit) landing where the board says, and the
switcher + shelf wearing the result app-wide with correct per-state guards. The 0062 boundary is
respected everywhere premium is drawn, and the copy law held on every string I read. The two flags are
small and surgical — one real correctness bug in the composition patch (ink pick clobbers the font;
murr's named lane, catch it on the diff) and one board affordance (⇅ SORT) orphaned by the multi-card
flip. Nothing here blocks the surface from the owner's gate-5 taste stop once the patch bug closes —
**the trophy-case feel is now the owner's question, not fidelity's.**

### murr (diff review, `55a0386`+`e9138ce`, fresh-context, 2026-07-06) · verdict: **1 🔴 blocker · 5 🟠 major + minors**
Three of the top six shared one root cause — **the autosave PATCH invalidated no cache** — and the
exit paths each leaked user work:
- 🔴 **F1 stale-cache resume destroys edits** — resume read `getMyCards` from cache; re-entering a
  just-edited draft within the cache window resumed the OLD composition and the next autosave
  overwrote the new one server-side.
- 🟠 **F2** quiet-exit (◂) didn't flush a pending debounced save — the last edit inside the 1.2s
  window was dropped despite the "the draft is autosaved" promise.
- 🟠 **F3** SAVE-AS-NEW then ◂ silently deleted the explicitly saved card (it matched the
  zero-edit-delete signature).
- 🟠 **F4** the retry re-arm survived unmount/discard → a 404 PATCH loop every 3s until app restart.
- 🟠 **F5** equipped-card edits never reached the Collection surfaces on non-KEEP exits
  (invalidation gap).
- 🟠 **F6** the PLATE and TITLE rails rendered identical previews — tiles drew at 64px where the
  renderer drops the plate (the BOOT walk picked FRAME+EFFECT only, so it slipped).
- Minors: poisoned-lazy skia loader (one failed wasm fetch throws from every CardFace forever) ·
  `!.id` asserts on the selected-option lookups · no busy guards on the non-idempotent creates ·
  stale/foreign `?cardId=` spins forever · saveState lies "SAVING…" after a KEEP failure · slider
  children swallow `locationX` + no SR adjust actions.
- Clean confirmations where it matters: the KEEP invalidation chain, hooks order, the walk-6 delete
  heuristic (except the F3 arm), dust determinism, overlay order, preset round-trip fidelity, and
  every server guard attacked.

### Fix-round (builder, 2026-07-06) → **0 open flags**
- **🚩 #1 ink-pick-rewrites-font — CLOSED at the model.** `NameplateShape` gains `'none'`: a NONE
  plate pick patches ONLY `shape` — the nameplate object (title/font/ink) always survives in the
  document; nothing strips it, so no later pick can resurrect defaults (`composition.ts` ·
  `roster.ts` · `buildCard.ts` draws no plate/title for `shape:'none'`; the server schema's
  `.passthrough()` envelope takes it as-is). **Verified live end-to-end:** ARCADE start (PAYTONE) →
  plate NONE → GOLD ink → font still PAYTONE, round-tripped through quiet-exit flush → server →
  fresh resume (readout `NAMEPLATE · NONE / FONT · PAYTONE`, GOLD swatch selected). *The board's
  "THE NAME ALWAYS RENDERS" hint vs a titleless plate-NONE face is now **OQ-135** (owner/spec).*
- **🚩 #2 ⇅ SORT — CLOSED.** The switcher head renders `⇅ SORT` present-but-disabled (the surface's
  posture for deferred actions; ordering rides CARD-17 at-scale). Verified live next to the real
  count.
- **🔴 F1 — CLOSED.** `updateCard` now invalidates `['Cards','Collection']` (debounced autosave = a
  couple of tiny refetches per editing pause — personal scale, simple beats clever) and the resume
  effect gates on **fresh** data (`isSuccess && !isFetching`). Verified live: edit → exit → resume
  reads the flushed composition.
- **🟠 F2 — CLOSED.** ◂ flushes a pending/errored save fire-and-forget before navigating. Verified
  live under a frozen debounce timer (hidden-tab throttle): the picks reached the server anyway.
- **🟠 F3 — CLOSED.** An `explicitSave` flag from SAVE-AS-NEW vetoes the zero-edit delete (reset on
  a fresh START). *Code-level only — not live-walked.*
- **🟠 F4 — CLOSED.** An `aliveRef` guard stops the post-unmount re-arm; DISCARD clears the pending
  timer before deleting. Verified live: post-discard network log shows zero stray PATCHes.
- **🟠 F5 — CLOSED** by the F1 invalidation (`savePrivateCard` also gains `Collection`).
- **🟠 F6 — CLOSED.** PLATE/TITLE rails render their tiles at cell size (96×134, where the renderer
  draws the plate); the other rails stay 64×89. Verified live (canvas boxes measured).
- **Minors — all addressed:** lazy skia loader catches + degrades to an empty box (reload retries) ·
  selected-option lookups fall back to `'none'` · one in-flight guard across the three creates +
  busy START button · dead `?cardId=` → an honest **CARD NOT FOUND** state (verified live) ·
  KEEP/SAVE-PRIVATE set `saveState` truthfully on flush success/failure · slider children get
  `pointerEvents="none"` + SR increment/decrement actions.
- **Suite:** typecheck ✓ · custom lint ✓ · **262/262 tests** ✓ · zero console errors on the walk ·
  seed state restored (walk card equipped, count 3, QA draft discarded).
- **Result:** **0 open 🚩 flags** · 13 ✅ expected (all cited) · 4 🎨 held for the owner's gate-5 eye
  (START-WITH-THIS gold treatment · EQUIP-IT ◆ glyph · BaseRail label doubling · two default-face
  skins) + OQ-135 filed. → **the §3.2 gate-5 taste stop — the owner's call on the trophy-case feel.**


---

## Gate-5 amendment round (§3.1+§3.2 owner notes → build) · builder + fresh murr (M4, 2026-07-06)

**Input:** the owner's 27-step device walk (`gate5-walkthrough.md`) → 27 notes triaged in
`gate5-notes.md` (14 FIX · 3 DESIGN · 1 RULED · 4 SPEC · 1 ANSWERED · 3 owner-answered). All
built same-day; three owner decisions taken in-session: the two-door exit model (approved as
proposed) · D.26 moot under it · UNEQUIP as the C.10 un-equip path.

**Landed (commits `caa8b05..` this round):** display-only card faces + full-card tap targets
app-wide (A.3/C.12) + Shelf/Grid/Top navigate + renderer preload (A.1) + border inset (A.2) ·
per-stat inline dossier editing, form retired (B.8; B.5 hero /grid; B.6 keyboard insets) · the
implicit blank default + UNEQUIP + ◆ glyph chip + bigger cells (C.10/11) · CardDetail titled/
larger/clean credit (C.14) · page-root delete confirm (D.27) · the TWO-DOOR Styler exit (✕
confirm-discard-or-revert · SAVE ▸ outcome sheet · overflow gone; D.23/24/26) · one ticking
header line + ⤢ CANVAS on the tools bar (D.20) · fan swipe/tap-to-front + chip readout (D.17) ·
START leads (D.18) · FREE tags gone + plate/font previews (D.21) · **OQ-135 RULED: plate
required** (NONE off the roster; legacy `none`→SLAB; 0063 §4 amended) · OQ-136/137 filed.
**P0 first:** DISCARD on a resumed card REVERTS (never deletes) — the owner's D.23 data loss;
the seed shelf was re-run (the hand-kept walk card was unrecoverable).

**murr round-2 (fresh, on the amendment diff): 1 🔴 · 1 🟠 · 5 minor — all closed same-day:**
🔴 SAVE-AS-NEW left a resumed original silently mutated (autosave had written the session edits
into it) → it now settles the old row first (revert-to-snapshot / fold-in a non-explicit session
draft, timer cleared) · 🟠 a failed equip step after save-private left local status 'draft' and
✕ could quiet-delete a KEPT card → status records immediately · minors: busyExit double-tap
guard (+ ConfirmSheet busy) · KEEP-AS-DRAFT awaits its flush (the F1 window at the exit edge) ·
status-chip async callbacks scoped to the still-open editor · stale switcher errors cleared on
selection. Clean lanes: pointerEvents fallout (none), BaseRail gestures, legacy-'none' coercion,
EquipReadout call sites. *Pre-existing hole noted, not this round: the switcher shows the empty
state on a feed ERROR (data undefined) — carried.*

**Live evidence (web :8082):** shelf/grid/top taps navigate (18 targets) · hours 96→97→96 in
place (row + stats back) · UNEQUIP→implicit default→SET AS MAIN round-trip · ✕-discard on a
resumed draft REVERTED (font stayed PAYTONE, card survived — the exact D.23 kill-path) · the
SAVE ▸ sheet + KEEP AS DRAFT exit · **the murr-blocker repro: resumed original stayed TICKET
while the copy carried PIXEL** · plate rail = 3 plate-polygon previews, title rail = fonts ·
ticker ticks · zero console errors · seed restored. Suite: typecheck ✓ lint ✓ 13/13 mobile +
262/262 full ✓ /health 🟢.

**→ the owner re-walks the amended surfaces on device; then the Canvas (§3.4).**

---

## Canvas (§3.4 — the deep gesture editor, the Styler's breakout posture) · parvati (M4, 2026-07-07, head `cd6cd1f`)

**Verdict:** 2 🚩 flag · 12 ✅ expected (all cited) · 2 🎨 polish · (extensive ✔ matches) — measured vs
the M4 DoD (§8), `canvas-manifest.md` **+ its banner (0062 boundary · ARCH one-document · CARD-16
pairs table) + its ADDENDUM** (recorded interims honored), `canvas-states.html` P1–P11, and the
declared seams (autosave `PATCH /cards/:id` · `POST /cards/:id/save-private` — **no new endpoints
observed in the network log**, PROOF fired no server call).
**Reviewed from:** own Expo-web walk (fresh session, real login, ~554×891 CSS viewport), on a card I
created via DESIGN NEW → START WITH THIS, plus a resume pass on it and a RESET/RADIUS pass on the
residue draft. Both CARD-16 columns walked where the rig allowed: taps/steppers fully; the gesture
column via stepped synthetic mouse events (CDP `left_click_drag` would not drive the PanResponder
this run — see workflow notes). Entry exercised through BOTH doors (⤢ CANVAS tools-bar + the
KeepBeat EDIT-ART door).

### 🚩 Flag (owed at M4)
- **PROOF · top-bar sub "· PROOFING" missing** — MISPLACED — during proof the top bar keeps
  "ELDEN RING · DRAFT · AUTOSAVED Ns AGO"; the PROOFING signal renders only as the bed caption
  ("PROOFING — THE TRUE PRINT, CLOSED ATTRIBUTES LIVE…") + the key's ON state. The manifest OWES the
  saveLine variant. Small: swap the sub to "· PROOFING" while proofing (the honest save-line can
  return on lift). Cite: manifest P6 row 5 (OWED) · board `:743` (`DESTINY · PROOFING`).
- **WebGL-context exhaustion after a Canvas session → UNCAUGHT canvaskit error + a blank switcher
  tile** — behavior/regression — after the full canvas walk, the game-page CARDS switcher raised an
  **uncaught** `TypeError: Cannot read properties of null (reading 'rangeMin')` from CanvasKit
  `MakeWebGLCanvasSurface → _MakeGrContext` (surface creation failing at the browser's WebGL-context
  ceiling), and the residue DRAFT tile rendered **blank white** — while the SAME composition renders
  fine on the Canvas bed (7 elements). The LogBox overlay re-expands on every remount/refetch and
  **steals taps** (it ate a KEEP tap and a RADIUS tap mid-walk). The strips architecture solved the
  ceiling *inside* the Canvas (ADDENDUM), and the murr fix covers the *loader*; **surface-creation
  failure has no catch-and-degrade** — the F21 default-face envelope should cover it instead of an
  uncaught throw. Repro: make→canvas walk→SAVE PRIVATE→CARDS. Cite: ADDENDUM "ONE-CANVAS STRIPS"
  (the app-wide ceiling note filed to open-questions is the *at-scale budget* item — this flag is
  the missing graceful degrade + uncaught console error on an M4 surface, against the standing
  "zero console errors" bar).

### ✅ Expected (deferred — proceed; the 0062 banner governs)
- **◆ PUBLISH present-but-DISABLED** — gold row, `aria-disabled="true"`, sub-line "Adoptable by
  everyone — arrives with the community release." Exactly the drawn posture. Cite: manifest P7 row 4
  — EXPECTED(M5 · CARD-04/19/20, 0062 §2).
- **CARD-19 checklist** (complexity · hash-dedup · premium-owned) — not rendered on the PressSheet.
  Cite: manifest P7 row 3 — EXPECTED(M5).
- **P8 PrintRitual** (whole state, incl. SHARE CARD-21 + NOTIF-04) — not built; KEEP's light beat
  remains the celebration (verified live). Cite: manifest P8 — EXPECTED(M5 · OQ-040/0062 §2/§7).
- **Publish rate-limit (SYS-05)** — rides publish. Cite: manifest P7 row 8 — EXPECTED(M5).
- **★ favourites present-but-disabled** — SR label "Favourites — arrives with the full library".
  Cite: manifest P3 row 4 + ADDENDUM — CARD-17 at-scale.
- **SEARCH absent** from the AssetShelf. Cite: same ADDENDUM line.
- **GROUP present-but-disabled** in the ops row. Cite: manifest P5 row 3 — CARD-08 at-scale/§3.6.
- **Icons = the 20-real subset** — verified by SR label, exactly the ADDENDUM list (star…medal).
  Cite: ADDENDUM "Icons 20 real" (0063 §6 owns the rest).
- **Pan/zoom · align/distribute · true eyedropper/saved palettes · text spacing/align/case** — all
  absent; the EDIT sheet's used-colours row (a 9th in-card swatch appeared on the residue draft)
  stands in for the eyedropper. Cite: ADDENDUM at-scale block.
- **P9 skeleton / P10 SIGNAL-LOST** — not independently reachable; the posture switch is synchronous
  on an in-memory session; lifecycle crossed in the Styler posture. Cite: manifest P9–P11 row 1
  (SUBSUMED).
- **P11 offline** — not built. Cite: manifest P9–P11 row 2 — EXPECTED(SYS-10); soft-fail autosave is
  murr's lane, not exercised here (shared API left alive).
- **Slip tilt dressing (r1/r2/r3 ±2°) dropped** — rack panes upright; the pulled lift IS kept.
  Cite: ADDENDUM ONE-CANVAS STRIPS consequence (token-level, recorded).

### 🎨 Polish / iteration (built-app visual/DS)
- **Text slips draw late on the bed at posture mount** — re-entering the Canvas on a card carrying a
  text element, shapes draw immediately but the text element pops in ~2–2.5s later (font/paragraph
  async); observed twice (post-delete redraw + the KeepBeat-door entry). Self-heals, rack pane
  unaffected — but the bed briefly lies about the composition. → have the bed redraw on font-ready.
- **The EDIT slip-sheet's SR "Close" node is not activatable** — the a11y tree exposes a "Close"
  generic on all three drawers; on the EDIT sheet, activating it did nothing twice (bed-tap and the
  grab-handle dismiss fine; the board draws handle-only, so no visible-✕ divergence). CARD-16-adjacent
  nit for the §3.6 pass — same family as the §3.1 CardDetail ✕ finding.

### ✔ Matches (present · placed · behaving · on-aesthetic)
- **Entry (P1, both doors):** the Styler's ⤢ CANVAS tools-bar key is LIVE and flips the posture
  in-route (URL unchanged — the ARCH one-document rail holds: same `/styler/[gameId]` route
  throughout); the KeepBeat door reads "⤢ EDIT ART — REOPEN IN THE CANVAS" LIVE and opens the
  posture from `kept`. Entry beat: the shell-swing edge decor renders and fades (~1.6s, caught on
  camera); NavBand (COLLECTION active) + DeviceShell persist through every canvas state.
- **C2 top bar:** ◂ key · "CANVAS" display · sub-line "«ELDEN RING» · DRAFT/PRIVATE · AUTOSAVED Ns
  AGO / SAVING…" — ticking, and the DRAFT→PRIVATE token tracked the card's real status across the
  save-private boundary.
- **The bed (P1):** registration corners + dashed safe-area + the composition BARE — base + vectors
  only; frame/plate/effect appeared NOWHERE on the bed and EVERYWHERE on PROOF. Empty-rack state
  honest ("NO SLIPS YET — ADD ONE TO START LAYERING", editbar dim, cap 0 / 30 gold).
- **ADD (P3):** PulledSheet grammar (handle + grab), head "ADD A SLIP — ALL FREE" (OQ-110-clean, no
  spec-IDs anywhere on the surface), cap-meter in-sheet, categories SHAPES·LETTERS·NUMBERS·ICONS·
  BASE·★ with active pip; **13 shapes** (square rounded circle ellipse triangle pentagon hexagon
  octagon star diamond line heart arrow — the 0063 §1 roster); LETTERS = A–Z + the **ADD TEXT…**
  row (typed "GUARDIAN" → landed as a text slip); BASE row = 4 gradient swatches, picking is a
  base patch not an element; **every pick lands ON THE BED as a new pulled slip, the sheet closes,
  the cap ticks** (0→1→2→3 across star/invader/text).
- **Pull + isolation (P2):** pull = tap; ONE pulled at a time (tap another switches, tap again
  releases); unpulled elements ghost to ~28% with the pulled one full; "ISOLATION · ON" stat-chip
  top-right; sel-ring = accent box + 4 cream corner handles riding the element through every move.
- **Ops row (P5):** opened via the pulled slip's **⋯ badge** (the CARD-16 tap pair for long-press);
  RENAME (inline bounded input + ✓ SAVE/CANCEL — STAR→"HERO" persisted to the rack + SR labels) ·
  LOCK (🔒 badge; **bed drag refused AND NumPop steppers refused** — X frozen at 126 under both;
  X·Y op + EDIT THIS SLIP + RESET disable) · UNLOCK restores · HIDE (HID badge, dimmed pane, the
  element LEAVES the bed; op flips to SHOW; still pullable via rack) · DUPLICATE (4/30, dup lands
  pulled, offset) · **◂ ▸ MOVE ops** (dup walked to rack end; ▸ disables at the end; ring follows;
  Z-order = rack order visible on the bed) · DELETE (danger, **no ConfirmSheet — undo-covered**,
  cap back to 3/30, pull released).
- **NumPop (CARD-09/16):** X·Y op opens the popover — X/Y/W/H/ROT steppers + **tap-to-type**
  (typed Y=100 → the element moved, the rack pane synced); values are bed-pixel truth and refresh
  from the element (drag → re-open showed the moved values).
- **Bed gestures:** drag moved the element (sel-ring + rack pane + autosave all followed);
  corner-handle scale grew it; **UNDO reversed the whole scale drag as ONE history entry**, REDO
  reapplied; each step scheduled a save. **RESET SLIP** reverted the pulled element to its
  PULL-time snapshot (radius 18→0 + fill, verified on the residue-draft pass).
- **EDIT slip-sheet (P4):** the bed stays LIT in isolation above the sheet — **no scrim-dim on the
  work** (the ADD sheet correctly dims; the EDIT sheet correctly doesn't). Shape sheet ("THE HERO
  SLIP · VECTOR · SHAPE · ISOLATION ON"): OPACITY slider · FILL palette · STYLE SOLID/**GRADIENT →
  a STOP 2 row appears** (fill2, cream→pink live on the bed) · STROKE NONE/THIN/THICK → **a STROKE
  INK colour row appears** · GLOW ON (real bloom, live) · BLEND NORMAL/SCREEN/MULTIPLY · FLIP ↔/↕ ·
  DUP · DELETE; **RADIUS renders on the rect sheet only** (present on SQUARE, absent on STAR —
  rect-only per the manifest), cycles live. Text sheet ("THE GUARDIAN SLIP · TEXT"): content
  editable · FONT CHAKRA/PAYTONE · CURVE NONE/**ARC** — Paytone + arc + cyan fill all redrew the
  bed instantly (CARD-11 arc text real).
- **PROOF (P6):** tap TOGGLES ("👁 PROOF — ON" state) — the true print stamps: the flatten with the
  F-02 stepped corners, frame CLEAN + plate SLAB "ELDEN RING" live (closed attributes appear ONLY
  here); slips/editbar hide behind the proof panel; **the ladder reads CELL·96 · MINI·64 · THUMB·48**
  (the app's real dims) with the **plate legible at 96 and DROPPED at 64/48** (F-06/0047, visible);
  ladder hint verbatim-faithful ("what you proof is what the shelf, top lists & rows show"); re-tap
  lifts it and the slips return. No network call fired during proof (client flatten confirmed).
- **PRESS (P7):** gold PRESS ▸ raises the finish-up sheet over the dimmed bed — "THE PRESS — WHERE
  DOES IT GO?" · ◆ PUBLISH (disabled-gold, above) · SAVE PRIVATE ("Kept on your shelf — not worn.")
  · TO THE STYLER ("Swap posture — same draft…") · CANCEL (dim tert; verified it just closes —
  editing continued).
- **TO THE STYLER round-trip:** posture flips back with the session intact — the Styler hero AND
  every FRAME-rail tile render the canvas elements (one document, one render tree — WYSIWYG across
  postures); nothing written on the switch.
- **SAVE PRIVATE exit:** flush → `POST /cards/:id/save-private` 200 → lands on the game page; the
  card lists PRIVATE, NOT equipped; the switcher count tracked 5→6 truthfully. (En route the client
  recovered a 401 with token-refresh-and-retry on the flush PATCH — resilience observed again.)
- **The two-door regression walk (murr's priority, state-walk 8):** resume by `?cardId=` skips P1
  and edits the same document; canvas element edits **count as `userEdits`** — ✕ raised "LEAVE
  WITHOUT KEEPING?" with the REVERT wording ("…keeps its last saved state"); CANCEL kept the
  session; **DISCARD EDITS fired a revert PATCH 200 and the card SURVIVED with the deleted element
  RESTORED** (invader back on tile + in the re-entered rack at 3/30) — the D.23 kill-path holds for
  canvas edits. **KEEP rebaselined:** ✕ straight after KEEP exited silently (no confirm, no delete
  of the kept card). KEEP itself: `save-private` + equip chain → KeepBeat (gold-edged card, ✓
  EQUIPPED strip, honest clout "10 CARDS DESIGNED · 0 ADOPTIONS") → the now-live EDIT-ART door
  re-opened the canvas on the kept state.
- **Autosave (C4/CARD-24a):** every mutation class fired the debounced PATCH (add/move/scale/rotate/
  field-edit/rename/lock/hide/dup/reorder/delete/base — "SAVING…" → "AUTOSAVED 0S AGO" observed
  repeatedly); the save-line never lied within the walk's observation.
- **Coherence:** the cap meter tracked the true element count through every mutation (0→…→4→3;
  3 on revert); the switcher count line tracked create/delete (5→6→5); EquipReadout on the saved
  card read exactly the closed attributes the canvas never touched (CLEAN/NONE/STANDARD/SLAB/CHAKRA).

### Not exercised
- **Long-press → ops row** and **long-press drag-Z reorder** — CDP long-press is flaky (known);
  the built-alongside pairs (⋯ badge · ◂ ▸ ops) are verified — the CARD-16 table's non-gesture
  column is fully green, the gesture column verified for tap/drag/scale but not the two
  long-press gestures.
- **PROOF press-and-hold (momentary)** — synthetic mousedown didn't engage the responder on web;
  the tap-toggle pair verified both ways (the ADDENDUM's guarded onPress fallback is why tap is
  the web-reliable path).
- **Center snap-guide flash** — drags moved elements fine but the transient guide flash isn't
  capturable via CDP stills; not judged.
- **Stacked-tap disambiguation** (repeat-tap cycles deeper) — not exercised.
- **At-cap 30/30** (meter reds + picks disable) — not walked to 30.
- **Autosave failure tolerance** ("NOT SAVED — RETRYING") — murr's named lane; the shared :4000 API
  was left alive.
- **Reduce-motion entry fade** — no OS toggle on the rig.

### Residue + workflow notes
- **Residue:** net-zero on my part — the walk card (star/invader/GUARDIAN) was created, saved
  private, KEPT (equipped), unequipped via SET-AS-MAIN back to Aurora, and DELETED through the 0040
  sheet; the residue draft "Elden Ring II" had a square added and session-DISCARDED (reverted);
  final state = the 5 cards I found, Aurora ◆ MAIN. Two clout side-effects persist: "CARDS
  DESIGNED" incremented by my create (displayed 10 at the beat; deletes don't decrement) — and the
  pre-existing walk residue (the white-rendering DRAFT + Aurora's element edits) still argues for
  the ADDENDUM's **re-run `db:seed-dev` before the owner stop**.
- **Workflow (qa-runbook candidates):** (1) the whole-hidden-window fix needed re-running ~5×
  (the window falls back after every shell round-trip; `visibilityState` stayed 'hidden' the entire
  run yet **timers ran at ~57ms drift and clicks/network all worked — only `Page.captureScreenshot`
  froze**; the a11y/page-text/network lanes never broke). (2) **CDP `left_click_drag` did NOT drive
  the PanResponder this run** — stepped synthetic `mousedown/mousemove×8/mouseup` via
  `javascript_tool` DID (bed drag + corner scale both verified through it); worth folding into the
  runbook as the reliable RN-web drag recipe. (3) The RN-web LogBox overlay from flag #2 re-expands
  over the UI and **eats taps** — dismiss before every interaction once it's up.

### The read of it
The Canvas is **the board's press-shop, built and behaving as one posture of the Styler's document**
— the entry beat lands, the bed is honestly bare, pull/isolation/sel-ring feel exactly like the
thesis, the ops row + NumPop give every gesture its tap twin (LOCK genuinely locks both lanes), the
EDIT sheets are the full CARD-10/11 grammar with live redraws, PROOF is a real client flatten
wearing the closed attributes with the honest 96/64/48 legibility ladder, and the PressSheet's
0062 posture is exact — publish present, disabled, correctly worded. The exit model survived its
own kill-path: discard reverted canvas element edits server-side and never touched the kept card.
The two flags are one small copy-dock miss (the PROOFING sub-line) and one real robustness gap the
walk itself smoked out — WebGL-context exhaustion after a canvas session throws uncaught and blanks
a switcher tile instead of degrading to the default face. Close those and this surface is ready for
the owner's gate-5 hands — **the depth is real; what's left to judge is whether the workshop
*feels* like the trophy case's back room.**

### Fix-round (builder, 2026-07-07, commit follows) → **0 open flags**
- **🚩 #1 PROOFING sub-line — CLOSED.** The Canvas top bar flips to `«GAME» · PROOFING` while the
  print is stamped (board `:743`, manifest P6 row 5). **Verified live** on :8082 — the sub read
  "ELDEN RING · PROOFING" during proof and returned to the ticking AUTOSAVED line on lift.
- **🚩 #2 WebGL surface-creation crash — CLOSED at the F21 posture.** New `SkiaErrorBoundary`
  (catch-and-degrade for the `MakeWebGLCanvasSurface` mount throw at the browser context ceiling)
  now wraps EVERY skia consumer: `CardFace` degrades to the **default face** (the F21 rule),
  the press bed / rack strip / shelf strips / proof print degrade to an empty pane. No more
  uncaught LogBox, no blank switcher tile. *Code-level: the boundary catches the mount-throw path
  (verified by construction + clean boot); the exhaustion itself was not re-provoked — the strip
  architecture keeps the Canvas ≤5 contexts, so the boundary is the last-resort catch, and OQ-138
  owns the app-wide budget stance at M5 entry.*
- **🎨 both recorded, not fixed this round:** the text-slip font-async first paint (~2s on a cold
  posture mount) rides the render-module warmup; the EDIT sheet's SR-"Close" activation rides the
  §3.6 a11y pass (bed-tap/handle dismissal work).
- **Suite:** typecheck ✓ · lint ✓ · 20/20 mobile ✓. **Seed state restored for the owner stop:**
  all four walk/QA residue cards deleted through the 0040 sheets, Aurora deleted + `db:seed-dev`
  re-run — the switcher reads exactly the pristine seed ("YOUR CARDS FOR ELDEN RING — 1", Aurora
  ◆ equipped, original composition). parvati's runbook candidates (window re-front hits, the
  stepped-mouse drag recipe, LogBox tap-stealing) are captured in `docs/qa-runbook.md`.
- **Result:** **0 open 🚩 flags** · 12 ✅ expected (all cited) · 2 🎨 recorded → **the §3.4
  first-article + gate-5 taste stop — the owner's call on the workshop's feel.**

---

## Canvas (§3.4) — gate-5 acceptance fix pass · builder + fresh murr (M4, 2026-07-08, spec-owner)

**Input:** the owner's device acceptance walk of the whole Canvas → **23 CRs** triaged in
`canvas-gate-notes.md` (all 7 decision-needed RULED same-day). **Specs formalized first** (00-INDEX §4):
decision **0067** anchors the batch; product-spec 0.53 (CARD-24a copy-on-write), api-contract 0.54,
design-spec 0.53, component-map 0.5, OQ-139/140, OQ-007 re-resolved, the manifest C1/C3/ARCH corrected +
a GATE-5 REVISION ADDENDUM. `/health` 🟢.

**Built (all 23 CRs):** the breakout is a **scale-transform ZOOM** (CR-01, transform-only, no remount) ·
**copy-on-write** for committed-card edits (CR-21 — the data-model change: `derived_from_card_id`) ·
the **`TransformDrawer`** subsumes `NumPop` (CR-10) · `base` = a pinned recolour-only **pseudo-slip**,
BASE off ADD (CR-08) · a shared **`ColorPicker`**+hex on Canvas fill/stroke (CR-11; title ink stays
curated, OQ-137/M5) · SAVE PRIVATE gold + a light press beat (CR-17) · isolation toggle (CR-05) ·
add→open-EDIT (CR-09) · cross-posture save disclaimer (CR-20) · the FIX bundle (CR-02/03/04/06/07/12/
13/14/15/16/18/19) · game-page CARDS switcher 3-up (CR-22). The FIX/DESIGN Canvas-component bundle ran
through a builder subagent; the load-bearing CR-21/CR-01 + the two new components were built directly.

**murr (fresh, adversarial diff review) → 1🟠 + 3🟡; M1 fixed + murr-re-verified CLOSED:**
🟠 **M1** — a KEEP/SAVE tapped **during the in-flight copy POST** leaked an orphan copy + re-pointed the
kept session at it (the copy `createCard` promise was untracked). **Fixed:** `copyInflightRef` tracks
the POST; `keep`/`savePrivateQuiet`/`keepAsDraftExit`/`saveAsNew`/`discardDraft` all **settle it first**
and read the hot `cardRef` (not the stale `cardRow` closure); the copy-vs-fork decision derives from
`originRef`. **murr re-verified: CLOSED** (orphan leak · microtask ordering · POST-failure path ·
double-nav · the crash-recovered-copy resume case). 🟡 m2/m3 — the TransformDrawer clamps/slider ranges
now match the ops bounds (exported `POS/SIZE/TEXT_SIZE` constants). 🟡 m1 — a dead `resumeSnapshotRef`
assignment on the private path (documented, harmless). **Six lanes murr confirmed clean:** copy-on-write
origin preservation · no-remount-across-zoom · two-door exit/CARD-24a (draft path unchanged) ·
base-pseudo-slip immutability · roster→composition patch-correctness · autosave/BackHandler/lock.

**Suite:** typecheck ✓ · eslint + custom lint ✓ · **267/267** vitest (+4 new copy-on-write integration
tests) · **20/20** mobile jest · **/health 🟢**. **Live dev env:** migration 0006 applied to the dev DB;
the running API `:4000` serves the new schema — an end-to-end copy-on-write POST round-tripped
(`derivedFromCardId` accepted + returned); seed pristine.

**Owed to the owner's gate-5 (native):** the **parvati VISUAL walk** — the web `:8082` lane was
infra-blocked this pass (an expo-cli dependency-validation crash `EXPO_OFFLINE` didn't dodge; runbook
noted), and web can't show the native zoom + comes up bed-blank regardless. The zoom *feel* + bed paint
+ the new-surface taste are the owner's native call.

**→ ⛔ HARD STOP: the owner's gate-5 taste on the reworked Canvas + sign-off on the CR-21
`derived_from_card_id` data-model (0067 §2); run parvati on device. §3.5 Device NOT started.**

---

## Canvas (§3.4) — gate-5 device-walk directives · parvati VISUAL walk (M4, 2026-07-08)

**The walk owed by the fix-pass note above.** Ran on the `:8082` web preview (Chrome), demo@ingame.app,
against the 8 owner device-walk directives (the CR checklist in `canvas-gate-notes.md` / decision 0067).
Path: login → Elden Ring → CARDS → Aurora → EDIT IN STYLER → ⤢ CANVAS. Measured vs the
`canvas-manifest.md` GATE-5 REVISION ADDENDUM + the 23-CR ledger.

**Verdict: 8/8 directives MATCH · 0 🚩 flag · 2 🎨 polish/observation.** (measured vs the M4 Canvas
manifest + CR-01/02/03/08/10/11/13/14/19 + items 1–8)

**✅ MATCHES (directive-by-directive, with evidence):**
1. **Bottom panel, not drawers (item 1).** EDIT opens as an INLINE bottom panel ("THE «NAME» SLIP" +
   ✕) below the card; the card + sel-ring stay fully lit/undimmed above it (no scrim on the work).
   TRANSFORM + base-EDIT open the same way. (PRESS still a drawer — correct, not checked destructively.)
2. **Base slip in the rail (item 2 / CR-08).** `base` is the rightmost slip in the horizontal rail
   (after ARROW), non-deletable; tapping it + EDIT opens **"THE BASE SLIP · BASE · COLOUR ONLY"** —
   colour-only (STYLE SOLID/GRADIENT + FILL, no opacity/stroke/flip). Pinned pseudo-slip confirmed.
3. **Transform menu (item 3 / CR-10).** POSITION = **4 direction arrows** (d-pad ▲◀▶▼), NO joystick;
   SIZE = W/H sliders + steppers; ROTATION = **ROTATE slider** (0°), NO circular dial; **RESIZE BOX ·
   ON** toggle present. TRANSFORM is an editbar button **between RESET SLIP and UNDO**. Sel-ring corner
   handles enlarged. *(Note: built to the owner's SPOKEN walk directive — arrows + slider — which
   diverges from the CR-10 written wording "joystick + dial" in canvas-gate-notes.md §CR-10. The build
   made the right call; flagged below as a doc-consistency 🎨.)*
4. **Flip glyphs, not emoji (item 4 / CR-13/14).** MORE row FLIP-H / FLIP-V use drawn double-arrow
   glyphs. Whole-app emoji audit (DOM text-node scan): **zero emoji** outside two benign unicode marks
   (`⇅` SORT on the game page behind, `✕` close). No 👁, no ↔/↕. UI draws glyphs via 23 `<svg>` + 15
   `<canvas>`.
5. **Eyedropper pipette (item 5).** FROM-CARD control carries a drawn pipette glyph (1 `<svg>` in the
   button), not a plain circle/emoji.
6. **Colour control closed by default (item 6 / CR-11).** FILL shows swatch + recents row + PICK COLOUR
   + FROM CARD, picker COLLAPSED. Tapping PICK COLOUR opens the full picker (HS sat/val area + hue bar +
   **# hex field**, read `1C1A2E`) and the button flips to CLOSE PICKER. Closes back to collapsed.
7. **Recents populate (item 7).** Picked 2–3 colours → FILL recents row went from "NO RECENT COLOURS
   YET" to 3 swatches, most-recent-first; recents persist session-wide (survived base→star slip switch).
8. **Sanity (item 8).** ⤢ CANVAS entry (no route change — posture switch on `/styler/...`; zoom to
   full-bleed, shell yields) and ◂ exit (zoom reverses, shell + composited card restore, session
   continues) both clean. Cap-meter "8 / 30" renders **orange** (CR-03). PROOF drawn-glyph. **Zero
   uncaught console errors** across the whole walk. 15 canvases at peak — under the ~16 WebGL ceiling.
   Also observed live: editing the PRIVATE Aurora spun a **DRAFT copy** (sub-line PRIVATE→DRAFT on first
   edit) — CR-21 copy-on-write visibly working.

**🎨 Polish / observations (not milestone blockers):**
- **CR-10 doc-vs-build wording drift** — the BUILT TransformDrawer uses **4 arrows + a rotation slider**
  (matching the owner's spoken walk directive), but `canvas-gate-notes.md` CR-10 + the manifest ADDENDUM
  still say "joystick + dial." The build is correct to the owner's intent; the DOC wording should be
  reconciled to "arrows + slider" so a future reader isn't misled. Spec-owner nit, not a build change.
- **rn-skia-WEB bed paint + CDP capture race (rig limit, already owned).** The large press-bed skia
  surface intermittently comes up blank / stalls CDP screenshots until a viewport nudge — the documented
  web-only CanvasKit init race (manifest "Web bed-paint quirk"; native paints on first open per owner
  2026-07-08). Rack strip thumbnails + all RN panels/controls render fine throughout. Not a product bug;
  does not gate the native ship.

**Not exercised (rig limits, stated honestly):** PRESS→SAVE-PRIVATE full exit + light press beat
(CR-17), ✕→discard revert, PROOF flatten+ladder stamp, long-press ops row (CR-12 close affordance),
lock-glyph badge (CR-13) on a locked slip, UNDO/REDO taps, isolation on/off toggle (CR-05), cross-posture
save disclaimer (CR-20) — these need a driven interaction or destructive step the web CDP lane couldn't
reliably reach this pass; the BOOT-walk + murr rounds cover most. **The zoom *feel*, native bed paint,
and the reworked-surface taste remain the owner's native gate-5 call.**

**Seed residue:** the walk's colour edits landed on a copy-on-write DRAFT of Aurora (original PRIVATE
pristine by CR-21). Re-run `npm -w @ingame/api run db:seed-dev` before the owner stop to clear the draft
(the §3.2-round precedent). **→ DONE: seed re-run — Aurora private+equipped, shelf 17/17, draft cleared.**

### murr (device-walk round 2, fresh-context, same day) → 0 blockers · 1🟠 + 3🟡 — all fixed/dispositioned
All seven risk lanes CLEAN (bottom-panel mode exclusivity · hold-to-repeat interval cleanup ·
recents-debounce teardown · base-in-rail index safety · the zoom cover's no-remount — the cover is a
SIBLING of `{children}`, so the route + skia bed never remount · showHandles · patch-correctness), and
murr independently **re-confirmed CR-21 copy-on-write / two-door exit holds**. **Fixed:** 🟠 **M1** — the
rotation slider reused `IntensitySlider` and showed a bogus "N%" beside the degrees (+ SR announced a
percent) → `IntensitySlider` gained a `valueText` prop; rotation shows `NNN°`, W/H show size-%. 🟡 **m2** —
RESIZE BOX OFF now **disables the corner-scale hit-test** (was hiding only the handles) so box-off truly
lets you drag-move without a stray scale. 🟡 **m3** — deleted orphaned `NumPop.tsx` + dead
`dimmed`/`benchHint*` styles. **Dispositioned:** 🟡 **m1** — the copy-POST lost-response duplicate edge →
**OQ-141** (defer; non-data-loss). Suite after fixes: typecheck ✓ · lint ✓ · 20/20 mobile ✓. Docs
reconciled (design-spec/component-map/manifest ADDENDUM now say arrows+slider, not joystick+dial).

**→ ⛔ HARD STOP: the owner's device re-walk of the reworked Canvas** (bottom panel · base-in-rail ·
arrows+slider transform · the zoom feel) + sign-off on the CR-21 data-model. Web `:8082` is up. §3.5 not started.

---

## Styler roster expansion + animation driver (decision 0068) · parvati (M4, 2026-07-09)

**Verdict:** 3 🚩 flag (ALL found + fixed + re-verified in-session → **0 open**) · 3 🎨 polish/notes · (all
rails + render paths MATCH) — measured vs decision **0068** (the all-basic-now expansion + the animation
invariant) and the `styler-manifest.md` attribute-rail rows (D.21 preview grammar).
**Reviewed from:** own web `:8082` walk (fresh login → Elden Ring → CARDS → EDIT IN STYLER on the Aurora
private card), the FRAME/EFFECT/PLATE/TITLE rails + the hero wearing EMBER GLOW frame and the EMBERS
effect; console read clean throughout; seed restored (session copy discarded — copy-on-write left the
original Aurora untouched). **Static-screenshot limit noted:** continuous MOTION (marquee chase · ember
rise · frost/holo/metallic sheen sweep) cannot be verified from stills — owed on device; the driver
MOUNTING + the static keyframes ARE verified here.

### 🚩 Flags (found DURING this pass; fixed + re-verified — 0 open)
- **FRAME rail blanked most tiles** — behavior/regression — the AttributeSection drew one live `<CardFace>`
  `<Canvas>` per tile; the 16-frame rail + the hero = 17 skia contexts, over the browser's ~16-WebGL ceiling
  → tiles 4-16 rendered blank. Exactly the exhaustion the §3.4 review filed. **FIXED:** all card-preview
  rails now draw through ONE strip canvas (`buildCompositionStrip` → `CompositionStrip` → the AttributeSection
  `CardRail` — transparent Pressable overlays for taps/a11y/labels, one pip over the selected tile), the same
  ADDENDUM "ONE-CANVAS STRIPS" rule the AssetShelf/LayerRack follow. **Re-verified:** all 16 FRAME + 10 EFFECT
  tiles render live.
- **New font previews rendered in Chakra** — MISPLACED (wrong face) — the TITLE `FontPreview` `<Text>` maps
  fontId→RN family via `FONT_FAMILY`, which only had the two original fonts, and the 5 new RN fonts weren't
  loaded in `_layout`. **FIXED:** `FONT_FAMILY` + `useFonts` gained press-start/bitter/space-mono/pacifico/
  stencil. **Re-verified:** the TITLE rail shows all 7 fonts in their real faces (Pacifico script · Space Mono ·
  Bitter serif visibly distinct).
- **PLATE rail previewed the 5 new shapes as SLAB** — MISPLACED — `PlatePreview` (an SVG) only drew ribbon/
  bevel/slab; capsule/tab/arch/dogtag/brass fell through to the slab rect, so the tiles lied about the pick
  (D.21 says the plate tile previews the actual plate). **FIXED:** added the five SVG paths + brass gold tint.
  **Re-verified:** all 8 plate tiles render distinct (CAPSULE rounded · TAB folder-tab · ARCH domed · DOGTAG
  hexagon ends · BRASS gold).

### 🎨 Polish / notes (built-app; owner's eye)
- **Marquee chase light traces a plain rectangle, not the F-02 stepped notch** (murr minor) — the static track
  hugs the stepped silhouette but the live light cuts across the TL/BR notches. Hero-only, softened by the
  blur; owner-taste call whether to trace the stepped arc-length.
- **STUB rides ticket-notch in the app accent-orange** (`#ff9f43`) — a deliberate de-dup so it isn't a second
  cream TICKET (0068). Colour is the owner's to re-tune.
- **All entries are `tier:'basic'`** by 0068 — no premium tag/lock renders anywhere (correct; the split is
  deferred to when the owner finalizes the sets).

### ✅ Matches (present · placed · on-aesthetic)
- FRAME rail — 16 tiles, each the draft wearing that frame (glow bloom, foil/ornate/chrome/pixel all visible);
  EMBER GLOW applied to the hero renders its red bloom. EFFECT rail — 10 tiles (halftone dot-screen, grain,
  frost, embers all reading); EMBERS on the hero renders the warm hearth keyframe + rising motes (the driver
  mounts, zero console errors). PLATE rail — 8 distinct shapes. TITLE rail — 7 real faces + the ink row.
  Autosave ticks + persists; the two-door exit (✕ → discard-the-copy) behaves per 0067.

### Residue
- One orphan DRAFT created during the walk (a START-WITH-THIS on the first pass, before a reload) — harmless
  under cap-30; owner may delete from the Elden Ring switcher.

**→ owner's gate-5 taste on the reworked rails + the MOTION on device (the one thing stills can't show).**

---

## Canvas (§3.4) — gate-5 device-walk ROUND 3 · builder + fresh murr + fresh parvati (M4, 2026-07-09, Fable)

**Input:** the owner's 13 in-app notes on the round-2 Canvas. All triaged **presentation/flow** (00-INDEX §4) —
no product-spec/api-contract ripple, CR-21 untouched. **Formalized first:** design-spec **0.54** (§2.5b
"Gate-5 iteration round 3") · component-map **0.6** · canvas-manifest **DEVICE-WALK ROUND 3** addendum ·
`/health` 🟢.

**Built (12 client files + new `ScrollLock.tsx`):** the breakout dissolve reads as **one continuous zoom**
(outgoing scales into the move · swap behind the `scr.bg` dip · incoming settles it; no-remount held; a
mask-free measured-rect zoom ruled out — aspect distortion + rn-skia per-frame re-surface) · slip rail
**z-ascending L→R, BASE leading** · **TRANSFORM accent chip** on the editbar + a **door in the EDIT panel
head** · the bottom panel pins to **ONE bench-measured height** across bench/ADD/EDIT/TRANSFORM
(PROOF/PRESS exempt) · TransformDrawer **0.5% nudges + slow-start hold ramp (110→45ms) + live X·Y
read-out**; **RESIZE BOX OFF hides the whole sel-ring** + the toggle rides the EDIT sheet · the **scroll-lock
rule** (`ScrollLock` context: a held slider/SV-area/hue-strip disables its host ScrollView; web adds
`touchAction:none`) wired through the inline panels, PulledSheet, and the styler edit body · the colour
picker **applies on RELEASE** (live in-picker preview; echo-guard so the cursor never re-seeds off its own
emission) · **FROM CARD unfiltered** (the recents-filter that hid the base colour removed) · ADD grid
**spans the panel width** + the **orange cap-meter chip** (the leftover gold count — CR-03/F-02) · **GLOW/BLEND
rows** replace LIGHT · titles **EDITING THE '«NAME»' SLIP**. GROUP: answered (present-but-disabled by design,
CARD-08 at-scale/§3.6) — no build.

**murr (fresh, adversarial, scoped to the round-3 files) → 1🔴 + 3🟠 + 3🟡, then 2🟠 + 1🟡 more on re-verify —
ALL fixed + murr-re-verified CLOSED (0 open):**
🔴 **F1 frozen-PanResponder closures** — `useRef(PanResponder.create()).current` froze mount-time `onChange`
in IntensitySlider + the picker's SVArea/HueStrip: a hue-then-SV drag snapped the pick back to the mount hue
(the owner's exact "resets itself" complaint), the Transform W drag reverted H, OPACITY wrote a stale slip.
**Fixed:** every live callback ref-routed. murr's re-verify then flushed the same class in two PRE-EXISTING
spots — 🟠 CanvasStage's frozen `onPull` (bed re-taps re-armed the RESET-rebase bug; snapshots taken from
canvas-entry elements) and 🟠 LayerRack drag-Z's frozen `onReorder` (pull-highlight desync after a drag) —
both ref-routed + CLOSED. 🟠 F2 the full dip+zoom played on native MOUNT (first-run guard added) · 🟠 F3 the
echo-guard stuck (cleared on real reseeds) · 🟠 F4 benchH max-capture polluted by the ops row (now MIN-at-width,
self-healing) · 🟡 F5 scroll-lock leak on unmount-mid-drag (heldRef + cleanup unlock) · 🟡 F6 rotation-slider
right edge snapped to 0° (capped 359) · 🟡 F7 mid-flight re-toggle scale pop (no setValue reset) · 🟡 N1
stranded `editOpen` popped the EDIT panel open on unlock (pull() clears it on null/locked pulls; live
retarget to an unlocked pull kept).

**parvati (fresh, `:8082` web walk) → 0 🚩 · 1 ✅ · 2 🎨 — all 8 web-verifiable directives MATCH** (rail
order w/ live z-proof · both TRANSFORM doors · bed pixel-pinned across all four panel modes · X·Y read-out
+ half-step ticks + whole-ring hide from BOTH homes · full-width ADD grid + orange chip · GLOW/BLEND +
title copy · apply-on-release w/ ONE autosave per gesture + no hue snap-back + base colour in FROM CARD ·
zero scroll displacement under drags). 🎨 both fixed same-pass: the RESIZE BOX ON/OFF↔SHOWN/HIDDEN label
drift (unified ON/OFF) + web drag text-selection (`userSelect:none` on the control labels). Zero console
errors. Copy-on-write re-confirmed live (PRIVATE→DRAFT on first edit). **Not exercisable on the rig:**
single-tap nudge exactness, the mid-drag preview frame, and the zoom feel (native-only).

**Suite at end:** typecheck ✓ · eslint + custom lint ✓ · 267/267 vitest ✓ · **41/41** mobile jest ✓ ·
`/health` 🟢 · seed restored (Aurora private+equipped, 17/17 — parvati's copy-draft cleared).

**→ ⛔ HARD STOP: the owner's device walk on round 3** — the continuous-zoom feel (native-only), real-finger
arrow taps + the hold ramp, and the round-3 taste overall — **+ the CR-21 data-model sign-off (0067 §2) still
owed from round 1.** §3.5 Device NOT started.

---

## Canvas (§3.4) — gate-5 device-walk ROUND 4 · builder + fresh murr + fresh parvati (M4, 2026-07-10, Fable)

**Input:** the owner's 13 round-4 notes (on the round-3 Canvas). All **presentation/flow** (00-INDEX §4) —
no product-spec/api-contract ripple, CR-21 untouched. **Formalized first:** design-spec **0.55** (§2.5b
"Gate-5 iteration round 4") · component-map **0.7** · canvas-manifest **DEVICE-WALK ROUND 4** addendum.

**Built:** TRANSFORM in the **cream-key voice** (editbar + panel-head doors, like PROOF) · head doors
**both ways** (EDIT↔TRANSFORM) · the TransformDrawer **condensed** (ROTATE inside POSITION; RESIZE BOX
as the EDIT row grammar) · **tap = exactly one 0.5% nudge** (~350ms initial repeat delay) + a **harder
hold ramp** (fast beats 1%, ~2.5× round 3) · the **sel-ring rotates WITH the slip** (same pivot as the
renderer — the element anchor; corner/body grabs unrotate the touch; corner-scale deltas rotate into
local space) · a **rotation handle** on the ring (top-edge knob + stem; drag-to-rotate with quarter
snaps; flips below the box near the bed top; the drawer slider stays the CARD-16 pair — `CanvasStage`
gains `onRotate`) · the editbar **divider dropped** · the rack **caption + cap-chip under the rail**
(chip left) · **PROOF docks left of PRESS** and the pair **holds position through PROOFING** (PRESS
works from the proof) · EDIT sheet: **kind meta-line removed + OPACITY under the FILL cluster** ·
ISOLATION chip **higher + accent-when-ON**.

**murr (fresh, adversarial) → 1🔴 + 2🟠 + 3🟡 — all fixed/dispositioned; re-verify 5/5 CLOSED, 0 open:**
the rotation MATH was verified sound (anchors/signs/inverse maps/corner-delta, by hand); the holes were
interaction-layer: 🔴 **F1** a non-moved knob/corner grant fell into the tap branch and **deselected the
slip** (the knob point sits outside every element box) → the release is now **mode-aware** (tap logic
only for idle/move grants). 🟠 **F2** slider drags pushed **one history entry per frame** (a 1s sweep
evicted the whole 60-cap undo past) → `IntensitySlider` gained `onBegin` (once per gesture); the
drawer's per-frame begins removed; OPACITY patches ride `history:false` — **one entry per sweep**
(parvati re-proved it live). 🟠 **F3** the knob was drawn but **dead** for slips near the bed top (it
overflowed the gesture surface) → it **flips below the box** (draw + hit-test share `knobBelow`).
🟡 **F4** hidden slips were precision-editable blind → a shared `editable` gate (locked OR hidden)
covers EDIT/TRANSFORM/X·Y/doors. 🟡 **F5** the knob's hit square ate narrow slips' top corners →
corners test first. 🟡 **F6** web `transformOrigin` unverifiable statically → parvati verified the
pivot on web (below). **Dispositioned:** one residual 🟡 — `knobBelow` decides in unrotated space, so
extreme poses (a 180°-rotated slip at the bed top; 90°/270° near a side edge) can park the knob
off-surface: draw + hit-test stay consistent and the drawer slider covers the pose — ledger, not a
blocker. Plus nits: the PROOFING sub-line masks a retrying save-state (honesty nit, no loss — exits
await their writes); two-finger arrow-holds degrade gracefully.

**parvati (fresh, `:8082` walk) → 0 🚩 · 1 ✅ · 0 🎨 — all 10 web-verifiable directives MATCH** (cream
computed-style byte-identical to PROOF · condensed drawer · both doors swap in place, bed pixel-pinned ·
divider gone · caption+chip under the rail · **PROOF/PRESS DOM rects pixel-identical across modes** +
the finish-up sheet opens over the proof · the ring rotates with vector AND text slips with a correct
pivot on web (murr F6 answered) + **CDP drag-to-rotate worked** + the knob flipped below at Y 9% ·
EDIT-sheet order right · ISOLATION accent-when-ON · **one UNDO reverts a whole opacity sweep** + tap =
exactly 0.5%). ✅ deferred-to-device: the zoom feel, the quarter-snap feel, the ramp acceleration
timing. Zero console errors. Residue draft cleared (seed re-run — Aurora private+equipped, 17/17).
**Workflow friction:** the Chrome-MCP zoom-override trap hit #2 (recovered per runbook); Metro found
down mid-walk (doctor → `dev-stack up`, ~2min).

**Suite at end:** typecheck ✓ · eslint + custom lint ✓ · 267/267 vitest ✓ · 41/41 mobile jest ✓ ·
`/health` 🟢 · seed pristine.

**→ ⛔ HARD STOP: the owner's device walk on round 4** — the rotation-handle feel (snap + drag), the
tap/hold nudge feel, the cream TRANSFORM keys, the PROOF∥PRESS pair — **+ the CR-21 data-model sign-off
(0067 §2), still owed.** §3.5 Device NOT started.

---

## Canvas (§3.4) — gate-5 device-walk ROUND 5 · builder + fresh murr + fresh parvati (M4, 2026-07-10, Fable)

**Input:** the owner's 6 round-5 notes. All **presentation/flow** (00-INDEX §4); CR-21/server untouched.
**Formalized first:** design-spec **0.56** (§2.5b round 5) · component-map **0.8** · manifest **ROUND 5**.

**Built:** the breakout **rebuilt as a boundary-continuous zoom** (the dip retired after two tuning
rounds — it read as a blink): the screen container transform-animates its edges from the framed rect to
the **measured** full-bleed rect, the layout swaps at the boundary-coincidence frame, reversed on exit —
no dark dip, no boundary jump, transform-only/no-remount held, the ~12% mid-motion aspect stretch is the
accepted cost (native-only; the recorded fallback if the feel still misses = an instant cut) · the rack
caption row **reverted to round 3** · the ops/rename shift **solved by slot-swapping**: they render IN
the bench-button slot (fixed 44px; ops = a single-line scrolling row; rename = an input row on
`KeyboardLift`) — the panel never changes height · the **editbar persists** across bench/EDIT/TRANSFORM
(RESET · the cream TRANSFORM key · **unlabelled ↺/↻**, one 30px cluster — undo/redo reachable from both
menus, the TRANSFORM key never moves; the EDIT-head door retired) · EDIT sheet **MORE under RESIZE
BOX** · the TransformDrawer **sliders → arrow-stepper rows** (POSITION's four arrows inline + X·Y;
W/H/SIZE/ROTATE as ◀ value ▶ rows; 1° rotate taps, hold-ramping ×5).

**murr (fresh, adversarial; three passes) → ALL CLOSED, 0 open:** 🔴 **R5-1** the exit swap re-measured
the framed rect THROUGH the covering transform — `rectsRef` poisoned after ONE cycle, silently reverting
the zoom to the blink → measurement is now **animation-gated** (`animatingRef`) + an explicit **at-rest
re-measure** on exit completion + a breakout-resize invalidation (R5-4) + a guardless-core hardening
(N3). 🟠 **R5-2** undo could re-lock/re-hide the pulled slip UNDER an open panel, stranding
`transformOpen`/`editOpen` (panel teleported open on the next UNLOCK) → an effect clears them whenever
`editable` collapses (baseEdit protected). 🟠 **R5-3** a rename left open across a history walk could
SAVE onto the wrong/locked slip → undo/redo close the ops context + a lock re-check at commit.
🟡 R5-5 corner flash (radius flattens during the motion) · 🟡 R5-6 a scroll starting on a stepper arrow
mutated + polluted history → press-in only ARMS; a tap steps via onPress; a stolen press mutates
NOTHING · 🟡 R5-7/N2 per-press+per-fired **tokens** (two-finger chains can't kill or double-step each
other; SR increments never suppressed) · 🟡 R5-9/N1/N1b keyboard dismissed on EVERY rename exit incl.
posture-leave (unmount cleanup) · 🟡 N4 `editable` now requires the element to EXIST (undo-away no
longer shells the panel; the opAdd batching verified against the real `patchDraft` source) · 🟡 R5-8
the stepper rows regained the **adjustable role** + increment/decrement actions. **Ledger (accepted):**
POSITION arrows are plain buttons (a11y at-scale) · Android double-focus on adjustable rows · the
extreme-pose knob reach (round 4) · benchH transient on rotate-mid-panel · desktop-web mouse-wheel over
the panel once dismissed it (parvati; not a native gesture).

**parvati (fresh, `:8082`) → 0 🚩 · 1 ✅ · 1 🎨 — all 8 round-5 directives MATCH** (caption reverted ·
ops/rename slot-swap with the editbar/rail/card **pixel-unmoved** · the persistent editbar
**DOM-rect-identical across EDIT/TRANSFORM**, unlabelled 30px keys, undo-from-EDIT proven · EDIT-head
door gone · MORE last · stepper drawer with **step-exactness proven** (0.5%/1°) + per-step undo · 3
clean zoom cycles, zero console errors · CR-21 re-confirmed live). 🎨 the TRANSFORM pressed-state read →
fixed same-pass (active never dims + an accent keel on the pressed key). **Owed to device:** the zoom
feel (the headline), hold-ramp cadence, KeyboardLift, ops-row scroll at phone width.

**Suite at end:** typecheck ✓ · lint ✓ · 267/267 vitest ✓ · 41/41 mobile jest ✓ · `/health` 🟢 · seed
pristine (walk drafts cleared).

**→ ⛔ HARD STOP: the owner's device walk on round 5** — **the boundary-continuous zoom feel is the
headline** (if it still misses, the recorded fallback is an instant cut), plus the slot-swap ops, the
persistent editbar, the stepper drawer — **+ the CR-21 data-model sign-off (0067 §2), still owed.**
§3.5 Device NOT started.

---

## Canvas (§3.4) — GATE CLEARED (owner, 2026-07-10)

The owner walked round 5 on device: **gate-5 taste PASSED ("looks great")** — the boundary-continuous
zoom landed (the instant-cut fallback retires unexercised). The **0069 button-convention parvati
re-walk** of the five re-skinned surfaces is **confirmed done by the owner's own walk**. And **CR-21 is
SIGNED OFF** — the `derived_from_card_id` copy-on-write data-model is approved as ruled (0067 §2 note);
migration 0006 ships. **All three §3.4 gates are clear → the §3.4 tree (Canvas rounds 1–5 + the 0069
sweep) is commit-ready; §3.5 Device is UNBLOCKED.** Next: the m4 commit (owner-triggered), then Device —
planned on Fable, built by Opus packet agents, reviewed on Fable (owner's model directive, 2026-07-10).

---

# Parvati — build vs design: Device editor (M4 §3.5, 2026-07-10, run inline by Fable per the owner's model directive)
**Verdict:** 2 🚩 flag (BOTH fixed in-walk → 0 open) · 1 🚩 STOP-and-filed (OQ-144, owner ruling owed) · 1 known web-lane limitation (runbook'd; native owner-proven) · 3 🎨 polish · the rest MATCHES — measured vs the `device-manifest.md` (the enumeration), design-spec §2.15, and `GET/PATCH /me/device` + `/me/device/looks` (api 0.55).
**Reviewed from:** a driven `:8082` walk (DOM/computed-style/network evidence — the CDP screenshot lane was wedged by the documented skia capture race; the JS-dispatch recipes are in the runbook). **Live collision noted:** the owner was simultaneously editing the same account from his phone mid-walk — his freeform carbon/paper/dragged-cat edits became *evidence* (see below), and the walk deliberately skipped destructive LOOKS/restore steps so as not to hijack his session.

## 🚩 Flags (owed at M4) — both FIXED in-walk by the reviewer, re-verified live
- **The device didn't follow the ACCOUNT** — ABSENT (app-level hydration) — logout purges prefs (correct, per-user-namespace), but nothing re-applied the server's device facets at login: a fresh login/second device wore teal/midnight defaults while the server held the user's real shell/theme/stickers; state only reconciled if the user happened to open /device. Breaks DEV-01 personal-device semantics + the manifest ARCH 2 proof. **FIXED:** `DeviceHydrator` in `_layout.tsx` — auth-gated `useGetDeviceQuery`, hydrates the three facets once per auth session (re-arms when the token drops). **Re-verified live:** a fresh login painted the owner's carbon/paper + composition app-wide with no editor visit.
- **P3 exit-drop of a <1.5s pick** (pre-walk review find) — a facet picked inside the debounce window died with the timer on unmount (prefs showed it; the server didn't; a cold reload reverted it). **FIXED:** exit-flush in the unmount cleanup (fire the pending PATCH un-awaited). Cite: manifest walk 6.

## 🚩 STOP-and-filed (amends an owner ratification — NOT built)
- **Cream `/secondary` on the 3 LIGHT themes fails the DEV-04 floor** — measured: SIGN OUT's cream face `#f5f1e4` on PAPER bg `#ece5d1` ≈ **1.1:1** (the key face vanishes; the navy label floats). §1.1's `scr.chip` token (cream-on-dark / WHITE-on-light) is the designed answer the mapping folded away — **OQ-144**, owner ruling (it amends 0069 "secondary = cream").

## Known web-lane limitation (runbook'd — does not gate the native ship)
- **Band decals render 0-size on RN-web** — the sticker layer's `onLayout` never delivers AND the ref's `measureInWindow` returns zeros (a gBCR-first fallback was added; still unhealed in-session — the failure sits in the RN-web view/ref layer). Composition/pipeline/readout/TransformBox/server truth all correct. **Native is PROVEN by the owner's live walk** (freeform drag/scale coordinates on his cat sticker are producible only by a working native render+gesture surface). Same class as the rn-skia-web bed-paint quirk.

## 🎨 Polish / iteration
- **Require cycle** `theme/index ↔ useTheme` (console warn; P2's re-export) → break the cycle in a cleanup pass. Also P3's noted resolver duplication (useTheme private copies vs palettes exports) — collapse together.
- **The theme PreviewStrip lives ~1.5s** under the free path (pick=apply+persist), so EXIT's try-on window is vestigial — the manifest anticipated this (owner may simplify to instant-apply-no-strip, or lengthen the beat). MutationObserver-verified the strip + SAVING do render in the window.
- **Stepper a11y labels** read "Horizontal down/up" — friendlier: "Nudge left/right" (CARD-16 lane).

## ✔ Matches (present · placed · behaving · on-aesthetic)
C1 the Profile MY DEVICE strip — pressable ("Edit your device") + fully dynamic ("POCKET · CARBON · PAPER SCREEN · 2 STICKERS", live server truth) · C2 head/return-link, NO PIXELS (M5 posture) · C3 readout with live subs (EDITING/SWITCHED/PLACING) · C4 the 4-card rail (accent-border active, no pip) · C5 ONE pipeline (hydrate GET → debounced PATCH 200 → invalidation; observed per pick) · D1 five shells in palette order, no price chips, pick re-wraps the LIVE frame (computed-style-verified grape→carbon) · D2 the switch beat + "WAS · TEAL ➔ NOW · GRAPE" minis · D3 six themes, whole-app re-theme live (deepsea/mint/paper verified), PreviewStrip + SAVING in-window (observer-proven), floor-note with the LIVE shell name, light themes flip ink dark (#16302c on mint) · D4 the 8-glyph tray in board order, decal-zone outlines, tap-to-place ("PLACING — ROCKET (100% · 0°)"), the full stepper set + DELETE docked, steppers wired (a 600ms hold landed 1°; the readout binds live), F-04 nav keycaps present/visible above the band · D6 LOOKS chrome + readout + dashed SAVE CURRENT + the calm empty state · zero console errors at the final state (the require-cycle warn only) · server truth byte-exact (`GET /me/device` carried every walked edit).

## Not exercised (rig limits / the owner's live session — stated honestly)
Drag/refusal/re-zone gestures + the D5 preview toggle + LOOKS save/apply/delete/ON-NOW/cap (server-side covered by the 13 device integration tests + the `isOnNow` unit suite; the owner's phone session made client mutations off-limits mid-walk) · stepper tap/hold-ramp cadence (RN-web synthetic-event artifact; the same round-5 grammar passed the Canvas device walk) · decal VISUALS on web (the limitation above — **owed on device**, where the owner's live walk already exercises them) · cold-reload persistence end-to-end (proven via the hydrator + blob instead). **Seed/restore:** deliberately NOT restored — the owner was live-editing the account; his carbon/paper/cat state is his walk, not residue.

**Suite after the in-walk fixes:** typecheck ✓ · lint ✓ (theme rule incl.) · jest ✓. **→ the §3.5 receipt + the owner's gate-5 device walk** (already underway on his phone, by the look of the cat).

---

## §3.6 CARD-16 — a11y / reduce-motion pass · Fable-planned, Opus-built, murr-reviewed (M4, 2026-07-12, spec-driven audit route)

**Route (owner ruling):** the spec-driven/audit hybrid — decision 0044's three contracts (104 reduce-motion · 105 a11y baseline · 106 resilience) translated to RN and turned into a binding punch-list ([`card16-checklist.md`](m4/card16-checklist.md)), backed by a custom-lint rule. NOT a visual board (the work is behavioural — labels/keyboard/motion — which Burt can't see). **Gate status:** the CARD-16 release-block now attaches to the **M6 beta** (decision 0071); the work lands here while the editors are fresh.

**Two read-only audits first** (the app has only 11 animated sites; 3 already complied — so §A was smaller than feared; the biggest gap was live-region announcements, near-zero across the editors).

**Built:** a shared **`useReducedMotion()`** hook (live-updates, unlike the old once-per-mount checks) gating the real gaps (DeviceShell boundary-zoom · PulledSheet slide — one fix covers ConfirmSheet + the styler sheet + the canvas panels · KeyboardLift); a shared **`announce`/`useAnnounceOnChange`** helper driving the live-region sweep (save-lines · caps [flip-to-full, not the count] · offline/preview strips · errors — transitions, never per-frame); ColorPicker's raw-`View`+responder controls → `Pressable` + `accessibilityState` + real `adjustable` actions; SavedLook nested→sibling Pressable; the **non-gesture sticker SELECTION** (transparent per-decal select-targets, sighted touch untouched) + a **re-zone** button; `accessible` on labelled gesture surfaces; and **`rule-a11y-responder`** (custom lint) banning the raw responder-as-button anti-pattern (fixture + F22 corpus green). The non-gesture PAIRS were confirmed already-covered by the CARD-16 built-alongside rail.

**murr (fresh-context adversarial) → 2 major + 5 minor, ALL fixed/dispositioned:** M1 re-zone-past-cap wedges the pipeline → `canReZone` guard; M2 (regression) the async hook flashed-then-froze KeepBeat's one-shot pulse for reduce-motion users → reverted KeepBeat to the direct await (the hook serves user-triggered transitions); m1 double error-announce, m2 OfflineStrip triple-announce, m3 sheet-replay-on-toggle, m5 RNW `sub?.remove()` → all fixed; m4 (iOS VoiceOver overlapping-decal edge — Android exact) documented; m6 (per-edit save announce) accepted. murr confirmed clean: DeviceShell swap matrices · ColorPicker onStep · the announce first-mount/tick behaviour · the select-target z-order.

**Suite:** typecheck ✓ · lint ✓ (rule-a11y-responder + rule-theme-tokens) · 69/69 jest · F22 corpus 20/20 · /health 🟢. **Owed on device (the M6 beta gate):** a manual reduce-motion pass + a VoiceOver/TalkBack spot-walk — the web lane inspects a11y attributes but can't drive VoiceOver or the OS reduce-motion toggle.

**→ M4 build surfaces COMPLETE** (§3.1 Game page · §3.2 Styler · §3.4 Canvas · §3.5 Device · §3.6 CARD-16). Remaining to M4 close: the light-theme floor sweep (rides this a11y/CARD-16 lane on device) + gate-5 sign-offs; then M4 completes internally (no beta — decision 0071). ⛔ HARD STOP for the owner.

---

## COL-12 Collection card peek-flip · parvati (M4, 2026-07-12)

**Verdict:** 0 🚩 flag · 2 ✅ expected · 0 🎨 polish · (all peek-flip elements ✔ match) — measured vs the
`col12-manifest.md` enumeration, the `collection-states.html` peek-flip stage (`:1196–1440`), COL-12/CARD-23/CARD-16,
and the `GET /me/collection` seam.
**Reviewed from:** own real-Chrome `:8082` screenshots (Collection shelf + a flipped shelf back) + DOM/state
inspection for the elements the automation renderer can't paint (see the tooling note). Login → Collection shelf →
flip a shelf card → the CARD-01 back → view-cycle reset. **Tooling limitation (captured for doctor-nick):** the
automation renderer (both the in-app Browser pane and a backgrounded Chrome tab) **throttles `requestAnimationFrame`
to ~0 and doesn't paint the skia card FRONT faces** — so the rotateY flip *motion* and the *grid* faces can't be
screenshotted. Those were verified via the DOM (aria-labels, computed geometry/opacity) + jest instead; the SVG
`StatsBack` back paints fine, so the back face IS screenshot-verified. A manual on-device flip pass is owed (like
the CARD-16 VoiceOver/reduce-motion spot-walk).

### ✅ Matches (present · placed · on-aesthetic)
- **Flipped back face** (screenshot) — the `.flipy` stepped silhouette + the board's section ORDER: YOUR STATS eyebrow
  → ELDEN RING title → HOURS 142 · COMPLETE 55% · STATUS PLAYING · SINCE 2026 → CARD ARTIST **YOU** (gold `p-name`) →
  **VIEW GAME ›** keycap — **all fitting the 138×193 shelf card, no overlap** (the compact-spacing fix; measured VIEW
  GAME bottom 8px inside the card). Matches board `:1323–1335`.
- **First-run coachmark** (screenshot) — "Tap a card to flip it for your stats." + GOT IT, panel-toned strip above the
  shelf; no persistent on-face indicator (owner directive). Board caption `:1276–1277`.
- **Now-Playing hero never flips** (screenshot) — the showcase stays a NAVIGATE target with LOG HOURS, separate from
  the flippable stack cards. Board `:1379`.
- **Shelf meta beside the flipped card** (screenshot) — 142 HRS · PLAYING / ELDEN RING / catalog line stay put beside
  the turned card (the "quick scan + full peek together"). Board `:1337–1341`.
- **Whole-card tap grammar + a11y** (DOM/jest) — the card is one SR button whose label reads the stats out
  ("Elden Ring stats. 142 hours. 55 percent complete. PLAYING…") with a "View game" a11y action; both faces
  `aria-hidden`; tap=flip, long-press/VIEW GAME=navigate. CARD-16 non-gesture path.
- **Transient reset** (DOM) — cycling shelf→grid cleared the flip (spec: resets on view-switch).

### ✅ Expected (deferred — proceed)
- **Friend-view flip** — absent; own-collection only at M4, friend-view is M6/M7 (COL-10/11, PROF-03). Cite: manifest
  "Later-milestone" table · COL-12 friend clause.
- **TOP-view flip** — absent; deferred by owner ruling 2026-07-12 (TOP cards are mini/cell — a legible back won't fit;
  TOP rows already print hours). Cite: manifest deferral row.

*(GAP-D1 reconciled: the back's CARD ARTIST reads "YOU" not a designer name — the collection payload carries no
`designer` rider; reuses the game page's shipped `isCustom ? YOU : null`. A declared divergence, not a flag.)*
