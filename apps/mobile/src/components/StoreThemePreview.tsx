import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemePreview } from '../theme';

// StoreThemePreview (M5 F-13 C7, owner round-2) — while a STORE shell/theme item-sheet is open, the
// WHOLE app chrome (the wrapping DeviceShell plastic for a shell · every routed `scr.*` surface for a
// theme) adopts the previewed cosmetic, so the store preview is TRUE-TO-DEVICE instead of a boxed
// thumbnail. The owner explicitly overrides his earlier overspill caution here.
//
// It rides the F-10 `ThemePreview` subtree override, mounted ABOVE DeviceShell at the app root: NO prefs
// write, no PATCH, no global persist — the store preview must NEVER touch the persisted device (that's
// the /device editor's job, through prefs). When the preview is empty the override is `undefined` →
// `useTheme()` falls straight back to the live prefs, VALUE-IDENTICAL to no provider at all.
//
// The preview is plain React state at the root, so it dies the moment the sheet clears it (on close /
// unmount) — the F-12 logout-reset lesson: a preview must never outlive the sheet that opened it.

export interface StorePreview {
  shellId?: string;
  themeId?: string;
}

interface StorePreviewApi {
  setPreview: (p: StorePreview) => void;
}

const StorePreviewContext = createContext<StorePreviewApi>({ setPreview: () => {} });

/** The store's item-sheet calls `setPreview({themeId})` / `{shellId}` on open, `{}` on close. */
export function useStorePreview(): StorePreviewApi {
  return useContext(StorePreviewContext);
}

export function StoreThemePreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<StorePreview>({});
  const api = useMemo<StorePreviewApi>(() => ({ setPreview }), []);
  return (
    <StorePreviewContext.Provider value={api}>
      <ThemePreview themeId={preview.themeId} shellId={preview.shellId}>
        {children}
      </ThemePreview>
    </StorePreviewContext.Provider>
  );
}
