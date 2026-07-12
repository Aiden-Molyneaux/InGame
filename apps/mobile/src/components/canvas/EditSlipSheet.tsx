import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme, themedStyles } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { ColorField } from '../ColorPicker';
import { IntensitySlider } from '../styler/IntensitySlider';
import { ScrollLockContext, useScrollLockHost } from '../ScrollLock';
import { elementLabel } from '../../canvas/ops';
import type { CardComposition, CardElement } from '../../render/composition';

// EditSlipSheet (board P4 — §1.5 prose "the EDIT slip-sheet") — the pulled slip's second drawer:
// OPACITY · FILL · SOLID/GRADIENT · STROKE · GLOW · BLEND · FLIP/RADIUS/DUP/DELETE; text slips add
// FONT · CURVE · content. NO scrim-dim on the work and CAPPED so it opens only to the bottom of the
// card (the gamecard stays visible above it — owner gate-5). Colours pick through the shared
// `ColorField`: the picker is CLOSED by default, showing the last-10 recents + an OPEN-PICKER button +
// a FROM-CARD grab (CR-11 gate-5). The BASE is a non-deletable slip whose EDIT is colour-only (CR-08
// gate-5): `baseMode` renders just its colour control.

const RADII = [0, 0.18, 0.35];

export function EditSlipSheet({
  visible,
  onClose,
  element,
  index,
  recents,
  cardColors,
  onColorCommit,
  atCap,
  onPatch,
  onBeginGesture,
  onDuplicate,
  onDelete,
  baseMode,
  showHandles,
  onToggleHandles,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  element: CardElement | undefined;
  index: number;
  /** last-10 used colours (most-recent-first) + every colour on the card, for the ColorField */
  recents: string[];
  cardColors: string[];
  onColorCommit: (hex: string) => void;
  atCap: boolean;
  /** opts.history:false = a continuous-gesture frame (the caller pushed its one entry via onBeginGesture) */
  onPatch: (patch: Partial<CardElement>, opts?: { history?: boolean }) => void;
  /** push ONE history entry for a coming continuous run (the OPACITY drag — murr round 4 F2) */
  onBeginGesture?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** when set, the sheet edits the BASE (colour only — non-deletable slip, CR-08) instead of an element */
  baseMode?: { base: CardComposition['base']; onBase: (base: CardComposition['base']) => void } | null;
  /** the RESIZE BOX toggle rides here too (round 3) — same state the TransformDrawer drives */
  showHandles?: boolean;
  onToggleHandles?: () => void;
  /** render inline in the CanvasSurface bottom panel (no PulledSheet/scrim/handle/title) */
  inline?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  // a held slider/picker must not pan this panel (the round-3 scroll-lock rule)
  const { scrollEnabled, api: scrollLockApi } = useScrollLockHost();
  // In inline mode CanvasSurface renders the panel header + close; here we render only the inner
  // controls in a plain ScrollView. Otherwise keep the PulledSheet drawer (nothing else changes).
  const wrap = (title: string, children: ReactNode) =>
    inline ? (
      <ScrollView style={styles.inlineScroll} contentContainerStyle={styles.inlineBody} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
        <ScrollLockContext.Provider value={scrollLockApi}>{children}</ScrollLockContext.Provider>
      </ScrollView>
    ) : (
      <PulledSheet visible={visible} onClose={onClose} dimScrim={false} maxFraction={0.5} title={title}>
        {children}
      </PulledSheet>
    );

  // ── BASE mode: a non-deletable slip, colour-only (CR-08 gate-5) ────────────────────────────────
  if (baseMode) {
    const b = baseMode.base;
    const isGrad = 'gradient' in b;
    const g0 = isGrad ? b.gradient[0] : b.fill;
    const g1 = isGrad ? b.gradient[1] : '#0e0b1e';
    const setGrad = (i: 0 | 1, c: string) =>
      baseMode.onBase({ gradient: [i === 0 ? c : g0, i === 1 ? c : g1] });
    return wrap(
      "Editing the 'Base' slip",
      <>
        <Text style={styles.meta}>BASE · COLOUR ONLY</Text>
        <Row label="STYLE">
          <Tog label="SOLID" on={!isGrad} onPress={() => baseMode.onBase({ fill: g0 })} />
          <Tog label="GRADIENT" on={isGrad} onPress={() => baseMode.onBase({ gradient: [g0, g1] })} />
        </Row>
        {isGrad ? (
          <>
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>TOP</Text>
              <ColorField value={g0} onChange={(c) => setGrad(0, c)} onCommit={onColorCommit} recents={recents} cardColors={cardColors} />
            </View>
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>BOTTOM</Text>
              <ColorField value={g1} onChange={(c) => setGrad(1, c)} onCommit={onColorCommit} recents={recents} cardColors={cardColors} />
            </View>
          </>
        ) : (
          <View style={styles.pickerBlock}>
            <Text style={styles.pickerLabel}>FILL</Text>
            <ColorField value={g0} onChange={(c) => baseMode.onBase({ fill: c })} onCommit={onColorCommit} recents={recents} cardColors={cardColors} />
          </View>
        )}
      </>,
    );
  }

  if (!element) return null;
  const e = element;
  const isText = e.type === 'text';

  // round 4 — the kind meta-line ("VECTOR · SHAPE"/"TEXT · SLIP") is dropped; OPACITY moved under
  // the FILL cluster (fill → style/stop-2 → opacity → stroke)
  return wrap(
    `Editing the '${elementLabel(e, index)}' slip`,
    <>
      {isText ? (
        <>
          <Row label="TEXT">
            <TextInput
              value={e.text}
              onChangeText={(t) => onPatch({ text: t.slice(0, 64) })}
              maxLength={64}
              style={styles.textInput}
              accessibilityLabel="Slip text"
              placeholder="Text"
              placeholderTextColor={t.scr.faint}
            />
          </Row>
          <Row label="FONT">
            <Tog label="CHAKRA" on={(e.fontId ?? 'clean-sans') === 'clean-sans'} onPress={() => onPatch({ fontId: 'clean-sans' })} />
            <Tog label="PAYTONE" on={e.fontId === 'bold-display'} onPress={() => onPatch({ fontId: 'bold-display' })} />
            <Text style={styles.subLabel}>CURVE</Text>
            <Tog label="NONE" on={!e.arc} onPress={() => onPatch({ arc: undefined })} />
            <Tog label="ARC ◝" on={!!e.arc} onPress={() => onPatch({ arc: 60 })} />
          </Row>
        </>
      ) : null}

      <View style={styles.pickerBlock}>
        <Text style={styles.pickerLabel}>FILL</Text>
        <ColorField value={e.fill} onChange={(c) => onPatch({ fill: c })} onCommit={onColorCommit} recents={recents} cardColors={cardColors} />
      </View>
      {!isText ? (
        <Row label="STYLE">
          <Tog label="SOLID" on={!e.fill2} onPress={() => onPatch({ fill2: undefined })} />
          <Tog label="GRADIENT" on={!!e.fill2} onPress={() => onPatch({ fill2: e.fill2 ?? '#14121f' })} />
        </Row>
      ) : null}
      {!isText && e.fill2 ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.pickerLabel}>STOP 2</Text>
          <ColorField value={e.fill2} onChange={(c) => onPatch({ fill2: c })} onCommit={onColorCommit} recents={recents} cardColors={cardColors} />
        </View>
      ) : null}

      <IntensitySlider
        label="OPACITY"
        accessibilityLabel="Slip opacity"
        value={e.opacity ?? 1}
        onBegin={onBeginGesture}
        onChange={(v) => onPatch({ opacity: v >= 0.995 ? undefined : v }, { history: false })}
      />

      {!isText ? (
        <>
          <Row label="STROKE">
            <Tog label="NONE" on={!e.stroke} onPress={() => onPatch({ stroke: undefined })} />
            <Tog label="THIN" on={e.stroke?.width === 0.01} onPress={() => onPatch({ stroke: { color: e.stroke?.color ?? '#f3ecd9', width: 0.01 } })} />
            <Tog label="THICK" on={e.stroke?.width === 0.022} onPress={() => onPatch({ stroke: { color: e.stroke?.color ?? '#f3ecd9', width: 0.022 } })} />
          </Row>
          {e.stroke ? (
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>STROKE INK</Text>
              <ColorField
                value={e.stroke.color}
                onChange={(c) => onPatch({ stroke: { color: c, width: e.stroke!.width } })}
                onCommit={onColorCommit}
                recents={recents}
                cardColors={cardColors}
              />
            </View>
          ) : null}
        </>
      ) : null}

      {/* round 3 — the LIGHT umbrella row was opaque; GLOW and BLEND are their own labeled rows */}
      {!isText ? (
        <Row label="GLOW">
          <Tog label="OFF" on={!e.glow} onPress={() => onPatch({ glow: undefined })} />
          <Tog label="ON" on={!!e.glow} onPress={() => onPatch({ glow: true })} />
        </Row>
      ) : null}
      <Row label="BLEND">
        <Tog label="NORMAL" on={!e.blend} onPress={() => onPatch({ blend: undefined })} />
        <Tog label="SCREEN" on={e.blend === 'screen'} onPress={() => onPatch({ blend: 'screen' })} />
        <Tog label="MULTIPLY" on={e.blend === 'multiply'} onPress={() => onPatch({ blend: 'multiply' })} />
      </Row>

      {/* round 3 — the RESIZE BOX toggle rides the EDIT sheet too (the same state as TRANSFORM's;
          ON/OFF vocabulary). Round 5: MORE moves UNDER it (last). */}
      {onToggleHandles ? (
        <Row label="RESIZE BOX">
          <Tog label={showHandles ? 'ON' : 'OFF'} on={!!showHandles} onPress={onToggleHandles} />
        </Row>
      ) : null}

      <Row label="MORE">
        {!isText ? (
          <>
            <Tog label="FLIP" glyph={<FlipGlyph axis="h" />} on={!!e.flipH} onPress={() => onPatch({ flipH: e.flipH ? undefined : true })} />
            <Tog label="FLIP" glyph={<FlipGlyph axis="v" />} on={!!e.flipV} onPress={() => onPatch({ flipV: e.flipV ? undefined : true })} />
          </>
        ) : null}
        {e.type === 'rect' ? (
          <Tog
            label={`RADIUS ${Math.round((e.radius ?? 0) * 100)}`}
            on={(e.radius ?? 0) > 0}
            onPress={() => {
              const cur = RADII.indexOf(e.radius ?? 0);
              const next = RADII[(cur + 1) % RADII.length]!;
              onPatch({ radius: next === 0 ? undefined : next });
            }}
          />
        ) : null}
        <Tog label="DUP" on={false} disabled={atCap} onPress={onDuplicate} />
        <Tog label="DELETE" danger on={false} onPress={onDelete} />
      </Row>
    </>,
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

function Tog({
  label,
  glyph,
  on,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  /** Optional drawn glyph rendered before the label (no emoji — CR-14/gate-5). */
  glyph?: ReactNode;
  on: boolean;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tog, glyph ? styles.togGlyphed : null, on && styles.togOn, danger && styles.togDangerBox, disabled && styles.togDisabled]}
    >
      {glyph ?? null}
      <Text style={[styles.togText, danger && styles.togDanger]}>{label}</Text>
    </Pressable>
  );
}

