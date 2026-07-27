import type { Executor } from '../../db/client';
import * as settingsRepo from '../../repositories/settings-repo';
import {
  SPOTLIGHT_FALLBACK_COUNT,
  SPOTLIGHT_IDS,
  listSpotlightCatalog,
  type CosmeticCatalogEntry,
} from '../../config/cosmetics';

// SPOTLIGHT resolution (SYS-04 / ECON-01 — M6 P7 admin console v1, decision 0081).
//
// THE THREE LAYERS, in order:
//   1. `server_settings['spotlight_ids']` — what the owner curated in the console (a live PUT, no
//      redeploy). An explicitly stored EMPTY list is a real answer, not "unset": it means "let the
//      shelf auto-fill", so it falls through to layer 3, never back to layer 2.
//   2. `SPOTLIGHT_IDS` (config/cosmetics) — the SEED. Until the owner curates once, this is what the
//      store shows, byte-identical to the pre-P7 behaviour. Moving Spotlight to the DB therefore
//      changes NOTHING until an admin writes.
//   3. the newest-N premium entries — the existing `listSpotlightCatalog` fallback, so the shelf is
//      never blank whatever anyone does.
//
// Layers 2 and 3 already existed; P7 only prepends layer 1.

export type SpotlightSource = 'curated' | 'seed' | 'fallback';

export interface SpotlightPosture {
  /** The curated ids as stored/seeded, in display order (BEFORE catalog resolution). */
  ids: readonly string[];
  /** Whether those ids came from the DB (`curated`) or the config seed (`seed`). */
  origin: 'curated' | 'seed';
}

/** Read the curated list + where it came from. Never throws on a malformed stored value — a value
 *  that is not an array of strings is treated as absent (the seed wins) rather than breaking /store. */
export async function readSpotlightPosture(exec?: Executor): Promise<SpotlightPosture> {
  const stored = exec
    ? await settingsRepo.getSetting(settingsRepo.SETTING_KEYS.spotlightIds, exec)
    : await settingsRepo.getSetting(settingsRepo.SETTING_KEYS.spotlightIds);
  if (Array.isArray(stored) && stored.every((v) => typeof v === 'string')) {
    return { ids: stored as string[], origin: 'curated' };
  }
  return { ids: SPOTLIGHT_IDS, origin: 'seed' };
}

/** The Spotlight entries GET /store should render right now (layer 1 → 2 → 3). */
export async function resolveSpotlightCatalog(exec?: Executor): Promise<CosmeticCatalogEntry[]> {
  const posture = await readSpotlightPosture(exec);
  return listSpotlightCatalog(posture.ids);
}

/** The console's read: the curated list, what it actually resolves to, and which layer won. */
export async function describeSpotlight(exec?: Executor): Promise<{
  ids: string[];
  resolvedIds: string[];
  source: SpotlightSource;
  fallbackCount: number;
}> {
  const posture = await readSpotlightPosture(exec);
  const resolved = listSpotlightCatalog(posture.ids);
  const resolvedIds = resolved.map((e) => e.id);
  // The fallback is in play exactly when nothing the curation named survived catalog resolution.
  const curatedResolved = posture.ids.filter((id) => resolvedIds.includes(id));
  const source: SpotlightSource = curatedResolved.length > 0 ? posture.origin : 'fallback';
  return {
    ids: [...posture.ids],
    resolvedIds,
    source,
    fallbackCount: SPOTLIGHT_FALLBACK_COUNT,
  };
}
