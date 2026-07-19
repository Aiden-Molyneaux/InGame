import { View, Text, Image } from 'react-native';
import type { AvatarConfig, AvatarFrame } from '@ingame/shared';
import { themedStyles, useTheme } from '../theme';

// Avatar (component-map §5.4) — a square monogram guaranteed before any designed avatar exists
// (PROF-08 default-monogram guarantee). F-07 square on screen; accent hairline.
//
// W-4 (the Monogram Forge): the ONE monogram component consumes `avatarConfig` — so every surface that
// renders <Avatar> (Profile · friend profile · contributor · friends rows · feed · compare) shows the
// user's customised monogram automatically as its payload carries the config. When `avatarConfig` is
// null/undefined the render is BYTE-IDENTICAL to the historical default (theme panelHi bg · accent ink ·
// hairline border · derived initials). `avatarUrl` (a real designed avatar, launch-era) always wins.
export function Avatar({
  username,
  avatarUrl,
  avatarConfig,
  size = 56,
}: {
  username: string;
  avatarUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  size?: number;
}) {
  const styles = useStyles();
  const t = useTheme();
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        accessibilityLabel={`${username} avatar`}
        style={[styles.box, { width: size, height: size }]}
      />
    );
  }

  const derived = username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '??';

  // The DEFAULT monogram (no config) — the historical render, unchanged.
  if (!avatarConfig) {
    return (
      <View style={[styles.box, styles.monogram, { width: size, height: size }]}>
        <Text style={[styles.initials, { fontSize: Math.round(size / 2.6) }]}>{derived}</Text>
      </View>
    );
  }

  // The CONFIGURED monogram (W-4) — the forged colour pair + glyph + frame.
  const glyph = (avatarConfig.glyph ?? derived).toUpperCase();
  const frame = avatarConfig.frame ?? 'none';
  const frameStyle = frameBox(frame, avatarConfig.ink, t.scr.hairline);
  return (
    <View
      accessibilityLabel={`${username} monogram`}
      style={[
        styles.monogram,
        { width: size, height: size, borderRadius: t.corner.screen, backgroundColor: avatarConfig.bg },
        frameStyle.outer,
      ]}
    >
      {frame === 'inset' || frame === 'double' ? (
        <View pointerEvents="none" style={[styles.innerFrame, frameStyle.inner, { borderRadius: Math.max(0, t.corner.screen - 3) }]} />
      ) : null}
      <Text style={[styles.initials, { color: avatarConfig.ink, fontSize: Math.round(size / 2.6) }]}>{glyph}</Text>
    </View>
  );
}

// The frame set (W-4) — rendered with border styles alone (no flatten pipeline). `ink` inks the frame so
// it reads as one with the glyph; `none` falls back to the neutral hairline (the default box border).
function frameBox(
  frame: AvatarFrame,
  ink: string,
  hairline: string,
): { outer: { borderWidth: number; borderColor: string }; inner?: { borderColor: string } } {
  switch (frame) {
    case 'ring':
      return { outer: { borderWidth: 2, borderColor: ink } };
    case 'inset':
      return { outer: { borderWidth: 1, borderColor: hairline }, inner: { borderColor: ink } };
    case 'double':
      return { outer: { borderWidth: 3, borderColor: ink }, inner: { borderColor: ink } };
    case 'none':
    default:
      return { outer: { borderWidth: 1, borderColor: hairline } };
  }
}

const useStyles = themedStyles((t) => ({
  box: {
    borderRadius: t.corner.screen,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  monogram: {
    backgroundColor: t.scr.panelHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: t.font.screenBold,
    color: t.scr.accent,
    letterSpacing: 1,
  },
  // the inset/double frame's inner outline — a hairline-thin second line set in from the edge.
  innerFrame: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
  },
}));
