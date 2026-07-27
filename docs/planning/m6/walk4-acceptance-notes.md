# M6 owner walk-4 — the acceptance-suite results + feedback triage (2026-07-26)

> The owner ran the full acceptance suite (`acceptance-suite-w4-to-now.md`) over ~2 hours on the
> iPhone dev build + web. Outcome: broad acceptance (SIWA/email/wiki-gate all closed during
> provisioning), ~30 findings triaged below into 7 packets, ALL W3 owner-options RULED (see §Rulings).
> This doc is the authoritative work ledger for the wave; the packet ids (P1-P7) are the handoff
> vocabulary. Triaged by the outgoing orchestrator session; executed by the incoming one.

## ⚠ THE BIG NOTE — progressive UI degradation (P6, investigate before beta)

Owner: after ~30 min of continuous use the app gets sluggish — lower framerate, stuttering, "overall
slower UI feel" vs the ≥60fps it starts at (iPhone 17, dev build). **A reload restores full speed.**
Reload-fixes-it + progressive onset = an accumulation class: RTK cache growth (the full-shelf
refetch-per-mutation cliff compounds this), mounted-but-never-freed skia canvases, listeners/timers,
navigation state retained by expo-router's kept-mounted screens. Could be partly dev-runtime overhead,
but dev mode alone doesn't explain *progressive* decay. → P6 investigation; ties into the planned
scaling-suite runs (`load-harness-notes.md` — the 4 known cliffs are prime suspects/amplifiers).

## The packets

### P1 — BUGS (highest priority, all reproduced by the owner)
| id | Bug | Notes / pointers |
|---|---|---|
| P1-a | **Ultimate font renders the WRONG FONT FAMILY on the server flatten** — owner applied SCRIPT ULTIMATE (`pacifico-ultimate`), recoloured the ink, shared: the shared/published image has the right ink colour but a fallback font face. | The W-5 client added the `pacifico-ultimate` alias to the three MOBILE font maps; the API-side flatten's font/typeface registration almost certainly lacks the alias → every server-rendered card wearing the ultimate font is wrong. Fix the api render font map; check whether any already-published cards need a reflatten (`apps/api/scripts/reflatten.ts` — now backstop-correct). Check the OTHER two ultimate SKUs' server render paths while in there. |
| P1-b | **MARQUEE ULTIMATE does not take the picker colour** — recolouring works in the picker but the rendered marquee frame doesn't change. Owner: "swap it or fix it." | The W-5 draft claimed "frame = zero render change" (frames consume `frame.color`) — evidently the *marquee kind's* draw path has hardcoded treatment (check `buildCard.ts` marquee branch on BOTH api+mobile). Fix the render to consume `frame.color` for the marquee kind (legacy base-marquee must stay pixel-identical — the registry colour IS the legacy colour, same trick as the brass ramp), or if genuinely unfixable, propose the SKU swap to the owner. |
| P1-c | **Friend's profile identity is missing on their ACHIEVEMENTS page** — but is present on their Contributions page. | The cross-user achievements route lacks the identity header the contributor route carries. Conform it. |

> **→ P1 BUILT + LANDED 2026-07-26 (`dbb45ca`) — Murr closed · fresh-eyes review closed · Parvati pending.**
> P1-a root cause was broader than the walk found (ALL 7 non-default fonts fell back on server renders;
> registry now mirrors mobile; dev-DB reflatten 45/45, backup first). P1-b got the clean fix — the
> owner's fix-vs-swap decision was never needed (registry gold → legacy track pixel-identically).
> P1-c closed THREE sites: friend achievements + self achievements (Murr) + the FRIENDS-tab
> RequestsBanner (takeover review). Review also surfaced: invite-sender / blocked-list / friends-who-own
> response shapes never carried `avatarConfig` (server-side W-4 gap) → Batch-2 lane. Gate record:
> [`review-coverage.md`](review-coverage.md) §Walk-4 Batch 1.

### P2 — the Add-Game flow rework (owner: "put some serious thought into making this user friendly")
Design-think FIRST (short proposal → owner nod → build). The pieces:
- **P2-a (the core)**: adopting a card during the Add-Game fork should END the flow — equip the adopted
  card on the just-created entry (client calls the COL-06 equip after adopt succeeds; note `adoptCard`
  itself is deliberately entry-independent) and land the user in their COLLECTION with the new
  entry/card visible. Today: adopt → back to the fork still asking "adopt or design" with a
  "Keep the default" exit (the W3-J lying label, owner confirmed fix). The whole EXIT TOPOLOGY of
  add-game (fork doors · SEE-ALL adopt · DESIGN YOUR OWN · keep-default · back-nav) needs one coherent
  model where every exit lands somewhere sensible and no path re-asks an answered question.
  Also fold in W3-I (full-list adopt page-reset: "fix whatever isn't totally coherent").
