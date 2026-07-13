import type { StorePack } from '@ingame/shared';

// packMeta — the DEV price map + value-math for the currency packs (decision 0072 launch ladder). The
// USD price is store-owned metadata (App Store / Play), NOT on the `/store` wire — at P2b it comes from
// the RevenueCat product objects. Until then this map supplies the display $ per productId; the value
// math (PX-per-$, "+N% more") DERIVES from the server's `pixels` + this $ so a SYS-04 pixel tweak keeps
// the math honest. An unmapped productId still buys — it shows the PX value + a neutral "$—".
//
// ASSUMPTION(dev price map): keyed to the 0072 SKUs. Replace the whole file's role with StoreKit product
// metadata at P2b (the prices move behind the native sheet, not here).

const USD_BY_PRODUCT: Record<string, number> = {
  px_pack_starter: 0.99,
  px_pack_010: 1.99,
  px_pack_030: 4.99,
  px_pack_065: 9.99,
  px_pack_140: 19.99,
};

const BASE_RATE = 5; // ECON-01 base 5 PX/$ (decision 0072)

/** The display USD string for a product, or null when unmapped (renders "$—", still buys). */
export function usdFor(productId: string): string | null {
  const n = USD_BY_PRODUCT[productId];
  return n === undefined ? null : `$${n.toFixed(2)}`;
}

/** PX-per-dollar for a pack (server pixels ÷ dev $), or null when the $ is unmapped. */
export function pxPerDollar(pack: StorePack): number | null {
  const usd = USD_BY_PRODUCT[pack.productId];
  return usd === undefined || usd === 0 ? null : pack.pixels / usd;
}

/**
 * The value-math line (derived): the base pack states the base rate; better tiers state "+N% more
 * PX/$"; the Starter states its multiplier ("≈ 12.1 PX per $ — 2.4× the base rate, once ever"). Returns
 * '' when the $ is unmapped (the tile falls back to the PX value alone).
 */
export function valueLine(pack: StorePack): string {
  const rate = pxPerDollar(pack);
  if (rate === null) return '';
  if (pack.oneTime) {
    const mult = rate / BASE_RATE;
    return `≈ ${rate.toFixed(1)} PX per $ — ${mult.toFixed(1)}× the base rate, once ever`;
  }
  const pct = Math.round((rate / BASE_RATE - 1) * 100);
  // The base tier prices at ~the base rate ($1.99→10 PX ≈ 5.0 PX/$, within rounding of the 5.0 anchor).
  if (pct < 5) return `Base · ≈ ${rate.toFixed(1)} PX/$`;
  return `+${pct}% more PX/$`;
}

/** True for the pack with the best PX-per-$ among the priced (non-starter) tiers — the "BEST RATE" flash. */
export function isBestRate(pack: StorePack, all: StorePack[]): boolean {
  if (pack.oneTime) return false;
  const priced = all.filter((p) => !p.oneTime && pxPerDollar(p) !== null);
  if (priced.length === 0) return false;
  const best = priced.reduce((a, b) => ((pxPerDollar(b) ?? 0) > (pxPerDollar(a) ?? 0) ? b : a));
  return best.productId === pack.productId;
}