// FLIP glyph (CR-14 gate-5) — two small mirrored triangles drawn with Views, guaranteed no emoji.
// axis 'h' = a horizontal pair (◀ ▶) for FLIP-H; axis 'v' = a vertical pair (▲ ▼) for FLIP-V.
function FlipGlyph({ axis }: { axis: 'h' | 'v' }) {
  const styles = useStyles();
  return (
    <View style={axis === 'h' ? styles.flipRow : styles.flipCol} pointerEvents="none">
      <View style={axis === 'h' ? styles.triLeft : styles.triUp} />
      <View style={axis === 'h' ? styles.triRight : styles.triDown} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  inlineScroll: { flexGrow: 0 },
  inlineBody: { gap: t.space.md, paddingBottom: t.space.md },
  meta: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  label: { width: 66, fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  rowBody: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space.sm + 1 },
  subLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5, marginLeft: t.space.sm },
  pickerBlock: { gap: t.space.sm },
  pickerLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  tog: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm + 1,
  },
  togGlyphed: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  togOn: { borderWidth: 1.5, borderColor: t.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  togDisabled: { opacity: 0.4 },
  // decision 0069 — destructive = alert FILL (not red text on grey); ink flips to cream.
  togDangerBox: { backgroundColor: t.brand.alert, borderColor: t.brand.alert },
  togText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  togDanger: { color: t.brand.cream },
  // FLIP glyph — two mirrored CSS-border triangles (ink), a small gap between them.
  flipRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flipCol: { flexDirection: 'column', alignItems: 'center', gap: 2 },
  triLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: t.scr.ink,
  },
  triRight: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: t.scr.ink,
  },
  triUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: t.scr.ink,
  },
  triDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: t.scr.ink,
  },
  textInput: {
    flex: 1,
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.scr.ink,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm + 2,
  },
}));
