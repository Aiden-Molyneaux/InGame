import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { LedgerEntry, StorePack } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { CurrencyCounter } from './CurrencyCounter';
import { DailyBonusBar } from './DailyBonusBar';
import { PriceChip } from './PriceChip';
import { OwnedTag, LockedTag, EarnedOnlyTag } from './Tags';
import { PackTile } from './PackTile';
import { LedgerRow } from './LedgerRow';
import { LandedMoment } from './LandedMoment';
import { AisleIndex } from './AisleIndex';

// A flippable reduce-motion mock (the `mock` prefix lets the factory close over it). Defaults to
// reduced=true so the LandedMoment burst never plays for the settled-layout assertions below.
let mockReduced = true;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

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

describe('LandedMoment (P7)', () => {
  afterEach(() => {
    mockReduced = true;
  });

  it('under reduce-motion lands settled — the +N grant, the arithmetic, and both actions (no burst travel)', () => {
    mockReduced = true;
    const onBack = jest.fn();
    const onViewWallet = jest.fn();
    render(wrap(<LandedMoment granted={30} from={5} to={35} onBack={onBack} onViewWallet={onViewWallet} />));
    expect(screen.getByText('+30')).toBeTruthy();
    fireEvent.press(screen.getByText('BACK TO STORE'));
    fireEvent.press(screen.getByText('VIEW WALLET ›'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onViewWallet).toHaveBeenCalledTimes(1);
  });

  it('with motion the burst beat fires on mount and still settles to the arithmetic + actions', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const onBack = jest.fn();
      render(wrap(<LandedMoment granted={12} from={0} to={12} onBack={onBack} onViewWallet={jest.fn()} />));
      // the celebration plays (beat 160ms + burst 680ms) then the layout is intact
      act(() => jest.advanceTimersByTime(1000));
      expect(screen.getByText('+12')).toBeTruthy();
      fireEvent.press(screen.getByText('BACK TO STORE'));
      expect(onBack).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });
});

describe('AisleIndex (§7)', () => {
  it('lists the taxonomy and routes aisle + top-up taps', () => {
    const onAisle = jest.fn();
    const onTopUp = jest.fn();
    render(wrap(<AisleIndex onAisle={onAisle} onTopUp={onTopUp} />));
    expect(screen.getByText('EFFECTS')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('EFFECTS'));
    expect(onAisle).toHaveBeenCalledWith({ key: 'effect', label: 'EFFECTS' });
    fireEvent.press(screen.getByLabelText('Pixels — top up'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
  });
});
