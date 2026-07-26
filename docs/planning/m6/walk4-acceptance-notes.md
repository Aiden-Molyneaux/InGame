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

### P3 — Profile / Monogram Forge (3.1)
- **P3-a**: the avatar renders TWICE with the forge open (identity avatar + forge preview) — rework so
  one avatar is the live preview (e.g. the identity avatar IS the preview; drop the inner head).
- **P3-b**: only ONE colour picker expanded at a time (bg + ink can both be open now).
- **P3-c**: the USERNAME field needs a **deliberate save** (explicit confirm), not the silent per-field
  autosave — an accidental edit "bites in the ass" (server rename cooldown compounds an accident).
  Other fields keep autosave.
- **P3-d**: the **Pixel counter must be one size across ALL pages**, matching the Collection screen's.
  (Cross-page CurrencyCounter conformance; mind the walk-3 equal-height-band fix on Collection.)

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

### P6 — the performance investigation (the Big Note)
Profile the degradation: reproduce on the dev build (or web longevity session), capture where the time
goes as usage accumulates (RTK cache entry counts over time, mounted skia canvas counts, listener/timer
census, expo-router retained screens, JS heap growth). Deliver a findings doc ranking causes with
receipts, then fix the top offenders. Fold into/alongside the scaling-suite runs
(`load-harness-notes.md` cliffs are prime suspects — esp. full-shelf refetch-per-mutation churn).
Also answer the owner's question honestly: how much of this is dev-runtime vs real.

### P7 — the ADMIN CONSOLE (design proposal → owner sitting; no blind build)
Owner (from 6.1): Spotlight curation belongs in an **admin console hosted OUTSIDE the app** — "hosting
all the functionalities I'll need to configure server settings and monitor other statistics from the
live app (including beta)", wanted **before beta launch**. Produce a PROPOSAL (not a build): scope
(spotlight curation · server-tunable settings (SYS-04 values, rate buckets?) · live stats/monitoring
(signups, DAU, adopts, publishes, errors) · relationship to the M7 moderation console (one console,
two phases? the mod queue joins later) · auth model (the PROF-09 role model exists — admin role +
MOD-10 audit logging for privileged writes) · hosting shape (a separate web surface beside the API?) ·
what's genuinely needed pre-beta vs deferrable). Owner sits on the proposal before any build.

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
