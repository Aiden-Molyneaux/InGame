import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StickerTransform } from './stickerGeometry';

// DeviceStickerContext (device-manifest ARCH 2) — the thin bridge that lets the /device editor drive
// the INTERACTIVE sticker layer that lives on the ROOT DeviceShell's plastic bands (the editor screen
// renders INSIDE the glass; the forehead top-band + chin nav-band are the shell's own chrome, ABOVE
// the routed screen in the tree). The passive app-wide layer needs nothing from here — it reads the
// persisted composition straight from redux and paints on every screen. Only the editor's live
// selection + transform callbacks flow through this context (published by device.tsx while the
// STICKERS section is active, cleared otherwise). Nothing about the composition MOVES through here —
// the composition is redux truth; this carries the edit affordances only.

/** The active editing session — non-null only while the /device STICKERS section is open. */
export interface StickerEditSession {
  /** the currently-selected placement id (its TransformBox shows on the shell). */
  selectedId: string | null;
  /** select a placement (or null to deselect). */
  select: (id: string | null) => void;
  /** apply a transform patch to a placement — the callee clamps (fitTransform), updates the optimistic
   *  composition, and schedules the debounced PATCH (ARCH 3 one pipeline). */
  mutate: (id: string, patch: Partial<StickerTransform>) => void;
  /** flush the pending PATCH now — called on gesture release so a save lands promptly. */
  commit: () => void;
}

interface StickerCtx {
  session: StickerEditSession | null;
  setSession: (s: StickerEditSession | null) => void;
}

const Ctx = createContext<StickerCtx>({ session: null, setSession: () => {} });

export function DeviceStickerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StickerEditSession | null>(null);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** DeviceShell reads the session; device.tsx publishes it. */
export function useStickerContext(): StickerCtx {
  return useContext(Ctx);
}
