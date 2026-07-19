# W-5 — "Ultimate" colour-customizable cosmetics (OQ-154) — design + spec draft

> **Status:** DRAFT for owner review — nothing here is spec until the owner nods §7 and the
> product-spec/api-contract pass lands (00-INDEX §4). Owner ruling already on file (OQ-154,
> 2026-07-18): **into the beta · per-design single-SKU** (one purchase = one specific design that
> carries colour freedom; a second customizable design is a separate purchase — NOT a per-category
> unlock).
>
> Grounded against: product-spec §5.6/§5.8/§5.9 (CARD-11/12/13/15/22 · COSM-01..04 · ECON-01/03/04) ·
> api-contract 0.72 (`/cosmetics` · `/store` · acquire/adopt) · `apps/api/src/config/cosmetics.ts`
> (the 0072/0075 registry) · `packages/shared/src/schemas/composition.ts` ·
> `apps/mobile/src/render/composition.ts` + `buildCard.ts` · `apps/mobile/src/styler/roster.ts` ·
> `apps/mobile/app/styler/[gameId].tsx` · `ColorPicker.tsx` (CR-11/decision 0067).

---

## §1 The model

**A per-design flag, not a new type, and not a new tier.**

1. **`colorCustomizable: true`** is a new optional attribute on `CosmeticCatalogEntry` in
   `apps/api/src/config/cosmetics.ts` (mirrored on the client roster item in
   `apps/mobile/src/styler/roster.ts`). It is **registry-level metadata on a design**, exactly like
   `tier` — no new `CosmeticType`, no new table, no new id space. A design either carries colour
   freedom or it doesn't.
2. **The tier is the EXISTING `ultimate` band.** The 7-tier ladder (decision 0072,
   `COSMETIC_TIERS`/`TIER_PRICES`) already ends at **`ultimate` = 10 PX** (= $2.00 at the 5 PX/$
   base rate; ECON-01 names it "the biggest and best"), and that band is **deliberately
   launch-empty** ("the pre-launch content pass fills them" — the file banner). Ultimate
   colour-customizable designs are precisely what that band was reserved for: **+25% over
   showpiece (8)**, no ladder change, no new ECON band, no config migration. Proposal: **every
   `colorCustomizable` design prices at tier `ultimate`** (the flag and the tier travel together at
   launch; the registry does not enforce the pairing, so a future earned/ACH-04 colour-customizable
   prestige item stays possible).
3. **One purchase = that design + its colour freedom.** The `user_entitlements` row is
   **unchanged** — one row per (user, cosmeticId), `source` unchanged. The entitlement **IS the
   design**; colour is a **composition attribute** (§2), never an entitlement. There is no
   "colour unlock" row, no per-colour SKU, no scope column. Consequences that fall out for free:
   - idempotent re-acquire, the F36 race, ECON-11 clawback, ECON-04 adopt-grant — all behave
     identically to today, because the row is identical to today;
   - recolouring an owned ultimate design costs nothing and is unlimited (colour is just an edit,
     like moving a rect);
   - the ReconcileSheet, ledger `detail` ("«NAME» · FRAME"), and `/me/entitlements` need zero
     shape changes.
4. **No RevenueCat/IAP work.** OQ-154's note about "the RevenueCat SKU" dissolves under ECON-01:
   premium cosmetics are **never sold for real money directly** — an ultimate design is a plain
   10 PX catalog item bought with Pixels via the existing `POST /cosmetics/:id/acquire`. The IAP
   surface (currency packs) is untouched. "Single-SKU" in the ruling = single **catalog item**, and
   that is what this is.

## §2 Where colour lives

**Chosen in the Styler via the shared ColorPicker; stored per-layer in the composition JSON —
the CARD-12 intensity precedent, exactly.**

### 2.1 Storage — the composition already has the seams

CARD-12 established that a per-layer tuning value (`effect.intensity`) **persists in the
composition** (CARD-15 JSON). Colour follows the same law — and the render-local closed-attribute
shapes (`apps/mobile/src/render/composition.ts`) **already carry per-layer colour fields**:

