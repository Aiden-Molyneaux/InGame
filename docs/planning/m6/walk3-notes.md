# M6 owner walk-3 — the per-finding ledger (2026-07-20)

> The owner's live-app walk after the beta-wave close (auth clients + W-5 landed). Two note-stashes,
> 17 findings, fixed same-day by 8 builder lanes + a Murr-fix round; gated by Murr (full-diff,
> fable) + Parvati (all six surfaces, opus). Statuses: ✅ landed · the walk-wave commit carries all.
> Companion artifacts this walk also produced: `cosmetic-inventory.md` (the design-round sitting doc)
> · `load-harness-notes.md` (the card-volume stress harness + 4 confirmed scaling cliffs) ·
> the walkseed_* demo data (3 verification-gap closers).

## Stash 1

| # | Surface | Finding | Disposition |
|---|---|---|---|
| 1 | Game page | Adopted cards no longer show cosmetics in the card switcher | ✅ NEVER-WIRED gap (not a W-5 regression — the CARD-22 `equipped` snapshot was served since bad9a63 but never rendered); switcher adopted rows now render the read-only server-label readout; degrades to note-only when the snapshot is absent |
| 2 | Game page | About EDIT → hide in the ⋯ overflow ("Edit Catalog Details") + accuracy disclaimer | ✅ OWN posture: overflow entry → controlled edit mode + disclaimer ("These facts are shared with everyone…"); A1 age-gate enforced on the new path. **Owner-option W3-A:** CATALOG/FRIEND postures keep the inline EDIT key (no overflow exists there) — bless the posture split or grow a catalog overflow |
| 3 | Collection | Games/Pixel header containers unequal height (explicit-preference regression) | ✅ broke in c8f4fe1 (the 26px band's stretch was silently defeated by the counter's inner wrapper); both keycaps now share ONE stretch mechanism; RED-before-fix test |
| 4 | Collection | "Tap a card to flip" hint jars layout on relog | ✅ absolute overlay above the tools bar — appear/dismiss can never reflow; taps pass through. **Owner-option W3-B:** it still re-shows every relog BY DESIGN (logout purges per-user prefs); say the word for once-ever (needs a purge-surviving flag) |
| 5 | Friend profile | Pinned card should absolutely be shown | ✅ SUPERSEDES the P9 deliberate cut — `favouriteGame` on the friend shape (flattened, SOC-11 leak-asserted, absent on limited); renders like own profile, read-only (api 0.78) |
| 6 | Friend profile | Compare Hours button should be white | ✅ `action-alt` → `secondary` (the 0069 cream/white voice) |
| 7 | Friend profile | ⋯ opens a scrim but no drawer (broken) | ✅ REAL BUG: the sheet was mounted INSIDE the ScrollView (overlay anchored to scroll content, sheet docked off-screen); now a screen-root sibling via Frame's new `overlay` prop; regression test pins content-renders + not-a-scroll-descendant |

## Stash 2

