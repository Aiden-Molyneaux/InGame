# 0079 — M6 W-6: wiki-style game-detail editing (OQ-155)

**Date:** 2026-07-18 → 2026-07-19 · **Status:** LOCKED (owner-signed, [beta-wave §E](../planning/m6/beta-feature-wave.md)) · **Owner:** Aiden
**Companions:** [`game-edit-wiki-draft.md`](../planning/m6/game-edit-wiki-draft.md) (the design draft this ratifies) · OQ-155 (resolved) · [`beta-feature-wave.md`](../planning/m6/beta-feature-wave.md) §E (the sign-off + amendments).

## The decision
A game's canonical details become editable after creation, **any-user wiki-style with moderation** — the owner's ruling on OQ-155. Edits apply **live immediately** and are fully reversible via an immutable history; review rides the M7 moderation console (nothing pulled forward). This supersedes the drawn-but-unbuilt CAT-06 (suggest-edits) + MOD-06 (console pre-approval) — editing is direct, not a suggestion queue.

## What it establishes
- **CAT-13** — wiki-live editing of **studio · publisher · releaseDate · genres**. **Title is LOCKED** (it is the CAT-03 dedup identity; rename requests ride the `incorrect_info` report → M7 MOD-14). MOD-07 screening on text fields; a stacked `catalog:edit` rate bucket (10/min + 50/day, G-K-tunable).
- **CAT-14** — the immutable `game_edits` history (one row per field-submit, applied in-tx; revert replays the old value + writes a reversal row). Revert rights = **editor-self · the game's contributor · admins** (amendment A3; MOD-10-logged). Attribution line `EDITED BY X · 2D AGO`.
- **MOD-16** — the M7 console EDITS queue (dependency note only; not built here).

## Owner amendments (beta-wave §E, folded in)
- **A1 — the 14-day age-gate:** an editor's account must be ≥ 14 days old to submit an edit; **`role='admin'` exempt** (the role model is live — PROF-09/decision 0034). Refusal = the new `ACCOUNT_TOO_NEW` (403, FORBIDDEN family — an actor-standing refusal, not a resource-state 409). The client pre-gates with a quiet "unlocks after 14 days" disabled state; the server is the enforcement.
- **A2 — card `incorrect_info` reports:** the CARD report-reason set gains `incorrect_info` (details-required), additive MOD-01 amendment — the wrongness signal for a card whose details are wrong, mirroring the game reason.
- **A3 — revert rights** as above (confirmed the draft's recommendation over anyone-revert).

## Shape
`POST /catalog/games/:id/edits { field, newValue }` — the request **is** the history row; the 201 returns `{ edit, game }` (the applied `GameDetail`) so the client reconciles in one round-trip (no tag-invalidation refetch). `POST …/edits/:editId/revert`. `GET /catalog/games/:id` gains `lastEdit?`. New codes: `ACCOUNT_TOO_NEW` · `uneditable_field` · `no_change` · `already_reverted`. UI: the shared `AboutTab` facts block gains one cream EDIT key → per-field inline editors reusing the PLAY-dossier `bare` TextField grammar (N-B8).

## Build
Server (migration `0022_stormy_siren` `game_edits` + repo/service/controller/routes + rate bucket + integration suite) + client (AboutTab EDIT mode + the report-sheet card reason) shipped M6 W-6. The Fable build lane hit its usage limit mid-finish; the completion (test-mock fixes, the uncommitted-code commit, this record, the W-4 avatarConfig test reconcile) was carried by the Opus orchestrator. Spec/contract ripple in product-spec + api-contract (CAT-13/14 · MOD-16 · MOD-01 amendment); versions reconciled via `/health` after the concurrent-bump contention (F-14).

## Impacted IDs
CAT-13 · CAT-14 · MOD-16 · MOD-01 (amended) · CAT-03/CAT-06 (superseded) · MOD-06 (superseded) · MOD-14 (rename path) · PROF-09 (role gate).
