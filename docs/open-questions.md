# Open Questions (the inbox)

> The **only** file anyone may freely append to (including Claude Design). Drop a one-liner the
> moment a question or "actually we need this" occurs — don't break your flow. The spec owner
> triages these in batches and, when resolved, moves each into `decisions/` and updates the spec.
> See the change protocol in [`00-INDEX.md`](00-INDEX.md) §4.

## Format
`OQ-NNN: <question> (where it came up) [behavior | presentation | undecided]`

- **behavior** → will become a spec/api-contract change with an ID
- **presentation** → likely design-spec only, no upstream change
- **undecided** → triage will classify it

---

## Open

- OQ-002: First-pass values for the economy levers — starting balance is 5 (ECON-02), but what are
  the login-bonus amount/cadence and milestone thresholds? (tunable later, but design needs a
  starting number) [behavior]
- OQ-009: **Vector-asset library scope** — how many/which starter SVG packs (shapes/letters/numbers/
  icons) ship at launch, free vs premium split. (CARD-02/17) [content]
- OQ-010: **Effect & finish roster** — the launch set of animated effects and finishes, free vs
  premium split. (CARD-12) [content]
- OQ-011: **Store pricing** — currency-pack tiers/prices (IAP) and currency costs of premium
  cosmetics. (ECON-01/02/06) [tuning] — pairs with OQ-002.
- OQ-004: Specific achievement & easter-egg **content** — which milestones, which eggs, their
  triggers and rewards. Dedicated brainstorm when the engine is built (ACH-*). [behavior/content]
  **Steering (decision 0015):** creation milestones — first card created / first publish / adoption
  milestones, with cosmetic rewards — must be on that brainstorm's list (closes the create→earn loop).
- OQ-005: Hidden easter-egg presentation — fully invisible until unlocked, or shown as a locked
  "???" mystery slot that hints something exists? (ACH-03) [presentation]
- OQ-056: **Modular card saving — explicit named saves + reusable style presets + the customizations
  gallery.** Owner ruling (2026-06-13, brainstormed; chose "parts + presets" over full
  style×canvas decomposition and over anxiety-fix-only). The **card stays the atomic
  save/equip/publish/adopt unit** (CARD-01/15 unchanged); the editor gains:
  **(a) explicit named save-targets** — the Styler + Canvas header shows *which* design is being
  edited and its save state ("editing «Destiny — Aurora» · saved 12s ago"), with a manual **SAVE**
  and **SAVE AS NEW** (the latter promotes CARD-14's duplicate/save-as-copy so a user never silently
  overwrites prior work); autosave + crash-recovery continue **across the Styler↔Canvas posture
  switch** (it's one draft document, so styling is never lost crossing into the Canvas — the anxiety
  this resolves).
  **(b) reusable STYLE PRESETS** — "save my current closed attributes (frame · effect · finish ·
  nameplate · title-styling) as a named, **game-agnostic** preset" that slots into the existing
  start-from rail (CARD-16) beside the store's preset kits (COSM-02); "choose a style combo" = apply
  a preset. *(Art/canvas reuse = SAVE AS NEW + restyle; a separate global art library was considered
  and **deferred** as heavier — revisit if demand appears.)*
  **(c) the customizations view** — per-game "my cards for this game" = the **Game-page (4.2) card
  switcher** (COL-06: my cards + adopted/downloaded + design-new → Styler), a GameCard gallery; the
  **global** library = the **My Designs shelf** (`/me/cards`: drafts · private · published + saved
  presets) reached from Profile. Adopted/downloaded cards land in the per-game switcher (COL-06,
  already specced).
  Needs (spec-owner): product-spec CARD-* — the **StylePreset** entity + save-as-new / named-target
  wording; api-contract — **style-preset CRUD** (`/me/style-presets`) and a page-audit confirm that
  `/me/cards` (shelf) + `GET /me/collection/:entryId/cards` (switcher) cover the gallery. **Drives
  the #3 Game-page card-gallery drafts** (3 distinct interfaces, owner-initiated). (from the
  save-model brainstorm, 2026-06-13) [behavior]
