# InGame — UI/UX Design Requirements

> The brief for **Claude Design**. For each surface, this states *what the user must be able to do*
> (referenced to stable feature IDs in [`../spec/product-spec.md`](../spec/product-spec.md)) and the
> **design direction** — not pixel layouts. Claude Design owns the resulting `design-spec.md` (the
> "how it looks/feels"). Behavior questions raised while designing go to
> [`../open-questions.md`](../open-questions.md), not edited into the spec directly.

**Version:** 0.3 · **Last updated:** 2026-06-08 · **Owner:** Claude Code → Claude Design
**Status:** **ALL screens specified** (5 tabs + 16 detail screens/flows). Ready to hand to Claude Design. Open design notes live in `open-questions.md` (`OQ-005/006/007`).

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

### 1.7 Always-on principles
- **Every session pays off fast; no empty states left dead** — design inviting empties (esp. new users + a community catalog that starts sparse).
- **Accessibility:** dynamic type + adequate contrast on functional UI, despite heavy theming.

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
| — | Auth · Onboarding · Settings · Report | System | **specified** (4.13–4.16) |

---

## Part 3 — Tab screens (specified)

### 3.1 Collection (home)
**Purpose:** your library, inside your Device — the heart + showcase. **Personas:** Curator, Completionist.
**Must host:**
- Your **Device frame** (persistent chrome) with **Game Cards scrolling within** (`DEV-01`, `COL-07`).
- **View toggle:** device/shelf ↔ list/grid (`COL-07`).
- **Sort & filter:** genre / status / hours / recently-added, with an **ASC/DESC toggle**; plus **manual ordering** (`COL-07`).
- **Collection search** scoped to your library, matching **title + developer/publisher** (`COL-09`).
- **Add-game** entry point (→ Add Game).
- Card **face = art + title only**; tap → Collection Entry Detail.
**Not here:** summary stats (they live on Profile).
**Modes:** your own (editable) + **friend-view read-only** (`COL-10`).
**States:** empty (inviting first-add nudge) · populated (must scale gracefully inside the frame) · loading.

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
- **Requests** (incoming/outgoing).
- **Find/add friends:** **username search** + **invite link** + **QR code**; *no contacts-matching* (`SOC-07`).
- Jump-off to **Compare Hours** (`SOC-03`).
**States:** no friends (invite hook) · pending requests · quiet vs active feed.

### 3.4 Store
**Purpose:** acquire cosmetics + currency (monetization). **Persona:** Curator/spender.
**Must host:**
- Featured **Drops** + category sections (Effects · Stickers · Devices · Frames · Currency) (`COSM-01`, `ECON-08`).
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
- **Stats:** collection summary + **headline clout stats** (cards designed, total adoptions received) + **member-since** (`PROF-04`).
- **Showcase:** **Top-5** (five Game Cards; **tapping = gateway into the collection**), **Now Playing** (`WTP-03`).
- **Gateways:** teasers + links to **Achievements** (`ACH-05`) and **My Contributions** (`CAT-07`) — reachable from here only.
- **Settings** + **Edit profile** entries.
**Friend-view mode** adds: **friend count + mutual friends**, **Add friend / Compare hours** actions, **Share profile** (`SOC-07`); hides edit/management (`PROF-05`).
**Design note:** the exact visual **hierarchy** (what reads first) is yours to finalize; intent is Device/collection hero → identity → stats → Top-5 → teasers.
**States:** self vs friend-view · edit mode · privacy-limited view.

---

## Part 4 — Detail screens & editors

