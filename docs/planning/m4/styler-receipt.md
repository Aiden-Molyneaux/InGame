# styler — build receipt (M4 §3.2, 2026-07-05 · the Fable session)

> **Status: BUILT + SELF-VERIFIED (the full BOOT walk on Expo web) — the fresh-context murr + parvati
> passes are still OWED** (the dev environment went down at session end: Docker Desktop stopped, the
> stack with it). Per the pipeline a surface isn't DONE until parvati's verdict files in
> `m4-review-notes.md` — run both reviewers next session against `styler-manifest.md` (+ its
> ADDENDUM), then the owner stop (gate-5 taste — the aesthetic half of the §4 Fable stop).

## TL;DR
The whole §3.2 vertical landed in one session on Fable: **decision 0066** (architecture) → the
**card-substrate backend** (tables · routes · guards · tests, 127/127 integration) → the **Styler
client** (BaseRail → live-skia carousel → KEEP/SAVE-PRIVATE/autosave) → the **Game-page switcher
gone multi-card** → **the shelf wears the card app-wide** (CARD-07). Verified end-to-end in the
browser, including the two hardest unknowns: **skia-on-web** (CanvasKit) and the **draft autosave
document**.

## What changed (commits · IDs)
| Commit | What |
|---|---|
| `ebf2a33`+`4393990` | decision **0066** + api 0.53 / product-spec 0.52 / OQ-133+134 resolved / the Fable §4 verdict (GO) |
| `ed4276f` | the §3.2 **styler manifest** (the surface contract) |
| `926c36f` | the **backend substrate**: `card_designs` + `style_presets` + COL-06 equip + notes/rating + real `cardsDesigned` + seed ("Elden Ring — Aurora" private/equipped + 2 presets); 21/21 cards-slice integration, 7 SYS-07 markers, the 0040/cap-30/F36 guards |
| `55a0386` | the **Styler client** + the render module's 0063 free kinds + `CardFace` + the multi-card `CardSwitcher` + RTK endpoints |
| `e9138ce` | **CardFace across Collection + Profile** — the equipped design renders everywhere (CARD-07) |

IDs: CARD-04/06/07/11/12/14/15/16/18/20/24 · COL-06 · COSM-02 · PROF-04 · WTP-03 · OQ-107/108/110
fold-ins · OQ-133/134 resolved.

## Verified live (the BOOT walk, Expo web ~1280w)
DESIGN NEW → **P1 BaseRail** (system bases + **the saved presets merged into the rail — CARD-24b**) →
START WITH THIS → draft created (**"EDITING «Elden Ring» · SAVED 0s AGO"** — the CARD-24a line) →
FRAME section (6 free tiles) → **PIXEL** pick → EFFECT section (6 free) → **SOFT GLOW** pick →
**KEEP** → save-private + equip → **KeepBeat** ("✓ EQUIPPED FOR ELDEN RING" + **"2 CARDS DESIGNED ·
0 ADOPTIONS"** — honest-real from `/me`) → **DONE lands on the Game page WEARING the new card**.
The switcher shows DEFAULT + Aurora + the new design with correct tags/guards (equipped: SET-AS-MAIN
+ DELETE disabled with the 0040 note; EDIT-IN-STYLER live). The PLAY hero + CardDetail render the
composition; the EquipReadout derives real labels.

## The hard bugs found + fixed en route
1. **canvaskit typeface binding** — `useFont().getTypeface()` → `Skia.Font()` throws on web ("raw
   pointer to smart pointer is illegal"); fixed with `useTypeface` (proper smart-pointer Typeface).
2. **Metro stale resolver** — a long-lived Metro can't resolve NEWLY CREATED directories (served the
   `_error.bundle`); fix = restart Metro. (Now in the web-loop memory + a doctor-nick candidate.)
3. **The zombie :4000 supervisor** — an old npm wrapper kept respawning an env-less API that raced
   the stack's API for :4000 (the recurring stale-CORS!); killed the parent tree. (Runbook candidate.)

## Assumptions / interims (recorded in the manifest ADDENDUM)
Swipe-sections → chips+dots interim (the gesture rides §3.6) · fonts 2-of-5 real (roster pass owns
the rest) · card-bases/surprise endpoints deferred (client-side compose) · the dev premium-preview
carries to M5 · L3 offline EXPECTED(SYS-10).

## Owed next session (before the owner stop)
1. **murr** (fresh) on `55a0386`+`e9138ce` — priority lanes: the autosave state machine (debounce/
   retry/flush-before-KEEP races), the equip/delete guard flows, CardFace's lazy/Suspense/measure
   path, roster→composition patch correctness.
2. **parvati** (fresh) vs `styler-manifest.md` + the game-page ADDENDUM rows — needs the stack up
   (`dev-stack up`; Docker Desktop first).
3. Route findings → 0 flags → append the verdict + this receipt's outcome → **the owner stop**:
   gate-5 taste on the Styler (the §4 aesthetic half) + the small dossier-readback client follow-up
   (OQ-134's server half is done).
