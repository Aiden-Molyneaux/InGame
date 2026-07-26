// WALK-SEED-RICH (UNCOMMITTED, STRICTLY ADDITIVE) — closes the three seed-blocked acceptance checks
// (5.3 AVG RATING · 7.1 pinned friend favourite · 5.5/8.3 SEE ALL + Load more) entirely through the
// REAL service layer, so the rows are indistinguishable from organic data. Mirrors the walk-seed.ts
// precedent for connection + service idioms.
//
// SAFETY: DELETES NOTHING. Never modifies demo / demo_curator / ADawg / rival rows. The ONLY writes
// are to `walkseed_*` users this (or the prior) seed created. All new users prefixed `walkseed_`.
// Idempotent-ish (safe to re-run): ensureUser reuses, publishDesign reuses-by-name, adopt swallows
// AlreadyAdopted, entry writes are convergent.
//
// Run: npm -w @ingame/api exec tsx --env-file=.env.dev scripts/walk-seed-rich.ts
import { closeDb } from '../src/db/client';
import * as authRepo from '../src/repositories/auth-repo';
import * as authService from '../src/services/auth-service';
import * as profileService from '../src/services/profile-service';
import * as socialService from '../src/services/social-service';
import * as collectionService from '../src/services/collection-service';
import * as cardService from '../src/services/card-service';
import { AlreadyAdoptedError } from '../src/errors/AppError';
import { COMPOSITION_SCHEMA_VERSION, type Composition } from '@ingame/shared';

// Canonical ids (verified against the live local_ingame DB). Hardcoded so this script NEVER reads or
// touches the demo account in any way.
const HADES_ID = '39d3fd5b-8449-41c0-9377-c527998d71f6';
const STARDEW_ID = '6a80d1b2-bfd3-4998-ad8c-192121cc15e5';
const PASS = 'InGameDemo1!'; // dev-only scratch credential — never a real secret

async function ensureUser(email: string, username: string): Promise<string> {
  const existing = await authRepo.findByEmail(email);
  if (existing) return existing.id;
  const s = await authService.register({ email, username, password: PASS, acceptedTerms: true });
  return s.user.id;
}

/** Ensure `userId` owns `gameId` (real POST /me/collection path) and return the entry id. Convergent. */
async function ensureEntry(userId: string, gameId: string): Promise<string> {
  let col = await collectionService.listCollection(userId);
  let hit = col.items.find((i) => i.gameId === gameId);
  if (!hit) {
    await collectionService.addEntry(userId, { gameId });
    col = await collectionService.listCollection(userId);
    hit = col.items.find((i) => i.gameId === gameId);
  }
  if (!hit) throw new Error(`ensureEntry: ${userId} still has no entry for ${gameId}`);
  return hit.entryId;
}

/** Real create→save→publish (flatten) path, reused-by-name so a re-run never double-publishes. */
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

const CREAM = '#f3ecd9';
// Six FREE-tier base gradients + six structural element layouts (rect/poly/text/ellipse only, no
// premium cosmetic refs → adoption is free). Combined by index so every face differs; a per-card
// unique marker text guarantees a distinct composition hash.
const BASES: Array<[string, string]> = [
  ['#1b2a4a', '#0a1120'],
  ['#3a1f4d', '#160a1e'],
  ['#123a2e', '#06140f'],
  ['#4a2b12', '#1e1006'],
  ['#0f3a4a', '#06181e'],
  ['#4a1225', '#1e060d'],
];
const ACCENTS = ['#7ad0e8', '#e8c14a', '#5ad0a0', '#e8895a', '#8a9be8', '#e85a8a'];

