import type { ReactNode } from 'react';
import { SENTRY_URL, fetchStats } from '../api/client';
import { useLoader } from '../lib/useLoader';
import { Banner } from '../components/Banner';

// STATS — the console's landing screen (GET /admin/stats, Admin III).
//
// Everything here is a direct aggregate over tables that already existed (proposal §3): no event
// capture, no analytics infra. The ONE thing that must not be over-read is `dau24h` — a crude
// "accounts seen in the last 24h" off the throttled `users.last_seen_at` stamp, NOT a funnel metric.
// The card says so on screen, because a number on a dashboard is believed.

function n(value: number): string {
  return value.toLocaleString('en-US');
}

function Stat({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="stat">
      <h3>{title}</h3>
      <div className="rows">{children}</div>
    </div>
  );
}

function Row({ k, v, sub }: { k: string; v: string; sub?: boolean }) {
  return (
    <div className={sub ? 'row sub' : 'row'}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export function StatsScreen() {
  const { data, error, loading, fetchedAt, reload } = useLoader('stats', fetchStats, 3);

  return (
    <>
      <div className="page-head">
        <h1>Ops · Stats</h1>
        <div className="row-gap">
          <span className="note">
            {fetchedAt ? `Fetched ${fetchedAt.toLocaleTimeString()}` : 'Never fetched'}
            {data ? ` · server stamp ${new Date(data.generatedAt).toLocaleTimeString()}` : ''}
          </span>
          <button type="button" className="btn" onClick={reload} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <p className="page-sub">
        Live aggregates straight off the database. Nothing here is per-user data — the endpoint returns
        counts only.
      </p>

      {error && <Banner kind="error">{error}</Banner>}
      {!data && loading && <p className="note">Loading…</p>}

      {data && (
        <div className="grid">
          <Stat title="Users">
            <Row k="Total" v={n(data.users.total)} />
            <Row k="New · 24h" v={n(data.users.newLast24h)} sub />
            <Row k="Active · 24h (crude)" v={n(data.users.dau24h)} sub />
            <span className="note">
              A presence count off last-seen stamps — not a DAU/retention metric. True analytics rides
              PostHog.
            </span>
          </Stat>

          <Stat title="Cards">
            <Row k="Published" v={n(data.cards.published)} />
            <Row k="Taken down" v={n(data.cards.moderationHidden)} sub />
            <Row k="Adoptions" v={n(data.cards.adoptions)} sub />
          </Stat>

          <Stat title="Catalog">
            <Row k="Games" v={n(data.catalog.games)} />
          </Stat>

          <Stat title="Collections">
            <Row k="Entries" v={n(data.collection.entries)} />
            <Row k="Hours logged" v={n(data.collection.totalHours)} sub />
          </Stat>

          <Stat title="Economy">
            <Row k="Pixels held" v={n(data.economy.walletBalanceTotal)} />
            {Object.entries(data.economy.ledgerRowsByReason)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([reason, count]) => (
                <Row key={reason} k={reason.replace(/_/g, ' ')} v={n(count)} sub />
              ))}
            {Object.keys(data.economy.ledgerRowsByReason).length === 0 && (
              <span className="note">No ledger rows yet.</span>
            )}
          </Stat>

          <Stat title="Reports">
            <Row k="Open" v={n(data.reports.open)} />
            <Row k="All time" v={n(data.reports.total)} sub />
          </Stat>

          {SENTRY_URL && (
            <div className="stat link">
              <h3>Errors</h3>
              <div className="rows">
                <a href={SENTRY_URL} target="_blank" rel="noreferrer noopener">
                  Open Sentry →
                </a>
                <span className="note">
                  Error rates live in Sentry by design — the console links out rather than rebuilding it.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
