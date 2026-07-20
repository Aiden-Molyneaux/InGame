import type { CardComposition } from '../render/composition';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES, FONTS } from './roster';
import type { CosmeticListItem, CosmeticType, CosmeticTier } from '@ingame/shared';

// CARD-13 / COSM-03 (M5 P7) — the CLIENT premium derivation. Mirrors the server's
// `config/cosmetics.ts#collectCosmeticRefs`: given a composition, resolve the premium roster ids it
// references (frame kind+color / effect kind / finish kind / nameplate shape / fonts). The tier flags
// live on the client roster (roster.ts); the PX price + caller-scoped `owned` come from GET /cosmetics.
// Kept PURE + roster-driven so the cost-stack math is unit-testable without the network.

// ── COSM-05 (M6 W-5, decision 0080) — the explicit composition `cosmeticId`, client mirror ────────
// A frame/nameplate closed attribute MAY carry an optional `cosmeticId`, written by the Styler when
// an ULTIMATE (colour-customizable) design is applied. Trusted only after ROSTER validation (the id
// must exist on the right roster and its render kind/shape must match the attribute — mirroring the
// server's `resolveExplicitCosmeticId`); an invalid/mismatched id falls back to colour-inference.
// This keeps a freely-recoloured ultimate design resolving to ITS OWN SKU (the 10-PX reconcile price,
// the styler selection derive, the preset recipe) instead of silently reading FREE or as its base.

/** The VALIDATED explicit frame roster id, or undefined (caller falls back to kind+color inference).
 *  PREMIUM-ONLY (Murr W-5 MED): the server's `resolveExplicitCosmeticId` looks up PREMIUM_BY_ID, so a
 *  free id never validates there — mirroring that here keeps the client cost-stack agreeing with the
 *  publish reconcile (a smuggled free `cosmeticId` on a premium-coloured frame must NOT zero the price). */
export function explicitFrameRosterId(
  frame: { kind?: string; cosmeticId?: string } | undefined,
): string | undefined {
  if (!frame || typeof frame.cosmeticId !== 'string' || !frame.cosmeticId) return undefined;
  const f = FRAMES.find((x) => x.id === frame.cosmeticId);
  return f && f.tier === 'premium' && f.kind != null && f.kind === frame.kind ? f.id : undefined;
}

/** The VALIDATED explicit nameplate roster id, or undefined (caller falls back to the shape ref).
 *  PREMIUM-ONLY — same server-mirror rule as the frame resolver above. */
export function explicitPlateRosterId(
  nameplate: { shape?: string; cosmeticId?: string } | undefined,
): string | undefined {
  if (!nameplate || typeof nameplate.cosmeticId !== 'string' || !nameplate.cosmeticId) return undefined;
  const p = NAMEPLATES.find((x) => x.id === nameplate.cosmeticId);
  return p && p.tier === 'premium' && p.shape === (nameplate.shape ?? 'slab') ? p.id : undefined;
}

/** The premium roster ids a composition references (deduped, order = frame→effect→finish→plate→fonts). */
export function collectPremiumRosterIds(composition: CardComposition | null | undefined): string[] {
  if (!composition) return [];
  const ids: string[] = [];
  const c = composition;
  // frame — a validated explicit `cosmeticId` WINS (COSM-05 colour-independence); else kind+color
  // resolves the id (several ids share a kind; premium disambiguated by color)
  if (c.frame?.kind) {
    const explicit = explicitFrameRosterId(c.frame);
    // colour compare is case-INSENSITIVE, mirroring the server's resolveFrameCosmeticId (Murr W-5
    // MED: '#E8C14A' must price as thin-gold on BOTH sides, never free-here/3-PX-there).
    const frameColor = typeof c.frame.color === 'string' ? c.frame.color.toLowerCase() : '';
    const f = explicit
      ? FRAMES.find((x) => x.id === explicit)
      : (FRAMES.find((x) => x.kind === c.frame!.kind && x.color.toLowerCase() === frameColor) ??
        FRAMES.find((x) => x.kind === c.frame!.kind));
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
  // nameplate shape + font — a validated explicit plate `cosmeticId` REPLACES the shape ref
  // (COSM-05: one design, one id — an ultimate plate must never also read as its base SKU)
  if (c.nameplate) {
    const explicitPlate = explicitPlateRosterId(c.nameplate);
    const p = explicitPlate
      ? NAMEPLATES.find((x) => x.id === explicitPlate)
      : NAMEPLATES.find((x) => x.shape === (c.nameplate!.shape ?? 'slab'));
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
  /** COSM-01 type — drives the G4 CosmeticSwatch in the reconcile/keep buy lists (M5 F-9). */
  type: CosmeticType;
  price: number;
  owned: boolean;
  /** COSM-05 (decision 0080 r3) — the library tier; carried so the reconcile row can wear the ULTIMATE
   *  chip (the same marking the store/adopt surfaces use). Absent for a ref that precedes the library load. */
  tier?: CosmeticTier;
}

/** Join premium roster ids against the GET /cosmetics library (price + caller-scoped ownership). */
export function resolvePremiumRefs(ids: string[], library: CosmeticListItem[] | undefined): PremiumRef[] {
  const byId = new Map((library ?? []).map((i) => [i.id, i]));
  return ids.map((id) => {
    const item = byId.get(id);
    return {
      cosmeticId: id,
      name: item?.name ?? id.toUpperCase(),
      type: item?.type ?? inferCosmeticType(id),
      price: item?.price ?? 0,
      owned: item?.owned ?? false,
      tier: item?.tier,
    };
  });
}

// The library is the source of truth for `type`; but a ref can precede the GET /cosmetics load, so infer
// the type from which roster array owns the id (the swatch needs SOMETHING to draw). Falls back to
// 'frame' (a neutral sample card) for an unknown id.
function inferCosmeticType(id: string): CosmeticType {
  if (FRAMES.some((f) => f.id === id)) return 'frame';
  if (EFFECTS.some((e) => e.id === id)) return 'effect';
  if (FINISHES.some((f) => f.id === id)) return 'finish';
  if (NAMEPLATES.some((n) => n.id === id)) return 'nameplate';
  if (FONTS.some((f) => f.id === id)) return 'font';
  return 'frame';
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
