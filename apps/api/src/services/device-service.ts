import {
  stickerFitsZone,
  type DeviceResponse,
  type LookResponse,
  type LooksResponse,
  type PatchDeviceRequest,
  type StickerComposition,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import { acquireActorLock } from '../db/locks';
import * as deviceRepo from '../repositories/device-repo';
import { LookCapError, NotFoundError, ValidationError } from '../errors/AppError';
import type { DeviceConfigRow, DeviceLookRow } from '../db/schema';

// Device service (DEV-01..05 · decision 0030). device_configs + device_looks are USER-OWNED — every
// path is actor-scoped (SYS-01); actor-B reaching for actor-A's device/look gets the same 404 an
// unknown id gets. ARCH 3 — every mutation funnels through ONE PATCH pipeline; looks apply by the
// client re-PATCHing the snapshot's facets (no dedicated apply endpoint). M4 posture (0068): every
// shell/theme/sticker is free, so /me/device only ever references owned items by construction.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The free DEFAULT device (DEV-03) — mirrors the device_configs DB column defaults; a user with no
 *  row reads THIS (the service never creates a row on read). Kept in sync with migration 0007. */
const DEFAULT_SHELL_ID = 'teal';
const DEFAULT_THEME_ID = 'midnight';
const EMPTY_COMPOSITION: StickerComposition = { version: 1, stickers: [] };

/** DEV-05 saved-looks cap (~12, SYS-04-tunable; owner ruling 0030/OQ-064). Full → 409 LOOK_CAP_REACHED. */
export const DEVICE_LOOKS_MAX = 12;

/** The three facets from a config row, or the free defaults when the user has no row yet. */
function facetsOf(row: DeviceConfigRow | null): deviceRepo.DeviceFacets {
  if (!row) {
    return {
      activeShellId: DEFAULT_SHELL_ID,
      screenThemeId: DEFAULT_THEME_ID,
      stickerComposition: EMPTY_COMPOSITION,
    };
  }
  return {
    activeShellId: row.activeShellId,
    screenThemeId: row.screenThemeId,
    stickerComposition: row.stickerComposition,
  };
}

function toLookView(row: DeviceLookRow): LookResponse {
  return {
    id: row.id,
    activeShellId: row.activeShellId,
    screenThemeId: row.screenThemeId,
    stickerComposition: row.stickerComposition,
    createdAt: row.createdAt.toISOString(),
  };
}

function lookNotFound(): NotFoundError {
  return new NotFoundError('Saved look not found.');
}

/**
 * DEV-03 layer-3 — the server re-validates the transformed sticker BOUNDS on every write (the zone
 * enum + per-field ranges + count caps are already enforced by the shared schema at the boundary).
 * A sticker whose rotated AABB escapes its zone rect is rejected with a per-sticker field path so the
 * client can map the 422 back to the offending decal.
 */
function assertStickersInBounds(composition: StickerComposition): void {
  const details = composition.stickers
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !stickerFitsZone(s))
    .map(({ i }) => ({
      path: `stickerComposition.stickers[${i}]`,
      message: 'This sticker falls outside its plastic zone.',
    }));
  if (details.length > 0) {
    throw new ValidationError('A sticker falls outside its zone.', 'sticker_out_of_bounds', details);
  }
}

/** GET /me/device — the live device, or the free DEFAULTS (never creates a row on read, DEV-03). */
export async function getDevice(actorId: string): Promise<DeviceResponse> {
  const row = await deviceRepo.findConfig(actorId);
  return facetsOf(row);
}

/** @mutation — PATCH /me/device (ARCH 3): validate + upsert the named facets; ≥1 present (rule-5). */
export const patchDevice = mutation(
  { name: 'device.patch', specIds: ['DEV-01', 'DEV-02', 'DEV-03', 'DEV-04', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: PatchDeviceRequest): Promise<DeviceResponse> => {
    const fields: Partial<deviceRepo.DeviceFacets> = {};
    const changed: string[] = [];
    if (input.activeShellId !== undefined) {
      fields.activeShellId = input.activeShellId;
      changed.push('activeShellId');
    }
    if (input.screenThemeId !== undefined) {
      fields.screenThemeId = input.screenThemeId;
      changed.push('screenThemeId');
    }
    if (input.stickerComposition !== undefined) {
      assertStickersInBounds(input.stickerComposition); // DEV-03 layer-3 (server bounds re-check)
      fields.stickerComposition = input.stickerComposition;
      changed.push('stickerComposition');
    }
    if (changed.length === 0) {
      // Belt-and-braces behind the schema's ≥1-present refine — no silent no-op mutation (rule-5).
      throw new ValidationError('Provide at least one device facet to update.', 'empty_update');
    }
    const row = await deviceRepo.upsertConfig(actorId, fields, ctx.tx);
    await ctx.emit({
      eventType: 'device.updated',
      entityRef: { type: 'device_config', id: row.id },
      payload: { fields: changed }, // the changed facet-set, never the values (F18)
    });
    return facetsOf(row);
  },
);

/** GET /me/device/looks — the caller's saved looks, newest first, as a BARE ARRAY (api §Device). */
export async function listLooks(actorId: string): Promise<LooksResponse> {
  const rows = await deviceRepo.listLooks(actorId);
  return rows.map(toLookView);
}

/**
 * @mutation — POST /me/device/looks (SAVE CURRENT, DEV-05): snapshot the LIVE config (or the free
 * defaults) into a new look. Cap ~12 → 409 LOOK_CAP_REACHED; a per-actor advisory lock serializes
 * concurrent saves so two parallel saves at cap-1 can't both pass the count (F36).
 */
export const saveLook = mutation(
  { name: 'device.saveLook', specIds: ['DEV-05', 'SYS-01', 'SYS-02', 'SYS-04'] },
  async (ctx, actorId): Promise<LookResponse> => {
    await acquireActorLock(ctx.tx, 'device_looks', actorId);
    if ((await deviceRepo.countLooks(actorId, ctx.tx)) >= DEVICE_LOOKS_MAX) {
      throw new LookCapError();
    }
    const config = await deviceRepo.findConfig(actorId, ctx.tx);
    const row = await deviceRepo.insertLook(actorId, facetsOf(config), ctx.tx);
    await ctx.emit({
      eventType: 'device.look_saved',
      entityRef: { type: 'device_look', id: row.id },
      payload: {},
    });
    return toLookView(row);
  },
);

/** @mutation — DELETE /me/device/looks/:id (DEV-05): owner-scoped; a foreign/unknown id → 404. */
export const deleteLook = mutation(
  { name: 'device.deleteLook', specIds: ['DEV-05', 'SYS-01'] },
  async (ctx, actorId, lookId: string): Promise<void> => {
    if (!UUID_RE.test(lookId)) throw lookNotFound();
    const removed = await deviceRepo.deleteLook(actorId, lookId, ctx.tx);
    if (!removed) throw lookNotFound(); // actor-B / unknown → the same 404 (no existence oracle)
    await ctx.emit({
      eventType: 'device.look_deleted',
      entityRef: { type: 'device_look', id: lookId },
      payload: {},
    });
  },
);
