import type { LedgerEntry, StorePack } from '@ingame/shared';
import { usdFor, pxPerDollar, valueLine, isBestRate } from './packMeta';
import { ledgerLabel, ledgerTone, ledgerSign, ledgerWhen, sortUltimateFirst } from './storeCopy';

const pack = (productId: string, pixels: number, oneTime = false): StorePack => ({
  productId,
  pixels,
  oneTime,
  purchased: false,
});

// The 0072 launch ladder.
const STARTER = pack('px_pack_starter', 12, true);
const P010 = pack('px_pack_010', 10);
const P030 = pack('px_pack_030', 30);
const P065 = pack('px_pack_065', 65);
const P140 = pack('px_pack_140', 140);
const LADDER = [STARTER, P010, P030, P065, P140];

describe('packMeta — the dev price map + derived value math (decision 0072)', () => {
  it('maps known SKUs to USD and leaves unknowns null (still buyable)', () => {
    expect(usdFor('px_pack_030')).toBe('$4.99');
    expect(usdFor('px_pack_starter')).toBe('$0.99');
    expect(usdFor('px_pack_mystery')).toBeNull();
  });

  it('derives PX-per-dollar from server pixels ÷ dev $', () => {
    expect(pxPerDollar(P010)).toBeCloseTo(5.03, 1); // 10 / 1.99
    expect(pxPerDollar(pack('px_pack_mystery', 5))).toBeNull();
  });

  it('states the base rate, the starter multiplier, and the +N% for better tiers', () => {
    expect(valueLine(P010).toLowerCase()).toContain('base');
    const starter = valueLine(STARTER).toLowerCase();
    expect(starter).toContain('once ever');
    expect(starter).toContain('×');
    expect(valueLine(P030)).toMatch(/\+\d+% more PX\/\$/);
    expect(valueLine(pack('px_pack_mystery', 5))).toBe(''); // unmapped $ → no math line
  });

  it('flags the best-rate priced tier (never the starter)', () => {
    expect(isBestRate(P140, LADDER)).toBe(true);
    expect(isBestRate(P010, LADDER)).toBe(false);
    expect(isBestRate(STARTER, LADDER)).toBe(false);
  });
});

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'e1',
  type: 'daily_claim',
  delta: 1,
  refType: null,
  refId: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe('storeCopy — sortUltimateFirst (M6 W-5 · decision 0080 · aisle sort)', () => {
  const item = (id: string, tier?: string) => ({ id, tier });

  it('lifts ULTIMATE items to the FRONT within the aisle', () => {
    const sorted = sortUltimateFirst([
      item('a', 'deluxe'),
      item('b', 'ultimate'),
      item('c', 'standard'),
      item('d', 'ultimate'),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('leaves the NON-ULTIMATE relative order untouched (stable partition)', () => {
    const sorted = sortUltimateFirst([
      item('x', 'accent'),
      item('y', 'trim'),
      item('z', 'showpiece'),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });

  it('keeps the ULTIMATE items in their own incoming order too', () => {
    const sorted = sortUltimateFirst([
      item('u1', 'ultimate'),
      item('p', 'deluxe'),
      item('u2', 'ultimate'),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['u1', 'u2', 'p']);
  });

  it('does not mutate the input array', () => {
    const input = [item('a', 'standard'), item('b', 'ultimate')];
    const before = input.map((i) => i.id);
    sortUltimateFirst(input);
    expect(input.map((i) => i.id)).toEqual(before);
  });
});

describe('storeCopy — ledger labels, tone, sign, when', () => {
  it('labels each reason (no spec-ID strings, ECON-11 reason never leaks)', () => {
    expect(ledgerLabel(entry({ type: 'starting_grant' }))).toBe('STARTING GRANT');
    expect(ledgerLabel(entry({ type: 'pack_purchase' }))).toBe('PIXEL PACK');
    expect(ledgerLabel(entry({ type: 'admin_adjustment' }))).toBe('OPERATOR ADJUSTMENT');
    expect(ledgerLabel(entry({ type: 'refund_reversal' }))).toBe('REFUND REVERSAL');
  });

  it('tones earn/spend/reversal from reason + delta', () => {
    expect(ledgerTone(entry({ type: 'daily_claim', delta: 1 }))).toBe('earn');
    expect(ledgerTone(entry({ type: 'acquire', delta: -8 }))).toBe('spend');
    expect(ledgerTone(entry({ type: 'refund_reversal', delta: -30 }))).toBe('reversal');
    expect(ledgerTone(entry({ type: 'admin_adjustment', delta: 20 }))).toBe('earn');
  });

  it('signs +, −, and ⊘ for a reversal', () => {
    expect(ledgerSign(entry({ delta: 5 }))).toBe('+');
    expect(ledgerSign(entry({ delta: -1 }))).toBe('−');
    expect(ledgerSign(entry({ type: 'refund_reversal', delta: -30 }))).toBe('⊘');
  });

  it('stamps TODAY HH:MM for today and MON DD otherwise', () => {
    const now = new Date('2026-07-12T16:20:00');
    expect(ledgerWhen(new Date('2026-07-12T09:05:00').toISOString(), now)).toMatch(/^TODAY \d\d:\d\d$/);
    expect(ledgerWhen('2026-06-02T10:00:00.000Z', now)).toMatch(/^JUN \d\d$/);
  });
});
