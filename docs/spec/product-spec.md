# InGame — Product Specification

> The behavioral source of truth: **what InGame does**, its data model, rules, and economy.
> Screens and visuals are owned by the design-spec; endpoint shapes by the api-contract. This
> document references those by ID. See [`../00-INDEX.md`](../00-INDEX.md) for the working agreement.

**Version:** 0.7 (draft) · **Last updated:** 2026-06-08 · **Owner:** Claude Code

---

## 1. Vision

InGame is a **mobile-first** app where a gamer builds a personalized, beautifully-customizable
**collection** of the games they play — presented like a retro arcade-styled trophy case — and
shares it with friends. Its center of gravity is **Showcase × Social**: a collection worth being
proud of, and friends to show it to, with a lightweight **discovery** layer for what to play next
and what's coming.

The catalog of games is **community-owned**: there is no external game database. Users add the
games (and create the canonical entries and the cover-art "Game Cards"), which gives the app a
collaborative, credit-driven community character on top of each person's private collection.

### Defining constraint
InGame is a **low-frequency, high-investment** app. People open it after buying a game, finishing a
game, getting a friend notification, or wanting to tinker with their collection's look — not daily.
Therefore:

> **Every session must pay off fast and show something fresh.** No empty states, no chores.

### The north-star persona
The **Curator** comes first. Collection-as-art is the soul of the product; social, discovery, and
the store all exist to make a collection worth showing off.

---

## 2. Personas

| Persona | Loves | Return trigger |
|---|---|---|
| **Curator** 🎨 *(north star)* | Making the collection *look* incredible — perfecting Cards, decorating the Device | New game to style; new cosmetics; "your card was adopted Nx" |
| **Completionist** 📊 | Tracking hours/%/status; deciding what to play next | Finished a game → log it; What-to-Play planning |
| **Socializer** 🤝 | Friends — comparing hours, sharing Top-5s, seeing what friends play | Friend activity & comparison notifications |
| **Contributor** 🏛️ | Being *first* to add a game; filling fields; designing cards others adopt | New/obscure games to catalog; their growing contribution profile |
| **Casual returner** 🌙 | Dips in occasionally (installed via a friend) | Push: a wishlisted game released; a friend passed their hours |
| **Artist** 🖌️ *(secondary, partially future)* | Wants to *draw* original card art | Served partially now via layered creation; full drawing suite is parked (§11) |

Most real users are a blend; naming them keeps each feature honest about who it serves.

---

## 3. Core principles

1. **Curator-first.** When trading off, favor what makes a collection beautiful and showable.
2. **Every session pays off fast.** Open → see something fresh → do one satisfying thing → leave happy.
3. **Community-owned data, light-touch governance.** Users build the catalog; we add only fuzzy
   dedup and a report/hide safety valve — no heavy moderation apparatus.
4. **Mobile-first.** Designed for iOS/Android (haptics, effects, push, native share). Web is **not a shipped product surface** for v2 — but the Expo web build is used as a **development/testing convenience** (Chrome), so functional UI should not gratuitously break on web.
5. **Greenfield.** No prototype code is reused — only lessons and the retro aesthetic as reference.
6. **Economy tuned for spread, then revenue.** Early generosity spreads premium aesthetics; values are server-configurable.

---

## 4. Glossary

- **Catalog entry (canonical game)** — one shared record per real game (`CAT-`). Community-created.
- **Collection entry** — a game in *your* personal library, with your private stats (`COL-`).
- **Game Card** — the customizable visual design for a game: art + effects + stickers + colours + frame (`CARD-`).
- **Device** — your customizable shell/container; the "frame" of your profile (`DEV-`).
- **Adoption** — using another user's published Card design for a game in your collection (`ECON-`/`CARD-`).
- **Customizer currency** — soft currency spent to adopt premium cards; earned or purchased (`ECON-`).
- **Contributor profile** — the public record of what you've added to the community catalog (`CAT-`).

---

## 5. Feature specification

Priority: **P0** = core, can't ship without · **P1** = important to the vision · **P2** = valuable fast-follow.

