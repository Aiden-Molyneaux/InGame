# W-6 — Wiki game-detail editing + edit history (OQ-155) — design + spec draft

**Status: DRAFT for the owner sitting** (beta-feature-wave §A W-6: design sitting → nod → build).
**Owner ruling (2026-07-18): ANY USER, WIKI-STYLE + MODERATION.** Recommended posture (recorded on
OQ-155, adopted here): **edits go LIVE immediately** and are **fully reversible via history**; human
review rides the **M7 moderation console** (capture-only at M6 — decisions 0076/0077 keep the console
M7). Nothing here pulls console work forward.

Grounding: product-spec CAT-02/03/04/05/06 · MOD-01/05/06/07/14 · api-contract 0.70 (`POST
/catalog/games` · `GET /catalog/games/:id` · the drawn-but-unbuilt `POST /catalog/games/:id/edits`)
· `apps/api/src/{db/schema.ts games, services/catalog-service.ts, config/rate-limits.ts,
moderation/screen.ts}` · `apps/mobile/{app/add-game.tsx, src/components/game/AboutTab.tsx,
src/components/game/PlayDossier.tsx, src/components/TextField.tsx (bare)}` · the N-B8 finding
(walk2-notes round 5: game-detail editing does not exist; add-game is a one-shot form).

---

## §1 The model — `game_edits`: every edit a history row, applied live

### 1.1 The table

```
game_edits
  id           uuid PK defaultRandom
  game_id      uuid NOT NULL → games.id
  editor_id    uuid NOT NULL → users.id
  field        text NOT NULL            -- 'studio' | 'publisher' | 'releaseDate' | 'genres'
  old_value    jsonb NOT NULL           -- the value BEFORE (string | string[] | null)
  new_value    jsonb NOT NULL           -- the value AFTER  (string | string[] | null)
  status       text NOT NULL 'live'     -- 'live' | 'reverted'
  reverted_by  uuid → users.id          -- who reverted (null while live)
  reverted_at  timestamptz              -- when (null while live)
  edited_at    timestamptz NOT NULL defaultNow
  idx (game_id, edited_at desc)         -- the history read + lastEdit
  idx (editor_id)                       -- the rate/abuse view + M7 dossier correlation
```

- **One row per changed field per submit** — the row IS the history entry AND the audit record.
  `old_value`/`new_value` are jsonb so `genres` (a sorted genre-id array), nullable strings
  (studio/publisher/releaseDate cleared → `null`), and plain strings all serialize uniformly.
- **Applied IMMEDIATELY in the same transaction** (wiki-live): insert the `game_edits` row + update
  the `games` row (or replace `game_genres` for the genres field). One `@mutation`, one tx, one
  domain event (`catalog.game_edited`, ids-only payload per F18).
- **Revert = replay `old_value`**: applies `old_value` back to the game, stamps the target row
  `reverted`/`reverted_by`/`reverted_at`, **and writes a NEW `game_edits` row** for the reversal
  (editor = the reverter, old/new swapped) — so the history remains a complete, append-only account
  and a revert is itself visible (and re-revertible) like any other edit. No history row is ever
  deleted or value-mutated; `status` + the revert stamps are the only mutable bits.
- **No `games` migration needed** — the attribution read (`lastEdit`, §4) derives from
  `game_edits` (latest row by `edited_at`); the games table is untouched. The migration is one new
  table.
- **No-op guard:** `new_value` deep-equal to the current value → 422 `no_change` (don't pollute the
  history with zero-diff rows).

### 1.2 Editable vs LOCKED fields

| Field | Posture | Why |
|---|---|---|
| `studio` | **EDITABLE** | CAT-02 optional text; MOD-07-screened; exactly the "fix the facts" case. |
| `publisher` | **EDITABLE** | Same as studio. |
| `releaseDate` | **EDITABLE** | Date-validated; a wrong year is the most common community fix. Note: changing it live-moves the game between the upcoming/new-releases rails (CAT-08/11) — those are live queries, so this is correct behavior, not a hazard. |
| `genres` | **EDITABLE** (full-replace, min 1) | Validated against the controlled list (CAT-04) exactly like create; stored in history as the sorted id array. |
| `name` / `normalizedName` | **LOCKED** | See below. |
| `createdBy` (contributor credit) | **LOCKED** | CAT-05 credit is a fact about creation, not a canonical detail. |

