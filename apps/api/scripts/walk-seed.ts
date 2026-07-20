// WALK-SEED (UNCOMMITTED, additive-only) — closes three M6 review-coverage seed gaps for the owner's
// live walk, entirely through the REAL service layer (register → profile → social → publish/flatten →
// adopt/ledger → cosmetic acquire/entitlement), so the rows are indistinguishable from organic data.
// All new users are prefixed `walkseed_`. Never touches ADawg / demo / rival owned content except the
// ONE sanctioned adopt performed AS the demo user. Idempotent-ish (safe to re-run).
//
// Run: npm -w @ingame/api exec tsx --env-file=.env.dev scripts/walk-seed.ts
import { closeDb } from '../src/db/client';
import * as authRepo from '../src/repositories/auth-repo';
import * as authService from '../src/services/auth-service';
import * as profileService from '../src/services/profile-service';
import * as socialService from '../src/services/social-service';
import * as collectionService from '../src/services/collection-service';
import * as cardService from '../src/services/card-service';
import * as cosmeticService from '../src/services/cosmetics/cosmetic-service';
import { AlreadyAdoptedError } from '../src/errors/AppError';
import { COMPOSITION_SCHEMA_VERSION, type Composition } from '@ingame/shared';

const DEMO_EMAIL = 'demo@ingame.app';
const DEMO_PASSWORD = 'InGameDemo1!'; // dev-only scratch credential — never a real secret
const PASS = 'InGameDemo1!'; // reuse the dev-only scratch credential for the walkseed users

async function ensureUser(email: string, username: string): Promise<string> {
  const existing = await authRepo.findByEmail(email);
  if (existing) return existing.id;
  const s = await authService.register({ email, username, password: PASS, acceptedTerms: true });
  return s.user.id;
}

async function publishDesign(
  userId: string,
  gameId: string,
  name: string,
  composition: Composition,
): Promise<{ id: string; status: string; imageUrl: string | null; premium: string[] }> {
  const mine = await cardService.listMyCards(userId);
  let design = mine.items.find((c) => c.name === name && c.gameId === gameId) as
    | { id: string; status: string; imageUrl: string | null; premiumComponentIds?: string[] }
    | undefined;
  if (!design) {
    const created = await cardService.createDraft(userId, { gameId, composition, name });
    design = created.card as typeof design;
  }
  if (design!.status === 'draft') design = (await cardService.savePrivate(userId, design!.id)) as typeof design;
  if (design!.status === 'private') design = (await cardService.publishCard(userId, design!.id)) as typeof design;
  return {
    id: design!.id,
    status: design!.status,
    imageUrl: design!.imageUrl ?? null,
    premium: design!.premiumComponentIds ?? [],
  };
}

