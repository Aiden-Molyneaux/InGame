import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { CosmeticListItem, LedgerEntry, StorePack } from '@ingame/shared';
import { ScreenHead } from '../src/components/ScreenHead';
import { ScreenButton } from '../src/components/ScreenButton';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { LoadError } from '../src/components/lifecycle/LoadError';
import { Skeleton } from '../src/components/lifecycle/Skeleton';
import { Toast } from '../src/components/lifecycle/Toast';
import { Offline } from '../src/components/lifecycle/Offline';
import { MiniDevice } from '../src/components/MiniDevice';
import {
  CurrencyCounter,
  DailyBonusBar,
  AisleIndex,
  PackTile,
  PriceChip,
  OwnedTag,
  ItemTile,
  ItemSheet,
  CosmeticSwatch,
  ThemePreviewScreen,
  sampleCompositionWith,
  isCardCosmetic,
  PreviewStrip,
  LedgerRow,
  LandedMoment,
  PixelsMark,
  isBestRate,
  usdFor,
  type StoreItem,
} from '../src/components/commerce';
import { CardFace } from '../src/components/CardFace';
import { COSMETIC_TYPE_LABEL } from '../src/components/commerce/storeCopy';
import { useStorePreview } from '../src/components/StoreThemePreview';
import { useSheetLocked } from '../src/components/SheetLock';
import { themedStyles, ThemePreview } from '../src/theme';
import { useAnnounceOnChange } from '../src/a11y/announce';
import { mintMockReceipt } from '../src/store/mockReceipt';
import {
  useGetWalletQuery,
  useGetStoreQuery,
  useGetCosmeticsQuery,
  useGetDeviceQuery,
  useAcquireCosmeticMutation,
  useClaimDailyBonusMutation,
  useValidateIapMutation,
  useLazyGetLedgerQuery,
} from '../src/store/api';

// The Store + Wallet surface (M5 §P6 · design-spec §2.3 · store-manifest.md) — the first-article commerce
// screen. One route (`/store`, the gold nav keycap); Top Up + Wallet + an aisle page are in-screen
// VIEWS (the STORE keycap stays active — the FlowTakeover precedent). LIVE at M5: the CurrencyCounter
// (/me/wallet balance), the DailyBonusBar claim, Top Up (the 0072 pack ladder → /iap/validate DEV-mock →
// the landed moment), Restore, the Wallet (hero + paginated ledger + the ECON-09 negative). The premium
// storefront (drop cover · NEW-THIS-WEEK grid · aisle item lists · item sheets) is drawn but has no
// server content at M5 (roster re-tag = P4) — it renders empty-graceful (store-manifest EXPECTED rows).

const TICK_MS = 2500; // how long the CurrencyCounter tick chip + glow linger (motion.counterTick)

type StoreView = 'browse' | 'topup' | 'wallet' | 'aisle';
type LandedState = { granted: number; from: number; to: number };

