import { z } from 'zod';
import { api } from './api';

// P12 report-capture endpoint (MOD-01 · api-contract §Moderation). INJECTED into the base `api` slice.
//
// SEAM(P7): `POST /reports` is NOT built server-side yet (P7, in tonight's server queue) — this is wired
// against the DRAWN contract shape and 404s live until P7 lands. GAP-R1: no `reports` request/response
// schema exists in `packages/shared` (the server agent owns it; P7 will add it). Per the build-against-
// the-seam pattern the request/response zod live HERE, locally; swap to the shared schema when P7 lands.
//
// The reason CODES are a client ASSUMPTION beyond the two the contract pins (`incorrect_info`, "duplicate")
// — the exact enum is P7's to define (see settings-report-manifest.md · align the server enum to these).

export const reportTargetTypeSchema = z.enum(['card', 'game', 'user']);
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

// The union of every reason across all three targets (the sheet only OFFERS the per-target subset).
export const reportReasonSchema = z.enum([
  'offensive', // card
  'wrong_game', // card
  'spam', // card · user
  'duplicate', // game
  'incorrect_info', // game — details required (MOD-01)
  'abusive_profile', // user
  'impersonation', // user — details required
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const createReportRequestSchema = z
  .object({
    targetType: reportTargetTypeSchema,
    targetId: z.string(),
    reason: reportReasonSchema,
    // moderator-facing only (MOD-01 — outside MOD-07's screening scope); required where the reason demands.
    details: z.string().optional(),
  })
  .strict();
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;

// Lenient — capture-only (§0.5); the client needs success/failure, not a shape. Widen to the shared P7
// schema when it lands.
const reportResponseSchema = z.object({}).passthrough();
export type ReportResponse = z.infer<typeof reportResponseSchema>;

const reportApi = api.injectEndpoints({
  endpoints: (build) => ({
    submitReport: build.mutation<ReportResponse, CreateReportRequest>({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
      transformResponse: (raw): ReportResponse => reportResponseSchema.parse(raw),
    }),
  }),
});

export const { useSubmitReportMutation } = reportApi;

export { reportApi };
