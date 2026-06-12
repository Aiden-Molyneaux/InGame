# InGame — UI/UX Design Requirements

> The brief for **Claude Design**. For each surface, this states *what the user must be able to do*
> (referenced to stable feature IDs in [`../spec/product-spec.md`](../spec/product-spec.md)) and the
> **design direction** — not pixel layouts. Claude Design owns the resulting `design-spec.md` (the
> "how it looks/feels"). Behavior questions raised while designing go to
> [`../open-questions.md`](../open-questions.md), not edited into the spec directly.

**Version:** 0.11 · **Last updated:** 2026-06-12 · **Owner:** Claude Code → Claude Design
**Status:** **ALL screens specified** (5 tabs + 16 detail screens/flows). Ready to hand to Claude Design. Open design notes live in `open-questions.md` (`OQ-005/007`).
> **Claude Design — read [`design-process.md`](design-process.md) first.** It defines the phased,
> reuse-first process: 3 hero-screen (Collection) drafts → extract a named component catalog →
> Profile → expand. Compose every screen from the catalog so nothing feels disjunct.

---

## Part 1 — Global design direction & patterns

### 1.1 Art direction — "distinctive expression, legible navigation"
InGame should feel like **nothing else**, *and* be instantly usable by someone who hasn't opened it in three weeks (it's a **low-frequency** app — users partly re-learn it each visit). Resolve that tension by splitting on *invariance*:
- **Be bold / unconventional** in: the **collection presentation**, **transitions**, the **Game Card object**, the **Device**, and **celebration moments**. This is where delight lives and where novelty costs nothing to re-learn.
- **Stay legible / conventional** in: **core section navigation**, **dense lists**, **forms**, and **checkout/purchase**. Wayfinding must never be a puzzle.

### 1.2 The Device metaphor (the core shell)
The app is framed as a **customizable retro device** (console/cabinet) that **houses the collection**:
- The **device frame ("plastic")** is **persistent chrome** around the content.
- The content area is the device **"screen"**; the collection's cards **scroll within it** (the frame doesn't scroll away).
- The device is **customizable** — colour + stickers (`DEV-01`) — so a user's identity frames every screen.

### 1.3 Navigation model (locked)
- **Navigation lives on the device "plastic"** — the **5 tabs** are the device's console-style buttons, identical on every screen.
- **All contextual/screen-specific actions live on the "screen."**
- **Constraint:** nav must stay legible/usable no matter how the device is customized — **stickers/colours can't obscure nav** (`DEV-01`).
- **Design notes for you (unresolved):** on-screen control *styling* — tactile/3D vs flat (**OQ-006**); and whether/how space-hungry screens get a **stylized "break-out"** beyond the thin bezel (**OQ-007**).

### 1.4 The Game Card (the hero object)
- Form factor: a **trading-card portrait**. Big art canvas; **face shows art + title only**; **stats live on the flip/back**.
- It is the **universal visual representation of a game everywhere** (`CARD-07`) — collection, Top-5, pinned favourite, friend showcases, recommendations — always rendering the owner's **selected** card (`COL-06`).

### 1.5 Currency presence
- A **persistent currency counter** in the header of customization/commerce screens, **tappable to the Wallet** (`ECON-07`).

### 1.6 Two-mode screens
Two screens are designed **once, with two modes**:
- **Profile** (`PROF-05`): your own (editable) vs. a friend's (read-only, privacy-gated).
- **Collection** (`COL-10`): your own (editable tab) vs. a friend's (read-only), reached via their Top-5.
- **Friend-view chrome (OQ-012 resolved — owner direction):** visiting a friend's Profile/Collection
  **keeps your own device chrome by default**; their device appears as an on-screen hero, with an
  explicit **"view in their device" toggle** that temporarily swaps the chrome (obvious exit back).
  Nav stays yours and untouched either way (`DEV-03`).

### 1.7 Always-on principles
- **Every session pays off fast; no empty states left dead** — design inviting empties (esp. new users + a community catalog that starts sparse).
- **Accessibility:** dynamic type + adequate contrast on functional UI, despite heavy theming.
- **Offline-graceful:** screens render last-synced content read-only with a lightweight offline indicator (`SYS-10`) — no blank screens or dead ends on a bad connection.