- OQ-060: **InGame diagnostic-log bundle — structure, capture, redaction, retention (undefined in v2).**
  SYS-11's bug reports may **opt in** to attach the app's on-device diagnostic logs, but the **bundle
  format/schema, what it captures, size caps, PII redaction, upload mechanism** (inline vs presigned) **and
  retention/deletion policy** are all undecided. v2 reserves the endpoint (`POST /feedback/:id/logs`) + the
  UI room and treats the body as an **opaque bundle** in access-controlled storage (`log_ref`). Decide
  before bug-log capture is built (likely the Engagement/foundation phase). (Settings formalization,
  decision 0022) [behavior]
- OQ-061: **Card deletion semantics from the Game-page card switcher.** The Game-page CARDS view (the
  OQ-056 customizations switcher) now needs an explicit **delete** affordance, which raises rules the spec
  doesn't yet pin: **(a)** can you delete the **equipped** card, or must you switch first? **(b)** does
  deleting an **owned design** remove it everywhere (incl. the global **My Designs** shelf, `/me/cards`),
  or just this game's instance (cards are per-game, so likely the same thing)? **(c)** deleting a
  **published** design that **others have adopted** — adopters keep their flattened image (CARD-15/ECON-04),
  but does the public gallery entry / attribution persist, and is the count frozen? **(d)** deleting an
  **adopted** card = just removing your downloaded copy (no effect on the creator). Recommendation: **can't
  delete while equipped** (switch first); deleting an owned design removes it everywhere behind a
  **destructive confirm**; published-with-adopters → keep adopters' copies + freeze the gallery entry
  (don't orphan attribution); adopted = remove-your-copy only. Also needs the **destructive-confirm
  component** reconciled with the Settings track's `ConfirmDialog` (centered modal vs the page's
  bottom-sheet grammar). (Game-page A×B mix, 2026-06-14) [behavior]

- OQ-075: **SOC-05 recommend-a-game COMPOSE surface is undrawn (the homeless Friends-domain piece).** The
  friend actions sheet (Friends tab P6 + the Game page) offers a **RECOMMEND A GAME** entry, but the actual
  compose UI — **pick a game (your collection / catalog) + write a short note** → drops into the recipient's
  What-to-Play (the Discover **FROM FRIENDS** feed; `POST /recommendations {toUserId, gameId, note}`, SOC-05/
  WTP-) — is **drawn on no board**. The *receiving* end (Discover friend-recs) is converged; only the
  *authoring* surface is missing. Decide its home — a bottom-sheet from the actions menu, or a small
  game-picker micro-flow — and whether it's a Friends-tab state or a WTP-adjacent flow. Surfaced at the
  Friends-tab (§3.3) convergence. (2026-06-22) [presentation]
- OQ-078: **No left-edge accent rails — F-09 highlight-model clarification + ripple.** Owner ruling
  (2026-06-24): the one-sided **left-edge accent rail** (a `border-left: 3px solid var(--scr-accent)`
  stripe on a row / callout / toast) is **not** the highlight idiom — a highlighted row uses a flat
  **accent-tint fill** (+ accent text), and selection a **full** accent border + the `StateMark`.
  Noted in the catalog (**v0.9**, F-09 card). Owed: the **design-spec F-09 mirror** (wording), and the
  **ripple** to live boards that still carry the rail — `discover-states.html` (the converged
  offline/error toast: a `border-left: 3px` over its 1px accent border) and the **Friends drafts**
  (`.reqrow.incoming` in `friends-draft-b/c`). The **Compare-hours** boards are de-railed this pass; the
  retired `add-game-draft-b` / `store-draft-c` drafts are history (exempt), and doc-chrome left-borders
  (e.g. `onscreen-marker-drafts` `.rule`) are not in scope. (Compare Hours 4.6 track, 2026-06-24) [presentation]
- OQ-080: **External admin operator tool (parked — owner: "think on it more later").** A tool **outside the
  consumer app** hosting the **Admin III/IV** powers that should not live on a phone (decision 0034) — **P3
  Economy/Support** (manual Pixel adjustment · refund/dispute · entitlement claw-back · wallet/purchase
  visibility) · **P4 Config/Authoring** (store/cosmetic authoring + pricing + drops · achievement/egg
  authoring + thresholds · banned-word list MOD-07 · economy levers SYS-04 · controlled lists CAT-04/PROF-02)
  · **P5 Governance** (**role/tier grant/revoke** · the **audit-ledger viewer** over MOD-10 · the
  **active-staff roster**). **What's now SPECCED (decision 0035 — not parked):** the **data foundations** —
  **MOD-10** the append-only audit log, **ECON-11** the operator Pixel/entitlement adjustments + the
  `admin_adjustment` ledger type, and the **audited service-layer ops** (Stage 0+2) — so the economy is
  operable + auditable at IAP launch (IAP refunds stay platform/RevenueCat-owned, ECON-09). **What stays
  PARKED here:** the **operator UI** (Stage 3 — a thin internal web tool wrapping the ops + read views) and
  the P4 config/authoring surfaces. Decide scope/shape when the operator pool or support volume justifies a
  UI. (Admin console §4.4 prep, decisions 0033/0034/0035, 2026-06-27) [behavior]