function layout(variant: number, accent: string): Record<string, unknown>[] {
  switch (variant % 6) {
    case 0: // banded thirds + emblem
      return [
        { type: 'rect', x: 0.5, y: 0.17, w: 1.1, h: 0.34, fill: accent, opacity: 0.85, name: 'TOP BAND' },
        { type: 'rect', x: 0.5, y: 0.345, w: 1.1, h: 0.008, fill: CREAM, opacity: 0.9, name: 'BAND RULE' },
        { type: 'poly', shape: 'hexagon', x: 0.5, y: 0.62, w: 0.4, h: 0.4, fill: accent, name: 'EMBLEM' },
      ];
    case 1: // inset frame-in-frame + star
      return [
        { type: 'rect', x: 0.5, y: 0.5, w: 0.84, h: 0.86, fill: accent, opacity: 0.18, stroke: { color: CREAM, width: 0.006 }, name: 'PANEL' },
        { type: 'rect', x: 0.5, y: 0.5, w: 0.72, h: 0.74, fill: accent, opacity: 0.1, stroke: { color: CREAM, width: 0.0025 }, name: 'INNER RULE' },
        { type: 'poly', shape: 'star', x: 0.5, y: 0.5, w: 0.42, h: 0.42, fill: accent, name: 'STAR' },
      ];
    case 2: // diagonal split + triangle
      return [
        { type: 'rect', x: 0.18, y: 0.5, w: 1.1, h: 2.2, rotation: 14, fill: accent, opacity: 0.4, stroke: { color: CREAM, width: 0.005 }, name: 'SPLIT' },
        { type: 'poly', shape: 'triangle', x: 0.62, y: 0.55, w: 0.36, h: 0.36, fill: accent, name: 'TRI' },
      ];
    case 3: // arc title + pentagon
      return [
        { type: 'text', x: 0.5, y: 0.2, text: 'COMMUNITY', size: 0.06, fill: CREAM, arc: 40, glow: true, name: 'ARC' },
        { type: 'rect', x: 0.5, y: 0.3, w: 0.34, h: 0.008, fill: CREAM, opacity: 0.75, name: 'RULE' },
        { type: 'poly', shape: 'pentagon', x: 0.5, y: 0.62, w: 0.4, h: 0.4, fill: accent, name: 'PENTA' },
      ];
    case 4: // vertical bars + diamond
      return [
        { type: 'rect', x: 0.3, y: 0.5, w: 0.06, h: 0.8, fill: accent, opacity: 0.7, name: 'BAR A' },
        { type: 'rect', x: 0.5, y: 0.5, w: 0.06, h: 0.8, fill: accent, opacity: 0.85, name: 'BAR B' },
        { type: 'rect', x: 0.7, y: 0.5, w: 0.06, h: 0.8, fill: accent, opacity: 0.7, name: 'BAR C' },
        { type: 'poly', shape: 'diamond', x: 0.5, y: 0.5, w: 0.3, h: 0.3, fill: CREAM, opacity: 0.9, name: 'DIA' },
      ];
    default: // ellipse stack + octagon
      return [
        { type: 'ellipse', x: 0.5, y: 0.5, w: 0.7, h: 0.56, fill: accent, opacity: 0.25, name: 'HALO' },
        { type: 'ellipse', x: 0.5, y: 0.5, w: 0.44, h: 0.35, fill: accent, opacity: 0.4, name: 'HALO 2' },
        { type: 'poly', shape: 'octagon', x: 0.5, y: 0.5, w: 0.34, h: 0.34, fill: accent, name: 'OCT' },
      ];
  }
}

function stardewComposition(variant: number, uniqueSeed: number): Composition {
  const base = BASES[variant % BASES.length]!;
  const accent = ACCENTS[variant % ACCENTS.length]!;
  const elements = [
    ...layout(variant, accent),
    // per-card unique marker — guarantees a distinct composition hash (low-opacity, unobtrusive)
    { type: 'text', x: 0.5, y: 0.955, text: `C${uniqueSeed}`, size: 0.02, fill: '#ffffff', opacity: 0.14, name: 'SEED' },
  ];
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: base },
    elements,
    frame: { color: accent, width: 0.011 },
    nameplate: { title: 'STARDEW VALLEY', plate: base[1], ink: CREAM, size: 0.045 },
    effect: { kind: 'soft-glow', intensity: 0.45 },
  } as unknown as Composition;
}

