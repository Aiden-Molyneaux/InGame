import { AccessibilityInfo } from 'react-native';

// announce (CARD-16 · decision 0044 §105 live-region) — push a message to the screen reader for an
// async RESULT the user can't see happen (a save failing, going offline, a cap being hit, an inline
// error appearing). Cross-platform (`announceForAccessibility` works on both VoiceOver + TalkBack),
// unlike `accessibilityLiveRegion` which is Android-only. Use for TRANSITIONS, never per-frame — a
// value that changes continuously (a drag readout) belongs on an `accessibilityValue`/adjustable
// control, not here, or it floods the SR queue.
export function announce(message: string | null | undefined): void {
  if (!message) return;
  AccessibilityInfo.announceForAccessibility(message);
}

// useAnnounceOnChange — announce a status string whenever it TRANSITIONS to a new non-null value
// (the save-line settling to "NOT SAVED — RETRYING", the offline strip appearing). Skips the first
// mount + repeats. Persistent status Text should ALSO carry `accessibilityLiveRegion="polite"` for
// TalkBack; this is the iOS/VoiceOver half + the explicit transition signal.
import { useEffect, useRef } from 'react';
export function useAnnounceOnChange(message: string | null | undefined, enabled = true): void {
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    if (prev.current !== undefined && message && message !== prev.current) announce(message);
    prev.current = message;
  }, [message, enabled]);
}
