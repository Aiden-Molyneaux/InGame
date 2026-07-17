import { z } from 'zod';
import { stickerCompositionSchema } from '../device';

// RESPONSE/VIEW schemas for the M4 §3.5 Device editor (api-contract §Device / 0.27; decision 0030).
// Personal-only surface — a device + its looks are never published/shared, so these are OWNER shapes
// (no cross-user serializer divergence). GET /me/device returns the live three facets (or the free
// DEFAULTS when the user has no row yet — the server never creates a row on read, DEV-03).

/** GET · PATCH /me/device — the live device: the three facets (shell · theme · sticker composition). */
export const deviceResponseSchema = z
  .object({
    activeShellId: z.string(),
    screenThemeId: z.string(),
    stickerComposition: stickerCompositionSchema,
  })
  .strict();
export type DeviceResponse = z.infer<typeof deviceResponseSchema>;

/** One saved look (DEV-05/OQ-064) — a snapshot of the three facets; NO name (identified by shell·theme).
 *  The ON NOW badge is computed client-side (facets == the live device), never a stored flag. */
export const lookResponseSchema = z
  .object({
    id: z.string().uuid(),
    activeShellId: z.string(),
    screenThemeId: z.string(),
    stickerComposition: stickerCompositionSchema,
    createdAt: z.string(), // ISO-8601
  })
  .strict();
export type LookResponse = z.infer<typeof lookResponseSchema>;

/** GET /me/device/looks — the caller's saved looks, newest first, as a BARE ARRAY (api-contract §Device). */
export const looksResponseSchema = z.array(lookResponseSchema);
export type LooksResponse = z.infer<typeof looksResponseSchema>;
