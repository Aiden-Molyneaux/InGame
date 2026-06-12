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