export default function Store() {
  const styles = useStyles();
  // F-1 fix 7 — the header PX counter doors straight into the Wallet view (`/store?view=wallet`); the
  // Canvas/Styler can't-afford short-path doors into TOP UP (`/store?view=topup`, M5 D3); any other
  // entry lands on Browse. `k` is the Misc-1 nav-reset bump (see the effect below).
  const { view: viewParam, k } = useLocalSearchParams<{ view?: string; k?: string }>();
  const [view, setView] = useState<StoreView>(
    viewParam === 'wallet' ? 'wallet' : viewParam === 'topup' ? 'topup' : 'browse',
  );
  const [aisle, setAisle] = useState<{ key: string; label: string } | null>(null);
  const [tick, setTick] = useState<number | null>(null);
  const [landed, setLanded] = useState<LandedState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [starterNote, setStarterNote] = useState<string | null>(null);
  const [pendingPack, setPendingPack] = useState<StorePack | null>(null); // F-1 fix 5 — the mock IAP confirm
  // F-15 fix 4 (owner round-3) — the OPEN item sheet is lifted to the SCREEN ROOT (rendered in the Header
  // overlay, a sibling of the head + scroll) so its full-screen scrim dims the HEADER too. Previously each
  // view rendered its own CosmeticSheet INSIDE the ScrollView, so the sheet's absolute-fill scrim was
  // clipped to the scroll viewport and the ScreenHead + CurrencyCounter stayed lit above it.
  const [openItem, setOpenItem] = useState<CosmeticListItem | null>(null);
  const [offline, setOffline] = useState(false);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch } = useGetWalletQuery();
  const { data: store } = useGetStoreQuery();
  const [claimBonus, { isLoading: claiming }] = useClaimDailyBonusMutation();
  const [validateIap, { isLoading: buying }] = useValidateIapMutation();

  const balance = wallet?.balance ?? 0;

  const flashTick = useCallback((amount: number) => {
    setTick(amount);
    if (tickTimer.current) clearTimeout(tickTimer.current);
    tickTimer.current = setTimeout(() => setTick(null), TICK_MS);
  }, []);
  useEffect(() => () => {
    if (tickTimer.current) clearTimeout(tickTimer.current);
  }, []);

  // Misc-1 — the STORE nav keycap ALWAYS returns to the storefront. ShellNav bumps a fresh `k` on every
  // store-key press; when it changes, snap any in-screen sub-view (wallet / top-up / aisle) back to
  // browse. The header PX counter's ?view= deep links carry NO `k`, so those are untouched (the guard
  // skips the absent + the mount value — a first press that mounts the screen is already on browse).
  const firstK = useRef(true);
  useEffect(() => {
    if (k === undefined) return;
    if (firstK.current) {
      firstK.current = false;
      return;
    }
    setView('browse');
    setAisle(null);
    setLanded(null);
    setOpenItem(null);
  }, [k]);

  // A transient (network) failure = the app's one offline signal (no client NetInfo yet — the
  // device-editor precedent; ASSUMPTION recorded in the manifest). A 4xx is a real refusal, not offline.
  const isNetworkError = (e: unknown): boolean => {
    const status = (e as { status?: unknown })?.status;
    return status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';
  };

  const onClaim = useCallback(() => {
    setOffline(false);
    claimBonus()
      .unwrap()
      .then((res) => {
        // Tick the counter by the PX the claim ACTUALLY landed (a ladder step's escalating amount for
        // the first 7 claims, else the standing +1) — not the standing `dailyBonus.amount`.
        if (res.granted) flashTick(res.pixels || wallet?.dailyBonus.amount || 1);
      })
      .catch((e) => {
        if (isNetworkError(e)) setOffline(true);
        else setToast('Could not claim your bonus. Please try again.');
      });
  }, [claimBonus, flashTick, wallet?.dailyBonus.amount]);

  // BUY a pack — F-1 fix 5: staging the confirm stands in for the native Apple payment sheet. The tap
  // opens a purchase-toned ConfirmSheet (pack + $ price); confirming runs the mint+validate below. In
  // production the REAL StoreKit sheet IS this confirm — it replaces the ConfirmSheet + mintMockReceipt.
  const buyPack = useCallback((pack: StorePack) => {
    setStarterNote(null);
    setPendingPack(pack);
  }, []);

  // The confirmed purchase — the DEV-MOCK path: mint a mock receipt for this productId → POST
  // /iap/validate. ── P2b SEAM: replace mintMockReceipt(...) with the RevenueCat/StoreKit receipt. ──
  const runPurchase = useCallback(
    (pack: StorePack) => {
      setOffline(false);
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const receipt = mintMockReceipt(pack.productId, platform);
      validateIap({ platform, receipt })
        .unwrap()
        .then((res) => {
          if (res.granted && res.pixels) {
            flashTick(res.pixels);
            setLanded({ granted: res.pixels, from: res.balance - res.pixels, to: res.balance });
          }
          // {granted:false} = an idempotent replay — a quiet no-op (balance already reflects it).
        })
        .catch((e) => {
          const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
          if (code === 'STARTER_PACK_CONSUMED') {
            setStarterNote('You already claimed the one-time starter pack.');
          } else if (isNetworkError(e)) {
            setOffline(true);
          } else {
            setToast("Purchase didn't go through — nothing was charged, your pixels are safe.");
          }
        });
    },
    [validateIap, flashTick],
  );

  const confirmPending = useCallback(() => {
    if (!pendingPack) return;
    const pack = pendingPack;
    setPendingPack(null);
    runPurchase(pack);
  }, [pendingPack, runPurchase]);

  const onRestore = useCallback(() => {
    setRestoreNote(null);
    // Restore rides /iap/validate's rcUserId path (decision 0073 §0.3). DEV: an empty subscriber (no
    // prior receipts) → the mock returns []; consumables are never re-granted → "all caught up".
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    validateIap({ platform, rcUserId: 'mocksub.v1.' + 'W10' /* base64url("[]") */ })
      .unwrap()
      .then(() => setRestoreNote('✓ All caught up — your balance & items match your account.'))
      .catch(() => setRestoreNote('Could not restore right now. Please try again.'));
  }, [validateIap]);

  const goStore = useCallback(() => {
    setView('browse');
    setLanded(null);
    setAisle(null);
    setOpenItem(null);
  }, []);

  // announce the landed grant (an async result the user should hear).
  useAnnounceOnChange(landed ? `Plus ${landed.granted} pixels. New balance ${landed.to}.` : null);

  // ── lifecycle: first-load Skeleton · LoadError (the wallet drives the header truth) ──
  if (walletLoading) {
    return (
      <Header view={view} balance={0} tick={null} onWallet={() => {}}>
        <View style={styles.body}>
          <Skeleton variant="text-lines" lines={2} />
          <Skeleton variant="tile-row" count={6} />
        </View>
      </Header>
    );
  }
  if (walletError) {
    return (
      <Header view={view} balance={balance} tick={null} onWallet={() => {}}>
        <View style={styles.errWrap}>
          <LoadError
            title="Signal Lost"
            message="The shelves didn't answer. Your pixels are safe — this is a connection problem, not a wallet problem."
            onRetry={() => void refetch()}
          />
        </View>
      </Header>
    );
  }

  return (
    <Header
      view={view}
      balance={balance}
      tick={tick}
      onWallet={() => setView('wallet')}
      overlay={
        <>
          {toast ? (
            <Toast message={toast} tone="error" onRetry={undefined} onDismiss={() => setToast(null)} />
          ) : null}
          {/* F-1 fix 5 — the mock Apple payment sheet: a purchase-toned confirm (NOT destructive-red)
              echoing the P6 Face-ID framing. F-13 B2 — the PAY hold now wears the gold cosmetic-buy
              look (ConfirmSheet · holdToConfirm). In production the native StoreKit sheet replaces this. */}
          {pendingPack ? (
            <ConfirmSheet
              visible
              tone="purchase"
              holdToConfirm
              title="CONFIRM PURCHASE"
              message={`${usdFor(pendingPack.productId) ?? '$—'} will be charged to your Apple account for ${pendingPack.pixels} pixels. Hold PAY to confirm.`}
              confirmLabel={`Hold to pay ${usdFor(pendingPack.productId) ?? ''}`.trim()}
              busy={buying}
              onConfirm={confirmPending}
              onClose={() => setPendingPack(null)}
            />
          ) : null}
          {/* F-15 fix 4 — the item sheet lives HERE (screen root), so its scrim covers the whole screen
              incl. the header. Both entry points (NEW-THIS-WEEK featured + aisle rows) open THIS sheet. */}
          <CosmeticSheet
            item={openItem}
            offline={offline}
            onClose={() => setOpenItem(null)}
            onTopUp={() => {
              setOpenItem(null);
              setView('topup');
            }}
          />
        </>
      }
    >
      {offline ? <Offline variant="strip" message="OFFLINE — PURCHASES NEED A CONNECTION" retrying /> : null}

      {view !== 'browse' ? (
        <View style={styles.returnRow}>
          <TertiaryLink label="Return to store" chevron="leading-back" onPress={goStore} />
        </View>
      ) : null}

      {view === 'browse' ? (
        <BrowseView
          available={wallet?.dailyBonus.available ?? false}
          amount={wallet?.dailyBonus.amount ?? 1}
          ladderStep={wallet?.dailyBonus.ladderStep}
          ladderReward={wallet?.dailyBonus.ladderReward}
          onClaim={onClaim}
          claiming={claiming}
          featured={store?.premiumCosmetics ?? []}
          onAisle={(a) => {
            setAisle(a);
            setView('aisle');
          }}
          onOpen={setOpenItem}
          onTopUp={() => setView('topup')}
        />
      ) : view === 'topup' ? (
        landed ? (
          <LandedMoment
            granted={landed.granted}
            from={landed.from}
            to={landed.to}
            onBack={goStore}
            onTopUpAgain={() => setLanded(null)}
            onViewWallet={() => {
              setLanded(null);
              setView('wallet');
            }}
          />
        ) : (
          <TopUpView
            packs={store?.packs ?? []}
            buying={buying}
            onBuy={buyPack}
            onRestore={onRestore}
            restoreNote={restoreNote}
            starterNote={starterNote}
          />
        )
      ) : view === 'wallet' ? (
        <WalletView balance={balance} offline={offline} onTopUp={() => setView('topup')} />
      ) : aisle ? (
        <AisleView aisle={aisle} onOpen={setOpenItem} />
      ) : null}
    </Header>
  );
}

