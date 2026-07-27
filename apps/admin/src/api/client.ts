import type {
  AdminCardModerationResponse,
  AdminCosmeticCatalogResponse,
  AdminReportsResponse,
  AdminSpotlightResponse,
  AdminStatsResponse,
  AuthSession,
  SelfProfile,
} from '@ingame/shared';
import { clearSession, getSession, setSession } from './session';

// ── The console's API client ──────────────────────────────────────────────────────────────────────
//
// A ~100-line fetch wrapper, not a data-fetching library: the console makes seven calls in total and
// every one of them is a single round trip against a documented api-contract 0.84 shape. The RESPONSE
// TYPES are imported from @ingame/shared (type-only — nothing from that package reaches the bundle),
// so a server-side shape change breaks this file at `npm run typecheck` rather than in the browser.
//
// The api-contract error envelope is `{ error: { code, message, reason?, details? } }` — the console
// surfaces the server's own message VERBATIM (never a re-worded guess), because the 422s it has to
// explain (unknown/free/duplicate Spotlight id) are the server's to phrase.

export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const SENTRY_URL = import.meta.env.VITE_SENTRY_URL ?? '';

/** A 4xx/5xx carrying the server's envelope. `reason` is the VALIDATION_ERROR discriminator. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The refresh retry failed (or there was nothing to refresh) — the caller must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session expired. Sign in again.');
    this.name = 'SessionExpiredError';
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    reason?: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = 'SERVER_ERROR';
  let message = `Request failed (${res.status}).`;
  let reason: string | undefined;
  try {
    const body = (await res.json()) as ErrorEnvelope;
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      reason = body.error.reason;
      const details = body.error.details;
      if (Array.isArray(details) && details.length > 0) {
        // The 422 field detail (api-contract 0.32/0.46) — shown, not swallowed.
        message += ` (${details.map((d) => [d.field, d.message].filter(Boolean).join(': ')).join('; ')})`;
      }
    }
  } catch {
    /* a non-JSON body (proxy error page, network stub) — the generic message stands */
  }
  return new ApiError(res.status, code, message, reason);
}

function send(path: string, init: RequestInit, accessToken: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${API_ORIGIN}/api${path}`, { ...init, headers });
}

/**
 * ONE refresh retry with a SINGLE-FLIGHT guard (P7 Murr minor). No dedupe was originally "honest
 * minimalism", but the Spotlight screen fires two admin GETs in Promise.all — on an expired access
 * token BOTH 401 and BOTH would race /auth/refresh with the SAME rotated refresh token, and the
 * server's reuse detection then burns the whole family: a deterministic sign-out on a routine idle.
 * Concurrent 401s now join one in-flight refresh and both replay with the fresh bearer.
 */
let refreshInFlight: Promise<string | null> | null = null;
function refreshShared(refreshToken: string): Promise<string | null> {
  refreshInFlight ??= refreshOnce(refreshToken).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function refreshOnce(refreshToken: string): Promise<string | null> {
  const res = await send('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, null);
  if (!res.ok) return null;
  const pair = (await res.json()) as { accessToken?: unknown; refreshToken?: unknown };
  if (typeof pair.accessToken !== 'string' || typeof pair.refreshToken !== 'string') return null;
  setSession({ accessToken: pair.accessToken, refreshToken: pair.refreshToken });
  return pair.accessToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  let res = await send(path, init, session?.accessToken ?? null);
  if (res.status === 401 && session) {
    // NON-overlapping 401s (P7 Murr re-verify minor): another caller may have ALREADY refreshed and
    // rotated the pair while this request was in flight — its 401 belongs to the OLD bearer. Firing
    // /auth/refresh with our captured (now-rotated) refresh token would trip the server's reuse
    // detection and burn the whole family. If the stored bearer already differs from the one that
    // 401'd, skip the refresh and just retry with the fresh one.
    const current = getSession();
    const fresh =
      current && current.accessToken !== session.accessToken
        ? current.accessToken
        : await refreshShared(session.refreshToken);
    if (!fresh) {
      clearSession();
      throw new SessionExpiredError();
    }
    res = await send(path, init, fresh); // string bodies are replayable — safe to reuse `init`
    if (res.status === 401) {
      clearSession();
      throw new SessionExpiredError();
    }
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────────────────────────

/** POST /api/auth/login — PRE-auth (no bearer), the same AUTH-02 shape the phone client uses. */
export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await send('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, null);
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as AuthSession;
}

/** GET /api/me — the gate's authority: `role` + `adminTier` (PROF-09). */
export function fetchMe(): Promise<SelfProfile> {
  return request<SelfProfile>('/me');
}

/** Best-effort AUTH-05 revoke on sign-out; a failure never blocks clearing the local session. */
export async function logout(): Promise<void> {
  const session = getSession();
  if (!session) return;
  try {
    await send('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) }, session.accessToken);
  } catch {
    /* offline / already-revoked — clearing locally is what matters */
  }
}

// ── /admin/* (api-contract 0.84 §MOD) ─────────────────────────────────────────────────────────────

/** GET /admin/stats — Admin III. */
export function fetchStats(): Promise<AdminStatsResponse> {
  return request<AdminStatsResponse>('/admin/stats');
}

/** GET /admin/reports — Admin I. Read-only at v1; the action verbs are M7's phase. */
export function fetchReports(params: { targetType?: string; cursor?: string | null; limit?: number } = {}): Promise<AdminReportsResponse> {
  const query = new URLSearchParams();
  if (params.targetType) query.set('targetType', params.targetType);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<AdminReportsResponse>(`/admin/reports${qs ? `?${qs}` : ''}`);
}

/** POST /admin/cards/:id/takedown — Admin II, MOD-08, MOD-10 audited. `reason` is REQUIRED. */
export function takedownCard(cardId: string, reason: string): Promise<AdminCardModerationResponse> {
  return request<AdminCardModerationResponse>(`/admin/cards/${encodeURIComponent(cardId)}/takedown`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** POST /admin/cards/:id/restore — the takedown's undo (MOD-02 grammar), same shape. */
export function restoreCard(cardId: string, reason: string): Promise<AdminCardModerationResponse> {
  return request<AdminCardModerationResponse>(`/admin/cards/${encodeURIComponent(cardId)}/restore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** GET /admin/spotlight — Admin IV. */
export function fetchSpotlight(): Promise<AdminSpotlightResponse> {
  return request<AdminSpotlightResponse>('/admin/spotlight');
}

/** GET /admin/cosmetics/catalog — Admin IV, the picker's source (PREMIUM entries only). */
export function fetchCosmeticCatalog(): Promise<AdminCosmeticCatalogResponse> {
  return request<AdminCosmeticCatalogResponse>('/admin/cosmetics/catalog');
}

/** PUT /admin/spotlight — Admin IV, MOD-10 audited. A REPLACE, in display order. */
export function putSpotlight(ids: string[]): Promise<AdminSpotlightResponse> {
  return request<AdminSpotlightResponse>('/admin/spotlight', { method: 'PUT', body: JSON.stringify({ ids }) });
}
