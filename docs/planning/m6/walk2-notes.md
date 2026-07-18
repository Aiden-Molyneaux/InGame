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
- ✅ W-A4c (5f35ecb) **Celebration reward strip floated as a LIGHTER box on the A4b theme field**
  (owner screenshot: "+2 PIXELS / ADDED TO YOUR WALLET" left-pinned in a pale panel). Fix: a
  `recessed` RewardChip variant consumed only by the CelebrationMoment — (1) the strip's fill
  derives DOWN from the live bg token, **`darken(scr.bg, 0.25)`** (a new `withAlpha`-sibling
  token-math helper in `src/theme/index.ts`; `scr.panel` is the one-step-LIGHTER plane, so the
  recessed read needs the inverse relationship — re-themes per DEV-04, never a literal), and
  (2) the PixelsMark + text block centre as a group (the meta block drops its `flex:1` stretch;
  row `justifyContent:'center'`). Panel/sheet RewardChip contexts keep the default fill. Jest:
  the W-A4c assertion (bg === darken(bg-token, .25), ≠ scr.panel, centered) in celebration.test.
- ✅ W-A5 (dba6029) **Styler premium cost hidden behind the item container** — root cause: in the
  CardRail (the 0068 one-strip-canvas rail) the badges rendered INSIDE the Pressable tiles, EARLIER
  siblings of the absolute strip canvas — RN paints later siblings on top and a child's zIndex can't
  escape its parent, so the card canvas painted over every PriceChip. Fix = the badges hoisted into
  the same above-strip overlay the selection pip got at 0068; structural no-renest test pins it.
- ✅ W-A6 (dba6029) **Top-3 with 2 seats spreads to screen edges** — space-between artifact; now the
  board's ALWAYS-3-seat frame (profile-states :797 `.ghost-set`): filled seats card, empty seats the
  dashed ghost (rank + "+" → the TOP view), packed flex-start + gap; left-packing test added.
- ✅ W-A7 (0d9438d) **Device sticker edit-mode never confirms** — the explicit SET/CONFIRM beat
  built (⚖ 0078 records this shape): placing/tapping a decal enters its transform state; it EXITS
  through (1) **tap-away commits** — the band layer's empty-tap deselect (already live) + the editor
  body now deselects on empty-space taps; (2) a visible **✓ SET key** on the transform chrome
  (StickerSteppers foot, cream secondary — the TransformDrawer close grammar); (3) **blur
  auto-commits** — a `focused` gate (useFocusEffect) flushes the pending PATCH, drops the selection,
  AND unpublishes the edit session (pre-fix the blurred-but-mounted editor kept the session live, so
  the shell bands wore edit chrome on every other screen — the "leave with stickers still editable").
  Commit = end the CHROME + flush; the data already saves continuously through the ONE pipeline. No
  confirm-sheet ceremony (stickers free + reversible); KEEP/acquire stays premium-only. 4 jest cases
  (place→chrome · tap-away · ✓ SET · blur-unpublish + idle refocus).
