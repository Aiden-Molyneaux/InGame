import { BadgeTile } from './BadgeTile';

// MysterySlot (component-map §13 · design-spec §1.5 · OQ-005 pole A) — the locked-secret `???` tile:
// a dim-magenta lock that HINTS something exists without spoiling it. A thin composition over BadgeTile
// (state='mystery', tier='secret'). Tapping it opens the SEALED D3 sheet (no name/criterion/reward).
export function MysterySlot({ onPress }: { onPress?: () => void }) {
  return (
    <BadgeTile
      glyphKey={undefined}
      label="? ? ?"
      tier="secret"
      state="mystery"
      onPress={onPress}
      accessibilityLabel="Locked secret achievement"
    />
  );
}
