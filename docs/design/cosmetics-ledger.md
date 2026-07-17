# Cosmetics ledger — every customization option explored

**Owner:** the design owner (Aiden) · **Kept by:** the build agent, on every roster change ·
**Created:** 2026-07-09 (owner directive — "a document that tracks customization options we've explored").

The living memory of the cosmetic roster: what's ACTIVE, what was tried and RETIRED (and why), and
what's PARKED for later. The *rulings* live in decisions ([`0063`](../decisions/0063-cosm02-free-baseline-roster.md)
free baseline · [`0068`](../decisions/0068-roster-expansion-animation-driver.md) expansion + animation
driver); the *live source of truth* for what the Styler offers is
[`roster.ts`](../../apps/mobile/src/styler/roster.ts). This ledger is the history those two don't keep.

**Retirement rule (F21):** retiring an option removes it from the roster (the Styler stops offering
it) but the RENDERER keeps its kind forever — legacy documents that carry it still draw. Never delete
a render branch.

**Tiering (decision 0075, P10, 2026-07-13):** the free/premium partition landed — 26 premium items at
3/6/8 PX (tiers 1/2/4/10 launch empty, pre-launch content pass). Status cells below now read
**Active · premium N** for a gated item; plain **Active** stays free. Two items retired AT the tiering
pass (never offered again, renderer keeps the kind for legacy documents — the PIXEL/GRAIN precedent):
**BRACKETS** (frame) · **SUBTLE GLOSS** (finish).

## Frames

| Option | Kind · colour | Status | Notes |
|---|---|---|---|
| CLEAN | — | **Active** | The no-frame default. |
| LINE | `thin-line` `#c9c5e6` | **Active** | 0063 original ("THIN LINE"); refit as a filled band 2026-07-09. |
| DOUBLE LINE | `double-line` `#9b97c0` | **Active** | 0063 original. The band-thickness REFERENCE. |
| TICKET | `ticket-notch` `#f3ecd9` | **Active** | 0063 original; band + side punch-notches. |
| BRACKETS | `bracket-corners` `#f3ecd9` | **RETIRED 2026-07-13** | 0075 roster-tiering pass. Renderer keeps the kind (legacy docs); the ARCADE kit template still wears cyan BRACKETS — a design follow-up, not re-touched by P10 (mechanical pass). |
| PIXEL | `pixel-border` `#7ad0e8` | **RETIRED 2026-07-09** | Owner cut at the 0068 iteration pass. Renderer keeps the kind (legacy docs; the ARCADE kit was moved onto cyan BRACKETS). |
| GOLD | `thin-line` `#e8c14a` | **Active · premium 3** | 0068 ("THIN GOLD" → renamed at the band refit); 0075 tiering. |
| LIME | `thin-line` `#a9e34b` | **Active** | 0068. |
| BUBBLEGUM | `thin-line` `#e85ad0` | **Active** | 0068. |
| CHROME | `double-line` `#d8d5ec` | **Active · premium 3** | 0068; silver double-rule. 0075 tiering (also D3 newcomer-ladder gift). |
| STUB | `ticket-notch` `#ff9f43` | **Active** | 0068; accent-orange so it isn't a second cream TICKET. |
| ORNATE GOLD | `ornate` | **Active · v2 · premium 3** | 0068; v2 2026-07-09 — gold-grade band + cream pinstripe + corner rosettes. 0075 tiering. |
| EMBER GLOW | `glow` `#ff5a5a` | **Active · premium 3** | 0068; band + red bloom. 0075 tiering. |
| PLASMA | `glow` `#5ad0ff` | **Active · premium 3** | 0068; the glow kind in blue. 0075 tiering. |
| HOLO FOIL | `foil` | **Active · premium 3** | 0068; iridescent band; live sheen rides it. 0075 tiering. |
| MARQUEE | `marquee` | **Active · animated · premium 8** | 0068; dim gilded track + the live chasing light. Known nit: the light traces a plain rectangle, not the stepped notch. 0075 tiering. |

## Effects (one at a time + intensity — CARD-12)

