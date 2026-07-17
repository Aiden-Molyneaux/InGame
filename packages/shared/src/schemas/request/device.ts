import { z } from 'zod';
import { boundedText } from '../sanitize';
import { stickerCompositionSchema } from '../device';

// REQUEST/INPUT schemas for the M4 §3.5 Device editor (rule-3 fidelity to api-contract §Device / 0.27;
// decision 0030). device_configs + device_looks are USER-OWNED: the actor is the authenticated
// principal ONLY — `.strict()` refuses any smuggled id. Shell/theme ids are roster ids (client
// constants at M4, cosmetic entities later — 0063), bounded so no free-text rides in.

export const SHELL_ID_MAX = 40;
export const THEME_ID_MAX = 40;

/**
 * PATCH /me/device — the ONE device write pipeline (ARCH 3): shell pick · theme pick · sticker
 * place/move/scale/rotate/delete · look apply all funnel here. All three facets optional; ≥1 must be
 * present (an empty body is a no-op mutation → refused, mirroring the card autosave rule-5 guard).
 */
const patchDeviceBase = z
  .object({
    activeShellId: boundedText(SHELL_ID_MAX).optional(),
    screenThemeId: boundedText(THEME_ID_MAX).optional(),
    stickerComposition: stickerCompositionSchema.optional(),
  })
  .strict();

export const patchDeviceRequestSchema = patchDeviceBase.refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Provide at least one device facet to update.' },
);
export type PatchDeviceRequest = z.infer<typeof patchDeviceRequestSchema>;
export const PATCH_DEVICE_FIELDS = Object.keys(patchDeviceBase.shape) as Array<
  keyof z.infer<typeof patchDeviceBase>
>;

/**
 * POST /me/device/looks — SAVE CURRENT. An EMPTY body: the look is snapshotted SERVER-SIDE from the
 * live device config (the only save affordance, DEV-05/OQ-064). `.strict()` refuses any smuggled facet
 * so a client cannot save an arbitrary combo that never applied to the live device.
 */
export const createLookRequestSchema = z.object({}).strict();
export type CreateLookRequest = z.infer<typeof createLookRequestSchema>;
