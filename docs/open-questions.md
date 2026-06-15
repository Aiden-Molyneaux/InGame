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
- OQ-038: **Offline cache scope** — what renders read-only when offline: your own profile/collection
  only, or also recently-viewed friends? (split from OQ-037 during the design-spec sync; SYS-10) [behavior]
- OQ-045: **Sticker placed-on-shell preview** (owner deferral, store track 2026-06-12) — §4.11's
  sticker-preview case is NOT drawn on the converged Store board; design it with the **Device editor
  pass** (DEV-01). [presentation]
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
- OQ-058: **Do we capture a personal *game* rating — and we explicitly do NOT rate cards.** Two parts.
  **(a)** The collection entry already carries a `rating?` field (api-contract `PATCH
  /me/collection/:entryId`, COL-02..06) and the Game-page draft surfaces it in the owned-state
  `PlayStats` (your stars for the *game*) — but it was never deliberately confirmed, and the owner is
  unsure it's wanted. Decide: keep a per-game personal rating (and is it private-only, or does it feed
  any aggregate?), or drop it. **(b)** There is **no card rating** anywhere — individual or aggregate —
  and the recommendation is to keep it that way: **adoption-count is deliberately the card's social
  signal** (ECON-05 — creators earn *clout*, pointedly not ratings/currency), so a card rating would
  create a competing popularity metric the spec avoided. Pending the ruling, the Game-page draft pulls
  rating off the card-back and de-emphasizes it in PlayStats. (Game-page draft A review, 2026-06-13)
  [behavior]
- OQ-059: **Card peek-flip on the Collection screen?** Today the **card flip** (face → back: stats +
  provenance, CARD-01) lives **only on the Game page** (§4.2 "hosts the card-object/flip view"); on
  Collection, stats are scanned via the dense-list mode + the shelf stats-eyebrow (OQ-033) — §3.1 frames
  dense-list as getting the answer "without flipping a single card." Question: do we *also* want a
  **quick peek-flip in place** on Collection (e.g. long-press a card to glance its back — your own and a
  friend's — without leaving the shelf), or keep flipping a Game-page-only deep-inspect interaction? A
  peek-flip adds interaction load to a browse surface; the recommendation is **Game-page-only** unless
  there's a strong scan-the-backs use-case. (Game-page draft A review, 2026-06-13) [presentation]
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

- OQ-062: **`stickerComposition` payload shape + the nav-exclusion enforcement boundary.** The Device-editor
  drafts (§4.5, `DEV-01`) draw **place / scale / rotate** stickers on the shell, so the opaque
  `stickerComposition` (api-contract `PATCH /me/device`) needs a defined per-sticker shape — at minimum
  `{ stickerId/assetId, x, y, scale, rotation }` in a **defined coordinate space** (normalized to the shell
  body? which decoratable zones?) — and a ruling on **where the `DEV-03`/`F-04` nav-no-go is enforced**:
  client-only (the UI refuses placement over the 5 keycaps, as all three drafts show) vs **server-validated**
  on write (reject/clamp compositions that overlap the nav or the screen). Device analogue of the editor's
  composition payloads; pairs with the OQ-045 on-shell preview this pass closes. **Owner clarified
  (2026-06-14): the decoratable surface is the coloured plastic only — the forehead (top-band) + the chin
  (nav-band margins); the screen (DEV-04's theme surface) AND the 5 nav keycaps are both off-limits.** So the
  coordinate space is plastic-zones-only; the open part is just the per-sticker shape + where that exclusion
  is enforced (client vs server). (Device-editor drafts, 2026-06-14) [behavior]
- OQ-063: **A new `SectionSwitch` mode-switcher — does it replace the Segmented Toolbar app-wide?** The owner
  asked (reviewing Device Draft A) to rebuild the SHELL/THEME/STICKERS switcher as an **S8-style option-card**
  component (`device-switcher-takes.html`: T1 Section Stack · T2 Section Rail · T3 Section Hero; selection
  moves to the **F-09 accent-border + pink-pip** tell, off the old F-03 pressed-keycap). The same convention
  lives on **converged** boards — Discover's `SegmentedKeycap` (2-way) and the Styler's `SectionChips` (5-way).
  Open: once the owner picks a take, **is it adopted on those boards too** (one shared component → design-spec
  §1.5, retiring/aliasing `SegmentedKeycap`+`SectionChips`), or scoped to the Device editor only? Cross-track /
  spec-owner call — **not applied to Discover/Styler here**. (Device switcher exploration, 2026-06-14) [presentation]
- OQ-064: **Saved device "looks" — the data model + scope.** The Device editor gains a **LOOKS** section
  (`device-draft-a-looks.html`, owner ask 2026-06-14) that saves a styled combo — **shell colour + the
  `stickerComposition` + screen theme** — as a named, re-applyable **`SavedLook`**, with **SAVE THIS LOOK** and
  an **ON-NOW** tag. Open: is this a **new entity** (e.g. `device_looks`: user × `{ name, activeShellId,
  stickerComposition, screenThemeId }`) — a **cap** on count — **rename/delete** — and does *applying* a look
  just write those three fields onto `/me/device` (a look = a saved snapshot; the live device is one of them)?
  Device cousin of the card editor's **OQ-056** (named saves + customizations gallery). **Personal-only**, like
  the rest of the device. (Device editor LOOKS, 2026-06-14) [behavior]
- OQ-065: **Device editor — premium-preview persistence + the "cart" model.** The editor is a **live try-on**:
  the converged board (`device-states.html` D7 + the `KeepBar`) lets you preview **unowned** premium shell ·
  theme · stickers and assumes those previews **persist across section switches** (SHELL/THEME/STICKERS — the
  rail changes what you edit, it doesn't strip what's applied) and **accumulate** into one `KeepBar` tally →
  **KEEP → the `ReconcileSheet`** (acquire-batch, the "cart"). Mirrors the Styler's multi-premium →
  reconcile-at-KEEP (CARD-13). **Spec owner to ratify (DEV-01/COSM-03):** (a) previews persist within the
  editing session across sections — **yes** per the design; (b) **exit-with-pending** — leaving with premiums
  in preview prompts the reconcile (keep) or discards them (the free default re-renders), never silently keeps
  the unowned; (c) **per-item remove** in the reconcile reverts that facet to owned/free; (d) `/me/device`
  (`activeShellId`·`screenThemeId`·`stickerComposition`) only ever references **owned** items — previews are
  client-side until acquired; (e) any **cap** on simultaneous previews. Pairs with OQ-062/064.
  (Device editor premium try-on, 2026-06-15) [behavior]

## Resolved
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
