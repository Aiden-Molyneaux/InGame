# 0078 — M6 owner-walk-2 ruling omnibus (the pre-beta iteration batch)

**Date:** 2026-07-17 → 2026-07-18 · **Status:** LOCKED (owner device walks, rulings given live in
batch mode) · **Owner:** Aiden
**Companion:** [`walk2-notes.md`](../planning/m6/walk2-notes.md) (the per-item ledger with commits +
diagnoses) · [`game-page-postures.md`](../planning/m6/game-page-postures.md) (the W-D1 model) ·
decisions [0069](0069-button-convention-ratification.md) (amended here), [0076](0076-m6-entry-gate-rulings.md),
[0077](0077-m6-ach-starter-content.md).

This records the owner's M6 pre-beta walk rulings that are behavior/convention/spec-class (the pure
visual fixes live in the ledger + their commits; this doc captures what changes a rule, a contract,
or an open question). Grouped by kind.

## 1. Convention amendments (design-system)
- **Rank accents (walk-6):** Top-10 read-mode rank markers — **#1 GOLD · #2/#3 brighter SILVER
  (`RANK_SILVER #cfd8e3`, a TOKEN-CANDIDATE for the design-spec palette) · #4–10 ORANGE.** This
  **amends decision 0069/0047** — the boards had drawn #1 orange (a deliberate divergence from the
  catalog `RankChip/first` gold specimen, pending owner ratification); the owner ruled **gold**,
  restoring the catalog specimen, and introduced the silver tier for 2/3.
- **DESIGN NEW → ORANGE (walk W-B9):** the CardSwitcher DESIGN-NEW tile reverts gold → orange
  (`scr.accent`). **Reverses decision 0069's "DESIGN NEW = gold"** ruling.
- **Request-sent confirmation (P8 walk-2):** sending a friend request shows **no success toast** —
  the button's flip to REQUESTED is the sole signal (errors still toast). **Supersedes the
  find-add board's drawn sent-confirm Toast.**
- **Buy grammar (walk W-B3/B4/B5):** the hold-to-pay/buy bar is a proper keycap height (one
  component, rippled to every buy surface); **Cancel is removed** from all buy sheets (escape =
  the sheet/scrim grammar — completes the F-21 family; a latent "armed-confirm survives a re-pick"
  escape bug was fixed alongside); the theme **PREVIEWING chip is removed**.
- **Header geometry (walk W-B1/B1b):** one shared header geometry (`SCREEN_HEADER_PAD`,
  `HEADER_CONTENT_HEIGHT=26` in `ScreenHead`); the title's vertical position is **independent of the
  trailing control** (the cluster is out of flow; controls conform to the band; the 34px Friends
  HeaderKey → 26). Every page header now sits on one line.
- **Now-playing (walk W-B6):** the Now-Playing card renders in the **Collection hero ONLY**, not
  repeated in list/grid/shelf rows (supersedes the board's per-view now-playing chrome — cited for
  the board ripple).
- **Add-Game create prompt (walk W-B8):** "create this game" = **gold, pixel-stepped corners**
  (F-02 acquisitive — it mints a card-bearing entry).

## 2. Behavior / flow rulings
- **Sticker set/confirm (walk W-A7):** the Device sticker edit gains an explicit commit — tap-away
  commits · a ✓ SET key commits · **leaving the editor auto-commits** (blur flush + session
  unpublish, so no editable chrome leaks onto other screens). No confirm-sheet (stickers are free
  + reversible). This is the built shape of record.
- **Achievements reconcile-on-read (OQ-151, ruled at the walk):** satisfied count-criteria unlock
  (full reward path) when `GET /me/achievements` is read, healing the at-most-once evaluator gap +
  pre-genesis satisfied counters; match/window/dual eggs stay live-event-only. Plus unlock-triggering
  client mutations invalidate the achievements cache so the celebration fires on-action (walk W-A8).
  **OQ-151 REVERSED (from "accept" to "fix").**
- **Celebration surface (walk W-A4b/A4c):** the field = the **screen-theme colour** (re-themes per
  DEV-04), tier-coloured glyphs on top; the reward strip = a **dark recessed** theme tone
  (`darken(scr.bg,0.25)`), content centred.

## 3. Server / contract rulings (M6 Wave C)
- **Fuzzy people-search (C1 · SOC-07 amendment):** `/users/search` goes exact-match →
  case-insensitive **prefix+substring** ("Kyra" finds "KyraInGame"); same PersonRow shape, relationship
  enum, neutrality/rate posture, blocked-invisibility, self-exclusion. **→ OQ-152 filed** (the read
  reused the `SYS-01-AUTH-LOOKUP` marker; a multi-row authenticated directory read stretches that
  class's single-credential intent — owner-decision whether to mint a dedicated `SYS-01-DIRECTORY-READ`
  class; no scope silently widened, the payload is the same public allowlist, lint green).