async function main(): Promise<void> {
  const report: Record<string, unknown> = {};

  const demo = await authService.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const demoId = demo.user.id;
  report.demoId = demoId;

  const shelf = await collectionService.listCollection(demoId);
  const findGame = (title: string) => {
    const hit = shelf.items.find((i) => i.title === title);
    if (!hit) throw new Error(`walk-seed: demo has no "${title}" in collection`);
    return { gameId: hit.gameId, entryId: hit.entryId };
  };
  const hades = findGame('Hades');
  const stardew = findGame('Stardew Valley');

  // ── GAP 1 (W-4) — a walkseed friend with a LOUD forged avatarConfig ─────────────────────────────
  const avatarId = await ensureUser('walkseed_avatar@ingame.app', 'walkseed_avatar');
  await profileService.updateProfile(avatarId, {
    avatarConfig: { bg: '#ff1aa8', ink: '#00e5ff', glyph: 'W4', frame: 'ring' },
  });
  // Real friend path: walkseed sends → demo accepts. Idempotent: skip if already bonded / requested.
  try {
    await socialService.createFriendRequest(avatarId, demoId);
  } catch (e) {
    console.error('walk-seed: createFriendRequest note:', (e as Error).message);
  }
  const reqs = await socialService.listFriendRequests(demoId);
  const incoming = reqs.incoming.find((r) => r.person.userId === avatarId);
  if (incoming) {
    await socialService.acceptFriendRequest(demoId, incoming.requestId);
    report.w4_friendship = 'accepted';
  } else {
    report.w4_friendship = 'already-friends-or-no-pending';
  }
  report.w4_avatarUserId = avatarId;

  // ── GAP 2 (W-A1) — a card DESIGNED by a walkseed user, ADOPTED by demo via the real path ─────────
  const designerId = await ensureUser('walkseed_designer@ingame.app', 'walkseed_designer');
  const ADOPT_COMPOSITION = {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#12233a', '#060a12'] },
    elements: [
      { type: 'poly', shape: 'hexagon', x: 0.5, y: 0.36, w: 0.44, h: 0.44, fill: '#5ad0ff' },
      { type: 'rect', x: 0.5, y: 0.62, w: 0.5, h: 0.02, fill: '#e85ad0' },
      { type: 'text', x: 0.5, y: 0.5, text: 'WALKSEED CUT', size: 0.06, fill: '#f3ecd9' },
    ],
    frame: { color: '#5ad0ff', width: 0.012 },
    nameplate: { title: 'HADES', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
    effect: { kind: 'soft-glow', intensity: 0.5 },
  } as unknown as Composition;
  const adoptCard = await publishDesign(designerId, hades.gameId, 'Hades — Walkseed Cut', ADOPT_COMPOSITION);
  report.wa1_designerUserId = designerId;
  report.wa1_cardId = adoptCard.id;
  report.wa1_cardStatus = adoptCard.status;
  report.wa1_imageUrl = adoptCard.imageUrl;
  // The ONE sanctioned adopt, AS demo, through the real adopt path (reconcile + ledger).
  try {
    const res = await cardService.adoptCard(demoId, adoptCard.id);
    report.wa1_adopt = res;
  } catch (e) {
    if (e instanceof AlreadyAdoptedError) report.wa1_adopt = 'already-adopted';
    else throw e;
  }
  // Equip the adopted design on demo's Hades entry so the collection row attributes the real designer.
  await collectionService.updateEntry(demoId, hades.entryId, { activeCardDesignId: adoptCard.id });
  report.wa1_equippedOnEntry = hades.entryId;

  // ── GAP 3 (W-5) — a walkseed user OWNS an ultimate SKU + PUBLISHED a card wearing it ─────────────
  const ultId = await ensureUser('walkseed_ultimate@ingame.app', 'walkseed_ultimate');
  // Grant the ultimate the SAME way the existing seed grants entitlements: acquireCosmetic (debits PX
  // from the 10-PX STARTING_GRANT; MARQUEE ULTIMATE is 10 PX → balance 0). Idempotent once owned.
  const acq = await cosmeticService.acquireCosmetic(ultId, 'marquee-ultimate');
  report.w5_acquire = acq;
  const ULT_COMPOSITION = {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#04201c', '#01100e'] },
    elements: [
      { type: 'poly', shape: 'star', x: 0.5, y: 0.35, w: 0.5, h: 0.5, fill: '#12e0b8' },
      { type: 'rect', x: 0.5, y: 0.63, w: 0.55, h: 0.02, fill: '#12e0b8' },
      { type: 'text', x: 0.5, y: 0.52, text: 'ULTIMATE', size: 0.07, fill: '#f3ecd9' },
    ],
    // The MARQUEE ULTIMATE frame, recoloured to a custom teal — colorCustomizable, so the flatten
    // colour-force backstop leaves it teal (identity via the explicit cosmeticId).
    frame: { kind: 'marquee', color: '#12e0b8', cosmeticId: 'marquee-ultimate', width: 0.012 },
    nameplate: { title: 'STARDEW VALLEY', plate: '#141026', ink: '#f3ecd9', size: 0.045 },
    effect: { kind: 'soft-glow', intensity: 0.5 },
  } as unknown as Composition;
  const ultCard = await publishDesign(ultId, stardew.gameId, 'Stardew — Ultimate Teal', ULT_COMPOSITION);
  report.w5_ultimateUserId = ultId;
  report.w5_cardId = ultCard.id;
  report.w5_cardStatus = ultCard.status;
  report.w5_imageUrl = ultCard.imageUrl;
  report.w5_premiumComponentIds = ultCard.premium;
  report.w5_gameId = stardew.gameId;
  report.wa1_gameId = hades.gameId;

  console.log('WALK_SEED_REPORT ' + JSON.stringify(report, null, 2));
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('walk-seed FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
