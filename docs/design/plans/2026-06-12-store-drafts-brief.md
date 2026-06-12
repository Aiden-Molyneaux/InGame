# Store design track — kickoff brief (parallel to the Add Game arc)

You are designing the **Store** for InGame — mobile-first, retro-arcade game-collection app, docs-only
design phase (no app code). You are a PARALLEL design track: another session is iterating the Add Game
flow. Your job: 3 distinct draft artboards of the Store → owner gate in THIS session → converge. You do
NOT formalize into design-spec/catalog (one-editor rule; the spec-owner session batches that later).

**Step 0:** save this brief verbatim to `docs/design/plans/2026-06-12-store-drafts-brief.md`, commit it
(`docs: store parallel-track brief`), and push (rules below) — it is your plan file; append the owner's
gate ruling to it later.

## Read first, in order
1. `docs/design/design-process.md` — the process + reuse mandate + multi-draft divergence rule.
2. `docs/design/ui-design-requirements.md` — Part 1 (global direction: device metaphor, nav-on-plastic,
   §1.1 "bold in presentation, conventional in commerce", §1.5 currency presence, §1.8 errors) + §3.4
   Store + §4.11 Item detail + §4.12 Wallet.
3. `docs/design/design-spec.md` — tokens §1.1–1.4 (Teal shell + Midnight canonical), component catalog
   §1.5, states family §1.6, F-01..F-08.
4. `docs/design/mockups/README.md` + siblings: `collection-states.html`, `profile-states.html` (format
   reference: artboard grid, caption strips, device frame), `InGame Design System Catalog.dc.html`,
   and `add-game-draft-c-cardled.html` (the in-flight track — note its gold "1 ◈" cost chip).
5. `docs/spec/product-spec.md` §5.8 (COSM-) + §5.9 (ECON-) — the behavior truth. `docs/decisions/0014`
   + `0015` for current context. `docs/open-questions.md` (OQ-002/OQ-011 are open — see Values below).

## The requirements (complete inventory — every item must appear in the drafts)
- **Browse (§3.4):** Featured **Drops** section (ECON-08, P2 — design the slot, sample one drop) +
  **category sections** covering the COSM-01 taxonomy: Vector packs · Effects · Finishes · Frames ·
  Fonts · Devices (models + skins) · **Screen themes** (decision 0012) · **Currency**. Premium items
  only — the **free baseline is NOT in the store** (COSM-02; it lives in the editors). Persistent
  **currency counter** in the header, **tappable → Wallet** (ECON-07, §1.5).
- **Single-currency model (ECON-01):** real money ONLY buys Customizer currency (◈); cosmetics are
  priced in ◈, never in dollars. One wallet, one mental model. Two spend types: adopting premium cards
  costs 1◈ (ECON-03 — happens elsewhere, not in the Store); acquiring premium assets/effects costs
  more (your price bands).
- **Item detail (§4.11):** **live preview on YOUR OWN stuff** — effect/finish previewed on a sample
  GameCard; device model/skin on your device; screen theme on your screen; sticker shown placed.
  Price (◈; dollars only on currency packs) · **owned / locked** states · BUY (cosmetics → spend ◈;
  packs → IAP sheet + receipt validation + **Restore purchases** entry, ECON-06/RevenueCat).
- **Can't-afford → buy-currency bridge (§3.4/4.11):** short by N◈ → offered packs at the point of intent.
- **Wallet (§4.12, ECON-07/09):** prominent balance — **design the NEGATIVE-balance variant**
  (refund reversals can take it below zero, ECON-09) · earn/spend **ledger** (starting grant, login
  bonus, adoption spend, pack purchase, asset acquire, **refund reversal**) · buy-currency packs ·
  reached via the header counter everywhere.