- **Cancel-exempt (C2 · OQ-147 RESOLVED):** a voluntary outgoing-request CANCEL does **not** stamp
  the re-request cooldown (only DECLINE cools down; the rate bucket guards spam). Spec SOC-08 edited
  ("decline only").
- **Secret-mask widening (C3 + C3b · OQ-148 RESOLVED):** a friend's earned SECRET-tier achievements
  are **masked on their showcase** (`GET /users/:id/achievements`) — counted in the summary, never
  named/tiered (the sealed `{id,kind:'secret',tier:'secret',locked:true}` shape); the client renders
  them as the ??? MysterySlot. "You shouldn't be able to figure out secret achievements by looking at
  friends' pages." (The feed mask landed with P6.)
- **Game-detail aggregate (C5):** `GET /catalog/games/:id` **BUILT** (the P2/P7-flagged never-built
  hole; the ABOUT-tab + CATALOG-Game-page data source, W-D1's seam) — canonical facts + genres +
  contributor + CAT-09 counts + CAT-09c friendsWhoOwn (folded from the focused route, PROF-03-gated,
  block-severed) + inCollection. Card gallery stays its own route.
- **New-releases (C7 · CAT-11 · OQ-150 RESOLVED):** `GET /catalog/new-releases` BUILT (mirrors
  popular). **The rails answer:** Add-Game shows THREE rails — POPULAR · NEW RELEASES · FRIENDS ARE
  PLAYING; no distinct "trending games" 4th (popular fills it; DISC-04 trending is for cards).
- **Collection designer rider (C8):** `/me/collection` card now carries `designer {userId,username}`
  for custom cards (the contract-0.50-prescribed rider, never emitted — the "You/COMMUNITY" mislabel
  fix); own → self, adopted → the real designer.
- **b1 NEAT FREAK re-pointed (C9):** from the unreachable `collection.reordered` (the manual-arrange
  Collection UI is **deferred to M7**) to `list.reranked` (the live Top-10 arrange gesture) — keeps
  the egg beta-earnable; SYS-04 seed edit, no migration.

## 4. Wave D nodded — the adaptive Game page (build next)
The owner approved [`game-page-postures.md`](../planning/m6/game-page-postures.md): ONE `/game/[id]`
across **OWN · FRIEND (`?via=`) · CATALOG** postures, retiring the P9 side-door entry screen. The four
answers: Q1 **keep** the inline compare fragment · Q2 **friend-posture-wins + VIEW YOUR COPY** ·
Q3 **the Add-Game inspect chevron** · **Q4 RESHAPED — no adopting a card for a game you don't own; the
CATALOG Game page carries an ADD TO COLLECTION path, and adoption routes through Add-Game.** That
reopens **OQ-136** as a build item (W-C10): the Add-Game flow gains a **community-cards step** so a
user can adopt a card while adding the game. C5's aggregate (built) is the seam; the build rides the
next wave.

## 5. Deferrals & owner-eye items (recorded, not lost)
- **Avatar editor (C4/W-C4):** the Profile edit slice ships the **PROF-08 monogram** as the whole
  avatar surface; the drawn ✎ opens a full vector-composition avatar editor (unbuilt; v2 has **no
  image uploads**, §9/§10) — its own future packet.
- **Profile privacy toggle (C4 D-3):** lives in Settings (per the board IA), labelled "Public
  profile" — owner to confirm the direction vs the board's "LIMITED PUBLIC PROFILE" wording.
- **Profile edit = per-field save-as-you-go** (C4 D-1, per the board's OQ-034) — not a Save/Cancel.
- **W-B15 — a less-blank DEFAULT card visual:** owner design-taste item (a drafts pass or the
  pre-launch content pass).
- **W-A9b — the store-drawer "unusable" glitch hardening:** optional; the theme-leak (the real
  damage) is closed (W-A9), the store is recoverable by leaving it.

## New open questions filed
- **OQ-152:** fuzzy people-search read-class — overload `AUTH-LOOKUP` or mint `SYS-01-DIRECTORY-READ`? (§3 C1)

## Exit
product-spec + api-contract + open-questions bumped for §1–§3; `/health` green; the walk2 fix commits
are on `m6` (see the ledger). W-D1 + W-C10 (the Game-page build) is the next wave.