**Why the title is locked (the CAT-03 argument):** the name is the game's *identity*, not a detail.
`normalized_name` carries the partial unique index that is the F36 dedup race decider; the CAT-03
matcher, the never-overridable exact-match rule (decision 0058), and the MOD-05 merge machinery all
key on it. A user rename can (a) collide with a live entry — turning a simple edit into a merge
problem no user is equipped to resolve, (b) *dodge* dedup — rename "Elden Ring" to "Eldenn Ring"
and the real title is now claimable as a duplicate, and (c) silently rewrite what every collector's
shelf entry means. Renames therefore go through the **report path** — `incorrect_info` with a
details note ("title is misspelled: should be …") — and land as an admin **MOD-14 direct canonical
edit** in the M7 console, where the dedup/merge tooling lives. Locked ≠ unfixable; locked = fixed by
the surface that can see the collision.

### 1.3 What happens to CAT-06 (suggest-edits)

CAT-06 ("users may **suggest** edits … approved in the console, MOD-06") is the pre-ruling model —
review-then-apply. The owner ruling inverts it: apply-then-review. Recommendation: **supersede, don't
rewrite** — CAT-06's meaning ("suggestion queue") shouldn't silently morph under a stable ID. New
IDs in §5; CAT-06/MOD-06 get superseded-by notes; the `edit_suggestions` table sketched in
product-spec §6 is never built (replaced by `game_edits`). The contract's existing
`POST /catalog/games/:id/edits` line (drawn for CAT-06, never built) is **repurposed at the same
path** with the new live semantics — no dead endpoint left behind.

---

## §2 Abuse posture — for a beta of close friends, with M7 in view

1. **MOD-07 screening** on the text fields (`studio`, `publisher`) via the existing
   `screenedField()`/`screenText()` pass in catalog-service — the same 422 `screened` refusal as
   create. (MOD-07's spec row already names "edit-suggestion text"; the spec pass re-words it to
   "game-edit text".)
2. **Rate bucket** (SYS-05, stacked-pair per the `catalog:create` precedent, G-K async nod):
   `'catalog:edit': { limit: 10, windowMs: 60_000 }` + `'catalog:edit:daily': { limit: 50, windowMs: 24h }`.
   Ten a minute covers a genuine fix-up burst across several games; fifty a day is far beyond any
   honest use and starves a vandalism loop to a trickle that the history can absorb and revert.
3. **The "this edit is wrong" signal is the existing report**, not a new mechanism: the game
   report reason **`incorrect_info` (details required)** already exists end-to-end (MOD-01,
   `reports` capture, P7). A viewer who disagrees with an edit reports the *game*; the M7 console
   correlates the report with the game's edit history side-by-side. No new reason, no new table.
