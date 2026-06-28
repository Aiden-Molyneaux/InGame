# 0029 — Welcome & Auth + Onboarding formalization (games-forward landing, sign-in-first, locked-NavBand, guided seed) + public username/stats endpoints

- **Date:** 2026-06-25
- **Status:** accepted
- **Related IDs:** AUTH-01/02/03/04/06/08/09/10, **AUTH-11 (new)**, NOTIF-04, MOD-07, CAT-09, COL-01/02, PROF-01, CAT-04, SYS-10, **SYS-12 (new)** · design-spec §2 (Welcome & Auth, Onboarding) + the locked-NavBand pattern
- **Resolves:** the 4.13 Welcome & Auth + 4.14 Onboarding design convergence, and the onboarding behaviour gaps (zero-add seed, push re-offer cadence, onboarding resumability, username-availability, public landing stats)
- **Source:** the 4.13/4.14 design pass + revisions this session (welcome-auth-states.html, onboarding-states.html); owner reviews + rulings 2026-06-24/25. Both boards Burt-PASS.

## Context
4.13 Welcome & Auth and 4.14 Onboarding were the last not-started screens in the M0 design queue (decision 0027 — full v1.0 scope). Both were designed, Burt-audited, owner-reviewed, and revised this session. Convergence surfaced two new public (logged-out) data needs and several onboarding behaviour questions the owner ruled directly.

## Decision

### Welcome & Auth (4.13) — canonical = the games-forward landing
- **Games-forward landing** is canonical (`welcome-auth-states.html`): the hero showcases real community-built GameCards + two **system-wide stats** (total catalog games · total hours logged) + a **contribution-inviting tagline** ("built by players… add your games, design your cards"). The earlier device-hero direction is kept for history (`welcome-auth-device-hero.html`).
- **Sign-in-first front door:** the landing opens with the sign-in form present (email + password + **FORGOT PASSWORD** + SIGN IN); **CREATE ACCOUNT** and **Sign in with Apple** (iOS) are secondary. Email+password is primary (AUTH-01); SIWA is the iOS quick path (AUTH-03/09); Android is email-only (Google parked §10).
- **Locked-NavBand pattern (new):** the bottom NavBand is **present on every logged-out state** but rendered **grayed/desaturated + non-interactive** ("locked until signed in"). Reverses the design agent's "pre-shell" proposal; the disabled treatment answers the "chrome that lies" concern (F-04) by visibly reading as locked. Keys keep the F-03 shell physics, just greyed. **Owed to design-spec/catalog formalization as a named pattern.**
- Age-13 + ToS acceptance (AUTH-10) drawn as a single acceptance assertion (no birth-date collection in v2); username entry routes through MOD-07 screening; SIWA username-completion + account-linking (AUTH-09); soft email-verification notice → onboarding seam (AUTH-08).

### Onboarding (4.14) — a bounded, fully-skippable guided seed
- **Defining constraint:** never land the user on an empty collection. The flow grows the collection underneath the steps (add via the CAT-09 popular rail, COL-01; optional status COL-02; genres PROF-01/CAT-04) and reveals it populated (faithful Collection home).
- **Zero-add → friendly nudge, NO auto-seed (resolves OQ-B):** a skip-everything user lands on an **empty-but-friendly** Collection that gently pushes them to add (ADD GAMES CTA). The "never empty" constraint softens to "never empty *without an inviting push*." SURPRISE-ME / seed-a-starter is dropped.
- **One consistent skip method:** the **header SKIP** keycap on *every* step (incl. the add step); steps advance via their own primary CTA (START/CONTINUE). The three inconsistent inline skips were removed. The Signal-Lost **error** state keeps a distinct "SKIP — FINISH SETUP" recovery escape (owner: kept as-is — it is error-recovery, not a normal-flow skip).
- **NOTIF-04 pre-prompt:** a soft in-app ask whose decline **never fires the OS one-shot** prompt.
- **No re-offer machinery (v2):** after a NOT-NOW the push pre-prompt is **not** re-surfaced on a cadence — one-shot at onboarding, decline = no nag. (Owner: not a concern for v2.)
- **Not resumable:** backgrounding mid-onboarding **lands on whatever is seeded so far** and does not re-trigger; there is **no "restart onboarding" Settings tab** in v2 (its value is covered by the normal Add Game / Discover / profile-genre / notification-settings surfaces). (Owner: confirmed.)

### New public (logged-out) endpoints
- **AUTH-11 (new):** a **screened, public username-availability pre-check** — lets the create-account / SIWA-completion steps show a live "checking → available / rejected (MOD-07)" beat instead of a failed-register round-trip.
- **SYS-12 (new):** a **public, unauthenticated aggregate-stats** read (total catalog games + total hours logged across all users) backing the games-forward landing's two stats. Cached/periodically-recomputed; no per-user data; rate-limited; degrades gracefully (hide on empty/unavailable).

## Rationale / alternatives
- **Games-forward over device-hero** — chosen for the user-driven / contribution framing the owner wanted ("it's about the games"); device-hero kept for history.
- **Locked-NavBand over pre-shell** — keeps the app's shell present from step one (consistency) without implying the nav is usable; cheaper than a separate pre-shell chrome.
- **No-resume / no-re-offer** — the onboarding is skippable + additive, so dropping out degrades gracefully (land on the partial collection); resume/replay machinery is engineering cost for a once-per-account flow whose value is already reachable elsewhere. Rejected: persisting flow state + a Settings replay tab.
- **Public endpoints** — the drawn affordances (live username check, landing stats) need backing data; both are logged-out, so they are public/unauthenticated by necessity, with screening (AUTH-11) and aggregate-only/rate-limited (SYS-12) safeguards.
