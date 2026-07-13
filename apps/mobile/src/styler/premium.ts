import type { CardComposition } from '../render/composition';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES, FONTS } from './roster';
import type { CosmeticListItem } from '@ingame/shared';

// CARD-13 / COSM-03 (M5 P7) — the CLIENT premium derivation. Mirrors the server's
// `config/cosmetics.ts#collectCosmeticRefs`: given a composition, resolve the premium roster ids it
// references (frame kind+color / effect kind / finish kind / nameplate shape / fonts). The tier flags
// live on the client roster (roster.ts); the PX price + caller-scoped `owned` come from GET /cosmetics.
// Kept PURE + roster-driven so the cost-stack math is unit-testable without the network.

/** The premium roster ids a composition references (deduped, order = frame→effect→finish→plate→fonts). */
export function collectPremiumRosterIds(composition: CardComposition | null | undefined): string[] {
  if (!composition) return [];
  const ids: string[] = [];
  const c = composition;
  // frame — kind+color resolves the id (several ids share a kind; premium disambiguated by color)
  if (c.frame?.kind) {
    const f =
      FRAMES.find((x) => x.kind === c.frame!.kind && x.color === c.frame!.color) ??
      FRAMES.find((x) => x.kind === c.frame!.kind);
    if (f?.tier === 'premium') ids.push(f.id);
  }
  // effect — kind is the id
  if (c.effect && c.effect.kind !== 'none') {
    const e = EFFECTS.find((x) => x.kind === c.effect!.kind);
    if (e?.tier === 'premium') ids.push(e.id);
  }
  // finish — kind is the id
  if (c.finish && c.finish.kind !== 'none') {
    const f = FINISHES.find((x) => x.kind === c.finish!.kind);
    if (f?.tier === 'premium') ids.push(f.id);
  }
  // nameplate shape + font
  if (c.nameplate) {
    const p = NAMEPLATES.find((x) => x.shape === (c.nameplate!.shape ?? 'slab'));
    if (p?.tier === 'premium') ids.push(p.id);
    if (c.nameplate.fontId) {
      const font = FONTS.find((x) => x.id === c.nameplate!.fontId);
      if (font?.tier === 'premium') ids.push(font.id);
    }
  }
  // fonts on text elements (a premium font can ride any text slip — the server counts these too)
  for (const el of c.elements ?? []) {
    if (el.type === 'text' && el.fontId) {
      const font = FONTS.find((x) => x.id === el.fontId);
      if (font?.tier === 'premium') ids.push(font.id);
    }
  }
  return [...new Set(ids)];
}

/** True iff the roster item at `id` is a premium tier (used to badge rail tiles). */
export function isPremiumRosterId(id: string): boolean {
  const all = [...FRAMES, ...EFFECTS, ...FINISHES, ...NAMEPLATES, ...FONTS];
  return all.find((x) => x.id === id)?.tier === 'premium';
}

export interface PremiumRef {
  cosmeticId: string;
  name: string;
  price: number;
  owned: boolean;
}

/** Join premium roster ids against the GET /cosmetics library (price + caller-scoped ownership). */
export function resolvePremiumRefs(ids: string[], library: CosmeticListItem[] | undefined): PremiumRef[] {
  const byId = new Map((library ?? []).map((i) => [i.id, i]));
  return ids.map((id) => {
    const item = byId.get(id);
    return {
      cosmeticId: id,
      name: item?.name ?? id.toUpperCase(),
      price: item?.price ?? 0,
      owned: item?.owned ?? false,
    };
  });
}

export interface PremiumStatus {
  refs: PremiumRef[]; // every premium component in the composition (owned + unowned)
  unowned: PremiumRef[]; // the ones needing acquisition (the reconcile set)
  costStack: number; // summed PX of the UNOWNED premium (the running debt, 0 when fully owned)
}

/** The whole CARD-13 picture for a composition: refs, the unowned reconcile set, and the cost-stack. */
export function premiumStatusOf(
  composition: CardComposition | null | undefined,
  library: CosmeticListItem[] | undefined,
): PremiumStatus {
  const refs = resolvePremiumRefs(collectPremiumRosterIds(composition), library);
  const unowned = refs.filter((r) => !r.owned);
  const costStack = unowned.reduce((sum, r) => sum + r.price, 0);
  return { refs, unowned, costStack };
}

/** Look up a single roster id's price + owned state from the library (rail tile badging). */
export function libraryEntry(id: string, library: CosmeticListItem[] | undefined): CosmeticListItem | undefined {
  return (library ?? []).find((i) => i.id === id);
}
