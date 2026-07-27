import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminReportItem } from '@ingame/shared';
import { fetchReports, restoreCard, takedownCard } from '../api/client';
import { describeError } from '../lib/errors';
import { Banner } from '../components/Banner';
import { ConfirmReasonDialog } from '../components/ConfirmReasonDialog';

// REPORTS — the read-only queue (GET /admin/reports, Admin I) plus the ONE action verb the owner
// pulled forward: the MOD-08 card takedown (Admin II) and its restore counterpart. Every other verb
// (resolve · hide · suspend · merge · remediate · dossier · notice) is M7's console phase and is
// deliberately absent — the ruling's whole point is that v1 stays small enough to trust.
//
// This screen owns its own loading (rather than the useLoader hook) because it PAGES: the opaque
// offset cursor appends, so `items` accumulates across pages while a filter change resets it.
//
// KNOWN GAP, surfaced rather than faked: v1 has NO admin read of a single card, so the queue cannot
// know whether a reported card is ALREADY taken down. A row therefore offers "Take down" until an
// action in THIS session tells us otherwise — the takedown/restore responses return the resulting
// `{ hidden, hiddenAt }`, which is what flips the row to "Restore". The server is idempotent, so
// taking down an already-hidden card is harmless (it returns the ORIGINAL hiddenAt). Closing this
// properly wants a `hidden` flag on the report row or an admin card read — an api-contract question,
// not something to paper over in the client.

const TARGET_FILTERS = ['all', 'card', 'game', 'user'] as const;
type TargetFilter = (typeof TARGET_FILTERS)[number];

interface PendingAction {
  card: AdminReportItem;
  verb: 'takedown' | 'restore';
}

interface Page {
  items: AdminReportItem[];
  nextCursor: string | null;
  total: number;
}

export function ReportsScreen() {
  const [filter, setFilter] = useState<TargetFilter>('all');
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moderation, setModeration] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Stale-response guard (P7 Murr re-verify minor): two quick filter flips race two fetches, and the
  // OLDER filter's response could land last, showing the wrong rows under the active filter. Each
  // dispatch stamps an epoch; a response whose epoch is no longer current is dropped.
  const loadEpochRef = useRef(0);
  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const epoch = ++loadEpochRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReports({
          ...(filter === 'all' ? {} : { targetType: filter }),
          cursor,
        });
        if (epoch !== loadEpochRef.current) return; // a newer dispatch owns the table now
        setPage((prev) => ({
          items: append && prev ? [...prev.items, ...res.items] : res.items,
          nextCursor: res.nextCursor,
          total: res.total,
        }));
      } catch (err) {
        if (epoch !== loadEpochRef.current) return;
        setError(describeError(err, 1));
      } finally {
        if (epoch === loadEpochRef.current) setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  async function runAction(reason: string): Promise<void> {
    if (!pending) return;
    setBusy(true);
    setDialogError(null);
    try {
      const call = pending.verb === 'takedown' ? takedownCard : restoreCard;
      const result = await call(pending.card.targetId, reason);
      setModeration((prev) => ({ ...prev, [result.cardId]: result.hidden }));
      setFlash(
        result.hidden
          ? `Card taken down${result.hiddenAt ? ` at ${new Date(result.hiddenAt).toLocaleString()}` : ''}. Adopters fall back to the default card.`
          : 'Card restored to the lifecycle state its designer left it in.',
      );
      setPending(null);
    } catch (err) {
      setDialogError(describeError(err, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Ops · Reports</h1>
        <div className="row-gap">
          <select
            aria-label="Filter by target type"
            style={{ width: 'auto' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as TargetFilter)}
          >
            {TARGET_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? 'All targets' : `${f} reports`}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => void loadPage(null, false)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>
      <p className="page-sub">
        Newest first, read-only. Card rows carry the one action verb pulled forward for the beta — a
        MOD-08 takedown, which hides the card everywhere public and from adopters without revoking a
        single grant. Takedown and restore both write an audit row.
      </p>

      {error && <Banner kind="error">{error}</Banner>}
      {flash && <Banner kind="ok">{flash}</Banner>}
      {!page && loading && <p className="note">Loading…</p>}

      {page && page.items.length === 0 && <div className="panel">No reports.</div>}

      {page && page.items.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Reported</th>
                  <th scope="col">Target</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Details</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item) => {
                  const hidden = moderation[item.targetId] === true;
                  return (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString()}</td>
                      <td>
                        <span className="badge">{item.targetType}</span>
                        <div className="mono" style={{ color: 'var(--faint)' }}>
                          {item.targetId}
                        </div>
                      </td>
                      <td>{item.reason.replace(/_/g, ' ')}</td>
                      <td className="wrap">{item.details ?? <span className="note">—</span>}</td>
                      <td>{item.reporter.username}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.targetType === 'card' ? (
                          <button
                            type="button"
                            className={hidden ? 'btn mini' : 'btn mini danger'}
                            onClick={() => {
                              setFlash(null);
                              setDialogError(null);
                              setPending({ card: item, verb: hidden ? 'restore' : 'takedown' });
                            }}
                          >
                            {hidden ? 'Restore' : 'Take down'}
                          </button>
                        ) : (
                          <span className="note">M7</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="row-gap" style={{ marginTop: 10 }}>
            <span className="note">
              Showing {page.items.length} of {page.total}.
            </span>
            {page.nextCursor && (
              <button
                type="button"
                className="btn mini"
                onClick={() => void loadPage(page.nextCursor, true)}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}

      {pending && (
        <ConfirmReasonDialog
          title={pending.verb === 'takedown' ? 'Take down this card?' : 'Restore this card?'}
          target={`card ${pending.card.targetId}`}
          body={
            pending.verb === 'takedown'
              ? 'The card leaves the gallery, trending, adopt and share immediately, and every adopter falls back to the default card. Their grants are untouched, and the designer’s own lifecycle state is preserved for a restore.'
              : 'The card returns to exactly the lifecycle state its designer left it in.'
          }
          confirmLabel={pending.verb === 'takedown' ? 'Take down' : 'Restore'}
          danger={pending.verb === 'takedown'}
          pending={busy}
          error={dialogError}
          onConfirm={(reason) => void runAction(reason)}
          onCancel={() => {
            setPending(null);
            setDialogError(null);
          }}
        />
      )}
    </>
  );
}
