import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { COSMETIC_CATALOG, REPORTS, SPOTLIGHT, STATS, errorBody, installFetchStub, selfProfile } from './harness';

// THE GATE. The server's requireAdminTier is the real wall (it re-reads role/tier from the user row
// every request); this test covers the CONSOLE's job, which is to make the refusal legible instead of
// dumping a screen of 403s — and to not render the ops surface to a non-admin at all.

const AUTH_ROUTES = {
  'POST /api/auth/login': (call: { body: unknown }) => {
    const body = call.body as { email: string };
    return {
      status: 200,
      body: {
        user: selfProfile({ username: body.email.split('@')[0] ?? 'user' }),
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      },
    };
  },
};

function signIn(email: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'InGameDemo1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('the admin gate', () => {
  it('lets a role=admin account into the Ops console', async () => {
    const stub = installFetchStub({
      ...AUTH_ROUTES,
      'GET /api/me': selfProfile({ username: 'owner', role: 'admin', adminTier: 4 }),
      'GET /api/admin/stats': STATS,
    });

    render(<App />);
    signIn('owner@ingamehq.com');

    expect(await screen.findByRole('heading', { name: 'Ops · Stats' })).toBeTruthy();
    expect(screen.getByText('ADMIN IV · PLATFORM')).toBeTruthy();
    // The three ruled sections are visible even though only Ops is live (decision 0081).
    expect(screen.getByText('Moderation')).toBeTruthy();
    expect(screen.getByText('Operator')).toBeTruthy();
    // The gate's read went out with the bearer from the login response.
    const me = stub.calls.find((c) => c.path === '/api/me');
    expect(me?.authorization).toBe('Bearer access-1');
  });

  it('blocks a non-admin with a clear message, the signed-in identity, and a sign-out', async () => {
    installFetchStub({
      ...AUTH_ROUTES,
      'GET /api/me': selfProfile({ username: 'walkseed_one', role: 'user', adminTier: null }),
    });

    render(<App />);
    signIn('walkseed_one@example.com');

    expect(await screen.findByText('This account isn’t an admin.')).toBeTruthy();
    expect(screen.getByText('walkseed_one')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    // …and nothing from the Ops surface rendered.
    expect(screen.queryByRole('heading', { name: 'Ops · Stats' })).toBeNull();
  });

  it('surfaces the server’s neutral refusal on a bad credential', async () => {
    installFetchStub({
      'POST /api/auth/login': () => ({
        status: 401,
        body: errorBody('AUTH_FAILED', 'Email or password is incorrect.'),
      }),
    });

    render(<App />);
    signIn('nobody@example.com');

    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
  });

  it('refreshes ONCE through /auth/refresh when an admin read 401s, then retries', async () => {
    let meCalls = 0;
    const stub = installFetchStub({
      ...AUTH_ROUTES,
      'GET /api/me': () => ({
        status: 200,
        body: selfProfile({ username: 'owner', role: 'admin', adminTier: 4 }),
      }),
      'GET /api/admin/stats': () => {
        meCalls += 1;
        return meCalls === 1
          ? { status: 401, body: errorBody('AUTH_FAILED', 'Expired.') }
          : { status: 200, body: STATS };
      },
      'POST /api/auth/refresh': { accessToken: 'access-2', refreshToken: 'refresh-2' },
      'GET /api/admin/reports': REPORTS,
      'GET /api/admin/spotlight': SPOTLIGHT,
      'GET /api/admin/cosmetics/catalog': COSMETIC_CATALOG,
    });

    render(<App />);
    signIn('owner@ingamehq.com');

    // The retried stats read carries the ROTATED access token.
    await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
    const statsCalls = stub.calls.filter((c) => c.path === '/api/admin/stats');
    expect(statsCalls).toHaveLength(2);
    expect(statsCalls[1]?.authorization).toBe('Bearer access-2');
    expect(stub.calls.filter((c) => c.path === '/api/auth/refresh')).toHaveLength(1);
  });

  it('bounces back to sign-in when the refresh itself fails', async () => {
    installFetchStub({
      ...AUTH_ROUTES,
      'GET /api/me': () => ({ status: 401, body: errorBody('AUTH_FAILED', 'Expired.') }),
      'POST /api/auth/refresh': () => ({ status: 401, body: errorBody('AUTH_FAILED', 'Reuse detected.') }),
    });

    render(<App />);
    signIn('owner@ingamehq.com');

    expect(await screen.findByText('Your session expired. Sign in again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
