import { stickersLabel, editReadoutSub, switchReadout, deviceStripCopy } from './deviceCopy';

// Device-editor copy formatters (M4 §3.5 · C1/C3/D2). No spec-ID strings; all-caps (OQ-110/F-06).
describe('deviceCopy', () => {
  it('pluralizes the sticker count', () => {
    expect(stickersLabel(0)).toBe('0 STICKERS');
    expect(stickersLabel(1)).toBe('1 STICKER');
    expect(stickersLabel(3)).toBe('3 STICKERS');
  });

  it('builds the edit-readout sub with all three facets', () => {
    expect(editReadoutSub('TEAL', 'MIDNIGHT', 2)).toBe('TEAL · MIDNIGHT · 2 STICKERS');
  });

  it('builds the D2 shell-switch readout', () => {
    expect(switchReadout('CARBON')).toEqual({
      title: 'SWITCHED — CARBON WRAP',
      sub: 'SAME POCKET · STICKERS + THEME RIDE ALONG',
    });
  });

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