### 1.8 Feedback & error surfacing (pattern)
Errors are **catalog components, not per-screen improvisation** (the state matrix in
[`design-process.md`](design-process.md) makes them definition-of-done). Four channels, used consistently:
- **Inline validation** on forms/fields (mirrors server validation, `SYS-02`) — a fixable field never becomes a toast.
- **Transient action failures** (save / publish / purchase hiccup) → a non-blocking **toast/banner**, with **retry** where the action is safe to repeat.
- **Load failures** → a **section/full-screen error state with retry** — a named component, same family as the inviting empties (1.7).
- **Offline ≠ error:** the read-only offline indicator (`SYS-10`) is its own calm pattern, never an alarm.
Plus: **destructive actions always confirm** (delete account/game/card, unpublish, unfriend, block — conventional and legible per 1.1). Tone: clear first, arcade-flavoured second — an error is "legible navigation" territory, never a puzzle.

---

## Part 2 — Information architecture

**5 bottom-of-device tabs:** **Collection · Discover · Friends · Store · Profile.**

| # | Surface | Type | Notes |
|---|---|---|---|
| 1 | Collection | Tab | + friend-view mode |
| 2 | Discover | Tab | merges **Up Next** + discovery |
| 3 | Friends | Tab | feed-first |
| 4 | Store | Tab | incl. Wallet |
| 5 | Profile | Tab | + friend-view mode; gateway to Achievements & Contributions |
| 6 | Add Game | Flow | **specified** (4.1) |
| 7 | Game page (adaptive) | Detail | shared catalog page; the **owned state folds in** your personal stats + card; card gallery lives here. **Specified** (4.2) |
| 8 | Card editor | Editor | **specified** (4.3) — the heaviest screen |
| 9 | Admin/Moderator console | Mod-only | **specified** (4.4) |
| — | Device editor | Editor | **specified** (4.5) |
| — | Compare Hours · Lists/Top-5 editor · Find/Add Friends | Social detail | **specified** (4.6–4.8) |
| — | Contributor profile · Achievements | Pride | **specified** (4.9–4.10; reached from Profile) |
| — | Store item detail/purchase · Wallet | Commerce | **specified** (4.11–4.12) |
| — | **Welcome/Auth** · Onboarding · Settings · Report | System | **specified** (4.13–4.16; incl. the logged-out landing) |

---

## Part 3 — Tab screens (specified)

### 3.1 Collection (home)
**Purpose:** your library, inside your Device — the heart + showcase. **Personas:** Curator, Completionist.
**Must host:**
- Your **Device frame** (persistent chrome) with **Game Cards scrolling within** (`DEV-01`, `COL-07`).
- **Now Playing hero** atop the shelf: the pinned game's Card + status, with a **quick Log-hours action** (`WTP-03`, `COL-03`); **no pin set → an inviting "set your Now Playing" nudge** (pick from collection).
- **View toggle** (`COL-07`), three presentations: **shelf** (the showcase — cards in the device, each row carrying a **per-game stats eyebrow**, `OQ-033`) ↔ **compact grid** (dense browsing — smaller **full** card faces, never cropped, no added labels) ↔ **dense list** (management — row = thumb + title + **hours/status at a glance**; the **densest** mode for scanning stats without flipping a card).
- **Sort & filter:** genre / status / hours / recently-added, with an **ASC/DESC toggle**; plus **manual ordering** (`COL-07` — entry affordance + reorder interaction are yours to design, `OQ-031`).
- **Collection search** scoped to your library, matching **title + developer/publisher** (`COL-09`).
- **Add-game** entry point (→ Add Game).
- Card **face = art + title only**; tap → **Game page** (owned state, 4.2).
**Not here:** summary stats (they live on Profile).
**Modes:** your own (editable) + **friend-view read-only** (`COL-10`).
**States:** empty (inviting first-add nudge) · populated (must scale gracefully inside the frame) · **Now-Playing unset** (hero nudge) · loading.

### 3.2 Discover (merges Up Next + discovery)
**Purpose:** "what should I play, and what's out there." **Personas:** Completionist, Casual returner.
**Must host:**
- A **segmented toggle: `Up Next` ↔ `Discover`**.
- **Up Next** (`WTP-01/02/03`): ranked **owned + unowned** queue; drag-to-reorder; "currently playing" pin; shareable; add from collection / discovery / friend rec. *(Unowned = `Wishlist`-status entries — no separate wishlist screen.)*
- **Discover:** **Upcoming** (future release dates, `DISC-01`) · **Browse** by genre/studio (`DISC-02`) · **Trending/featured cards** (`DISC-04`) · **games-only search** (`DISC-03`).
**Cold-start:** with a community catalog that starts thin, turn empty discovery into a **Contributor hook** ("be the first to add this / design its card").
**States:** queue empty/populated · sparse-catalog discovery · search active.

