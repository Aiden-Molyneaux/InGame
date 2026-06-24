# Welcome & Auth — DRAFT B · games-forward landing (brief)

**File:** `docs/design/mockups/welcome-auth/welcome-auth-draft-b.html`
**Baseline / comparison:** `docs/design/mockups/welcome-auth/welcome-auth-states.html`
(the current direction — leads with an on-screen mini-DEVICE hero)
**Screen:** §4.13 Welcome & Auth · the logged-out front door
**Date:** 2026-06-24

---

## The direction

Draft B is the **distinct alternative** to the current board. Where the current direction
leads its W1/W1b landing with an **on-screen mini-DEVICE hero** (a tilted cabinet thumbnail
showing the app), Draft B **leads with the GAMES**. It sells what InGame *is* — a
**player-built catalog of games and custom cards** — straight from the logged-out landing,
before asking the visitor to do anything.

The W1/W1b hero, top to bottom:

1. **Wordmark + eyebrow** — `INGAME` · "A PLAYER-BUILT GAME CATALOG" (the one-line what-it-is).
2. **Showcase** — three **real catalog `GameCard`s** (community-designed), using the catalog
   GameCard component + the SVG card-art roster lifted verbatim from the sibling boards
   (`collection-states` / `discover-states`): Ratchet · Destiny · Minecraft on iOS;
   Marathon · Resident Evil · Destiny on Android. Cards are shown at their **full 63/88 face,
   never cropped (F-01)**, with the C5 stepped-diagonal silhouette (F-02 step) and square
   on-screen chrome (F-07). The centre card is a hair larger ("featured") — still uncropped.
   A "Cards above designed by @player…" credit underlines the user-built point.
3. **Two system-wide `StatTile`s** — `GAMES IN THE CATALOG` (12,840) and `HOURS LOGGED`
   (2.3M), with a sub-line **"Community totals across every player — and growing."** so they
   read unambiguously as **system/community aggregates, NOT the visitor's own**. Clean stat
   readouts on the F-06 scale (21px number / 9px label). **Not gold** — these are
   informational, not acquisitive (F-02).
4. **Contribution-inviting tagline** (the catch line) — see below.
5. **Auth entry, carried unchanged** — the sign-in-first form (EMAIL + PASSWORD, FORGOT
   PASSWORD?, orange `SIGN IN` keycap) rides **below** the hero, with CREATE ACCOUNT + (iOS)
   Sign in with Apple under the OR divider. The landing both **inspires** (hero) and **lets
   the user get in** (form), in one scroll.

**Composition call:** hero first (inspire), then the form (get in). The form is far enough
down that the showcase + stats are the first thing the eye lands on, but the visitor never
has to hunt for sign-in — it's the next block, exactly where the current board puts it.

---

## The tagline

**Used (hero):**
> Built by players, for players. **Add your games, design your cards**, and the catalog
> grows with you. Make an account to start your cabinet.

**Alternatives:**
1. > A catalog made by the people who play. **Add a game we're missing, design its card** —
   > your collection, your contribution.
2. > 12,840 games and counting, every one added by a player. **Sign up, log your library,
   > and design the cards** — InGame grows with you.

---

## The stats shown

| Stat | Placeholder value | Framing |
|---|---|---|
| Total games in the system | **12,840** | "GAMES IN THE CATALOG" |
| Total hours logged in the system | **2.3M** | "HOURS LOGGED" |

Sub-line under both: *"Community totals across every player — and growing."* — making the
**system-wide / not-personal** framing explicit (a logged-out visitor has no collection yet).

---

## Open question — flagged (NOT written to any shared doc)

**OQ (new):** The two system-wide stats need a **real data source**. The Welcome page is
logged-out, so this should be a **PUBLIC, unauthenticated aggregate-stats endpoint** exposing:

- `totalCatalogGames` — count of games in the community catalog, and
- `totalHoursLogged` — sum of hours logged across **all** users.

This is **new behaviour + a new API surface** and needs a **stable ID** (a `SYS-` / `STAT-`
or `CAT-` behaviour in the product-spec, rippled to the api-contract as a public
`GET /stats/public` or similar). Considerations to resolve before formalizing:

- **Cache / freshness** — these are expensive aggregates; almost certainly served from a
  cached/periodically-recomputed counter, not a live `COUNT(*)`/`SUM()` per page load.
- **Abuse / exposure** — exposing total-hours across all users is a low-sensitivity aggregate,
  but confirm there's no per-user leakage and that the endpoint is rate-limited (it's
  unauthenticated).
- **Empty / pre-launch state** — the hero must degrade gracefully when the numbers are tiny
  or the endpoint is unavailable (fallback copy, or hide the StatTiles).

Per the design-phase rules this is recorded here only — **append to
`docs/open-questions.md`** as the inbox item; do **not** hand-patch it into the spec or
api-contract. The mockup draws the numbers as placeholders / desired-state.

---

## What stayed the same (vs the source board)

Everything except the W1 + W1b landing hero. Verified **byte-identical** from the Stage 2
marker onward (`diff` exit 0):

- **W2** create account (form + AUTH-10 age-13/ToS gate)
- **W3** live username availability (checking → available, MOD-07)
- **W4** field validation incl. the MOD-07 rejected-username error
- **W5** sign-in wrong-credentials inline fail (AUTH-02)
- **W6** SIWA username-completion + account-linking (AUTH-09)
- **W7** password-reset request · **W8** email-sent / set-new-password (AUTH-04)
- **W9** post-signup verify-email soft notice + resend (AUTH-08)
- **W10** Signal Lost + RETRY · **W11** Offline writes-gated (SYS-10)
- the **sign-in-first form** itself (now riding below the hero on W1/W1b)
- the **grayed / locked NavBand** ("SIGN IN TO UNLOCK") on every artboard, F-03 3D shell keys

The only additions outside the hero are: (a) the card-art SVG symbol library (gradients +
`art-destiny/marathon/minecraft/ratchet/re`) appended to the shared `<defs>`, lifted verbatim
from `collection-states`; (b) the new hero CSS (`.ghero`, `.showcase`, `.gcard.show-size`,
`.stat-tile`, `.invite`); and (c) board labels / captions / matrix copy updated to read
"DRAFT B — games-forward landing".

---

## DS conformance notes

- **F-01** — GameCards shown at full 63/88 face; never cropped (showcase widths chosen so all
  three fit the screen with gaps; `aspect-ratio: 63/88`).
- **F-02** — GOLD is acquisitive/PIXELS only. The stats, showcase, tagline, and eyebrow are
  **not gold**; every auth CTA stays orange/cream. Cards use the F-02 stepped silhouette.
- **F-05** — pink is the physical shell LED only; nothing on a screen surface is pink.
- **F-06** — on-screen type held to 21/15/11/9 (stat number 21, labels/eyebrow/credit 9,
  invite 11).
- **F-07** — square on-screen chrome (StatTiles, stepped cards).
- **F-08** — one font per surface (Chakra Petch on screen; Paytone One the shell wordmark).
- **F-03** — flat Scanline screen keycaps + 3D shell NavBand, carried verbatim.

Self-verified via headless Edge; screenshot artifacts deleted before turn end (no PNGs left).
