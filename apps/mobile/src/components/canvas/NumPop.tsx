import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import type { CardElement } from '../../render/composition';

// NumPop (component-map §8b / board P5) — the numeric transform popover (CARD-09 "nudge + numeric"):
// X · Y · W · H (SIZE for text) · ROT, each a live readout in BED PIXELS (degrees for ROT) with
// − / + nudge keys and tap-to-type. This is the built-alongside non-gesture pair for drag / scale /
// rotate (CARD-16 — the manifest's pairs table).

export type NumPopField = 'x' | 'y' | 'w' | 'h' | 'rot';

export function NumPop({
  element,
  bedW,
  bedH,
  onNudge,
  onSet,
  onClose,
}: {
  element: CardElement;
  bedW: number;
  bedH: number;
  /** delta in the field's display unit (px / degrees) */
  onNudge: (field: NumPopField, delta: number) => void;
  /** absolute value in the field's display unit */
  onSet: (field: NumPopField, value: number) => void;
  onClose: () => void;
}) {
  const isText = element.type === 'text';
  const rows: Array<{ field: NumPopField; label: string; value: number; step: number }> = [
    { field: 'x', label: 'X', value: Math.round(element.x * bedW), step: 1 },
    { field: 'y', label: 'Y', value: Math.round(element.y * bedH), step: 1 },
    ...(isText
      ? [{ field: 'h' as const, label: 'SIZE', value: Math.round(element.size * bedH), step: 1 }]
      : [
          { field: 'w' as const, label: 'W', value: Math.round(element.w * bedW), step: 1 },
          { field: 'h' as const, label: 'H', value: Math.round(element.h * bedH), step: 1 },
        ]),
    { field: 'rot', label: 'ROT', value: Math.round(element.rotation ?? 0), step: 1 },
  ];
  return (
    <View style={styles.pop} accessibilityLabel="Numeric position and size">
      {rows.map((r) => (
        <Row key={r.field} {...r} onNudge={onNudge} onSet={onSet} />
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Close numeric popover" onPress={onClose} style={styles.close} hitSlop={6}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

function Row({
  field,
  label,
  value,
  step,
  onNudge,
  onSet,
}: {
  field: NumPopField;
  label: string;
  value: number;
  step: number;
  onNudge: (field: NumPopField, delta: number) => void;
  onSet: (field: NumPopField, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) onSet(field, n);
    setEditing(false);
  };
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} minus`}
        onPress={() => onNudge(field, -step)}
        style={styles.nudge}
        hitSlop={4}
      >
        <Text style={styles.nudgeText}>−</Text>
      </Pressable>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="numeric"
          autoFocus
          style={styles.v}
          accessibilityLabel={`${label} value`}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${value} — tap to type`}
          onPress={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          style={styles.vWrap}
        >
          <Text style={styles.vText}>{value}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} plus`}
        onPress={() => onNudge(field, step)}
        style={styles.nudge}
        hitSlop={4}
      >
        <Text style={styles.nudgeText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pop: {
    position: 'absolute',
    right: theme.space.md,
    top: theme.space.md,
    zIndex: 8,
    gap: theme.space.sm,
    padding: theme.space.md,
    backgroundColor: theme.scr.bg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  k: { width: 28, fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  nudge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scr.panelHi,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  nudgeText: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink, lineHeight: 13 },
  vWrap: {
    minWidth: 44,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  vText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, textAlign: 'right' },
  v: {
    minWidth: 44,
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.ink,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: theme.scr.accent,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  close: { position: 'absolute', top: 2, left: 2 },
  closeText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.faint },
});
