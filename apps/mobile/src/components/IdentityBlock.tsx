import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Avatar } from './Avatar';
import { RoleTag, selfRoleLabel } from './RoleTag';

// IdentityBlock (component-map §5.4) — the name + Avatar + RoleTag cluster (the Profile header identity).
export function IdentityBlock({
  username,
  avatarUrl,
  role = 'user',
  adminTier = null,
  staff = false,
  memberSince,
}: {
  username: string;
  avatarUrl?: string | null;
  role?: string;
  adminTier?: number | null;
  staff?: boolean;
  memberSince?: string;
}) {
  // Self-view shows the tier (PROF-09); a friend-view passes `staff` for the generic marker.
  const roleLabel = staff ? 'STAFF' : selfRoleLabel(role, adminTier);
  return (
    <View style={styles.row}>
      <Avatar username={username} avatarUrl={avatarUrl} size={64} />
      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {username}
          </Text>
          {roleLabel ? <RoleTag label={roleLabel} /> : null}
        </View>
        {memberSince ? (
          <Text style={styles.since}>MEMBER SINCE {formatSince(memberSince)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function formatSince(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  meta: { flex: 1, gap: theme.space.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, flexWrap: 'wrap' },
  name: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.display, // 21 (F-06)
    color: theme.scr.ink,
    letterSpacing: 0.5,
  },
  since: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
});
