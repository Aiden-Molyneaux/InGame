import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// SheetLock (M5 F-13 C2, owner round-2) — while ANY PulledSheet (the house drawer) is open, the screen
// BEHIND it must not scroll. A PulledSheet can't reach the parent screen's ScrollView (it's mounted as a
// sibling — sometimes even inside a scroll), so a ROOT-level counter is the reliable, mount-location-
// independent lock: PulledSheet holds the lock while it's visible; a screen's background ScrollView reads
// `useSheetLocked()` and passes `scrollEnabled={!locked}`. The SHEET's OWN internal ScrollView never
// reads this hook, so it keeps scrolling — only the background freezes (the ruling's "don't break the
// sheet's own scroll"). Counted, so two stacked sheets both have to close before the background thaws.

interface SheetLockApi {
  acquire: () => void;
  release: () => void;
}

const SheetLockCountContext = createContext<SheetLockApi>({ acquire: () => {}, release: () => {} });
const SheetLockedContext = createContext<boolean>(false);

export function SheetLockProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const api = useMemo<SheetLockApi>(
    () => ({
      acquire: () => setCount((n) => n + 1),
      release: () => setCount((n) => Math.max(0, n - 1)),
    }),
    [],
  );
  return (
    <SheetLockCountContext.Provider value={api}>
      <SheetLockedContext.Provider value={count > 0}>{children}</SheetLockedContext.Provider>
    </SheetLockCountContext.Provider>
  );
}

/** PulledSheet-side — hold the lock for as long as `active` (the sheet is visible). */
export function useHoldSheetLock(active: boolean): void {
  const { acquire, release } = useContext(SheetLockCountContext);
  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}

/** Screen-side — true while ANY sheet is open; feed a background ScrollView's `scrollEnabled`. */
export function useSheetLocked(): boolean {
  return useContext(SheetLockedContext);
}
