# 0043 — M2 foundation hardening: input-validation · anti-enumeration · hours-cap

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** SYS-02 (validation policy) · AUTH-11 (anti-enumeration posture) · COL-03 (hours sanity-cap)
**Closes:** OQ-103 · OQ-095 · OQ-091 (filed from the UX persona audit)
**Bumps:** product-spec 0.38 · api-contract 0.38

## Context
Three cross-cutting guards that get baked into the M2 foundation (the shared zod layer + the auth
seam + the collection data model). Deciding them now — before any endpoint is written — keeps them
consistent from the first commit rather than retrofitted. Surfaced by the UX persona audit
(LEDGER L058 / L012 / L001), owner-ruled in the 2026-06-29 walkthrough.

## Ruling (owner)
**A. Input-validation policy (OQ-103 → SYS-02).** Sane defaults, all SYS-04-tunable:
per-field maxlengths — **username 3–20 · bio ≤140 · collection notes ≤500 · report/feedback note
≤1000**; **username charset `[a-z0-9_]`**; **server-side sanitization of every free-text field**
(control-char strip/escape; public fields additionally screened, MOD-07); **QR / deep-link payloads
validated + signed** (SOC-07/10). Invalid → `422`.

**B. Anti-enumeration posture (OQ-095 → AUTH-11).** Username availability **stays disclosed** at
signup (the UX needs it) but the check is **rate-limited** (already SYS-05). **Login (AUTH-02),
password-reset (AUTH-04), and resend-verification (AUTH-08) return neutral responses** that don't
reveal whether an account exists; **resend is capped**. Net: the only existence signal is the
unavoidable (throttled) availability check. Full neutrality on availability was rejected — it breaks
signup UX.

**C. Hours sanity-cap (OQ-091 → COL-03).** Hard **server ceiling ≤99,999 hrs** (SYS-04-tunable) +
an **anomaly flag**: an implausible single-edit jump flags the entry into a **pending-review** state
(doesn't block the edit). Bounds the value feeding compare / Top-5 / achievements / store-earned, and
fixes the OQ-106 number-width concern (5 digits max). "Anomaly-flag only" was rejected as too soft;
"hard cap only" lacks the review signal.

## Ripple
- **product-spec 0.38:** SYS-02 gains the validation policy; AUTH-11 gains the anti-enumeration
  posture (cross-refs AUTH-02/04/08); COL-03 gains the hours cap + anomaly flag.
- **api-contract 0.38:** `PATCH /me/collection/:entryId` rejects out-of-range hours (`422`); auth
  login/reset/resend responses are neutral (no account-existence disclosure); availability check
  rate-limited (existing). Validation `422` convention already present.
- **Engineering note:** these are M2 test-first targets (the authz/auth/validation seam) — the
  road-map §6 risk shortlist already covers auth + validation at M2.
