import { z } from 'zod';

// PROF-08 avatar — draft/publish SHAPE-STUBS for M2. The avatar reuses the Game-Card vector-composition
// editor + the skia flatten/render pipeline, whose full design is M4 (CARD-15). M2 ships the endpoint +
// event SEAM only: it accepts an OPAQUE composition object (the real schema lands in M4) so nothing
// downstream has to be retrofitted. Bounded by the Express json body limit; no render happens yet.

export const avatarCompositionRequestSchema = z
  .object({
    composition: z.record(z.string(), z.unknown()),
  })
  .strict();
export type AvatarCompositionRequest = z.infer<typeof avatarCompositionRequestSchema>;
