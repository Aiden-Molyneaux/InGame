// F37 — the Minimum-M1 manifest: the 7-item spine, in-repo as an executable checklist artifact.
//
// "M1 = the spine, nothing else." Anything tempting to add is stamped must-now / fast-follow(M2) /
// defer; if it isn't must-now it stays out and is filed. This manifest is the accretion guard
// (decision 0051/F37) — it draws the line between "must exist in the scaffold commit" and "lands in
// M2", so M1 doesn't silently absorb M2/M5/M7 work.

export type SpineStatus = 'scaffolded' | 'seam-only' | 'deferred';

export interface SpineItem {
  readonly n: number;
  readonly title: string;
  readonly status: SpineStatus;
  /** Findings (LEDGER F-numbers) and stable IDs this item carries. */
  readonly refs: readonly string[];
  readonly note?: string;
}

/** The verbatim 7-item Minimum-M1 spine (m1-scaffold-task.md). */
export const MINIMUM_M1_SPINE: readonly SpineItem[] = [
  {
    n: 1,
    title: 'Monorepo + shared zod',
    status: 'scaffolded',
    refs: ['F11', 'F32', 'F37', 'F41'],
    note: 'npm workspaces; packages/shared as the executable contract; .nvmrc + engines pinned.',
  },
  {
    n: 2,
    title: 'SYS-01 scoped helper + route↔authz-test inventory-diff + lint',
    status: 'scaffolded',
    refs: ['SYS-01', 'SYS-07', 'F30', 'F32'],
    note: 'defineRoute makes the route inventory data; coverage counts only on a 4xx actor-B hit.',
  },
  {
    n: 3,
    title: 'AppError → 422 middleware',
    status: 'scaffolded',
    refs: ['SYS-02', 'F08'],
    note: 'Fixed error envelope; zod fail → 422; SERVER_ERROR generic body; neutral AUTH_FAILED.',
  },
  {
    n: 4,
    title: 'emit() seam + typed event registry ONLY (no outbox teeth)',
    status: 'seam-only',
    refs: ['ACH-08', 'F01', 'F24', 'F43'],
    note: 'emitOnCommit + transactional outbox table + typed DomainEventType registry. Relay→M7; rule-5 FAIL-PR teeth→M7 (checklist now).',
  },
  {
    n: 5,
    title: 'fail-closed migration runner + key taxonomy + bundle-grep',
    status: 'scaffolded',
    refs: ['SYS-03', 'F03', 'F04'],
    note: 'Destructive runners fail closed on absence of DISPOSABLE_DB; 3-bucket key taxonomy; gitleaks.',
  },
  {
    n: 6,
    title: 'CI spine green + F22 self-test + F29 slice + F30 route-helper',
    status: 'scaffolded',
    refs: ['SYS-06', 'F22', 'F29', 'F30', 'F36'],
    note: 'Six-check CI; bad-pr-corpus + meta-test; real-PG-container assertion; concurrent tests.',
  },
  {
    n: 7,
    title: 'Expo Chrome + iPhone loop',
    status: 'scaffolded',
    refs: ['F05'],
    note: 'apps/mobile dev/test loop in Chrome (web = dev convenience only). iPhone clause detaches to M1-P.',
  },
] as const;

/** The 6 ship-blockers that must land at/before the scaffold commit (decision 0051). */
export const M1_SHIP_BLOCKERS = ['F03', 'F06', 'F21', 'F22', 'F29', 'F30'] as const;

export type ShipBlocker = (typeof M1_SHIP_BLOCKERS)[number];
