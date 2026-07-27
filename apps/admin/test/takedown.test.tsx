import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ReportsScreen } from '../src/screens/ReportsScreen';
import { setSession } from '../src/api/session';
import { CARD_TARGET_ID, REPORTS, errorBody, installFetchStub } from './harness';

// MOD-08 — the one action verb in v1. The reason is what the audit row will carry, so the console
// must not let a takedown leave without one; and the refusal, when the server refuses, must be the
// server's own words.

function mountReports(overrides: Record<string, unknown> = {}) {
  setSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  const stub = installFetchStub({
    'GET /api/admin/reports': REPORTS,
    [`POST /api/admin/cards/${CARD_TARGET_ID}/takedown`]: {
      cardId: CARD_TARGET_ID,
      hidden: true,
      hiddenAt: '2026-07-27T12:05:00.000Z',
    },
    [`POST /api/admin/cards/${CARD_TARGET_ID}/restore`]: {
      cardId: CARD_TARGET_ID,
      hidden: false,
      hiddenAt: null,
    },
    ...overrides,
  });
  render(<ReportsScreen />);
  return stub;
}

/** Open the confirm from the queue row and return a scope for the dialog (both carry the same verb). */
async function openTakedown(): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole('button', { name: 'Take down' }));
  return screen.getByRole('dialog');
}

describe('the reports queue + MOD-08 takedown', () => {
  it('offers the verb on CARD rows only — game/user rows are M7', async () => {
    mountReports();
    expect(await screen.findByRole('button', { name: 'Take down' })).toBeTruthy();
    expect(screen.getByText('M7')).toBeTruthy();
    expect(screen.getByText('walkseed_reporter')).toBeTruthy(); // MOD-12 — the reporter is named
  });

  it('requires a reason before the takedown can run', async () => {
    const stub = mountReports();
    const dialog = await openTakedown();
    const confirm = within(dialog).getByRole('button', { name: 'Take down' }) as HTMLButtonElement;

    expect(confirm.disabled).toBe(true);
    expect(within(dialog).getByText('A reason is required before this action can run.')).toBeTruthy();

    // Whitespace is not a reason (the server refuses it too — boundedText → min(1)).
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: '   ' } });
    expect((within(dialog).getByRole('button', { name: 'Take down' }) as HTMLButtonElement).disabled).toBe(true);
    expect(stub.calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('posts the reason, then flips the row to Restore', async () => {
    const stub = mountReports();
    const dialog = await openTakedown();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'DMCA request' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take down' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy());
    const post = stub.calls.find((c) => c.method === 'POST');
    expect(post?.path).toBe(`/api/admin/cards/${CARD_TARGET_ID}/takedown`);
    expect(post?.body).toEqual({ reason: 'DMCA request' });
    expect(screen.getByText(/Adopters fall back to the default card/)).toBeTruthy();
  });

  it('keeps the dialog open and shows the server’s refusal on a 4xx', async () => {
    mountReports({
      [`POST /api/admin/cards/${CARD_TARGET_ID}/takedown`]: () => ({
        status: 404,
        body: errorBody('NOT_FOUND', 'No such card.'),
      }),
    });
    const dialog = await openTakedown();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'test' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take down' }));

    expect(await within(dialog).findByText('No such card.')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('explains a tier refusal instead of showing a bare 403', async () => {
    mountReports({
      'GET /api/admin/reports': () => ({ status: 403, body: errorBody('FORBIDDEN', 'Forbidden.') }),
    });
    expect(await screen.findByText(/this section needs Admin I or higher/)).toBeTruthy();
  });
});
