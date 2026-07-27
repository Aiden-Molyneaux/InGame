import type {
  AdminCosmeticCatalogResponse,
  AdminReportsResponse,
  AdminSpotlightResponse,
  AdminStatsResponse,
  SelfProfile,
} from '@ingame/shared';

// The console's test harness: FIXTURES CONFORMED TO THE REAL SERIALIZERS (they are typed as the
// @ingame/shared response types, so a server-side shape change fails the typecheck here too) plus a
// tiny fetch stub keyed by "METHOD /api/path".
//
// Why a fetch stub rather than mocking the api/client module: the client is where the interesting
// behaviour lives (the bearer header, the ONE refresh retry, the error-envelope unwrap). Mocking it
// away would leave the tests asserting against a fiction.

export interface StubbedCall {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

export type StubHandler = (call: StubbedCall) => { status?: number; body?: unknown };

export interface FetchStub {
  calls: StubbedCall[];
  /** Replace a route mid-test (e.g. make the next PUT 422). */
  set: (route: string, handler: StubHandler | unknown) => void;
}

function asHandler(value: StubHandler | unknown): StubHandler {
  return typeof value === 'function' ? (value as StubHandler) : () => ({ status: 200, body: value });
}

/**
 * Installs `globalThis.fetch`. Routes are `"GET /api/admin/stats"`; the value is either a literal
 * body (200) or a handler returning `{ status, body }`. An unrouted request FAILS the test loudly
 * rather than returning a silent 404 that a component might swallow.
 */
export function installFetchStub(routes: Record<string, StubHandler | unknown>): FetchStub {
  const table = new Map<string, StubHandler>(
    Object.entries(routes).map(([route, value]) => [route, asHandler(value)]),
  );
  const calls: StubbedCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    const call: StubbedCall = {
      method,
      path: `${url.pathname}${url.search}`,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      authorization: headers.get('Authorization'),
    };
    calls.push(call);

    const handler = table.get(`${method} ${url.pathname}`);
    if (!handler) throw new Error(`No fetch stub for ${method} ${url.pathname}`);
    const { status = 200, body = {} } = handler(call);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  return {
    calls,
    set: (route, handler) => table.set(route, asHandler(handler)),
  };
}

/** The api-contract error envelope, as the server's errorMiddleware emits it. */
export function errorBody(code: string, message: string, reason?: string) {
  return { error: reason ? { code, message, reason } : { code, message } };
}

// ── fixtures ──────────────────────────────────────────────────────────────────────────────────────

export function selfProfile(overrides: Partial<SelfProfile> = {}): SelfProfile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'owner',
    avatarUrl: null,
    avatarConfig: null,
    bio: '',
    memberSince: '2026-01-04T00:00:00.000Z',
    privacy: 'friends',
    role: 'admin',
    adminTier: 4,
    usernamePending: false,
    emailVerified: true,
    favouriteGameId: null,
    favouriteGenreIds: [],
    gamertags: [],
    usernameNextChangeAt: null,
    stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 0, adoptionsReceived: 0, friends: 0 },
    cardsPublished: 0,
    favouriteGame: null,
    nowPlaying: null,
    top10: [],
    ...overrides,
  };
}

export const STATS: AdminStatsResponse = {
  users: { total: 42, newLast24h: 3, dau24h: 7 },
  cards: { published: 128, moderationHidden: 1, adoptions: 64 },
  catalog: { games: 310 },
  collection: { entries: 900, totalHours: 12_345 },
  economy: { walletBalanceTotal: 48_200, ledgerRowsByReason: { adoption: 64, daily_claim: 210 } },
  reports: { open: 2, total: 9 },
  generatedAt: '2026-07-27T12:00:00.000Z',
};

export const CARD_REPORT_ID = '22222222-2222-4222-8222-222222222222';
export const CARD_TARGET_ID = '33333333-3333-4333-8333-333333333333';

export const REPORTS: AdminReportsResponse = {
  items: [
    {
      id: CARD_REPORT_ID,
      targetType: 'card',
      targetId: CARD_TARGET_ID,
      reason: 'offensive',
      details: 'Slur in the card title.',
      status: 'open',
      createdAt: '2026-07-27T11:30:00.000Z',
      reporter: { userId: '44444444-4444-4444-8444-444444444444', username: 'walkseed_reporter' },
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      targetType: 'game',
      targetId: '66666666-6666-4666-8666-666666666666',
      reason: 'incorrect_info',
      details: null,
      status: 'open',
      createdAt: '2026-07-27T10:00:00.000Z',
      reporter: { userId: '77777777-7777-4777-8777-777777777777', username: 'walkseed_two' },
    },
  ],
  nextCursor: null,
  total: 2,
};

// Real roster ids / types / tiers / PX prices (apps/api/src/config/cosmetics.ts) — a fixture that
// invented `tier: 'premium'` would typecheck against nothing real.
export const SPOTLIGHT: AdminSpotlightResponse = {
  ids: ['marquee', 'holographic'],
  resolvedIds: ['marquee', 'holographic'],
  source: 'curated',
  fallbackCount: 6,
};

export const COSMETIC_CATALOG: AdminCosmeticCatalogResponse = {
  items: [
    { id: 'marquee', type: 'frame', name: 'MARQUEE', tier: 'showpiece', price: 8, spotlighted: true },
    { id: 'holographic', type: 'finish', name: 'HOLOGRAPHIC', tier: 'showpiece', price: 8, spotlighted: true },
    { id: 'frost', type: 'effect', name: 'FROST', tier: 'showpiece', price: 8, spotlighted: false },
    { id: 'brass', type: 'nameplate', name: 'BRASS', tier: 'standard', price: 3, spotlighted: false },
  ],
};
