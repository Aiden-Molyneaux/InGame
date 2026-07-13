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
   * M5 P2 — the IAP provider selection ('mock' default; 'revenuecat' wired at P2b). The mock is
   * deterministic (testing-strategy §5); the real RevenueCatProvider swaps in behind the same
   * `IapProvider` seam when §6 provisioning completes. Chosen via `IAP_PROVIDER`.
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

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const flag = (source.DISPOSABLE_DB ?? '').toLowerCase();
  return {
    databaseUrl: source.DATABASE_URL ?? '',
    disposableDb: flag === '1' || flag === 'true',
    port: num(source.PORT, 4000),
    nodeEnv: source.NODE_ENV ?? 'development',
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
    iapProvider: source.IAP_PROVIDER ?? 'mock',
    revenueCatWebhookAuth: source.REVENUECAT_WEBHOOK_AUTH ?? '',
  };
}
