// SYS-03 — env-only config; never hardcoded. Secrets live in the host secret store, never in the
// repo or the client bundle. See .env.example for the documented variables + the F04 key taxonomy.

export interface ApiEnv {
  databaseUrl: string;
  /** F03 fail-closed sentinel — only ever true on a disposable DB. */
  disposableDb: boolean;
  port: number;
  nodeEnv: string;
  /** AUTH-02 — HS256 signing secret for the short-lived access-token JWT (server-only, SYS-03). */
  jwtSigningSecret: string;
  /** AUTH-02 — access-token lifetime (short-lived). */
  accessTokenTtlSeconds: number;
  /** AUTH-02 — refresh-token lifetime (long-lived, rotating). */
  refreshTokenTtlSeconds: number;
  /** AUTH-04 (P-B) — the emailed 6-digit reset CODE lifetime (~30 min, single-use, ≤5 attempts). */
  passwordResetTtlSeconds: number;
  /** AUTH-04 (P-B) — the reset PROOF token lifetime (~15 min): minted by a successful code verify,
   * consumed by the unchanged confirm path. */
  passwordResetProofTtlSeconds: number;
  /** AUTH-08 — email-verification token lifetime (soft). */
  emailVerifyTtlSeconds: number;
  /** PROF-06 — username-change cooldown (server-configurable, SYS-04; default 30 days). */
  usernameCooldownSeconds: number;
  /** F18 — Sentry DSN (server). Empty ⇒ Sentry is a no-op (log-only), like the stubbed email sender. */
  sentryDsn: string;
  /**
   * OQ-120 — dev-only CORS allowlist (comma-separated exact origins, e.g. the localhost Metro
   * ports). Empty ⇒ OFF — the production posture sends no CORS headers at all.
   */
  devCorsOrigins: string[];
  /**
   * M5 P2 — the IAP provider selection ('mock' default OUTSIDE production; 'revenuecat' wired at
   * P2b). The mock is deterministic (testing-strategy §5); the real RevenueCatProvider swaps in
   * behind the same `IapProvider` seam when §6 provisioning completes. Chosen via `IAP_PROVIDER`.
   * FAIL-CLOSED IN PRODUCTION (M5 F-3, §4 economy-audit HIGH): the mock accepts any hand-built
   * `mockrcpt.v1.*` token — in production it would be a forgeable free-Pixel faucet — so
   * `loadEnv` HARD-THROWS when nodeEnv === 'production' and IAP_PROVIDER is 'mock' OR unset
   * (production requires an explicit, non-mock value; the assertDisposableDb pattern).
   */
  iapProvider: string;
  /**
   * M5 P2 (ECON-06/09) — the RevenueCat webhook Authorization shared secret verified on
   * POST /iap/webhook (the signature IS the webhook's auth). Server-only (SYS-03). Empty ⇒ the webhook
   * rejects every call (fail-closed) until the secret is set. The RC REST secret
   * (REVENUECAT_SECRET_API_KEY, real entitlement re-sync) stays a P2b concern, unread here.
   */
  revenueCatWebhookAuth: string;
  /**
   * SOC-10 (decision 0076 §0.6) — the base URL the minted invite token is appended to (POST /me/invites
   * returns `${INVITE_LINK_BASE}/${token}`). The P15 static landing OWNS this route (a tokenized URL →
   * TestFlight while in beta; store-listing routing lands M8). Defaults to a placeholder so the seam
   * works in dev without config; production injects the real domain from the host secret store (SYS-03).
   */
  inviteLinkBase: string;
  /**
   * AUTH-12 (auth-epic P-A) — the transactional-email provider selection ('stub' default OUTSIDE
   * production; 'resend' = the real HTTPS adapter). Chosen via `EMAIL_PROVIDER`. FAIL-CLOSED IN
   * PRODUCTION (F03, the IAP_PROVIDER pattern): the stub only logs — a production process running it
   * silently swallows every password reset — so `loadEnv` HARD-THROWS when nodeEnv === 'production'
   * and EMAIL_PROVIDER is 'stub' OR unset.
   */
  emailProvider: string;
  /** AUTH-12 — the Resend API key (owner-provisioned, host secret store; SYS-03). Empty on the stub lane. */
  resendApiKey: string;
  /** AUTH-12 — the From header (`EMAIL_FROM`). Placeholder default; the real value follows the
   * mail.ingame.app domain sitting (SPF/DKIM, owner-provisioned). */
  emailFrom: string;
  /**
   * AUTH-01 (decision 0076 §0.9) — the SYS-04 kill-switch for the HIBP breach check on register +
   * password-reset-confirm. Defaults ON (`true`); set `BREACH_CHECK_ENABLED=false` to skip the
   * network call entirely (e.g. the provider is unreachable / rate-limiting us) — a manual off-ramp
   * alongside the check's own fail-open behavior on timeout/5xx/network error.
   */
  breachCheckEnabled: boolean;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * M5 F-3 (§4 economy-audit HIGH) — the fail-closed production floor on the IAP provider, mirroring
 * `assertDisposableDb` (F03: an allowlist sentinel, never a denylist). The MockRevenueCat accepts any
 * hand-built `mockrcpt.v1.*` token, so a production process running it is a forgeable free-Pixel
 * faucet; and an UNSET provider must fail loudly rather than silently meaning mock. Outside
 * production, unset still defaults to 'mock' (the standing dev/test posture).
 */
function resolveIapProvider(nodeEnv: string, raw: string | undefined): string {
  const isProduction = nodeEnv === 'production';
  const provider = raw ?? (isProduction ? '' : 'mock');
  if (isProduction && (provider === '' || provider === 'mock')) {
    throw new Error(
      provider === 'mock'
        ? "IAP_PROVIDER='mock' is refused in production — the mock validates any hand-built receipt " +
          '(a forgeable free-Pixel faucet). Set IAP_PROVIDER to a real provider (fail-closed, F03 pattern).'
        : 'IAP_PROVIDER is required in production — an unset provider must not silently mean the mock. ' +
          'Set IAP_PROVIDER explicitly to a real provider (fail-closed, F03 pattern).',
    );
  }
  return provider;
}

/**
 * AUTH-12 (auth-epic P-A) — the fail-closed production floor on the EMAIL provider, verbatim the
 * `resolveIapProvider` F03 pattern above: an unconfigured mail path must fail loudly at boot, never
 * silently swallow password resets; and an UNSET provider must not silently mean the stub. Outside
 * production, unset defaults to 'stub' (the standing dev/test posture — delivery is a log line).
 */
function resolveEmailProvider(nodeEnv: string, raw: string | undefined): string {
  const isProduction = nodeEnv === 'production';
  const provider = raw ?? (isProduction ? '' : 'stub');
  if (isProduction && (provider === '' || provider === 'stub')) {
    throw new Error(
      provider === 'stub'
        ? "EMAIL_PROVIDER='stub' is refused in production — the stub only logs, so every password " +
          'reset would silently vanish. Set EMAIL_PROVIDER to a real provider (fail-closed, F03 pattern).'
        : 'EMAIL_PROVIDER is required in production — an unset provider must not silently mean the stub. ' +
          'Set EMAIL_PROVIDER explicitly to a real provider (fail-closed, F03 pattern).',
    );
  }
  return provider;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const flag = (source.DISPOSABLE_DB ?? '').toLowerCase();
  const nodeEnv = source.NODE_ENV ?? 'development';
  return {
    databaseUrl: source.DATABASE_URL ?? '',
    disposableDb: flag === '1' || flag === 'true',
    port: num(source.PORT, 4000),
    nodeEnv,
    jwtSigningSecret: source.JWT_SIGNING_SECRET ?? '',
    accessTokenTtlSeconds: num(source.ACCESS_TOKEN_TTL_SECONDS, 15 * 60),
    refreshTokenTtlSeconds: num(source.REFRESH_TOKEN_TTL_SECONDS, 30 * 24 * 60 * 60),
    // AUTH-04 (P-B) — default dropped 3600 → 1800: the ~30-min posture fits a low-entropy 6-digit code.
    passwordResetTtlSeconds: num(source.PASSWORD_RESET_TTL_SECONDS, 30 * 60),
    passwordResetProofTtlSeconds: num(source.PASSWORD_RESET_PROOF_TTL_SECONDS, 15 * 60),
    emailVerifyTtlSeconds: num(source.EMAIL_VERIFY_TTL_SECONDS, 24 * 60 * 60),
    usernameCooldownSeconds: num(source.USERNAME_COOLDOWN_SECONDS, 30 * 24 * 60 * 60),
    sentryDsn: source.SENTRY_DSN ?? '',
    devCorsOrigins: (source.DEV_CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    iapProvider: resolveIapProvider(nodeEnv, source.IAP_PROVIDER),
    emailProvider: resolveEmailProvider(nodeEnv, source.EMAIL_PROVIDER),
    resendApiKey: source.RESEND_API_KEY ?? '',
    emailFrom: source.EMAIL_FROM ?? 'InGame <no-reply@mail.ingame.app>',
    revenueCatWebhookAuth: source.REVENUECAT_WEBHOOK_AUTH ?? '',
    // SOC-10 — the invite-link base (no trailing slash needed; the service joins with '/'). The P15
    // landing owns the real route; this placeholder keeps the seam functional in dev/test.
    inviteLinkBase: (source.INVITE_LINK_BASE ?? 'https://ingame.app/i').replace(/\/+$/, ''),
    // AUTH-01 (decision 0076 §0.9) — default ON; only the literal string 'false' turns it off.
    breachCheckEnabled: (source.BREACH_CHECK_ENABLED ?? 'true').toLowerCase() !== 'false',
  };
}
