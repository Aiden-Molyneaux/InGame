import { View, Text, Image } from 'react-native';
import { themedStyles } from '../theme';

// Avatar (component-map §5.4) — a square monogram guaranteed before any designed avatar exists
// (PROF-08 default-monogram guarantee). F-07 square on screen; accent hairline.
export function Avatar({
  username,
  avatarUrl,
  size = 56,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const styles = useStyles();
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        accessibilityLabel={`${username} avatar`}
        style={[styles.box, { width: size, height: size }]}
      />
    );
  }
  const initials = username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '??';
  return (
    <View style={[styles.box, styles.monogram, { width: size, height: size }]}>
      <Text style={[styles.initials, { fontSize: Math.round(size / 2.6) }]}>{initials}</Text>
    </View>
  );
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
}));
