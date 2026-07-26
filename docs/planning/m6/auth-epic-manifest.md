# AUTH EPIC · W-2 (email substrate + Forgot Password) + W-3 (Sign in with Apple) — build manifest

> **STATUS (2026-07-19): ALL FIVE PACKETS LANDED.** P-A/P-B/P-D (server) shipped earlier
> (e98fec4 · 3805591 · 01fae0e); P-C (forgot-password client) + P-E (SIWA client + choose-username)
> landed this pass — Murr GO (4 MED found→fixed+regression-tested) · Parvati CLEAN (0 flags).
> Residual owner items: the §6.3 sending domain (Resend/Cloudflare sitting) · the §6.5 App-ID
> capability toggle · SIWA device E2E deferred to the first P16 EAS build (recorded, not claimed).

> The manifest-first architecture draft for the beta auth epic (beta-feature-wave §A, W-2+W-3 —
> "they share the auth tree, so they run as one auth epic"). **Gate: the §6 owner-nod items come
> back signed before any packet dispatches.** Ground truth read: product-spec AUTH-01..11 ·
> api-contract Auth table (0.72) · `apps/api/src` (the real auth stack) · `apps/mobile/app/sign-in.tsx` ·
> CONVENTIONS.md. IDs touched: **AUTH-03/04/08/09/11 + NEW AUTH-12** (next free after AUTH-11 —
> checked, no AUTH-12+ exists anywhere in docs/).

## §0 · What ALREADY exists (build on it — no bolt-ons, no parallel endpoints)

The W-2/W-3 server story is **much further along than the wave table implies**. M2 shipped the
downstream machinery behind stub seams, precisely so this epic is a seam-swap, not a rebuild:

| Already built | Where | State |
|---|---|---|
| `POST /auth/password-reset/request` — neutral 200 always (AUTH-11), mints hashed single-use token (TTL `PASSWORD_RESET_TTL_SECONDS`, default 1h) | `auth-service.ts` `requestPasswordReset` | ✅ live, stub-emailed |
| `POST /auth/password-reset/confirm` — single-use + expiry check → `VALIDATION_ERROR reason:"invalid_token"`; HIBP breach check (0076 §0.9); argon2 rehash; **`revokeAllForUser` — every refresh-token family dies on reset** (the session-invalidation posture, already exact) | `auth-service.ts` `confirmPasswordReset` | ✅ live |
| `auth_tokens` table — `purpose` ('password_reset' \| 'email_verify'), `token_hash` (SHA-256, unique idx), `expires_at`, `consumed_at` | `db/schema.ts` (authTokens) | ✅ live |
| `POST /auth/apple {identityToken, nonce}` — find-or-create keyed on `auth_identities(provider,subject)` (unique idx); AUTH-09 link-by-**Apple-verified**-email; new user → `usernamePending:true` + private-relay placeholder; unique-violation race retry | `auth-service.ts` `appleSignInAttempt` | ✅ live behind the **stub** verifier |
| AUTH-09 completion — `PATCH /me {username}` clears `usernamePending` **without** the PROF-06 cooldown; screened (MOD-07) + uniqueness | `profile-service.ts:198` | ✅ live + tested |
| `GET /auth/username-available` advisory pre-check (AUTH-11 throttled) | `auth-routes.ts` | ✅ live |
| Emailer seam (`Emailer` interface + in-memory outbox stub + `lastEmail`/`clearOutbox` test hooks) | `apps/api/src/auth/email.ts` | ✅ stub only |
| Apple verifier seam (`AppleTokenVerifier` interface; stub accepts `mock.<b64url>` tokens; `makeMockAppleToken` test mint) | `apps/api/src/auth/apple-verifier.ts` | ✅ stub only |
| SYS-05 buckets `auth:reset-request` 5/min · `auth:reset-confirm` 10/min · `auth:apple` 20/min (IP-keyed) | `config/rate-limits.ts` | ✅ live |
| Integration coverage: register/login/refresh-rotation+reuse/logout/reset/verify/SIWA-stub/neutrality/429 | `test/integration/auth-slice.test.ts` | ✅ 11 describes |
| Client affordances: FORGOT? TertiaryLink (sign-in.tsx:196) + HIG Apple button (sign-in.tsx:248) — both `comingSoon()` alerts | `apps/mobile/app/sign-in.tsx` | stub UI only |

