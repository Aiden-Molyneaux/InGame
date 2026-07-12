import { Pressable, Text, View } from 'react-native';
import type { LooksResponse, LookResponse } from '@ingame/shared';
import { SavedLook } from './SavedLook';
import { isOnNow, type LookFacets } from './looksOnNow';
import { themedStyles } from '../../theme';

// LooksGrid (component-map §11 · D6) — the 3-column saved-looks grid: a SavedLook per stored combo plus
// the trailing SAVE CURRENT save-tile. ON NOW is computed per tile (facets vs the live device). The
// save-tile snapshots the live combo; it dims + goes inert at the cap (12), while saving, or while
// offline (SAVE CURRENT waits for the network — SYS-10). The empty state is the save-tile alone.
export function LooksGrid({
  looks,
  liveFacets,
  onApply,
  onDelete,
  onSaveCurrent,
  saveDisabled,
}: {
  looks: LooksResponse;
  liveFacets: LookFacets;
  onApply: (look: LookResponse) => void;
  onDelete: (look: LookResponse) => void;
  onSaveCurrent: () => void;
  /** dimmed + inert when at the cap, mid-save, or offline. */
  saveDisabled: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {looks.map((look) => (
        <View key={look.id} style={styles.cell}>
          <SavedLook
            look={look}
            onNow={isOnNow(look, liveFacets)}
            onApply={() => onApply(look)}
            onDelete={() => onDelete(look)}
          />
        </View>
      ))}
      <View style={styles.cell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save current look"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          onPress={onSaveCurrent}
          style={({ pressed }) => [styles.saveTile, saveDisabled && styles.saveDim, pressed && styles.pressed]}
        >
          <View style={styles.saveBox}>
            <Text style={styles.savePlus}>+</Text>
            <Text style={styles.saveLabel}>SAVE{'\n'}CURRENT</Text>
          </View>
          <Text style={styles.saveNew}>NEW</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md, paddingTop: t.space.sm },
  cell: { width: '30%' },
  pressed: { opacity: 0.82 },
  saveTile: {
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.sm,
    borderRadius: t.corner.screen, // F-07 square
  },
  saveDim: { opacity: 0.4 },
  saveBox: {
    width: 42,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.xs,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: t.scr.hairline,
    borderRadius: 7,
  },
  savePlus: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15 (F-06)
    color: t.scr.dim,
    lineHeight: 16,
  },
  saveLabel: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 11,
  },
  saveNew: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.faint,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
}));
