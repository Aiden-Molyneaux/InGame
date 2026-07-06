# 0063 — COSM-02 free-baseline cosmetic roster (OQ-009 / OQ-010)

**Status:** LOCKED · **Date:** 2026-07-05 · **Author:** Claude Code (spec owner), from the owner's
M4-entry roster rulings · **Rules:** the launch **free** cosmetic set the three M4 editors consume
(COSM-02) and its **free/premium split** against COSM-03 (M5). Resolves **OQ-009** (vector-asset
library) + **OQ-010** (effect/finish roster, read broadly as the closed-attribute roster per M4 brief
§3.8). Companion to 0062 (the M4-entry gate).

## Context
The three M4 editors (Styler · Canvas · Device) need a defined **free asset roster** to build against
(the DEFAULT boundary, 0062: M4 ships free/private customization only; premium = M5, drawn-not-built).
The owner approved a proposed roster + splits (2026-07-05). Per the **CAT-04 genre-list precedent**
(OQ-125 / decision 0059), the roster is an **owner-blessed seed default**, SYS-08-tunable — recorded
here, referenced (not enumerated) by product-spec §5.8. Asset *creation* is editor-build work; this
record fixes the **content decision** (which categories, rough counts, the split).

## Decisions

### 1. Vector library — OQ-009 (Canvas element shelf; all free per 0017)
One generous free **"Essentials"** pack — breadth owner-approved:
- **Shapes (~12):** rectangle · rounded-rect · circle · ellipse · triangle · polygon (5/6/8-side) ·
  star · heart · diamond · line/rule · arrow. Recolour / scale / rotate / layer (CARD-02).
- **Icons (~30, gaming-flavored SVGs):** controller · d-pad · trophy · crown · skull · sword · shield ·
  potion · coin · flame · lightning · crosshair · dice · joystick · medal · ribbon · flag · sparkle ·
  heart · star · … — categorized + tagged + searchable (CARD-17).
- **Letters / numbers:** the bundled-font glyphs (§4 below), placeable as elements — **not** a separate
  pack.
No free/premium split (vector elements are all free, 0017). Themed packs are the natural first
*premium/earned* content later (COSM-03/04).

### 2. Effects — OQ-010 (one animated at a time + intensity, CARD-12)
- **Free (COSM-02, ~5):** none · soft-glow · scanline · gradient-sheen · dust/particles · vignette.
- **Premium (COSM-03, M5):** frost · fire · galaxy · raining-blood · holo-storm (the "wow" set — the
  store's moat, "things you can't just draw").

### 3. Finishes — OQ-010 (stackable, binary material)
- **Free (~2):** none · matte · subtle-gloss.
- **Premium (M5):** holo · foil · metallic · tilt-reactive.

### 4. Frames · nameplates · fonts — OQ-010 (the remaining closed attributes)
- **Frames — free (~6):** none/clean · thin-line · double-line · ticket-notch · bracket-corners ·
  pixel-border. *Premium (M5):* ornate · gold · animated.
- **Nameplates — free (~3):** SLAB · RIBBON · BEVEL (as drawn on the styler board, 0018).
  *Premium (M5):* HOLO PLATE · ornate.
  **AMENDED (owner gate-5 ruling, 2026-07-06 — resolves OQ-135): `none` is removed — a plate is
  REQUIRED so the game name always renders (CARD-01; the styler board's "THE NAME ALWAYS RENDERS"
  hint governs). Legacy `shape:'none'` compositions render as SLAB; the composition's nameplate
  object (title/font/ink) is never stripped by any pick.**
- **Fonts — free (~5):** clean-sans · bold-display · pixel/retro · serif · script (title font + ink;
  also the OQ-009 placeable glyphs). *Premium (M5):* fancy display / licensed.

### 5. Device free baseline (DEV-*/COSM-02) — deferred to the Device-editor build (§3.5)
Shell colours (a starter palette) · ~4–6 screen themes (DEV-04 legibility floor) · one free shell-sticker
pack. **Scoped when the Device editor builds** (a lighter follow-up), not enumerated now — the card
editors are the near-term consumers.

### 6. Owner notes (carried into the M4 editor build, not built here)
- **Dev-time premium preview.** During development the owner wants to try **any** option incl. premium.
  Acceptable to defer full premium-try to M5 (when the CARD-13 reconcile lands); the M4 editor build
  should provide a **dev-only unlock** (or expose the CARD-13 *preview-without-reconcile* half) so the
  owner can taste-evaluate the premium roster before M5.
- **Pre-launch roster design pass.** A **distinct design pass** to make the sets "perfect and full" is
  owed **before launch** (road-to-market M8 lane) — this record is the *build* seed, not the final
  curated roster.

## Consequences
- **product-spec 0.50** — COSM-02 gains a one-line pointer to this roster (SYS-08-tunable seed); no
  entity/api change (COSM-02 already exists; the roster is seed data).
- **OQ-009 + OQ-010 → resolved.** The two owner notes (§6) are tracked here + the M4-entry decision log.
- Road-to-market M8 gains the **pre-launch COSM roster design pass** line.
- Consumed by the three editors' manifests at build (M4 brief §3.8) — gated by the §8 DoD line, not a
  separate parvati pass.