**What is genuinely missing:** a real email transport (§1) · the code-entry reset UX + its one new
endpoint (§2) · the real JWKS verifier + the whole SIWA client (§3) · the forgot/choose-username
screens (§2/§3).

---

## §1 · EMAIL SUBSTRATE (W-2a) — one provider-agnostic seam, the IAP_PROVIDER pattern

New module `apps/api/src/services/email/`, mirroring `services/iap/` file-for-file:

| file | contents |
|---|---|
| `EmailProvider.ts` | `interface EmailProvider { send(msg: { to: string; subject: string; text: string; html?: string }): Promise<void> }` — transport only, no template knowledge. |
| `StubEmailProvider.ts` | Absorbs today's `auth/email.ts` stub: in-memory outbox + pino log (token redacted), `lastEmail(kind, to?)` / `clearOutbox()` test hooks preserved (auth-slice.test.ts depends on them). Dev/test default. |
| `ResendProvider.ts` | **Recommended concrete adapter: Resend** (wave §A seed; simple REST, generous free tier, first-class DX). Plain `fetch` POST `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`, `from: EMAIL_FROM` — zero new deps (the jose/zero-dep posture). Non-2xx → throw (call sites decide the posture, below). |
| `index.ts` | Singleton `getEmailProvider()` / `setEmailProvider()` / `resetEmailProvider()` selected by `EMAIL_PROVIDER` — the exact `getIapProvider` shape, including the defense-in-depth production check at the build site. |

**Templates** live one layer up in `services/email/email-service.ts` (semantic API the auth service
calls — replaces the direct `stubEmailer` import at auth-service.ts:27):
- `sendPasswordResetCode(to, code)` — **beta template #1**: plain-text-first + minimal HTML, app
  voice, the 6-digit code big and centered, TTL stated, "didn't ask? ignore this."
- `sendVerification(to, token)` — **noted, not shipped real**: AUTH-08 verification keeps flowing
  through the seam but its real template + client entry surface are a **later packet** (nothing can
  redeem the token in-app yet). Until then the email_verify kind stays stub/log-only even when
  `EMAIL_PROVIDER=resend` — an explicit allowlist in email-service, not a silent drop.

**Env (SYS-03; `.env.example` documents all):**
- `EMAIL_PROVIDER` — `'stub'` default **outside** production; **production hard-throws on unset OR
  `'stub'`** in `loadEnv` (`resolveEmailProvider`, verbatim the `resolveIapProvider` F03 fail-closed
  floor: an unconfigured mail path must fail loudly, never silently swallow password resets).
