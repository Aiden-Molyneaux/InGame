# M6 owner walk — round 2 notes ledger (2026-07-17, batch mode)

> The gate5-notes pattern: every owner note filed + triaged + wave-assigned. Waves dispatch on the
> owner's pause; server-touching items hold until the device session ends. Rulings marked ⚖ feed
> decision 0078. Status: ⬜ queued · 🔧 dispatched · ✅ landed · 💬 answered.

## Answers owed (💬 in the wrap reply)
- A1 Contributor screen — BUILT (P13); unreachable from the self-Profile (the entry link was
  M7-deferred) → W-C6 wires it.
- A2 Profile edit (avatar/gamertags) — never staged in any milestone's client packets; server seams
  exist → W-C4 (manifest-first slice).
- A3 Game-page ABOUT — a stub because `GET /catalog/games/:id` (the game-detail aggregate) was never
  built (P2 flagged the hole) → W-C5 (server rider + client fill).

## WAVE A — correctness/bugs (client-first; dispatchable during the walk)
- ✅ W-A1 (da51928) **Adopted cards show "You" as Card Artist** (Collection) — attribution correctness; builder
  diagnoses client-vs-payload (the byViewer/designer seam, contract 0.68) and fixes the right side.
- ✅ W-A2 (da51928, live-confirmed plateless feed) **The nameplate inconsistency, unified structurally** — feed thumbs STILL plated; Collection
  LIST mixed; Discover all clean. Root hypothesis: flattened cards rendered at small sizes through
  `imageUrl` (full.png, plate baked) at some call sites vs `thumbUrl` (plateless, ?v=2) at others;
  live-composed cards use the pt-gate → plateless. FIX IN ONE PLACE: EntryCard picks the thumb
  source itself by rendered size (call sites stop choosing); sweep call sites passing pre-picked
  urls. This kills the class.
- ✅ W-A3 (da51928) **Default cards break plate conventions** — CARD-18's default face must position/float the
  nameplate exactly as designed cards do.
- ✅ W-A3b (efd4ce3, live-confirmed) **Default-card plate POSITION** (owner screenshot, re-opened from A3): the default card
  renders its plate as a strip pinned BELOW/OUTSIDE the card frame — covering the card's bottom edge
  + stepped corner (the Hades olive card) — while designed cards compose the plate INSIDE the
  silhouette. Conform the position, not just the height.
- ✅ W-A4 **CLOSED — not a centering bug** (owner confirmed: an illusion from the reward strip's
  contrast against the backdrop).
- ✅ W-A4b (e134c99) ⚖ **Celebration backdrop = the SCREEN-THEME colour with orange glyphs on top** (owner
  ruling w/ screenshot) — not the current whole-screen orange-brown tint; rays/glyphs stay orange
  (tier-coloured), the field is the theme bg.
- ⬜ W-B15 ⚖ **A less blank DEFAULT CARD visual** (owner todo) — the CARD-18 default face is a flat
  colour block; wants a visual treatment. Owner-taste design item (candidates → a small drafts pass
  or the pre-launch content pass; decide at the 0078 sitting).
- ⬜ W-A5 **Styler premium cost hidden behind the item container** — the price must read at a glance
  (an M5-era layering bug).
- ⬜ W-A6 **Top-3 with 2 seats spreads to screen edges** — must render consecutively from the left.
- ⬜ W-A7 **Device sticker edit-mode never confirms** — placing stickers stays editable until
  On-shell-preview; leaving the editor keeps editable stickers. Make set/confirm explicit (the
  KEEP grammar). ⚖ flow ruling implied — record the built shape in 0078.

## WAVE B — visual/layout rulings (client-only)
- ⬜ W-B1 ⚖ **Header alignment audit** — page headers must match Collection/Profile positioning
  (named offenders: Terms of Service, Friends; audit all routes).
- ⬜ W-B2 ⚖ **"Return to X" spacing audit** — both gaps (header↔return, return↔content) consistent
  app-wide (named: Add-Game creation page; audit all).
- ⬜ W-B3 ⚖ **Buy-bar height** — Hold-to-Pay/Buy proper height on Pixel + cosmetic purchases,
  rippled to every buy surface.
