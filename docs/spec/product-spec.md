# InGame — Product Specification

> The behavioral source of truth: **what InGame does**, its data model, rules, and economy.
> Screens and visuals are owned by the design-spec; endpoint shapes by the api-contract. This
> document references those by ID. See [`../00-INDEX.md`](../00-INDEX.md) for the working agreement.

**Version:** 0.1 (draft) · **Last updated:** 2026-06-07 · **Owner:** Claude Code

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
| SYS-05 | P1 | Sensitive/abuse-prone endpoints (auth, create-entry, report) are **rate-limited**. |

### 5.2 Authentication & identity (`AUTH-`)
| ID | Pri | Behavior |
|---|---|---|
| AUTH-01 | P0 | Email + password registration; **email is required and unique**; passwords are required and hashed (argon2/bcrypt). |
| AUTH-02 | P0 | Login returns a short-lived **access token** + a **refresh token**; the client silently refreshes. (Fixes the prototype's 1-hour hard expiry.) |
| AUTH-03 | P0 | **Sign in with Apple** (required by App Store policy once any social/third-party login exists). |
| AUTH-04 | P0 | Password reset via email. |
| AUTH-05 | P1 | Logout invalidates the refresh token. |

### 5.3 Profile (`PROF-`)
| ID | Pri | Behavior |
|---|---|---|
| PROF-01 | P0 | Profile holds: username (unique), avatar, short bio, favourite genre(s). |
| PROF-02 | P0 | **Gamertags**: a user lists handles per platform (controlled platform list, e.g. PC/PlayStation/Xbox/Nintendo). |
| PROF-03 | P0 | **Privacy setting**: friends-only (default) vs. limited public profile. Governs what non-friends can see. |
| PROF-04 | P1 | Profile shows collection summary stats (total games, total hours, completion rate). |

### 5.4 Catalog & contribution (`CAT-`)
| ID | Pri | Behavior |
|---|---|---|
| CAT-01 | P0 | **Search** the community catalog by title. No external database is used. |
| CAT-02 | P0 | **Create a canonical entry** when a game is missing: fields are **name (required), genre(s), studio/developer (optional), release date (optional)**. No `platforms` or `description` on the shared entry (avoids edit-wars). |
| CAT-03 | P0 | **Fuzzy dedup at creation**: warn "did you mean *Elden Ring*?" to prevent duplicate canonical entries. |
| CAT-04 | P0 | Genres come from a **controlled list** (not free text). |
| CAT-05 | P0 | The creator of an entry is **credited as its contributor**. |
| CAT-06 | P1 | Users may **suggest edits** to canonical fields, with attribution; lightweight, not a wiki-war surface. |
| CAT-07 | P1 | **Contributor profile ("My Contributions")** — a first-class screen listing games you brought to the catalog, fields you added, and cards you designed, with adoption/usage stats. (Contributor persona's home + pride surface.) |
| CAT-08 | P1 | **Upcoming games** exist purely as catalog entries with a future release date (community-entered). |

### 5.5 Collection (`COL-`)
| ID | Pri | Behavior |
|---|---|---|
| COL-01 | P0 | Add/remove a catalog game to/from **your** collection. |
| COL-02 | P0 | Per-game **status**: Backlog · Playing · Beaten · Completed 100% · Dropped · Wishlist. |
| COL-03 | P0 | Per-game stats: **hours** (manual entry; see SYS/`hours_source` — import-ready), **% complete**, **date purchased**, **personal rating**. |
| COL-04 | P0 | Per-game **personal platform(s)** — which platform(s) *you* own/play it on (private; pairs with gamertags). |
| COL-05 | P1 | Per-game **private notes**. |
| COL-06 | P0 | **Card switcher on a collection entry**: effortlessly flip the displayed Card for a game between (a) cards you created for it, (b) cards you adopted/downloaded for it, and (c) "create new." Your library look is never locked in. |
| COL-07 | P0 | Collection views: a **Device/shelf view** (cards — the showcase) plus list/grid; sort & filter by genre/status/hours/recently-added. |
| COL-08 | P1 | Collection stats summary (feeds PROF-04). |

### 5.6 Game Card customization (`CARD-`)
| ID | Pri | Behavior |
|---|---|---|
| CARD-01 | P0 | A **Card editor** composes a card from layers: base art + **effects** (e.g. frost/fire/galaxy/raining-blood) + stickers + colour/title styling + frame template. Model = **curated layering** (not free drawing). |
| CARD-02 | P0 | Card art sourcing: adopt a community card, or create your own (compose from owned assets; **upload a base image** is supported). |
| CARD-03 | P0 | Uploaded images pass through a **moderation hook** (manual queue acceptable initially) — the real UGC moderation surface. |
| CARD-04 | P0 | **Publish a card to the community** and **adopt** others' cards. Cards retain **designer attribution**. |
| CARD-05 | P1 | A card tracks an **adoption count / popularity** metric (pride; feeds milestones in ECON). |
| CARD-06 | P0 | A card is **premium** if its composition includes any premium asset/effect (derived flag) — this drives adoption cost (ECON-03). |

### 5.7 Device customization (`DEV-`)
| ID | Pri | Behavior |
|---|---|---|
| DEV-01 | P0 | A **Device editor** customizes the user's shell: colour + stickers (composition). The Device is the "frame" of the profile/showcase. |
| DEV-02 | P1 | Users may own multiple **device models** (cosmetic items) and switch the active one. |

### 5.8 Cosmetics library (`COSM-`)
| ID | Pri | Behavior |
|---|---|---|
| COSM-01 | P0 | A library of cosmetic items typed as: effect · sticker · art asset · frame · device skin · device model. |
| COSM-02 | P0 | A **free baseline** set is always available so everyone can customize meaningfully. |
| COSM-03 | P0 | Premium items are gated by **entitlement** (owned via purchase or earned). The store's moat = **things you can't just draw** (animated/dynamic effects, curated packs). |
| COSM-04 | P1 | Some cosmetics are **earned** via milestones/contribution (e.g. "100 adoptions → free effect"). |

### 5.9 Economy & store (`ECON-`)
| ID | Pri | Behavior |
|---|---|---|
| ECON-01 | P0 | **Dual economy.** The store sells two things: (a) **Customizer currency** (to *adopt* premium cards) and (b) **premium effects/asset packs** (to *create* premium cards). |
| ECON-02 | P0 | Every user starts with **5 Customizer currency**; earns more via **login bonuses / milestones**; can **purchase** more. (Values server-configurable per SYS-04.) |
| ECON-03 | P0 | **Adopting a premium card costs 1 Customizer currency.** Adopting a **non-premium** card is **free**. |
| ECON-04 | P0 | **Scoped adoption rights.** Adopting a premium card grants the right to use **that design for that game only**. It does **not** grant the standalone premium effect for reuse elsewhere (protects effect sales). |
| ECON-05 | P0 | **Creator reward = clout (v2 choice "A").** When a creator's premium card is adopted, the creator earns **adoption-count, contributor prestige, and cosmetic unlock milestones** — *not* currency or money. *(Future toggle "B" — currency kickback — is noted in decisions; real revenue-share is parked, §11.)* |
| ECON-05a | P2 | *(reserved)* Currency-kickback to creators — a future-toggle of ECON-05, off in v2. |
| ECON-06 | P0 | **In-app purchases via Apple/Google IAP** with server-side **receipt validation** and **restore purchases**. Implemented via a cross-platform IAP layer (RevenueCat — see api-contract / decisions). |
| ECON-07 | P0 | A **wallet** holds the currency balance; a **ledger** records every change (login bonus, purchase, adoption spend, milestone) for auditability. |
| ECON-08 | P2 | **Limited/seasonal drops** in the store as a return hook. |

### 5.10 Social (`SOC-`)
| ID | Pri | Behavior |
|---|---|---|
| SOC-01 | P0 | **Mutual friends**: request/accept; a friends list. (Public follow graph is parked, §11.) |
| SOC-02 | P0 | **Friend profile view**: their Device + collection + cards + stats + Top-5 + currently-playing. |
| SOC-03 | P0 | **Compare hours** with a friend (per-game and total) + friend leaderboards. (Core return-driver.) |
| SOC-04 | P0 | **Top-5 lists** — create and share. (Extensible to other list types later.) |
| SOC-05 | P1 | **Recommend a game to a friend** — drops into their What-to-Play with a note (`WTP-`). |
| SOC-06 | P1 | A **gentle activity feed**: friend added/beat a game, published a card, hit a milestone. Deliberately low-noise. |
| SOC-07 | P1 | **Friend invites** via share link / contacts (virality). |

### 5.11 What to Play (`WTP-`)
| ID | Pri | Behavior |
|---|---|---|
| WTP-01 | P0 | A ranked **"Up Next" queue**, drag-to-reorder, that spans **owned games and unowned games** (a catalog game you don't own = effectively a wishlist item here). |
| WTP-02 | P0 | Items can be added from your collection, from discovery, or from a friend's recommendation (SOC-05). |
| WTP-03 | P2 | A **"currently playing" pin** + the queue is shareable. |

### 5.12 Discovery (`DISC-`)
| ID | Pri | Behavior |
|---|---|---|
| DISC-01 | P1 | **Upcoming** — browse catalog entries with a future release date. |
| DISC-02 | P1 | **Browse by genre / studio.** |
| DISC-03 | P1 | **Search** games and people. |
| DISC-04 | P2 | **Trending / featured community cards** — showcases great Curator work and inspires. |
| — | — | *(No algorithmic "recommended for you" engine in v2 — explicitly cut.)* |

### 5.13 Notifications & engagement (`NOTIF-`)
| ID | Pri | Behavior |
|---|---|---|
| NOTIF-01 | P0 | **Push notifications** (Expo push) tuned to each persona's return trigger: friend activity/comparison, wishlisted game released, your card adopted Nx, new store drop. |
| NOTIF-02 | P0 | Per-type **notification preferences** the user controls. |
| NOTIF-03 | P1 | An in-app notification center mirrors push events. |

### 5.14 Moderation (`MOD-`)
| ID | Pri | Behavior |
|---|---|---|
| MOD-01 | P0 | **Report/hide** on shared cards and catalog entries — the light-touch safety valve. |
| MOD-02 | P0 | Reported content can be **soft-hidden** pending review. |
| MOD-03 | P1 | A minimal review queue (can begin as manual/admin-only). |

---

## 6. Data model (entity overview)

Authoritative field-level shapes live in [`api-contract.md`](api-contract.md); this is the entity map.

- **Identity:** `users` (unique email, password hash, avatar, bio, privacy) · `auth_identities` (Apple/OAuth subs) · `gamertags` (handle + controlled platform)
- **Catalog:** `games` (name, normalized_name, release_date?, studio?, created_by) · `genres` (controlled) · `game_genres`
- **Collection:** `collection_entries` (user×game: status, hours, hours_source, percent_complete, date_purchased, rating, notes, active_card_design_id) · `collection_platforms` (entry × controlled platform)
- **Cards:** `card_designs` (game, creator, visibility, composition JSON, is_premium, adoption_count, moderation_status) · `card_adoptions` (adopter × design × game, currency_paid)
- **Device:** `device_configs` (user: active_model, shell_colour, sticker_composition JSON)
- **Cosmetics:** `cosmetic_items` (type, is_premium, price) · `cosmetic_packs` · `user_entitlements` (user × item, source)
- **Economy:** `wallets` (balance) · `currency_ledger` (delta, reason, ref) · `store_products` (IAP product → grant) · `iap_receipts` (validated)
- **Social:** `friendships` (requester/addressee, status) · `lists` + `list_items` (Top-5 = capped list) · `game_recommendations` · `activity_events`
- **What to Play:** `play_queue_items` (user × game, position, source, currently_playing)
- **Engagement:** `notifications` · `notification_prefs` · `device_push_tokens`
- **Moderation:** `reports` (+ soft-hide flags on cards/entries)

---

## 7. Non-functional notes

- **Security:** ownership-scoping (SYS-01) enforced at the service layer on every read/write.
- **Auth:** access+refresh tokens (AUTH-02); refresh rotation; argon2/bcrypt hashing.
- **Performance:** list endpoints paginate; the catalog search is indexed on `normalized_name`.
- **Accessibility:** despite the heavy visual theming, respect dynamic type and minimum contrast on functional UI (to be detailed in design-spec).

---

## 8. Implementation phasing (build order; the design is unified)

1. **Foundation** — auth (refresh + Apple), users/profile, data layer + migrations, ownership security (SYS-01), tab-nav shell.
2. **Catalog + Collection** — create/search/dedup catalog, collection CRUD, status/hours/stats. *(Core usable here.)*
3. **Customization** — Card editor + Device editor (free assets only), composition renderer, effects.
4. **Community & Economy** — publish/adopt cards, wallet + Customizer currency, store + IAP + entitlements, contributor profile.
5. **Social** — friends, profiles, compare hours, Top-5, recommendations, What to Play.
6. **Engagement** — push notifications, activity feed, discovery, moderation tooling.

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
- **Public/social expansion:** public profiles + follow graph + people discovery; web companion / public shareable profile pages; clubs/communities.
- **Deeper creation:** full from-scratch **drawing suite** (Artist persona); AI-assisted card art.
- **Live-ops:** seasonal events / battle pass beyond simple store drops.

---

## 11. Changelog

| Date | Version | Change | IDs |
|---|---|---|---|
| 2026-06-07 | 0.1 | Initial spec drafted from brainstorming. | All |
