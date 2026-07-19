# Pre-beta dev-copy ledger — user-facing scaffolding to strip (2026-07-18)

> Source: the `devcopy-audit` workflow (10 Fable agents, one per screen-area, reading actual JSX —
> rendered strings only, comments/tests excluded). 62 unique instances (by file:line). Owner reviews;
> Claude executes the accepted rows. Tick `[x]` to accept a removal/reword; strike a row to keep it.
> **Comments in code are NOT in scope** — only text that paints on screen.

## Legend
- **STRIP-ID** — legitimate slot, but a stable feature-ID renders verbatim; drop the parenthetical.
- **REMOVE** — pure scaffolding / a promise for an already-shipped feature; delete the line.
- **REWORD** — the slot earns its space but the words are spec/engineer vocabulary; swap to product voice.
- **OWNER-CALL** — a real judgment (inert rows, duplicate hints, "coming soon" affordances).
- **KEEP** — legitimate product copy (coachmarks, empty states, economy transparency); listed for completeness.

---

## A · FEATURE-IDs rendered to users — STRIP-ID (5) · recommend: do all
- [ ] `app/(tabs)/collection.tsx:508` — "Pin the game you're on — it leads the shelf **(WTP-03)**." → drop `(WTP-03)`.
- [ ] `src/components/profile/EditableIdentity.tsx:109` — "YOUR AVATAR IS A DESIGN **(PROF-08)**" → drop `(PROF-08)` (and the phrase is cryptic — consider "YOUR AVATAR" or cutting the caption; the pencil already affords it).
- [ ] `src/components/profile/EditableIdentity.tsx:128` — "NEXT CHANGE {date} · ONCE / 30 DAYS **(PROF-06)**" → drop `(PROF-06)`.
- [ ] `src/components/profile/EditableIdentity.tsx:131` — "**SCREENED (MOD-07)** · A–Z, 0–9, _ · SAVES WHEN YOU TAP AWAY" → drop `(MOD-07)` and "SCREENED" (moderation vocab) → "A–Z, 0–9, _ · SAVES WHEN YOU TAP AWAY".
- [ ] `src/components/game/FriendGamePage.tsx:428` — "{friend}'s notes & platforms stay private **(COL-04/05)** — only hours · status · since show." → drop `(COL-04/05)`.

## B · STALE / FALSE deferrals — REMOVE (promise a feature that already shipped) (6) · recommend: do all
- [ ] `src/components/styler/KeepBeat.tsx:124` — "SHARE — arrives with card sharing" — **sharing shipped M5**; hide the row or make SHARE live.
- [ ] `src/components/canvas/PrintRitual.tsx:294` — "SHARE — arrives with card sharing" — same, on publish.
- [ ] `src/components/styler/KeepBeat.tsx:112` — "⤢ EDIT ART — the Canvas arrives with the deep editor" — **Canvas shipped M4**; leftover M3-era line.
- [ ] `app/styler/[gameId].tsx:1153` — "Looking for community faces? Adopting arrives with the gallery." — **gallery/adopt shipped M5/M6**; wire a real ADOPT entry or strip.
- [ ] `app/user/[id].tsx:209` — "Percentile standings arrive with a later update." — roadmap scaffolding for a feature users won't miss; silent omission is honest.
- [ ] `src/components/device/*` `device.tsx:743` — "☑ STICKERS RIDE THE REAL SHELL · NAV STAYS FULLY LEGIBLE" — acceptance-criteria vocabulary; the preview demonstrates it.

## C · SPEC / ENGINEER vocabulary leaking to users — REWORD (~13) · recommend: reword to the suggested voice
- [ ] `app/invite-friends.tsx:78` — "Couldn't **mint** your invite…" → "Couldn't create your invite…".
- [ ] `app/invite-friends.tsx:98` — "One **token mints** your link and this QR…" → "The link and QR are the same invite. Anyone who opens it can add you with one tap. Expires in 7 days."
- [ ] `app/invite/[token].tsx:98` — "**Resolves** through their profile — one tap sends the request." → drop (the CTA above already says it).
- [ ] `src/components/game/CardSwitcher.tsx:212` — "Adopted from {designer} — **the image, not the layers**." → "Adopted from {designer} — adopted cards can't be edited."
- [ ] `app/(tabs)/friends.tsx:173` — "The river continues — **aggregated, capped, trivia excluded**." → "You're all caught up." (or drop).
- [ ] `src/components/canvas/ProofView.tsx:31` — "PROOFING — THE TRUE PRINT, **CLOSED ATTRIBUTES LIVE** · …" → "…FRAME & EFFECT INCLUDED · …".
- [ ] `src/components/game/CardDetailSheet.tsx:72` — "Design your own card from the CARDS tab — **the Styler is open**." → "This is the standard face — design your own from the CARDS tab."
- [ ] `app/(tabs)/discover.tsx:192` — "Upcoming releases arrive with **the M7 discovery batch — … the catalog upcoming feed is live**." → "Upcoming releases aren't here yet — check back soon."
- [ ] `app/device.tsx:746` — "Handles hidden, controls quiet — the true on-shell preview." → "This is how your device wears it." (or drop; the ◉ ON-SHELL PREVIEW strip names the state).
- [ ] `src/components/collection/TopCurated.tsx:233` — "YOUR TOP 10 — the curated showcase (it headlines your Profile). Tap ARRANGE to re-rank or **change members**." → "YOUR TOP 10 · headlines your Profile — tap ARRANGE to edit."
- [ ] `app/user/[id]/collection.tsx:189` — sheet title "Filter · **read-only**" → "Filter".
- [ ] `src/components/collection/TopCurated.tsx:282` — "'S TOP 10 · **read-only**. Tap a card to open the game." → the bottom bar already says READ-ONLY; trim the subline.
- [ ] `src/components/commerce/ThemePreviewScreen.tsx:22` — specimen "**Primary text** reads here / **Secondary copy** sits under it" → in-world sample copy (a fake card name + caption).