- ⬜ W-B4 ⚖ **Buy-page Cancel removed** (redundant; escape = sheet grammar).
- ⬜ W-B5 ⚖ **Theme buy pages: the "PREVIEWING" yellow chip removed.**
- ⬜ W-B6 ⚖ **Collection: Now-Playing card renders in the Hero ONLY** (not repeated in list views).
- ⬜ W-B7 ⚖ **Shelf view: per-entry chevron** (the List-view quick-entry into the Game page).
- ⬜ W-B8 ⚖ **Add-Game "create this game" prompt = GOLD with pixel-stepped corners** (acquisitive,
  F-02-consistent; it creates a card-bearing entry).
- ⬜ W-B9 ⚖ **Game page DESIGN NEW back to ORANGE** — reverses the 0069 "DESIGN NEW = gold" ruling
  (owner, this walk). 0078 records the amendment.
- ⬜ W-B10 ⚖ **Friend profile layout** — VIEW COLLECTION + COMPARE HOURS in one row · FRIEND tag
  repositioned (under the profile details) · mutual-friends count relocated · section order =
  the self-Profile's order.
- ⬜ W-B11 ⚖ **Settings** — Sign Out at the bottom · gear on a white/cream key (the 0069 secondary
  voice) · legal screens opened FROM Settings keep the nav band ACTIVE (the locked state is
  pre-auth only).
- ⬜ W-B12 ⚖ **Device editor: "EDITING YOUR DEVICE" / "SWITCHED" readouts removed.**
- ⬜ W-B13 ⚖ **Profile: Settings gear on a white button** (folded into W-B11).
- ⬜ W-B14 ⚖ **Pinned Favourite gets Hero-card treatment** with additional game details (compose per
  the Collection hero grammar).

## WAVE C — behavior/server (HOLD until the device session pauses; contract/spec ripples via 0078)
- ⬜ W-C1 ⚖ **Fuzzy people-search** — "Kyra" must find "KyraInGame": exact-match → prefix/substring
  (case-insensitive), same neutrality/rate posture. Contract row + server change + PersonRow states
  unchanged. (SOC-07 amendment → 0078.)
- ⬜ W-C2 **OQ-147 code** — cancel-exempt revert (the morning ruling; spec edit rides 0078).
- ⬜ W-C3 **OQ-148 widening** — friends' achievement pages mask secrets (server read + client).
- ⬜ W-C4 **Profile edit slice** — manifest-first: bio/username(cooldown)/genres edit · gamertag
  add/remove · avatar per the board's model (v2 = no image uploads; confirm the board's
  preset/monogram scheme before building). Server seams largely exist.
- ⬜ W-C5 **Game-detail aggregate + ABOUT** — build `GET /catalog/games/:id` (the P2-flagged hole;
  folds friendsWhoOwn per the contract row) + fill the ABOUT tab (canonical facts · genres ·
  studio/publisher · contributor credit · CAT-09 counts).
- ⬜ W-C6 **Profile → MY CONTRIBUTIONS entry** (the P13 screen's missing front door).
- ⬜ W-C7 **OQ-150 build** — /catalog/new-releases + the rails answer (owed from the morning).
- ⬜ W-C8 **NARROWED by A1: `/me/collection` must emit the `designer {userId, username}` rider on
  custom cards** (contract 0.50 prescribes it; the switcher + friend serializers already emit it).
  The client is pre-widened and renders the name the moment it lands (honest COMMUNITY fallback
  meanwhile). Feed thumbs needed NO server half — every list payload already carries thumbUrl.

## WAVE D — design-think BEFORE build (the owner asked for deeper thought)
- ⬜ W-D1 **The adaptive Game page consolidation** — ONE Game page across three postures: OWN entry
  (full PLAY/CARDS/ABOUT) · FRIEND's entry (their PLAY read-only + ABOUT + community CARDS +
  compare affordance — replacing/absorbing P9's separate `/user/[id]/entry/[gameId]` route) ·
  CATALOG/no-entry (ABOUT + community CARDS + add-to-collection — reachable from Add-Game search
  so a user can inspect BEFORE adding; the board's M7/M8 artboards intended exactly this).
  Fable drafts the posture/routing/data model → owner nod → build.

## Standing lesson for every wave builder (from today's fixes)
Consume the shipped component library — nearly every visual miss this walk was a builder REDRAWING
something that already existed (PixelsMark, SectionDock, sheet mounts, the plate gate). Manifest
briefs for M7 get this line verbatim.
