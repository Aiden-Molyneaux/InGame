import { useState, Children, Fragment, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Constants from 'expo-constants';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { ScreenButton } from '../src/components/ScreenButton';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { themedStyles, useTheme } from '../src/theme';
import { useGetMeQuery } from '../src/store/api';
import { useGetBlocksQuery } from '../src/store/settingsApi';
import { logoutTeardown } from '../src/store';

// Settings — the §0.10 M6 slice (0076): the lean-list shell hosting ONLY the M6 rows. Deferred rows are
// ABSENT, not disabled (§0.10): notifications (M7 · push) · feedback/help (M7 · SYS-11) · admin console
// (M7 · MOD-04) · delete account (M8 · 0.3) · the PROF-03 privacy toggle + email/username edit pages are
// out of this slice. SIGN OUT homes HERE now (relocated from Profile — one home; the Profile keeps a
// header door into Settings). The row grammar is the board's `ListRow` (icon+label+sub+value+chevron).
export default function Settings() {
  const router = useRouter();
  const styles = useStyles();
  const { data: me } = useGetMeQuery();
  const { data: blocks } = useGetBlocksQuery();
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  async function doSignOut() {
    await logoutTeardown(); // F20/F14 — purge persisted prefs + reset cache + clear secure-store tokens
    router.replace('/sign-in');
  }

  const version = Constants.expoConfig?.version ?? '2.0.0';
  const blockCount = blocks?.blocks.length;

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Settings" />
      </View>
      {/* W-B2 — the return seam is a FIXED row (the app-wide seam grammar). */}
      <View style={styles.retlink}>
        <TertiaryLink label="Return to profile" chevron="leading-back" onPress={() => router.back()} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── ACCOUNT ── */}
        <Section title="Account">
          <Group>
            {/* GAP: the /me self-shape carries `emailVerified` but NOT the raw email address (SYS-02 —
                the address isn't serialized), so the row shows verified-state only, no address value. */}
            <Row
              icon={<EmailIcon />}
              label="Email"
              sub={me?.emailVerified ? '✓ Verified' : 'Unverified — check your inbox'}
              subTone={me?.emailVerified ? 'ok' : 'warn'}
            />
            <Row icon={<AtIcon />} label="Username" value={me ? `@${me.username}` : undefined} />
          </Group>
        </Section>

        {/* ── PRIVACY & SAFETY ── */}
        <Section title="Privacy & Safety">
          <Group>
            <Row
              icon={<BlockIcon />}
              label="Blocked users"
              value={blockCount != null ? String(blockCount) : undefined}
              onPress={() => router.push('/settings/blocked')}
            />
          </Group>
        </Section>

        {/* ── ABOUT & LEGAL ── */}
        <Section title="About & Legal">
          <Group>
            <Row icon={<DocIcon />} label="Terms of Service" onPress={() => router.push('/legal/terms')} />
            <Row icon={<ShieldIcon />} label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
            <Row icon={<InfoIcon />} label="Version" value={version} />
          </Group>
        </Section>

        {/* walk2 B11 — SIGN OUT is the screen's TERMINAL row (the board's terminal-row grammar: the
            session exit closes the list, after every browse section). Raises the S7b calm confirm. */}
        <Group>
          <View style={styles.actRow}>
            <ScreenButton label="Sign out" variant="secondary" onPress={() => setSignOutConfirm(true)} block />
          </View>
        </Group>

        <Text style={styles.footnote}>
          Screen theme isn’t here — it’s part of your device, set in the Device editor.
        </Text>
      </ScrollView>

      <ConfirmSheet
        visible={signOutConfirm}
        title="Sign out?"
        message="You’ll be signed out on this device. Nothing is deleted — your collection, cards, and wallet are waiting when you sign back in."
        confirmLabel="Sign out"
        tone="primary" // decision 0040 / S7b — sign-out is reversible (session-end, no data loss): the calm accent confirm, NOT red
        onConfirm={() => void doSignOut()}
        onClose={() => setSignOutConfirm(false)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// The row-group well — a hairline flat panel with zero padding; a hairline divider is interleaved
// BETWEEN rows (never above the first — the board's `.row + .row` rule).
function Group({ children, style }: { children: ReactNode; style?: object }) {
  const styles = useStyles();
  const items = Children.toArray(children);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  subTone,
  value,
  onPress,
}: {
  icon?: ReactNode;
  label: string;
  sub?: string;
  subTone?: 'ok' | 'warn';
  value?: string;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const inner = (
    <>
      {icon ? <View style={styles.ric}>{icon}</View> : null}
      <View style={styles.rlWrap}>
        <Text style={styles.rl}>{label.toUpperCase()}</Text>
        {sub ? (
          <Text style={[styles.rsub, subTone === 'ok' && styles.rsubOk, subTone === 'warn' && styles.rsubWarn]}>
            {sub.toUpperCase()}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={styles.rv}>{value}</Text> : null}
      {onPress ? <Text style={styles.chev}>›</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.row}>{inner}</View>;
}

// ── small row icons (cream chip · navy stroke — the board's `.ric`) ──
function RicSvg({ children }: { children: ReactNode }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15">
      {children}
    </Svg>
  );
}
const S = '#1d2a4a';
const EmailIcon = () => (
  <RicSvg>
    <Rect x={1.5} y={3} width={12} height={9} rx={1.2} fill="none" stroke={S} strokeWidth={1.4} />
    <Path d="M2 4l5.5 4.2L13 4" fill="none" stroke={S} strokeWidth={1.4} />
  </RicSvg>
);
const AtIcon = () => (
  <RicSvg>
    <Circle cx={7.5} cy={7.5} r={3} fill="none" stroke={S} strokeWidth={1.4} />
    <Path d="M10.5 7.5v1.6a1.8 1.8 0 0 0 3 0V7.5a6 6 0 1 0-2.4 4.8" fill="none" stroke={S} strokeWidth={1.4} />
  </RicSvg>
);
const BlockIcon = () => (
  <RicSvg>
    <Circle cx={7.5} cy={7.5} r={5.4} fill="none" stroke={S} strokeWidth={1.3} />
    <Path d="M3.7 3.7l7.6 7.6" stroke={S} strokeWidth={1.3} />
  </RicSvg>
);
const DocIcon = () => (
  <RicSvg>
    <Path d="M3.5 1.7h5l3 3v8.6h-8z" fill="none" stroke={S} strokeWidth={1.3} />
    <Path d="M8.5 1.7v3h3M5 7.2h5M5 9.6h5" fill="none" stroke={S} strokeWidth={1.2} />
  </RicSvg>
);
const ShieldIcon = () => (
  <RicSvg>
    <Path d="M7.5 1.6l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6v-4l5-2z" fill="none" stroke={S} strokeWidth={1.3} />
  </RicSvg>
);
const InfoIcon = () => (
  <RicSvg>
    <Circle cx={7.5} cy={7.5} r={5.5} fill="none" stroke={S} strokeWidth={1.3} />
    <Path d="M7.5 6.8v4M7.5 4.7v.5" stroke={S} strokeWidth={1.5} />
  </RicSvg>
);

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD }, // W-B2
  scroll: { flex: 1 },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.xl }, // W-B2 — top pad dropped (the seam row owns gap-2)
  section: { gap: t.space.md },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginLeft: t.space.xs },
  group: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, paddingHorizontal: t.space.lg, paddingVertical: t.space.lg },
  rowPressed: { opacity: 0.7 },
  divider: { height: 1, backgroundColor: t.scr.hairline },
  actRow: { padding: t.space.md },
  ric: {
    width: 30,
    height: 30,
    backgroundColor: t.scr.key,
    alignItems: 'center',
    justifyContent: 'center',
    ...(t.scr.isLight ? { borderWidth: 1, borderColor: t.scr.hairline } : null),
  },
  rlWrap: { flex: 1, gap: 2 },
  rl: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1 },
  rsub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  rsubOk: { color: t.brand.success },
  rsubWarn: { color: t.scr.accent },
  rv: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'right', maxWidth: 160 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
  footnote: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, textAlign: 'center', lineHeight: 14, marginTop: t.space.sm },
}));