### 3.3 Friends
**Purpose:** keep up with people + find new ones. **Persona:** Socializer.
**Must host:**
- **Activity feed as the landing view** — aggregated, low-noise (`SOC-06`).
- **Friends list** → friend Profile (`SOC-01`).
- **Requests** — incoming: **accept / decline**; outgoing: **cancel** (`SOC-08`).
- **Find/add friends:** **username search** + **invite link** + **QR code**; *no contacts-matching* (`SOC-07`).
- **Block** entry points: a user profile's overflow + the report flow (`SOC-09`); the blocked list itself is managed in Settings.
- Jump-off to **Compare Hours** (`SOC-03`).
**States:** no friends (invite hook) · pending requests · quiet vs active feed.

### 3.4 Store
**Purpose:** acquire cosmetics + currency (monetization). **Persona:** Curator/spender.
**Must host:**
- Featured **Drops** + category sections (Vector packs · Effects · Finishes · Frames · Fonts · Devices · Currency) (`COSM-01`, `ECON-08`).
- **Single-currency model:** real money buys **Customizer currency**; premium cosmetics are **priced in currency** (`ECON-01`).
- **Wallet surfaced here:** **balance + earn/spend ledger + buy-currency** (`ECON-07`); the header counter is its entry point elsewhere.
- **Item detail → purchase**, owned/locked states, **restore purchases** (`ECON-06`).
- **Persistent currency counter** in header.
**Not here:** free baseline cosmetics (those live in the editors).
**States:** browse · item detail · purchase success/fail/restore · can't-afford → buy currency.

### 3.5 Profile (your showcase)
**Purpose:** identity + trophy case + hub to management screens. **Personas:** Curator, Socializer, Contributor.
**Must host:**
- **Hero:** Device + collection.
- **Identity:** avatar, username, bio, **favourite genre(s)**, **gamertags** (managed here), **pinned favourite game** (hero Game Card) (`PROF-01/02`).
- **Stats:** collection summary + **headline clout stats** (cards designed, total adoptions received) + **member-since** (`PROF-04`); stat tiles may carry **community percentile chips** (`PROF-07`) — threshold-gated, so **every tile must render cleanly without its chip**.
- **Showcase:** **Top-5** (five Game Cards; **tapping = gateway into the collection**), **Now Playing** (`WTP-03`).
- **Gateways:** teasers + links to **Achievements** (`ACH-05`) and **My Contributions** (`CAT-07`) — reachable from here only.
- **Settings** + **Edit profile** entries.
**Not here:** the **privacy/visibility control** (`PROF-03`) — owner direction (2026-06-10 mockup review): it lives in **Settings** (4.15), **not** as a chip/button on the Profile header.
**Friend-view mode** adds: **friend count + mutual friends**, **Add friend / Compare hours** actions, **Share profile** (`SOC-07`), and an overflow with **Report / Block** (`MOD-01`, `SOC-09`); hides edit/management (`PROF-05`).
**Design note:** the exact visual **hierarchy** (what reads first) is yours to finalize; intent is Device/collection hero → identity → stats → Top-5 → teasers.
**States:** self vs friend-view · edit mode · privacy-limited view.

---

## Part 4 — Detail screens & editors

