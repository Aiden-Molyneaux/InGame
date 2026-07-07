import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { IntensitySlider } from '../styler/IntensitySlider';
import { elementLabel } from '../../canvas/ops';
import type { CardElement } from '../../render/composition';

// EditSlipSheet (board P4 — §1.5 prose "the EDIT slip-sheet"; code name PROVISIONAL, the SaveBar
// precedent) — the pulled slip's second drawer: OPACITY (the catalog slider, CARD-10) · FILL +
// SOLID/GRADIENT · STROKE · GLOW · BLEND · FLIP/RADIUS/DUP/DELETE; text slips add FONT · CURVE
// (ARC, CARD-11) · the content itself. NO scrim-dim on the work — the bed stays lit above the
// sheet (the Styler's no-scrim lesson, PulledSheet dimScrim=false). The eyedropper interim: the
// swatch row carries the colours already in this card (canvas-manifest ADDENDUM, CARD-11 at-scale).

const PALETTE = ['#f3ecd9', '#e8c14a', '#e85ad0', '#7ad0e8', '#a8c980', '#ff9f43', '#14121f', '#ffffff'];
const RADII = [0, 0.18, 0.35];

export function EditSlipSheet({
  visible,
  onClose,
  element,
  index,
  usedColors,
  atCap,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  element: CardElement | undefined;
  index: number;
  usedColors: string[];
  atCap: boolean;
  onPatch: (patch: Partial<CardElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  if (!element) return null;
  const e = element;
  const swatches = [...PALETTE, ...usedColors.filter((c) => !PALETTE.includes(c))].slice(0, 12);
  const isText = e.type === 'text';
  const kindMeta = isText ? 'TEXT · SLIP' : e.type === 'icon' ? 'ICON · SLIP' : 'VECTOR · SHAPE';

  return (
    <PulledSheet visible={visible} onClose={onClose} dimScrim={false} title={`The ${elementLabel(e, index).toLowerCase()} slip`}>
      <Text style={styles.meta}>{kindMeta} · ISOLATION ON</Text>

      <IntensitySlider
        label="OPACITY"
        accessibilityLabel="Slip opacity"
        value={e.opacity ?? 1}
        onChange={(v) => onPatch({ opacity: v >= 0.995 ? undefined : v })}
      />

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
              placeholderTextColor={theme.scr.faint}
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

      <Row label="FILL">
        <View style={styles.swatches}>
          {swatches.map((c) => (
            <Swatch key={c} color={c} selected={e.fill === c} onPress={() => onPatch({ fill: c })} label={`Fill ${c}`} />
          ))}
        </View>
      </Row>
      {!isText ? (
        <Row label="STYLE">
          <Tog label="SOLID" on={!e.fill2} onPress={() => onPatch({ fill2: undefined })} />
          <Tog label="GRADIENT" on={!!e.fill2} onPress={() => onPatch({ fill2: e.fill2 ?? '#14121f' })} />
        </Row>
      ) : null}
      {!isText && e.fill2 ? (
        <Row label="STOP 2">
          <View style={styles.swatches}>
            {swatches.map((c) => (
              <Swatch key={c} color={c} selected={e.fill2 === c} onPress={() => onPatch({ fill2: c })} label={`Gradient stop ${c}`} />
            ))}
          </View>
        </Row>
      ) : null}

      {!isText ? (
        <>
          <Row label="STROKE">
            <Tog label="NONE" on={!e.stroke} onPress={() => onPatch({ stroke: undefined })} />
            <Tog label="THIN" on={e.stroke?.width === 0.01} onPress={() => onPatch({ stroke: { color: e.stroke?.color ?? '#f3ecd9', width: 0.01 } })} />
            <Tog label="THICK" on={e.stroke?.width === 0.022} onPress={() => onPatch({ stroke: { color: e.stroke?.color ?? '#f3ecd9', width: 0.022 } })} />
          </Row>
          {e.stroke ? (
            <Row label="STROKE INK">
              <View style={styles.swatches}>
                {swatches.map((c) => (
                  <Swatch key={c} color={c} selected={e.stroke?.color === c} onPress={() => onPatch({ stroke: { color: c, width: e.stroke!.width } })} label={`Stroke ${c}`} />
                ))}
              </View>
            </Row>
          ) : null}
        </>
      ) : null}

      <Row label="LIGHT">
        {!isText ? (
          <>
            {/* the renderer draws no text glow yet — offering the toggle there persisted a no-op (murr) */}
            <Text style={styles.subLabel}>GLOW</Text>
            <Tog label={e.glow ? 'ON' : 'OFF'} on={!!e.glow} onPress={() => onPatch({ glow: e.glow ? undefined : true })} />
          </>
        ) : null}
        <Text style={styles.subLabel}>BLEND</Text>
        <Tog label="NORMAL" on={!e.blend} onPress={() => onPatch({ blend: undefined })} />
        <Tog label="SCREEN" on={e.blend === 'screen'} onPress={() => onPatch({ blend: 'screen' })} />
        <Tog label="MULTIPLY" on={e.blend === 'multiply'} onPress={() => onPatch({ blend: 'multiply' })} />
      </Row>

      <Row label="MORE">
        {!isText ? (
          <>
            <Tog label="FLIP ↔" on={!!e.flipH} onPress={() => onPatch({ flipH: e.flipH ? undefined : true })} />
            <Tog label="FLIP ↕" on={!!e.flipV} onPress={() => onPatch({ flipV: e.flipV ? undefined : true })} />
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
    </PulledSheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

function Tog({
  label,
  on,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tog, on && styles.togOn, disabled && styles.togDisabled]}
    >
      <Text style={[styles.togText, danger && styles.togDanger]}>{label}</Text>
    </Pressable>
  );
}

function Swatch({ color, selected, onPress, label }: { color: string; selected: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSel]}
    >
      {selected ? <View style={styles.swPip} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  meta: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  label: { width: 66, fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  rowBody: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space.sm + 1 },
  subLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5, marginLeft: theme.space.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm + 1 },
  swatch: { width: 22, height: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  swatchSel: { borderWidth: 1.5, borderColor: theme.scr.accent },
  swPip: { position: 'absolute', top: -2.5, right: -2.5, width: 6, height: 6, backgroundColor: theme.scr.accent },
  tog: {
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 1,
  },
  togOn: { borderWidth: 1.5, borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  togDisabled: { opacity: 0.4 },
  togText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, letterSpacing: 0.5 },
  togDanger: { color: theme.brand.alert },
  textInput: {
    flex: 1,
    fontFamily: theme.font.screen,
    fontSize: theme.type.body,
    color: theme.scr.ink,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 2,
  },
});
