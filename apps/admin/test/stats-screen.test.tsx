import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StatsScreen } from '../src/screens/StatsScreen';
import { setSession } from '../src/api/session';
import { STATS, errorBody, installFetchStub } from './harness';

// A render smoke off a fixture shaped exactly like the serializer's output (admin-service.getStats).
// The one assertion here that is not decoration: the crude-DAU caveat must be ON SCREEN, because a
// number on a dashboard is believed, and this one is a presence count rather than a DAU metric.

describe('the stats dashboard', () => {
  it('renders every aggregate group off the real response shape', async () => {
    setSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    installFetchStub({ 'GET /api/admin/stats': STATS });
    render(<StatsScreen />);

    expect(await screen.findByText('42')).toBeTruthy(); // users.total
    expect(screen.getByText('7')).toBeTruthy(); // the crude dau24h
    expect(screen.getByText('128')).toBeTruthy(); // cards.published
    expect(screen.getByText('310')).toBeTruthy(); // catalog.games
    expect(screen.getByText('12,345')).toBeTruthy(); // collection hours, thousands-separated
    expect(screen.getByText('48,200')).toBeTruthy(); // wallet total
    expect(screen.getByText('daily claim')).toBeTruthy(); // a ledgerRowsByReason key
    expect(screen.getByText(/not a DAU\/retention metric/)).toBeTruthy();
  });

  it('hides the Sentry card when VITE_SENTRY_URL is unset', async () => {
    setSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    installFetchStub({ 'GET /api/admin/stats': STATS });
    render(<StatsScreen />);

    await screen.findByText('42');
    expect(screen.queryByText('Errors')).toBeNull();
  });

  it('refetches on Refresh and surfaces a failure', async () => {
    setSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    let calls = 0;
    const stub = installFetchStub({
      'GET /api/admin/stats': () => {
        calls += 1;
        return calls === 1
          ? { status: 200, body: STATS }
          : { status: 500, body: errorBody('SERVER_ERROR', 'Something went wrong.') };
      },
    });
    render(<StatsScreen />);

    await screen.findByText('42');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(stub.calls.filter((c) => c.path === '/api/admin/stats')).toHaveLength(2);
  });
});