### 4.1 Add Game (flow)
**Purpose:** get a game into your collection (and the catalog when it's new). **Personas:** everyone; Contributor.
**Must host:**
- **Search** the community catalog (`CAT-01`); results show **title + release year + developer studio + a representative card + an "in your collection" marker**.
- **Empty-state suggestions** (recently-added / popular / friends' games) — never a blank box.
- **Exists →** add with an **all-status picker** (`COL-01/02`), then an **offered (not forced)** card step (else default placeholder, `CARD-18`).
- **Missing →** **Create canonical entry** (name/genre/studio/publisher/release) with **fuzzy dedup** (`CAT-03`) → "be first to design its card."
- **Add & continue** (quick multi-add); **Report duplicate** from a result (→ admin dedup, `MOD-01/05`).
**States:** searching · results · no-results (→ create) · creating (dedup) · added (→ card step).

### 4.2 Game page (adaptive — shared page + owned state)
**Purpose:** the **shared community page** for a canonical game; when you own it, your personal details take precedence. **One screen, two states** — Collection Entry Detail folds in here.
**Shared content:** canonical facts + **contributor credit** (`CAT-02/05`); **tappable genre/studio** (`DISC-02`); **community card gallery + adopt** and **design a card** (`CARD-04`, `ECON-03/04`); **add to collection / Up Next** (`WTP-02`); **recommend to a friend** (`SOC-05`); **friends-who-own + hours**; **suggest edit** (`CAT-06`); **report incl. duplicate** (`MOD-01`); **upcoming → notify me** (`DISC-01`, `NOTIF-01`); **community aggregate stats — later phase**.
**Owned state (takes precedence):** your **hours / % / status / owned-since / rating / notes** (editable) + **selected card + card switcher** (`COL-03/06`); **Now Playing** (`WTP-03`).
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
- **Drafts/lifecycle:** Draft state, autosave + crash recovery, unsaved-exit guard, duplicate (`CARD-14`).
- **Save private vs Publish** → flatten to one image + true-preview + thumbnail safe-area (`CARD-04/15`); **publish integrity** (`CARD-19`).
- **Approachability/a11y:** start-from (remix-a-community-card / template), **auto-design "Surprise me"**, preset kits, coachmarks; **break-out** to max canvas; screen-reader + non-gesture path; reduce-motion (`CARD-16`).
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

### 4.5 Device editor (`DEV-01..03`)
**Purpose:** customize your Device shell (the app/profile frame). **Persona:** Curator. **Lighter than the card editor.**
**Must host:** **model selection** (own/switch; free default device always renders) · **shell colour** · **sticker placement** (place/scale/rotate from the library; free + premium **preview-then-acquire**). **Personal only** (not published/adopted). **Hard rule:** decoration must never obscure navigation.
**States:** editing · premium-reconcile · model switch.

### 4.6 Compare Hours (`SOC-03`)
**Purpose:** friendly comparison. Reached from a friend's profile/Friends.
**Must host:** per-game **hours side-by-side** (games you both own) · **total hours** · **total games** (collection size) · who's-ahead · **friends leaderboard**. *(Completion % out for v2.)*
**States:** has-overlap vs no-shared-games · loading.

### 4.7 Lists / Top-5 editor (`SOC-04`)
**Purpose:** curate your Top-5. **v2 = Top-5 only** (general lists parked).
**Must host:** pick ≤ 5 games **from your collection**, **order** them (shown as Game Cards), share.
**States:** empty · editing · full (5).

### 4.8 Find / Add Friends (`SOC-07`)
**Must host:** **username search** → send request · your **invite link + QR** · **incoming/outgoing requests**. (No contacts-matching.)
**States:** searching · results · request sent/pending.

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
**Must host:** **balance** (prominent) · earn/spend **ledger** (history) · **buy currency** (IAP packs). Reached via the header counter / Store.
**States:** balance · ledger (empty/populated) · buy-flow.

### 4.13 Auth (`AUTH-01..05`)
**Must host:** **register** (email + username + password) · **login** · **Sign in with Apple** · **password reset** · logout.
**States:** sign-in · sign-up · reset-request/confirm · error.

### 4.14 Onboarding (`AUTH-06`)
**Purpose:** land a new user on a populated, good-looking collection. **Skippable.**
**Must host (guided quick-start):** add a few games (with **empty-state suggestions**) · pick favourite genre(s) · optional **design/adopt a first card** · **invite-a-friend** nudge.
**States:** step-by-step · skip · complete.

### 4.15 Settings
**Must host:** account (email/password, **sign out**, **delete account** `AUTH-07`) · **privacy** (friends-only vs limited public, `PROF-03`) · **notification prefs** (`NOTIF-02`) · about/legal.

### 4.16 Report (modal, `MOD-01`)
**Must host:** pick a **reason** → submit; on a card, catalog entry, or user → feeds the Admin console.

---

*All screens are now specified. This document is ready to hand to Claude Design.*

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-08 | 0.1 | Initial draft: global design direction + the 5 tab screens. Detail screens/editors pending. |
| 2026-06-08 | 0.2 | Added detail screens: Add Game (4.1), adaptive Game page (4.2), Card editor (4.3 — `CARD-01..19`), Admin/Moderator console (4.4). Remaining screens pending (4.5). |
| 2026-06-08 | 0.3 | Specified all remaining screens (4.5–4.16): Device editor, Compare Hours, Lists/Top-5, Find/Add Friends, Contributor profile, Achievements, Store item detail, Wallet, Auth, Onboarding, Settings, Report. **All screens now specified.** |