### 5.1 System & cross-cutting (`SYS-`)
| ID | Pri | Behavior |
|---|---|---|
| SYS-01 | P0 | All data access is **ownership-scoped**: a user can only read/modify their own collection, profile, device, wallet, and private cards. (Fixes the prototype's cross-user vulnerability.) |
| SYS-02 | P0 | All write requests are **validated** server-side (types, ranges, required fields) before persistence. |
| SYS-03 | P0 | API base URL and all secrets are **environment-configured**, never hardcoded. |
| SYS-04 | P0 | Economy and tuning values (starting balance, login bonus, adoption cost, milestone thresholds) are **server-configurable** without an app release. |
| SYS-05 | P1 | Sensitive/abuse-prone endpoints (auth, create-entry, **card publishing**, report) are **rate-limited**. |
| SYS-06 | P0 | An **automated testing harness + CI** exist from Phase 1 (before feature code). Approach: risk-based, meaningful-tests-first — see [`testing-strategy.md`](testing-strategy.md). |
| SYS-07 | P0 | **Every mutating endpoint carries a standing authorization test** proving a user cannot read/modify another user's resource (enforces SYS-01). |
| SYS-08 | P1 | Users have a **role** (user / moderator / admin). Moderator/admin tools (the Admin console, MOD-04) are gated to the role. |

### 5.2 Authentication & identity (`AUTH-`)
| ID | Pri | Behavior |
|---|---|---|
| AUTH-01 | P0 | Email + password registration; **email is required and unique**; passwords are required and hashed (argon2/bcrypt). |
| AUTH-02 | P0 | Login returns a short-lived **access token** + a **refresh token**; the client silently refreshes. (Fixes the prototype's 1-hour hard expiry.) |
| AUTH-03 | P0 | **Sign in with Apple** (required by App Store policy once any social/third-party login exists). |
| AUTH-04 | P0 | Password reset via email. |
| AUTH-05 | P1 | Logout invalidates the refresh token. |
| AUTH-06 | P1 | **Guided quick-start onboarding** after signup (skippable): add a few games (with empty-state suggestions), pick favourite genre(s), optionally design/adopt a first card, and an invite-a-friend nudge — lands the user on a populated collection. |
| AUTH-07 | P0 | **Account deletion** (with data deletion/anonymization) available in Settings. |

### 5.3 Profile (`PROF-`)
| ID | Pri | Behavior |
|---|---|---|
| PROF-01 | P0 | Profile holds: username (unique), avatar, short bio, **favourite genre(s)**, and a **pinned favourite game** (shown as its Game Card). |
| PROF-02 | P0 | **Gamertags**: a user lists handles per platform (controlled platform list, e.g. PC/PlayStation/Xbox/Nintendo). **Managed from the Profile.** |
| PROF-03 | P0 | **Privacy setting**: friends-only (default) vs. limited public profile. Governs what non-friends can see. |
| PROF-04 | P1 | Profile shows **collection summary stats** (total games, total hours, completion rate), **headline clout stats** (cards designed, total adoptions received), and a **member-since** date. |
| PROF-05 | P0 | The Profile is a **showcase with two modes**: your own (editable) and a **friend-view** (read-only, privacy-gated, PROF-03). It surfaces the **Device** (hero), **Top-5** (the gateway into that person's collection, COL-10), **Now Playing** (WTP-03), **friend count + mutual friends**, **Share profile** (SOC-07), and teasers to Achievements (ACH-05) + My Contributions (CAT-07). Friend-view exposes **Add friend / Compare hours** (SOC-03) actions. |

### 5.4 Catalog & contribution (`CAT-`)
| ID | Pri | Behavior |
|---|---|---|
| CAT-01 | P0 | **Search** the community catalog by title. No external database is used. |
| CAT-02 | P0 | **Create a canonical entry** when a game is missing: fields are **name (required), genre(s), studio/developer (optional), publisher (optional), release date (optional)**. No `platforms` or `description` on the shared entry (avoids edit-wars). |
| CAT-03 | P0 | **Fuzzy dedup at creation**: warn "did you mean *Elden Ring*?" to prevent duplicate canonical entries. |
| CAT-04 | P0 | Genres come from a **controlled list** (not free text). |
| CAT-05 | P0 | The creator of an entry is **credited as its contributor**. |
| CAT-06 | P1 | Users may **suggest edits** to canonical fields, with attribution; lightweight, not a wiki-war surface. |
| CAT-07 | P1 | **Contributor profile ("My Contributions")** — games you brought to the catalog, fields you added, cards you designed, with adoption/usage stats; **friend-viewable** (subject to privacy, PROF-03); **stats + achievement badges, no separate level system**. (Contributor pride surface.) |
| CAT-08 | P1 | **Upcoming games** exist purely as catalog entries with a future release date (community-entered). |

### 5.5 Collection (`COL-`)
| ID | Pri | Behavior |
|---|---|---|
| COL-01 | P0 | Add/remove a catalog game to/from **your** collection. |
| COL-02 | P0 | Per-game **status**: Backlog · Playing · Beaten · Completed 100% · Dropped · Wishlist. |
| COL-03 | P0 | Per-game stats: **hours played** (manual; `hours_source` import-ready), **% complete**, **owned since** (date acquired), **personal rating**. Hours and owned-since drive the two key Collection sorts (COL-07). |
| COL-04 | P0 | Per-game **personal platform(s)** — which platform(s) *you* own/play it on (private; pairs with gamertags). |
| COL-05 | P1 | Per-game **private notes**. |
| COL-06 | P0 | **Card switcher on a collection entry**: effortlessly flip the displayed Card for a game between (a) cards you created for it, (b) cards you adopted/downloaded for it, and (c) "create new." Your library look is never locked in. |
| COL-07 | P0 | Collection views: a **Device/shelf view** (cards) plus list/grid. **Sort** by hours, owned-since (chronological), title, or recently-added — each with an **ASC/DESC toggle**; **filter** by genre/status; plus **manual ordering** (a user-arranged order). |
| COL-08 | P1 | Collection stats summary (feeds PROF-04). |
| COL-09 | P1 | **Collection search**: search within *your own* collection, matching **title and developer/publisher**. (Distinct from the global catalog search, CAT-01 / DISC-03.) |
| COL-10 | P0 | The Collection screen has **two modes**: your own (the editable tab) and a **friend-view** (read-only, privacy-gated) reached from a friend's Profile via their Top-5 (PROF-05). One screen, two modes. |

### 5.6 Game Card customization (`CARD-`)
> The Card editor is the heaviest screen and the soul of the Curator experience. Mandate: **dense
> functionality must feel effortless**. Detailed interaction design is Claude Design's; this lists what
> it must do.

| ID | Pri | Behavior |
|---|---|---|
| CARD-01 | P0 | A **Card editor**, launched for a specific game, composes the card **front** as layers (the **back is a standardized** auto-stats layout): *optional colour/gradient base → vector elements → one animated effect → finish → frame → title.* Trading-card portrait. |
| CARD-02 | P0 | Art is **in-app vector composition** — placeable **vector primitives** (shapes, letters, numbers, icons/SVGs; free + premium packs) positioned/scaled/rotated/recoloured/layered, plus an optional colour/gradient base. **No image uploads. No AI art.** ("Stickers" and "art assets" are unified as vector elements.) |
| CARD-03 | P0 | With no uploads, moderation is **report/hide on published cards** (MOD-01/02) + **text/glyph screening** on user-entered text (MOD-07) — no upload-review pipeline. |
| CARD-04 | P0 | **Save private** (your collection only) or **Publish** to the community; published cards are **adoptable** and retain **designer attribution**. |
| CARD-05 | P1 | A card tracks **adoption count / popularity**; the editor surfaces a creator's adoptions, **clout**, and **milestone progress** (ECON-05, ACH) — a lightweight creator dashboard. |
| CARD-06 | P0 | A card is **premium** if its composition includes any premium asset/effect/finish (derived flag) — drives adoption cost (ECON-03). |
| CARD-07 | P0 | **The Game Card is the universal visual representation of a game** everywhere — collection shelf, Top-5, pinned favourite, friend showcases, recommendations — always the owner's *selected* card (COL-06). |
| CARD-08 | P0 | **Element management:** a **layers panel** (reorder z-order, select, rename, lock, hide, duplicate, delete) + stacked-tap disambiguation; **multi-select + group/ungroup**; explicit bring-forward/back. |
| CARD-09 | P0 | **Precision on a small canvas:** **pan/zoom** the canvas (distinct from scaling an element); **snapping / smart-guides / align / distribute**; **nudge + numeric** transform input; surfaced **undo/redo** + scoped reset. |
| CARD-10 | P1 | **Per-element creative controls:** opacity, solid/gradient fill, stroke/outline, shadow & glow, flip/mirror, blend modes, corner-radius/parametric shapes. *(Heavy ops — clip-to-shape masking, boolean, pattern/array — parked, §10.)* |
| CARD-11 | P1 | **Colour & type system:** saved palettes/swatches/recents/favourites + **eyedropper** + curated theme palettes; categorized **fonts** (free + premium) with text-styling parity (spacing/align/case) and **curved/arc text**. |
| CARD-12 | P0 | **Effects & finish:** **one animated effect** at a time (frost/fire/galaxy/raining-blood…) with intensity/opacity; plus a **separate stackable finish** layer (holo/foil/metallic, optionally tilt-reactive). Both free + premium. |
| CARD-13 | P0 | **Premium-in-editor = preview-then-acquire:** apply premium items to preview live (visibly flagged); at **publish/keep**, a **reconcile step** (acquire all / remove) with the **buy-currency** path surfaced at the point of intent. |
| CARD-14 | P0 | **Drafts & lifecycle:** an explicit **Draft** state + drafts shelf; **autosave + crash recovery**; **unsaved-exit guard**; **duplicate / save-as-copy**. |
| CARD-15 | P0 | **Render/publish pipeline:** the editable **composition (JSON)** is **flattened to a static image** (thumbnail + full) on the CDN at save/publish — **viewers download one image, not the layers**; the **effect + finish render as runtime overlays**; **element count is capped** (server-configurable, SYS-04). A **true-to-life preview** (flattened + overlays + thumbnail safe-area) precedes publish. Rendering via react-native-skia. |
| CARD-16 | P0 | **Approachability & accessibility:** **start-from** (remix a community card / a template) — never a blank canvas — plus **auto-design "Surprise me"**, preset kits, coachmarks; the editor may **break out** to maximal canvas (OQ-007); **screen-reader labels + a non-gesture path**; honor **reduce-motion**. |
| CARD-17 | P1 | **Asset library at scale:** the vector/effect/frame/font browser is **searchable, categorized, tagged**, with **free/premium/owned** filters, recently-used, and favourites; premium items **preview on the actual card**. |
| CARD-18 | P0 | **Default-card guarantee:** every collection entry **always resolves to a card** — the owner's selected card → else another card they have for that game → else a **system default placeholder**. No game ever renders blank. (Used by new-game add, the card switcher, and moderation-takedown fallback, MOD-08.) |
| CARD-19 | P0 | **Publish integrity:** publishing is **rate-limited** (SYS-05), **deduped by composition-hash**, and gated by a **minimum-complexity threshold** (drafts/private exempt) — keeps the adoptable pool clean. |

### 5.7 Device customization (`DEV-`)
| ID | Pri | Behavior |
|---|---|---|
| DEV-01 | P0 | A **Device editor** (lighter than the card editor): **shell colour** + **sticker placement** (place/scale/rotate stickers from the library; free + premium via preview-then-acquire) — *not* the full card vector toolkit. **Personal only** — devices are not published/adopted. |
| DEV-02 | P1 | Users may own multiple **device models** (cosmetic items) and switch the active one. |
| DEV-03 | P0 | A free **default device** always renders (no broken shell); device decoration must **never obscure navigation** (the nav-on-plastic model). |

### 5.8 Cosmetics library (`COSM-`)
| ID | Pri | Behavior |
|---|---|---|
| COSM-01 | P0 | A library of cosmetic items typed as: **vector asset pack** (shapes/letters/numbers/icons) · **effect** · **finish** (holo/foil) · **frame** · **font** · **device skin** · **device model**. (Card "stickers/art assets" are vector packs.) |
| COSM-02 | P0 | A **free baseline** set is always available so everyone can customize meaningfully. |
| COSM-03 | P0 | Premium items are gated by **entitlement** (owned via purchase or earned). The store's moat = **things you can't just draw** (animated/dynamic effects, curated packs). |
| COSM-04 | P1 | Some cosmetics are **earned**, not bought — delivered via the achievement system (ACH-04), including **achievement-exclusive** items that are never purchasable (prestige). |

### 5.9 Economy & store (`ECON-`)
| ID | Pri | Behavior |
|---|---|---|
| ECON-01 | P0 | **Single soft currency, two spend types.** Real money **only ever buys Customizer currency**; premium cosmetics are never sold for real money directly. Currency is then spent on **(a) adopting premium cards** (ECON-03) and **(b) acquiring premium effects/asset packs** to create your own (priced higher). One wallet, one mental model. |
| ECON-02 | P0 | Every user starts with **5 Customizer currency**; earns more via **login bonuses / milestones**; can **purchase** more. (Values server-configurable per SYS-04.) |
| ECON-03 | P0 | **Adopting a premium card costs 1 Customizer currency.** Adopting a **non-premium** card is **free**. |
| ECON-04 | P0 | **Scoped adoption rights.** Adopting a premium card grants the right to use **that design for that game only**. It does **not** grant the standalone premium effect for reuse elsewhere (protects effect sales). |
| ECON-05 | P0 | **Creator reward = clout (v2 choice "A").** When a creator's premium card is adopted, the creator earns **adoption-count, contributor prestige, and cosmetic unlock milestones** (delivered via the achievement system, ACH-04) — *not* currency or money. *(Future toggle "B" — currency kickback — is noted in decisions; real revenue-share is parked, §11.)* |
| ECON-05a | P2 | *(reserved)* Currency-kickback to creators — a future-toggle of ECON-05, off in v2. |
| ECON-06 | P0 | **In-app purchases via Apple/Google IAP** with server-side **receipt validation** and **restore purchases**. Implemented via a cross-platform IAP layer (RevenueCat — see api-contract / decisions). |
| ECON-07 | P0 | A **wallet** holds the currency balance; a **ledger** records every change (login bonus, purchase, adoption spend, milestone) for auditability **and is shown to the user** as a simple earn/spend history. The wallet (balance + ledger + buy-currency) is **surfaced on the Store screen**; the persistent header counter is its entry point elsewhere. |
| ECON-08 | P2 | **Limited/seasonal drops** in the store as a return hook. |

### 5.10 Social (`SOC-`)
| ID | Pri | Behavior |
|---|---|---|
| SOC-01 | P0 | **Mutual friends**: request/accept; a friends list. (Public follow graph is parked, §11.) |
| SOC-02 | P0 | **Friend profile view** = the friend-view mode of the Profile/Showcase (PROF-05): Device, Top-5 (gateway into their read-only collection, COL-10), stats, Now Playing, achievement teasers; exposes **Add friend / Compare hours**. |
| SOC-03 | P0 | **Compare** with a friend: per-game + total **hours**, **total games** (collection size), who's ahead, + friend leaderboards. (Core return-driver.) |
| SOC-04 | P0 | **Top-5 lists** — create and share. (Extensible to other list types later.) |
| SOC-05 | P1 | **Recommend a game to a friend** — drops into their What-to-Play with a note (`WTP-`). |
| SOC-06 | P1 | A **gentle activity feed** (on the Friends tab): friend beat/completed a game, published a card, unlocked a notable achievement. **Deliberately low-noise** — events are **aggregated by actor+type** ("Alex added 12 games" as one capped item), the **initial collection import does not flood the feed**, and trivia (minor stat tweaks) is excluded. |
| SOC-07 | P1 | **Find & invite friends**: search by **username**, a **shareable invite link**, and a **QR code** for in-person adds. (No contacts-matching in v2.) |

### 5.11 What to Play (`WTP-`)
| ID | Pri | Behavior |
|---|---|---|
| WTP-01 | P0 | A ranked **"Up Next" queue**, drag-to-reorder, that spans **owned games and unowned games** (a catalog game you don't own = effectively a wishlist item here). |
| WTP-02 | P0 | Items can be added from your collection, from discovery, or from a friend's recommendation (SOC-05). |
| WTP-03 | P2 | A single **"Now Playing" pin** — one game you're actively on (distinct from the multi-valued `Playing` status, COL-02); settable from Up Next **or** a collection entry, and surfaced on the Profile (PROF-05). Plus the queue is shareable. |

### 5.12 Discovery (`DISC-`)
| ID | Pri | Behavior |
|---|---|---|
| DISC-01 | P1 | **Upcoming** — browse catalog entries with a future release date. |
| DISC-02 | P1 | **Browse by genre / studio.** |
| DISC-03 | P1 | **Search games** (global catalog). People-search lives in Social (SOC-07), not here. |
| DISC-04 | P2 | **Trending / featured community cards** — showcases great Curator work and inspires. |
| — | — | *(No algorithmic "recommended for you" engine in v2 — explicitly cut.)* |

### 5.13 Notifications & engagement (`NOTIF-`)
| ID | Pri | Behavior |
|---|---|---|
| NOTIF-01 | P0 | **Push notifications** (Expo push) tuned to each persona's return trigger: friend activity/comparison, wishlisted game released, your card adopted Nx, new store drop. |
| NOTIF-02 | P0 | Per-type **notification preferences** the user controls. |
| NOTIF-03 | P1 | **No standalone notifications center.** Each notification has a **contextual in-app home** (requests→Friends, releases→Up Next, adoptions→Profile, drops→Store); push handles real-time delivery. The rare orphan (a moderation outcome) surfaces as a one-off banner / Settings line. |

### 5.14 Moderation & admin (`MOD-`)
| ID | Pri | Behavior |
|---|---|---|
| MOD-01 | P0 | **Report/hide** on published cards and catalog entries (incl. "report duplicate") — the light-touch safety valve. |
| MOD-02 | P0 | Reported content can be **soft-hidden** pending review (threshold auto-hide). |
| MOD-03 | P1 | A minimal review queue. |
| MOD-04 | P1 | An **Admin/Moderator console** (gated to the role, SYS-08) is the home for: the reports queue, edit-suggestion review (MOD-06), and catalog dedup/merge (MOD-05). |
| MOD-05 | P1 | **Catalog dedup = merge then soft-delete.** A moderator merges a duplicate game into the canonical entry — **re-pointing collection entries + cards** so no user is orphaned — then the empty duplicate is **soft-deleted with a 3-day restore window** before a scheduled purge. |
| MOD-06 | P1 | **Edit-suggestions** (CAT-06) are approved/rejected in the console. |
| MOD-07 | P0 | **Text/glyph screening** runs a banned-word pass on all user-entered text — card titles, freeform letters, and game names at creation. |
| MOD-08 | P0 | **Entitlement-loss / takedown policy:** if a premium asset behind a published card disappears, the **flattened card persists and existing adopters keep their grant**; the asset becomes **non-re-acquirable**. **Exception:** a **moderation/legal pull** actively **hides** affected cards, which then **fall back** per the default-card guarantee (CARD-18). |

### 5.15 Achievements & easter eggs (`ACH-`)
> The **system** is specified here; the specific achievement/egg **content** is a later brainstorm (OQ-004).
> Shipping the engine in v2 is deliberate — it avoids retrofitting event plumbing and back-granting
> retrospective achievements later. **Design rule for content:** prestigious achievements must key off
> signals a user *can't self-inflate* (others' adoptions, contributions, friendships) — not self-reported
> status like "beaten" (which mass-marking could farm).

| ID | Pri | Behavior |
|---|---|---|
| ACH-01 | P1 | Achievement system with **data-driven, server-configurable definitions** (trigger condition + reward + visibility). New achievements/eggs ship **without an app release** (per SYS-04). |
| ACH-02 | P1 | An **event-driven trigger engine** evaluates domain events (friend added, game added, entry contributed, entitlement acquired, card published/adopted, …) against conditions. Unlocks are **idempotent** — once per user, not farmable by repeating an action. |
| ACH-03 | P1 | Two visibility types: **milestone** (visible, shows progress, e.g. "7/10 games") and **easter egg** (hidden until unlocked — a surprise). |
| ACH-04 | P1 | **Rewards**: a badge/clout (default), and optionally **Customizer currency** and/or a **cosmetic entitlement** — including **achievement-exclusive cosmetics** that are *earnable only, never purchasable* (prestige that doesn't cannibalize the store). Reuses wallet/ledger (ECON-07) + entitlements (COSM-03). All reward values server-configurable. |
| ACH-05 | P1 | Earned achievements/badges **display on the profile** as a showcase/flex surface (subject to privacy, PROF-03). |
| ACH-06 | P1 | An unlock fires a **notification + in-app celebration moment** (NOTIF-01) — on-brand for the arcade aesthetic. |
| ACH-07 | P2 | Easter eggs may **target specific entities** (a specific catalog game, a specific user) via data-driven definitions. |
| ACH-08 | P1 | A **domain-event emission convention** is established in **Foundation (Phase 1)** so every feature emits the events the engine consumes — this is what lets achievements ship in v2 with **no retrofit and no retrospective back-granting**. |

---

## 6. Data model (entity overview)

Authoritative field-level shapes live in [`api-contract.md`](api-contract.md); this is the entity map.

- **Identity:** `users` (unique email, password hash, avatar, bio, privacy, **role**, **favourite_game_id**, **created_at** → member-since) · `auth_identities` (Apple/OAuth subs) · `gamertags` (handle + controlled platform)
- **Catalog:** `games` (name, normalized_name, release_date?, studio?, **publisher?**, created_by, **deleted_at?/deleted_by?** for dedup grace) · `genres` (controlled) · `game_genres`
- **Collection:** `collection_entries` (user×game: status, hours, hours_source, percent_complete, date_purchased, rating, notes, active_card_design_id) · `collection_platforms` (entry × controlled platform)
- **Cards:** `card_designs` (game, creator, visibility, **composition JSON (vector elements)**, **rendered_image_url + thumbnail_url**, **effect/finish ids**, is_premium, **composition_hash**, adoption_count, moderation_status) · `card_adoptions` (adopter × design × game, currency_paid)
- **Device:** `device_configs` (user: active_model, shell_colour, sticker_composition JSON)
- **Cosmetics:** `cosmetic_items` (type ∈ vector_pack/effect/finish/frame/font/device_skin/device_model, is_premium, price) · `cosmetic_packs` · `user_entitlements` (user × item, source)
- **Economy:** `wallets` (balance) · `currency_ledger` (delta, reason, ref) · `store_products` (IAP product → grant) · `iap_receipts` (validated)
- **Social:** `friendships` (requester/addressee, status) · `lists` + `list_items` (Top-5 = capped list) · `game_recommendations` · `activity_events`
- **What to Play:** `play_queue_items` (user × game, position, source, currently_playing)
- **Engagement:** `notifications` · `notification_prefs` · `device_push_tokens`
- **Moderation:** `reports` · `edit_suggestions` (CAT-06) (+ soft-hide flags; game soft-delete for dedup grace)
- **Achievements:** `achievements` (definition: key, type milestone|egg, condition spec, reward spec, visibility, active — config/seed data) · `user_achievements` (user × achievement, progress, unlocked_at). Achievement-exclusive cosmetics are `cosmetic_items` flagged non-purchasable.

---

## 7. Non-functional notes

- **Security:** ownership-scoping (SYS-01) enforced at the service layer on every read/write.
- **Auth:** access+refresh tokens (AUTH-02); refresh rotation; argon2/bcrypt hashing.
- **Performance:** list endpoints paginate; the catalog search is indexed on `normalized_name`.
- **Accessibility:** despite the heavy visual theming, respect dynamic type and minimum contrast on functional UI (to be detailed in design-spec).
- **Testing:** risk-based, meaningful-tests-first; harness + CI from Phase 1 (SYS-06/07). Full approach in [`testing-strategy.md`](testing-strategy.md).

---

## 8. Implementation phasing (build order; the design is unified)

1. **Foundation** — auth (refresh + Apple), users/profile, data layer + migrations, ownership security (SYS-01), tab-nav shell, **testing harness + CI (SYS-06)**, **domain-event convention (ACH-08)**.
2. **Catalog + Collection** — create/search/dedup catalog, collection CRUD, status/hours/stats. *(Core usable here.)*
3. **Customization** — Card editor + Device editor (free assets only), composition renderer, effects.
4. **Community & Economy** — publish/adopt cards, wallet + Customizer currency, store + IAP + entitlements, contributor profile.
5. **Social** — friends, profiles, compare hours, Top-5, recommendations, What to Play.
6. **Engagement** — push notifications, activity feed, discovery, moderation tooling, **achievements engine + celebration (ACH-\*)**.

---

## 9. Tech direction (engineering, owned by Claude Code; may evolve)

- **Client:** Expo / React Native (iOS + Android). Redux Toolkit + **RTK Query** (server cache) + redux-persist (local drafts). expo-router tab navigation. Reanimated for effects. expo-notifications. RevenueCat for IAP.
- **Server:** Node / Express + TypeScript, layered routes → controllers → services → repositories; zod validation. PostgreSQL via **Drizzle** (typed SQL + migrations).
- **Storage:** object storage + CDN for uploaded card art and asset previews, with a moderation hook.

---

## 10. Out of scope for v2 (parked big ideas)

Recorded so they're conscious choices, not omissions:

- **Real-data integrations:** platform playtime auto-import (Steam/PSN/Xbox), achievement/trophy sync. *(Schema is import-ready via `hours_source`.)*
- **Creator economy:** card-designer revenue share / payouts; cosmetic trading/marketplace.
- **Public/social expansion:** public profiles + follow graph + people discovery; **external card/collection sharing** (image + deep link) + a public **web card page**; web companion / clubs/communities.
- **Deeper creation:** full from-scratch **drawing suite** (Artist persona); AI-assisted card art; **heavy editor ops** (clip-to-shape masking, boolean shape ops, pattern/array); **card remix/fork** with attribution chains; **rarity tiers/framing**.
- **Live-ops:** seasonal events / battle pass beyond simple store drops.

---

## 11. Changelog

| Date | Version | Change | IDs |
|---|---|---|---|
| 2026-06-07 | 0.1 | Initial spec drafted from brainstorming. | All |
| 2026-06-07 | 0.2 | Added testing harness/CI and per-endpoint authorization-test requirements; web clarified as dev/testing-only surface. See `testing-strategy.md` + decision 0002. | SYS-06, SYS-07 |
| 2026-06-07 | 0.3 | Added Achievements & easter eggs system (data-driven, event-driven, idempotent; mixed rewards incl. achievement-exclusive cosmetics). Reconciled COSM-04/ECON-05 milestone unlocks into it. See decision 0003. | ACH-01..08 |
| 2026-06-08 | 0.4 | Tab-walkthrough reconciliation: single-currency economy + user-facing ledger; no notifications center; publisher field; collection search + manual order/ASC-DESC + friend-view collection; favourite game + clout/member-since + two-mode showcase; Game-Card-as-universal-representation; feed aggregation; QR/username find-friends; games-only Discover search; card-publishing rate-limit; achievement anti-farming rule. See decisions 0004–0005. | PROF-01/04/05, CAT-02, COL-07/09/10, CARD-07, DISC-03, SOC-02/06/07, ECON-01/07, NOTIF-03, SYS-05 |
| 2026-06-08 | 0.5 | Closed OQ-001 (multiple device models, per DEV-02) and OQ-003 (Now Playing = a single pin distinct from the Playing status). | WTP-03 |
| 2026-06-08 | 0.6 | Card-editor deep dive (3-mindset panel informed): vector-composition art model, no uploads/AI; element management/precision/creative toolkit; effects + separate finish layer; preview-then-acquire reconcile; drafts/lifecycle; flatten/publish pipeline; approachability/a11y; asset library; default-card guarantee; publish integrity. Roles (SYS-08); admin console + dedup-merge + text-screening + entitlement/takedown policy (MOD-04..08). Owned-since relabel (COL-03/07); cosmetics types incl vector packs/finish/fonts. Adoption-only (no remix) + no external sharing — both parked. See decisions 0006–0007. | CARD-01..19, MOD-04..08, SYS-08, COL-03/07, COSM-01 |
| 2026-06-08 | 0.7 | Remaining-screens walkthrough: device editor lighter + personal-only + default-device/nav-legibility (DEV-01/03); compare adds total-games (SOC-03); contributor profile friend-viewable, no level (CAT-07); guided onboarding + account deletion (AUTH-06/07). See decision 0008. | DEV-01/03, SOC-03, CAT-07, AUTH-06/07 |
