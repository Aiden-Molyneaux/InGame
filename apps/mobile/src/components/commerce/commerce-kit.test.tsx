import { render, fireEvent, screen } from '@testing-library/react-native';
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

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

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
  it('shows the +N grant, the arithmetic, and fires both actions', () => {
    const onBack = jest.fn();
    const onViewWallet = jest.fn();
    render(wrap(<LandedMoment granted={30} from={5} to={35} onBack={onBack} onViewWallet={onViewWallet} />));
    expect(screen.getByText('+30')).toBeTruthy();
    fireEvent.press(screen.getByText('BACK TO STORE'));
    fireEvent.press(screen.getByText('VIEW WALLET ›'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onViewWallet).toHaveBeenCalledTimes(1);
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
