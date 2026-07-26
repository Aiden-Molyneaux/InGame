# P2 — Add-Game flow rework: the proposal (2026-07-26)

> **Status: PROPOSAL — awaiting the owner's nod. Zero code changed.** Packet: walk-4 §P2 (+ the
> W3-I/W3-J rulings). Grounded in the built flow (`apps/mobile/app/add-game.tsx`,
> `app/game/[id]/cards.tsx`, `app/styler/[gameId].tsx`, `CommunityGallery`/`AdoptCardSheet`,
> `useContributorPaging`), product-spec 0.67 (CAT-02/03, COL-06, the 0.66 add-flow row) and
> api-contract 0.81 (adopt · COL-06 equip). Spec/contract ripples are **named here, executed at
> build time** after the nod.

## 1 · Today's topology (as built — and where it breaks)

```
Collection ─ADD→ [SEARCH] ──rails/fan ADD──────────────→ [STATUS] ─Next→ [FORK]
                    │ NONE OF THESE → [CREATE] ─Create+add─↑
                    │ INSPECT → game page (catalog) → back → SEARCH        (fine)
[FORK] doors:
  a. strip adopt → AdoptCardSheet → Done/✕ → back() → Collection   ← ends, but NEVER EQUIPS
  b. SEE ALL {N} → /game/:id/cards?adopt=1 → adopt → Return → FORK  ← re-asks; label lies (W3-J);
                                                                      list snaps to page 1 (W3-I)
  c. DESIGN YOUR OWN → Styler → KEEP (equips, COL-06) → KeepBeat →
     replace(/game/:id) → back → FORK                               ← re-asks; "Keep the default"
                                                                      lies HARDER (kept card is
                                                                      already equipped)
  d. Keep the default for now → back() → Collection                 (fine)
  e. header ‹ RETURN TO COLLECTION (any stage) → back()             (fine — implicit keep-default)
```

The seven incoherences, named:
1. **Strip-adopt never equips** (a): the user pays/holds a grant, lands on their shelf, and the new
   entry still wears the default — the "what did I just adopt?" gap. `adoptCard` is deliberately
   entry-independent; nobody chains the COL-06 equip.
2. **SEE-ALL adopt re-asks the answered question** (b): back lands on the fork, still offering
   adopt/design, exit labeled "Keep the default for now" — the W3-J lying label (owner: FIX).
3. **Design-KEEP strands the flow** (c): KeepBeat replaces to the *game page* (not the shelf);
   backing out resurfaces the fork over an entry that already wears the kept card.
4. **W3-I page snap-back**: `adoptCard` invalidates the `CommunityCards` tag → the full list's
   page-1 subscription refetches → `useContributorPaging` resets the accumulated tail → deep
   scroll lost. (Bites the game-page full lists too, not just add-flow.)
5. **Create button never de-emphasizes** (P2-d): the gold `Create "{q}"` renders identically under
   0 matches and 12 valid matches — and its "NONE OF THESE?" lead reads odd when there ARE none.
6. **Name editable after verification** (P2-b): the CREATE form prefills the searched name but lets
   it be edited — defeating the just-performed no-match verification (the dedup premise).
7. **Genres block create** (P2-c): the shared zod schema (`genreIds .min(1)`) + the client's
   disabled gate require ≥1 genre; CAT-02 never actually marked genres required (see §3.2).

## 2 · The proposed topology

**One invariant: the flow asks three questions, each exactly once — WHICH GAME · WHAT STATUS ·
WHAT FACE — and every face-answer ENDS the flow in the Collection with the answer worn.** The fork
is only ever on screen while the entry still wears the default card; there is no route back to it
after an answer, so its "Keep the default for now" label is always true.

