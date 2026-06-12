# Card Editor — STYLER posture: design-track kickoff (0014 stage 2)

You are designing the **Styler** — the Card editor's in-frame posture — for InGame (mobile-first,
retro-arcade, docs-only design phase). You are a NEW design track following the Add Game and Store
tracks. Your job: 3 distinct draft artboards of the Styler → owner gate in THIS session → converge.
You do NOT formalize into design-spec/catalog/product-spec (one-editor rule; flag, don't edit).

**Step 0:** save this brief verbatim to `docs/design/plans/2026-06-12-styler-drafts-brief.md`,
commit (`docs: styler track brief`), push (`git pull --rebase` before EVERY push — parallel
sessions are live) — it is your plan file; append the owner's gate rulings to it later.

## Read first, in order
1. `CLAUDE.md` — note the **Design-phase workflow** rules: **HTML deliverables only, never PNGs**
   (headless screenshots are self-verification only, deleted before the turn ends), and update
   `docs/design/SCREEN-STATUS.md` after every pass.
2. `docs/decisions/0014-add-game-design-arc.md` — **your constitution.** One editor, two postures:
   the Styler = the CLOSED attributes (frame · effect · finish · title styling) worked around a
   persistent card hero, in-frame (takeover tier — the device frame stays). Contract: receives
   *(game, optional preselected base)* from Add Game's CardPicker junction; "edit art" hands the
   composition to the Canvas posture (stage 3 — STUB it, don't design it). **Outcome = keep /
   save-private. NO Publish in the Styler** (publishing is canvas-tier, owner call).
3. `docs/design/design-process.md` + `docs/design/SCREEN-STATUS.md` — process + where you sit
   (row 4.3 Styler, queue #2; mark yourself in-pass at start, converged at the end).
4. `docs/design/ui-design-requirements.md` — Part 1 (esp. §1.1 split, §1.5 Pixels, §1.8 errors)
   + §4.3 (the editor mandates: dense-must-feel-effortless · progressive disclosure · the
   three-bucket model — the Styler is bucket ③ + the closed attributes).
5. `docs/design/design-spec.md` — F-01..**F-09** (F-09: no sunken containers; selection = accent
   border + pip in `scr.accent`, never pink) · §1.1–1.4 tokens · §1.5 catalog **including the new
   Currency & Commerce set** (CurrencyCounter · PriceChip · BuyBar/hold-to-buy · Toast · tags ·
   PreviewStrip — REUSE these, the Store already designed the economy UI) · §1.6/§1.7 · §2.3 Store.
6. Mockups: `docs/design/mockups/README.md` · `store-states.html` (the commerce patterns + the
   PIXELS gem mark — copy its `ic-pix` symbol; ◈ is dead) · the latest `add-game-draft-c*.html`
   (the junction you receive from; sibling conventions: bottom-docked fields, report drawer,
   F-09 selection) · `collection-states.html` (drawer/tools grammar + the shared :root tokens).
7. `docs/spec/product-spec.md` §5.6 (CARD-01/02/06/11/12/13/14/16/17/18) + §5.8/§5.9 (COSM/ECON,
   post-0017) · `docs/decisions/0015` (the moments layer: **Styler keeps get a LIGHT beat**, never
   the full ritual) + `0017` (PIXELS · hold-to-buy · sticker packs are SHELL items — the card
   canvas sells nothing; premium-on-card = the closed attributes only).
8. `docs/open-questions.md` — **OQ-039 is YOURS to exhibit** (nameplate/overlay as additional
   closed-attribute cosmetic types? — owed this stage); OQ-002/OQ-011 still open (all prices
   illustrative, caption-mark them).

## The requirements (complete inventory — every item appears in the drafts)
- **The hero:** the card, full-face, persistent, never cropped (F-01) — attributes change it LIVE.
- **Start-from is never blank and never community-dependent** (CARD-16): a bases rail — system
  **templates / preset kits** (from the free baseline, COSM-02) + **auto-design "Surprise me"** —
  opens already-composed even for a game's first-ever card. The **adopt door belongs to Add Game's
  CardPicker**, not here (show the handoff, don't redesign it). Also draw the **received-base
  variant** (adopt-then-edit arrives with a preselected base).
- **The closed attributes** (each browsable + swappable, free + premium):
  **FRAME** · **EFFECT** (ONE at a time, CARD-12 — make the rule visible; with an
  **intensity/opacity control** — this designs the catalog's missing **slider**, flag it) ·
  **FINISH** (separate, stackable over the effect; holo/foil/metallic) · **TITLE STYLING**
  (font free/premium + treatment — the title text is the game's name, styling only).
- **Premium flow = the Store's grammar, reused** (CARD-13 + 0017): premium attributes
  **preview-then-acquire** (applied live, visibly flagged — the card gains a premium state,
  CARD-06) · at **keep**, a **reconcile step** (acquire all / remove) · prices in **PIXELS**
  (PriceChip) · **hold-to-buy** confirms instant spends · short-by-N → the **in-context bridge**
  (PackTile minis at intent) · CurrencyCounter in the header → Wallet.
- **Outcomes:** KEEP (equips for that game, COL-06) · SAVE PRIVATE (CARD-04/14) · the **light
  keep-beat** (OQ-040's tier — one small moment, no ritual) · the **"edit art → Canvas" stub door**.
- **OQ-039 exhibit:** one panel lays out the closed-attribute taxonomy as shipped (frame · effect ·
  finish · title styling) beside the two CANDIDATE types (**nameplate** · **overlay**) — mocked,
  clearly flagged as a behavior question with your recommendation, for the owner to rule at the gate.
- **Chrome:** takeover within the flow's tab (Collection nav active, pressed + pip); the frame
  stays; F-06 type scale; F-07/F-09 flat square chrome; OQ-035 system keyboard if any text entry.

## Hard rules (the law)
- Compose ONLY from the design-spec §1.5 catalog (incl. the commerce set) + this brief's locked
  names: `BaseRail` (start-from) · `AttributeSection` + `SectionChips` (the section grammar) ·
  `IntensitySlider` · `ReconcileSheet` (the CARD-13 keep-step) · `KeepBeat`. FORM is each draft's
  to explore; names are fixed. A genuinely needed extra: build it, flag it at the gate — never
  invent silently.
- Tokens verbatim from the sibling `:root` (Teal shell + Midnight). Standalone HTML, Google Fonts
  via the `media="print" onload` pattern, built-in SVG only. PIXELS gem = the `ic-pix` symbol from
  `store-states.html`, verbatim.
- Sample data continuity: Destiny (210 hrs) as the working card; Riko/Vanta/Maverick; the Store's
  roster of attributes (EMBER 8 PX effect · HOLO 4 PX finish · STEP GILT 5 PX frame · PIXELLA
  2 PX font — bands per OQ-011, caption-marked illustrative); balance narrative may reuse the
  Store's 5 → 27 PX timeline.
- **HTML only. No PNG artifacts, ever.** Verify each draft via headless Edge
  (`& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new
  --screenshot=<abs tmp png> --window-size=1400,<h> <abs html>`), read it, walk every panel,
  iterate — then DELETE every screenshot before the turn ends.
- Behavior questions → APPEND one-liners to `docs/open-questions.md` (the inbox is the only shared
  doc you may append to). Do not edit product-spec, api-contract, design-spec, the catalog HTML,
  SCREEN-STATUS rows other than your own, or any `add-game-*`/`store-*` file.

## Panel contract (each draft renders P1–P8; lifecycle deferred WITH a caption note)
P1 Entry / start-from — `BaseRail` (templates · preset kits · Surprise me) + the received-base
variant (adopt-then-edit) · P2 The editing surface — hero + the draft's signature attribute
interaction (THE thesis panel) · P3 FRAMES — browse/swap, free + premium PriceChips, F-09 selection ·
P4 EFFECTS — one-at-a-time visible + `IntensitySlider` · P5 FINISH + TITLE STYLING ·
P6 Premium flow — flagged preview state → `ReconcileSheet` at keep (acquire all / remove ·
hold-to-buy · short-by-N bridge) · P7 KEEP / SAVE PRIVATE + `KeepBeat` + the Canvas stub door ·
P8 The OQ-039 taxonomy exhibit (shipped types + nameplate/overlay candidates + recommendation).
Deferred to converge: loading skeleton · load-error+RETRY · offline (draft-safe, writes gated).

## Process
1. **Three genuinely distinct interaction MODELS** (not reskins). **One MUST be the carousel**
   (0014 standing mandate: persistent card hero, attribute sections swiping beneath, `SectionChips`
   to jump). The other two are yours — e.g. a **drawer rack** (attributes as the app's one
   bottom-sheet grammar) · a **tools-tray workbench** (a persistent `ToolsBar`-style attribute rail,
   Collection's keycap grammar). Files: `docs/design/mockups/styler-draft-{a,b,c}-<model>.html`.
2. Per draft: verify headless (then delete the screenshots) · append a README row at the END of the
   table · commit (`design: Styler draft A (<model>) — P1-P8 (styler track)` + the Co-Authored-By
   Claude line) · `git pull --rebase` · push.
3. **Owner gate in THIS session:** present model summaries + judgment calls (+ your OQ-039
   recommendation) — the owner opens the HTML files directly; **no gate PNGs**. Collect the ruling,
   append it verbatim+dated to your plan file.
4. Converge per the ruling into `styler-states.html` (full matrix incl. the deferred lifecycle
   cells) → update `SCREEN-STATUS.md` (your row + UP NEXT) and surface the changed rows → STOP.
   OQ-039's ruling is a spec matter — leave it in the inbox for the spec-owner batch.y
