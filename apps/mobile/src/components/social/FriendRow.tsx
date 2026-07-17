import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { PersonSummary } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { Avatar } from '../Avatar';
import { ScreenButton } from '../ScreenButton';

// FriendRow (P8 · SOC-01 · friends-states P3) — a roster row: avatar + username + a COMPARE jump-off +
// the ⋮ overflow (→ the actions sheet). Tapping the row body opens their profile.
//
// GAP (manifest): the board draws a StatPeek (hours + collection size) on each row, but GET /me/friends
// returns a PersonSummary ({userId, username, avatarUrl, relationship}) with NO stats — the widened
// friends-list shape isn't served, so the peek is EXPECTED (never faked). The COMPARE hook still reads.
export function FriendRow({
  person,
  onProfile,
  onCompare,
  onOverflow,
}: {
  person: PersonSummary;
  onProfile: (userId: string) => void;
  onCompare: (userId: string) => void;
  onOverflow: (person: PersonSummary) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.username} profile`}
        onPress={() => onProfile(person.userId)}
        style={styles.tapTarget}
        hitSlop={4}
      >
        <Avatar username={person.username} avatarUrl={person.avatarUrl} size={38} />
        <Text style={styles.name} numberOfLines={1}>
          {person.username}
        </Text>
      </Pressable>

      <View style={styles.right}>
        <ScreenButton
          label="Compare"
          variant="secondary"
          size="mini"
          onPress={() => onCompare(person.userId)}
          icon={
            <Svg width={12} height={11} viewBox="0 0 13 12">
              <Path d="M2 10.5V5M6.5 10.5V1.5M11 10.5V7" stroke={t.brand.navy} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            </Svg>
          }
          accessibilityLabel={`Compare with ${person.username}`}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${person.username} options`}
          onPress={() => onOverflow(person)}
          hitSlop={8}
          style={styles.ovf}
        >
          <Text style={styles.ovfText}>⋮</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'center',
    paddingVertical: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  tapTarget: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, flex: 1, minWidth: 0 },
  name: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  ovf: { width: 24, height: 30, alignItems: 'center', justifyContent: 'center' },
  ovfText: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim },
}));
