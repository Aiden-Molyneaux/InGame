# W-D1 — The adaptive Game page: the three-posture model (DRAFT for the owner's nod)

> The owner's walk-2 ruling intent: ONE Game page that adapts, replacing the separate friend-entry
> screen, reachable even for games you don't own — "how the Game page translates in these different
> states is worth thinking deeper about before implementing." This is that thinking. Nothing builds
> until the owner nods (the ⚖ questions below). Filed 2026-07-18, Fable.

## The model — posture is derived from DATA + one context param, never from separate routes

**One route: `/game/[id]`.** The page resolves its posture at load:

| Posture | Trigger | PLAY | CARDS | ABOUT |
|---|---|---|---|---|
| **OWN** | the caller has a collection entry for the game (and no friend context) | today's full dossier — stats edit · now-playing · remove · the dual-face hero | today's full switcher + community gallery | the W-C5 fill (canonical facts · genres · studio · contributor credit · counts · friendsWhoOwn) |
| **FRIEND** | navigated with `?via=<friendUserId>` from a friend's collection (an accepted friend) | THEIR play data read-only (hours · status · owned-since · their displayed card + equipped readout) + the **compare-with-mine** fragment + **adopt-their-card** | **community gallery only** (no switcher — not your shelf) | identical to OWN |
| **CATALOG** | neither (unowned, no friend context) | replaced by a **header CTA block**: ADD TO COLLECTION (the gold acquisitive key) + the game's canonical hero; the M8 board's *upcoming/be-first* state is this posture's empty variant | community gallery (browse + adopt requires owning? — see Q4) | identical |

**Why data-derived + one param (not three routes):** every entry point resolves the same way with
zero routing sprawl — and the posture upgrades in place (add the game from CATALOG → the page
re-renders OWN; the same URL stays shareable/back-stackable).

## Entry points → postures
- Own collection (shelf/list/hero/switcher taps) → OWN (unchanged).
- A friend's collection / their Top-3 / compare matchup rows → `?via=friend` → FRIEND.
- **Add-Game search rows gain an INSPECT affordance** (see Q3) → CATALOG (or OWN if owned) — the
  owner's "see the About page + Community Cards before adding."
- Discover trending-cards tap-through, feed peeks, friendsWhoOwn rows, contributor card cells →
  resolve by ownership: OWN if owned else CATALOG (these lack friend-entry context; a
  friendsWhoOwn row is ABOUT the friend, so it MAY carry `?via` — cheap, included).

## What this absorbs / retires
- **`/user/[id]/entry/[gameId]` (P9's SOC-11 screen) RETIRES** — its content IS the FRIEND posture's
  PLAY tab. The friend-collection rows re-point to `/game/[id]?via=<userId>`.
- The game-page board's M7 (friend) + M8 (upcoming/be-first) artboards finally land as drawn — the
  board always intended this adaptivity; the M4 build scoped it to OWN and P9 side-doored FRIEND.

## Data seams (all exist or are already queued)
- OWN: unchanged. FRIEND: the `/users/:id/collection` item (the SOC-11 read, live) + compare (live).
- CATALOG: **W-C5's `GET /catalog/games/:id`** (the never-built aggregate — canonical + gallery +
  counts + friendsWhoOwn) — the one server dependency; W-C5 builds it regardless.
- The gallery + adopt stack (CommunityGallery/AdoptCardSheet) is posture-independent — reused as-is.

## ⚖ The four questions for the owner's nod
1. **FRIEND posture compare:** inline side-by-side fragment on the PLAY tab (as SOC-11 built it) or
   just a COMPARE door to `/compare/[friendId]`? **Recommend: keep the inline fragment** (the
   single-game face-off is the SOC-11 spec's whole point) + the door for the full compare.
2. **Owned + friend context** (you both own it, arrived via their shelf): **recommend FRIEND posture
   wins** (you came to see THEIRS) with a small "VIEW YOUR COPY" link swapping to OWN.
3. **Add-Game inspect affordance:** the search row's tap stays ADD (the flow's job); a **chevron/
   INSPECT secondary affordance** on each row opens the CATALOG posture. **Recommend: chevron**
   (mirrors the B7 shelf-chevron grammar just shipped).
4. **Adopting from the CATALOG posture when you don't own the game:** the M5 adopt targets your
   collection entry — no entry exists. **Recommend: the AdoptCardSheet's add-to-collection bridge**
   (add the game + adopt in one confirmed flow — the SOC-11 "add it to your collection" affordance
   generalized), rather than blocking adopt behind a separate add.

## Build shape (after the nod)
One client packet (Opus): the posture resolver + the FRIEND/CATALOG tab variants + entry-point
re-pointing + the route retirement — riding W-C5's server aggregate. Manifest-first from the
game-page board's M1–M8 (at last, all eight artboards). Estimate: one focused packet, the largest
remaining M6 client item.