- `RESEND_API_KEY` — owner-provisioned secret (host secret store, never repo).
- `EMAIL_FROM` — default placeholder `InGame <no-reply@mail.ingame.app>`; real value follows the
  domain sitting. *[2026-07-25 outcome: `ingame.app` proved third-party-owned — the sitting landed
  on **`mail.ingamehq.com`** and the code default was repointed (m1p log, owed row #20).]*

**Fail posture at the call sites (the AUTH-11 subtlety):** on the reset-request path, a provider
send-failure is **caught + Sentry'd and the response stays neutral 200** — throwing only on the
account-exists branch would turn provider errors into an enumeration oracle. Same catch on the
register verification send (registration must never fail because email is down). Dev (`stub`) logs
the send; there is no "unconfigured prod limps along" state — loadEnv already refused to boot.

**Sending domain (owner sitting item — pairs with the P15 Cloudflare sitting):** Resend account +
verified sending domain (recommend the subdomain **`mail.ingame.app`** — keeps apex reputation
clean), SPF + DKIM records (+ DMARC `p=none` to start) added in the Cloudflare DNS panel. ~15 min,
owner-only (M1-P provisioning pattern; agents do NOT provision). *[2026-07-25 outcome: the sitting
ran — but `ingame.app` is a third party's for-sale domain, so the verified sending domain is
**`mail.ingamehq.com`** (apex `ingamehq.com`, Cloudflare Registrar). Same subdomain rationale.]*

---

## §2 · FORGOT PASSWORD (W-2b) — the 6-digit-code UX on the EXISTING token machinery

**Recommendation (owner-nod #2): 6-digit emailed code, not a deep link.** Why, briefly:
- Email deep links into an Expo app are brittle pre-universal-links: no apex + AASA file until P15
  lands, custom-scheme links are stripped/unclickable in most mail clients, and dead in Expo Go.
- A code keeps the whole flow inside the app on both platforms — no browser hop, no "open in app?"
  interstitial — and reads native to the retro-terminal shell.
- Cost: AUTH-04 currently says "the emailed **link** carries a single-use token" → this is a
  **spec amendment to AUTH-04** (00-INDEX §4), not a quiet edit. Drafted in §5.

### Server (one NEW endpoint; request/confirm keep their contract shapes)

The design key: the code **exchanges for** the existing opaque reset token, so the battle-tested
confirm path (breach check · single-use · revoke-all-sessions) is **untouched**.

1. `POST /auth/password-reset/request {email}` — path + shape unchanged. Now mints a **6-digit code**
   (`crypto.randomInt(0, 1e6)` zero-padded — never `Math.random`) stored as SHA-256 hash in
   `auth_tokens` with **`purpose:'password_reset_code'`**, TTL `PASSWORD_RESET_TTL_SECONDS`
   (**default drops 3600 → 1800**; the ~30 min posture fits a low-entropy code). Re-request
   **consumes any outstanding code rows** for the user first (one live code at a time). Sends via
   §1. **Always neutral 200** (unchanged).
2. **NEW** `POST /auth/password-reset/verify {email, code}` → `{ resetToken }` — looks up the user's
   newest live `password_reset_code` row and compares hashes. **Every** failure mode (unknown email ·
   no live row · wrong code · expired · attempts exhausted) returns the **same**
   `VALIDATION_ERROR reason:"invalid_code"` — enumeration-neutral by construction. A wrong code
   increments `attempts`; **at 5 the row is consumed** (dead). A match consumes the code row and
   mints the **existing** `purpose:'password_reset'` opaque token (32-byte, hashed — `generateOpaqueToken`)
   with TTL `PASSWORD_RESET_PROOF_TTL_SECONDS` (new env, default 900) → plaintext returned once.
3. `POST /auth/password-reset/confirm {token, password}` — **byte-for-byte unchanged**
   (auth-service.ts:265: invalid/expired/consumed → `invalid_token`; HIBP; argon2 pre-tx;
   `revokeAllForUser` kills every session).

**Migration `0022`:** `ALTER TABLE auth_tokens ADD COLUMN attempts smallint NOT NULL DEFAULT 0;`
(+ the schema.ts `purpose` comment gains `'password_reset_code'`). That's the whole DB delta — the
table, hashing, single-use, and TTL columns all exist.

**Rate buckets (SYS-05; G-K async flag, owner-nod #6):** `auth:reset-request` 5/min (exists) ·
**NEW `auth:reset-verify` { limit: 10, windowMs: 60_000 }** · `auth:reset-confirm` 10/min (exists).
Guess math: 10⁶ code space ÷ 5 attempts-per-code ÷ 10 IP-tries/min ÷ 30-min TTL ⇒ online guessing
is dead. **Accepted beta risk (recorded, not hidden):** a full-DB leak makes a live 6-digit hash
offline-brutable within its ≤30-min window — a leak of that severity already yields every
`token_hash`; no extra mitigation at beta.

### Client (the FORGOT? flow — replaces `comingSoon('Password reset')`, sign-in.tsx:196)

- **NEW route `app/forgot-password.tsx`** — one screen, an internal 3-step machine (the sign-in
  board S2 visual language; no new mockup board — **ASSUMPTION**: flow ships straight to the owner
  walk / parvati lane):
  - **S1 email** — field + SEND CODE key → `requestPasswordReset` → always advances (neutral) with
    the "if that address has an account, a code is on its way" line.
  - **S2 code** — 6-digit entry + RESEND (re-fires request; disabled ~30 s cooldown client-side) →
    `verifyResetCode` → on `invalid_code` an inline field error; on `RATE_LIMITED` a calm strip.
  - **S3 new password** — min-8 field (register's rules; server re-checks + HIBP) → `confirmPasswordReset`
    with the held proof token → success beat → back to sign-in. An `invalid_token` here (proof
    expired) bounces to S2 with a "code expired — resend" nudge.
- `resetToken` lives in component state only — never persisted, never in the store.
- RTK: `authApi` additions via `injectEndpoints` (`api.ts` untouched — the friends-manifest
  precedent): `requestPasswordReset` · `verifyResetCode` · `confirmPasswordReset`. All pre-auth
  (no Authorization header — matches login/register).
- Rules: 0069 (non-commerce → no gold; primary = orange, secondary = cream) · F-06 scale (21/15/11/9) ·
  0070 `themedStyles`/`useTheme` from birth · hooks unconditional (F-16).

---

## §3 · SIGN IN WITH APPLE (W-3) — real verifier + the whole client lane

### Server — the real JWKS verifier (the single-file swap the M2 comment promised)

`apps/api/src/auth/apple-verifier.ts` gains `RealAppleVerifier` behind the existing
`AppleTokenVerifier` interface:
- `jose` `createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))` — module-cached
  (jose handles key rollover + cooldown internally; zero new deps).
- `jwtVerify(identityToken, jwks, { issuer: 'https://appleid.apple.com', audience: env.appleBundleId, algorithms: ['RS256'] })`
  — `aud` = **`com.aidenmolyneaux.ingame`** (the M1-P bundle id) via env, exp enforced by jose.
- **Nonce binding:** the client sends the **raw** nonce (contract shape `{identityToken, nonce}`
  unchanged); Apple's token carries the **SHA-256** the client set on the native request → verifier
  asserts `payload.nonce === sha256hex(input.nonce)`. Mismatch → `AuthFailedError`.
- Claim normalization: `email_verified` / `is_private_email` arrive as booleans **or** the strings
  `"true"`/`"false"` — normalize before building `AppleIdentity`.
- Error classes: any token/claim/nonce failure → neutral `AuthFailedError` (401, existing); a JWKS
  **fetch/network** failure → `ServerError` (500) — infrastructure down is not "bad credentials"
  (the tokens.ts:19 misconfiguration precedent).
- **Testability seam:** constructor takes an optional jose key-resolver; default = the remote JWKS.
  Integration tests inject a **local fixture JWKS** (jose `generateKeyPair`) and sign real RS256
  tokens — no network in CI.

**Provider selection (the IAP_PROVIDER pattern, owner-visible in `.env.example`):**
- `APPLE_VERIFIER` — `'stub'` default outside production; **production hard-throws on `'stub'`/unset**
  in `loadEnv` (the stub accepts forgeable `mock.*` tokens ⇒ running it in prod is total account
  takeover — the exact IAP forgeable-faucet posture, F03).
- `APPLE_BUNDLE_ID` — default `com.aidenmolyneaux.ingame`.
- `getAppleVerifier()/setAppleVerifier()/resetAppleVerifier()` singleton; auth-service.ts:42's
  hardwired `stubAppleVerifier` const becomes the getter. Existing stub-based downstream tests keep
  the stub via the test hook.

**Downstream: NOTHING changes.** Find-or-create on `auth_identities(provider='apple', subject)`,
AUTH-09 link-by-Apple-verified-email, private-relay/absent-email handling (placeholder
`apple_<sub>@privaterelay.appleid.com`), the unique-violation retry, and `usernamePending` are all
live + integration-tested (auth-slice.test.ts:323). Contract row unchanged: `/auth/apple
{identityToken, nonce} → session; first sign-in → user.usernamePending = true, completed via
PATCH /me { username }` (api-contract Auth table).

### Client — `expo-apple-authentication` + the completion screen

- `npx expo install expo-apple-authentication expo-crypto`; `app.json`: the plugin +
  `ios.usesAppleSignIn: true` (the entitlement rides the EAS build).
- Sign-in wiring (replaces `comingSoon('Sign in with Apple')`, sign-in.tsx:248 — the HIG-mandated
  black button is already drawn/board-approved, OQ-035 token-exempt): render only when
  `Platform.OS === 'ios' && await isAvailableAsync()` (Android/web/Expo Go never see it — AUTH-03:
  Android registers via email). Flow: `rawNonce = Crypto.randomUUID()` → `hashedNonce =
  sha256(rawNonce)` (expo-crypto) → `signInAsync({ requestedScopes: [FULL_NAME, EMAIL], nonce:
  hashedNonce })` → `POST /auth/apple { identityToken, nonce: rawNonce }` → session stored through
  the existing login path (authSlice + expo-secure-store tokenStore, F14). `ERR_REQUEST_CANCELED` →
  silent no-op; other failures → the neutral sign-in error strip.
- **NEW route `app/choose-username.tsx`** — the AUTH-09 completion beat ("CHOOSE YOUR HANDLE"):
  username field with the debounced `GET /auth/username-available` advisory check (taken/screened/
  invalid inline) + CLAIM key → `PATCH /me { username }` (authoritative; handles the 422
  `username_taken`/`username_screened` race) → into the tabs. **No skip path** (AUTH-09: the
  username is chosen before entry).
- **The gate:** the signed-in redirect (`app/index.tsx`) routes sessions with
  `user.usernamePending === true` (in the self-shape — user-shape.ts:74) to `/choose-username`
  instead of the tabs, so a half-completed SIWA account can never wander the app.
- **Linking (owner-nod #4):** recommend **keeping exactly what AUTH-09 already specifies + the
  server already implements** — auto-link when Apple attests the email (`emailVerified`) and it
  matches an existing account; otherwise a fresh account. **No unlink surface at beta** (Settings
  gains nothing). The nod is a confirmation, not new work.

### What verifies WHEN (the Expo Go wall — plan around it, don't fight it)

- **SIWA cannot run in Expo Go** (native module + entitlement absent). End-to-end verification
  rides the **first EAS dev-build / TestFlight** (P16 lane) — W-3 **builds now, verifies then**.
- **Pre-EAS testable (all of it in this epic's CI):** the full backend verify path via integration
  tests with the fixture JWKS (§4 P-D list); the client screens under jest with the module mocked;
  and the choose-username flow is walkable in Expo Go/web by posting a `makeMockAppleToken(...)`
  token against a dev API running the stub verifier (dev-only affordance — builder's pick).
- **Owner (~5 min, developer portal):** toggle the **Sign in with Apple capability** on the App ID
  `com.aidenmolyneaux.ingame` (owner-nod #5; M1-P provisioning log owns the state).

---

## §4 · PACKETS + ORDER (builder ≠ verifier; each packet lands green before the next dispatches)

**Order:** P-A → P-B → (P-C ∥ P-D) → P-E. P-B and P-D both edit `auth-service.ts` → strictly
sequenced (the wave §A note: one auth epic, never concurrent on the same files). P-C and P-E both
edit `sign-in.tsx` → P-E rebases on P-C.

| # | Packet | Model | Contents | Test list (names ≈ describe blocks) |
|---|---|---|---|---|
| **P-A** | Email substrate (server) | fable | `services/email/` (provider seam + stub + Resend adapter + email-service templates) · env (`EMAIL_PROVIDER`/`RESEND_API_KEY`/`EMAIL_FROM` + `resolveEmailProvider` fail-closed) · auth-service swaps `stubEmailer` → email-service · `.env.example` | vitest: provider selection (stub default; prod throws on unset/'stub'; defense-in-depth at build site) · ResendProvider fetch shape + non-2xx throw (fetch mocked) · email_verify stays stub-only under 'resend'. integration: reset-request send-failure still returns neutral 200 (the enumeration-oracle case, provider injected to throw) · existing auth-slice outbox tests stay green (hooks preserved) |
| **P-B** | Forgot server (AUTH-04 amendment) | fable | migration 0022 (`attempts`) · code mint on request (+ consume-on-remint, TTL 1800) · NEW `/auth/password-reset/verify` (+ route inventory row, `mutates:true`, authzTest 429-under-burst) · proof-token mint (TTL env 900) · bucket `auth:reset-verify` | integration (extend auth-slice): full lifecycle request→verify→confirm→login-with-new-password · old sessions revoked after confirm (refresh 401s) · wrong code ×5 → row dead → correct code now `invalid_code` · expired code · re-request kills the prior code · verify is single-use (2nd verify fails) · proof-token expiry → `invalid_token` · **neutrality**: unknown email → 200 on request AND `invalid_code` on verify (same shape/status as real-account misses) · 429 under burst on all three buckets · confirm regression suite untouched |
| **P-C** | Forgot client | opus | `app/forgot-password.tsx` (3-step) · sign-in FORGOT? wiring · `authApi` injectEndpoints ×3 | jest+RNTL: step machine (email→code→password→success) · invalid_code inline + RESEND cooldown · proof-expiry bounce to S2 · RATE_LIMITED strip · resetToken never persisted (store snapshot) · a11y labels |
| **P-D** | SIWA server (real verifier) | fable | `RealAppleVerifier` (JWKS + iss/aud/exp/nonce + claim normalization) · `APPLE_VERIFIER`/`APPLE_BUNDLE_ID` env + fail-closed floor + singleton seam · auth-service uses the getter | integration w/ fixture JWKS: valid token → session (new user, usernamePending) · wrong aud · wrong iss · expired · nonce mismatch · alg-confusion (HS256-signed forgery rejected) · garbage token → 401 AUTH_FAILED (neutral) · JWKS fetch failure → 500 not 401 · stub refused when NODE_ENV=production · existing stub-verifier downstream suite still green via `setAppleVerifier` |
| **P-E** | SIWA client | fable | expo-apple-authentication + app.json/plugin · button gating + nonce flow · `app/choose-username.tsx` · the `usernamePending` gate in `index.tsx` | jest+RNTL (module mocked): button renders iOS-available-only · cancel = silent · success → POST body carries raw nonce · usernamePending session → routed to choose-username, tabs walled · advisory check states (free/taken/screened) · PATCH race 422 surfaced inline · completed → tabs. **E2E deferred to the P16 EAS build (recorded in the receipt, not claimed)** |

Every packet: typecheck + lint + full vitest/jest green; wrap-up receipt (what changed / assumed /
unsure + QA-friction line); commit names the IDs.

## §5 · SPEC / CONTRACT RIPPLE (the exact edits, filed with the epic's first server packet)

- **product-spec** (0.61 → 0.62, changelog + version register):
  - **AUTH-04 (amend):** password reset via **emailed 6-digit code** (~30 min, single-use, ≤5
    attempts) exchanged in-app for a short-lived reset proof (~15 min) that sets the password;
    used/expired/invalid → same terminal + re-request loop (retained); reset still revokes all
    sessions; endpoints stay rate-limited (SYS-05). *(Supersedes the "emailed link ~1 hour" wording.)*
  - **NEW AUTH-12:** transactional-email substrate — one provider-agnostic seam; concrete provider
    behind env (`EMAIL_PROVIDER`); **prod fail-closed when unconfigured, dev logs to a local outbox**;
    send-failures never break request flows nor leak account existence (AUTH-11); sending
    domain + SPF/DKIM owner-provisioned (M1-P pattern).
  - **AUTH-03/09 (note only):** real Apple JWKS verification live (`aud` = bundle id, nonce-bound);
    behavior unchanged; SIWA UI iOS-only, absent in Expo Go.
- **api-contract** (0.72 → 0.73, Auth table):
  - **NEW row** `POST /auth/password-reset/verify` — `{ email, code }` → `{ resetToken }`; any miss
    (unknown email / wrong / expired / exhausted) → `VALIDATION_ERROR` (`reason:"invalid_code"`,
    neutral); rate-limited.
  - `/auth/password-reset/request` row: note "emails a 6-digit code (AUTH-04)"; shape unchanged.
  - `/auth/password-reset/confirm` row: unchanged (token = the verify-step proof).
  - `/auth/apple` row: note "identityToken verified against Apple JWKS; `nonce` = the RAW nonce
    (token carries its SHA-256)"; shape unchanged.
  - **ERROR_CODES: none new** — `invalid_code` is a new `VALIDATION_ERROR` reason string only.
- **rate-limits:** `auth:reset-verify` 10/min (G-K async, §6).
- **`.env.example`:** + `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `APPLE_VERIFIER`,
  `APPLE_BUNDLE_ID`, `PASSWORD_RESET_PROOF_TTL_SECONDS`; `PASSWORD_RESET_TTL_SECONDS` default note
  3600 → 1800.
- **component-map:** rows for `forgot-password` + `choose-username` when the client packets land.
- Run `/health` after the spec edits; clear red before dispatch.

## §6 · OWNER-NOD ITEMS (collected — the gate before any packet dispatches)

1. **Email provider = Resend** (recommended §1). Owner provisions the account + `RESEND_API_KEY`
   (SYS-03; agents never provision — M1-P pattern).
2. **Code-vs-link: 6-digit code** (recommended §2 — pre-universal-links deep links are brittle;
   amends AUTH-04's "emailed link" wording).
3. **Sending domain** — recommend `mail.ingame.app`; SPF + DKIM (+ DMARC p=none) in Cloudflare.
   **Sitting item — pairs with the P15 Cloudflare sitting.** *[Done 2026-07-25 as
   `mail.ingamehq.com` — `ingame.app` isn't ours; see the m1p provisioning log.]*
4. **SIWA linking policy** — confirm the built AUTH-09 posture: auto-link on Apple-**verified**
   matching email, else fresh account; **no unlink surface at beta**.
5. **App-ID capability** — toggle Sign in with Apple on `com.aidenmolyneaux.ingame` (~5 min,
   developer portal). E2E SIWA verification then rides the first EAS/TestFlight build (P16).
6. **G-K (async, safe-default-until-approved):** the `auth:reset-verify` 10/min bucket + the TTL
   defaults (code 30 min · proof 15 min) + the 5-attempt cap.

## §7 · OUT OF SCOPE (named so nobody "helpfully" builds them)

Google Sign-In (parked, product-spec §10) · an unlink/manage-identities surface · the AUTH-08
verification client surface + real template (later packet; substrate carries it when it comes) ·
universal links / AASA (P15+) · a logged-in change-password endpoint (none exists in the contract;
reset is the path at beta) · a shared-store (Redis) rate limiter (later infra, rateLimit.ts note).
