# Welcome & Auth (§4.13) — first-pass brief

**Screen:** 4.13 Welcome & Auth — the **logged-out root**
**Track:** welcome-auth · **Status:** REVISED (owner direct feedback 2026-06-24; supersedes the first-pass pre-shell ruling)
**Board:** `welcome-auth-states.html`
**IDs delivered:** AUTH-01 (email+password register) · AUTH-02 (access+refresh login) · AUTH-03 (Sign in with Apple, iOS) · AUTH-04 (password reset) · AUTH-08 (soft email verification) · AUTH-09 (SIWA username-completion + linking) · AUTH-10 (ToS/Privacy + age-13 gate) · MOD-07 (username text-screening)

---

## The one big decision — SUPERSEDED (owner ruling 2026-06-24)

**~~Pre-shell~~ → NavBand present on every artboard, grayed + non-interactive when logged out.** The first-pass
board shipped a *pre-shell* root (no NavBand anywhere; the device as a hero illustration only). The owner reversed
this: the app's **standard bottom NavBand now appears on every welcome/auth artboard**, lifted **verbatim** from
`collection-states.html` so it matches the app exactly. While logged out the 5 keycaps render **grayed /
desaturated and non-interactive** — a clear *"locked until signed in"* affordance (`.nav-band.locked` + a
"SIGN IN TO UNLOCK" silkscreen note). **The keys stay physical 3D (F-03 shell)** — the raised keycap edge is
preserved; only colour is desaturated.

> **New pattern owed to design-spec formalization:** the *grayed / locked logged-out NavBand* is not yet in the
> catalog or design-spec §1. It should be formalized (a `NavBand/locked` variant: grayscale + reduced opacity +
> `pointer-events:none`, keys keep the F-03 shell). Flagged here; **not** hand-patched into design-spec (00-INDEX §4).

