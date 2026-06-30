# Game-card tap audit — "what happens when a user clicks a game card?"

- **Date:** 2026-06-29 · **Author:** Claude Code (owner-requested, pre-engineering)
- **Scope:** all 20 converged states boards under `docs/design/mockups/**`, reconciled against
  product-spec, api-contract, design-spec, and decisions 0020 / 0024 / 0026 / 0040.
- **Why:** before engineering, lock down a *predictable, context-determined* rule for the one gesture
  that appears on almost every screen — tapping a game card — so the engineer implements one grammar,
  not twenty ad-hoc behaviours.
- **Method:** one reader per board extracted every place a game card is drawn + its annotated tap
  behaviour with `file:line` evidence; a parallel pass pulled the canonical rules from the specs.
  Every board is a **static mockup** — there are **zero `onclick`/`cursor:pointer` handlers anywhere**;
  all tap behaviour is carried by artboard caption prose. That is the root cause of every "undefined"
  below: the *outcome* is named in captions, but **which element is the hit-target is never wired**,
  and several surfaces name no outcome at all.

> **Status legend:** ✅ defined & consistent · ⚠️ drift / inconsistency to fix · ❓ undefined — owner ruling needed.

---

## 1. The recommended card-tap law (the spine)

A game card is the **universal handle for a game** (CARD-07). A single tap resolves to exactly one of
**four modes**, chosen *only* by the role of the surface it sits on. This is the whole grammar:

| Mode | Surfaces | A tap… | Source |
|---|---|---|---|
| **A · NAVIGATE** (default) | Compare matchups, list/search/feed rows, contributor "games added", pinned-favourite & now-playing, onboarding finale | …opens that game's **Game page (§4.2)** — your card → owned-state; a friend's → friend-view state | decision 0020 · CARD-07 |
| **B · FLIP** (browse override) | **Collection grid + shelf** (own & friend) | …**flips the card in place** to its stats back; the back's **VIEW GAME** (or long-press) → Game page | COL-12 · decision 0026 |
| **C · INSPECT** (community override) | Discover, Add-Game search, Game-page community gallery, contributor "cards designed" | …opens the **CardDetail** (card enlarged + EquipReadout + **ADOPT**); its **FULL ENTRY** → Game page | SOC-11 · CAT · design-spec §1.5 |
| **D · ACT-IN-PLACE** (edit/manage) | Game-page CARDS switcher, Lists/Top-5 editor + CardPicker, Add-Game pickers, onboarding add-rail | …**selects / picks / adopts / adds** — never navigates | OQ-056 · SOC-04 · COL-01 |
| **(inert)** | Card *being created* (Styler/Canvas), Store live-preview, Report backdrop, held/celebration cards, logged-out Welcome showcase | …does nothing; actions live on adjacent buttons | by design |

**Two corollaries the engineer needs and the boards don't state:**

1. **The whole card is the hit-target, and it mirrors its primary button.** Where a card today routes
   through an adjacent button (`VIEW GAME`, `VIEW CARD`), the card *art itself* should carry the same
   action. Cards are the universal handle; a user will tap the card. (Affects Profile pinned-favourite
   & now-playing, Contributor signature card.) → ruling **R-H**.
2. **Lifecycle gates the action, not the gesture.** Offline (SYS-10) keeps reads/flips/navigation alive
   and dims only writes (adopt/edit/add). Privacy (PROF-03) removes the cards entirely behind a
   lock-well — there is nothing to tap. Moderation (MOD-02) replaces a reported card with a
   non-tappable placeholder. These never *redefine* the tap; they remove or dim it.

---

## 2. Per-screen matrix (every converged board)

> Status cells below are the **pre-ruling analysis**; the ❓/⚠️ items were all **resolved on 2026-06-29** (§4). Kept as the evidence trail.

### Browse / home

