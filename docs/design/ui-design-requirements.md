# InGame — UI/UX Design Requirements

> The brief for **Claude Design**. For each surface, this states *what the user must be able to do*
> (referenced to stable feature IDs in [`../spec/product-spec.md`](../spec/product-spec.md)) and the
> **design direction** — not pixel layouts. Claude Design owns the resulting `design-spec.md` (the
> "how it looks/feels"). Behavior questions raised while designing go to
> [`../open-questions.md`](../open-questions.md), not edited into the spec directly.

**Version:** 0.1 (in progress) · **Last updated:** 2026-06-08 · **Owner:** Claude Code → Claude Design
**Status:** the **5 tabs** are specified; the **detail screens & editors** (Part 4) are pending the ongoing walkthrough.

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
| — | Add Game · Game Detail · Collection Entry Detail | Flow/detail | *Part 4 (pending)* |
| — | Card editor · Card gallery/adopt · Device editor | Editors | *Part 4 (pending)* |
| — | Compare Hours · Lists/Top-5 editor · Find/Add Friends | Social detail | *Part 4 (pending)* |
| — | Contributor profile · Achievements | Pride | *Part 4 (pending; reached from Profile)* |
| — | Store item detail/purchase · Wallet | Commerce | *Part 4 (pending)* |
| — | Auth · Onboarding · Settings · Report | System | *Part 4 (pending)* |

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

## Part 4 — Detail screens & editors (PENDING walkthrough)

To be specified next, in this order: **Add Game → Game Detail → Collection Entry Detail → Card editor (the big one) → Card gallery/adopt → Device editor**, then **Compare Hours · Lists/Top-5 editor · Find/Add Friends · Contributor profile · Achievements · Store item detail/purchase · Wallet · Auth · Onboarding · Settings · Report.**

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-08 | 0.1 | Initial draft: global design direction + the 5 tab screens. Detail screens/editors pending. |