async function main(): Promise<void> {
  const report: Record<string, unknown> = {};

  // ── GAP 1 — AVG RATING + richer AVG HOURS on Hades ──────────────────────────────────────────────
  // 5 owners: 4 rate (3/4/5/4 → mean 4.0), 1 adds-but-doesn't-rate (owners>raters denominator).
  const raterSpec = [
    { key: 'walkseed_rater1', status: 'beaten' as const, hours: 12, rating: 3 },
    { key: 'walkseed_rater2', status: 'playing' as const, hours: 45, rating: 4 },
    { key: 'walkseed_rater3', status: 'beaten' as const, hours: 80, rating: 5 },
    { key: 'walkseed_rater4', status: 'playing' as const, hours: 150, rating: 4 },
    { key: 'walkseed_rater5', status: 'playing' as const, hours: 30, rating: null }, // adds-but-doesn't-rate
  ];
  const raterIds: Record<string, string> = {};
  const raterEntries: Record<string, string> = {};
  for (const r of raterSpec) {
    const uid = await ensureUser(`${r.key}@ingame.app`, r.key);
    raterIds[r.key] = uid;
    const entryId = await ensureEntry(uid, HADES_ID);
    raterEntries[r.key] = entryId;
    await collectionService.updateEntry(uid, entryId, {
      status: r.status,
      hours: r.hours,
      ...(r.rating != null ? { rating: r.rating } : {}),
    });
  }
  report.gap1_raters = raterSpec.map((r) => ({ user: r.key, id: raterIds[r.key], entryId: raterEntries[r.key], ...r }));

  // ── GAP 2 — walkseed_avatar pins a favourite (Hades) with an equipped card face ────────────────
  const avatarId = await ensureUser('walkseed_avatar@ingame.app', 'walkseed_avatar');
  const avatarEntry = await ensureEntry(avatarId, HADES_ID);
  await collectionService.updateEntry(avatarId, avatarEntry, { status: 'beaten', hours: 60 });
  const avatarCard = await publishDesign(
    avatarId,
    HADES_ID,
    'Hades — Avatar Favourite',
    {
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      base: { gradient: ['#2a0f3a', '#0e0518'] },
      elements: [
        { type: 'poly', shape: 'star', x: 0.5, y: 0.42, w: 0.46, h: 0.46, fill: '#ff1aa8', name: 'STAR' },
        { type: 'rect', x: 0.5, y: 0.66, w: 0.5, h: 0.02, fill: '#00e5ff', name: 'RULE' },
        { type: 'text', x: 0.5, y: 0.5, text: 'FAV', size: 0.06, fill: CREAM, name: 'MARK' },
      ],
      frame: { color: '#00e5ff', width: 0.012 },
      nameplate: { title: 'HADES', plate: '#141026', ink: CREAM, size: 0.05 },
      effect: { kind: 'soft-glow', intensity: 0.5 },
    } as unknown as Composition,
  );
  // Equip avatar's OWN published card on their Hades entry (real COL-06 equip path)…
  await collectionService.updateEntry(avatarId, avatarEntry, { activeCardDesignId: avatarCard.id });
  // …then pin Hades as the favourite (real PATCH /me favourite path).
  await profileService.updateProfile(avatarId, { favouriteGameId: HADES_ID });
  report.gap2_avatarUserId = avatarId;
  report.gap2_avatarEntryId = avatarEntry;
  report.gap2_favouriteGameId = HADES_ID;
  report.gap2_equippedCardId = avatarCard.id;
  report.gap2_cardPremium = avatarCard.premium;

  // A walkseed FRIEND of avatar (real request→accept path) so the favourite pin is verifiable through
  // the friend-scoped /users/:id shape — the SAME shape demo (avatar's existing friend) already sees.
  // walkseed-only; never touches demo. Idempotent: skip when already bonded / pending.
  const friendId = raterIds['walkseed_rater1']!;
  try {
    await socialService.createFriendRequest(avatarId, friendId);
  } catch (e) {
    console.error('gap2 friend request note:', (e as Error).message);
  }
  const reqs = await socialService.listFriendRequests(friendId);
  const incoming = reqs.incoming.find((r) => r.person.userId === avatarId);
  if (incoming) {
    await socialService.acceptFriendRequest(friendId, incoming.requestId);
    report.gap2_walkseedFriend = { friendId, friendship: 'accepted' };
  } else {
    report.gap2_walkseedFriend = { friendId, friendship: 'already-friends-or-no-pending' };
  }

  // ── GAP 3 — ~30 community cards on Stardew via the REAL publish/flatten path + adoption spread ──
  const designerKeys = ['walkseed_designer1', 'walkseed_designer2', 'walkseed_designer3', 'walkseed_designer4', 'walkseed_designer5', 'walkseed_designer6'];
  const designerIds: Record<string, string> = {};
  const stardewCards: Array<{ id: string; designer: string; name: string; premium: string[] }> = [];
  let seed = 1;
  for (let d = 0; d < designerKeys.length; d++) {
    const key = designerKeys[d]!;
    const uid = await ensureUser(`${key}@ingame.app`, key);
    designerIds[key] = uid;
    for (let c = 0; c < 5; c++) {
      const name = `Stardew — ${key.replace('walkseed_', '')} #${c + 1}`;
      const comp = stardewComposition(d + c, seed);
      const pub = await publishDesign(uid, STARDEW_ID, name, comp);
      stardewCards.push({ id: pub.id, designer: key, name, premium: pub.premium });
      seed++;
    }
  }
  report.gap3_designerIds = designerIds;
  report.gap3_publishedCount = stardewCards.length;
  report.gap3_anyPremium = stardewCards.filter((c) => c.premium.length > 0).map((c) => c.id); // expect []

  // Adoption spread: 4 / 3 / 2 / 1 / 1 → TOP visibly differs from NEW. Adopters never == the designer.
  const spread: Array<{ cardIdx: number; adopters: string[] }> = [
    { cardIdx: 0, adopters: ['walkseed_rater1', 'walkseed_rater2', 'walkseed_rater3', 'walkseed_rater4'] }, // designer1's card → 4
    { cardIdx: 5, adopters: ['walkseed_rater1', 'walkseed_rater2', 'walkseed_avatar'] }, // designer2's card → 3
    { cardIdx: 10, adopters: ['walkseed_rater3', 'walkseed_rater5'] }, // designer3's card → 2
    { cardIdx: 15, adopters: ['walkseed_avatar'] }, // designer4's card → 1
    { cardIdx: 20, adopters: ['walkseed_rater4'] }, // designer5's card → 1
  ];
  const adopterId = (k: string): string =>
    k === 'walkseed_avatar' ? avatarId : raterIds[k]!;
  const adoptionResults: Array<Record<string, unknown>> = [];
  for (const s of spread) {
    const card = stardewCards[s.cardIdx]!;
    for (const a of s.adopters) {
      const uid = adopterId(a);
      try {
        await cardService.adoptCard(uid, card.id);
        adoptionResults.push({ card: card.id, name: card.name, adopter: a, result: 'adopted' });
      } catch (e) {
        if (e instanceof AlreadyAdoptedError) {
          adoptionResults.push({ card: card.id, name: card.name, adopter: a, result: 'already-adopted' });
        } else throw e;
      }
    }
  }
  report.gap3_adoptionSpread = spread.map((s) => ({
    cardId: stardewCards[s.cardIdx]!.id,
    name: stardewCards[s.cardIdx]!.name,
    designer: stardewCards[s.cardIdx]!.designer,
    expectedAdoptions: s.adopters.length,
    adopters: s.adopters,
  }));
  report.gap3_adoptionResults = adoptionResults;

  console.log('WALK_SEED_RICH_REPORT ' + JSON.stringify(report, null, 2));
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('walk-seed-rich FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
