import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// The entitlement-state tags (component-map §7): OwnedTag · LockedTag · EarnedOnlyTag. COSM-04 rule:
// the earned tag is gold-OUTLINE, never gold-FILL, so it can't read as a price. Owned = cream (the
// price is gone). Locked = a date/condition, never a price (the drop-window hook, ECON-08).

/** ✓ OWNED — cream chip; the price never returns (COSM-03). */
export function OwnedTag({ label = '✓ OWNED' }: { label?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.owned} accessibilityRole="text" accessibilityLabel="Owned">
      <Text style={styles.ownedText}>{label}</Text>
    </View>
  );
}

/** A drop-window lock — a condition/date, never a price (ECON-08). */
export function LockedTag({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.locked} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.lockedText}>🔒 {label}</Text>
    </View>
  );
}

/** 🏆 EARNED ONLY — gold-OUTLINE (never filled — COSM-04, so it can't read as a price). */
export function EarnedOnlyTag({ label = '🏆 EARNED ONLY' }: { label?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.earned} accessibilityRole="text" accessibilityLabel="Earned only">
      <Text style={styles.earnedText}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  owned: { backgroundColor: t.brand.cream, paddingHorizontal: 5, paddingVertical: 2.5 },
  ownedText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.navy,
    letterSpacing: 0.5,
  },
  locked: {
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  lockedText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
  // COSM-04 — gold OUTLINE, never fill.
  earned: {
    borderWidth: 1,
    borderColor: t.brand.gold,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  earnedText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.gold,
    letterSpacing: 1,
  },
}));