- ✅ W-A8 (7c5dd3e) 🔧 **Celebration didn't fire until an APP RESTART** (owner completed SHELF
  STARTER, nothing appeared) — the P11 ASSUMPTION-1 refetch-delta only re-read `/me/achievements` on
  focus/reconnect. Fix: the UNLOCK-TRIGGERING client mutations now invalidate the `MeAchievements`
  tag (declarative `invalidatesTags` — the CommunityCards cross-slice precedent; no onQueryStarted
  helper, no blanket chatter), so the CelebrationHost's delta check runs within ~a second of the
  action. Mapped sites: `addToCollection` (a3 + b8-recipient add) · `updateEntry` (a12) ·
  `publishCard` (a1/a2/b3) · `claimDailyBonus` (a10/b6) · `createGame` (a9) — api.ts ·
  `adoptCard` (a7/b4, adopter half) — communityApi · `acceptFriendRequest` + `createFriendRequest`
  (a5/a6 — mutual-pending auto-accept counts) — friendApi · `addQueueItem` friend_rec branch (b8
  recipient half) — queueApi. Host delta logic untouched. **RESIDUALS (recorded, accepted):**
  other-ACTOR unlocks (a13/a14 adoptions-received · a15 reach · b8's RECOMMENDER credit · the
  requester's a5/a6 on accept) still wait for focus/reconnect/read — only push (M7) closes those;
  and **b1 neat_freak is client-unreachable at M6** — no client mutation calls
  `PATCH /me/collection/reorder` (the TOP arrange writes `/me/lists`, a different event), so its
  `collection.reordered` counter never increments from the app (a server/seed question, not a
  client tag). Jest: `achievementsInvalidation.test.ts` (one representative per touched slice + a
  no-chatter negative).

## WAVE B — visual/layout rulings (client-only)
- ✅ W-B1 (2dece42) ⚖ **Header alignment audit** — the geometry defined ONCE (shared CONSTANTS in
  ScreenHead.tsx — `SCREEN_HEADER_PAD` lg/lg/md, the Collection/Profile reference; a structural
  primitive was declined: headers embed varied chrome, constants are the honest single source).
  Conformed (screen → what moved): **Friends tab + add-friends/friend-requests/friends-roster/
  invite-friends** (xl→lg inset −4px, +8px header bottom) · **invite/[token]** (xl→lg inset) ·
  **store** (+8px header bottom) · **Terms/Privacy via LegalScreen** (title floated at the xxl/24
  document inset → a fixed lg/lg/md header block; content gutter 24→12) · **achievements · compare ·
  contributor · game · user/[id] · user/[id]/{achievements,collection,entry}** (header bottom sm/4
  → md/8). Reference screens (collection/profile/discover) now consume the constant too. Jest pins
  values + consumption (screen-geometry.test.ts).
- ✅ W-B2 (2dece42) ⚖ **"Return to X" spacing audit** — both gaps = **md/8** app-wide: gap-1 = the
  header's paddingBottom; gap-2 = the seam row's paddingBottom (`RETURN_SEAM_PAD` lg/md; under-title
  S2-b seams — **Add-Game**, device, LegalScreen — fuse gap-1 as `HEADER_SEAM_GAP`=md, Add-Game was
  gap 2px + 12px bottom). Conformed: the social cluster's seams (xl/sm → lg/md) · store's returnRow
  (top-sm/no-bottom → the seam pad) · **settings + blocked + game/[id]**: the in-scroll links moved
  to the FIXED seam row above the scroll (the majority grammar — one seam structure app-wide; bodies
  lose their top pad so gap-2 stays 8). Judgement call recorded: this is the one structural move in
  an otherwise geometry-only sweep (an in-scroll link cannot hit the audited gap without it).
- ✅ W-B3 (f3be7b3) ⚖ **Buy-bar height** — the fix lands ONCE in `HoldFillButton` `base` (vertical
  pad md/8 → **lg/12 + horizontal xl/16, the ScreenButton keycap grammar**) and ripples to every buy
  surface by composition: BuyBar → ItemSheet · ReconcileSheet · KeepBar · AdoptCardSheet, plus the
  ConfirmSheet PAY (Top-Up packs). No per-surface forks; a one-place jest asserts the padding tokens.
- ✅ W-B4 (f3be7b3) ⚖ **Buy-page CANCELs removed** (the F-21 KeepBar precedent finished family-wide):
  (1) BuyBar's reduce-motion two-step confirm drops its CANCEL key (single block CONFIRM; the
  price/disabled self-reset was also FIXED — the old `if (disabled)` guard silently skipped the
  price-change case, so a stale armed CONFIRM could survive a re-pick); (2) ConfirmSheet's Cancel now
  renders only for the destructive/primary tones — the **purchase tone** (the store pack PAY + the
  AdoptCardSheet free-path confirm) carries none. **Escape paths verified per surface:** ItemSheet /
  ReconcileSheet / AdoptCardSheet / the purchase ConfirmSheets = the PulledSheet scrim · grab handle ·
  hardware back (jest-asserted via the Close scrim); KeepBar = re-pick reverts / editor blur clears
  (M5 F-21, unchanged); BuyBar's armed confirm additionally self-resets on any price/disabled change
  (jest-asserted). The destructive/primary ConfirmSheet tones KEEP the 0040 CANCEL — safe-default
  weight is core to that grammar and those aren't buy pages.