| Layer | Existing field | Ultimate colour writes to |
|---|---|---|
| frame | `frame: { kind, color, width }` | **`frame.color`** (already the stroke/band/glow tint — `buildCard.ts` frameNodes) |
| nameplate (plate) | `nameplate.plate` | **`nameplate.plate`** (already passed as `plateColor` into `buildPlate`) |
| font (title) | `nameplate.ink` | **`nameplate.ink`** (already the title ink; today curated to the 6 `INKS` swatches) |

So for the beta categories (frame · nameplate · font) the colour needs **no new storage field** —
it rides fields the flatten already draws. **One additive schema attribute is still proposed:** an
optional **`cosmeticId`** on the `frame` and `nameplate` closed attributes
(`frame: { kind, color, width, cosmeticId? }`, `nameplate: { …, cosmeticId? }`), additive at
`schemaVersion 1` inside the `.passthrough()` envelope (the F21 rule — older parsers ignore it).
Why: today a frame's premium identity is inferred **kind+color** (`resolveFrameCosmeticId` /
`FRAME_ROSTER` in `config/cosmetics.ts`; "kind+color, never kind alone" — roster.ts). A freely
recoloured design breaks exact-colour matching on any kind that has a free variant
(`thin-line`/`double-line`/`ticket-notch` → a recolour would silently read FREE). An explicit
`cosmeticId`, **written by the Styler when an ultimate design is applied and trusted only after
registry validation** (server: id must exist, be premium, and its kind/shape must match the layer —
else fall back to inference), makes identity colour-independent for good. The beta picks (§4) are
chosen so inference *also* still works (belt and braces), but the explicit id is the forward rule
for CARD-22 labels and styler selection-derive (both currently exact-colour-matched).

- **Fonts need nothing:** `nameplate.fontId` already IS the cosmetic id (`collectCosmeticRefs`
  pushes it verbatim); ink freedom changes only the *allowed values* of `nameplate.ink`.
- **`compositionHash`/dedup:** content-sensitive over these fields automatically (canonical JSON) —
  two same-design-different-colour cards are honestly different compositions (CARD-19 ✓).
- **Style presets (CARD-24b):** the preset `style` snapshot already carries `title.ink` and the
  effect object; frame recolour rides the preset via the frame's roster id + (new) the snapshotted
  colour — a preset applying an unowned ultimate design still reconciles at KEEP (CARD-13, no change).

### 2.2 The render path — where the colour hook goes

`apps/mobile/src/render/buildCard.ts` (the single builder shared by live draw + flatten + PROOF —
"live/flatten/preview can't disagree"):

- **Frame:** frameNodes already stroke `c.frame.color` for every kind (thin/double/ticket bands,
  ornate rule, **glow bloom — "the glow colour is `color`"**, foil rest-tint, marquee track). The
  hook exists; **zero render change** for a colour-customizable frame.
- **Nameplate:** `buildPlate(shape, W, H, plateH, c.nameplate.plate, ctx)` colours every shape from
  `plateColor` — **except `brass`**, whose gradient is hard-coded
  (`['#f6d879','#c9971f','#8a6410']`, buildCard.ts ~L613). The one real render change in this
  draft: **parameterize the brass ramp from `nameplate.plate`** — derive the 3 gradient stops as
  lighten/base/darken of the chosen colour (pure function, same node structure; the current gold =
  the ramp of `#c9971f`, so legacy documents and the registry default render pixel-identical).
- **Font/ink:** the title draws `color: c.nameplate.ink` — **zero render change**.
- **The flatten backstop (the CARD-11 title-force precedent):** the authoritative server flatten
  already forces the nameplate title; it additionally **forces registry colour on any premium
  design that is NOT `colorCustomizable`** (resolved id → not flagged → overwrite the layer colour
  field with the roster value). The Styler is the gate (§3); this backstop means a hand-crafted
  composition can never ship a recoloured non-ultimate premium design. Free designs are untouched
  (free kinds already tolerate arbitrary colours — they simply read as the free variant).

### 2.3 Flatten + publish — no cross-user leak

CARD-15 holds unchanged: at save-private/publish the composition **flattens**; viewers (gallery,
adopters, friend shelves) receive **the image, never the layers** (OQ-122). The chosen colour is
**baked** for frames/nameplates/fonts — nothing new rides the wire. (Effects/finishes render as
runtime overlays, so a *colour-customizable effect* would need the overlay descriptor to carry the
colour cross-user like intensity — **deliberately out of beta scope**; §4 picks are all baked
categories. Recorded as the M7 extension seam.)