| Option | Kind | Status | Notes |
|---|---|---|---|
| SOFT GLOW / SHEEN / DUST / VIGNETTE | — | **Active** | The 0063 free four. |
| SCANLINE | `scanline` | **Active · premium 3** | The 0063 free-five original — moved to premium at the 0075 tiering pass. |
| GRAIN | `grain` | **RETIRED 2026-07-09** | Owner cut at the 0068 iteration pass (film speckle read as noise). Renderer keeps the kind. |
| INNER GLOW | — | **Rejected pre-build 2026-07-09** | Brainstormed in the 0068 batch; owner cut before implementation. |
| HALFTONE | `halftone` | **Active · premium 3** | 0068; comic dot-screen. 0075 tiering (also D6 newcomer-ladder gift). |
| FROST | `frost` | **Active · animated · v2 · premium 8** | 0068; v2 2026-07-09 — corner blooms + deterministic ice-shard spray; live cold shimmer. 0075 tiering. |
| EMBERS | `embers` | **Active · animated · premium 8** | 0068; hearth glow + live rising motes. 0075 tiering. |
| GALAXY · FIRE · RAIN · AURORA | — | **Parked** | The spec's own animated-moat examples (CARD-12/COSM-03); natural next batch on the driver. |

## Finishes (binary materials, stack over the effect)

| Option | Kind | Status | Notes |
|---|---|---|---|
| STANDARD / MATTE | — | **Active** | The 0063 free pair (down from three — SUBTLE GLOSS retired). |
| SUBTLE GLOSS | `subtle-gloss` | **RETIRED 2026-07-13** | 0075 roster-tiering pass. Renderer keeps the kind (legacy docs). |
| SATIN | — | **Rejected pre-build 2026-07-09** | Brainstormed in the 0068 batch; owner cut before implementation. |
| HIGH GLOSS | — | **Rejected pre-build 2026-07-09** | Same. |
| LINEN | `linen` | **Active · premium 3** | 0068; woven crosshatch. 0075 tiering (also D1 newcomer-ladder gift). |
| HOLOGRAPHIC | `holographic` | **Active · animated · v2 · premium 8** | 0068; v2 2026-07-09 — banded rainbow + counter-shimmer; live sheen sweep. Tilt-reactive parked for device motion (M5). 0075 tiering. |
| METALLIC | `metallic` | **Active · animated · v2 · premium 8** | 0068; v2 2026-07-09 — diagonal brushed striations + specular; live sheen sweep. Tilt-reactive parked. 0075 tiering. |

## Nameplates (topmost since 2026-07-09 — above frame/effect/finish, lifted off the bottom edge)

| Option | Shape | Status | Notes |
|---|---|---|---|
| SLAB / RIBBON / BEVEL | — | **Active** | The 0063 set (+ OQ-135: a plate is required; legacy `none` → SLAB). |
| CAPSULE / TAB / ARCH / DOGTAG | — | **Active** | 0068. |
| BRASS | `brass` | **Active · premium 3** | 0068; gold-gradient face, ignores plate colour. 0075 tiering — the only premium nameplate (also D4 newcomer-ladder gift). |

## Title fonts

| Option | fontId | Status | Notes |
|---|---|---|---|
| CHAKRA / PAYTONE | `clean-sans` / `bold-display` | **Active** | The 0063 pair (F-08 surfaces). |
| PIXEL | `press-start` | **Active** | 0068; draws at 0.6× optical scale (FONT_SCALE — it renders huge at a given em). |
| SLAB | `bitter` | **Active · premium 3** | 0068. 0075 tiering. |
| MONO | `space-mono` | **Active · premium 3** | 0068. 0075 tiering. |
| SCRIPT | `pacifico` | **Active · premium 3** | 0068. 0075 tiering. |
| STENCIL | `stencil` | **Active · premium 3** | 0068 (Allerta Stencil). 0075 tiering (also D2 newcomer-ladder gift). |

## Device shells + screen themes (theme/palettes.ts — DEV-02/04, not the Styler roster above)

| Option | Status | Notes |
|---|---|---|
| TEAL | **Active** | The default shell. |
| GRAPE | **Active** | Moved to free at the 0075 tiering pass (was premium-leaning under 0068's placeholder posture). |
| SUNSET | **Active · premium 6** | Moved to premium at the 0075 tiering pass. |
| PINK | **Active · premium 6** | 0075 tiering. |
| CARBON | **Active · premium 8** | 0075 tiering. |
| MIDNIGHT | **Active** | The default theme. |
| PAPER | **Active** | The light-theme default; stays free (0075). |
| DEEP SEA | **Active · premium 6** | 0075 tiering (also D5's MINT sibling — the newcomer-ladder gift is MINT, not this one). |
| BERRY | **Active · premium 6** | 0075 tiering. |
| MINT | **Active · premium 6** | 0075 tiering (also D5 newcomer-ladder gift). |
| LILAC | **Active · premium 6** | 0075 tiering. |
