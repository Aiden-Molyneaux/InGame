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
  /** AUTH-04 — password-reset token lifetime (~1 hour, single-use). */
  passwordResetTtlSeconds: number;
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
    passwordResetTtlSeconds: num(source.PASSWORD_RESET_TTL_SECONDS, 60 * 60),
    emailVerifyTtlSeconds: num(source.EMAIL_VERIFY_TTL_SECONDS, 24 * 60 * 60),
    usernameCooldownSeconds: num(source.USERNAME_COOLDOWN_SECONDS, 30 * 24 * 60 * 60),
    sentryDsn: source.SENTRY_DSN ?? '',
    devCorsOrigins: (source.DEV_CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    iapProvider: resolveIapProvider(nodeEnv, source.IAP_PROVIDER),
    revenueCatWebhookAuth: source.REVENUECAT_WEBHOOK_AUTH ?? '',
  };
}
