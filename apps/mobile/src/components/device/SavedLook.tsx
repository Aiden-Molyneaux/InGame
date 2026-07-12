import { Pressable, Text, View } from 'react-native';
import type { LookResponse } from '@ingame/shared';
import { MiniDevice } from '../MiniDevice';
import { themedStyles, useTheme } from '../../theme';
import {
  resolveShellId,
  resolveScreenThemeId,
  SHELL_NAMES,
  SCREEN_THEME_NAMES,
} from '../../theme/palettes';

// SavedLook (component-map §11 · D6·1) — one re-applyable combo thumbnail: a MiniDevice in the look's
// shell + theme-tinted mini screen, a sticker-present hint when the look carries any, and the two-line
// shell·theme identity (no custom name — DEV-05/OQ-064). The whole tile applies the look on tap. The
// current look wears the ON NOW tag + accent ring and carries NO × (switch first — the can't-delete-
// while-equipped kin, OQ-061); every other tile carries a small × to remove it (confirmed upstream).
export function SavedLook({
  look,
  onNow,
  onApply,
  onDelete,
}: {
  look: LookResponse;
  onNow: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const shell = resolveShellId(look.activeShellId);
  const themeId = resolveScreenThemeId(look.screenThemeId);
  const hasStickers = look.stickerComposition.stickers.length > 0;

  // The remove-✕ is a SIBLING of the apply-tile, never nested inside it (Slip.tsx:12 rule — a
  // button-in-button is invalid on web and gives the screen reader an ambiguous activation target).
  // A wrapping non-pressable View holds both; the ✕ / ON NOW tag sit absolutely in the tile corner.
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SHELL_NAMES[shell]} ${SCREEN_THEME_NAMES[themeId]} look${onNow ? ', on now' : ''}`}
        accessibilityState={{ selected: onNow }}
        onPress={onApply}
        style={({ pressed }) => [styles.tile, onNow && styles.tileOn, pressed && styles.pressed]}
      >
        <View style={styles.mini}>
          <MiniDevice shellId={shell} themeId={themeId} />
          {hasStickers ? <View style={styles.stickerHint} accessibilityLabel="has stickers" /> : null}
        </View>

        <Text style={[styles.id, onNow && { color: t.scr.accent }]}>
          {SHELL_NAMES[shell]}
          {'\n'}
          {SCREEN_THEME_NAMES[themeId]}
        </Text>
      </Pressable>

      {onNow ? (
        <View style={styles.onTag} pointerEvents="none">
          <Text style={styles.onTagText}>ON NOW</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove look"
          onPress={onDelete}
          hitSlop={8}
          style={styles.del}
        >
          <Text style={styles.delText}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // the positioning root — the tile fills it, the ✕ / ON NOW tag anchor to its corners as siblings
  wrap: { position: 'relative' },
  tile: {
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: t.corner.screen, // F-07 square on screen
    backgroundColor: t.scr.panel,
  },
  tileOn: { borderColor: t.scr.accent, backgroundColor: t.scr.panelHi },
  pressed: { opacity: 0.82 },
  mini: { position: 'relative' },
  // a calm generic "this look has stickers" pip on the mini forehead (the real glyphs live on the shell).
  stickerHint: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.scr.accent,
  },
  onTag: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    backgroundColor: t.scr.accent,
    paddingHorizontal: t.space.sm,
    paddingVertical: 1,
    zIndex: 1,
  },
  onTagText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.accentInk,
    letterSpacing: 1,
  },
  del: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  delText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15 (F-06)
    color: t.scr.dim,
    lineHeight: 16,
  },
  id: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 12,
  },
}));
