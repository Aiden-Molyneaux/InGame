import { z } from 'zod';
import { boundedText } from '../sanitize';

// REQUEST/INPUT schema for MOD-01 report capture (POST /reports, M6 P7 · decision 0076 §0.5). The
// actor (reporter) is the authenticated principal ONLY — `.strict()` refuses a smuggled actor id;
// `targetId` is the TARGET being reported (legitimately body-supplied, it is not the actor). This is
// CAPTURE-ONLY (the moderation queue/console lands M7) — the server does NO existence lookup of the
// target here (see report-service.ts): a report against something the reporter can see must never
// become an existence oracle for a target that is invisible to them for an unrelated reason.

export const reportTargetTypeSchema = z.enum(['card', 'game', 'user']);
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

// The union of every reason across all three targets — PINNED by api-contract 0.70 (MOD-01), the
// exact set the P12 client already codes against (apps/mobile/src/store/reportApi.ts). The per-target
// SUBSET + the details-required set are enforced by `createReportRequestSchema`'s superRefine below
// (a flat zod enum can't express "valid only for this targetType").
export const reportReasonSchema = z.enum([
  'offensive', // card
  'wrong_game', // card
  'spam', // card · user
  'duplicate', // game
  'incorrect_info', // game — details REQUIRED
  'abusive_profile', // user
  'impersonation', // user — details REQUIRED
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

/** MOD-01 (api-contract 0.70, PINNED) — the valid reasons per target type. */
export const REPORT_REASONS_BY_TARGET: Record<ReportTargetType, readonly ReportReason[]> = {
  card: ['offensive', 'wrong_game', 'spam'],
  game: ['duplicate', 'incorrect_info'],
  user: ['abusive_profile', 'impersonation', 'spam'],
};

/** MOD-01 (api-contract 0.70, PINNED) — reasons that REQUIRE `details` (moderator-facing only). */
export const REPORT_DETAILS_REQUIRED: ReadonlySet<ReportReason> = new Set([
  'incorrect_info',
  'impersonation',
]);

export const REPORT_DETAILS_MAX_LEN = 500;

export const createReportRequestSchema = z
  .object({
    targetType: reportTargetTypeSchema,
    targetId: z.string().uuid(),
    reason: reportReasonSchema,
    // Moderator-facing only (outside MOD-07's screening scope, like a recommendation note); SYS-02
    // sanitized + length-bounded. Required where REPORT_DETAILS_REQUIRED demands it (superRefine).
    details: boundedText(REPORT_DETAILS_MAX_LEN)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .strict()
  .superRefine((val, ctx) => {
    const allowed = REPORT_REASONS_BY_TARGET[val.targetType];
    if (!allowed.includes(val.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: `"${val.reason}" is not a valid report reason for a ${val.targetType} target.`,
      });
      return; // the reason itself is invalid — don't also fire the details-required check off it
    }
    if (REPORT_DETAILS_REQUIRED.has(val.reason) && !val.details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['details'],
        message: 'Details are required for this reason.',
      });
    }
  });

export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;
