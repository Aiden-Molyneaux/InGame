// The 0063 §1 "Essentials" icon registry (CARD-02/CARD-17 — all free, decision 0017). Each icon is a
// single SVG path in a 20×20 box; the renderer scales it into the element's normalized box. Ids are
// stable strings the composition references (`{ type:'icon', iconId }`); an UNKNOWN id renders
// nothing (degrade, never a crash — the F21 posture). This build ships a real subset of the ~30
// (canvas-manifest ADDENDUM); the pre-launch roster design pass owns the full curated set (0063 §6).
// Inner cut-outs (ring/coin/invader eyes) are wound opposite the outer subpath so the default
// nonzero fill rule punches them out on both skia builds.

export interface EssentialIcon {
  id: string;
  name: string; // display copy (F-06-sized by the consumer)
  path: string; // 20×20 viewBox
}

export const ESSENTIAL_ICONS: EssentialIcon[] = [
  { id: 'star', name: 'STAR', path: 'M10 1 L12.4 7 L19 7.6 L14 12 L15.6 19 L10 15.2 L4.4 19 L6 12 L1 7.6 L7.6 7 Z' },
  { id: 'bolt', name: 'BOLT', path: 'M12 1 L4.5 11 L9 11 L8 19 L15.5 9 L11 9 Z' },
  { id: 'crown', name: 'CROWN', path: 'M2.5 16 L2.5 6 L7 10 L10 3 L13 10 L17.5 6 L17.5 16 Z' },
  { id: 'heart', name: 'HEART', path: 'M10 18 C3 12 1 8 3.5 5 C5.5 2.8 9 3.5 10 6 C11 3.5 14.5 2.8 16.5 5 C19 8 17 12 10 18 Z' },
  { id: 'ring', name: 'RING', path: 'M10 2 a8 8 0 1 0 0.02 0 Z M10 5.6 a4.4 4.4 0 1 1 -0.02 0 Z' },
  { id: 'moon', name: 'MOON', path: 'M12.5 2 A8.5 8.5 0 1 0 18 13.5 A7 7 0 0 1 12.5 2 Z' },
  { id: 'invader', name: 'INVADER', path: 'M5 4 L7 4 L7 6 L13 6 L13 4 L15 4 L15 6 L17 6 L17 12 L15 12 L15 14 L13 14 L13 16 L11 16 L11 14 L9 14 L9 16 L7 16 L7 14 L5 14 L5 12 L3 12 L3 6 L5 6 Z M7 8 L7 10 L9 10 L9 8 Z M11 8 L11 10 L13 10 L13 8 Z' },
  { id: 'arrow', name: 'ARROW', path: 'M2 8 L11 8 L11 4 L18 10 L11 16 L11 12 L2 12 Z' },
  { id: 'trophy', name: 'TROPHY', path: 'M4 2 L16 2 L16 8 A6 6 0 0 1 11 13.6 L11 16 L14 16 L14 18 L6 18 L6 16 L9 16 L9 13.6 A6 6 0 0 1 4 8 Z' },
  { id: 'sword', name: 'SWORD', path: 'M9.2 1 L10.8 1 L10.8 11 L13.5 13.7 L12.3 14.9 L10.8 13.4 L10.8 16 L12.5 17.7 L11.3 18.9 L10 17.6 L8.7 18.9 L7.5 17.7 L9.2 16 L9.2 13.4 L7.7 14.9 L6.5 13.7 L9.2 11 Z' },
  { id: 'shield', name: 'SHIELD', path: 'M10 1 L17 4 L17 10 C17 14.5 14 17.5 10 19 C6 17.5 3 14.5 3 10 L3 4 Z' },
  { id: 'potion', name: 'POTION', path: 'M8 2 L12 2 L12 4 L11 4 L11 7 C14 8.5 16 11 16 13.5 A6 4.8 0 0 1 4 13.5 C4 11 6 8.5 9 7 L9 4 L8 4 Z' },
  { id: 'coin', name: 'COIN', path: 'M10 2 a8 8 0 1 0 0.02 0 Z M10 5 a5 5 0 1 1 -0.02 0 Z' },
  { id: 'flame', name: 'FLAME', path: 'M10 1 C12 5 15 6.5 15 11 A5 5.6 0 0 1 5 11 C5 8 7 6.5 7.5 4.5 C8.5 6 9.5 6.5 10 8 C10.5 5.5 9.5 3.5 10 1 Z' },
  { id: 'crosshair', name: 'CROSSHAIR', path: 'M10 3.5 a6.5 6.5 0 1 0 0.02 0 Z M10 6 a4 4 0 1 1 -0.02 0 Z M9.3 0.5 L10.7 0.5 L10.7 4 L9.3 4 Z M9.3 16 L10.7 16 L10.7 19.5 L9.3 19.5 Z M0.5 9.3 L4 9.3 L4 10.7 L0.5 10.7 Z M16 9.3 L19.5 9.3 L19.5 10.7 L16 10.7 Z' },
  { id: 'dpad', name: 'D-PAD', path: 'M7.5 2 L12.5 2 L12.5 7.5 L18 7.5 L18 12.5 L12.5 12.5 L12.5 18 L7.5 18 L7.5 12.5 L2 12.5 L2 7.5 L7.5 7.5 Z' },
  { id: 'joystick', name: 'JOYSTICK', path: 'M10 2 a3 3 0 1 0 0.02 0 Z M9.2 7.8 L10.8 7.8 L10.8 12 L9.2 12 Z M4 12 L16 12 L17.5 17 L2.5 17 Z' },
  { id: 'flag', name: 'FLAG', path: 'M5 2 L6.5 2 L6.5 18 L5 18 Z M6.5 3 L16 3 L13.5 6.5 L16 10 L6.5 10 Z' },
  { id: 'sparkle', name: 'SPARKLE', path: 'M10 2 C10.6 6.5 13.5 9.4 18 10 C13.5 10.6 10.6 13.5 10 18 C9.4 13.5 6.5 10.6 2 10 C6.5 9.4 9.4 6.5 10 2 Z' },
  { id: 'medal', name: 'MEDAL', path: 'M7 1 L13 1 L11.5 8.2 L8.5 8.2 Z M10 8 a4.5 4.5 0 1 0 0.02 0 Z' },
];

export const ICON_PATHS: Record<string, string> = Object.fromEntries(ESSENTIAL_ICONS.map((i) => [i.id, i.path]));
export const ICON_VIEWBOX = 20;
