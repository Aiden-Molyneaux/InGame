import { StyleSheet } from 'react-native';
import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { LedgerEntry, StorePack } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { HEADER_CONTENT_HEIGHT } from '../ScreenHead';
import { CurrencyCounter } from './CurrencyCounter';
import { DailyBonusBar } from './DailyBonusBar';
import { PriceChip } from './PriceChip';
import { OwnedTag, LockedTag, EarnedOnlyTag } from './Tags';
import { PackTile } from './PackTile';
import { LedgerRow } from './LedgerRow';
import { LandedMoment } from './LandedMoment';
import { AisleIndex } from './AisleIndex';
import { StoreEntries } from './StoreEntries';
import { ItemTile } from './ItemTile';
import { UltimateChip } from './UltimateChip';
import { HueStrip } from './HueStrip';

// A flippable reduce-motion mock (the `mock` prefix lets the factory close over it). Defaults to
// reduced=true so the LandedMoment burst never plays for the settled-layout assertions below.
let mockReduced = true;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

describe('W-B5 — the PREVIEWING chip is retired', () => {
  it('the commerce kit no longer exports PreviewStrip (the theme preview announces nothing)', () => {
    // owner walk2: the repainted mock screen IS the preview — no "◆ PREVIEWING" chip. The component is
    // deleted, not just unmounted; this guards the barrel so a re-export can't quietly bring it back.
    const kit = require('./index') as Record<string, unknown>;
    expect(kit.PreviewStrip).toBeUndefined();
  });
});

