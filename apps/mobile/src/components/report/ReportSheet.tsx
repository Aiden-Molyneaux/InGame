import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { PulledSheet } from '../PulledSheet';
import { ConfirmSheet } from '../ConfirmSheet';
import { ScreenButton } from '../ScreenButton';
import { StateMark } from '../StateMark';
import { TextField } from '../TextField';
import { Offline } from '../lifecycle';
import { themedStyles, useTheme } from '../../theme';
import { reasonsFor, reportHeader, type ReasonOption } from './reasons';
import type { CreateReportRequest, ReportTargetType } from '../../store/reportApi';

// ReportSheet (component-map §9 `ReportSheet` · `ReportConfirm`; report-states.html) — the app-wide MOD-01
// report `/drawer`, target-aware (card · game · user). Composes `PulledSheet` (the one in-screen drawer;
// A6 — grab handle is the shipped summoned-sheet convention). Internal state machine: pick → (details) →
// submitting → filed | error | offline-gate, plus (user) block-alongside → blocked (SOC-09). SUBMIT is the
// red `KeycapButton/destructive`, DORMANT until a reason is chosen AND — where MOD-01 demands specifics —
// its note is written. On user targets a BLOCK strip sits past an OR divider (an exit, not a reason, not
// the commit — files nothing; SOC-09 · decision 0040 ConfirmSheet). The confirm copy NEVER promises review
// speed (the console is M7 — 0076 §0.5) and reflects MOD-02 soft-hide without exposing a threshold.

export type ReportTarget = { type: ReportTargetType; id: string; name: string };
export type ReportActionOutcome = 'ok' | 'offline' | 'error';