// ── the persistent header: ScreenHead (title per view) + the CurrencyCounter (dropped in Wallet — the
// hero IS the number there) ──────────────────────────────────────────────────────────────────────────
function Header({
  view,
  balance,
  tick,
  onWallet,
  overlay,
  children,
}: {
  view: StoreView;
  balance: number;
  tick: number | null;
  onWallet: () => void;
  /** C2 (F-13) — sheets/toasts render OUTSIDE the ScrollView (a screen-root sibling), so their scrim
   *  overlays the whole screen and the background scroll can freeze behind them (never inside content). */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const locked = useSheetLocked();
  // decision 0075 (parvati 🎨 — the aisle-header double-print fix): H1 is the generic "STORE AISLE";
  // AisleView's body secTitle (right below it) carries the specific aisle name — was the same string
  // twice (H1 + body), now the H1 is generic and the specific name reads once, as an eyebrow.
  const title =
    view === 'topup' ? 'TOP UP' : view === 'wallet' ? 'WALLET' : view === 'aisle' ? 'STORE AISLE' : 'STORE';
  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <ScreenHead title={title} />
        {view !== 'wallet' ? (
          <CurrencyCounter balance={balance} tick={tick} onPress={onWallet} />
        ) : null}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!locked}
      >
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

// ── P1 Browse ──────────────────────────────────────────────────────────────────────────────────────
function BrowseView({
  available,
  amount,
  ladderStep,
  ladderReward,
  onClaim,
  claiming,
  featured,
  onAisle,
  onOpen,
  onTopUp,
}: {
  available: boolean;
  amount: number;
  ladderStep?: number;
  ladderReward?: { pixels: number; cosmeticId?: string };
  onClaim: () => void;
  claiming: boolean;
  featured: CosmeticListItem[];
  onAisle: (a: { key: string; label: string }) => void;
  /** F-15 fix 4 — raise the screen-root item sheet (lifted to Store so its scrim covers the header). */
  onOpen: (item: CosmeticListItem) => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  // THE INDEX aisle counts (owner-walk polish 2026-07-13; F-2 fix 2026-07-13) — PREMIUM-only tallies
  // from GET /cosmetics, by `type`. The store sells premium; the free baseline lives in the editors
  // (the browse hint says so), and each aisle page stocks premium ItemTiles — so a count that included
  // the free library over-promised against an emptier aisle (parvati P7/P8). Count only PRICED items
  // (premium: `price > 0` / a `tier` present). Absent (loading/error) → AisleIndex plain chevrons.
  const { data: library } = useGetCosmeticsQuery();
  const aisleCounts = useMemo(() => {
    if (!library) return undefined;
    const counts: Record<string, number> = {};
    for (const item of library.items) {
      if (item.price <= 0) continue; // free baseline isn't sold here — don't count it in the aisle
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [library]);
  return (
    <View style={styles.body}>
      <DailyBonusBar
        available={available}
        amount={amount}
        ladderStep={ladderStep}
        ladderReward={ladderReward}
        onClaim={onClaim}
        claiming={claiming}
      />
      {/* the seasonal drop cover (ECON-08) is EXPECTED(P10) — /store.drops is [] at M5, no cover drawn. */}

      {/* NEW THIS WEEK (board P1) — the featured storefront: six premium ItemTiles, each wearing its real
          preview (M5 F-6) + PriceChip, opening its own P2 sheet. Empty-graceful: no featured → the aisle
          index is the browse spine and an honest one-liner stands in. */}
      {featured.length > 0 ? (
        <>
          <Text style={styles.secTitle}>NEW THIS WEEK</Text>
          <View style={styles.rack3}>
            {featured.map((it) => (
              <ItemTile
                key={`${it.type}:${it.id}`}
                name={it.name}
                type={COSMETIC_TYPE_LABEL[it.type]}
                price={it.owned ? undefined : it.price}
                owned={it.owned}
                preview={<CosmeticSwatch type={it.type} id={it.id} size="row" />}
                onPress={() => onOpen(it)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.secTitle}>THE INDEX — ALL AISLES</Text>
      {featured.length > 0 ? null : (
        <Text style={styles.emptyNote}>New premium items arrive as the catalog fills — browse the aisles below.</Text>
      )}
      <AisleIndex onAisle={onAisle} onTopUp={onTopUp} counts={aisleCounts} />
      <Text style={styles.baseHint}>The free baseline isn&apos;t sold here — it lives in the editors.</Text>
    </View>
  );
}

// ── P6 Top Up ──────────────────────────────────────────────────────────────────────────────────────
function TopUpView({
  packs,
  buying,
  onBuy,
  onRestore,
  restoreNote,
  starterNote,
}: {
  packs: StorePack[];
  buying: boolean;
  onBuy: (p: StorePack) => void;
  onRestore: () => void;
  restoreNote: string | null;
  starterNote: string | null;
}) {
  const styles = useStyles();
  const starter = packs.find((p) => p.oneTime);
  const grid = packs.filter((p) => !p.oneTime);
  return (
    <View style={styles.body}>
      <Text style={styles.secTitle}>PIXEL PACKS — THE ONLY DOLLARS IN THE APP</Text>
      {packs.length === 0 ? (
        <Text style={styles.emptyNote}>Packs are on their way — check back shortly.</Text>
      ) : (
        <>
          {starter ? (
            <>
              <PackTile pack={starter} onBuy={() => onBuy(starter)} buying={buying} flash="FIRST PURCHASE ONLY" />
              {starterNote ? <Text style={styles.starterNote}>{starterNote}</Text> : null}
            </>
          ) : null}
          <View style={styles.packGrid}>
            {grid.map((p) => (
              <PackTile
                key={p.productId}
                pack={p}
                onBuy={() => onBuy(p)}
                buying={buying}
                flash={isBestRate(p, packs) ? 'BEST RATE' : undefined}
              />
            ))}
          </View>
        </>
      )}
      <Text style={styles.baseHint}>
        Pixels are earnable free — +1 daily claim &amp; milestones. Packs skip the wait.
      </Text>
      <View style={styles.restoreRow}>
        <TertiaryLink label="↺ Restore purchases" onPress={onRestore} dim chevron="none" />
        {/* B5 (M5 F-9) — what Restore actually does, so it never reads as a refund path. */}
        <Text style={styles.restoreSub}>Reinstalled or new phone? Re-syncs what you own — never refunds.</Text>
      </View>
      {restoreNote ? <Text style={styles.restoreNote}>{restoreNote}</Text> : null}
    </View>
  );
}

// ── P8 Wallet ──────────────────────────────────────────────────────────────────────────────────────
function WalletView({ balance, offline, onTopUp }: { balance: number; offline: boolean; onTopUp: () => void }) {
  const styles = useStyles();
  const negative = balance < 0;
  const [fetchLedger] = useLazyGetLedgerQuery();
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined); // undefined=unloaded, null=end
  const [loadingMore, setLoadingMore] = useState(false);

  // load page 1 on mount (and reset if the balance changed under us — a spend/grant invalidated ['Ledger']).
  const loadFirst = useCallback(() => {
    fetchLedger(undefined)
      .unwrap()
      .then((res) => {
        setRows(res.items);
        setCursor(res.nextCursor);
      })
      .catch(() => setCursor(null));
  }, [fetchLedger]);
  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(() => {
    if (!cursor) return;
    setLoadingMore(true);
    fetchLedger(cursor)
      .unwrap()
      .then((res) => {
        setRows((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [cursor, fetchLedger]);

  return (
    <View style={styles.body}>
      <View style={[styles.balHero, negative && styles.balHeroNeg]}>
        <Text style={styles.balLbl}>YOUR PIXELS</Text>
        <View style={styles.balRow}>
          <Text style={[styles.bal, negative && styles.balNeg]}>{balance}</Text>
          <PixelsMark size={22} />
        </View>
        {negative ? (
          <Text style={styles.balNote}>
            A refund reversed pixels. Earns &amp; packs recover it — nothing you own is taken back.
          </Text>
        ) : null}
        <ScreenButton label="Buy pixels" variant="add" size="mini" onPress={onTopUp} disabled={offline} style={styles.buyPixels} />
      </View>

      <Text style={styles.secTitle}>LEDGER — EVERY EARN &amp; SPEND</Text>
      <View style={styles.ledger}>
        {rows.map((e, i) => (
          <LedgerRow key={e.id} entry={e} last={i === rows.length - 1 && !cursor} />
        ))}
        {rows.length === 0 ? <Text style={styles.emptyNote}>No transactions yet.</Text> : null}
      </View>
      {cursor ? (
        <View style={styles.loadMoreRow}>
          <ScreenButton
            label={loadingMore ? 'Loading…' : 'Load more'}
            variant="secondary"
            size="mini"
            onPress={loadMore}
            disabled={loadingMore}
          />
        </View>
      ) : null}
    </View>
  );
}

// ── P9 Aisle (category page) — REAL premium items from GET /cosmetics; the P2 sheet buys in place ──────
// The aisle STOCKS PREMIUM items (price > 0) of its type — reconciled with THE INDEX counts (F-2:
// premium-only tallies). The free baseline lives in the editors (COSM-02), never here. Tapping a row
// raises the P2 ItemSheet (the item live on your own stuff + the BuyBar); a BUY runs the acquire
// mutation FROM THE SHEET, and on success the sheet flips to OWNED in place (the just-bought moment,
// no reopen). A 409 INSUFFICIENT_BALANCE grows the P5 bridge (short strip + a covering pack + ALL PACKS).
function AisleView({
  aisle,
  onOpen,
}: {
  aisle: { key: string; label: string };
  /** F-15 fix 4 — raise the screen-root item sheet (lifted to Store so its scrim covers the header). */
  onOpen: (item: CosmeticListItem) => void;
}) {
  const styles = useStyles();
  const { data: library, isLoading, isError, refetch } = useGetCosmeticsQuery();

  const items = useMemo(
    () => (library?.items ?? []).filter((i) => i.type === aisle.key && i.price > 0),
    [library, aisle.key],
  );

  if (isLoading) {
    return (
      <View style={styles.body}>
        <Text style={styles.secTitle}>{aisle.label}</Text>
        <Skeleton variant="tile-row" count={4} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.errWrap}>
        <LoadError
          title="Signal Lost"
          message="This aisle didn't answer. Your pixels are safe — this is a connection problem."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.secTitle}>
        FROM THE INDEX — {items.length} {aisle.label}
      </Text>
      {items.length === 0 ? (
        <Text style={styles.emptyNote}>
          This aisle is being stocked — its premium items arrive as the catalog fills. The free baseline
          already lives in the editors.
        </Text>
      ) : (
        <View style={styles.aisleList}>
          {items.map((it) => (
            <AisleRow key={it.id} item={it} onPress={() => onOpen(it)} />
          ))}
        </View>
      )}
      <Text style={styles.baseHint}>The free baseline isn&apos;t sold here — it lives in the editors.</Text>
    </View>
  );
}

// The P2 item sheet + its BUY flow (shared by the aisle rows and the NEW-THIS-WEEK featured grid). Owns
// the acquire mutation, the in-place OWNED flip (justBought), and the P5 insufficient-balance bridge.
// `item` is passed LIVE (re-read from its query on invalidation) so `owned` reflects a just-landed buy.
function CosmeticSheet({
  item,
  offline,
  onClose,
  onTopUp,
}: {
  item: CosmeticListItem | null;
  offline: boolean;
  onClose: () => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  const { data: wallet } = useGetWalletQuery();
  const { data: store } = useGetStoreQuery();
  const { data: device } = useGetDeviceQuery();
  const [acquire] = useAcquireCosmeticMutation();
  const { setPreview } = useStorePreview();
  const balance = wallet?.balance ?? 0;

  const [justBought, setJustBought] = useState(false);
  const [shortBy, setShortBy] = useState<number | null>(null);
  const [buyErr, setBuyErr] = useState<string | null>(null);

  // Reset the transient buy state whenever a different item opens (or the sheet closes).
  useEffect(() => {
    setJustBought(false);
    setShortBy(null);
    setBuyErr(null);
  }, [item?.id]);

  // C7 (F-13) — a shell/theme sheet live-previews on the REAL device chrome: push the previewed id up to
  // the root StoreThemePreview subtree while this sheet is open; clear it on close/unmount (the preview
  // dies with the sheet). Card cosmetics keep their in-sheet CardFace preview (no app-chrome repaint).
  useEffect(() => {
    if (item?.type === 'screen_theme') setPreview({ themeId: item.id });
    else if (item?.type === 'device_shell') setPreview({ shellId: item.id });
    else setPreview({});
    return () => setPreview({});
  }, [item?.id, item?.type, setPreview]);

  const owned = (item?.owned ?? false) || justBought;

  const onBuy = useCallback(() => {
    if (!item) return;
    setBuyErr(null);
    acquire(item.id)
      .unwrap()
      .then(() => {
        setJustBought(true); // the sheet transitions to OWNED in place (no reopen)
        setShortBy(null);
      })
      .catch((e) => {
        const err = e as { data?: { error?: { code?: string; shortBy?: number } } };
        const code = err?.data?.error?.code;
        if (code === 'INSUFFICIENT_BALANCE') {
          setShortBy(err?.data?.error?.shortBy ?? Math.max(0, item.price - balance));
        } else {
          setBuyErr("Couldn't complete — your pixels are safe.");
        }
      });
  }, [item, acquire, balance]);

  // the cheapest pack that covers the gap — the P5 bridge's inline covering tile.
  const bridgePacks = useMemo(() => {
    if (shortBy == null || !item) return [];
    const need = item.price - balance;
    return (store?.packs ?? [])
      .filter((p) => !p.oneTime && p.pixels >= need)
      .sort((a, b) => a.pixels - b.pixels)
      .slice(0, 1);
  }, [shortBy, item, balance, store]);

  return (
    <>
      <ItemSheet
        visible={item !== null}
        item={item ? toStoreItem(item) : null}
        balance={balance}
        owned={owned}
        ownedNote={justBought ? 'Yours — in your editor' : 'In your editor'}
        onClose={onClose}
        onBuy={onBuy}
        buyNote={buyErr ?? previewNoteFor(item?.type)}
        preview={item ? <ItemPreview item={item} deviceShellId={device?.activeShellId} /> : null}
        previewLabel={previewLabelFor(item?.type)}
        shortBy={shortBy}
        bridgePacks={bridgePacks}
        onBuyPack={onTopUp}
        onAllPacks={onTopUp}
        onTopUp={onTopUp}
        celebrate={justBought}
      />
      {/* the sheet's BUY is gated offline by the note; the header offline strip already warns globally. */}
      {offline && item && !owned ? <Text style={styles.emptyNote}>Offline — purchases need a connection.</Text> : null}
    </>
  );
}

/** One aisle row (P9 itemrow) — a preview thumb · name · type · its state chip (OwnedTag or PriceChip). */
function AisleRow({ item, onPress }: { item: CosmeticListItem; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      style={styles.aisleRow}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${COSMETIC_TYPE_LABEL[item.type]}${item.owned ? ', owned' : `, ${item.price} pixels`}`}
      onPress={onPress}
    >
      <View style={styles.rowThumb}>
        <RowThumb item={item} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowType} numberOfLines={1}>
          {COSMETIC_TYPE_LABEL[item.type]}
        </Text>
      </View>
      {/* F-8 (E3-D1): the price/owned chip must stay READABLE — never painted behind the swatch. It's
          `flexShrink:0` so a narrow phone can't squeeze it under the thumb, and `zIndex:1` so it
          always composites in front of the swatch SVG regardless of any overflow. */}
      <View style={styles.rowState}>
        {item.owned ? <OwnedTag /> : <PriceChip pixels={item.price} />}
      </View>
    </Pressable>
  );
}

// The aisle-row thumb — the cosmetic worn on a neutral sample (M5 F-6 note 2): shells/themes reuse the
// device-editor primitives (MiniDevice / ThemeSwatch), card cosmetics render a mini sample card / plate /
// "Aa" swatch. CosmeticSwatch dispatches by type; all are PLAIN Views/SVG (OQ-138), never Skia canvases.
function RowThumb({ item }: { item: CosmeticListItem }) {
  return <CosmeticSwatch type={item.type} id={item.id} size="row" />;
}

// The item-sheet preview slot — the F-10 LIVE inspect (decision 0076). Where the aisle rows/tiles keep
// the lightweight static CosmeticSwatch, the OPEN sheet upgrades to a real live preview: card cosmetics
// render on a live animated skia CardFace (full effect + motion), a screen theme repaints a mock screen
// to the previewed palette, and a shell shows the before→after on the real shell colourways. The single
// CardFace is the ONE live canvas per open sheet the amended OQ-138 budget sanctions (per-row canvases
// stay banned — the aisle still uses CosmeticSwatch).
function ItemPreview({ item, deviceShellId }: { item: CosmeticListItem; deviceShellId?: string | null }) {
  const styles = useStyles();
  if (item.type === 'screen_theme') {
    // P3 — the theme applied live: the ThemePreview subtree repaints the mock screen to the previewed
    // palette (no PATCH, no global repaint), so "PREVIEWING — BERRY" actually shows BERRY.
    return (
      <View style={styles.previewCol}>
        <PreviewStrip name={item.name} onExit={() => {}} />
        <ThemePreview themeId={item.id}>
          <ThemePreviewScreen />
        </ThemePreview>
        <Text style={styles.previewLine}>YOUR WHOLE SCREEN, RESTYLED</Text>
      </View>
    );
  }
  if (item.type === 'device_shell') {
    // P4 — the before→after pair on YOUR pocket (current shell → the new wrap). MiniDevice reads the
    // real SHELL_PALETTES so the "after" wears the actual colourway live.
    return (
      <View style={styles.beforeAfter}>
        <View style={styles.baCol}>
          <MiniDevice shellId={deviceShellId ?? undefined} />
          <Text style={styles.baLbl}>NOW</Text>
        </View>
        <Text style={styles.baArrow}>➔</Text>
        <View style={styles.baCol}>
          <MiniDevice shellId={item.id} />
          <Text style={[styles.baLbl, styles.baLblNew]}>{item.name}</Text>
        </View>
      </View>
    );
  }
  // frame/effect/finish/nameplate/font — LIVE on a neutral sample card (F-10): the ONE animated skia
  // CardFace the open sheet is allowed. Frost shimmers, marquee runs, holographic sweeps — reduce-motion
  // renders the static keyframe (handled inside the render layer). Mounts only while the sheet is open
  // (PulledSheet unmounts its children on close — the canvas budget rule).
  if (isCardCosmetic(item.type)) {
    return (
      <View style={styles.livePreview}>
        <CardFace
          title={item.name}
          composition={sampleCompositionWith(item.type, item.id)}
          width={132}
          height={184}
          animate
        />
      </View>
    );
  }
  // Any other type (defensive) — the static swatch.
  return <CosmeticSwatch type={item.type} id={item.id} size="sheet" />;
}

function toStoreItem(item: CosmeticListItem): StoreItem {
  return {
    id: item.id,
    name: item.name,
    type: `${COSMETIC_TYPE_LABEL[item.type]} · CATALOG`,
    price: item.price,
  };
}

function previewLabelFor(type?: CosmeticListItem['type']): string {
  if (type === 'screen_theme') return 'Your whole screen, restyled — this page is the preview';
  if (type === 'device_shell') return 'New shell, previewed on your device';
  return 'Previewed on your card — live';
}

function previewNoteFor(type?: CosmeticListItem['type']): string {
  if (type === 'screen_theme') return 'Preview free — apply it in the device editor';
  if (type === 'device_shell') return 'Swap shells in the device editor';
  return 'Spends pixels instantly';
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.lg,
  },
  scroll: { paddingBottom: t.space.xl },
  body: { paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: t.space.md },
  returnRow: { paddingHorizontal: t.space.lg, paddingTop: t.space.sm },
  errWrap: { flex: 1, paddingTop: t.space.xxl },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 2, marginTop: t.space.sm },
  emptyNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  baseHint: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: t.space.sm,
  },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  starterNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 0.5 },
  restoreRow: { alignItems: 'center', marginTop: t.space.sm, gap: t.space.sm },
  restoreSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, textAlign: 'center', lineHeight: 13 },
  restoreNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  // Wallet
  balHero: {
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.xl,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  balHeroNeg: { borderColor: t.brand.alert },
  // F-1 fix 3 — breathing room between the balance hero and the BUY PIXELS affordance (the hero's own
  // `gap` is sm; this lifts the CTA clear of the number).
  buyPixels: { marginTop: t.space.md },
  balLbl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bal: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.brand.gold, letterSpacing: 1 },
  balNeg: { color: t.brand.alert },
  balNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 14,
  },
  ledger: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  loadMoreRow: { alignItems: 'center', marginTop: t.space.sm },
  // ── P9 aisle rows ──
  aisleList: { gap: t.space.sm },
  aisleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  // `overflow:'hidden'` clips the swatch SVG to its 46px slot so it can never bleed over the row's
  // meta or its trailing chip (F-8 E3-D1).
  rowThumb: { width: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowMeta: { flex: 1, gap: 3, minWidth: 0 },
  // the trailing price/owned chip — never shrinks, always in front (E3-D1).
  rowState: { flexShrink: 0, zIndex: 1 },
  rowName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1 },
  rowType: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  // NEW THIS WEEK featured grid (board `.rack3`) — a 3-up dense grid of ItemTiles.
  rack3: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  // ── ItemSheet previews (P3 theme · P4 shell before/after · card-cosmetic live CardFace) ──
  livePreview: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  previewCol: { alignItems: 'center', gap: t.space.md, alignSelf: 'stretch' },
  previewLine: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  beforeAfter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.xl },
  baCol: { alignItems: 'center', gap: t.space.sm },
  baLbl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  baLblNew: { color: t.brand.gold },
  baArrow: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent },
}));
