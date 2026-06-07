# 0001 — Foundational product decisions

- **Date:** 2026-06-07
- **Status:** accepted
- **Related IDs:** spans the spec (catalog, cards, social, economy, platform)

The decisions below were made during the initial brainstorming for InGame v2. They are the
load-bearing choices the rest of the spec hangs on.

## D1 — Center of gravity: Showcase × Social, plus discovery
The app's heartbeat is a collection worth being proud of (showcase) **and** friends to compare with
(social), with a lightweight discovery layer. The **Curator** is the north-star persona.

## D2 — Real product, scale-aware; light-touch moderation
Built for real users. Moderation is intentionally minimal (fuzzy dedup + report/hide), because the
abuse surface is small — *except* shared user-generated card art, where a moderation hook applies
(CARD-03, MOD-*).

## D3 — Mobile-first (iOS + Android); web is not a v2 surface
Enables haptics, rich effects, push, and native sharing. (Web companion is parked.)

## D4 — No external game database
The catalog is **100% community-owned** — including upcoming titles (community-entered with future
release dates). Rejected IGDB/RAWG (full-seed or hybrid) because it would erase the "be the first to
add it" delight, and because community ownership is core to the product's identity. Trade-off
accepted: organic cold-start, seeded by the Contributor persona. (CAT-*)

## D5 — Lean canonical entries (no platforms/description on shared entry)
Shared entries hold only name, genre(s), studio?, release date?. Dropped `platforms` and
`description` from the shared record to remove the biggest edit-war surfaces. Personal "platform I
own it on" remains a **private** collection field. (CAT-02, COL-04)

## D6 — Community-only card art (no official box art)
Every game's visuals are community-designed Game Cards. Sidesteps image licensing and makes the
"submit/recommend designs" loop the heart of the app. (CARD-*)

## D7 — Two customization surfaces: Device + Cards
The collection lives inside a customizable **Device** (shell colour + stickers); each game is a
customizable **Card** (art + effects + stickers + colours + frame). **Effects live on the Card**,
not the Device. Deep customization of both is a first-class pillar. (CARD-*, DEV-*)

## D8 — Customization model is curated layering, not free drawing (for v2)
Users compose from an expanding set of assets/effects/stickers/frames. A full drawing suite (Artist
persona) is parked. Store-moat rule: premium = **things you can't just draw** (animated/dynamic
effects, curated packs) — preserving store value even if a drawing suite is added later. (COSM-03)

## D9 — Social graph: mutual friends
Two-way friend requests, console-style. Public follow graph and public profiles are parked. Covers
compare-hours and Top-5 sharing with the least privacy/moderation burden. (SOC-01)

## D10 — Hours: manual now, import-ready
Manual entry for v2; the schema carries `hours_source` so platform auto-import can slot in later
without rework. Platform integration itself is parked. (COL-03)

## D11 — Monetization via a cosmetic store + dual economy
The store sells **Customizer currency** (to adopt premium cards) and **premium effects/packs** (to
create them). Start with 5 free currency; earn via login bonuses/milestones; purchase more. All
values **server-configurable** (tuned for spread first, revenue later). IAP via Apple/Google with
server-side receipt validation (RevenueCat). (ECON-*, SYS-04)

## D12 — Adoption mechanic & creator reward
Adopting a premium card costs **1 currency** (non-premium = free) and grants rights to **that design
for that game only** (not the standalone effect). Creator reward in v2 is **clout + unlock
milestones (option A)**, not currency or money. A currency-kickback (option B, ECON-05a) is noted as
a future toggle; real revenue-share is parked. (ECON-03/04/05)

## D13 — Greenfield build in a new repo "InGame"
No prototype code is reused — only lessons and the retro aesthetic as design reference. No data
migration. (SYS-*)

## D14 — Workflow: docs-as-code with single-owner truth + stable IDs
Spec / api-contract / design-requirements / design-spec / implementation-plan are versioned docs in
this repo, glued by stable feature IDs, governed by the change protocol in `00-INDEX.md`. The
**immediate next deliverable after this spec is a UI/UX Design Requirements doc** (input to Claude
Design) — *not* an implementation plan.
