import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { LedgerEntry, StorePack } from '@ingame/shared';
import { ScreenHead } from '../src/components/ScreenHead';
import { ScreenButton } from '../src/components/ScreenButton';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { LoadError } from '../src/components/lifecycle/LoadError';
import { Skeleton } from '../src/components/lifecycle/Skeleton';
import { Toast } from '../src/components/lifecycle/Toast';
import { Offline } from '../src/components/lifecycle/Offline';
import {
  CurrencyCounter,
  DailyBonusBar,
  AisleIndex,
  PackTile,
  LedgerRow,
  LandedMoment,
  PixelsMark,
  isBestRate,
  usdFor,
} from '../src/components/commerce';
import { themedStyles } from '../src/theme';
import { useAnnounceOnChange } from '../src/a11y/announce';
import { mintMockReceipt } from '../src/store/mockReceipt';
import {
  useGetWalletQuery,
  useGetStoreQuery,
  useGetCosmeticsQuery,
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
  // F-1 fix 7 — the header PX counter on Collection/Profile doors straight into the Wallet view
  // (`/store?view=wallet`); any other entry lands on Browse.
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<StoreView>(viewParam === 'wallet' ? 'wallet' : 'browse');
  const [aisle, setAisle] = useState<{ key: string; label: string } | null>(null);
  const [tick, setTick] = useState<number | null>(null);
  const [landed, setLanded] = useState<LandedState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [starterNote, setStarterNote] = useState<string | null>(null);
  const [pendingPack, setPendingPack] = useState<StorePack | null>(null); // F-1 fix 5 — the mock IAP confirm
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
          hasPremium={(store?.premiumCosmetics.length ?? 0) > 0}
          onAisle={(a) => {
            setAisle(a);
            setView('aisle');
          }}
          onTopUp={() => setView('topup')}
        />
      ) : view === 'topup' ? (
        landed ? (
          <LandedMoment
            granted={landed.granted}
            from={landed.from}
            to={landed.to}
            onBack={goStore}
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
      ) : (
        <AisleView label={aisle?.label ?? ''} />
      )}

      {toast ? (
        <Toast
          message={toast}
          tone="error"
          onRetry={undefined}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      {/* F-1 fix 5 — the mock Apple payment sheet: a purchase-toned confirm (NOT destructive-red)
          echoing the P6 Face-ID framing. In production the native StoreKit sheet replaces this. */}
      {pendingPack ? (
        <ConfirmSheet
          visible
          tone="purchase"
          title="CONFIRM PURCHASE"
          message={`${usdFor(pendingPack.productId) ?? '$—'} will be charged to your Apple account for ${pendingPack.pixels} pixels.`}
          confirmLabel={`Pay ${usdFor(pendingPack.productId) ?? ''}`.trim()}
          busy={buying}
          onConfirm={confirmPending}
          onClose={() => setPendingPack(null)}
        />
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
  children,
}: {
  view: StoreView;
  balance: number;
  tick: number | null;
  onWallet: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
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
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
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
  hasPremium,
  onAisle,
  onTopUp,
}: {
  available: boolean;
  amount: number;
  ladderStep?: number;
  ladderReward?: { pixels: number; cosmeticId?: string };
  onClaim: () => void;
  claiming: boolean;
  hasPremium: boolean;
  onAisle: (a: { key: string; label: string }) => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  // THE INDEX aisle counts (owner-walk polish 2026-07-13) — the full library from GET /cosmetics,
  // tallied by `type`. Absent (loading/error) → AisleIndex falls back to plain chevrons.
  const { data: library } = useGetCosmeticsQuery();
  const aisleCounts = useMemo(() => {
    if (!library) return undefined;
    const counts: Record<string, number> = {};
    for (const item of library.items) counts[item.type] = (counts[item.type] ?? 0) + 1;
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

      <Text style={styles.secTitle}>THE INDEX — ALL AISLES</Text>
      {/* the NEW-THIS-WEEK premium grid is EXPECTED(P4 roster) — /store.premiumCosmetics is [] at M5, so
          the aisle index is the live browse spine. A one-line honest note stands in for the empty grid. */}
      {hasPremium ? null : (
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

// ── P9 Aisle (category page) — honest-empty at M5 (no GET /cosmetics; roster re-tag = P4) ─────────────
function AisleView({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.body}>
      <Text style={styles.secTitle}>{label}</Text>
      <Text style={styles.emptyNote}>
        This aisle is being stocked. Its items arrive as the catalog fills — the free baseline already
        lives in the editors.
      </Text>
    </View>
  );
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
  restoreRow: { alignItems: 'center', marginTop: t.space.sm },
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
}));
