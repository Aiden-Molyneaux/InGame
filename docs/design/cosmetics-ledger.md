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

All entries are `tier: basic` until the owner partitions free/premium (0068 §3).

## Frames

| Option | Kind · colour | Status | Notes |
|---|---|---|---|
| CLEAN | — | **Active** | The no-frame default. |
| LINE | `thin-line` `#c9c5e6` | **Active** | 0063 original ("THIN LINE"); refit as a filled band 2026-07-09. |
| DOUBLE LINE | `double-line` `#9b97c0` | **Active** | 0063 original. The band-thickness REFERENCE. |
| TICKET | `ticket-notch` `#f3ecd9` | **Active** | 0063 original; band + side punch-notches. |
| BRACKETS | `bracket-corners` `#f3ecd9` | **Active** | 0063 original; corner arms only. |
| PIXEL | `pixel-border` `#7ad0e8` | **RETIRED 2026-07-09** | Owner cut at the 0068 iteration pass. Renderer keeps the kind (legacy docs; the ARCADE kit was moved onto cyan BRACKETS). |
| GOLD | `thin-line` `#e8c14a` | **Active** | 0068 ("THIN GOLD" → renamed at the band refit). |
| LIME | `thin-line` `#a9e34b` | **Active** | 0068. |
| BUBBLEGUM | `thin-line` `#e85ad0` | **Active** | 0068. |
| CHROME | `double-line` `#d8d5ec` | **Active** | 0068; silver double-rule. |
| STUB | `ticket-notch` `#ff9f43` | **Active** | 0068; accent-orange so it isn't a second cream TICKET. |
| ORNATE GOLD | `ornate` | **Active · v2** | 0068; v2 2026-07-09 — gold-grade band + cream pinstripe + corner rosettes. |
| EMBER GLOW | `glow` `#ff5a5a` | **Active** | 0068; band + red bloom. |
| PLASMA | `glow` `#5ad0ff` | **Active** | 0068; the glow kind in blue. |
| HOLO FOIL | `foil` | **Active** | 0068; iridescent band; live sheen rides it. |
| MARQUEE | `marquee` | **Active · animated** | 0068; dim gilded track + the live chasing light. Known nit: the light traces a plain rectangle, not the stepped notch. |

## Effects (one at a time + intensity — CARD-12)

| Option | Kind | Status | Notes |
|---|---|---|---|
| SOFT GLOW / SCANLINE / SHEEN / DUST / VIGNETTE | — | **Active** | The 0063 free five. |
| GRAIN | `grain` | **RETIRED 2026-07-09** | Owner cut at the 0068 iteration pass (film speckle read as noise). Renderer keeps the kind. |
| INNER GLOW | — | **Rejected pre-build 2026-07-09** | Brainstormed in the 0068 batch; owner cut before implementation. |
| HALFTONE | `halftone` | **Active** | 0068; comic dot-screen. |
| FROST | `frost` | **Active · animated · v2** | 0068; v2 2026-07-09 — corner blooms + deterministic ice-shard spray; live cold shimmer. |
| EMBERS | `embers` | **Active · animated** | 0068; hearth glow + live rising motes. |
| GALAXY · FIRE · RAIN · AURORA | — | **Parked** | The spec's own animated-moat examples (CARD-12/COSM-03); natural next batch on the driver. |

## Finishes (binary materials, stack over the effect)

| Option | Kind | Status | Notes |
|---|---|---|---|
| STANDARD / MATTE / SUBTLE GLOSS | — | **Active** | The 0063 free set. |
| SATIN | — | **Rejected pre-build 2026-07-09** | Brainstormed in the 0068 batch; owner cut before implementation. |
| HIGH GLOSS | — | **Rejected pre-build 2026-07-09** | Same. |
| LINEN | `linen` | **Active** | 0068; woven crosshatch. |
| HOLOGRAPHIC | `holographic` | **Active · animated · v2** | 0068; v2 2026-07-09 — banded rainbow + counter-shimmer; live sheen sweep. Tilt-reactive parked for device motion (M5). |
| METALLIC | `metallic` | **Active · animated · v2** | 0068; v2 2026-07-09 — diagonal brushed striations + specular; live sheen sweep. Tilt-reactive parked. |

## Nameplates (topmost since 2026-07-09 — above frame/effect/finish, lifted off the bottom edge)

| Option | Shape | Status | Notes |
|---|---|---|---|
| SLAB / RIBBON / BEVEL | — | **Active** | The 0063 set (+ OQ-135: a plate is required; legacy `none` → SLAB). |
| CAPSULE / TAB / ARCH / DOGTAG | — | **Active** | 0068. |
| BRASS | `brass` | **Active** | 0068; gold-gradient face, ignores plate colour. |

## Title fonts

| Option | fontId | Status | Notes |
|---|---|---|---|
| CHAKRA / PAYTONE | `clean-sans` / `bold-display` | **Active** | The 0063 pair (F-08 surfaces). |
| PIXEL | `press-start` | **Active** | 0068; draws at 0.6× optical scale (FONT_SCALE — it renders huge at a given em). |
| SLAB | `bitter` | **Active** | 0068. |
| MONO | `space-mono` | **Active** | 0068. |
| SCRIPT | `pacifico` | **Active** | 0068. |
| STENCIL | `stencil` | **Active** | 0068 (Allerta Stencil). |