4. **Who can revert — recommendation: the edit's own editor + the game's contributor + admins.**
   Not wiki-pure anyone-revert. The argument, briefly: anyone-revert is symmetric — it gives the
   *vandal* the same one-tap weapon it gives the fixer, and produces revert wars precisely when
   there is no console to arbitrate (that's M7). Scoping it keeps every edit reversible by someone
   with standing: your own mistake (self-undo), the CAT-05 contributor as the entry's credited
   steward, and admins (logged, MOD-10). Everyone else has the report signal, which is the correct
   escalation for "two users disagree". If the contributor *is* the vandal, admins remain — and at
   close-friends-beta scale the admin is the owner. **[owner-nod]**
5. **The M7 console gets an EDITS queue** — recorded as a scoped dependency (MOD-16, §5), *not
   designed here*: per-game edit history view, `incorrect_info` reports correlated, one-tap revert
   (admin revert writes the MOD-10 audit row), editor-level rollup for spotting a bad actor. The
   beta ships without it because every edit is already reversible by §2.4's set.

---

## §3 UI — editing lives on the game page ABOUT tab, in any posture

**Where:** `AboutTab` (shared verbatim across OWN · FRIEND · CATALOG postures — the right home for
an ANY-USER ability; no posture gymnastics needed). The canonical-facts block gains **one `EDIT`
key** (ScreenButton **secondary/mini** — cream, per the 0069 button convention; sited on the facts
block, not the page header). Tapping it flips the facts block from the read line
(`STUDIO · YEAR · GENRE`) into a **per-field row list** with inline editors.

**The editor grammar is the PlayDossier's, reused wholesale** (gate-5 B.8 + N-B8): each field is a
titled row; tapping a row opens *that field's* editor in place without shifting the others; the
input is the **`bare` TextField** (the row titles the field and owns the error line — exactly what
`bare` was built for in N-B8); each save submits *just that field* and closes the row. Field
editors reuse add-game's pieces: `studio`/`publisher` = bare text inputs; `releaseDate` = the
YYYY-MM-DD text input (same format + validation copy as add-game); `genres` = the `GenreTag` chip
toggle row against `GET /genres`. Refusals (`screened`, `unknown_genre`, `no_change`, 429) render
on the row's own error line, per-field, PlayDossier-style.

**Attribution — recommendation: one quiet line, not silence.** Under the facts block, when the game
has ever been edited: `EDITED BY {username} · {2D AGO}` (latest edit only; dim, body-11, the same
register as the `ADDED BY` CAT-05 credit above it; routes to that user's profile like the credit
does). The case for it: provenance is what makes a wiki trustworthy, it is the soft deterrent
(edits are signed in public), and it is the very thing that prompts a friend to file
`incorrect_info` when a fact changes under them. Silent editing hides exactly the signal §2 depends
on. **[owner-nod]** No full history UI at beta — the server keeps the whole ledger; the M7 console
renders it.

---

## §4 Contract

**Recommendation: `POST /catalog/games/:id/edits` — the edits-POST.** It *is* the history row: one
write path, request ≅ row, no PATCH-vs-history dual-write to keep honest, and the path already
exists in the contract (CAT-06's drawn line, repurposed — see §1.3). A field-level
`PATCH /catalog/games/:id` would put the resource shape on the wire but forces the server to
diff-and-fan-out into history rows and makes "which field failed screening" reporting murkier;
rejected.

```
POST /catalog/games/:id/edits            (auth · rate: catalog:edit + catalog:edit:daily · MOD-07)
  { field: 'studio'|'publisher'|'releaseDate'|'genres',
    newValue: string | null | string[] }          -- genres: genre-id array, min 1
  → 201 { edit: { id, gameId, field, oldValue, newValue, editor { userId, username }, editedAt, status },
          game: <the GameDetail shape — the applied result, so the client reconciles in one round-trip> }

POST /catalog/games/:id/edits/:editId/revert     (auth: editor-self | game contributor | admin)
  → 200 { edit: <the reversal row>, game: <GameDetail> }
```

One field per request — it matches the per-field UI grammar (§3 saves one row at a time) and keeps
the row mapping 1:1. Multi-field batches are a client loop.

**Read ripple:** `GET /catalog/games/:id` gains
**`lastEdit?: { editor { userId, username }, editedAt }`** (absent when never edited) — the §3
attribution line's fuel, derived from `game_edits`, no games-table change. The search-result item
shape is untouched (no list-surface ripple). No standalone history GET at beta (nothing renders it;
the M7 console adds its own admin read with MOD-16).

**ERROR_CODES (additive):** 422 `uneditable_field` (title & anything not in the §1.2 editable set) ·
422 `no_change` (new value equals current) · 422 `already_reverted` (revert of a non-live edit row) ·
403 on revert by a caller outside the §2.4 set — plus the existing `screened`, `unknown_genre`,
standard 401/404/429. **Concurrency: last-write-wins, no compare-and-set** — the request carries no
`baseValue`; two friends editing the same field within seconds is vanishingly rare at beta scale,
and the loser's value sits intact in history one revert away. CAS is a scale-time upgrade, noted,
not built. **[owner-nod]**

---

## §5 Spec IDs (next free verified: CAT-13, MOD-16 — CAT-12/MOD-15 are the current maxima)

- **CAT-13 (P0)** — *Wiki-live canonical editing*: any user edits a game's `studio` / `publisher` /
  `releaseDate` / `genres`; edits apply immediately; text screened (MOD-07), genres
  controlled-list (CAT-04), rate-limited (SYS-05). **`name` is locked** (CAT-03 dedup/merge
  integrity) — title fixes go via report (`incorrect_info`, MOD-01) → admin MOD-14.
- **CAT-14 (P0)** — *Edit history + revert*: every edit is an immutable `game_edits` row
  (old/new value, editor, timestamp); revert replays `oldValue`, marks the row reverted, and writes
  a reversal row. Revert entitlement: the edit's editor, the game's contributor (CAT-05), admins
  (logged, MOD-10). The latest edit is attributed on the game page.
- **MOD-16 (P1, M7)** — *Console EDITS queue*: the M7 console renders per-game edit history,
  correlates `incorrect_info` reports, and offers admin revert (MOD-10-logged) + an editor-level
  rollup. (Scoped dependency only — designed with the console.)
- **Supersessions:** CAT-06 → superseded by CAT-13/14 (suggestion queue → wiki-live);
  MOD-06 → superseded by MOD-16 (approve/reject → review/revert); the §6 `edit_suggestions` table
  sketch → replaced by `game_edits`. MOD-07's row re-words "edit-suggestion text (CAT-06)" →
  "game-edit text (CAT-13)".

Spec pass on nod: product-spec (+CAT-13/14, +MOD-16, supersession notes, §6 data-model swap,
version bump + changelog) · api-contract (§4 shapes at the repurposed path, `lastEdit` ripple,
error codes, version bump) · component-map (AboutTab edit affordance) — then `/health`.

## §6 Packets + test lists (build after the nod)

- **E1 — server (fable): migration + service + routes.** `0007_game_edits` migration ·
  `applyGameEdit` / `revertGameEdit` mutations in catalog-service · the two routes ·
  `catalog:edit(+:daily)` buckets · `lastEdit` on `gameDetail`. **Tests (vitest/integration):**
  history round-trip (edit applies to the game + row written + `gameDetail` reflects both value and
  `lastEdit`) · genres full-replace round-trip (game_genres swapped, sorted-array history values) ·
  clear-to-null round-trip (studio → null) · revert (oldValue restored · target row
  reverted+stamped · reversal row written · revert-of-reversal works) · revert authorization matrix
  (editor-self ✓ · contributor ✓ · admin ✓ · stranger 403) · `uneditable_field` on
  name · `screened` on studio/publisher · `unknown_genre` + empty-genres 422 · `no_change` 422 ·
  `already_reverted` 422 · 429 on both buckets (override-rule trip) · unknown game 404.
- **E2 — client (opus): the ABOUT-tab editors.** EDIT key (secondary/mini) → per-field rows ·
  bare-TextField editors (studio/publisher/releaseDate) · GenreTag chip editor · per-row error
  surfaces · attribution line (+ absent-when-never-edited) · RTK mutation reconciling the returned
  `game` into the gameDetail cache (no refetch). **Tests (jest/RNTL):** rows render current values ·
  one open editor doesn't shift siblings (the B.8 invariant) · per-field save fires the single-field
  request · screened/429 errors land on the owning row · genres min-1 guard · attribution renders
  and routes.
- Builder≠verifier · combined verify · explicit-pathspec commits · parvati walk on the ABOUT tab —
  all standing discipline holds.

## §7 Owner-nod items (collected)

1. **Revert entitlement** — editor-self + contributor + admins (recommended, §2.4) vs wiki-pure
   anyone-revert.
2. **Attribution line** — `EDITED BY X · 2D AGO` on the ABOUT tab (recommended, §3) vs silent.
3. **Rate numbers** — 10/min + 50/day stacked (G-K async, §2.2).
4. **Title locked** (CAT-03/§1.2) — name fixes ride report → M7 MOD-14; confirm no beta rename path.
5. **Supersede CAT-06/MOD-06** with CAT-13/14 + MOD-16 (§5) vs rewriting the old IDs in place.
6. **Last-write-wins** (no CAS/baseValue) at beta (§4).
7. **Editable set** = studio · publisher · releaseDate · genres exactly (§1.2) — nothing else gains
   an edit path at beta.
