# W-C4 — Profile EDIT slice · build manifest

> **Surface:** the self-Profile edit affordances (`app/(tabs)/profile.tsx` in-place edit mode + a new
> `src/components/profile/EditableIdentity.tsx` + a new `src/store/profileApi.ts`). Privacy rides
> **Settings** (`app/settings.tsx`), per the board (see D-3).
> **Board:** `docs/design/mockups/profile/profile-states.html` — the **Edit-mode** artboard (self,
> in-place) + the fresh-profile empties · `docs/design/mockups/settings/settings-states.html` (PRIVACY
> & SAFETY toggle).
> **Contract (verified against `apps/api/src/routes/me-routes.ts`):** `PATCH /me`
> (`patchMeRequestSchema`: username · bio · favouriteGenreIds · favouriteGameId · privacy — **LIVE**) ·
> `POST /me/gamertags` · `PATCH /me/gamertags/:id` · `DELETE /me/gamertags/:id` (**LIVE**) ·
> `POST /me/avatar/draft` + `/me/avatar/publish` (composition shape-stubs, PROF-08 — **NOT a monogram
> picker**) · `GET /genres` (the controlled genre list — LIVE, in api.ts).
> **CLIENT-ONLY** — no `apps/api/**` / `packages/shared/**` edits. New endpoints ride a `profileApi.ts`
> `injectEndpoints` (the settingsApi/reportApi convention — api.ts untouched).

Status legend: **LIVE** (server endpoint confirmed + wired) · **EXPECTED(cite)** (deferred, rendered
honestly / cited) · **ASSUMPTION** (a call I made) · **GAP** (board/contract mismatch flagged).

---

## Design callouts (D — decisions the board forced)

- **D-1 — EDIT is IN-PLACE, per-field commit (OQ-034 doctrine), NOT a save/cancel form.** The board is
  explicit: *"The EDIT keycap presses + lights and the screen edits in place … per-field commit, no
  giant save … tap again to exit."* So each field commits on its own (`PATCH /me {field}` on blur /
  toggle; gamertag add/remove fire immediately). There is **no global Save/Cancel button** — exiting
  edit mode is the EDIT keycap toggling off. **DIVERGENCE from the packet's "save/cancel grammar"
  phrasing → I followed the BOARD** (design owns flow; a save/cancel form would contradict the drawn
  OQ-034 in-place doctrine). Flagged for the owner. The 0069 button grammar still applies to the
  discrete keycaps (EDIT ToolButton · gamertag add/remove · genre chips).
- **D-2 — Avatar edit = EXPECTED(deferred), monogram only.** The board draws the avatar with a corner
  ✎ badge that *"OPENS THE CARD-STYLE EDITOR (PROF-08)"* — the full vector-composition editor on a
  square canvas (CARD-01/15 rules, §9 flatten), **not** a preset/scheme picker. That editor is UNBUILT
  (the server exposes only `/me/avatar/draft`·`/publish` **composition shape-stubs**), and v2 has **NO
  image uploads** (a hard law — uploads/the public flatten are §10/§9, parked). **So the avatar "edit"
  is EXPECTED:** I render the PROF-08 **default monogram** (the existing `Avatar` component) with a
  ✎ affordance that surfaces a one-line "the avatar designer is coming" note — **no server call, no
  fake picker.** **ASSUMPTION for the owner:** the board draws nothing editable beyond the monogram +
  the "opens the editor" badge, so the monogram is the whole built avatar surface this slice; the
  composition avatar editor is its own future packet.
- **D-3 — Privacy lives in SETTINGS, not profile edit.** The profile board explicitly lists privacy
  under *"Deliberately not editable here: … privacy (Settings, PROF-03)"*, and the settings board draws
  the **LIMITED PUBLIC PROFILE** toggle under PRIVACY & SAFETY. **So the packet's "privacy toggle" is
  built in `app/settings.tsx`** (the §0.10 slice deferred it; now added), via `PATCH /me {privacy}`.
  This satisfies "build the privacy toggle (friends|public)" on the served seam while honoring the IA
  both boards draw. Flagged as the deliberate placement call.
- **D-4 — dimmed "lives elsewhere" rows.** In edit mode the board dims Now-Playing (Collection),
  Device (Device editor), stats (derived), privacy (Settings) with a note saying where each is edited.
  Scope-minimal build: those sections stay as their normal read-only display in edit mode (they already
  route to their editors); the edit affordances concentrate on the IDENTITY region (the board's own
  focus). The "teach the IA" dimming is a POLISH pass, not owed for the functional slice — cited.

---

## Field-by-field (from the Edit-mode artboard)

