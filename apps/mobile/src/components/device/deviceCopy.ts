// Device-editor copy formatters (M4 §3.5). Pure string builders, kept out of the route so the readout
// grammar is unit-testable. Copy law (OQ-110): no spec-ID strings in rendered copy; all-caps per F-06.

/** "N STICKERS" / "1 STICKER" (singular-aware). */
export function stickersLabel(count: number): string {
  return `${count} STICKER${count === 1 ? '' : 'S'}`;
}

/** The edit-readout sub-line (C3): "«SHELL» · «THEME» · N STICKERS". */
export function editReadoutSub(shellName: string, themeName: string, stickerCount: number): string {
  return `${shellName} · ${themeName} · ${stickersLabel(stickerCount)}`;
}

/** The D4 live transform readout (C3 while a decal is selected): "PLACING — «NAME» (124% · −9°)". */
export function placingReadout(name: string, scale: number, rotation: number): string {
  return `PLACING — ${name} (${Math.round(scale * 100)}% · ${Math.round(rotation)}°)`;
}

/** The D5 on-shell-preview sub-line: "N STICKERS · «SHELL» · «THEME»". */
export function previewSub(shellName: string, themeName: string, stickerCount: number): string {
  return `${stickersLabel(stickerCount)} · ${shellName} · ${themeName}`;
}

/** The D2 shell-switch readout — title + sub. */
export function switchReadout(toShellName: string): { title: string; sub: string } {
  return {
    title: `SWITCHED — ${toShellName} WRAP`,
    sub: 'SAME POCKET · STICKERS + THEME RIDE ALONG',
  };
}

/** The Profile MY DEVICE strip (C1): title + sub. The sticker segment only shows when N > 0. */
export function deviceStripCopy(
  shellName: string,
  themeName: string,
  stickerCount: number,
): { title: string; sub: string } {
  const sub = stickerCount > 0 ? `${themeName} SCREEN · ${stickersLabel(stickerCount)}` : `${themeName} SCREEN`;
  return { title: `POCKET · ${shellName}`, sub };
}
