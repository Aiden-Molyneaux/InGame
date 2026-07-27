import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpotlightScreen } from '../src/screens/SpotlightScreen';
import { setSession } from '../src/api/session';
import { COSMETIC_CATALOG, SPOTLIGHT, errorBody, installFetchStub } from './harness';

// The Spotlight editor is the console's only merchandising surface and its riskiest write: a bad save
// changes what every user sees in the store. So the three things asserted here are the three that
// would actually hurt — the order that goes over the wire, the empty-save guard, and whether a server
// refusal reaches the operator's eyes.

function mountEditor(overrides: Record<string, unknown> = {}) {
  setSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  const stub = installFetchStub({
    'GET /api/admin/spotlight': SPOTLIGHT,
    'GET /api/admin/cosmetics/catalog': COSMETIC_CATALOG,
    'PUT /api/admin/spotlight': (call: { body: unknown }) => ({
      status: 200,
      body: { ...SPOTLIGHT, ids: (call.body as { ids: string[] }).ids, resolvedIds: (call.body as { ids: string[] }).ids },
    }),
    ...overrides,
  });
  render(<SpotlightScreen />);
  return stub;
}

async function ready(): Promise<void> {
  await screen.findByText('Spotlight (2)');
}

describe('the Spotlight editor', () => {
  it('TWO concurrent 401s share ONE refresh (single-flight) — the screen’s parallel pair can’t burn the token family', async () => {
    // This screen fires spotlight + catalog in Promise.all: on an expired access token BOTH 401.
    // Pre-fix each fired its own /auth/refresh with the SAME refresh token — the server's rotation
    // reuse-detection then killed the family (a deterministic sign-out on routine idle).
    setSession({ accessToken: 'stale', refreshToken: 'refresh-1' });
    let spot = 0;
    let cat = 0;
    const stub = installFetchStub({
      'GET /api/admin/spotlight': () =>
        ++spot === 1 ? { status: 401, body: errorBody('AUTH_FAILED', 'Expired.') } : { status: 200, body: SPOTLIGHT },
      'GET /api/admin/cosmetics/catalog': () =>
        ++cat === 1 ? { status: 401, body: errorBody('AUTH_FAILED', 'Expired.') } : { status: 200, body: COSMETIC_CATALOG },
      'POST /api/auth/refresh': { accessToken: 'access-2', refreshToken: 'refresh-2' },
    });
    render(<SpotlightScreen />);
    await ready();

    expect(stub.calls.filter((c) => c.path === '/api/auth/refresh')).toHaveLength(1); // one flight, shared
    const retried = stub.calls.filter(
      (c) =>
        (c.path === '/api/admin/spotlight' || c.path === '/api/admin/cosmetics/catalog') &&
        c.authorization === 'Bearer access-2',
    );
    expect(retried).toHaveLength(2); // both callers replayed with the rotated bearer
  });

  it('reorders with the up key and PUTs the new display order — only on an explicit save', async () => {
    const stub = mountEditor();
    await ready();

    fireEvent.click(screen.getByRole('button', { name: 'Move HOLOGRAPHIC up' }));
    // No autosave: merchandising is never written by a keystroke.
    expect(stub.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(screen.getByText('Unsaved')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save Spotlight' }));

    await waitFor(() => expect(stub.calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
    const put = stub.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({ ids: ['holographic', 'marquee'] });
    expect(put?.authorization).toBe('Bearer access-1');
  });

  it('adds from the picker and removes from the list', async () => {
    const stub = mountEditor();
    await ready();

    fireEvent.click(screen.getByRole('button', { name: 'Add FROST' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove MARQUEE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Spotlight' }));

    await waitFor(() => expect(stub.calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
    expect(stub.calls.find((c) => c.method === 'PUT')?.body).toEqual({ ids: ['holographic', 'frost'] });
  });

  it('WARNS before saving an empty list, and only writes once the warning is confirmed', async () => {
    const stub = mountEditor({
      'PUT /api/admin/spotlight': { ids: [], resolvedIds: ['frost'], source: 'fallback', fallbackCount: 6 },
    });
    await ready();

    fireEvent.click(screen.getByRole('button', { name: 'Remove MARQUEE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove HOLOGRAPHIC' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Spotlight' }));

    // The warning stands between the click and the write — the server ACCEPTS an empty list, so this
    // guard is the console's, exactly as ruled.
    expect(await screen.findByRole('dialog', { name: 'Save an empty Spotlight?' })).toBeTruthy();
    expect(screen.getByText(/auto-fills with the newest 6 premium cosmetics/)).toBeTruthy();
    expect(stub.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Save empty list' }));

    await waitFor(() => expect(stub.calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
    expect(stub.calls.find((c) => c.method === 'PUT')?.body).toEqual({ ids: [] });
    expect(await screen.findByText(/store auto-fills with the newest premium entries/)).toBeTruthy();
  });

  it('surfaces the server’s 422 verbatim, with its reason', async () => {
    mountEditor({
      'PUT /api/admin/spotlight': () => ({
        status: 422,
        body: errorBody('VALIDATION_ERROR', '"frost" is not a premium cosmetic id.', 'unknown_cosmetic_id'),
      }),
    });
    await ready();

    fireEvent.click(screen.getByRole('button', { name: 'Add FROST' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Spotlight' }));

    expect(
      await screen.findByText('"frost" is not a premium cosmetic id. [unknown_cosmetic_id]'),
    ).toBeTruthy();
    // The draft is NOT silently reverted — the operator keeps their edit and can fix it.
    expect(screen.getByText('Spotlight (3)')).toBeTruthy();
  });

  it('names the live posture so an operator knows whether the DB list or a fallback is showing', async () => {
    mountEditor({
      'GET /api/admin/spotlight': {
        ids: [],
        resolvedIds: ['marquee', 'frost'],
        source: 'fallback',
        fallbackCount: 6,
      },
    });

    expect(await screen.findByText(/FALLBACK — nothing curated resolves/)).toBeTruthy();
    expect(screen.getByText(/marquee, frost/)).toBeTruthy();
  });
});
