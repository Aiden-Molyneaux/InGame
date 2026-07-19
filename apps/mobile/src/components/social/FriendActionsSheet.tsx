import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { PersonSummary } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { Avatar } from '../Avatar';
import { themedStyles, useTheme } from '../../theme';

// FriendActionsSheet (P8 · friends-states P6) — the row-⋮ actions menu. A dumb menu: it renders the
// header + the action rows and calls back; the roster screen owns the follow-on sheets (RecommendSheet,
// the UNFRIEND/BLOCK ConfirmSheets, the ReportSheet). NO SHARE anywhere (OQ-052). VIEW / COMPARE /
// RECOMMEND, then a MANAGE section (UNFRIEND — silent), then a SAFETY section (REPORT / BLOCK, alert).
export function FriendActionsSheet({
  visible,
  person,
  onClose,
  onView,
  onCompare,
  onRecommend,
  onUnfriend,
  onReport,
  onBlock,
}: {
  visible: boolean;
  person: PersonSummary | null;
  onClose: () => void;
  onView: () => void;
  onCompare: () => void;
  onRecommend: () => void;
  onUnfriend: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  if (!person) return null;
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Avatar username={person.username} avatarUrl={person.avatarUrl} avatarConfig={person.avatarConfig} size={50} />
        <View style={styles.headMeta}>
          <Text style={styles.headName} numberOfLines={1}>
            {person.username}
          </Text>
          <Text style={styles.headSub}>FRIEND</Text>
        </View>
      </View>

      <ActionRow
        label="View profile"
        onPress={onView}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Circle cx={12} cy={8} r={4} fill="none" stroke={t.scr.ink} strokeWidth={1.8} />
            <Path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke={t.scr.ink} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        }
      />
      <ActionRow
        label="Compare hours"
        note="›"
        onPress={onCompare}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Path d="M5 20V10M12 20V4M19 20v-7" fill="none" stroke={t.scr.ink} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        }
      />
      <ActionRow
        label="Recommend a game"
        note="›"
        onPress={onRecommend}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Path d="M12 4v10M7 9l5-5 5 5M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" fill="none" stroke={t.scr.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        }
      />

      <Text style={styles.section}>MANAGE</Text>
      <ActionRow
        label="Unfriend"
        note="SILENT"
        onPress={onUnfriend}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Circle cx={10} cy={8} r={4} fill="none" stroke={t.scr.ink} strokeWidth={1.8} />
            <Path d="M3 20a7 7 0 0 1 13-3.5M16 18h6" fill="none" stroke={t.scr.ink} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        }
      />

      <Text style={styles.section}>SAFETY</Text>
      <ActionRow
        label="Report"
        note="›"
        danger
        onPress={onReport}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Path d="M5 21V4l1-1h9l-1 4 1 4H6" fill="none" stroke={t.brand.alert} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        }
      />
      <ActionRow
        label="Block"
        danger
        last
        onPress={onBlock}
        icon={
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={9} fill="none" stroke={t.brand.alert} strokeWidth={1.8} />
            <Path d="M5.6 5.6l12.8 12.8" stroke={t.brand.alert} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        }
      />
    </PulledSheet>
  );
}

function ActionRow({
  label,
  icon,
  note,
  onPress,
  danger = false,
  last = false,
}: {
  label: string;
  icon: ReactNode;
  note?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, last && styles.actionLast, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={[styles.actionLabel, danger && styles.dangerLabel]}>{label.toUpperCase()}</Text>
      {note ? <Text style={styles.actionNote}>{note}</Text> : null}
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  head: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'center',
    paddingBottom: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  headMeta: { flex: 1, minWidth: 0, gap: 3 },
  headName: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  headSub: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  section: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 2, paddingTop: t.space.lg, paddingBottom: t.space.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  actionLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  actionIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  dangerLabel: { color: t.brand.alert },
  actionNote: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
}));