| Screen | Card context | Tap → (recommended) | Mode | Status & evidence |
|---|---|---|---|---|
| **3.1 Collection — own** | grid + shelf full cards | **FLIP** to stats back; back `VIEW GAME` → §4.2; long-press → §4.2 | B | ⚠️ **Board drift.** Spec = flip (COL-12); but `collection-states.html:843` still reads *"tap any card → Game page"* and **no flip is drawn** (`.flipy`/`VIEW GAME` absent). Board is stale vs decision 0026 → **R-COL**. |
| | dense-list rows · search-result rows | NAVIGATE → §4.2 (whole row, chevron) | A | ✅ matches COL-12's dense-list carve-out (`:957`). |
| | empty-state "POPULAR FIRST ADDS" suggestion cards | PICK_ADD → Add Game (4.1) | D | ❓ destination granularity: this game pre-targeted vs generic search (`:471`) → **R-SUG**. |
| **3.1 Collection — friend** | grid + shelf full cards | FLIP (privacy-gated back) | B | ⚠️ same drift; friend list-row caption says "→ friend-view (SOC-11)" (`:1177`) — fold the flip per COL-12 friend-view. |
| **3.2 Discover** | rec · trending · upcoming · search cards | **INSPECT** → CardDetail (P5); `FULL ENTRY` → §4.2 | C | ✅ explicit (`:769`, `:749`). Note: trending = a *community card design*; CardDetail is only drawn for a catalog entry — confirm trending opens the card-design detail → **R-TREND**. |
| | Up Next queue rows + Now-Playing pin | — | — | ❓ **Undefined.** Only drag-reorder + LOG HOURS drawn (`:547`). Tap a queue card = ? → **R-QUEUE**. |
| **3.3 Friends** | feed "object-peek" thumbnails | — | — | ❓ **Undefined in every state.** Static art inside FeedRows, no tap named (`:391`). → **R-FEED**. |
| **3.4 Store** | your card on the live PreviewStage | inert (swap via separate control) | (inert) | ✅ by design (`store:757`). Other "cards" here are cosmetic swatches, not game cards. |
| **3.5 Profile** | **Top-5** mini cards | NAVIGATE into the (own/friend) **Collection** — the gateway | A→B | ❓ **The owner's headline case.** Board says "FRIENDS TAP THESE TO BROWSE YOUR COLLECTION" / "gateway into their collection" (`:751`, `:901`). Per-card destination (whole collection vs deep-link to that game) and the "Top-5 view" question unresolved → **R-TOP5**. |
| | pinned-favourite hero | NAVIGATE → §4.2 | A | ❓ action is on the `VIEW GAME` button; card-art tap unwired → **R-H**. |
| | now-playing thumb | NAVIGATE → §4.2 | A | ❓ nav is on the row chevron; card-art tap unwired → **R-H**. |
| | Top-5 in **edit mode** | tap = swap slot · long-press-drag = re-rank | D | ✅ (`:643`, SOC-04 / OQ-031). |

### The game's surfaces