- ✅ W-B5 (f3be7b3) ⚖ **Theme buy pages: the "PREVIEWING" yellow chip removed** — the store theme
  sheet's repainted mock screen IS the preview; `PreviewStrip` retired entirely (usage + barrel
  export + the component; a jest guard asserts the kit no longer exports it). *Note: the component
  FILE's deletion physically rode the concurrent B12 commit `bba9774` — a shared-index sweep of this
  packet's staged `git rm`; content correct, attribution noted.* The device editor's separate
  `DevicePreviewStrip` (another agent's file) is untouched.
- ✅ W-B6 (477bfad) ⚖ **Collection: Now-Playing card renders in the Hero ONLY** — reading: the board
  DREW row NOW chrome in all three views (on-card ▶ NOW at :571/:766, list `.now-inline` :681); the ⚖
  supersedes those draws (0078 board ripple). Removed: FlipCard's nowPlaying pass-through (shelf/grid)
  + the list inline tag; the entry stays as a plain row; the hero keeps pin + LOG HOURS.
- ✅ W-B7 (477bfad) ⚖ **Shelf view: per-entry chevron** — the List-view `›` mirrored at the row's
  right edge (pressable → the Game page; the card face keeps its flip).
- ✅ W-B8 (477bfad) ⚖ **Add-Game create prompt = GOLD + pixel-stepped** — the TertiaryLink hook
  replaced by ScreenButton/add (the F-02 gold + steppedRectPath grammar, consumed not hand-drawn)
  under a quiet NONE OF THESE? lead.
- ✅ W-B9 (477bfad) ⚖ **Game page DESIGN NEW back to ORANGE** — CardSwitcher's tile/label/tint now
  scr.accent (+ withAlpha wash); reversal of 0069's "DESIGN NEW = gold" cited in-code; 0078 records.
- ✅ W-B10 ⚖ **Friend profile layout** — VIEW COLLECTION + COMPARE HOURS in one row · FRIEND tag
  repositioned (under the profile details) · mutual-friends count relocated · section order =
  the self-Profile's order. **(`a5f8794`** — r1: one paired flex row at the FOOT, the board's
  bottom-tools seat; r2+r3 ASSUMPTION: one identity-foot row — relationship seat LEFT · "14 FRIENDS
  · 3 MUTUAL" RIGHT, owner may veto; r4: STATS → ACHIEVEMENTS → TOP 3 → NOW PLAYING → THEIR DEVICE,
  mirroring profile.tsx at head, pinned-favourite n/a on the friend shape.)
- ✅ W-B11 (c9acce2) ⚖ **Settings** — Sign Out at the bottom · gear on a white/cream key (the 0069
  secondary voice) · legal screens opened FROM Settings keep the nav band ACTIVE (the locked state is
  pre-auth only). Built: sign-out = the TERMINAL row (its own Group after ABOUT & LEGAL; the S7b calm
  confirm unchanged) · the gear rides `ToolButton` (the icon-only cream utility keycap, navy glyph —
  consumed, not hand-styled) · **legal-nav mechanism:** `/legal` is auth-AMBIENT (pre-auth
  create-account links AND Settings → ABOUT & LEGAL), so ShellNav gates it on the LIVE auth token —
  `pathname.startsWith('/legal') && authed` joins the PROFILE cluster; signed-out falls through to
  `locked`, so the pre-auth lock cannot regress. Both directions jest-pinned (ShellNav.test).