### 2.4 Non-owner adopts a card wearing an Ultimate design

Follow ECON-03/04 **verbatim** — an ultimate design is just a premium component:

- The adopt price chip = the **missing-components sum**; an unowned ultimate component contributes
  its **full tier price, 10 PX**. A card whose ultimate component the adopter already owns
  contributes 0 (ownership's reward, ECON-03).
- `POST /cards/:id/adopt` grants the **account-wide entitlement** (ECON-04) — which, because the
  entitlement IS the design (§1.3), **includes colour freedom**: the adopter can now apply that
  design in their own Styler in **any colour they choose**, not just the creator's. (The adopted
  card itself stays the flattened image with the creator's colour baked — adopt-then-edit is
  "adopt then edit-your-copy", CARD-16, and needs no reconcile, the components are owned.)
- The gallery/adopt-sheet `components` rows (`GET /games/:gameId/cards`) list the ultimate
  component like any premium row — name · type · **10 PX** · caller-scoped `owned` — plus the
  ULTIMATE marking (§4.1). `premium_component_ids` denormalization is untouched
  (`collectCosmeticRefs` resolves the id colour-independently per §2.1).

## §3 Gating — only flagged designs show the picker

- **Un-flagged designs behave exactly as today.** Free designs: no picker, fixed roster colours.
  Premium (standard/big/showpiece) designs: no picker, fixed roster colours, flatten-forced (§2.2).
  No existing surface moves.
- **The picker UI beat follows the section-extra grammar** — the same slot the CARD-12
  IntensitySlider occupies. `AttributeSection` already takes `children` rendered **under the rail**
  ("the EFFECT IntensitySlider, the TITLE ink row" — AttributeSection.tsx). The rule:
  - **FRAME / PLATE sections:** when the **selected** roster design is `colorCustomizable`, a
    **`ColorField` row** (the CR-11 default control: current swatch · last-10 recents · OPEN PICKER
    · from-card eyedropper) mounts under the rail, labelled **`COLOUR`**, patching the layer's
    colour field live (apply-on-release, the round-3 ColorPicker behavior). Selecting any other
    design unmounts it. First-apply seeds the registry default colour (marquee gold / brass gold —
    the design is never colourless).
  - **TITLE section:** the curated 6-swatch ink row **stays the default**. When the selected font
    design is `colorCustomizable`, the ink row **upgrades to the `ColorField`** (the curated
    swatches become the quick-swatch row inside it) — free-pick ink is the ultimate font's freedom.
    This also finally gives OQ-137 ("title ink stays curated at M4") its designed unlock path.
  - **Preview-then-acquire (CARD-13) holds:** an **unowned** ultimate design previews with the
    picker fully live (colour freedom is part of the try-on — the seduction is the point), wearing
    the standard PREVIEW badging; KEEP reconciles the 10 PX like any premium item. No special
    reconcile copy needed (the row reads «MARQUEE · FRAME · 10 PX»).
- **Canvas posture:** none of the beta picks are Canvas concerns (frames/plates/title are Styler
  closed attributes); the Canvas EDIT slip-sheet already free-picks element fills. No Canvas work.
- **Device editor:** shells/themes/stickers get no flag at beta (§4.2); the DEV surfaces are
  untouched.

## §4 Store merchandising

### 4.1 The ULTIMATE marking — gold-er than gold

F-02 grammar: gold = value/economy. Tiers today surface only as the **price** (the `PriceChip`
integer — gold text); no tier ever shows a name chip. Ultimate gets the one escalation the grammar
allows without a new colour: **inversion**. Proposal (owner-nod §7):

- **Aisle tile + item sheet:** a small **`ULTIMATE` chip — gold FILL, midnight text** (the inverse
  of every other gold-on-dark economy mark; filled gold is currently reserved for keycaps/value
  marks, so an inverted chip reads instantly as "top of the ladder" without inventing a token) +
  the standard PriceChip (10). Rendered wherever `tier === 'ultimate'` on a `cosmeticListItem`.