export function ReportSheet({
  visible,
  target,
  onClose,
  onSubmit,
  submitting = false,
  onError,
  onBlock,
  blocking = false,
  onManageBlocks,
}: {
  visible: boolean;
  target: ReportTarget | null;
  onClose: () => void;
  /** Runs POST /reports; resolves the outcome. 'error' keeps the drawer open + re-armed (B3). */
  onSubmit: (req: CreateReportRequest) => Promise<ReportActionOutcome>;
  submitting?: boolean;
  /** B3 — the container raises the page-level error Toast (the board's under-header banner). */
  onError?: (message: string) => void;
  /** User targets only (SOC-09) — the block-alongside. Runs POST /me/blocks; 'ok' → the C2 blocked confirm. */
  onBlock?: () => Promise<ReportActionOutcome>;
  blocking?: boolean;
  /** C2 — MANAGE IN SETTINGS → the blocked-users page. */
  onManageBlocks?: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const [reason, setReason] = useState<ReasonOption | null>(null);
  const [details, setDetails] = useState('');
  const [phase, setPhase] = useState<'pick' | 'filed' | 'blocked'>('pick');
  const [offlineGate, setOfflineGate] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  // Reset transient state whenever a new target is inspected (or the sheet closes).
  useEffect(() => {
    setReason(null);
    setDetails('');
    setPhase('pick');
    setOfflineGate(false);
    setBlockConfirm(false);
  }, [target?.type, target?.id, visible]);

  if (!target) return null;
  const reasons = reasonsFor(target.type);
  const needsDetails = reason?.requiresDetails ?? false;
  const detailsOk = !needsDetails || details.trim().length > 0;
  const armed = reason != null && detailsOk && !offlineGate && !submitting;

  async function doSubmit() {
    if (!reason || !target || !armed) return;
    const req: CreateReportRequest = {
      targetType: target.type,
      targetId: target.id,
      reason: reason.reason,
      ...(needsDetails ? { details: details.trim() } : {}),
    };
    const outcome = await onSubmit(req);
    if (outcome === 'ok') setPhase('filed');
    else if (outcome === 'offline') setOfflineGate(true);
    else onError?.("Couldn't file your report — nothing was lost, your note is still here.");
  }

  async function doBlock() {
    if (!onBlock) return;
    const outcome = await onBlock();
    setBlockConfirm(false);
    if (outcome === 'ok') setPhase('blocked');
    else if (outcome === 'offline') onError?.('You’re offline — blocking needs a connection.');
    else onError?.(`Couldn't block ${target?.name ?? 'this user'} right now. Please try again.`);
  }

  return (
    <>
      <PulledSheet visible={visible && !blockConfirm} onClose={onClose} title={reportHeader(target.type)}>
        {phase === 'filed' ? (
          // B2 — the calm ReportConfirm. Accent check seal (NOT gold celebration, NOT alert-red). MOD-02
          // soft-hide WITHOUT a threshold; NO promise of review speed (console is M7).
          <View style={styles.confirm}>
            <View style={styles.seal}>
              <Svg width={27} height={27} viewBox="0 0 24 24">
                <Path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={t.scr.accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={styles.cEyebrow}>THANKS — REPORT FILED</Text>
            <Text style={styles.cTitle}>WE’LL TAKE A LOOK</Text>
            <Text style={styles.cBody}>
              Our moderators review every report. While it’s reviewed this {targetNoun(target.type)} may be
              hidden — you don’t need to do anything else.
            </Text>
            <ScreenButton label="Done" variant="secondary" onPress={onClose} block />
          </View>
        ) : phase === 'blocked' ? (
          // C2 — the post-block confirm (SOC-09). Red ⊘ seal; severed · mutually invisible · silent.
          <View style={styles.confirm}>
            <View style={styles.seal}>
              <Svg width={27} height={27} viewBox="0 0 24 24">
                <Circle cx={12} cy={12} r={8.5} fill="none" stroke={t.brand.alert} strokeWidth={2.2} />
                <Path d="M6 18 L18 6" stroke={t.brand.alert} strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </View>
            <Text style={styles.cEyebrow}>BLOCKED</Text>
            <Text style={styles.cTitle}>YOU BLOCKED {target.name.toUpperCase()}</Text>
            <Text style={styles.cBody}>
              You won’t see each other on InGame and your friendship is removed. {target.name} isn’t
              notified. Manage blocked people anytime in Settings.
            </Text>
            <View style={styles.blockedActions}>
              {onManageBlocks ? (
                <Pressable accessibilityRole="link" onPress={onManageBlocks} hitSlop={6}>
                  <Text style={styles.manageLink}>MANAGE IN SETTINGS</Text>
                </Pressable>
              ) : null}
              <ScreenButton label="Done" variant="secondary" onPress={onClose} />
            </View>
          </View>
        ) : (
          <>
            {offlineGate ? <Offline message="OFFLINE — REPORTING NEEDS A CONNECTION" retrying /> : null}
            <View style={styles.reasonList}>
              {reasons.map((r) => {
                const selected = reason?.reason === r.reason;
                return (
                  <Pressable
                    key={r.reason}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={r.label}
                    onPress={() => setReason(r)}
                    style={[styles.reasonRow, selected && styles.reasonRowSel]}
                  >
                    <Text style={styles.reasonText}>
                      {r.label.toUpperCase()}
                      {selected && r.selectedSuffix ? ` ${r.selectedSuffix.toUpperCase()}` : ''}
                    </Text>
                    {selected ? <StateMark size={8} style={styles.reasonPip} /> : null}
                    {/* the details note discloses INLINE directly beneath its selected reason (board A2/C1) */}
                    {selected && r.requiresDetails ? (
                      <View style={styles.detailsWrap}>
                        <TextField
                          label={r.detailsLabel ?? 'Details — required for this reason'}
                          value={details}
                          onChangeText={setDetails}
                          placeholder="Moderators only — never shown to other players"
                          autoCapitalize="sentences"
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.hint}>
              {offlineGate
                ? 'Offline — your report sends the moment you’re back. Nothing to retry.'
                : (reason?.hint ?? 'Pick a reason to continue — submit unlocks once a reason is chosen.')}
            </Text>

            <View style={styles.commit}>
              <ScreenButton
                label={submitting ? 'Filing report…' : offlineGate ? 'Submit when online' : 'Submit report'}
                variant="destructive"
                onPress={() => void doSubmit()}
                disabled={!armed}
                block
              />
              <ScreenButton label="Cancel" variant="secondary" onPress={onClose} disabled={submitting} block />
            </View>

            {/* SOC-09 — user targets offer BLOCK past an OR divider: an outlined alert strip, NOT a keycap
                (no commit edge) and NOT a listed reason (blocking files nothing — it just severs). */}
            {target.type === 'user' && onBlock ? (
              <>
                <View style={styles.orDiv}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR — WITHOUT FILING A REPORT</Text>
                  <View style={styles.orLine} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Block ${target.name}`}
                  onPress={() => setBlockConfirm(true)}
                  style={styles.blockRow}
                >
                  <Svg width={14} height={14} viewBox="0 0 14 14">
                    <Circle cx={7} cy={7} r={5.4} fill="none" stroke={t.brand.alert} strokeWidth={1.8} />
                    <Path d="M3.2 10.8 L10.8 3.2" stroke={t.brand.alert} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                  <View style={styles.blockTx}>
                    <Text style={styles.blockTitle}>BLOCK {target.name.toUpperCase()}</Text>
                    <Text style={styles.blockSub}>INSTANT &amp; SILENT — THEY’RE NEVER NOTIFIED · MANAGED IN SETTINGS</Text>
                  </View>
                  <Text style={styles.blockChev}>›</Text>
                </Pressable>
              </>
            ) : null}
          </>
        )}
      </PulledSheet>

      {/* the block-alongside confirm (SOC-09 · decision 0040) — actor-confirmed before the sever. */}
      <ConfirmSheet
        visible={blockConfirm}
        title={`Block ${target.name}?`}
        message={`You won’t see each other on InGame and your friendship is removed. ${target.name} isn’t notified. You can unblock from Settings.`}
        confirmLabel="Block"
        busy={blocking}
        onConfirm={() => void doBlock()}
        onClose={() => setBlockConfirm(false)}
      />
    </>
  );
}

function targetNoun(type: ReportTargetType): string {
  return type === 'card' ? 'card' : type === 'game' ? 'entry' : 'profile';
}

const useStyles = themedStyles((t) => ({
  reasonList: { borderWidth: 1, borderColor: t.scr.hairline },
  reasonRow: {
    position: 'relative',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  // F-09 selection — a 1.5px orange border (the StateMark corner rides top-right).
  reasonRowSel: { borderWidth: 1.5, borderColor: t.scr.accent },
  reasonText: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.ink,
    letterSpacing: 0.5,
  },
  reasonPip: { position: 'absolute', top: 4, right: 4 },
  detailsWrap: { marginTop: t.space.md },
  hint: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 0.5,
    lineHeight: 14,
    marginTop: t.space.md,
  },
  commit: { flexDirection: 'row', gap: t.space.md, marginTop: t.space.lg },
  // ── the OR divider + BLOCK strip (SOC-09) ──
  orDiv: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginTop: t.space.lg, marginBottom: t.space.md },
  orLine: { flex: 1, height: 1, backgroundColor: t.scr.hairline },
  orText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderWidth: 1,
    borderColor: t.brand.alert,
    backgroundColor: 'rgba(227,65,78,0.06)',
  },
  blockTx: { flex: 1, gap: 2 },
  blockTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.alert, letterSpacing: 0.5 },
  blockSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 13 },
  blockChev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.alert },
  // ── the confirm beats (B2 / C2) ──
  confirm: { alignItems: 'center', gap: t.space.sm, paddingVertical: t.space.md },
  seal: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    marginBottom: t.space.sm,
  },
  cEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  cTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1, textAlign: 'center' },
  cBody: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16, textAlign: 'center', maxWidth: 290 },
  blockedActions: { flexDirection: 'row', alignItems: 'center', gap: t.space.xl, marginTop: t.space.md },
  manageLink: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
}));