- **P2-b**: the CREATE form must NOT let the user change the game **Name** after proceeding from a
  no-match search (they verified THAT name didn't exist; an edited name defeats the dedup premise).
  Lock/read-only the name field, prefilled from the search query.
- **P2-c**: **Genre(s) must not be required** to create a game (currently blocks proceed).
  Check CAT-02's spec posture; ripple if needed.
- **P2-d**: Create-button prominence: no-match search → gold Create (as today); search WITH valid
  matches → the Create affordance de-emphasizes to a link-type button.

> **→ PROPOSAL DELIVERED 2026-07-26:** [`p2-addgame-proposal.md`](p2-addgame-proposal.md) — one
> invariant (three questions asked exactly once: WHICH GAME · WHAT STATUS · WHAT FACE; every
> face-answer ends in the Collection wearing it); adopt chains the COL-06 equip client-side; the fork
> only renders over a default-faced entry (W3-J unreachable); W3-I fixed via a `resetKey` tail-keep;
> found 3 extra incoherences (strip-adopt never equips · design-KEEP strands on the game page ·
> "NONE OF THESE?" at zero matches). No server change; ~260 lines / 7 files. 4 open choices → owner.

> **→ P2 BUILT + LANDED with Batch 3 (2026-07-26) — see review-coverage §Walk-4 Batch 3.** The full
> nodded topology: fork/SEE-ALL adopt chains the COL-06 equip (best-effort, never a wall) · every
> face-answer ends in the Collection via `router.dismissTo` carrying the one-shot `justAdded`
> (scroll-to + 1.5s pulse, OC-3) · styler door carries `from=add&entryId=` and KEEP/publish end on the
> shelf with an honest "back to your shelf" exit · name-lock (locked-but-live row, tap→search, OC-2) ·
> genres optional (schema+client+spec, CAT-02) · P2-d create prominence on the shared noMatches
> predicate (walk-#18 anchor discipline held). Docs rippled by the lane: product-spec 0.68 ·
> api-contract 0.83 · design-spec 0.61 · SCREEN-STATUS · 00-INDEX. EXTRAS: cards.tsx's fake block
> wired REAL (block+report mirror the game page); the fork sheet's ⋯ made honestly ABSENT (no
> confirm-drawer host mid-flow); ALREADY_ADOPTED now ANSWERS the face question (Murr — the grant
> exists, so the equip chains and the flow ends wearing it). OWNER-EYE: `dismissTo` is
> statically-verified against expo-router 6.0.24 internals but not device-witnessed — worth one
> 30-second walk check (three call sites) · publish-from-add-flow ALSO equips (builder judgment beyond
> the proposal's letter; OC-4's invariant implies it — bless or revert) · P2-d's mid-fetch gold flash
> per keystroke from a settled-with-matches state (proposal-conformant; taste call) · no block/report
> on the fork's top-6 strip (SEE ALL/game page carry them) · `add-game-states.html` now stale as an
> implements-from (recorded in SCREEN-STATUS). DEBT: the true cold-cache styler walk is
> param-covered but not test-proven (the harness's shelf mock is warm — honest rename applied).

### P3 — Profile / Monogram Forge (3.1)
- **P3-a**: the avatar renders TWICE with the forge open (identity avatar + forge preview) — rework so
  one avatar is the live preview (e.g. the identity avatar IS the preview; drop the inner head).
- **P3-b**: only ONE colour picker expanded at a time (bg + ink can both be open now).
- **P3-c**: the USERNAME field needs a **deliberate save** (explicit confirm), not the silent per-field
  autosave — an accidental edit "bites in the ass" (server rename cooldown compounds an accident).
  Other fields keep autosave.
- **P3-d**: the **Pixel counter must be one size across ALL pages**, matching the Collection screen's.
  (Cross-page CurrencyCounter conformance; mind the walk-3 equal-height-band fix on Collection.)

> **→ P3 BUILT + LANDED with Batch 2 (2026-07-26) — see review-coverage §Walk-4 Batch 2.** All four
> items: one-avatar live preview (identity avatar IS the preview) · single-open pickers (additive
> `open`/`onOpenChange` on the shared ColorField, default byte-identical) · deliberate username save
> (autosave removed for username ONLY; SAVE/CANCEL row w/ pending·error·saved states) · counter size
> normalized centrally (`minHeight` = the ScreenHead band; the walk-3 equal-height fix preserved).
> Murr fix-round added the NO-CHANGE guard (switching pickers without picking no longer PATCHes an
> unchosen config). OWNER-EYE: SAVE/CANCEL are full-size keys (`size="mini"` is a one-word quiet-down) ·
> the forge LETTERS field still autosaves (the ruling named the username only) · a photo-avatar user's
> image hides while the forge is open (deliberate — the monogram being edited must show; inert until
> the §10 designer ships) · the no-change guard makes "freeze the default look as an explicit config"
> unreachable (consistent with "any change becomes a real config" — bless consciously).

### P4 — Game page (5.1 / 5.5)
- **P4-a**: "Friends who own it" needs more vertical space from the stats block above it.
- **P4-b** (**supersedes the earlier W3-A "bless the split"** — the owner re-ruled): the **⋯ overflow
  exists on ALL postures**: CATALOG gains an overflow carrying **Report** (owner: report SHOULD be
  available from catalog view) + **Edit catalog details**; FRIEND's existing report-only overflow gains
  the Edit entry; OWN keeps its current overflow. The inline W-6 EDIT keys retire everywhere. Check
  MOD-01's spec posture on catalog-view reporting; ripple if needed.
- **P4-c**: the community-card preview drawer: (1) the card renders BIGGER, (2) drawer gets a header
  title **"Card Preview"**, (3) the card's equipped **cosmetics are listed** (the CARD-22 server labels
  already ride the payload — render the EquipReadout in the drawer) so adopters know what they're buying.
- **P4-d**: the SHARE button on the card preview "is still garbage" — conform it to the Publish-flow
  share treatment (find the publish share UI and reuse), and **replace emojis with glyph icons**.

> **→ P4 BUILT + LANDED with Batch 2 (2026-07-26) — see review-coverage §Walk-4 Batch 2.** All four
> items: fwo spacing · the ⋯ overflow on ALL postures (CATALOG gains Report + Edit w/ full MOD-01
> wiring; FRIEND's gains Edit; inline W-6 EDIT keys retired — FactsEditBlock always-controlled) ·
> the drawer reworked (hero card 224×313 · CARD PREVIEW header · EquipReadout of the CARD-22 labels) ·
> SHARE conformed to the PrintRitual treatment (shared ShareGlyph — no emoji arrows) + the dead share
> handlers on the cards list AND the add-game fork wired real (Murr major → the shared `useShareCard`
> hook, four callers). **MOD-01 verdict: NO spec ripple owed** (the spec never posture-qualified
> reporting; design-spec §4.2 already draws the overflow unqualified — the build came INTO conformance).
> Murr fix-round also hid the ADD band during catalog-edit (ADD flips posture and would silently
> discard a typed edit). OWNER-EYE: the drawer sheet's maxFraction 0.75→0.85 (drop the card to `grid`
> size if it reads too tall) · the A1 14-day gate now discloses PAST the overflow door, not before it.

### P5 — Small polish (one lane, mechanical)
| id | Item |
|---|---|
| P5-a | Flip-hint (2.2): no floating elements in this design language — dock the hint as a strip mounted directly ABOVE the filter/add bar (keep it layout-stable). |
| P5-b | Device editor (4.1): remove the now-redundant **On-shell Preview** button. |
| P5-c | Styler fan (5.6): **DEFAULT (the quiet slate) moves to FIRST** in the start-from line (currently last). |
| P5-d | Store front (6.2): remove the "The free baseline isn't sold here…" text from the front page (it repeats in every aisle). |
| P5-e | Friend profile (7.1): drop the "{NAME}'S" prefix on the CONTRIBUTIONS teaser — we're already on their profile. |
| P5-f | Friend profile (7.1): resolve the section inconsistency — ACHIEVEMENTS has "View all", COLLECTIONS doesn't; make the two sections consistent (add the collections View-all unless a real reason emerges — then explain to the owner). |
| P5-g | Walk finding #25: the forgot-password resend-row spacing (the "Didn't get it?" label vs the Resend link — the TertiaryLink padding fights the text baseline). |
| P5-h | Walk finding #26: password-validation messages must name the rule — length miss → "Password must be at least 8 characters."; HIBP hit → breach-specific copy. |
| P5-i | Walk finding #27: sign-in "Authentication failed" → neutral-but-human copy ("That email and password don't match. Check both, or reset your password.") — MUST stay enumeration-neutral (AUTH-11): never distinguish wrong-password from no-account. |
| P5-j | Auth test hygiene: bump the forgot-password/choose-username jest suite timeouts (the parallel-contention flake class). |

> **→ P5 BUILT + LANDED with Batch 2 (2026-07-26): 9 of 10 — see review-coverage §Walk-4 Batch 2.**
> a·b·c·d·e·g·h·i·j done (b retired the whole unreachable on-shell-preview feature, not just the
> button; h ALSO mirrored onto sign-in CREATE-mode via the shape lane; i keys off the error CODE,
> AUTH-11-neutral by construction). **P5-f = OWNER-CALL, not built:** there IS no COLLECTIONS section
> on the friend profile — collection access is the FOOT door-row primary, a deliberate W-B10 ruling;
> inventing a mid-body teaser would be new unspecified UI contradicting it. Decide: new teaser section,
> or bless the asymmetry (the conservative path taken). ALSO LANDED with Batch 2 — the takeover
> review's avatarConfig shape completion: invite-resolve sender · blocked-list rows · friends-who-own
> rows now carry `avatarConfig` end-to-end (api-contract 0.82). OWNER-EYE (from Murr): the P5-i copy
> "That email and password don't match" also fronts SIWA-only/unverified accounts (one neutral code
> covers all — imprecise, never leaky). DEBT recorded: the report outcome-mapper is copy-pasted in
> three game-page hosts (extract `mapReportOutcome` when next touched) · AboutTab still ignores
> `gameDetail.friendsWhoOwn` for the focused read (W-D1 consolidation candidate) · the choose-username
> standalone run leaks a pre-existing debounce timer (repo-wide leaked-timer class) · CAT-13/14 have
> no design-spec/component-map formalization (standing debt). The cards-list fake `onBlock` (closes
> the sheet, blocks nothing) folds into the P2 build's scope — it owns that file next.

### P6 — the performance investigation (the Big Note)
Profile the degradation: reproduce on the dev build (or web longevity session), capture where the time
goes as usage accumulates (RTK cache entry counts over time, mounted skia canvas counts, listener/timer
census, expo-router retained screens, JS heap growth). Deliver a findings doc ranking causes with
receipts, then fix the top offenders. Fold into/alongside the scaling-suite runs
(`load-harness-notes.md` cliffs are prime suspects — esp. full-shelf refetch-per-mutation churn).
Also answer the owner's question honestly: how much of this is dev-runtime vs real.

> **→ INVESTIGATION DELIVERED 2026-07-26:** [`perf-investigation.md`](perf-investigation.md) — 7 ranked
> causes; verdict **mostly dev**: the RTK dev-only immutable/serializable middleware deep-scans the whole
> store per action, and its measured tax grows 1.7 → 230 ms/action as the cache accrues (0.00 ms in prod
> posture) — that curve × the refetch-per-mutation action bursts matches "progressive + reload-fixes-it"
> exactly. Real cliffs underneath (refetch fan-out · unvirtualized shelf canvases · unfocused infinite
> motion loops · max-age=0 thumbs) are sub-threshold at N=18 but real at N≥200. Decisive test = a
> release-build 30-min soak. Fix cut → owner. Cleared: timers/listeners, redux-persist, polling.

> **→ P6 FIX CUT BUILT + LANDED with Batch 3 (2026-07-26): R1+R2+R4+R7-server — see review-coverage
> §Walk-4 Batch 3.** R1: the dev middleware SCOPED via ignoredPaths on the api slice (receipt: 139.77
> → 0.04 ms/action at N=2000; auth/prefs still guarded; prod unchanged by construction). R2:
> updateEntry/setNowPlaying optimistic with undo+HEAL-refetch on error; removeEntry applied-on-success
> (deliberate — the game page awaits then backs; owner may flip it in three lines); updateCard's
> Collection invalidation narrowed to an equipped-rider patch; four full-shelf refetches eliminated
> (the styler autosave no longer fires a shelf GET per editing pause). ⚠ THE EQUIP CASE keeps the full
> invalidation (Murr major — the P2 equip chain raced the adopt's own refetch; the post-fulfilment
> refetch serializes it). R4: motion loops focus-gated HOST-SIDE (Murr major — a gate inside the skia
> Canvas reads no React context: skia runs its own reconciler root; the original build was a silent
> no-op) — blur unmounts the layer, unmount cancels the loop. R7 SERVER half: /media far-future
> Cache-Control + the stored render URLs now VERSION (`?v=<compositionHash>` at publish; reflatten
> re-stamps + updates rows) closing the unpublish→edit→republish same-key hole (Murr major); ETag kept,
> `immutable` omitted. **R7 CLIENT half (expo-image) DEFERRED — ORCHESTRATOR RULING:** not in the
> owner's dev-client build; a native import would crash the walking phone; piggybacks the P2b EAS
> rebuild. R3+R5 remain deferred to the pre-beta wave per the owner's cut. OWNER-EYE: `@react-navigation/
> native` is consumed (hoisted) but undeclared in apps/mobile/package.json — declared in the wave's
> rule-08 chore · the release-build soak (the decisive dev-vs-real experiment) still rides R3/R5's wave.
> DEBT: a scroll-mechanism test for the justAdded landing (the pulse half is covered; the map/rAF
> scroll math is not) · an invalid-response test pinning the two new transformResponse parse seams.

### P7 — the ADMIN CONSOLE (design proposal → owner sitting; no blind build)
Owner (from 6.1): Spotlight curation belongs in an **admin console hosted OUTSIDE the app** — "hosting
all the functionalities I'll need to configure server settings and monitor other statistics from the
live app (including beta)", wanted **before beta launch**. Produce a PROPOSAL (not a build): scope
(spotlight curation · server-tunable settings (SYS-04 values, rate buckets?) · live stats/monitoring
(signups, DAU, adopts, publishes, errors) · relationship to the M7 moderation console (one console,
two phases? the mod queue joins later) · auth model (the PROF-09 role model exists — admin role +
MOD-10 audit logging for privileged writes) · hosting shape (a separate web surface beside the API?) ·
what's genuinely needed pre-beta vs deferrable). Owner sits on the proposal before any build.

> **→ PROPOSAL DELIVERED 2026-07-26:** [`p7-admin-console-proposal.md`](p7-admin-console-proposal.md)
> — one console two phases (P7 ops now, M7 verbs later; the §10 operator tool stays distinct), external
> Vite SPA on Cloudflare Pages against a new `/admin/*` router, pre-beta v1 = auth spine + Spotlight
> curation (config→`server_settings`) + read-only stats + read-only reports/feedback + Sentry link-out.
> 6 owner questions inside (headline: the MOD-04 in-app-vs-external home needs a spec ruling). OWNER SITTING.

## Rulings recorded this walk (close the W3 batch)
- **W3-A** → **RE-RULED, unify**: overflow on ALL postures + Report from catalog (= P4-b).
- **W3-B** per-relog hint: **blessed** (no action). · **W3-D** device readout: **keep** (no action).
- **W3-C** Spotlight policy → the **admin console** workstream (= P7).
- **W3-E** cardsPublished strictness: **blessed as-is**. · **W3-F** structural fan: **accepted**.
- **W3-G** silent cursor grammar: **blessed** (explained; internal-only). · **W3-H** offset paging: **accepted for beta** ("as long as it's stable").
- **W3-I** full-list adopt reset: **fix incoherence** (= P2-a scope). · **W3-J** fork's lying exit: **FIX** (= P2-a).
- **Parked-1** draft-share posture: accepted for beta (the investigation found the REAL bug P1-a).
- **Parked-2** HueStrip literals: **blessed**. · **Parked-3** aisle co-listing: **dropped** (didn't bother the owner).
- **Copy-1** AVG RATING wording: **accepted**. · Older parked polish (H/HRS · ▶NOW): **accepted as-is**.

## Standing environment notes for the executing session
- `apps/api/.env.dev` runs `APPLE_VERIFIER=apple` (post-SIWA-E2E) — agent mock-token sign-ins 401
  until flipped back to `stub`; email sign-ins unaffected. Flip it if a dev flow needs mock SIWA.
- `apps/mobile/app/sign-in.tsx` carries a TEMP `__DEV__`-gated demo-credential prefill —
  **deliberately UNCOMMITTED**; preserve it during the wave (never commit it) and revert it when the
  owner says the walking phase is over.
- The demo password is back to the documented `InGameDemo1!`. The product domain is **ingamehq.com**
  (`ingame.app` was squatter-priced; placeholders repointed in 284992f, spec 0.67).
- The rich walk-seed stands (31 Stardew cards · Hades raters · walkseed_avatar's pin) — do not delete
  any of it; the seed scripts are idempotent.