| # | Surface | Finding | Disposition |
|---|---|---|---|
| 8 | Friend profile | Contributions not present; should be | ✅ `cardsPublished` on the friend shape (PUBLISHED-only — no draft leak; api 0.79) + the possessive teaser between ACHIEVEMENTS and the pin, shown-even-at-0 (matches own profile), routes to `/contributor/:id` |
| 9 | Friend profile | "Achievements" text renders too large vs own Profile | ✅ the real drift was the COUNT (title-15 vs the self N-A5 ruling's body-11); conformed + shared constant across both teaser rows |
| 10 | Store | "New This Week" → "Spotlight" (rotation question) | ✅ ANSWER: it never rotated (hardcoded 6-id array). Now `SPOTLIGHT_IDS` — owner-curated, order-respected, newest-N fallback, seeded with the same six (visible store unchanged). **Owner-sitting W3-C:** the curation policy (when/how you rotate) + note the empty-list fallback is the registry TAIL (shells/themes — fine while the seed stands) |
| 11 | Store | Bottom entry points: Pixel Top-Up (moved) + Wallet, in the Index row grammar | ✅ new `StoreEntries` at the store bottom (TOP UP · WALLET rows); THE INDEX is aisles-only now; navigation-only, economy untouched |
| 12 | Device editor | "Editing device" banner jars on every sticker move | ✅ the jar was the transient SAVING… save-line mounting in-flow twice per drag (the session banner was already retired, W-B12); now a fixed-height slot inside the status block — content swaps, layout never moves. **Owner-option W3-D:** retire the PLACING/save readout entirely per the W-B5 banner-minimization thread? |
| 13 | Styler | "Start from" options are hideous; need relevant defaults | ✅ 6 curated palette families (NEBULA·EMBER·HORIZON·GROVE·ARCADE·MONOLITH) + DEFAULT last; genre-aware lead (reorder-only); Canvas base row speaks the same voices. Found + fixed a REAL bug: old ARCADE opened a premium debt (retired frame kind + re-tagged premium effect — CARD-16 breach). **Taste-veto surface:** families/names/genre-map are data atop roster.ts |
| 14 | Styler | "Surprise me" nifty but not well implemented | ✅ family-coherent deals (4 layout archetypes, palette-locked fills, free-only guaranteed, injectable rng, 200-seed property tests) |
| 15 | Styler / content | Pre-beta design round per cosmetic category — wants an inventory | ✅ `cosmetic-inventory.md`: 57 priced + 8 free stickers, zero roster drift, the STICKER-PACKS ghost aisle (wired end-to-end, zero catalog rows — the biggest open slot), tier holes, blank decision grid for the sitting |
| 16 | Game page | About details laid out explicitly (Publisher/Studio/Genres) + explicit community stats | ✅ labeled DETAILS rows (absent field → row omitted) + COLLECTIONS · FRIENDS HAVE IT · AVG RATING · AVG HOURS (new one-scan aggregates; null → row omitted; "ranking"→RATING per the app's concept, flagged). Murr MAJOR caught + fixed: wishlist entries counted as owners in avgHours (5 wishlisters + 1 player@60h would read "10") — now status-filtered per the statsOf/0058 convention, attack-tested |
| 17 | Game page | Genres rendered twice side by side | ✅ the meta subtitle printed genre[0] beside the DISC-02 chip strip; both retired into the single labeled GENRES row |

## The gates
- **Murr (full 17-fix diff):** NO-GO → 1 MAJOR (the wishlist aggregate, fixed + 2 attack tests) · 2 debt
  (a theater test strengthened with a real discriminator · a lying comment fixed) · 3 owner-calls
  (W3-E: `cardsPublished` required-not-nullable vs the file's own nullable-for-rollout convention —
  bless the lockstep or `.nullable()` it · the spotlight fallback content · the edit-posture split) —
  re-verified green after fixes.
- **Parvati (opus, all six surfaces):** see the walk-wave heading in `m6-review-notes.md`.

## Stash 3 (2026-07-20/21 — fixes + two owner-approved proposal builds)

| # | Surface | Finding | Disposition |
|---|---|---|---|
| 18 | Add Game | Search status swap (spinner↔no-matches) jars the screen | ✅ the NO-MATCHES panel is the permanent height anchor (opacity-0 + a11y-hidden mid-fetch), spinner on an absolute overlay — typing never shifts (Parvati: anchor held at top=222px across states) |
| 19 | Styler | Start-froms/surprise still ambiguous — think first, structure over mood; Surprise removable if unsolved | ✅ OWNER-APPROVED structural rebuild: 3 backdrops (DIAGONAL SPLIT · INSET PANEL · BANDED THIRDS) + 3 title layouts (ARC BANNER w/ the real title · TAG+MONOGRAM · CAPTION BLOCK) + 2 emblems + DEFAULT-last; tones derive from the CURRENT base (Murr-caught, fixed, Parvati-verified live); VIGNETTE RING + CORNER WEDGE honestly dropped (primitives can't do a radial fade); genre ordering retired. **DEAL A CARD** = one-attempt zone-ruled composition (~28% emblem-free) — owner judges on walk; removal stays on the table |
| 20 | Game catalog edit | Disclaimer used a non-app pattern | ✅ re-dressed as InlineBanner (decision 0042's designated notice primitive); copy unchanged |
| 21 | Add Game | Post-add adopt/create screen "missing" | ✅ MYSTERY SOLVED: the W-C10 step existed but AUTO-ADVANCED silently on empty galleries (most seed games) + had no design-door/full-list door. OWNER-APPROVED rebuild: stats → status → the CARD FORK (top-6-by-adoption strip · SEE ALL › · DESIGN YOUR OWN › · keep-default; empty gallery renders the fork — silent skip retired). Spec 0.66 |
| 22 | Game page | Full community-cards list: does it exist? how sorted? | ✅ ANSWER: it didn't — the gallery returned the ENTIRE set unpaginated, recency-only, no controls (mockups drew SORT/SEE-ALL, never built). BUILT: paged full-list route (24/cursor, contributor pattern) + TOP (SQL adoption-aggregate, adopted-first·count-desc·id-asc) / NEW toggle + top-12 inline w/ SORT + SEE ALL on every posture; SOC-09 block-filter in-query. api 0.81 |
| 23 | Collection | Row tap anywhere should open the game (card still flips) | ✅ row body = ONE navigate Pressable, a SIBLING of the card slot (the P13-F3 nested-press rule); card flips, a11y "Open {game}" |
| 24 | Sticker packs | "We'll add some in our next cosmetic pass" | 📋 recorded → rides the cosmetic-inventory design round (the ghost-aisle finding) |

**Stash-3 gates:** Murr (fable, full diff) NEEDS-FIXES → all closed same-day: 2 MAJOR (numeric-overflow cursor → 500 — shared `decodeOffsetCursor`, house grammar kept · the sort-flip loadMore race — generation guard, both with the demanded regression tests) + 1 MINOR (`.strict()` → ledger-precedent strip) + tones-follow-base + 3 debt. Parvati (opus) CLEAN 0 🚩 · 2 🎨 (a dense deal combo · SEE-ALL/LOAD-MORE undemoable at seed scale — richer-seed customer #4/#5). Definitive green: unit 303 · integration 539 · mobile 111/828.

## Owner-options accumulated (one batch ruling)
- **W3-A** catalog/friend postures keep the inline About-EDIT key (posture split) — bless or unify
- **W3-B** flip-hint re-shows every relog — bless or make once-ever
- **W3-C** Spotlight curation policy (+ the tail-fallback caveat)
- **W3-D** retire the device PLACING/save readout entirely?
- **W3-E** `cardsPublished` strict/required vs nullable-for-rollout
- **W3-F** styler families taste-veto (data-only retune)
- **W3-G** garbage-cursor grammar: silent page-1 (house precedent, kept by the overflow fix) vs 422
- **W3-H** offset paging + non-transactional count under concurrent adoption — dup/skip/total-drift
  possible; beta-acceptable, bless consciously
- **W3-I** adopting from the full list resets accumulated pages (hook contract; deep-scroll snap-back)
- **W3-J** adopting via the fork's SEE ALL door leaves the fork's exit reading "Keep the default"
  (state persists correctly; the label lies — cheap fix if it grates on the walk)
- Plus the standing pre-walk parked items: the W-5 draft-share posture · HueStrip literals · the
  Parvati W-5 eyes (saturated-hue · featured-slot swap · aisle co-listing).
