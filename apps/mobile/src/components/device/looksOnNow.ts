import { resolveShellId, resolveScreenThemeId } from '../../theme/palettes';
import type { StickerComposition } from '@ingame/shared';

// The ON NOW computation (D6·2 · decision 0030/OQ-064). A saved look wears the ON NOW badge when its
// three facets deep-equal the LIVE device — never a stored flag. Kept pure + out of the tile so the
// equality is unit-testable: a shell/theme id-mismatch OR a sticker-composition drift breaks equality.
// Shell/theme compare RESOLVED (an unknown/absent id folds to the default, DEV-03) so two ids that both
// resolve to Teal read equal. The sticker composition compares CANONICALLY — stickers sorted by id and
// each reduced to its bounded fields — so array-order drift from the server can't spoof a mismatch.

/** The three facets that identify a look/device (LookResponse and DeviceResponse both satisfy this). */
export interface LookFacets {
  activeShellId: string;
  screenThemeId: string;
  stickerComposition: StickerComposition;
}

function canonicalStickers(c: StickerComposition): string {
  const sorted = [...c.stickers].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify([
    c.version,
    sorted.map((s) => [s.id, s.assetId, s.zone, s.x, s.y, s.scale, s.rotation]),
  ]);
}

/** True when `look` is the currently-worn combo (shell + theme + sticker composition all equal). */
export function isOnNow(look: LookFacets, live: LookFacets): boolean {
  return (
    resolveShellId(look.activeShellId) === resolveShellId(live.activeShellId) &&
    resolveScreenThemeId(look.screenThemeId) === resolveScreenThemeId(live.screenThemeId) &&
    canonicalStickers(look.stickerComposition) === canonicalStickers(live.stickerComposition)
  );
}
