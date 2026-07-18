import { stickersLabel, deviceStripCopy } from './deviceCopy';

// Device-editor copy formatters (M4 §3.5 · C1/C3/D2). No spec-ID strings; all-caps (OQ-110/F-06).
describe('deviceCopy', () => {
  it('pluralizes the sticker count', () => {
    expect(stickersLabel(0)).toBe('0 STICKERS');
    expect(stickersLabel(1)).toBe('1 STICKER');
    expect(stickersLabel(3)).toBe('3 STICKERS');
  });

  // W-B12 (owner ruling) — the EDITING-YOUR-DEVICE + SWITCHED readouts are removed; their
  // formatters (editReadoutSub / switchReadout) went with them.

  it('drops the sticker segment on the Profile strip when there are none', () => {
    expect(deviceStripCopy('TEAL', 'MIDNIGHT', 0)).toEqual({
      title: 'POCKET · TEAL',
      sub: 'MIDNIGHT SCREEN',
    });
    expect(deviceStripCopy('CARBON', 'DEEP SEA', 2)).toEqual({
      title: 'POCKET · CARBON',
      sub: 'DEEP SEA SCREEN · 2 STICKERS',
    });
  });
});
