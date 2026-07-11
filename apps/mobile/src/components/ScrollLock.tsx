import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// ScrollLock (design-spec 0.54 round 3 — the app control rule) — a touch-held control (slider ·
// colour area · hue strip) must LOCK its host scroll for the gesture's duration: without it the
// page pans under an active drag and the control fights the scroll (owner note, 2026-07-09).
// Not a UI component: a context pair —
//   useScrollLockHost()   → { scrollEnabled, lockProps } for the HOST ScrollView + the provider value
//   useScrollLock()       → { lock, unlock } for the held CONTROL (PanResponder grant/release)
// The default context is a no-op, so a control outside any host (e.g. a fixed column) needs nothing.
// Locks are counted (two nested controls can't unlock each other's gesture early).

type ScrollLockApi = { lock: () => void; unlock: () => void };

export const ScrollLockContext = createContext<ScrollLockApi>({ lock: () => {}, unlock: () => {} });

export function useScrollLock(): ScrollLockApi {
  return useContext(ScrollLockContext);
}

/** Host side — spread `scrollEnabled` onto the ScrollView and wrap children in the provider. */
export function useScrollLockHost(): { scrollEnabled: boolean; api: ScrollLockApi } {
  const [locked, setLocked] = useState(false);
  const count = useRef(0);
  const lock = useCallback(() => {
    count.current += 1;
    setLocked(true);
  }, []);
  const unlock = useCallback(() => {
    count.current = Math.max(0, count.current - 1);
    if (count.current === 0) setLocked(false);
  }, []);
  const api = useMemo(() => ({ lock, unlock }), [lock, unlock]);
  return { scrollEnabled: !locked, api };
}
