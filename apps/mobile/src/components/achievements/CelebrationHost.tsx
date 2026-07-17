import { StyleSheet, View } from 'react-native';
import { CelebrationMoment } from './CelebrationMoment';
import { useUnlockCelebration } from './useUnlockCelebration';

// CelebrationHost (ACH-06 in-app half) — the root mount for the unlock celebration. It runs the
// refetch-delta detector (useUnlockCelebration) and, when a NEW unlock lands, overlays the
// CelebrationMoment across the screen area (an absolute-fill sibling of the routed Stack inside the
// DeviceShell screen slot — so the takeover fills the screen, the NavBand stays below). Renders NULL
// when nothing is pending (the common case) — zero cost + no tap capture. Mounted at the app root so an
// unlock celebrates app-wide, not only on the Achievements screen (ACH-06: an unlock fires an in-app
// moment regardless of where you are).
export function CelebrationHost() {
  const { pending, dismiss } = useUnlockCelebration();
  if (!pending) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <CelebrationMoment achievement={pending} onContinue={dismiss} />
    </View>
  );
}