- OQ-081: **In-app Admin-console remediation additions — IDs + design owed (the §4.4 pass).** The critical
  pass (decision 0034) found the in-app P1/P2 set is missing behaviors beyond today's five actions, to be
  given **MOD-** IDs and drawn when §4.4 is designed: **(P1)** field-level remediation (reset an offensive
  username/bio/avatar; force-rename — a remedy short of suspension) · a **user investigation view** (report
  history + prior actions + their content, to act on a reported user) · a **moderation-action notice** to the
  affected user (the "why" + appeal pointer; the consumer-facing complement to MOD-09's non-disclosure, which
  governs *other* viewers) · **(P2)** **direct canonical entry edit** (fix data with no user suggestion,
  distinct from MOD-06) · **junk/non-dup entry removal** (distinct from MOD-05 merge) · **proactive takedown
  by ID** (the MOD-08 legal pull, actioned without waiting for a report). Spec each (owning doc first) +
  reconcile the destructive-confirm grammar with `ConfirmSheet` (cf. OQ-061) at the §4.4 formalization.
  (Admin model critical pass, decision 0034, 2026-06-27) [behavior]
- OQ-082: **Achievement TIER system — 3 tiers (owner direction, 2026-06-27).** Achievements gain a **`tier`**:
  **PRESTIGE = gold** (`--gold`, rare/marquee) · **STANDARD = the theme accent** (`--scr-accent`) · **SECRET =
  magenta** (a new on-screen token `--scr-secret` `#e85ad0`, for easter eggs). Drawn on the §4.10 Achievements
  drafts (`mockups/achievements/`, `BadgeTile`/`QuestRow`/`MysterySlot`/`CelebrationMoment`); "simple but
  rewarding." **Ripples owed (spec-owner, at the §4.10 converge):**
  **(a) product-spec ACH-** — add the **`tier`** attribute to the data-driven definition (ACH-01/03); *which*
  achievement is which tier = content (**OQ-004**). [behavior/data]
  **(b) F-02 carve-out** — **gold now also = achievement PRESTIGE tier** (non-acquisitive). This **resolves the
  long-standing badge-gold cross-screen flag** (gold-as-achievement, owner-ratified) — reconcile with the
  Friends `.achv` gold glyph + the future Profile achievements teaser; amend the Catalog/design-spec **F-02**
  wording. [presentation]
  **(c) F-05 carve-out** — **magenta on-screen** (`--scr-secret`) for the SECRET tier is **pink-family on the
  screen**, which F-05 reserved for shell LEDs only; define the token + amend the **F-05** wording (shell LEDs
  stay round/pink; the secret tier is a flat on-screen magenta, distinct hue from the `--accent` LED). [presentation]
  **(d)** the STANDARD tier rides **`--scr-accent`** on purpose → it **re-themes with the screen theme (DEV-04)** —
  note the dependency. Pairs with **OQ-004** (content). **OQ-005 (egg presentation) is now design-resolved →
  pole A** (the `???` mystery slot — "hint something exists") by the owner picking **Draft A · Trophy Case** +
  converging to `achievements-states.html` (2026-06-27); spec-owner to move OQ-005 → Resolved with this pass.
  (Achievements §4.10 tier pass + converge, 2026-06-27) [behavior + presentation]