| # | Path | What happens | Lands |
|---|------|--------------|-------|
| 1 | Search/rail ADD | entry created → STATUS → Next → FORK | — |
| 2 | CREATE + add | same sequence; a just-created game has no community cards → the two-door fork (design / keep-default), as today | — |
| 3 | **Fork strip adopt** | sheet adopt succeeds → **client chains the COL-06 equip** (`PATCH /me/collection/:entryId { activeCardDesignId: cardId }`; `adoptCard` stays entry-independent) → sheet settle copy says *equipped*, Done ends the flow | **Collection, new entry wearing the adopted card** |
| 4 | **SEE ALL adopt** | the fork's door passes the add-flow context (`?adopt=1&entryId=…`) → adopt in the full list equips the same way → Done **dismisses the whole add stack** (`router.dismissTo`) | **Collection, card worn** (the fork is never revisited — W3-J's lie is unreachable) |
| 5 | SEE ALL, no adopt | Return → fork (face still unanswered — a legitimate re-show, not a re-ask) | fork |
| 6 | **DESIGN YOUR OWN** | styler pushed with the add-flow context (`?from=add`); **KEEP already equips** — its KeepBeat Done (and the publish PrintRitual Done) end to the Collection instead of `replace(/game/:id)` | **Collection, card worn** |
| 7 | Styler ✕ / KEEP-AS-DRAFT | no equip happened → back → fork (face unanswered; keep-default is truthful) | fork |
| 8 | Keep the default for now | ends the flow | Collection, default card |
| 9 | ‹ RETURN TO COLLECTION (any stage) | ends the flow (implicit keep-default; status already saved per-tap) | Collection |

