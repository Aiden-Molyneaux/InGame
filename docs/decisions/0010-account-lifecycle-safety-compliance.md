# 0010 — Gap-review batch: account lifecycle, social safety & App Store compliance

- **Date:** 2026-06-10
- **Status:** accepted
- **Related IDs:** SYS-09/10, AUTH-03/07/08/09/10, PROF-05/06, CARD-20, ECON-09, SOC-08/09/10, NOTIF-04, MOD-01/07
- **Source:** full-docs gap review (OQ-016..030) — triggered by an "is the sign-up screen missing?" scare
  (it wasn't — design-req §4.13), which prompted a systematic sweep for what *was* missing.

The gaps clustered in three places happy-path design always under-serves: **compliance for
social/UGC apps**, **account-lifecycle unhappy paths**, and the **logged-out / first-contact
surface**. All fifteen were formalized in one pass (product-spec 0.9, api-contract 0.7,
ui-design-requirements 0.5). Decisions and rationale:

## Compliance trio (App Store Guideline 1.2)
- **Block user (SOC-09).** Report alone doesn't satisfy 1.2 for an app with stranger-reachable
  surfaces (username search, requests, recommendation notes, published cards). Block = sever +
  mutual invisibility + silent; managed in Settings; offered on profiles and inside the report flow.
  **Report extends to users** (MOD-01) — the design doc already assumed this; the spec now backs it.
- **ToS/Privacy acceptance + age 13 (AUTH-10).** Inline acceptance at registration; age floor stated
  in ToS, **no birth-date collection** in v2 (alternative — a birthday gate — rejected as friction
  without a under-13 audience claim).
- **In-app Help/Contact (SYS-09).** A Settings row (support email/form). 1.2 expects published
  contact info; IAP/account disputes need a destination anyway.

## Account lifecycle
- **Email verification is SOFT (AUTH-08).** Verification email at signup, but no gate — onboarding
  momentum ("every session pays off fast") beats inbox round-trips. Its only job is making password
  reset reliable. Alternative (hard verification before use) rejected for v2.
- **SIWA completion + linking (AUTH-09).** First Apple sign-in picks a username before entering the
  app. Apple-verified email matching an existing account → **auto-link** (Apple has proven email
  ownership; safe). SIWA is **iOS-only**; **Android ships email+password** and **Google Sign-In is
  parked** (§10) — lean v2 over parity. AUTH-03's old "required by policy" rationale was corrected
  (the mandate only applies when *other* third-party logins exist).
- **Deletion ripple (AUTH-07).** Private data hard-deleted; **community-owned content persists
  anonymized** (catalog credit → anonymized; published cards → unpublished, existing adopters keep
  the flattened card + grant — reusing the MOD-08 pattern). Alternative (hard-delete community
  content) rejected: it would tear holes in other users' collections, violating CARD-18's spirit.
- **Username change (PROF-06).** Allowed, cooldown-limited (server-config), screened; references are
  ID-based so nothing breaks; freed handles immediately claimable.

## Social completeness
- **Request lifecycle (SOC-08).** Decline (silent) / cancel-outgoing / unfriend (silent) — the
  api-contract already shipped decline+unfriend shapes with no spec behavior behind them (a §2
  precedence violation, now healed). Re-request cooldown (server-config) blunts pestering.
- **Invite redemption (SOC-10).** Installed → resolve token to the sender + one-tap prefilled
  request. Not installed → store listing, **no deferred attribution** in v2 (Branch-style plumbing
  parked §10); the QR covers the in-person case that matters most.
- **MOD-07 scope broadened** to *all* user-entered text rendered to others (usernames, bios,
  gamertags, recommendation notes, edit suggestions, studio/publisher) — the original list had only
  covered card/catalog creation surfaces.

## Content & money
- **Published cards are immutable (CARD-20).** Edit = duplicate-to-new-draft; **unpublish** delists
  but never claws back adopters' flattened cards (MOD-08 pattern); delete only when never adopted.
  Alternative (re-flatten in place) rejected: adopters chose a specific design; silent mutation
  breaks trust and the composition-hash dedup (CARD-19).
- **IAP refunds (ECON-09).** Refund webhook reverses granted currency; balance **may go negative**
  (floor server-config); **no clawback** of things already bought with it in v2 (entitlement
  revocation cascades — complexity not worth it at this scale). Ledger records the reversal.

## First contact & resilience
- **Welcome/landing screen** added as the logged-out root (design-req §4.13) — value prop, three
  entry actions, and the landing spot for invite links.
- **Push priming (NOTIF-04).** Never the cold OS prompt; an in-app pre-prompt at high-intent moments
  (onboarding close, first "notify me", first friend action). For a low-frequency app, push is the
  return mechanism — the one-shot OS ask is treated as precious.
- **Offline baseline (SYS-10).** Cached, read-only render with an indicator; writes need
  connectivity except card-editor local drafts. Cheap honesty over a sync engine.

## Revisit-flags (cheap to flip now, recorded so they're conscious)
1. **Google Sign-In parked** — flip if Android conversion suffers.
2. **Soft (not hard) email verification** — flip if fake-account abuse appears.
3. **No refund clawback** — flip if refund-farming of premium cosmetics is observed.