The prior pre-shell reasoning (NavBand "lies" logged-out; identity object you don't have yet) is recorded below as
*history* — the owner's call is that a present-but-locked NavBand reads as a promise ("this is the app you're about
to get"), not a lie, and keeps the welcome visually continuous with the authed app.

<details><summary>Superseded first-pass reasoning (kept for the record)</summary>

1. The NavBand routes to authed, ownership-scoped surfaces (SYS-01); drawing it dead was thought to be chrome that lies.
2. The device-as-shell is an *identity* object (DEV-01) a logged-out visitor doesn't have yet.
3. The device still sells the fantasy (§4.13) — drawn as a hero illustration, content not chrome.
</details>

---

## The front door — SIGN-IN-FIRST (owner ruling 2026-06-24)

**The landing IS the sign-in form.** W1/W1b open with the **sign-in form already visible**: EMAIL + PASSWORD
`TextField`s, a **FORGOT PASSWORD** link, and a primary **SIGN IN** keycap (orange `/primary`, **not** gold, F-02).
**CREATE ACCOUNT** and **Sign in with Apple** (iOS only) are the **secondary** options on the same screen, below an
**OR divider** (CREATE ACCOUNT = cream `/secondary`; Apple = the mandated black HIG button). The old *separate*
sign-in artboard is **merged into the landing**; W5 now shows that same form in its **wrong-credentials error beat**
(no FlowHeader — it's the root). CREATE ACCOUNT still opens its own `FlowHeader` form (W2–W4). The Android landing
(W1b) is identical minus the Apple button. **FORGOT PASSWORD lives on the main landing.**

**W1 mini device → app fidelity.** The value-prop mini cabinet now reads like the real app: it carries its own lit
**NavBand**, realistic content (a COLLECTION card shelf, faces never cropped, F-01), and the **PIXELS currency mark**
in its screen header — the catalog's gold pixel-gem glyph + a small balance (a `CurrencyCounter`), exactly as the
real app surfaces PIXELS (gold = the acquisitive PIXELS economy, F-02).

---

## Interaction direction

**A sign-in-first front door that fans out to focused, single-purpose form screens.** The landing leads with the
sign-in form (the most common return path) + the value-prop mini device; CREATE ACCOUNT and Apple are the secondary
entries below the OR divider. CREATE ACCOUNT opens its own **`FlowHeader`-topped form screen** (◂ back to landing) —
the "a tap opens a focused page" pattern the reference Settings board uses, and the `FlowTakeover` lineage from Add
Game. One decision per screen; nothing modal stacks.

Form grammar is lifted **verbatim** from the catalog + the reference board so auth feels like the same app: `TextField` (cream inset, navy ink, accent caret — the F-09 named exception), `TextField/error` (alert hairline + 9px message), the flat `KeycapButton` family with Scanline-Energize press (F-03), the `InlineBanner` for the AUTH-08 verify notice, the `Toast` + `OfflineStrip` + `LoadError` lifecycle family (§1.6). **No pink on any screen surface** — on-screen active markers use the orange `StateMark` square (F-09); **pink is reserved for the physical shell LED / pip only** (F-05). The W8 reset confirm uses two clear glyphs — an envelope-with-sent-check for "link sent", a key for "set new password" (Chakra/SVG line marks on the F-06 scale).

**CTA colour discipline (F-02).** Every auth CTA is **orange/cream**, never gold — nothing here is acquisitive (no card is created, no PIXELS move). CREATE ACCOUNT / SIGN IN / RESET = `KeycapButton/primary` (`scr.accent` orange). Sign in with Apple = its mandated **black Apple button** (Apple HIG — the one exempt non-token surface, justified below). Secondary moves (CANCEL, RESEND) = cream `/secondary`. This is deliberately the conservative half of §1.1 — auth is "legible navigation," not delight.

---

## States drawn (the board)

Every artboard now carries the **grayed, locked NavBand** at the bottom (F-03 keys, desaturated + non-interactive).

Stage 1 — **Entry (the sign-in-first front door)**
- **W1 Landing / sign-in (iOS)** — opens with the **sign-in form** (EMAIL · PASSWORD · FORGOT PASSWORD · orange SIGN IN), then the OR divider and the **secondary** CREATE ACCOUNT + Sign in with Apple. The value-prop **mini device** reads like the real app (its own NavBand + a **PIXELS mark + balance** in its header + a card shelf).
- **W1b Landing / sign-in (Android)** — same front door, **Apple button absent** (AUTH-03: Android registers email-only; Google Sign-In parked §10). Proves the platform fork.

Stage 2 — **Create account (AUTH-01 + AUTH-10 + MOD-07)**
- **W2 Create account — resting** — email · username · password fields + the **age-13 + ToS/Privacy acceptance** block (AUTH-10, inline links + the explicit checkbox) + CREATE ACCOUNT (disabled until accepted).
- **W3 Username availability — checking / available** — the MOD-07-screened live availability beat (checking spinner → green ✓ AVAILABLE).
- **W4 Field validation/error** — the consolidated error state: email-taken `TextField/error`, weak-password message, and the **MOD-07 rejected-username** error (the screening reject, the brief's mandated state).

Stage 3 — **Sign in + Apple (AUTH-02 / AUTH-03 / AUTH-09)**
- **W5 Wrong credentials** — the **landing sign-in form in its AUTH-02 wrong-credentials error beat** (the calm inline auth-fail strip; no FlowHeader — it's the root). The resting sign-in form now lives on W1/W1b.
- **W6 SIWA username-completion (AUTH-09)** — after a first Apple sign-in: the choose-your-username step (screened, MOD-07) before entering the app, with the **account-linking notice** (Apple email matched an existing account) shown as the variant.

Stage 4 — **Password reset (AUTH-04)**
- **W7 Reset — request** — enter email → SEND RESET LINK.
- **W8 Reset — email sent + confirm** — the calm "check your inbox" confirm beat (now an **envelope-with-sent-check** glyph), then the set-new-password (confirm-token) panel, led by a **key** glyph + SET A NEW PASSWORD eyebrow.

Stage 5 — **Post-signup + lifecycle**
- **W9 Verify-email notice (AUTH-08)** — the non-blocking post-signup `InlineBanner` ("we sent a link… nothing is locked") + RESEND; this is the hand-off to onboarding (4.14), drawn as the seam.
- **W10 Signal Lost + RETRY** — the §1.6 `LoadError` (auth service unreachable on submit).
- **W11 Offline — writes gated** — the `OfflineStrip`; auth is inherently a write, so the CTAs gate calmly (SYS-10), no alarm.

---

## IDs covered → where

| ID | Drawn in |
|---|---|
| AUTH-01 email+password register | W2, W3, W4 (CREATE ACCOUNT secondary on W1/W1b) |
| AUTH-02 access+refresh login | W1/W1b (front-door form) · W5 (wrong-credentials error) |
| AUTH-03 SIWA (iOS) / Android email-only | W1 (Apple secondary present) · W1b (absent) · W6 |
| AUTH-04 password reset | W7, W8 |
| AUTH-08 soft email verification | W9 (post-signup `InlineBanner` + resend) |
| AUTH-09 SIWA username-completion + linking | W6 (+ linking variant) |
| AUTH-10 ToS/Privacy + age-13 gate | W2 (the acceptance block) |
| MOD-07 username screening | W3 (available) · W4 (rejected error) |

## API endpoints the drawn affordances ride (api-contract §Auth, all exist)
`POST /auth/register {email, username, password, acceptedTerms}` · `POST /auth/login` · `POST /auth/apple {identityToken, nonce}` → `usernamePending` → `PATCH /me {username}` · `POST /auth/password-reset/request` · `POST /auth/password-reset/confirm {token, password}` · `POST /auth/verify-email/request`. Username availability/screening is the register pre-check (MOD-07 server-side; the inline beat mirrors `VALIDATION_ERROR`).

---

## Assumptions & open questions for the owner / spec

1. **NavBand framing — RESOLVED (owner 2026-06-24): NavBand present on every artboard, grayed + non-interactive when logged out** (supersedes pre-shell). **New pattern owed to design-spec / catalog formalization:** a `NavBand/locked` variant (grayscale + reduced opacity + `pointer-events:none`; keys keep the F-03 shell). Drawn here via `.nav-band.locked`; **not** hand-patched into design-spec — flag for the next formalization sweep (00-INDEX §4).
2. **Username availability needs a dedicated pre-check endpoint.** I drew live "checking → available / rejected" (MOD-07). The contract today only exposes screening as part of `POST /auth/register` (and `PATCH /me`). A debounced **`GET /auth/username-available?u=` (screened)** would make the live beat real without a failed register round-trip. **Flagged for the inbox** — drawn as desired-state; if the owner prefers validate-on-submit, the W3 live beat collapses into W4's error.
3. **AUTH-10 age-13 mechanic.** Spec says "minimum age 13, stated in the ToS, **no birth-date collection in v2**." So I drew the gate as a **single acceptance checkbox whose label asserts "I am 13+ and accept the Terms & Privacy Policy"** — not a date picker. Assumed this satisfies AUTH-10; confirm the copy carries the age assertion rather than a separate age control.
4. **Apple button = the one token-exempt surface.** Apple's HIG mandates the official black "Sign in with Apple" button (its own type/lockup). I treated it as a platform-supplied control, like the system keyboard (OQ-035) — outside F-08/F-02 the way the OS keyboard is. Flagged so it isn't read as a token violation.
5. **Invite-link landing while logged out** (§4.13 / SOC-10) routes *through* welcome. I did **not** draw the invite-landing here — it is owned by Find/Add Friends (4.8 `InviteLanding`/`SenderSummary`, already in design-spec §1.5). Noted as the seam: an opened invite lands on W1 with the sender context, then resolves post-auth. Confirm it stays 4.8's component, not a new welcome variant.
6. **On-screen pink swept (owner 2026-06-24).** Every pink pip/marker is gone from on-SCREEN surfaces (incl. the mini device's screen — the old `.d-pips` row was removed). On-screen active = the orange `StateMark` square (F-09). Pink survives only on the **physical shell** — the device LED/pip (F-05) and the established **pink Collection keycap** on the NavBand plastic (F-04 DS grammar). Note: in the logged-out `.nav-band.locked` state even that Collection keycap is desaturated to gray, so no pink shows on the locked NavBand at all.
7. **Front-door reflow.** The old separate sign-in artboard was merged into W1/W1b (sign-in-first). W5 keeps its slot as the **wrong-credentials** beat of that same form (no FlowHeader). If the owner wants a distinct *resting* sign-in artboard back, it can be re-added — but the landing already shows the resting form.
8. **Logout lives in Settings** (§4.13 explicit) — correctly absent here.