- **Purchase states (§1.8):** success (grant + counter tick) · **failure → toast/banner + retry**
  (this names the catalog's missing Toast component — propose its form) · restore flow.
- **Earned-only row (COSM-04):** achievement-exclusive cosmetics appear **visible but not purchasable**
  — locked "EARNED ONLY" prestige treatment (never a ◈ price).  [owner default — flag at your gate]
- **Chrome facts:** the Store nav keycap is **permanently gold** (owner ruling) — active state = pressed
  + lit pip like the siblings; checkout/purchase is the **conventional/legible** pole of §1.1.

## Hard rules (same law as the sibling drafts)
- Compose ONLY from the design-spec §1.5 catalog + this brief's locked names. A genuinely needed extra
  component: build it, flag it in your report — never invent silently.
- **Locked new-component names** (FORM is each draft's to explore; names are fixed):
  `CurrencyCounter` (gold header counter → Wallet) · `ItemTile` (browse item: preview + name + type +
  PriceChip) · `PriceChip` (the gold ◈ chip — adopt the Add Game drafts' "1 ◈" glyph/grammar, do not
  invent a second currency mark) · `PreviewStage` (item detail's preview-on-your-stuff area) ·
  `BuyBar` (detail purchase CTA row) · `PackTile` (IAP currency tier) · `LedgerRow` (wallet history) ·
  `Toast` (§1.8 transient failure + retry) · `OwnedTag`/`LockedTag`/`EarnedOnlyTag`.
- F-01 never crop a GameCard (previews show FULL faces) · F-02 gold = value marker; the step corner
  belongs to cards/card-creating actions — Store CTAs are square keycaps (KeycapButton family) ·
  F-06 type scale 21/15/11/9 · F-07 square on-screen chrome · F-08 Chakra Petch on screen, Paytone One
  on plastic. NavBand intact + legible in every panel (Store keycap gold, pressed + pip).
- Tokens: Teal shell + Midnight screen, exact values from design-spec §1.1 (copy the sibling :root).
  Standalone HTML: Google Fonts link only (use the `media="print" onload` + noscript pattern from the
  siblings), built-in SVG art only, renders opened directly in a browser.
- Sample-data continuity: reuse the established roster/personas (Destiny 210 hrs, Marathon, Riko/
  Vanta/Maverick as designers).
- **Values are ILLUSTRATIVE (OQ-002/OQ-011 open):** caption-mark them. Suggested: packs 10◈/$1.99 ·
  30◈/$4.99 · 65◈/$9.99 · 140◈/$19.99; effects 6–10◈ · finishes 4–8◈ · vector packs 3–6◈ · fonts 2–4◈ ·
  frames 3–5◈ · screen themes 4◈ · device models 12–20◈. Wallet narrative: +5 grant · +1 login bonus ·
  −1 adopted "Destiny by RIKO" · +30 pack · −8 effect "EMBER" · −30 refund reversal → the −3 negative
  variant.

## Panel contract (each draft renders S1–S8; lifecycle is deferred WITH a caption note)
S1 Browse — Drops hero + category sections + CurrencyCounter ·
S2 Item detail (effect or finish) — PreviewStage on a sample card, PriceChip, BuyBar ·
S3 Item detail (device model or screen theme) — preview on YOUR device/screen ·
S4 Can't-afford → buy-currency bridge ·
S5 Currency packs — PackTiles, dollar prices, Restore purchases ·
S6 Purchase states — success (counter ticks) · failure Toast + RETRY · restore ·
S7 Wallet — balance + negative variant + full LedgerRow set + buy-currency ·
S8 Ownership treatments — owned · locked · EARNED ONLY row.
Deferred to converge: loading skeleton · load-error + RETRY · offline (browse-from-cache, writes gated).

## Process
1. **Three distinct drafts** — genuinely different browse/interaction MODELS (not reskins), e.g.
   arcade-cabinet shelf browse · drops-led editorial · category rack. Files:
   `docs/design/mockups/store-draft-{a,b,c}-<model>.html`.
2. Verify each via headless Edge before calling it done:
   `& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new
   --screenshot=<abs _verify png> --window-size=1400,<height> <abs html>` — read the png, walk every
   panel, iterate, then delete `_verify-*.png`.
3. Per draft: add a README row (**append at the END of the table** — another track edits this file;
   `git pull --rebase` before every push), commit
   (`design: Store draft A (<model>) — S1-S8 (store track)` + the Co-Authored-By Claude line), push.
4. **Owner gate in this session:** render `_gate-store-{a,b,c}.png` (KEEP them on disk — the owner
   opens them from the folder; do not delete), present model summaries + judgment calls, collect the
   ruling, append it verbatim+dated to this brief file.
5. Converge per the ruling into `store-states.html` (full matrix incl. the deferred lifecycle cells) →
   STOP. Do not edit `design-spec.md`, the catalog HTML, product-spec, api-contract, or any
   `add-game-*` / `2026-06-11-add-game-*` file. New behavior questions → APPEND one-liners to
   `docs/open-questions.md` (the inbox is the only shared file you may append to).

---

## Owner gate ruling — 2026-06-12 (verbatim)

> Great work. Here is my feedback to create one new draft with:
>
> * I like Draft B the most, however we likely want to show more items that was is previewed
> * I like Draft B's S1 The Index element
> * Draft B's preview of Previewing themes is excellent
> * Draft C's S2 with the drawer is great, take that.
> * I also like Draft C's inline currency reocmmendation.
> * So we need a Top Up page
> * Note that device shells are not different devices, just customization on the pocket/handheld device.
> * Is clicking on your wallet currency in the top left the best way to get to the Buy Currency page besides the prompt when you don;t have enough for a specific item?
> * Does clicking on currency pack from the item page take you to the store, or do you do the transaction inline?
> * I like the currency landing page from Draft B
> * I like the ledger from Draft C the most
>
> Before drafting this next version, can we iterate on what the customizer currency looks like and what
> we call it in-app. Generate three drafts of the name and icon for a currency

### Track disposition (recorded 2026-06-12)
- **Converge = one new draft, B-led hybrid:** Draft B base with a **denser S1** (more items visible,
  not just curated previews) · keep **THE INDEX** · keep the **whole-page theme preview** · detail =
  **C's bottom sheet/drawer** · bridge = **C's inline pack recommendation at intent** · a dedicated
  **Top Up page** (B's currency landing) · Wallet ledger = **C's dense LedgerRow form**.
- **Devices category redrawn:** shells/skins are customization of the ONE pocket/handheld — no distinct
  body shapes (CRT-MINI-style bodies out). Spec wording tension with DEV-02/COSM-01 "device model"
  logged as **OQ-042**.
- **Q (entry to Buy Currency):** recommendation — three honest doors: header CurrencyCounter → Wallet
  (balance/ledger, BUY → Top Up one tap deeper) · INDEX "CURRENCY" → Top Up directly · the can't-afford
  bridge at intent. The counter stays a *wallet* door, not a buy door.
- **Q (pack tap from item detail):** **inline** — the pack tile fires the native IAP sheet in place
  (RevenueCat → server receipt validation → grant lands → BUY re-arms); no navigation away.
- **Interlude before the converged draft:** iterate the currency identity — **three drafts of the
  in-app name + mark** (spec term "Customizer currency", ECON-01/02, unchanged; the chosen mark
  replaces the ◈ placeholder app-wide incl. the Add Game cost chip). → `currency-identity-drafts.html`,
  awaiting its own ruling; the converged `store-states.html` lands after it, carrying the winner.

### Currency ruling #1 — 2026-06-12 (verbatim)

> Can you taken the pixel-stepped icon out of the middle of the credit coin, to create something new.
> Have the credit be that shape, gold, with some blue streaks/emphasis. Draft three distinct currencies
> that use what I described. Draft new names for them too

**Disposition:** v2 iteration — the mark IS the pixel-stepped shape itself (no coin around it), gold,
with **blue streak/emphasis**; three distinct stepped silhouettes + three new names →
`currency-identity-drafts-v2.html` (**BITS** card-cut stepped square w/ blue foil slash · **PIXELS**
pixel-cut diamond gem w/ blue glints · **SPARKS** ascending step-cubes w/ blue motion trails). Blue =
a mark-internal accent from the cyan family — not a new chrome token; gold stays THE value marker
(F-02). v1 (CREDITS / INK / VOLTS) superseded, kept for history. Awaiting ruling #2.

### Currency ruling #2 + converge order — 2026-06-12 (verbatim)

> Let's do pixels, the way you designed them. Take my notes and redraft the Store screen once

**Disposition:** **PIXELS** (ticker PX; the pixel-cut gem, as drawn in v2 take B) is the Customizer
currency's in-app identity — the mark replaces the ◈ placeholder app-wide (CurrencyCounter, PriceChip,
adopt chip, PackTile, LedgerRow; the Add Game track's cost chip adopts it at its next pass). Converged
board built per the gate ruling → **`store-states.html`**: B-led hybrid (cover-story drop · denser
browse · THE INDEX · whole-page theme PREVIEWING · B's Top Up landing + under-header banner Toast)
+ C's sheet detail, in-sheet bridge at intent, and dense LedgerRows; devices drawn as **shells/skins
on the one pocket handheld** (OQ-042); inline IAP at the bridge; counter→Wallet / INDEX→Top Up /
bridge = the three Buy-Pixels doors; full matrix **incl. the deferred lifecycle cells** (skeleton ·
load-error+RETRY · offline browse-from-cache with writes gated). Formalization into
design-spec/catalog stays with the spec-owner session (one-editor rule). **Store track stage-1 ends
here per the brief (converge → STOP).**

### Converged-board ruling #3 — 2026-06-12 (verbatim)

> a couple of things:
> 1. I wanted the top-up page to show pixel pack entries in a 2x2 grid, like one of your other drafts.
> 2. The buttons to buy on those elements should just use the regular white alternate button instead
>    of this button with a black border.
>
> This is really good. Can you think of any other pieces of UI that we're missing?  One thing we could
> definitely add is that we had the concept of a daily sign-in bonus being pixels. Can you work that
> into the store screen so that users have to go to the store screen to pick up their daily bonus?  On
> the top-up page, let's factor in providing/doin' the math for the user and showing them why bigger
> packs are better deals.  Also, in P6, you have the notion of a starter pack, but we should really
> have an actual starter pack that's cheap and very rewarding. Add that to the UI as well. Another
> quick note. I think that we need to do another iteration on the pixel icon. The shape is good, but
> the texture itself is off.  It doesn't feel like it matches the game aesthetic, and it's hard to
> read against the yellow background.

**Disposition (applied in place to `store-states.html`):** Top Up packs → **2×2 PackTile grid** (the
A/C tile form) · pack dollar buttons → **KeycapButton/secondary** (the white/cream alternate keycap) ·
**DAILY BONUS claim bar on the Store browse** (+1 PX, claimed in-store — ECON-02 ripple logged as
OQ-043) + claimed-state fragment · Top Up **value math** per tile (PX-per-$ + %-better-than-the-10-pack)
· an actual **STARTER PACK** product (one-time, $0.99 → 12 PX, outsized rate — OQ-044) · **PIXELS mark
v3**: same stepped-gem shape, texture re-cut as **flat pixel-art** (solid quadrant facets, opaque ink
outline, solid blue glint pixels — no translucent overlays) for aesthetic fit + legibility on gold.

### Converged-board ruling #4 — 2026-06-12 (verbatim)

> The Drop Page could be a drawer.
>
> Add the multi-item pack content view
>
> We won't have a preview sticker on device for now.  Note it for later.
>
> Let's do press and hold buy.
>
> Let's not do My Stuff for now.
>
> Notes on your last draft:
>
> * In P7 I feel like the page got a little mangled with the Pack Landed. We lost pack options. Also
>   we were supposed to do the "Pack Landed" feature like S6 in store-draft-b-drops.html

**Disposition (applied in place):** new **P1b — the drop drawer** (the EMBER SERIES page as a bottom
sheet over browse; same sheet grammar as item detail) · new **P2b — multi-item pack contents** (ARCADE
GLYPHS sheet: glyph-on-YOUR-card stage + WHAT'S-INSIDE grid; debuts **press-and-hold BUY**) ·
**hold-to-buy** is the spend-confirmation model for instant PX purchases (HOLD TO BUY labels on all
cosmetic BuyBars; IAP keeps the platform's own confirm; a11y tap-alternative owed — OQ-046) · sticker
preview-on-device **deferred, noted** (OQ-045) · My Stuff **dropped** · **P7 remade as draft B's S6
moment verbatim** (centered +30, 5 ➞ 35 arithmetic, one gold rule, BACK TO EMBER + VIEW WALLET — no
half-grid; the full pack options live on P6).

### Converged-board ruling #5 — 2026-06-12 (verbatim)

> Only one note - we won't have something such as "Arcade glyphs" for cards, since users can already
> do this with the svg-based card canvas tool. We would have these types of cosmetics/stickers for
> the shell itself.

**Disposition (applied in place):** glyph/vector packs are **SHELL STICKER PACKS** (DEV-01), not card
assets — the card canvas (CARD-02) already covers freeform vector art. P2b reworked: ARCADE GLYPHS is
a **STICKER PACK · FOR YOUR SHELL**, the sheet leads with the full **WHAT'S-INSIDE grid (all 12)**;
the glyph-on-card stage is removed and the on-shell preview stays deferred per ruling #4 (OQ-045) —
placement happens in the Device editor. Browse + INDEX renamed **STICKER PACKS**. Spec ripple logged
as **OQ-047** (COSM-01's "card stickers/art assets are vector packs" parenthetical + CARD-02/13/17
"premium packs" framing need rescoping; what, if anything, stays premium on the card canvas).

### Ruling #6 — formalization (2026-06-12, verbatim)

> Excellent. Can you update InGame Design System Catalog.dc.html and other appropriate files

**Disposition:** the owner moves design-side formalization into this track (supersedes the brief's
"do NOT formalize" line for the design-spec/catalog pair; product-spec/api-contract stay with the
spec owner via OQ-041..047). Applied: **catalog HTML → v0.3** (the PIXELS mark section + the Store &
Commerce section + gaps pruned) · **design-spec → 0.10** (§1.5 Currency & Commerce set incl. the
PIXELS mark; §1.6 `Toast` designed; §1.4 +`motion.holdToBuy`/`counterTick`; new **§2.3 Store**
composition + full state matrix, old §2.3 → §2.4; header/source-mockups/changelog) · README rows
(catalog gains its missing row; store-states row marked formalized). **Store track closed.**

### Ruling #7 — the spec batch, audit, tracker & workflow rules (2026-06-12)

> All right, I'll go ahead and have you do that work. Additionally, I'd like you to create or add to
> the cloud.MD a couple of things, including:
> - During design, I only ever need HTML files. I don't need PNGs.
> - After a draft pass, I'd like to be given a table that captures all the pages of the application,
>   their current state. [...] Each page should also give an indication of the version it's on and if
>   a states file has been created for it. [...] This can be stored in a file so it's easy to update
>   and surface for me.
> - How do you think we should do that document?
> - We should also capture whether the API contract is fully up to date with all the functionality
>   captured on that page.

**Disposition:** executed as **decision 0017** (product-spec 0.17 · api-contract 0.15 ·
ui-design-requirements 0.12 · OQ-041..044/046/047 resolved, OQ-045 open) + the **cross-doc audit**
(findings fixed: catalog missing F-09 · api-contract missing the cosmetic **acquire** endpoint ·
§3.4's stale category list incl. missing screen themes · OQ-001 supersession note · SYS-04
daily-bonus wording; Collection/Profile trails verified clean) + **`docs/design/SCREEN-STATUS.md`**
(the per-screen dashboard: state/queue/version/states-board/API columns, UP-NEXT queue, update
protocol) + **CLAUDE.md design-phase rules** (HTML-only deliverables — no PNGs; update the tracker
after every pass). All `_gate-*.png` artifacts deleted per the new rule.
