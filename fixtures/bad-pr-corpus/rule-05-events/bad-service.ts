// DELIBERATELY BAD (rule-05-events). A @mutation seam that performs a write but emits NO domain event
// — an un-emitted mutation is history you can't reconstruct (ACH-08). CONVENTIONS rule 5 flags this
// (warn-severity in M1 — the FAIL-the-PR teeth are deferred to M7; the DETECTION ships now).
import { mutation } from '../../../apps/api/src/db/mutation';

export const claimDailyBonusBadly = mutation(
  { name: 'economy.claimDailyBonus', specIds: ['ECON-02'] },
  async (ctx, actorId, input: { amount: number }) => {
    // ❌ writes via the tx but never calls ctx.emit(...) — no outbox row, no achievement/analytics trail
    void ctx;
    void actorId;
    return input.amount;
  },
);
