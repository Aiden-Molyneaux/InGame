import { z } from 'zod';

// RESPONSE/VIEW schema for POST /reports (MOD-01, M6 P7) — owned by the F06 serializer side of the
// split. CAPTURE-ONLY: the response carries just enough for the client's filed-confirm state, never a
// queue/status view (that's the M7 console's read).

export const createReportResponseSchema = z
  .object({
    ok: z.literal(true),
    reportId: z.string().uuid(),
  })
  .strict();

export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