describe('CurrencyCounter (§7)', () => {
  it('renders the balance and opens the wallet on press', () => {
    const onPress = jest.fn();
    render(wrap(<CurrencyCounter balance={27} onPress={onPress} />));
    fireEvent.press(screen.getByLabelText('27 pixels — open wallet'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('flashes the +N tick chip and reads negative balances', () => {
    render(wrap(<CurrencyCounter balance={35} tick={30} />));
    expect(screen.getByText('+30')).toBeTruthy();
    render(wrap(<CurrencyCounter balance={-3} />));
    expect(screen.getByLabelText('-3 pixels — open wallet')).toBeTruthy();
  });

  // walk-4 P3-d (owner) — the PX counter must be ONE size on EVERY page. Collection/Profile dock it
  // in ScreenHead's STRETCHED trailing cluster (the 26px band); Store/Device/Styler drop it into a
  // plain centred head row, where `alignSelf:'stretch'` resolves to nothing and it fell back to its
  // ~24px natural height. The floor now travels WITH the component, so no host can shrink it — and
  // it stays a floor (not a fixed height), so the stretched band still governs on Collection and the
  // count-chip equal-height invariant (ScreenHead.test.tsx) is untouched. RED before the fix.
  it('P3-d — the keycap carries the header-band floor itself, in an UNSTRETCHED host', () => {
    render(wrap(<CurrencyCounter balance={27} />)); // the Store/Device/Styler posture
    const counter = StyleSheet.flatten(screen.getByLabelText('27 pixels — open wallet').props.style);
    expect(counter.minHeight).toBe(HEADER_CONTENT_HEIGHT);
    expect(counter.alignSelf).toBe('stretch'); // …and the band fill mechanism is unchanged
    expect(counter.height).toBeUndefined(); // never a divergent FIXED height (the drift vector)
  });
});

describe('DailyBonusBar (§7)', () => {
  it('claims when available', () => {
    const onClaim = jest.fn();
    render(wrap(<DailyBonusBar available amount={1} onClaim={onClaim} />));
    expect(screen.getByText('DAILY BONUS READY — +1 PX')).toBeTruthy();
    fireEvent.press(screen.getByText('CLAIM +1'));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });
  it('goes quiet once claimed (no claim key)', () => {
    render(wrap(<DailyBonusBar available={false} amount={1} onClaim={jest.fn()} />));
    expect(screen.getByText('✓ CLAIMED — BACK TOMORROW')).toBeTruthy();
    expect(screen.queryByText('CLAIM +1')).toBeNull();
  });
  it('on the Newcomer Ladder, an available day shows DAY N OF 7 and claims the step amount', () => {
    const onClaim = jest.fn();
    render(
      wrap(
        <DailyBonusBar
          available
          amount={1}
          ladderStep={3}
          ladderReward={{ pixels: 3 }}
          onClaim={onClaim}
        />,
      ),
    );
    expect(screen.getByText('DAY 3 OF 7 · CLAIM +3 PX')).toBeTruthy();
    fireEvent.press(screen.getByText('CLAIM +3'));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });
  it('teases a free item when the ladder step carries a cosmetic slot', () => {
    render(
      wrap(
        <DailyBonusBar
          available
          amount={1}
          ladderStep={1}
          ladderReward={{ pixels: 2, cosmeticId: 'newcomer-1' }}
          onClaim={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('DAY 1 OF 7 · CLAIM +2 PX')).toBeTruthy();
    expect(screen.getByText('+ a free newcomer item')).toBeTruthy();
  });
  it("a claimed ladder day teases tomorrow's step (the API already advanced the tease)", () => {
    render(
      wrap(
        <DailyBonusBar
          available={false}
          amount={1}
          ladderStep={4}
          ladderReward={{ pixels: 3 }}
          onClaim={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('✓ CLAIMED — BACK TOMORROW')).toBeTruthy();
    expect(screen.getByText('Day 4 of 7 tomorrow · +3 PX')).toBeTruthy();
  });
  it('post-ladder (no ladder props) renders exactly the veteran +1 view', () => {
    render(wrap(<DailyBonusBar available amount={1} onClaim={jest.fn()} />));
    expect(screen.getByText('DAILY BONUS READY — +1 PX')).toBeTruthy();
    expect(screen.queryByText(/DAY .* OF 7/)).toBeNull();
  });
});

describe('PriceChip + entitlement tags (§7)', () => {
  it('prices in PX with an a11y label', () => {
    render(wrap(<PriceChip pixels={8} />));
    expect(screen.getByLabelText('8 pixels')).toBeTruthy();
  });
  it('renders owned / locked / earned states', () => {
    render(wrap(<OwnedTag />));
    expect(screen.getByText('✓ OWNED')).toBeTruthy();
    render(wrap(<LockedTag label="RETURNS WITH ITS DROP" />));
    expect(screen.getByText('🔒 RETURNS WITH ITS DROP')).toBeTruthy();
    render(wrap(<EarnedOnlyTag />));
    expect(screen.getByText('🏆 EARNED ONLY')).toBeTruthy();
  });
});

const pack = (over: Partial<StorePack>): StorePack => ({
  productId: 'px_pack_030',
  pixels: 30,
  oneTime: false,
  purchased: false,
  ...over,
});

describe('PackTile (§7)', () => {
  it('buys a grid tile', () => {
    const onBuy = jest.fn();
    render(wrap(<PackTile pack={pack({})} onBuy={onBuy} />));
    fireEvent.press(screen.getByText('$4.99'));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });
  it('the starter shows its value line + first-purchase, and dims to CLAIMED once purchased', () => {
    const { rerender } = render(
      wrap(<PackTile pack={pack({ productId: 'px_pack_starter', pixels: 12, oneTime: true })} onBuy={jest.fn()} flash="FIRST PURCHASE ONLY" />),
    );
    expect(screen.getByText('STARTER PACK')).toBeTruthy();
    expect(screen.getByText('FIRST PURCHASE ONLY')).toBeTruthy();
    expect(screen.getByText('$0.99')).toBeTruthy();
    rerender(
      wrap(<PackTile pack={pack({ productId: 'px_pack_starter', pixels: 12, oneTime: true, purchased: true })} onBuy={jest.fn()} />),
    );
    expect(screen.getByText('CLAIMED')).toBeTruthy();
    expect(screen.queryByText('$0.99')).toBeNull();
  });
});

const ledger = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'e1',
  type: 'pack_purchase',
  delta: 30,
  refType: null,
  refId: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe('LedgerRow (§7)', () => {
  it('renders an earn row label', () => {
    render(wrap(<LedgerRow entry={ledger({ type: 'daily_claim', delta: 1 })} />));
    expect(screen.getByText('DAILY BONUS · CLAIMED IN STORE')).toBeTruthy();
  });
  it('renders a refund reversal with the ⊘ badge and operator adjustments', () => {
    render(wrap(<LedgerRow entry={ledger({ type: 'refund_reversal', delta: -30 })} />));
    expect(screen.getByText('⊘')).toBeTruthy();
    expect(screen.getByText('REFUND REVERSAL')).toBeTruthy();
    render(wrap(<LedgerRow entry={ledger({ type: 'admin_adjustment', delta: 20 })} />));
    expect(screen.getByText('OPERATOR ADJUSTMENT')).toBeTruthy();
  });
});

describe('LandedMoment (P7 — the coin drop)', () => {
  afterEach(() => {
    mockReduced = true;
  });

  it('under reduce-motion lands settled — the +N grant, the final balance, and both actions (no drop/burst/roll)', () => {
    mockReduced = true;
    const onBack = jest.fn();
    const onViewWallet = jest.fn();
    render(wrap(<LandedMoment granted={30} from={5} to={35} onBack={onBack} onViewWallet={onViewWallet} />));
    expect(screen.getByText('+30')).toBeTruthy();
    expect(screen.getByText('35')).toBeTruthy(); // the counter is settled on `to`, not mid-roll
    fireEvent.press(screen.getByText('BACK TO STORE'));
    fireEvent.press(screen.getByText('VIEW WALLET ›'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onViewWallet).toHaveBeenCalledTimes(1);
  });

  it('with motion the four beats play and the counter rolls to EXACTLY `to` on an odd delta (+7)', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const onBack = jest.fn();
      render(wrap(<LandedMoment granted={7} from={0} to={7} onBack={onBack} onViewWallet={jest.fn()} />));
      act(() => jest.advanceTimersByTime(1500));
      expect(screen.getByText('7')).toBeTruthy(); // rolled to exactly `to`, not 6 or 8
      expect(screen.getByText('+7')).toBeTruthy();
      fireEvent.press(screen.getByText('BACK TO STORE'));
      expect(onBack).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });

  it('with motion a large capped delta (+140) still lands the counter EXACTLY on `to`', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      render(wrap(<LandedMoment granted={140} from={100} to={240} onBack={jest.fn()} onViewWallet={jest.fn()} />));
      act(() => jest.advanceTimersByTime(1500));
      expect(screen.getByText('240')).toBeTruthy();
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });

  it('tap-to-skip mid-sequence jumps to settled — counter shows `to`, actions live', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const onBack = jest.fn();
      render(wrap(<LandedMoment granted={40} from={10} to={50} onBack={onBack} onViewWallet={jest.fn()} />));
      act(() => jest.advanceTimersByTime(120)); // mid-drop, before the roll even starts
      fireEvent.press(screen.getByLabelText(/Pack landed/)); // tap anywhere skips
      expect(screen.getByText('50')).toBeTruthy();
      fireEvent.press(screen.getByText('BACK TO STORE'));
      expect(onBack).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });

  it('unmounting mid-sequence clears its roll timers (no leak into an unmounted tree)', () => {
    mockReduced = false;
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    try {
      // delta 20 → 20 scheduled roll ticks (buildRoll caps at 20), armed synchronously on mount.
      const view = render(wrap(<LandedMoment granted={20} from={0} to={20} onBack={jest.fn()} onViewWallet={jest.fn()} />));
      clearSpy.mockClear();
      view.unmount(); // cleanup must clearTimeout every pending roll tick
      expect(clearSpy.mock.calls.length).toBeGreaterThanOrEqual(20); // all 20 roll ticks torn down
    } finally {
      clearSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});

describe('AisleIndex (§7)', () => {
  it('lists the taxonomy and routes aisle taps (the TOP UP door moved to StoreEntries — M6 owner-walk)', () => {
    const onAisle = jest.fn();
    render(wrap(<AisleIndex onAisle={onAisle} />));
    expect(screen.getByText('EFFECTS')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('EFFECTS'));
    expect(onAisle).toHaveBeenCalledWith({ key: 'effect', label: 'EFFECTS' });
    // the Index is aisles-only now — no PIXELS / TOP UP door lives here anymore.
    expect(screen.queryByLabelText('Pixel top-up')).toBeNull();
    expect(screen.queryByText('PIXELS')).toBeNull();
  });
});

describe('StoreEntries (M6 owner-walk — the two store-bottom entry points)', () => {
  it('renders both PIXEL TOP-UP and WALLET entries and routes each tap to its own view', () => {
    const onTopUp = jest.fn();
    const onWallet = jest.fn();
    render(wrap(<StoreEntries onTopUp={onTopUp} onWallet={onWallet} />));
    expect(screen.getByText('PIXEL TOP-UP')).toBeTruthy();
    expect(screen.getByText('WALLET')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Pixel top-up'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
    expect(onWallet).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Wallet'));
    expect(onWallet).toHaveBeenCalledTimes(1);
    expect(onTopUp).toHaveBeenCalledTimes(1); // top-up not re-fired by the wallet tap
  });
});

describe('UltimateChip + HueStrip (M6 W-5 · decision 0080 r3)', () => {
  it('the ULTIMATE chip renders its inverted-gold word', () => {
    render(wrap(<UltimateChip />));
    expect(screen.getByText('ULTIMATE')).toBeTruthy();
    expect(screen.getByLabelText('Ultimate')).toBeTruthy();
  });
  it('the HueStrip glyph carries a single ANY-COLOUR a11y label (not five nameless swatches)', () => {
    render(wrap(<HueStrip />));
    expect(screen.getByLabelText('Any colour — colour-customizable')).toBeTruthy();
  });
});

describe('ItemTile — the ULTIMATE tells (M6 W-5 · decision 0080 r3)', () => {
  it('an ultimate + colour-customizable tile shows the chip AND the hue-strip AND its price', () => {
    render(
      wrap(
        <ItemTile
          name="MARQUEE ULTIMATE"
          type="FRAME"
          price={10}
          tier="ultimate"
          colorCustomizable
        />,
      ),
    );
    expect(screen.getByLabelText('MARQUEE ULTIMATE, FRAME, Ultimate, colour-customizable')).toBeTruthy(); // a11y names the tier + the flag (Murr W-5 LOW — the nested HueStrip label is VoiceOver-unreachable)
    expect(screen.getByText('ULTIMATE')).toBeTruthy(); // the chip
    expect(screen.getByLabelText('Any colour — colour-customizable')).toBeTruthy(); // the hue-strip
    expect(screen.getByLabelText('10 pixels')).toBeTruthy(); // the PriceChip still rides
  });

  it('a plain premium tile (tier deluxe, not colour-customizable) shows NEITHER tell', () => {
    render(wrap(<ItemTile name="HOLOGRAPHIC" type="FINISH" price={8} tier="deluxe" />));
    expect(screen.queryByText('ULTIMATE')).toBeNull();
    expect(screen.queryByLabelText('Any colour — colour-customizable')).toBeNull();
    expect(screen.getByLabelText('HOLOGRAPHIC, FINISH')).toBeTruthy(); // no ", Ultimate" suffix
    expect(screen.getByLabelText('8 pixels')).toBeTruthy();
  });
});