- **The colour-freedom tell:** the item sheet (and the Styler tile) carries a compact
  **hue-strip glyph** (a 5-step spectrum bar, square-cornered per F-07 — NOT a rainbow circle) with
  the copy **`ANY COLOUR — YOURS TO PICK`**. The swatch/preview for a colour-customizable design
  renders in its registry default colour (the store never needs a per-user colour).
- **Aisles:** ultimate designs sort **first within their type aisle** (the ladder is the sort key
  already — if not, this is the nudge); no separate "ULTIMATE aisle" at beta (3 items can't carry
  an aisle). The featured grid (`FEATURED_COSMETICS`) MAY swap one slot to an ultimate design at
  the owner's pleasure — config-only.

### 4.2 Beta starter designs — one per category (owner-nod §7)

Proposal: **promote three existing roster designs** (they fill the empty ultimate band; zero new
art, zero new render kinds, zero new font deps):

| Category | Design | Today | As ULTIMATE | Why this one |
|---|---|---|---|---|
| frame | **`marquee`** (MARQUEE) | showpiece · 8 PX | ultimate · 10 PX · recolour the gilded track + chase | The flagship frame; `kind:'marquee'` is all-premium so kind-inference resolves colour-independently already; the glow/track tint is literally `frame.color` — zero render work |
| nameplate | **`brass`** (BRASS) | standard · 3 PX | ultimate · 10 PX · the metal ramp in any hue ("brass in chrome, rose-gold, gunmetal") | The only premium nameplate; the one small render change (§2.2 brass ramp) buys the single most demo-able ultimate item |
| font | **`pacifico`** (SCRIPT) | standard · 3 PX | ultimate · 10 PX · free-pick ink while equipped | The showiest face; fonts need zero schema/render work — the freedom is the ink picker |

- **Grandfathering:** existing `user_entitlements` rows for these ids **stay valid** (the
  entitlement is the design) — current owners simply *gain* colour freedom, free. Generous, simple,
  and beta-population-small. Past ledger rows keep their historical prices (honest history).
- **Price movement:** new buyers pay 10 PX where they'd have paid 8/3/3. This is the per-design
  single-SKU model working as ruled — the recorded **alternative** (if the owner dislikes moving
  live prices mid-beta): mint three **new** registry entries riding the same render machinery
  (e.g. an `aura` glow-kind frame · an `enamel` capsule-shape plate · one new font face) and leave
  the current roster untouched — costs one font dep + three roster identities.
- Effects/finishes/shells/themes: **no ultimate designs at beta** (effects/finishes because of the
  overlay-descriptor seam, §2.3; shells/themes because the Device surface is closed for M6).

## §5 Migration + contract ripple