- ✅ W-B12 (bba9774) ⚖ **Device editor: "EDITING YOUR DEVICE" / "SWITCHED" readouts removed.** Both
  gone: the default EDITING line + the D2 SWITCHED beat readout (which had outlived the M5 F-21 r6
  MiniDevice-pair removal). The readout row survives ONLY for the D5 on-shell preview + the live
  PLACING transform line, else the space collapses. Orphans swept with it: the whole `switchBeat`
  state machine (its lone consumer was the readout) + the `editReadoutSub`/`switchReadout` formatters
  + their tests.
- ✅ W-B13 (c9acce2) ⚖ **Profile: Settings gear on a white button** (folded into W-B11).
- ✅ W-B14 (c9acce2) ⚖ **Pinned Favourite gets Hero-card treatment** with additional game details
  (composed per the Collection hero grammar): the 138×193 hero-size EntryCard + the NowPlayingHero
  meta column. **ASSUMPTION (owner's eye):** the detail lines are the decision-0061 pair verbatim —
  stat-line `{hours} HRS · {STATUS}` + catalog line `DEVELOPER · YEAR · GENRE` — resolved from the
  caller's collection entry (the /me expansion carries only title+hours); an off-shelf pin degrades
  honestly to the /me hours line alone.

## WAVE C — behavior/server (DISPATCHED 2026-07-18, owner off-device)
> **Server batch** = the `wave-c-server` workflow (sequential domain agents catalog→social→ach/coll →
> adversarial review; no migrations). **Client batch** = C4 Profile-edit + C6 contributions-link on the
> disjoint client tree. Orchestrator does the final full-suite pass + the contract/spec/OQ + decision
> 0078 formalization + push after the workflow + client land.
> - **C7 rails answer (owner asked):** the Add-Game board draws THREE rails — POPULAR (most-collected,
>   the "recommended" feel) · NEW RELEASES (CAT-11, being built now) · FRIENDS ARE PLAYING (CAT-12).
>   No distinct "trending GAMES" 4th rail — popular fills "what's hot"; DISC-04 trending is for CARDS.
> - **C9 ruling:** the manual-arrange Collection UI → DEFER to M7 (sort modes cover the beta); the b1
>   NEAT FREAK egg gets re-pointed to a reachable organize-signal OR marked inactive (the ach/coll
>   agent picks the honest one) so it's not dead content.
> - **C10 (Add-Game community-cards) + the W-D1 game-page build** ride the NEXT build wave — they depend
>   on C5's game-detail aggregate (built now) + the owner's Wave-D nod (in).

## WAVE C items (contract/spec ripples via 0078)
- ✅ W-C1 (a49bf8c) ⚖ **Fuzzy people-search** — "Kyra" must find "KyraInGame": exact-match → prefix/substring
  (case-insensitive), same neutrality/rate posture. Contract row + server change + PersonRow states
  unchanged. (SOC-07 amendment → 0078.)
- ✅ W-C2 (a49bf8c) **OQ-147 code** — cancel-exempt revert (the morning ruling; spec edit rides 0078).
- ✅ W-C3 (edd9710 server + 47d7a36 client C3b) **OQ-148 widening** — friends' achievement pages mask secrets (server read + client).
- ✅ W-C4 (abff0c0 · manifest 8e6e77c) **Profile edit slice** — in-place per-field commit (OQ-034, no
  giant save): EDIT keycap → `EditableIdentity`. LIVE on the served seams: **username** (PROF-06
  cooldown off `usernameNextChangeAt` + MOD-07 screening 422 inline) · **bio** (140 counter) ·
  **genres** (`GET /genres`, toggle→`PATCH /me`) · **gamertags** (`POST`/`DELETE /me/gamertags`). New
  `profileApi.ts` (injectEndpoints; api.ts untouched) + `Toggle` (component-map §1.5) + `TextField`
  onBlur/editable/multiline. **DECISIONS (owner's eye):** D-1 per-field commit (board's OQ-034, not a
  save/cancel form) · D-2 **avatar = the PROF-08 monogram + a ✎ "designer coming" note** — the
  composition avatar editor + uploads are §10, EXPECTED · D-3 **privacy Toggle lives in SETTINGS**
  (both boards' IA — "privacy (Settings, PROF-03)"), `PATCH /me {privacy friends|public}`; labelled
  "Public profile" (ASSUMPTION — the board's "LIMITED PUBLIC PROFILE" reads backwards vs the enum).
- ✅ W-C5 (50fd467 server; ABOUT client rides W-D1) **Game-detail aggregate + ABOUT** — build `GET /catalog/games/:id` (the P2-flagged hole;
  folds friendsWhoOwn per the contract row) + fill the ABOUT tab (canonical facts · genres ·
  studio/publisher · contributor credit · CAT-09 counts).
- ✅ W-C6 (abff0c0) **Profile → MY CONTRIBUTIONS entry** — the self-door gateway on the Profile
  (`{cardsDesigned} CARDS DESIGNED` teaser) → `/contributor/{me.id}` (the P13 screen's missing front
  door; its only prior entry was a DESIGNED-BY tap).
- ✅ W-C7 (50fd467) **OQ-150 build** — /catalog/new-releases + the rails answer (owed from the morning).
- ✅ W-C8 (edd9710) **NARROWED by A1: `/me/collection` must emit the `designer {userId, username}` rider on
  custom cards** (contract 0.50 prescribes it; the switcher + friend serializers already emit it).
  The client is pre-widened and renders the name the moment it lands (honest COMMUNITY fallback
  meanwhile). Feed thumbs needed NO server half — every list payload already carries thumbUrl.

- ✅ W-C9 (arrange→M7; b1→list.reranked edd9710) **Collection MY-ORDER arrange was never client-built** (found via W-A8's b1 audit;
  orchestrator-verified — zero client calls to `PATCH /me/collection/reorder`): the COL-07 manual
  reorder exists server-side (contract 0.48/OQ-031) with no client gesture. Decide: build the
  arrange UI (the TOP-arrange DragRankList pattern now exists to reuse) or defer to M7 with a cite.
  MEANWHILE: **b1 NEAT FREAK's criterion is unreachable** — re-point its seed to a reachable signal
  (queue reorder / lists re-rank both emit) via the SYS-04 config, or hold it inactive until W-C9
  lands. 0078 decides.

## WAVE D — design-think BEFORE build (the owner asked for deeper thought)
- ✅ W-D1 (manifest c573dc0 · postures 934aa5f · add-step 9c8d542 · workflow review GO; 90/610 mobile · OWN posture provably intact) **The adaptive Game page consolidation** — ONE Game page across three postures: OWN entry
  (full PLAY/CARDS/ABOUT) · FRIEND's entry (their PLAY read-only + ABOUT + community CARDS +
  compare affordance — replacing/absorbing P9's separate `/user/[id]/entry/[gameId]` route) ·
  CATALOG/no-entry (ABOUT + community CARDS + add-to-collection — reachable from Add-Game search
  so a user can inspect BEFORE adding; the board's M7/M8 artboards intended exactly this).
  Fable drafts the posture/routing/data model → owner nod → build.

## Standing lesson for every wave builder (from today's fixes)
Consume the shipped component library — nearly every visual miss this walk was a builder REDRAWING
something that already existed (PixelsMark, SectionDock, sheet mounts, the plate gate). Manifest
briefs for M7 get this line verbatim.

## ROUND 3 — post-Wave-B notes + the Wave-D nod (2026-07-18, Opus orchestrator)

- ✅ W-A9 (a5e4faf + 4980659, full suite 85/576) **THE THEME-PREVIEW LEAK — FIXED.** Root cause
  (confirmed by the `theme-leak-hunt` workflow: 3 investigators → diagnose → fix → adversarial verify
  GO): `StoreThemePreviewProvider` is ROOT-mounted (app/_layout.tsx), and the app-wide preview
  override's ONLY teardown was the item-sheet's `openItem`-keyed `useEffect` cleanup — NO backstop
  when the store screen blurs/unmounts. A glitched close that strands the sheet open (or a
  blurred-but-still-mounted /store — expo-router keeps routes mounted) left the previewed theme (Berry)
  painting the WHOLE app while prefs + the server device stayed Midnight (the desync = the confirming
  signature; the preview NEVER writes prefs, so no persisted corruption). **Fix:** a screen-scoped
  `useFocusEffect(useCallback(() => () => setPreview({}), [setPreview]))` in `Store()` — unconditional
  teardown on BLUR/UNMOUNT, mirroring the device editor which ALREADY had this guard (the asymmetry WAS
  the bug — device.tsx needed no change). The legitimate live preview is fully preserved (paints on
  open, clears on clean close); the backstop is additive belt-and-braces. Regression test
  (`store-preview-teardown.test.tsx`) drives the real Store + a stranded Berry preview → RED without the
  backstop, GREEN with it. Client-only, hot-reloaded.
- ⬜ W-A9b **(residual, owner's call — optional hardening)** the "store screen UNUSABLE" half of the
  glitch: the workflow's best theory (medium confidence, not runtime-confirmed) is a PulledSheet
  stranded open (invisible-but-mounted absolute-fill scrim keeps eating touches while `openItem` never
  nulls). The W-A9 fix makes the LEAK impossible and the store RECOVERABLE (leave /store — the nav band
  lives at DeviceShell root, outside the scrim, so blur clears Berry + returns you clean). If the owner
  wants the drawer itself to never strand, that's a separate PulledSheet dismiss-hardening pass. Filed,
  not urgent (the leak — the actual damage — is closed).
- ✅ W-B1b (c8f4fe1, 86/578) **Header title position INDEPENDENT of the trailing button.** Root cause
  (orchestrator-diagnosed with numbers): ScreenHead's row was in-flow `alignItems:'center'`, so a
  trailing control TALLER than the 21px title grew the row and centred the title lower — the Friends
  `HeaderKey` (34px) dropped its title ~5px below Collection/Profile's counter-height (~24px) rows;
  the B1 shared pad only fixed the outer inset. **Fix:** the header row is pinned to one
  `HEADER_CONTENT_HEIGHT` (26) via the always-present title's `lineHeight` + `minHeight`, and the
  trailing cluster is taken OUT OF FLOW (absolute + top/bottom:0, centred), so NO control can grow the
  row or shift the title; `HeaderKey` conformed 34→26 to the band. Collection/Profile unchanged;
  Friends' title rises to match. Regression test (`screen-head-invariant.test.tsx`) asserts the band
  minHeight + the absolute cluster are invariant to a deliberately-tall trailing control (RED without
  the pin). *(Also restored TS types to the theme-leak store-preview test — tsc needs them even though
  jest-expo strips them; my earlier plain-JS rewrite was doubly unnecessary.)*

## WAVE D — OWNER NODDED (2026-07-18); the 4 answers + one reshape
- ✅ **W-D1 model APPROVED** ([`game-page-postures.md`](game-page-postures.md)) with: Q1 KEEP the inline
  compare fragment · Q2 YES friend-posture-wins + VIEW YOUR COPY · Q3 YES the Add-Game inspect
  chevron. **Q4 RESHAPED (important):** the CATALOG posture must NOT allow adopting a card for a game
  you don't own — adoption goes THROUGH the Add-Game path. So: (a) the CATALOG Game page shows an
  **ADD TO COLLECTION** path (a Game page for a game you don't have gets an add affordance), and
  (b) **the Add-Game FLOW gains a community-cards step** — see W-C10. The AdoptCardSheet
  add-to-collection bridge (draft Q4 recommend) is REPLACED by this: no adopt without an entry.
- ✅ W-C10 (9c8d542) ⚖ **Add-Game community-cards adopt step (OQ-136 REOPENED — un-deferred from onboarding-era).**
  The owner: "during the Add-Game flow there is supposed to be a step where the user is shown the
  Community Cards (or a subset) so they can adopt one during Add Game." OQ-136 was deferred to the
  onboarding era at decision 0076 §0.12 — the owner now rules it IN for the beta. Build: an Add-Game
  step that surfaces the game's community gallery (or a top subset) with adopt, wired to the existing
  CommunityGallery/AdoptCardSheet + the adopt-creates-with-the-new-entry flow. Server: the gallery
  read is live; the adopt-at-add path may need the new entry's id threaded. Contract/spec: OQ-136
  moves Open→Resolved-for-M6 (0078). Rides the W-D1 Game-page build (the CATALOG adopt path is the
  same seam). **This is now a build item, not a stretch.**

## WAVE D — game-page layout notes (2026-07-18); D-1..D-4 (all `5b26ae1`)
- ✅ **D-1** ⚖ **FRIEND PLAY reuses the OWN dual-face** — a friend's game PLAY now shows THE FACE + a
  stats BACK side-by-side, exactly like your OWN page. FriendGamePage's PLAY was rendering a lookalike;
  it now renders the SHARED `DualFaceHero` (their card FACE + their `StatsBack`), read-only. `DualFaceHero`
  + `StatsBack` gained friend-framing passthroughs (`faceLabel`/`statsTitle`/`statsLabel`/`faceA11yLabel`),
  all defaulting to the OWN values → OwnGamePage byte-identical (NOT a fork — reuse). SOC-11 gating holds
  by construction: `StatsBack` carries no notes/rating (the old inline "NOTES · RATING 🔒 PRIVATE" block
  retired; the privacy note under the hero states it). `percent=null` (friend omits percentComplete, 0026);
  the face-tap opens the adopt sheet when their card is adopt-able.
- ✅ **D-2** ⚖ **Add-Game search CLOSED on entry** — the docked `SearchField` dropped `autoFocus`; entering
  Add-Game shows the rail trio first and the keyboard opens only when the user taps the field.
- ✅ **D-3** ⚖ **CATALOG ABOUT order** — `AboutTab` gained a `beforeFriends` slot; the NOT-IN-YOUR-COLLECTION
  band (+ ADD CTA) moved off the top of the tab into it, so the order reads **info → not-in-collection →
  friends-who-own**.
- ✅ **D-4** ⚖ **Stepped-corner ADD TO COLLECTION** — the CATALOG ADD button carries the pixel-stepped
  silhouette (ScreenButton `stepped`), kept ORANGE `/primary` (0069 — non-acquisitive, NOT gold). The
  FRIEND ADD is stepped when it's the primary add; when an adopt-able card demotes it to the cream
  secondary the step drops (the step is the orange-primary silhouette, never a cream one).

## ROUND 4 — Wave C review notes (2026-07-18, owner tested cross-device iPhone↔Android)
- ✅ N1 (P2 server, dc05436) **Contributor REACHED is inflated** — "29 reached" with <29 users: summing
  per-game collection counts double-counts multi-game owners → fixed to COUNT(DISTINCT user) across the
  contributor's games via a distinct-owner subquery (`collectionRepo.distinctUsersReachedByGames`, the
  SYS-01-COMMUNITY-AGGREGATE class; per-game `collectionsCount` tiles kept as-is). **CAT-10 reading:
  NOT self-excluded** — CAT-07/CAT-09a say "how many USERS' collections contain the game" (no "others"
  wording) and the per-game tiles already include the contributor's own ownership, so REACHED counts a
  self-owning contributor too (internal consistency). Slice-tested (3 owners of 2 games → 3 not 6;
  self-inclusion → 4). Server. **N1b (5a3d878): REACHED excludes SELF** (owner ruling — distinct OTHERS reached).
- ✅ N2b (P10, 94ef76b) **Add-Game rail trio wired live** — only POPULAR was live; NEW RELEASES missing +
  FRIENDS-ARE-PLAYING a "soon" placeholder (endpoints 404 at build). C7/P7 built both — wired NEW RELEASES
  (CAT-11) + FRIENDS-ACTIVE (CAT-12) via a new `catalogRailsApi` injectEndpoints slice (both return the
  `/catalog/popular` shape — `CatalogListResponse`, curl-confirmed HTTP 200; friends-active ranked by
  friendsHaveCount). Extracted `RailFan` (capped 12, own focus + shared addItem); FRIENDS shows the quiet
  rail-empty (not a placeholder) when the caller has none; all rails hidden while querying. **Answer to
  the owner: the RAILS (game rows) ship here now; the community-CARDS adopt step is a SEPARATE feature =
  OQ-136/W-C10 = Wave D.** typecheck/lint/jest 87 suites·594 green.
- ✅ N3 (P12, 66cd26a) **Add Gamertag button → orange** — `EditableIdentity` ADD GAMERTAG key is now
  `variant='primary'` (the on-screen accent/orange, 0069 prominent add), not the cream secondary.
- ✅ N4 (P12, 66cd26a) **Settings gear glyph reads too light-mode** — the header `SettingsGear` is now a
  BOLD FILLED cog (solid navy body r=7.2 + 8 protruding teeth as 4 full-length rects rotated 45° + a
  punched cream centre r=3), matching the app's filled-glyph language (nav keycaps are solid navy
  fills); was a thin 1.8-stroke outline. Cream keycap unchanged (W-B13 ruling).
- ✅ N5 (P8, e4ab962) **Cross-device friend state doesn't propagate + a "half-aware" split** (request
  invisible until app reset; after accept, feed shows the friend but the Friends LIST + Requests don't).
  Fix: the three social reads (GET /me/friends · /me/friends/requests · /me/feed) now carry
  `refetchOnFocus` + `refetchOnMountOrArgChange` AND share ONE `Social` invalidation family — a refetch
  or any friend mutation (request/accept/decline/cancel/unfriend/block) re-reads list + requests + feed
  TOGETHER (coherence). The tab feed's page-1 became a focus-refetching subscription (lazy only for
  load-more; the walk-3 dedupe/reset discipline preserved); block (communityApi, off the family)
  dispatches a `Social` invalidate for the same coherence. Jest: `socialCoherence.test.ts` — accept
  re-fetches all three reads via the shared tag (real-store + stubbed fetch). **RESIDUAL: true real-time
  (zero-interaction) = M7 PUSH** (accepted).
- ✅ N6 (P12, 66cd26a) **Profile privacy toggle clarity** — replaced the ambiguous ON/OFF "Public
  profile" toggle with a **labeled two-option `SectionSwitch`** (FRIENDS ONLY | PUBLIC — both states
  named, the selected one lit F-09) under the header "WHO CAN SEE YOUR PROFILE", plus an explicit
  current-state sub-line ("FRIENDS ONLY — ONLY FRIENDS SEE YOUR PROFILE" / "PUBLIC — ANYONE CAN SEE
  YOUR LIMITED PROFILE"). Patches `/me {privacy}`. **CONTROL/COPY CHOICE flagged for the owner:** a
  segmented switch (not a toggle) — zero ON/OFF ambiguity; the introduced `Toggle` component is now
  catalog-only (the M7 notifications page is its consumer, per the settings board).
- ✅ N7 (P8, e4ab962) **Can't open a non-friend's profile** — the search PersonRow's avatar+name now
  route to `/user/[id]` for ANY relationship (not just friends); the relationship action button is
  unchanged. `/user/[id]` (P9) already renders the non-friend LIMITED shape + ADD FRIEND (RelationshipAction)
  — verified handled, NO P9 edit needed. Jest: a `none`-relationship row tap routes to the profile.
