import { Pressable, View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { themedStyles, useTheme } from '../../theme';

// HeaderKey (P8 · friends-states `.head-act`) — the persistent ADD FRIENDS door on the Friends header: a
// flat cream square chip (F-03, no travel) carrying the person-plus glyph and an optional orange count
// badge (the pending-requests count). Non-commerce — cream, never gold (decision 0069).
export function HeaderKey({ count = 0, onPress }: { count?: number; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Find, add and requests, ${count} pending` : 'Find, add and requests'}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.key, pressed && styles.pressed]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={9} cy={8} r={3.6} fill="none" stroke={t.brand.navy} strokeWidth={2} />
        <Path d="M3.5 19.5a6 6 0 0 1 11 0" fill="none" stroke={t.brand.navy} strokeWidth={2} strokeLinecap="round" />
        <Path d="M18.5 7.5v6M15.5 10.5h6" fill="none" stroke={t.brand.navy} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  key: {
    width: 34,
    height: 34,
    backgroundColor: t.scr.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: t.brand.creamPressed },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    backgroundColor: t.scr.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk, lineHeight: 15 },
}));
