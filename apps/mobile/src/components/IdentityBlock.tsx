import { View, Text } from 'react-native';
import type { GamertagView, AvatarConfig } from '@ingame/shared';
import { themedStyles } from '../theme';
import { Avatar } from './Avatar';
import { RoleTag, selfRoleLabel } from './RoleTag';

// IdentityBlock (component-map §5.4) — the identity WELL (mockup `.well.id`): the name + Avatar +
// RoleTag cluster, then the bio line, then the gamertag chips. Fix #3 (P1/P4) renders the `bio` +
// `gamertags` the `/me` self-shape carries (0.42 / OQ-116) that the M2 render had dropped.

// PROF-02 platform → short display label for the gamertag chip.
const PLATFORM_LABEL: Record<string, string> = {
  pc: 'PC',
  playstation: 'PSN',
  xbox: 'XBOX',
  nintendo: 'SWITCH',
};

export function IdentityBlock({
  username,
  avatarUrl,
  avatarConfig,
  role = 'user',
  adminTier = null,
  staff = false,
  memberSince,
  bio,
  gamertags,
}: {
  username: string;
  avatarUrl?: string | null;
  /** PROF-08 (W-4) — the Monogram Forge config; null/undefined ⇒ the default monogram. */
  avatarConfig?: AvatarConfig | null;
  role?: string;
  adminTier?: number | null;
  staff?: boolean;
  memberSince?: string;
  bio?: string;
  gamertags?: GamertagView[];
}) {
  const styles = useStyles();
  // Self-view shows the tier (PROF-09); a friend-view passes `staff` for the generic marker.
  const roleLabel = staff ? 'STAFF' : selfRoleLabel(role, adminTier);
  return (
    <View style={styles.well}>
      <View style={styles.row}>
        <Avatar username={username} avatarUrl={avatarUrl} avatarConfig={avatarConfig} size={64} />
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

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

      {gamertags && gamertags.length > 0 ? (
        <View style={styles.gtags}>
          {gamertags.map((g) => (
            <View key={g.id} style={styles.gtag}>
              <Text style={styles.gtagPlatform}>{PLATFORM_LABEL[g.platform] ?? g.platform.toUpperCase()}</Text>
              <Text style={styles.gtagHandle}>{g.handle}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatSince(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();
}

const useStyles = themedStyles((t) => ({
  well: {
    backgroundColor: t.scr.panel,
    padding: t.space.lg,
    gap: t.space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  meta: { flex: 1, gap: t.space.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, flexWrap: 'wrap' },
  name: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 (F-06)
    color: t.scr.ink,
    letterSpacing: 0.5,
  },
  since: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
  bio: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 (F-06)
    lineHeight: 16,
    color: t.scr.dim,
  },
  gtags: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  gtag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    backgroundColor: t.scr.panelHi,
    paddingHorizontal: t.space.md,
    paddingVertical: 4,
  },
  gtagPlatform: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.ink,
    letterSpacing: 0.5,
  },
  gtagHandle: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
}));