| field | server seam | status | notes |
|---|---|---|---|
| **username** | `PATCH /me {username}` | **LIVE** | cooldown-gated off `me.usernameNextChangeAt` (PROF-06 microcopy: "next change …"); disabled + microcopy when a future date. MOD-07 screening is server-side → the `VALIDATION_ERROR {details:[{path:'username',message}]}` (422) surfaces inline under the field (the api-contract 0.46 field-targeted detail). Also surfaces `username_taken`/regex messages the same way. |
| **bio** | `PATCH /me {bio}` | **LIVE** | 140-char counter (`BIO_MAX`, shared). Commits on blur. Screening 422 surfaces inline (same detail path). |
| **genres** | `PATCH /me {favouriteGenreIds}` | **LIVE** | chips from `GET /genres` (controlled list, CAT-04). Toggling a chip commits the full new id array. |
| **gamertags** | `POST` / `DELETE /me/gamertags[/:id]` | **LIVE** | add (platform picker + handle field) · remove (✕ per chip). Handle screened server-side → 422 surfaced. `PATCH /me/gamertags/:id` exists but the board draws only ✕/add → edit-in-place is EXPECTED (remove+re-add covers it). |
| **avatar** | `/me/avatar/draft`·`/publish` (composition) | **EXPECTED(D-2)** | monogram shown; ✎ badge → "designer coming" note. No call. |
| **privacy** | `PATCH /me {privacy}` | **LIVE (in Settings, D-3)** | `Toggle` under Settings PRIVACY & SAFETY: OFF=friends (default) / ON=public (LIMITED PUBLIC PROFILE off = only-friends). |
| favouriteGameId | `PATCH /me {favouriteGameId}` | EXPECTED | the pin is set from the game/collection context (WTP-03 / decision 0050), not the identity editor — out of this slice. |

---

## ARCH

- **A-1 — in-place edit mode.** `profile.tsx` gains an `editing` state + an EDIT `ToolButton` in the
  header (beside the Settings gear + CurrencyCounter). When editing, `IdentityBlock` is swapped for the
  new `EditableIdentity` (the board edits the identity region in place). The rest of the screen renders
  unchanged (D-4). EDIT toggles off to exit (no save button — D-1).
- **A-2 — `EditableIdentity` owns the per-field commit.** Props: the `me` self-shape + the genres list +
  callbacks (`onPatchMe`, `onAddGamertag`, `onRemoveGamertag`) returning outcomes so the component stays
  store-free + unit-testable (the AdoptCardSheet/ReportSheet pattern). It renders username/bio/genres/
  gamertags/avatar-monogram and surfaces the 422 field errors.
- **A-3 — `profileApi.ts` (injectEndpoints).** `patchMe` (invalidates `Me`) · `addGamertag` · `removeGamertag`
  (both invalidate `Me`). `patchMe` returns the updated self-shape (parsed at the seam) so the optimistic
  path is unnecessary — the `Me` tag refetch repaints. api.ts untouched.
- **A-4 — screening-422 mapping.** The mutations reject with `{ data: { error: { code:'VALIDATION_ERROR',
  details:[{path,message}] } } }`. `EditableIdentity` maps `details` by `path` → the per-field error line
  (username/bio/handle). A non-422 failure → a generic inline "couldn't save" on that field.

---

## New / touched files
- **New:** `src/store/profileApi.ts` · `src/components/profile/EditableIdentity.tsx` (+ test) ·
  `src/screens/profile-edit.test.tsx` (the in-place mode wiring) — tests under `src/` (never `app/`,
  the P12 route-tree lesson).
- **Touched (surgical):** `app/(tabs)/profile.tsx` (EDIT ToolButton + `editing` state + swap to
  EditableIdentity; W-C6 contributions row) · `app/settings.tsx` (the PROF-03 privacy `Toggle`, D-3).

## Jest
- per-field save round-trips (mocked mutations): bio · username · genre toggle · gamertag add/remove.
- username cooldown → the field disabled + the PROF-06 microcopy.
- screening 422 → the inline field error (bio + username paths).
- privacy toggle (Settings) → `PATCH /me {privacy}` (friends↔public).
- avatar model: monogram renders + the ✎ "designer coming" note, NO mutation fired.

## Open flags for the owner / parvati
- **D-1** per-field in-place commit (no save/cancel) — the board's OQ-034 doctrine, divergent from the
  packet's "save/cancel" phrasing.
- **D-2** avatar = monogram only; the composition avatar editor is a future packet (uploads are §10).
- **D-3** privacy toggle placed in Settings (both boards' IA), not profile edit.
- **D-4** the edit-mode "lives elsewhere" dimming of Now-Playing/Device/stats is deferred POLISH.