| Screen | Card context | Tap → (recommended) | Mode | Status & evidence |
|---|---|---|---|---|
| **4.1 Add Game** | search/suggestion **CardFan** | neighbour = rotate forward · forefront = **INSPECT** → CardDetail (P3b) → ADD (owned → §4.2) | C/D | ✅ (`:804`, `:924`). Rotate-vs-open hit-split is annotation-only — pin it for build. |
| | **CardPicker** community faces | adopt the face onto the held card · long-press = peek bare art | D | ✅ (`:1291`). |
| | held / dedup / filed-celebration cards | inert (form/buttons act) | (inert) | ✅. |
| **4.2 Game page** | **PLAY dual-face hero** (own) | *(today: inert — face+back side-by-side, "no flip")* | (inert) | ❓ **Your "enlarge" proposal lands here.** Currently inert by design (`:516`). Add tap → **enlarge/inspect** the trophy? → **R-ENLARGE**. |
| | **CARDS switcher** (M3) | **SELECT** (orange ring) + inline SET-AS-MAIN / EDIT / DELETE | D | ✅ (`:626`, OQ-056). |
| | **community gallery** (M4) | **INSPECT** → CardDetail bottom-sheet (enlarged + ADOPT) | C | ✅ (`:720`). |
| | friend dual-face (M7) | inert; ADOPT / COMPARE on buttons | (inert) | ⚠️ adopt is reached two ways (gallery-tap→sheet vs friend-view button); reconcile whether tapping a friend's card opens the sheet → **R-ADOPT**. |
| | neutral / compare / upcoming heroes | inert | (inert) | ✅. |
| **4.3 Styler / Canvas** | live preview hero · proof · first-print | inert (editor output) | (inert) | ✅. |
| | attribute / base swatches | SELECT-in-place (apply attribute) | D | ✅ (cosmetic swatches, not game cards). |
| **4.4 Admin console** | reported-card thumbnails | row tap → **ReviewPanel** (moderation) | A* | ✅ (`:672`). Optional: should the review header **enlarge** the reported art for inspection? minor → **R-MODZOOM**. |
| **4.6 Compare Hours** | card-vs-card matchups | **NAVIGATE** → §4.2 (yours → your view; friend's → friend-view) | A | ✅✅ **The gold standard** — stated four times (`:272`, `:366`, `:387`, `:731`). |
| **4.7 Lists / Top-5 editor** | seated cards (#1 hero + 2–5) | *(single tap undefined)*; long-press-drag = re-rank; `SWAP` link = replace | D | ❓ plain single-tap on a seated card unspecified across S2/S3/S6 → **R-SEAT**. |
| | ghost seat | open CardPicker | D | ✅ (`:332`). |
| | CardPicker grid card | drop into the open seat | D | ✅ (`:421`); tapping an already-seated picker card unspecified → **R-SEAT**. |

### Social / identity / lifecycle

| Screen | Card context | Tap → (recommended) | Mode | Status & evidence |
|---|---|---|---|---|
| **4.9 Contributor profile** | signature-card hero | NAVIGATE → CardDetail (via `VIEW CARD`) | C | ❓ card-art tap unwired → **R-H**. |
| | "CARDS DESIGNED" mini-grid (on profile) | INSPECT → CardDetail | C | ❓ per-card tap undefined on the profile preview; only `VIEW ALL ›` drawn → **R-MINIGRID**. |
| | V1 "view all cards" full grid | INSPECT → CardDetail | C | ✅ "each a doorway to its CardDetail" (`:794`). |
| | "GAMES ADDED" rows · V2 | NAVIGATE → §4.2 | A | ✅ (`:838`). |
| **4.13 Welcome & Auth** | logged-out landing showcase | inert (no in-app destination) | (inert) | ✅ consistent with logged-out; optional "tappable preview as a sell hook" → **R-WELCOME** (low). |
| **4.14 Onboarding** | O2 forefront fan card | **ADD** the game (COL-01) · neighbour = rotate | D | ✅ (`:644`). |
| | O8/O9 finale grid + hero | inherits Collection grammar (Mode B) | B | ⚠️ inherits the **R-COL** drift verbatim. |
| | O10 "POPULAR FIRST ADDS" | PICK_ADD | D | ❓ same as **R-SUG**. |
| **4.16 Report** | backdrop "what you're reporting" card | inert | (inert) | ✅ "backdrops, not the subject" (`report:92`). |

**No game cards (excluded):** 4.5 Device · 4.8 Find/Add Friends · 4.10 Achievements · 4.15 Settings.

---

## 3. Reconciliation with the owner's stated mental model

You described two chains. Here's how each lands against the spec, and where they diverge:

**(1) "Collection card → flip to its stats back (own & friend)."**
✅ **Matches the spec exactly** (COL-12 / decision 0026). The only problem is the *board*: the converged
`collection-states.html` never got the flip drawn and still says "tap → Game page" (§1, **R-COL**). Your
model is correct; the mockup is stale.

**(2) "Profile Top-5 card → the Top-5 view → (tap) → the game page with the friend's card & stats → (tap) → enlarged for detail."**
This is three taps, and **two of the three diverge from the current spec**:

- **Top-5 card → "the Top-5 view".** The spec routes a Top-5 tap into the friend's **read-only
  Collection** (PROF-05 / COL-10 / SOC-02 — "the gateway into their collection"), *not* a separate
  "Top-5 view" surface. There is a dedicated Top-5 *editor* (4.7) but that's the **owner's** edit
  screen, not a friend-facing expanded list. → ruling **R-TOP5**: is "the Top-5 view" (a) just the
  friend's Collection (no new surface — recommended), or (b) a new read-only expanded-Top-5 screen?
- **…then tap a card → the friend's game page.** If "the Top-5 view" *is* the Collection, then by your
  own rule (1) the next tap **flips** the card (COL-12), and you reach the friend's game page via the
  back's **VIEW GAME** — not a direct navigate. So the two chains you gave are slightly in tension on
  the friend's collection: *flip* vs *navigate-straight-through*. **R-TOP5** resolves which.
- **…then tap the card on the game page → "enlarged for detail".** **New behaviour.** Today the
  game-page PLAY hero is deliberately inert (face + stats shown side-by-side, "no flip"). Adding a
  tap-to-enlarge "appreciate the trophy" gesture is a clean, on-brand addition — but it's a *new* rule,
  not a documented one. → ruling **R-ENLARGE**.

**Net:** your collection instinct is already law (just not drawn); your Top-5 and game-page-enlarge
instincts are reasonable *extensions* that need a ruling because the current spec says something
slightly different.

---

## 4. Owner rulings — RESOLVED 2026-06-29

> **Every recommendation below was accepted by the owner on 2026-06-29.** R-TOP5 was refined into a
> reworked Top feature (§4.5). The matrix in §2 shows pre-ruling analysis; this section is the truth.

| # | Ruling | Recommendation |
|---|---|---|
| **R-COL** | Collection board says "tap → Game page"; spec (COL-12) says "tap → flip". Which is truth? | **Spec wins** — re-fold the COL-12 peek-flip into `collection-states.html` and fix the `:843` caption. (Your model (1) confirms flip.) |
| **R-TOP5** | Profile Top-5 tap → whole Collection, deep-link to that game, or a new "Top-5 view"? And in the friend collection, flip or navigate? | ✅ Tap → the person's **Collection** in a new **TOP view**, scrolled to that game, then **flip** per COL-12. The Top is reworked — see §4.5. |
| **R-ENLARGE** | Should tapping the owned/friend hero card on the Game page **enlarge** it for appreciation? | **Yes** — reuse the CardDetail "inspect" enlarge (your card → enlarge + SHARE/EDIT; friend's → enlarge + ADOPT). Unifies your "enlarge" instinct with the existing community-gallery inspect. |
| **R-H** | Is the **card art** itself a tap-target, or only the adjacent `VIEW GAME`/`VIEW CARD` button? (Profile hero, now-playing, contributor signature) | The **whole card** is tappable and mirrors its button (CARD-07 — cards are the handle). |
| **R-QUEUE** | Up Next queue + Now-Playing cards (Discover, Profile) — tap = ? | NAVIGATE → §4.2 (drag stays the reorder gesture; tap navigates). |
| **R-FEED** | Friends feed object-peek thumbnails — tap = ? | NAVIGATE → §4.2 for that game (or inert if you want the whole FeedRow to own the tap). |
| **R-SEAT** | Lists/Top-5 editor — plain single-tap on a *seated* card while editing = ? | No-op (long-press-drag = re-rank, `SWAP` = replace); keep tap free to avoid a mis-grab firing navigation mid-edit. |
| **R-MINIGRID** | Contributor "CARDS DESIGNED" preview cells on the profile — tappable, or VIEW-ALL only? | Tappable → CardDetail (match V1). |
| **R-ADOPT** | Game-page friend-view: tapping the friend's card — open a CardDetail sheet (like M4) or rely on the ADOPT button? | Open the inspect/enlarge (R-ENLARGE) with ADOPT in its bar — one adopt path. |
| **R-SUG** | "POPULAR FIRST ADDS" suggestion cards (Collection empty, Onboarding O10) — tap = add this game, or open Add-Game search? | Open Add Game **pre-targeted** to that game. |
| **R-TREND** | Discover trending = a community card *design*; does its CardDetail show the card-design detail (with that artist/adopt), not just the catalog entry? | Yes — the card-design CardDetail. |
| **R-MODZOOM** | Admin ReviewPanel — should the reported-card header enlarge for inspection? | Low priority; add an enlarge for moderation accuracy. |
| **R-WELCOME** | Logged-out landing showcase cards — tappable preview, or pure decoration? | Pure decoration (no destination exists logged-out). |

---

## 4.5 The Top feature (resolved model — replaces the standalone Top-5)

R-TOP5 reworked the Top into one coherent feature (owner ruling 2026-06-29):

- **One curated ranked list** — the existing Top-5 generalized, **cap raised 5 → 10** (`lists`/`list_items`
  unchanged; `LIST_FULL` now fires past 10).
- **Profile = Top 3** (a legibility change — bigger, clearer cards; in progress in a parallel session):
  the showcase shows the three highest-ranked cards.
- **Collection gains a "TOP" view-mode** (alongside grid / shelf / list) showing all 10 in rank order —
  this is where you **set & reorder**: drag-to-rerank reuses the **COL-07 / OQ-031 ARRANGE gesture**;
  membership via a **CardPicker** (search → ★ add / remove), reusing the component built for 4.7.
- **The standalone Top-5 editor (4.7) folds into the Collection TOP view** — retired as a separate
  screen, its components (CardPicker, rank/slot logic) reused. *(Reverses the OQ-083 "dedicated editor"
  ruling — a deliberate re-pass, not wasted work.)*
- **Tapping a Top-3 card on a Profile** → the person's Collection in **TOP view**, scrolled to that game
  (then the Collection flip-rule applies).
- **Edit-mode tap rule (resolves R-SEAT):** while the TOP view is in arrange/edit mode a single tap is a
  **no-op** (drag reorders; an explicit remove control drops a card); outside edit mode the TOP view
  follows the Collection flip-rule.

**This implies a coordinated re-pass** — its own decision + ripples: product-spec §2.17 / SOC-04 / the
cap; api `/me/lists` (cap 10) + the Collection TOP-view read; design-spec §2.1 (Collection +TOP view) and
§2.17 (relocate the editor); boards `collection-states.html` (+TOP view, +flip) and `profile-states.html`
(Top-3, parallel session); SCREEN-STATUS §3.1 + §4.7. **Coordinate with the parallel Profile/Top-3
session so both halves land as one model.**

> **⚠ Conflict surfaced 2026-06-29 — decision 0047 already landed (accepted, parallel session).** It did
> the **cap 5→10 and Profile Top-3** (matches us), but **keeps the dedicated §4.7 Lists editor** (grown to
> 10 seats) + a standalone **VIEW TOP 10** grid — whereas the owner told *this* session to **fold §4.7
> into a Collection "TOP" view** and retire it. **These contradict on where the Top is curated.** Nothing
> Top-related should be formalized until the owner reconciles the two tracks. The card-tap law (§1) is
> unaffected — a Top-3 card tap → the Collection regardless.

## 5. Recommended formalization path

Per the working rules (one spec editor, change protocol — 00-INDEX §4) this audit **proposes**; it does
not edit the spec. The rulings are made; the clean way to lock it in (pending owner go-ahead, since it
reverses converged work and overlaps a live parallel session):

1. **One new decision** — [`0048-card-tap-grammar.md`](../../../decisions/0048-card-tap-grammar.md)
   (drafted) recording the four-mode law + the rulings. *(0047 was taken same-day by the parallel
   Top-3/Top-10 + nameplate track.)*
2. **product-spec:** a single new behavior ID — **CARD-23 "card-tap grammar"** (or extend CARD-07) —
   stating the default-navigate rule + the FLIP/INSPECT/ACT overrides + the "whole card is the handle"
   corollary. Ripple any IDs touched (CARD-07, COL-12, SOC-11, PROF-05).
3. **design-spec §1.5 GameCard:** add the per-host interaction note the component currently lacks
   ("no tap behavior is defined on the component itself; interaction is specified per host screen").
4. **Board fixes:** re-fold COL-12 into `collection-states.html` (R-COL); draw the enlarge on the game
   page (R-ENLARGE); make the card art the hit-target where today only a button navigates (R-H); annotate
   the now-resolved surfaces (R-QUEUE / R-FEED → Game page; R-MINIGRID → CardDetail).
5. **The Top re-pass (§4.5)** is its own work-stream — decision + product-spec/api/design-spec ripples +
   the Collection TOP view + Profile Top-3 + retiring 4.7-as-a-screen. Run it coordinated with the
   parallel Profile session; it is bigger than the tap-grammar formalization and should not be smuggled
   into it.
6. **open-questions / `/health`:** file anything deferred; run `/health` after any doc-graph edits.

---

*Generated from a 24-agent fan-out over all 20 converged boards + product-spec / api-contract /
design-spec / decisions 0020·0024·0026·0040. Every row is `file:line`-backed in the source boards.*
