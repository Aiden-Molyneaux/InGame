import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createReportRequestSchema,
  REPORT_REASONS_BY_TARGET,
  REPORT_DETAILS_REQUIRED,
  type ReportReason,
  type ReportTargetType,
} from './reports';

// MOD-01 (api-contract 0.70, PINNED) — the reason/details validity matrix, per target type:
//   card: offensive · wrong_game · spam
//   game: duplicate · incorrect_info (details REQUIRED)
//   user: abusive_profile · impersonation (details REQUIRED) · spam
// Every reason across every target is exercised, both the valid pairing AND at least one INVALID
// cross-target pairing (a card reason on a user report, etc.) — plus the details-required refusal.

const ALL_REASONS: ReportReason[] = [
  'offensive',
  'wrong_game',
  'spam',
  'duplicate',
  'incorrect_info',
  'abusive_profile',
  'impersonation',
];

function base(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    targetType: 'card' as ReportTargetType,
    targetId: randomUUID(),
    reason: 'offensive',
    ...overrides,
  };
}

describe('MOD-01: createReportRequestSchema — the reason/details validity matrix', () => {
  for (const targetType of Object.keys(REPORT_REASONS_BY_TARGET) as ReportTargetType[]) {
    const allowed = REPORT_REASONS_BY_TARGET[targetType];

    it(`${targetType}: accepts every valid reason for this target${
      [...allowed].some((r) => REPORT_DETAILS_REQUIRED.has(r)) ? ' (details supplied where required)' : ''
    }`, () => {
      for (const reason of allowed) {
        const needsDetails = REPORT_DETAILS_REQUIRED.has(reason);
        const result = createReportRequestSchema.safeParse(
          base({ targetType, reason, ...(needsDetails ? { details: 'Some specifics.' } : {}) }),
        );
        expect(result.success, `${targetType}/${reason} should be valid`).toBe(true);
      }
    });

    it(`${targetType}: rejects every reason NOT valid for this target`, () => {
      for (const reason of ALL_REASONS) {
        if (allowed.includes(reason)) continue;
        const result = createReportRequestSchema.safeParse(base({ targetType, reason }));
        expect(result.success, `${targetType}/${reason} should be REJECTED`).toBe(false);
      }
    });

    for (const reason of allowed.filter((r) => REPORT_DETAILS_REQUIRED.has(r))) {
      it(`${targetType}/${reason}: missing details → 422 (details required)`, () => {
        const result = createReportRequestSchema.safeParse(base({ targetType, reason }));
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path.join('.') === 'details')).toBe(true);
        }
      });

      it(`${targetType}/${reason}: whitespace-only details still counts as missing`, () => {
        const result = createReportRequestSchema.safeParse(
          base({ targetType, reason, details: '   ' }),
        );
        expect(result.success).toBe(false);
      });
    }

    for (const reason of allowed.filter((r) => !REPORT_DETAILS_REQUIRED.has(r))) {
      it(`${targetType}/${reason}: details is OPTIONAL (omitted → still valid)`, () => {
        const result = createReportRequestSchema.safeParse(base({ targetType, reason }));
        expect(result.success).toBe(true);
      });
    }
  }

  it('refuses an unknown targetType / reason / malformed targetId (422 shape)', () => {
    expect(createReportRequestSchema.safeParse(base({ targetType: 'cardX' })).success).toBe(false);
    expect(createReportRequestSchema.safeParse(base({ reason: 'not_a_reason' })).success).toBe(false);
    expect(createReportRequestSchema.safeParse(base({ targetId: 'not-a-uuid' })).success).toBe(false);
  });

  it('.strict() refuses a smuggled actor/reporter field', () => {
    const result = createReportRequestSchema.safeParse(base({ reporterId: randomUUID() }));
    expect(result.success).toBe(false);
  });

  it('details over the length cap → 422', () => {
    const result = createReportRequestSchema.safeParse(
      base({ targetType: 'user', reason: 'impersonation', details: 'x'.repeat(501) }),
    );
    expect(result.success).toBe(false);
  });
});
