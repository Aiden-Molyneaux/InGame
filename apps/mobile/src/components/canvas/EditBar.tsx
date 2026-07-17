import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { ToolButton } from '../ToolButton';

// EditBar (component-map §8b / board change-1) — RESET SLIP + the TRANSFORM key + undo/redo, docked
// above the panel for thumb reach (CARD-09). Round 5: the bar is PERSISTENT across bench/EDIT/
// TRANSFORM (rendered by CanvasSurface above every panel mode) so undo/redo are reachable from the
// menus and the TRANSFORM key never moves; the ↺/↻ keys drop their text labels and TRANSFORM sits
// BESIDE them at the same key height (owner round 5). Dim when there's nothing to act on. History
// is the SESSION's one stack (styler picks + canvas ops — one document, one history).

export function EditBar({
  canUndo,
  canRedo,
  canReset,
  canTransform,
  transformActive = false,
  onUndo,
  onRedo,
  onReset,
  onTransform,
}: {
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  /** CR-10 — TRANSFORM opens the precision drawer; enabled when an editable slip is pulled */
  canTransform: boolean;
  /** the TRANSFORM panel is open — the key reads pressed (it IS the current mode) */
  transformActive?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onTransform: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset this slip"
        accessibilityState={{ disabled: !canReset }}
        disabled={!canReset}
        onPress={onReset}
        hitSlop={6}
      >
        <Text style={[styles.reset, !canReset && styles.dim]}>RESET SLIP</Text>
      </Pressable>
      <View style={styles.spacer} />
      {/* the cream key cluster — TRANSFORM beside the unlabelled ↺/↻, one height (round 5). Decision
          0069: TRANSFORM is the cream ScreenButton/secondary·mini (active = drawer open); the icon-only
          undo/redo are catalog ToolButtons. */}
      <ScreenButton
        label="TRANSFORM"
        variant="secondary"
        size="mini"
        active={transformActive}
        disabled={!canTransform}
        onPress={onTransform}
        accessibilityLabel="Transform this slip"
      />
      <ToolButton icon={<Text style={styles.glyph}>↺</Text>} label="Undo" disabled={!canUndo} onPress={onUndo} />
      <ToolButton icon={<Text style={styles.glyph}>↻</Text>} label="Redo" disabled={!canRedo} onPress={onRedo} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm },
  reset: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  spacer: { flex: 1 },
  glyph: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.navy }, // undo/redo cap glyph — navy on cream
  dim: { opacity: 0.4 },
}));