**No DB migration.** The registry is config-not-schema (the file banner's contract);
`user_entitlements` and `card_designs` are shape-unchanged.

| Artifact | Change |
|---|---|
| `apps/api/src/config/cosmetics.ts` | `CosmeticCatalogEntry` + `colorCustomizable?: true`; the 3 promotions (tier → `'ultimate'` + flag); `registerCosmeticForTest` grows an options arg for fixture flags |
| `apps/mobile/src/styler/roster.ts` | Mirror the flag + tier on `FRAMES`/`NAMEPLATES`/`FONTS` rows (ids unchanged — one id space holds) |
| `packages/shared/src/schemas/composition.ts` | Nothing REQUIRED (closed attrs ride `.passthrough()`); when the closed attributes formalize (0063 carry-over), `frame.cosmeticId?`/`nameplate.cosmeticId?` land as documented optional fields |
| Server flatten | The §2.2 non-customizable colour-force backstop + brass-ramp parameterization (shared builder) |
| product-spec | **NEW `COSM-05`** (next free after COSM-04): the Ultimate class — per-design `colorCustomizable` flag · colour is a composition attribute chosen in the editor (ColorPicker) · entitlement unchanged · flagged designs price at the ECON-01 ultimate band · non-flagged designs flatten-forced to registry colour. Amendment lines: **CARD-11** (curated ink upgrades to free-pick while an ultimate font is equipped — the OQ-137 unlock), **CARD-22** (readout labels resolve colour-independently for ultimate designs), **ECON-01** (no ladder change — a parenthetical naming colour-customizable designs as ultimate-band residents). No new ECON id needed (next free stays ECON-12, unused) |
| api-contract (0.72 → 0.73) | `GET /cosmetics` + `GET /store` `premiumCosmetics`: `cosmeticListItem` + **`colorCustomizable?: true`**; `GET /games/:gameId/cards` `components` rows + **`tier?`** (the adopt sheet's ULTIMATE chip needs it; additive F-17). Acquire/adopt/entitlements/wallet rows: **untouched** |
| design-spec | The §4.1 chip + hue-glyph + picker-beat rows (the design-phase formalization, post-nod) |

## §6 Packets (buildable decomposition)

Builder≠verifier; first-article rule; each packet lands green before the next starts.

- **P1 — Registry + server slice** (server-only, integration-first)
  Flag + promotions in `config/cosmetics.ts`; `cosmeticListItem.colorCustomizable` through
  `GET /cosmetics` + `GET /store`; `components` rows + `tier`; the flatten colour-force backstop;
  brass-ramp parameterization in the shared builder.
  *Tests:* cosmetics.test.ts — flag surfaces in `listCatalog`/featured; promoted ids price 10 via
  `lookupCosmeticTier`; `collectCosmeticRefs` keeps resolving recoloured marquee/brass/pacifico
  compositions premium (colour-independence); explicit `cosmeticId` wins over inference + is
  registry-validated (mismatched kind falls back); flatten forces colour on a recoloured
  non-flagged premium frame, leaves ultimate + free untouched; brass legacy documents render the
  identical gold ramp (snapshot); integration — acquire at 10 PX · `INSUFFICIENT_BALANCE {shortBy}`
  vs 10 · idempotent re-acquire · grandfathered entitlement still owns.
- **P2 — Styler picker beat** (client)
  The FRAME/PLATE section-extra `ColorField` (mount/unmount on selection, seed-default, live
  patch); the TITLE ink-row upgrade; selection-derive keeps the ultimate design selected after
  recolour (`cosmeticId`-first, kind-fallback); write `cosmeticId` on apply; preview-then-acquire +
  reconcile at 10; preset snapshot carries the colour.
  *Tests:* jest/RTL — picker present only for flagged+selected; recolour patches
  `frame.color`/`nameplate.plate`/`nameplate.ink`; non-flagged premium never mounts it; unowned
  ultimate previews + KEEP reconciles 10; ink row curated ⇄ ColorField swap on font selection;
  derive stability after recolour.
- **P3 — Store merchandising** (client)
  ULTIMATE inverted-gold chip + hue-strip glyph + item-sheet copy; aisle sort; (optional) featured
  swap.
  *Tests:* CosmeticSwatch/aisle RTL — chip renders iff `tier==='ultimate'`; glyph iff
  `colorCustomizable`; sheet copy; a11y labels.
- **P4 — Adopt surface** (thin — mostly free from P1)
  Adopt sheet shows the ULTIMATE marking on component rows; price math already server-side.
  *Tests:* integration — adopt a card wearing an unowned ultimate component charges the missing 10
  + grants the entitlement; fully-owned adopts free; the components row carries tier+flag.
- **P5 — Spec/contract/docs pass** (docs-only, may run first)
  COSM-05 + amendments + api-contract 0.73 + design-spec rows + decision record; `/health` green.

## §7 Owner-nod items

1. **Price point:** ultimate designs at the existing **10 PX** band (no new band) — confirm.
2. **Starter picks:** promote **MARQUEE · BRASS · SCRIPT** (with grandfathering + the price
   movement 8/3/3 → 10) — or the mint-new alternative (§4.2)?
3. **Badge look:** the **inverted gold ULTIMATE chip** + square hue-strip glyph +
   "ANY COLOUR — YOURS TO PICK" — direction OK? (Design-phase mockup follows the nod.)
4. **Adopt-pricing rule:** ultimate components ride ECON-03/04 unchanged (full 10 PX when missing;
   adoption grants full colour freedom, since the entitlement is the design) — confirm.
5. **The ink unlock framing:** free-pick ink scoped to *while an ultimate font is equipped*
   (OQ-137's unlock path) — or should ultimate fonts carry a different freedom?
6. **Clarification recorded, no action:** no RevenueCat SKU exists or is needed (§1.4).

---

*Draft filed 2026-07-18 (M6 W-5, OQ-154). Author: Claude (Fable). Next step: owner nods §7 → P5
spec pass → P1–P4 build packets.*