Supporting behavior:
- **Equip is best-effort, never a wall:** if the chained equip PATCH fails after a successful adopt,
  the flow STILL ends in the Collection — the grant is held, the card waits in the switcher, and the
  sheet's settle notes it quietly. No retry loop, no stranding; re-equipping is one switcher tap.
  (Adopt can't double-charge — re-adopt returns `ALREADY_ADOPTED`.)
- **"New entry visible" on landing:** the end-of-flow navigation carries a one-shot `justAdded=
  <entryId>` param; the Collection scrolls the entry into view with a brief highlight pulse
  (default sort is MY ORDER, where a fresh add can sit off-screen — landing alone doesn't satisfy
  the owner's "visible"). Treatment detail = OC-3.
- **W3-I fix (all contexts, incl. game-page lists):** `useContributorPaging` gains a `resetKey`
  (`gameId:sort`) — a page-1 refetch with the SAME key (the adopt-invalidation case) keeps the
  accumulated tail (`appendUnique` already dedupes overlap); only a real key change (sort flip /
  different game) resets. Offset drift on the kept tail is the already-blessed W3-H class.
  Mechanism alternative = OC-1.
- **AdoptCardSheet copy variant:** in add-flow context the success settle reads equipped ("It's on
  your shelf — {GAME} wears it now"), not "equip it any time"; Done ends the flow. Other contexts
  unchanged.

## 3 · P2-b / P2-c / P2-d folded in

### 3.1 P2-b — the CREATE name is locked
The Name field renders read-only, prefilled from the searched query; **tapping it routes back to
search** (query preserved, field focused) — the one honest edit path, since editing the name in
place would un-verify the no-match result. The CAT-03 dedup warn beat (`DUPLICATE_SUSPECTED`
banner · did-you-mean picks · Create-anyway override · exact-match never-override) is unchanged —
it's the server-side backstop behind the same premise.
- ⚠ Worth the owner's eyes: **CAT-13 locks `name` post-create** (title fixes = report → admin
  MOD-14), so a typo'd/badly-cased search string becomes a permanent catalog title. The
  tap-name-to-fix-in-search path is the mitigation; see OC-2.
- **Ripple:** product-spec **CAT-03** amendment (create-form name immutability as part of the
  create-time semantics) + changelog/version bump. **No api-contract change** (request shape
  untouched).

### 3.2 P2-c — genres optional at create
CAT-02 reads "**name (required), genre(s), studio/developer (optional)…**" — genres were never
marked required; the build resolved the ambiguity as required (`genreIds: .min(1)` in
`packages/shared/src/schemas/request/catalog.ts` + the client's disabled Create gate). Proposal:
allow an empty `genreIds`. The story is sound: CAT-13 wiki editing adds genres later; the game-page
DETAILS grammar already omits absent rows (walk-3 #16); the repo layer already no-ops on an empty
list.
- **Ripple:** product-spec **CAT-02** clarified to "genre(s) (optional)" (+ changelog/bump) ·
  api-contract **POST /catalog/games** row notes `genreIds` may be empty (+ bump) · shared schema
  `.min(1)` dropped · client gate drops the genre requirement (label gains a quiet "optional") ·
  the catalog-slice integration test asserting the 422 flips to a 201.

### 3.3 P2-d — Create-button prominence
Search settled with **0 matches** → the panel's "be the one who adds it" + the **gold** stepped
`Create "{q}"` (as today), and the "NONE OF THESE?" lead is dropped there (there are no "these").
Search settled **with matches** → the create affordance de-emphasizes to a **TertiaryLink** under
the "NONE OF THESE?" lead. Mid-fetch → unchanged (the height-anchor discipline from walk finding
#18 holds; the swap must not reflow).
- **Ripple:** pure look/flow → **design-spec** (add-game section: the create-affordance prominence
  rule) + the SCREEN-STATUS add-game row, at build time. No product-spec/api-contract change.

## 4 · Implementation sketch

| File | Change | ~Size |
|---|---|---|
| `apps/mobile/app/add-game.tsx` | fork: chain equip after adopt + end-of-flow navigation; SEE-ALL door passes `entryId`; styler door passes `from=add`; CreateForm name-lock (tap → back to search) + genre gate drop + P2-d swap + copy | ~120 |
| `apps/mobile/app/game/[id]/cards.tsx` | read the add-flow params → equip after adopt + `dismissTo` Collection on Done; other contexts untouched | ~40 |
| `apps/mobile/app/styler/[gameId].tsx` | `from=add`: KeepBeat/PrintRitual Done + their Frame onBack end to Collection instead of `replace(/game/:id)` (3 exit sites, one helper); all other entries unchanged | ~20 |
| `apps/mobile/src/components/game/AdoptCardSheet.tsx` | add-flow settle copy/Done variant (prop) | ~15 |
| `apps/mobile/src/components/contributor/useContributorPaging.ts` | `resetKey` — same-key page-1 refresh keeps the tail (W3-I) | ~12 |
| `apps/mobile/app/(tabs)/collection.tsx` | one-shot `justAdded` scroll-to + highlight pulse (OC-3) | ~50 |
| `packages/shared/src/schemas/request/catalog.ts` | `genreIds` `.min(1)` dropped | 1 |

- **Server change: none.** Adopt + equip are the existing endpoints, chained client-side; the
  catalog service/repo already tolerate an empty genre list once zod admits it.
- **Navigation note:** end-of-flow from a nested screen = pop the whole add stack
  (`router.dismissTo('/(tabs)')` on this expo-router; verify at build — the root Stack is flat,
  `animation:'none'`).
- **Test surface:** rewrite `add-game-adopt-step.test.tsx` (adopt→equip→end; fork re-entry
  truthfulness; empty-gallery fork unchanged) · a cards.tsx add-flow-context test ·
  `useContributorPaging` resetKey units · CreateForm lock/genre/P2-d cases (touching
  `add-game-search-status.test.tsx`) · api `catalog-slice` genre flip. No Maestro.
- **Spec/contract executions at build time (after the nod):** product-spec — amend the 0.66
  add-flow completion posture (fork adopt/design chains the COL-06 equip; every face-answer ends
  in the Collection; fork only renders over a default-faced entry) + CAT-03 (name lock) + CAT-02
  (genres optional), one changelog line each, version bump; api-contract — the POST /catalog/games
  genre note (bump); design-spec + SCREEN-STATUS — P2-d + the flow's exit map. COL-06/ECON-03/04
  need **no** edits (reused verbatim). `/health` after the doc pass.

## 5 · Open choices (recommendation first)

- **OC-1 — W3-I mechanism.** **Recommend the `resetKey` tail-keep** (small, contained, W3-H-blessed
  drift class). Alternative: drop the blanket `CommunityCards` invalidation on adopt and patch the
  cache in place (`adopted:true`, count+1 across the game's cached gallery args) — zero drift,
  but ~4–5× the code and it must enumerate cached args; not worth it at beta.
- **OC-2 — name-lock strictness.** **Recommend the hard lock + tap-routes-back-to-search** (the
  owner's stated premise, with a one-tap fix path). Alternative: an "edit → re-verify" in-place
  loop — more machinery for the same guarantee. Flagging again: with CAT-13's post-create name
  lock, whatever string is created is permanent short of admin; if that sits badly, the cheap
  extra is a one-line "check the spelling — this becomes the catalog title" hint on the form.
- **OC-3 — the landing moment.** **Recommend scroll-to + a ~1.5s highlight pulse** on the new entry
  (one-shot param; MY ORDER can bury a fresh add, so plain landing doesn't deliver "visible").
  Alternative: plain landing now, polish later — saves ~50 lines if you'd rather see the wave land
  sooner.
- **OC-4 — where the DESIGN path ends.** **Recommend the Collection** (the invariant: every
  face-answer lands on the shelf wearing it; the game page stays one tap away). Alternative: keep
  the styler's standing game-page landing for the design door only — preserves the current
  celebration exit but leaves the flow ending in two different places.