### 4.1 Add Game (flow)
**Purpose:** get a game into your collection (and the catalog when it's new). **Personas:** everyone; Contributor.
**Must host:**
- **Search** the community catalog (`CAT-01`); results show **title + release year + developer studio + a representative card + an "in your collection" marker** + **community presence** (in-N-collections · friends-have-it, `CAT-09`).
- **Empty-state suggestions** (recently-added / popular / friends' games) — never a blank box.
- **Exists →** add with an **all-status picker** (`COL-01/02`), then an **offered (not forced)** card step (else default placeholder, `CARD-18`).
- **Missing →** **Create canonical entry** (name/genre/studio/publisher/release) with **fuzzy dedup** (`CAT-03`) → "be first to design its card."
- **Add & continue** (quick multi-add); **Report duplicate** from a result (→ admin dedup, `MOD-01/05`).
**States:** searching · results · no-results (→ create) · creating (dedup) · added (→ card step).

### 4.2 Game page (adaptive — shared page + owned state)
**Purpose:** the **shared community page** for a canonical game; when you own it, your personal details take precedence. **One screen, two states** — Collection Entry Detail folds in here.
**Shared content:** canonical facts + **contributor credit** (`CAT-02/05`); **tappable genre/studio** (`DISC-02`); **community card gallery + adopt** and **design a card** (`CARD-04`, `ECON-03/04`); **add to collection / Up Next** (`WTP-02`); **recommend to a friend** (`SOC-05`); **friends-who-own + hours**; **suggest edit** (`CAT-06`); **report incl. duplicate** (`MOD-01`); **upcoming → notify me** (`DISC-01`, `NOTIF-01`); **community presence stats** (in-N-collections · friends-have-it, `CAT-09`); **richer aggregates (avg hours, completion) — later phase**.
**Owned state (takes precedence):** your **hours / % / status / owned-since / rating / notes** (editable) + **selected card + card switcher** (`COL-03/06`); **Now Playing** (`WTP-03`); **share card image** (`CARD-21`).
**States:** not-owned vs owned · upcoming · no-cards-yet (be-first) · soft-hidden/reported.

### 4.3 Card editor — the heaviest screen (`CARD-01..19`)
**Purpose:** design a Game Card for a specific game. **Persona:** Curator (+ Artist). **UX MANDATE: dense functionality must feel effortless** — progressive disclosure; the **three-bucket model** (① add elements · ② edit selected element · ③ card-level settings); direct-manipulation gestures; **start-from never blank**.
**Must host:**
- The **layered trading-card front** (back standardized): *base → vector elements → one effect → finish → frame → title* (`CARD-01`).
- **Vector composition** — placeable shapes/letters/numbers/icons (free + premium packs) + optional colour/gradient base; **no uploads, no AI** (`CARD-02`).
- **Element management:** layers panel (reorder/select/rename/lock/hide/duplicate/delete) + stacked-tap, multi-select + group, z-order (`CARD-08`).
- **Precision:** pan/zoom canvas, snapping/smart-guides/align/distribute, nudge/numeric, undo/redo (`CARD-09`).
- **Per-element controls:** opacity, gradient fill, stroke, shadow/glow, flip, blend, corner-radius (`CARD-10`).
- **Colour & type:** palettes/eyedropper/curated; fonts + curved text + styling (`CARD-11`).
- **Effects + separate finish** (holo/foil), one effect at a time (`CARD-12`).
- **Premium = preview-then-acquire** + publish reconcile + buy-currency at intent (`CARD-13`).
- **Drafts/lifecycle:** Draft state, autosave + crash recovery, unsaved-exit guard, duplicate (`CARD-14`); **unpublish / delete** your own cards — published cards are immutable, so "edit" = duplicate-to-draft (`CARD-20`).
- **Save private vs Publish** → flatten to one image + true-preview + thumbnail safe-area (`CARD-04/15`); **publish integrity** (`CARD-19`); **share image** at the reveal (`CARD-21`; the reveal/celebration pattern itself is `OQ-040`).
- **Approachability/a11y:** start-from (template / preset kit / **auto-design "Surprise me"**) — never blank; coachmarks; **break-out** to max canvas; screen-reader + non-gesture path; reduce-motion (`CARD-16`).
- **Asset library:** searchable/categorized/filtered (free/premium/owned)/favourites; premium preview-on-card (`CARD-17`).
- **Creator dashboard touch:** adoptions/clout/milestone progress (`CARD-05`).
**Design notes for you:** on-screen control styling (`OQ-006`); the stylized break-out (`OQ-007`).
**States:** new (start-from) · editing · premium-reconcile · saving/flattening · publish · error/offline.

### 4.4 Admin/Moderator console (moderator-only, `MOD-04`)
**Purpose:** the light-touch moderation home. **Gated to the moderator/admin role** (`SYS-08`).
**Must host:**
- **Reports queue** — review, hide/restore (`MOD-01/02/03`).
- **Edit-suggestion review** — approve/reject canonical field changes (`MOD-06`).
- **Catalog dedup/merge** — merge a duplicate into the canonical (re-point collections/cards), then **soft-delete with a 3-day restore** (`MOD-05`).
**States:** queues (empty / with items) · item detail + action · restore-window items.

### 4.5 Device editor (`DEV-01..04`)
**Purpose:** customize your Device shell (the app/profile frame). **Persona:** Curator. **Lighter than the card editor.**
**Must host:** **model selection** (own/switch; free default device always renders) · **shell colour** · **screen theme** (the in-app display theme; free baseline + premium, with a legibility floor — `DEV-04`) · **sticker placement** (place/scale/rotate from the library; free + premium **preview-then-acquire**). **Personal only** (not published/adopted). **Hard rule:** decoration must never obscure navigation.
**States:** editing · premium-reconcile · model switch · theme preview.

### 4.6 Compare Hours (`SOC-03`)
**Purpose:** friendly comparison. Reached from a friend's profile/Friends.
**Must host:** per-game **hours side-by-side** (games you both own) · **total hours** · **total games** (collection size) · who's-ahead · **friends leaderboard**. *(Completion % out for v2.)*
**States:** has-overlap vs no-shared-games · loading.

### 4.7 Lists / Top-5 editor (`SOC-04`)
**Purpose:** curate your Top-5. **v2 = Top-5 only** (general lists parked).
**Must host:** pick ≤ 5 games **from your collection**, **order** them (shown as Game Cards), share.
**States:** empty · editing · full (5).

### 4.8 Find / Add Friends (`SOC-07`, `SOC-08/10`)
**Must host:** **username search** → send request · your **invite link + QR** · **incoming/outgoing requests** (accept / decline / **cancel outgoing**, `SOC-08`) · **invite-link landing:** an opened invite resolves to the sender with a **one-tap prefilled request** (`SOC-10`). (No contacts-matching.)
**States:** searching · results · request sent/pending · invite-landing.

### 4.9 Contributor profile — "My Contributions" (`CAT-07`)
**Purpose:** Contributor pride surface. **Friend-viewable** (privacy-gated); **stats + badges, no level**.
**Must host:** games you brought to the catalog · fields you added · cards you designed · adoption/usage stats · contributor achievement badges.
**States:** self vs friend-view · empty (new user).

### 4.10 Achievements (`ACH-03/05`)
**Purpose:** your achievements. Reached from Profile **only**; **friend-viewable** (earned ones).
**Must host:** earned + in-progress **milestones** (with progress) · **easter eggs** (presentation per `OQ-005`) · reward badges. *(Content = `OQ-004`, deferred.)*
**States:** self vs friend-view · unlock celebration moment.

### 4.11 Store item detail / purchase (`ECON-06`)
**Must host:** **live preview on your own stuff** (effect/finish on a sample card; device model on your device; sticker shown) · price (currency, or real money for currency packs) · owned/locked · **buy** (currency packs → IAP + receipt validation + **restore**; cosmetics → spend currency).
**States:** detail · purchasing (success/fail/restore) · can't-afford → buy currency.

### 4.12 Wallet (`ECON-07`)
**Must host:** **balance** (prominent; can read negative after a refund reversal, `ECON-09`) · earn/spend **ledger** (history, incl. refund reversals) · **buy currency** (IAP packs). Reached via the header counter / Store.
**States:** balance · ledger (empty/populated) · buy-flow.

### 4.13 Welcome & Auth (`AUTH-01..05`, `AUTH-08/09/10`)
**Must host:**
- **Welcome/landing — the logged-out root:** a value-prop moment (the Device + Game Cards selling the fantasy) with **Create account**, **Sign in**, and **Sign in with Apple** (iOS-only). Invite links opened while signed out land here (`SOC-10`).
- **Register:** email + username + password, **inline ToS/Privacy acceptance** (`AUTH-10`), username-availability feedback (screened, `MOD-07`).
- **Login**; a **first** Apple sign-in runs a **choose-your-username completion step** before entering the app (`AUTH-09`).
- **Password reset** (request → email sent → confirm). Logout lives in Settings.
- **Verify-email touch:** a non-blocking post-signup notice + **resend** (`AUTH-08`); status also surfaces in Settings.
**States:** welcome · sign-in · sign-up (terms) · SIWA username-completion · reset-request/confirm · verify-email notice · error.

### 4.14 Onboarding (`AUTH-06`)
**Purpose:** land a new user on a populated, good-looking collection. **Skippable.**
**Must host (guided quick-start):** add a few games (with **empty-state suggestions**) · pick favourite genre(s) · optional **design/adopt a first card** · **invite-a-friend** nudge · a closing **push-permission pre-prompt** (value-framed, declinable — never the cold OS prompt; `NOTIF-04`).
**States:** step-by-step · skip · push pre-prompt · complete.

### 4.15 Settings
**Must host:** account (email/password · **username change**, cooldown-limited `PROF-06` · **email-verification status + resend** `AUTH-08` · **sign out** · **delete account** `AUTH-07`) · **privacy** (friends-only vs limited public, `PROF-03`) · **blocked users** (list + unblock, `SOC-09`) · **notification prefs** (`NOTIF-02`; incl. recovery guidance when the OS permission was declined, `NOTIF-04`) · **Help/Contact** (`SYS-09`) · about/legal (ToS + Privacy, `AUTH-10`).
**Not here:** display theming — the **screen theme** is device customization and lives in the **Device editor** (`DEV-04`).

### 4.16 Report (modal, `MOD-01`)
**Must host:** pick a **reason** → submit; on a card, catalog entry, or user → feeds the Admin console. Reporting a **user** also offers **Block** in the same flow (`SOC-09`).

---

*All screens are now specified. This document is ready to hand to Claude Design.*

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-08 | 0.1 | Initial draft: global design direction + the 5 tab screens. Detail screens/editors pending. |
| 2026-06-08 | 0.2 | Added detail screens: Add Game (4.1), adaptive Game page (4.2), Card editor (4.3 — `CARD-01..19`), Admin/Moderator console (4.4). Remaining screens pending (4.5). |
| 2026-06-08 | 0.3 | Specified all remaining screens (4.5–4.16): Device editor, Compare Hours, Lists/Top-5, Find/Add Friends, Contributor profile, Achievements, Store item detail, Wallet, Auth, Onboarding, Settings, Report. **All screens now specified.** |
| 2026-06-08 | 0.4 | Consistency-audit fixes: Collection tap → Game page (owned state); card-editor start-from = template/preset (not "remix"); store categories aligned to cosmetic taxonomy. |
| 2026-06-10 | 0.5 | Gap-review ripple (decision 0010): **Welcome/landing** + expanded Auth (terms acceptance, verify-email touch, SIWA username step); onboarding **push pre-prompt**; Friends request lifecycle (decline/cancel) + **block** entry points; profile friend-view **Report/Block** overflow; invite-link landing (4.8); card **unpublish/delete** (4.3); Settings additions (username change, verification, blocked users, Help/Contact, legal); report-user → block handoff (4.16); wallet refund reversals (4.12); offline-graceful principle (1.7). |
| 2026-06-10 | 0.6 | Mockup-review direction: the privacy/visibility control (`PROF-03`) is **not** on the Profile header — it lives in Settings (4.15). §3.5 gains the explicit "Not here." |
| 2026-06-10 | 0.7 | Mockup-review formalization (decision 0011): Collection gains the **Now Playing hero** (+ log-hours, + unset nudge state) per WTP-03; manual-ordering interaction flagged as `OQ-031`; Profile stats gain optional **percentile chips** (`PROF-07`, chip-optional tiles). |
| 2026-06-10 | 0.8 | Decision 0012 ripple: Collection **view-mode definitions** (shelf / compact grid / dense list); new §1.8 **feedback & error-surfacing pattern**; §1.6 **friend-chrome toggle** (OQ-012 resolved — default own chrome, opt-in swap); Device editor gains **screen theme** (`DEV-04`) + Settings "Not here." |
| 2026-06-11 | 0.9 | Decision 0013 ripple: §3.1 **shelf** mode carries a per-game stats eyebrow (`OQ-033`), so the dense-list rationale shifts from "only mode with stats" to "densest scan." |
| 2026-06-11 | 0.10 | Decision 0015 ripple: **share card image** (`CARD-21`) on the Game page owned state (4.2) and at the card-editor reveal (4.3); reveal/celebration pattern tracked as `OQ-040`. |
| 2026-06-12 | 0.11 | Decision 0016 ripple: **community presence stats** (`CAT-09`) in search results (4.1) + on the Game page (4.2 — presence pulled forward; richer aggregates stay later-phase). |
