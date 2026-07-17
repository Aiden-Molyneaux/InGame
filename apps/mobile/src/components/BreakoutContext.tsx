import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// BreakoutContext — a tiny presentation flag so the deep Canvas posture (decision 0014 stage-3 ·
// design-spec §2.5b) can tell the ROOT DeviceShell to get out of the way. When a breakout is active
// the shell hides its chrome (top-band · bezel · NavBand) and the routed screen fills the whole
// device — the workshop "breaks out" of the arcade. This carries a BOOLEAN only: the Canvas session
// (draft/autosave/snapshot/history/exit-model) stays entirely in the /styler route — nothing about
// the document moves, so the CARD-24a one-document invariant is untouched.

type BreakoutValue = { active: boolean; setActive: (b: boolean) => void };

const BreakoutCtx = createContext<BreakoutValue>({ active: false, setActive: () => {} });

export function BreakoutProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <BreakoutCtx.Provider value={value}>{children}</BreakoutCtx.Provider>;
}

export function useBreakout(): BreakoutValue {
  return useContext(BreakoutCtx);
}
