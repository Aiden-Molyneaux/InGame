import {
  STYLE_PRESETS_MAX,
  type CreateStylePresetRequest,
  type StylePresetView,
  type StylePresetsResponse,
  type UpdateStylePresetRequest,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import { acquireActorLock } from '../db/locks';
import * as presetRepo from '../repositories/style-preset-repo';
import { NotFoundError, PresetLimitError, ValidationError } from '../errors/AppError';
import type { StylePresetRow } from '../db/schema';

// Style-preset service (CARD-24b · decision 0066 §4). style_presets is USER-OWNED — actor-scoped
// everywhere. The cap-30 (SYS-04, owner-set) is enforced here → 409 PRESET_LIMIT; a per-actor
// advisory lock serializes concurrent creates so the F36 parallel-save race can't overshoot the cap.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toView(row: StylePresetRow): StylePresetView {
  return {
    id: row.id,
    name: row.name,
    style: row.style as StylePresetView['style'],
    isPremium: row.isPremium,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function presetNotFound(): NotFoundError {
  return new NotFoundError('Style preset not found.');
}

/** GET /me/style-presets — the BARE-ARRAY response (api-contract 0.51). */
export async function listPresets(actorId: string): Promise<StylePresetsResponse> {
  const rows = await presetRepo.listOwnedPresets(actorId);
  return rows.map(toView);
}

/** @mutation — POST /me/style-presets (CARD-24b): cap-30 → 409 PRESET_LIMIT. */
export const createPreset = mutation(
  { name: 'stylePreset.create', specIds: ['CARD-24', 'SYS-01', 'SYS-02', 'SYS-04'] },
  async (ctx, actorId, input: CreateStylePresetRequest): Promise<StylePresetView> => {
    // Serialize per-actor creates so two parallel saves at 29 can't both pass the count (F36).
    await acquireActorLock(ctx.tx, 'style_presets', actorId);
    if ((await presetRepo.countOwnedPresets(actorId, ctx.tx)) >= STYLE_PRESETS_MAX) {
      throw new PresetLimitError();
    }
    const row = await presetRepo.insertPreset(
      actorId,
      {
        name: input.name,
        style: input.style as Record<string, unknown>,
        isPremium: false, // free baseline at M4 (COSM-02/0063); real derivation rides M5
      },
      ctx.tx,
    );
    await ctx.emit({
      eventType: 'style_preset.created',
      entityRef: { type: 'style_preset', id: row.id },
      payload: {},
    });
    return toView(row);
  },
);

/** @mutation — PATCH /me/style-presets/:id — rename / re-snapshot. */
export const updatePreset = mutation(
  { name: 'stylePreset.update', specIds: ['CARD-24', 'SYS-01', 'SYS-02'] },
  async (
    ctx,
    actorId,
    presetId: string,
    input: UpdateStylePresetRequest,
  ): Promise<StylePresetView> => {
    if (!UUID_RE.test(presetId)) throw presetNotFound();
    const current = await presetRepo.findOwnedPreset(actorId, presetId, ctx.tx);
    if (!current) throw presetNotFound(); // actor-B → the same 404

    const fields: { name?: string; style?: Record<string, unknown> } = {};
    const changed: string[] = [];
    if (input.name !== undefined) {
      fields.name = input.name;
      changed.push('name');
    }
    if (input.style !== undefined) {
      fields.style = input.style as Record<string, unknown>;
      changed.push('style');
    }
    if (changed.length === 0) {
      throw new ValidationError('Provide at least one field to update.', 'empty_update');
    }
    const row = (await presetRepo.updateOwnedPreset(actorId, presetId, fields, ctx.tx)) ?? current;
    await ctx.emit({
      eventType: 'style_preset.updated',
      entityRef: { type: 'style_preset', id: presetId },
      payload: { fields: changed },
    });
    return toView(row);
  },
);

/** @mutation — DELETE /me/style-presets/:id. */
export const deletePreset = mutation(
  { name: 'stylePreset.delete', specIds: ['CARD-24', 'SYS-01'] },
  async (ctx, actorId, presetId: string): Promise<void> => {
    if (!UUID_RE.test(presetId)) throw presetNotFound();
    const removed = await presetRepo.deleteOwnedPreset(actorId, presetId, ctx.tx);
    if (!removed) throw presetNotFound();
    await ctx.emit({
      eventType: 'style_preset.deleted',
      entityRef: { type: 'style_preset', id: presetId },
      payload: {},
    });
  },
);