## Resolved
- OQ-079 → **Contributor profile (4.9) revised + formalized** (decision 0032; design-spec **0.31** · product-spec
  **0.28** · api **0.28**): the pride surface **drops CAT-06 field-edits + achievement badges** and **adds a
  contributor STANDING** — the Profile **`PctPill`** percentile tags on the contributor `StatTile`s. Rulings:
  **product-spec CAT-07** revised (drop edits/badges, add the standing + collections-reached + VIEW ALL); new
  **CAT-10** — the standing is computed against the **contributor cohort** (users with ≥1 contribution, *not* the
  whole population), **threshold-gated** (PROF-07/SYS-04 — no chip below the floor) and **privacy-gated**
  (PROF-03). **API enumerated:** `GET /users/:id/contributions` (friend/full vs non-friend/limited shapes) +
  the paginated **`…/contributions/cards?cursor=`** (adoption-sorted) and **`…/games?cursor=`** (reach-sorted)
  VIEW-ALL endpoints (same read-only screen for friend-view; cursor = the load-more for prolific contributors).
  **Design-spec:** §1.5 **Contributor-profile set** (one new component `SectionEmpty`; the rest a Profile-grammar
  reuse) + **§2.16** page. The two completeness-pass edges ruled in 0032: **(a)** the standing rides the honest
  aggregates so the chip shows on the privacy-limited view (only item-detail withheld, PROF-03); **(b)** an own
  MOD-02 soft-hidden card inherits MOD-02 (absent from other viewers' lists/counts, owner still sees it). Gate:
  owner picked **B · The Trophy Wall**, iterated to the Profile-like layout; A/C retired. Source:
  `contributor-profile/contributor-states.html`. (Contributor profile 4.9 track, 2026-06-27)
- OQ-045 → **Sticker placed-on-shell preview drawn** (decision 0030): the `PlacedSticker` renders a
  sticker transformed in its real spot on the shell plastic (Device board D5), nav keycaps z-ordered
  above; closed design-side at the Device-editor converge. design-spec §2.15. (Device editor
  formalization, 2026-06-27)
- OQ-062 → **`stickerComposition` shape + nav-exclusion enforcement ruled** (decision 0030 · api 0.27):
  `{ version, stickers[{ id, assetId, zone ∈ forehead\|chin, x, y, scale, rotation }] }`, `x,y`
  zone-normalized [0,1]; **belt-and-suspenders** enforcement — the client refuses placement + the nav
  keycaps z-order **above** any sticker + the **server validates** zone membership & transformed bounds
  (DEV-03/F-04); all referenced ids must be owned. product-spec 0.27 (DEV-01/03) · api 0.27 · design-spec §2.15.
- OQ-063 → **`SectionSwitch` unified, variants kept** (decision 0030): one §1.5 grammar with **`/pair`**
  (Discover) · **`/chips`** (Styler) · **`/rail`** (Device + Game-page) variants; the selection tell is
  the `StateMark` (already rippled, OQ-067); `SegmentedKeycap` + `SectionChips` **retained as aliases**
  (names append-only), the converged Discover/Styler boards **untouched**. design-spec §1.5.
- OQ-064 → **Saved-looks data model ruled** (decision 0030 · **DEV-05** · api 0.27): a new `device_looks`
  entity (shell + sticker composition + screen theme **snapshot**; **no name** — identified by shell·theme);
  **ON NOW** computed (facets == live device); **apply = `PATCH /me/device`** (no apply endpoint); **delete**
  supported + **cap ~12**; endpoints `GET·POST /me/device/looks` + `DELETE /me/device/looks/:id`. The board
  is owed a per-tile delete affordance (follow-up). product-spec 0.27 · api 0.27.
- OQ-065 → **Premium live try-on / "cart" ratified** (decision 0030): previews persist across the editor's
  sections → exit-with-pending prompts KEEP-or-discard (never silently keeps unowned) → per-item remove
  reverts a facet → **`/me/device` references owned items only** (KEEP commits via `POST /cosmetics/acquire-batch`,
  ECON-07); no hard preview cap. Mirrors the Styler reconcile-at-KEEP (CARD-13). product-spec 0.27 (DEV-01) · api 0.27.
- OQ-076 → **Device editor (4.5) formalization done** (decision 0030): design-spec **§1.5 Device-editor set
  + §2.15** composition (0.30) + **API page-audit** (api 0.27); the behaviour gaps OQ-062/063/064/065 ruled,
  OQ-045 closed. The go-green debt is cleared. (Device editor formalization, 2026-06-27)
- OQ-071 → **`GET /me/feed` item shape enumerated** (api-contract 0.23): the actor+type **aggregated**
  SOC-06 item `{ feedItemId, actor, type, aggregateCount, objects[capped ≤3 peek], occurredAt,
  windowStart/windowEnd }`, cursor-paginated; flood-suppression + trivia-exclusion server-side. *(The
  presence/online sub-gap is moot — `PresenceDot`/`StatPeek` were CUT, owner 2026-06-18.)* design-spec
  §2.10 · api 0.23. (Friends 3.3 converge, 2026-06-23)
- OQ-072 → **`GET /users/search` PersonRow shape enumerated** (api-contract 0.23): `{ userId, username,
  avatarRef, relationship ∈ none·outgoing·incoming·friends·blocked·cooldown, cooldownUntil? }` — the
  `relationship` drives the PersonRow action (the 4.8 spine); `blocked` are mutually-invisible. design-spec
  §2.11 · api 0.23. (Find/Add 4.8 converge, 2026-06-23)
- OQ-073 → **`GET /invites/:token` resolve shape enumerated + QR client-side** (api-contract 0.23):
  `{ token, sender, relationship, prefilledRequest: { toUserId } }`; resolves through the sender's Profile,
  no-app → store; the **QR image is rendered client-side from the `POST /me/invites` token**. design-spec
  §2.11 · api 0.23. (Find/Add 4.8 converge, 2026-06-23)
- OQ-074 → **`GET /me/compare/:friendId` payload shape enumerated** (api-contract 0.25): `{ friend, totals
  { yourHours, theirHours, yourGames, theirGames, leader }, games[{ gameId, title, yourCard, theirCard,
  yourHours, theirHours, leader }] (the **shared** intersection — the two cards back the card-vs-card
  matchup, CARD-07/22), leaderboard[{ rank, user, hours, games, isMe }] }`; **PROF-03-gated** — a hidden
  axis is **omitted** (hours hidden → `theirHours`/hours-`totals`/`leaderboard` dropped, games still
  compare; collection hidden → `games`/`theirGames` dropped), block → unavailable (SOC-09); read-only,
  non-commerce, completion % out. design-spec §2.12 · api 0.25. (Compare Hours 4.6 converge, 2026-06-24)
- OQ-077 → **Compare Hours (4.6) converged + formalized** (design-spec 0.26 · api 0.25): the canonical
  `compare-states.html` (P1 has-overlap · P2 no-shared-games · P3 leaderboard · P4 Skeleton · P5
  privacy-limited · L1 Signal-Lost · L2 Offline); §1.5 **Compare set** (`CompareHeader`/`CompareTotals`/
  `ComparePair`/`CompareRow`/`FriendsLeaderboard`/`LeaderRow`) + §2.12 composition; the payload shape is
  **OQ-074**. Owner picked **B "Versus / head-to-head"**, A/C retired. design-spec §2.12 · api 0.25.
  (Compare Hours 4.6 converge, 2026-06-24)
- OQ-058 → **Personal *game* rating KEPT, private-only; NO card rating, ever.** The collection entry's
  per-game ⭐ (the api `rating?` on `PATCH /me/collection/:entryId`) is a **private personal field** —
  never shown to others, never aggregated (like notes COL-05); no api change. **No card rating anywhere**
  — adoption-count (ECON-05) is the card's only social signal, pinned out so a future card rating isn't
  introduced. product-spec COL-03 + CARD-05 (decision 0024). (2026-06-18)
- OQ-069 → **Card-back prints DESIGNER ATTRIBUTION ONLY** ("CARD ART DESIGNED BY" + name); the
  **adoption count is NOT on the back** — it surfaces only in the gallery `AdoptCount` + the `CardDetail`
  inspect. Narrows decision 0015's "designer + adoption count on the back." product-spec CARD-01 +
  design-spec §1.5 card-back gap note (decision 0024). (2026-06-18)
- OQ-066 → **Conform the mockups to F-06; F-06 is NOT amended** (it stays law). Off-scale on-screen type
  (17/13/12/10.5/10/9) snaps to the nearest of **21/15/11/9** — no `state-title`/`mini-button` role carved;
  error/empty **state-titles → emphasis 15**. Recorded design-spec §1.2 + §1.6; the **~7-board conformance
  SWEEP is a separate follow-up, flagged OWED** (no board edited). No product-spec change (decision 0024). (2026-06-18)
- OQ-038 → **Offline cache scope = own data only.** When offline, only the user's **own profile +
  collection** render read-only; **friends/feed/discover/store require a connection** (calm `Offline`,
  writes gated); others' data is **not cached at rest**. Settles the OQ-037 split. product-spec SYS-10
  (decision 0024). (2026-06-18)
- OQ-067 → **On-screen selection marker = the orange `StateMark` square** (owner Draft A, 2026-06-15;
  formalized design-spec F-09 + the `ChipPip`/`PipLight` → `StateMark` rename, 0.18). F-05's *round +
  pink* now scopes to the **shell LED** (`PipLight`) **only** — the on-screen "pips" were renamed, so
  there is no F-05 contradiction; the `discover-states` (square) vs retired `discover-states-fan` (round)
  disagreement is moot. OQ-067's round+pink recommendation **not** taken. (2026-06-18)
- OQ-059 → **Card flip stays Game-page-only — no Collection peek-flip.** The face→back flip (stats +
  provenance, CARD-01) remains a Game-page (§4.2) deep-inspect; Collection scans stats via dense-list +
  the stats-eyebrow (OQ-033), per §3.1's "without flipping a single card." No board/spec change
  (decision 0025). (2026-06-18) — **SUPERSEDED 2026-06-24 → decision 0026 / COL-12:** the owner
  reversed this on **experiential grounds** (a collectible card has a back you turn over); the
  Collection **now gains** the peek-flip (shelf+grid · tap-to-flip · VIEW GAME → 4.2 · long-press
  shortcut · friend-view privacy-gated). See product-spec COL-12 + design-spec §2.1 + api 0.24.
- OQ-068 → **Discover queue-add is NOT gold** — + ADD FROM COLLECTION creates no card, so it reads
  cream/orange per F-02 (gold = card-creating only); the true card-creating ADDs stay gold. **Board
  recolor OWED** — `discover-states.html` still renders `.btn.add` gold; deferred (the board had
  uncommitted parallel changes), fold into the next discover pass / the OQ-066 sweep (decision 0025). (2026-06-18)
- OQ-070 → **WISHLIST stays out of the owned-entry editor** — it is the pre-ownership/unowned state
  (you wishlist a game you don't own; Up Next / Discover handle it, WTP-02); the converged Game-page
  board (M2) already omits it. No spec change (decision 0025). (2026-06-18)
- OQ-053 → **Upcoming notify-me has a backing endpoint** (Discover §3.2 page-audit, api-contract 0.21):
  `POST·DELETE /catalog/games/:id/notify` (subscribe/unsubscribe) + `notifyOnRelease` on
  `/catalog/upcoming` + the **`release`** `notification-prefs` type (DISC-01 → NOTIF-01/02). (2026-06-13)
- OQ-054 → **`GET /me/queue` item shape enumerated** (api 0.21): `{ owned, source (collection ·
  discovery · friend_rec), recommendedBy?, note? }` — drives the IN-COLLECTION / **WISHLIST** /
  **REC'D BY** tags (WTP-01/02 · COL-02 · SOC-05). (2026-06-13)
- OQ-055 → **`GET /discover/trending-cards` shape** (api 0.21): `{ rank, card, game, designer,
  adoptionCount }` — `RankChip` + designer credit (CAT-05) + `AdoptCount` (CARD-05); non-commerce. (2026-06-13)
- OQ-057 → **DISC-02 Browse-By parked from the Discover landing** (api 0.21): the `/discover/browse`
  endpoint stays, but genre/studio browse is reached via the **Game page 4.2** tappable genre/studio —
  not surfaced as a Discover section for now (owner ruling). Surfaced friend-recs needed a feed, so the
  audit also added `GET·DELETE /me/recommendations` (recs land in the feed, not auto-queued, SOC-05). (2026-06-13)
- OQ-001 → **Multiple device models.** *(Superseded by OQ-042/decision 0017 — one handheld body; users own multiple **shells**, not models.)* A user can own several device models (via entitlements/store)
  and switch the active one — as DEV-02 states. (2026-06-08)
- OQ-003 → **"Now Playing" is a single pin**, distinct from the multi-valued `Playing` status
  (COL-02): one game you pin as "what I'm on now," settable from Up Next or a collection entry,
  surfaced on the Profile. Clarified in WTP-03. (2026-06-08)
- OQ-016..OQ-030 → **Formalized as one batch** — see decision
  [0010](decisions/0010-account-lifecycle-safety-compliance.md) (2026-06-10): block + report-user
  (SOC-09, MOD-01) · ToS/privacy + age 13 (AUTH-10) · Help/Contact (SYS-09) · soft email verification
  (AUTH-08) · SIWA username-completion + linking, Google parked (AUTH-09, §10) · deletion ripple
  (AUTH-07) · username change (PROF-06) · request lifecycle (SOC-08) · screening scope (MOD-07) ·
  welcome/landing (design-req 4.13) · invite redemption (SOC-10) · push priming (NOTIF-04) ·
  published-card lifecycle (CARD-20) · IAP refund reversals (ECON-09) · offline baseline (SYS-10).
  Ripple: product-spec 0.9, api-contract 0.7, ui-design-requirements 0.5.
- OQ-013 → **PROF-07 (P2): community percentile chips** — server-computed, hidden below a
  minimum-population threshold; chips stay in the design system but **every stat tile must render
  cleanly without one**. See decision [0011](decisions/0011-mockup-review-formalizations.md). (2026-06-10)
- OQ-012 → **Your own chrome persists by default when visiting a friend; swapping into their device
  is an explicit "view in their device" toggle** (with an obvious exit; nav untouched per DEV-03).
  Owner direction. See decision [0012](decisions/0012-view-modes-errors-theme-chrome.md). (2026-06-10)
- OQ-032 → **The theme changer is the in-app *screen theme*, and it lives in the Device editor**
  (DEV-04: free baseline + premium, legibility floor; the screen is part of the device — Settings
  stays functional-only). See decision [0012](decisions/0012-view-modes-errors-theme-chrome.md). (2026-06-10)
- OQ-006 → **On-screen control styling = the Keycap system** (F-03): tactile keycaps on both surfaces
  (`KeycapButton`/`ToolKeycap`), superseding the earlier flat/"Mix" answer. design-spec §1.5 + F-03.
  See decision [0013](decisions/0013-design-spec-sync-presentation-oqs.md). (2026-06-11)
- OQ-014 → **F-01 (never crop a Game Card)** — promoted to a design-spec foundation rule. Decision 0013. (2026-06-11)
- OQ-015 → **Parked (future enhancement).** Power-LED-as-notification-indicator recorded and liked;
  not v2 scope — revisit with notification polish (NOTIF-01/02). Decision 0013. (2026-06-11)
- OQ-031 → **Arrange mode.** Manual ordering (COL-07) = an Arrange mode entered from the sort sheet
  (long-press-drag), saved as one more sort choice. design-spec §2.1. Decision 0013. (2026-06-11)
- OQ-033 → **Shelf rows show per-game stats.** The dense-list rationale shifts from "only mode with
  stats" to **density** (list scans more rows than shelf). One-line ripple to design-req §3.1.
  Decision 0013. (2026-06-11)
- OQ-034 → **Tools-bar model: "keycaps act, the drawer configures."** Tap = the tool's one-bit action
  (search live-filter · sort ASC/DESC · view cycle); FILTER opens the sheet; long-press → sheet at
  that section; one shared query state. design-spec §2.1. Decision 0013. (2026-06-11)
- OQ-035 → **System keyboard.** Text entry uses the OS keyboard, `keyboardAppearance` theme-matched,
  the focused field riding above it; an in-app keycap keyboard was deferred (a11y/i18n cost).
  design-spec §1.7. Decision 0013. (2026-06-11)
- OQ-036 → **F-02 colour-disambiguation.** Stepped-button colour signals intent: gold+step =
  card-creating · system-orange+step = prominent non-card; the avatar badge (no step) is exempt.
  design-spec F-02. Decision 0013. (2026-06-11)
- OQ-037 → **§1.8 error family formalized (visual side).** Retryable "Signal Lost"+RETRY · terminal
  `Unavailable` (no retry; MOD-09 collapse; Unblock the lone exception) · calm `Offline`; solid
  `Skeleton`. design-spec §1.6. **Residual:** offline cache scope → OQ-038. Decision 0013. (2026-06-11)
- OQ-041 → **Restore never re-grants consumables.** Restore = receipt re-validation + entitlement
  re-sync + completion of interrupted transactions; the balance is account state. ECON-06.
  Decision 0017. (2026-06-12)
- OQ-042 → **One handheld; shells, not models.** "Device model" + "device skin" collapse into
  **device shell** (colourways/wraps of the one pocket body); DEV-02 + COSM-01 edited; api-contract
  `activeShellId`. Decision 0017. (2026-06-12)
- OQ-043 → **The daily bonus is claimed on the Store** (+1 PX/day default, idempotent per day,
  unclaimed days lapse, no streaks in v2; values SYS-04). ECON-02; `/me/wallet.dailyBonus` +
  `/me/daily-bonus`. Decision 0017. (2026-06-12)
- OQ-044 → **One-time Starter Pack = ECON-10** (~2–2.5× base rate, once per account, flagged then
  hidden/marked purchased; values OQ-011/SYS-04). Decision 0017. (2026-06-12)
- OQ-046 → **Hold-to-buy is the spend confirm** for instant Pixel purchases (no dialogs; IAP keeps
  the native confirm). ECON-01 + design-spec `motion.holdToBuy`. **Residual:** the accessible
  non-hold alternative — named in the design-spec gap list. Decision 0017. (2026-06-12)
- OQ-047 → **Sticker packs are SHELL items; the card canvas sells nothing.** COSM-01 retyped
  (shell sticker pack); CARD-02/17 vector elements all free; premium-on-card stays the closed
  attributes (decision 0014). Decision 0017. (2026-06-12)
- OQ-050 → **Start-from sources landed in the contract** (api-contract 0.16, styler sync):
  `GET /games/:gameId/card-bases` (default · templates · kits, CARD-16/18/COSM-02) +
  `POST /games/:gameId/card-bases/surprise` (the server-dealt auto-design; non-idempotent —
  each call deals fresh). (2026-06-12)
- OQ-039 → **NAMEPLATE adopted as a COSM-01 cosmetic type; OVERLAY cut** (the styler gate ruling:
  *"add nameplate remove overlay"*). The nameplate = the title-plate **object** (SLAB · RIBBON ·
  BEVEL · premium HOLO PLATE); the card layer stack gains it and **TITLE rescopes to font + ink**
  (CARD-01/11); the store gains a Nameplates aisle (design-req 3.4); api was pre-synced (0.16).
  See decision [0018](decisions/0018-styler-formalization-nameplate.md). (2026-06-12)
- OQ-008 → **Element cap starts at 30** (server-configurable stays, SYS-04); stage-3 draws the layers panel + at-cap state against 30. CARD-15. Decision [0019](decisions/0019-triage-element-cap-intensity-private-popular-share.md). (2026-06-13)
- OQ-048 → **Intensity is the effect's alone, and it persists** — finishes stay binary (no second slider); the value lives in the composition JSON ("EFFECT · 70%"). CARD-12. Decision 0019. (2026-06-13)
- OQ-049 → **Save-private surfaces in both** the game's card switcher (COL-06) and the My-designs shelf (`GET /me/cards`); no new surface. CARD-14. Decision 0019. (2026-06-13)
- OQ-051 → **"Popular" = ranked by collections-count** (CAT-09, most-collected first), capped ~12, no paging — the rail is a nudge; Discover browses. `/catalog/popular`. Decision 0019. (2026-06-13)
- OQ-052 → **Friend-view SHARE chip cut** — sharing is self-only (your invite link, SOC-07); others'-profile deep links stay parked (§10). PROF-05 / design-req 3.5. Decision 0019. (2026-06-13)
- OQ-007 → **RESOLVED design-side — the DIEGETIC breakout** (Canvas converge, `canvas/canvas-states.html` P1–P2): entering the Canvas the device shell **swings open like a cabinet** onto a workshop bench; the card lies on a **press bed**; layers become **physical slips**. Three treatments were drafted (total-yield HUD · partial-yield rails · diegetic press); the owner picked the press. Reduce-motion = a fade (CARD-16). Rescoped by decision 0014 to the Card editor's Canvas posture (stage 3 of the Add Game arc; Add Game + the Styler stay in-frame). (2026-06-13)
- OQ-040 → **RESOLVED design-side — the "first print" ritual** (Canvas converge, `canvas/canvas-states.html` P8): ① the press runs (client-rendered platen sweep, never network-bound) · ② the slips fly in (the composition-JSON assembly replay) · ③ the print lifted off the press (gallery staging, bloom + haptics) → routing: shelf slot · SHARE (CARD-21) · NOTIF-04 adoption-ask. **Tiered:** full here (canvas completions / publishes); the **light KeepBeat** for Styler keeps was designed in `styler/styler-states.html` P7. Mid-edit **hold-to-preview** = the Canvas's PROOF (P6). Decision 0015 moments layer / decision 0014 editor arc. (2026-06-13)