## D · OWNER-CALL — inert rows, duplicate hints, "coming soon" affordances (needs your ruling)
- [ ] `src/components/game/PlayDossier.tsx:32` — RATING row shows "**PENDING**" (permanently inert) → remove the row, or dim stars with no status word.
- [ ] `src/components/game/PlayDossier.tsx:210` — PLATFORMS row shows "**—**" (permanently empty) → drop the row until platforms land.
- [ ] `app/sign-in.tsx:98` — FORGOT? / Sign in with Apple → "**coming soon** / We're still building this" → reword ("Password reset isn't available yet — contact support") or hide the affordances for beta.
- [ ] `src/components/profile/EditableIdentity.tsx:111` — avatar pencil tap → "The avatar designer is **coming** — for now you wear the monogram." (**ratified as deferred** — this is the interim copy; reword to product voice or leave.)
- [ ] `src/components/profile/EditableIdentity.tsx:168` — "Genres load from the catalog." → a loading/failed state instead of an implementation note.
- [ ] `app/contributor/[id].tsx:475` — VIEW ALL → "Showing the top results — the full list **arrives soon**." → "Showing the top {N}" or ship the cursor tail.
- [ ] `src/components/styler/KeepBeat.tsx:103` (+ `PrintRitual.tsx:282`) — clout "**0 ADOPTIONS**" hardcoded — M6 social is built; wire the real count or it becomes a silent lie.
- [ ] `app/(tabs)/friends.tsx:143` — "**LOW-NOISE**" badge beside RECENT ACTIVITY — internal-spec flavor tag; keep as flavor or drop.
- [ ] `app/device.tsx:562` — "DECALS GO ON THE PLASTIC, NOT THE SCREEN" repeated on every placement (the ⊘ refusal tag + secSub already teach it) → optional quieter readout.
- [ ] `app/device.tsx:810` — "YOUR LOOKS — {n} SAVED · SHELL + STICKERS + THEME, SAVED AS ONE" — third stacked heading; restates the secSub two lines up; clutters spacing.
- [ ] `app/store.tsx:660` / `:671` — empty-aisle "being stocked — arrive as the catalog fills" + a double-printed baseline hint → suppress the second on empty aisles; moot if aisles are stocked by beta.
- [ ] `app/store.tsx:472` — "New premium items arrive as the catalog fills…" — moot if the roster is stocked before beta.

## E · LEGAL placeholder copy — a REAL beta risk, not tidiness (decide separately) · OQ-119
> These render "**This is placeholder text**" / "**DRAFT — placeholder copy**" to users. App-store review reads
> privacy policies, and beta users seeing "placeholder" is a trust/consent risk. Tracked as OQ-119 (real copy
> = a road-to-market §10 release task). Decision: does beta count as the deadline for real ToS/Privacy copy,
> or do we at least drop the self-declared "placeholder"/"DRAFT" wording for the interim?
- [ ] `src/components/LegalScreen.tsx:24` — "DRAFT — placeholder copy. The final policy is published on a hosted domain before launch."
- [ ] `app/legal/terms.tsx:12` — "This is placeholder text. The complete Terms of Service … before public launch." (also doubles the DRAFT banner)
- [ ] `app/legal/privacy.tsx:12` — "This is placeholder text. The complete Privacy Policy … before public launch." (also doubles the DRAFT banner)

## F · KEEP — legitimate product copy (not scaffolding) (15)
Coachmark "Tap a card to flip it for your stats" (`collection.tsx:360`, the app's one self-retiring tip
component) · the Store economy-transparency lines ("free baseline isn't sold here" `store.tsx:475`, "Pixels
are earnable free" `:526`, "Restore re-syncs, never refunds" `:531`, "Packs are on their way" `:503`) ·
LandedMoment "Logged in your wallet ledger" · Device empty/edit states (`device.tsx:824`, `:764`,
StickerRail:22) · ProofView size-ladder header (`:35`) · Styler one-slot/effect + taxonomy explainers
(`:1282`, `:1134`) · TopCurated ARRANGE mode line (`:181`, minor wording touch-up optional) · Discover
"— DRAG TO REORDER" (owner-vetted) · Settings "Screen theme isn't here — it's in the Device editor" (`:127`).

---

## Recommended execution order
1. **A + B + C** (24 rows) — unambiguous: strip IDs, remove shipped-feature lies, reword spec vocab. One pass, no product risk. *Recommend just doing these.*
2. **D** — your rulings row-by-row (mostly "remove the inert row" vs "quiet it").
3. **E** — the legal decision (likely needs real copy before public launch regardless; beta bar is your call).
