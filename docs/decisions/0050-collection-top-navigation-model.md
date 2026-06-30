# 0050 — The Collection & TOP navigation model (definitive; completes 0049)

**Date:** 2026-06-30 · **Status:** ✅ Accepted — owner ratified 2026-06-30.
**Owner:** Aiden (rulings) · Claude Code (spec-owner)
**Completes:** 0049 (which moved Top curation into the Collection) · **closes OQ-083 for good** ·
**builds on:** 0047 (cap-10 · Profile Top-3 · nameplate F-06) · 0048 (CARD-23 card-tap)
**Touches:** COL-07 · **+COL-13** · PROF-05 · COL-10 · SOC-04 (ref) · CARD-23 (ref) · §2.1 · §2.2 · §2.17 · §3.1 · §3.5 · §4.7

## The model (one home)
A person's games live in **one place — their Collection**. The **Top-10 is a curated, rank-ordered
*view-mode* of the Collection** (the SOC-04 list). The **Profile only teases (Top-3) and launches into
the Collection.** There is **no standalone Top editor** (OQ-083 reversed) — you edit where you browse.

## A — Collection view-modes (COL-07 extended)
The `view` keycap cycles **SHELF · GRID · LIST · TOP**. TOP renders the curated Top-10 in rank order
(#1 emphasized, rank chips), over the same collection data.

## B — TOP view-mode behaviour (+COL-13)
- **Your own — read + edit in place.** Default = read (cards flip per COL-12; VIEW GAME → Game page).
  An **ARRANGE** affordance (the COL-07 / OQ-031 gesture) enters edit mode:
  - **reorder** = drag-to-rerank → `PATCH /me/lists/:id { orderedGameIds[] }`;
  - **membership** = a **`+ ADD`** ghost slot → the **`CardPicker`** sheet (search your collection · ★
    toggle add/remove · cap-10 with a `LIST_FULL` refusal) → `POST/DELETE /me/lists/:id/items`;
  - a single tap is a **no-op** in arrange (drag is the gesture); **DONE** returns to read.
  - Empty = ghost seats + a "rank your favourites" nudge.
- **A friend's — read-only.** Ranked Top-10, no ARRANGE / no CardPicker / no add-remove. Privacy-gated
  (PROF-03). Reuses the friend-Collection chrome ("COLLECTION — <name>", `‹ RETURN TO PROFILE`,
  "VIEW IN THEIRS" device toggle).
- The `SlotFrame`/`RankSlot`/`CardPicker` components (from the retired §4.7 board) **are** the TOP
  view-mode. No new endpoint — TOP reads/writes the same SOC-04 list.

## C — Profile → Collection (the doors; PROF-05) — self & friend, one grammar
| Affordance on the Profile | → Destination |
|---|---|
| **VIEW COLLECTION ›** *(NEW, explicit — **friend profiles only**; self uses the NavBand COLLECTION key)* | the Collection, **default (shelf) view** |
| **VIEW TOP 10 ›** (above the Top-3) | the Collection, **TOP view active** |
| **Top-3 card tap** | the Collection, **TOP view active, focused on that game** |

- **Friend:** all three land in the **read-only** friend Collection. The card-tap target is the
  Collection TOP view **focused on the tapped game** (owner ruling 2026-06-30) — *not* the Game page;
  from there COL-12 flip → stats, VIEW GAME → the page, COMPARE, all one tap on. `‹ RETURN TO PROFILE`
  goes back.
- **Self:** VIEW TOP 10 / Top-3 tap navigate to your own Collection (NavBand → COLLECTION); back = the
  nav tab (no return-seam — TOP is a view-mode, not a sub-screen; 0049's interim "RETURN TO COLLECTION"
  seam is dropped).

## D — Why these rulings (the two the owner called out)
- **A user's collection is the *reason* you open a friend's profile** → the profile must have an
  unmistakable, explicit **VIEW COLLECTION** door (not only "VIEW TOP 10"), and every game-card tap on
  the profile funnels *into the collection*, not off to a separate game screen.
- **One curation surface** → editing your Top-10 happens in the Collection TOP view (drag + picker),
  never a separate editor (OQ-083 stays reversed).

## Ripples (applied this session unless noted)
- **product-spec 0.42:** COL-07 (+TOP view-mode); **+COL-13** (TOP view-mode + in-Collection curation:
  drag-rerank + CardPicker; self edit / friend read-only); PROF-05 (the three doors + the friend
  card-tap target); COL-10 (friend entry incl. read-only TOP). SOC-04 unchanged (cap-10).
- **api-contract: unchanged (0.39)** — `/me/lists` (cap-10, `kind: top10`, `orderedGameIds`, items
  add/remove) already covers read + curation; the doors are client navigation; no new endpoint.
- **design-spec 0.48:** §2.1 Collection (+TOP view-mode read/edit + the friend read-only TOP + the two
  profile doors + the card-tap target); §2.2 Profile (VIEW COLLECTION friend-only + VIEW TOP 10 +
  Top-3 tap); §2.17 reframed (no standalone editor — the TOP view-mode IS the surface).
- **Boards:** `profile-states.html` (friend **VIEW COLLECTION** + VIEW TOP 10 + card-tap); the **TOP
  view board** (`lists-states.html`, re-chromed by 0049 as the Collection TOP view) gains a **friend
  read-only TOP** artboard; `collection-states.html` `view` switcher documents TOP. `lists-states.html`
  is the Collection **TOP-view** board (a view-mode of §3.1), **not** a separate editor.
- **SCREEN-STATUS:** §3.1 (TOP view-mode + the doors) · §3.5 (profile doors) · §4.7 (editor →
  Collection TOP view, retired as a standalone) · **00-INDEX** register · `/health` · Burt.

## Alternatives considered
- **Friend card-tap → the game's Game-page:** more literal "tap the game," but a second nav model from
  the profile; rejected — the collection is the visit's purpose, so taps funnel there (owner).
- **VIEW COLLECTION on the self profile too:** redundant with the NavBand COLLECTION key; friend-only
  keeps the self profile clean (owner).
- **Keep a standalone Top editor (0047/OQ-083):** rejected by 0049 — edit where you browse.
