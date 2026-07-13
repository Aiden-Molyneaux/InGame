# M5 — Parvati review notes

> Per-screen build-vs-design verdicts, appended by parvati as each M5 surface exits its loop
> (`m5-build-task.md` §2). **A surface without a filed report here is not done, by definition —
> and this file being empty at a milestone exit is itself a red flag.** Same conventions as
> [`m4-review-notes.md`](m4-review-notes.md); measured against the surface's
> `docs/planning/m5/<surface>-manifest.md` (never an improvised enumeration), at the **M5
> calibration: divergence-from-board = 🚩 FLAG; EXPECTED requires the manifest's cite; 🎨 POLISH is
> reserved for token-level slips in the built app**.
>
> **The 0072/0073 §0.2 roster-reality governs this milestone's store surface more than any other.**
> The store board draws a rich premium storefront (drop cover · NEW-THIS-WEEK grid · priced aisles ·
> item sheets · the can't-afford bridge · ownership rows) that **has no server content at M5** by
> construction (`/store.premiumCosmetics` + `.drops` are `[]`, `GET /cosmetics` unregistered, the
> cosmetic registry empty). So most ABSENT findings on this surface resolve to **EXPECTED(roster-empty)**
> per the manifest, not FLAG — the components are built + unit-tested; live reachability is EXPECTED(P4/P10/M7).

<!-- parvati appends per-surface verdicts below, most recent last -->

---

## Store + Wallet (§3-P6 — THE FIRST ARTICLE) · parvati (M5, 2026-07-12)

**Verdict:** 1 🚩 flag · 14 ✅ expected · 1 🎨 polish · (many ✔ matches) — measured vs the M5 DoD
(§8 · §3-P6), the `store-manifest.md` enumeration, the `store/store-states.html` board (P1 browse · THE
INDEX · P6 Top Up · P7 landed · P8 Wallet · P9 ownership/aisle · P10–P12 lifecycle), and the
`/store` · `/me/wallet[/ledger]` · `/me/daily-bonus` · `/iap/validate` · `/me/entitlements` seams
(api-contract 0.59).
**Reviewed from:** own real-Chrome `:8082` screenshots (mobile-preset viewport, rendered wide) + live
API/DB reads for the data-coherence checks. **Walk:** login → STORE gold keycap → browse (claimed daily +
THE INDEX honest-empty premium) → PIXELS → **TOP UP** (5-pack ladder + value-math + starter) → **BUY the
$1.99 / 10-pack** (mock receipt → `/iap/validate`) → **P7 LandedMoment** (+10, 67→77, header ticked) →
**VIEW WALLET** (hero + full ledger) → **RETURN → STICKER PACKS aisle** (honest-empty). Zero console errors
across the walk. **Live state found:** balance 67→77 after the mock BUY · today's daily bonus **already
claimed** (available:false — so the claimed/quiet DailyBonusBar is the state under review, not the
unclaimed CLAIM; reported as found per the task) · `premiumCosmetics`+`drops` both `[]` · entitlements `[]`.
**Environment note (doctor-nick):** the in-app Browser pane (`mcp__Claude_Browser__*`) hung on every
screenshot at this RN-web surface (the known rAF-throttle) — the walk ran on the real-Chrome extension
(`mcp__claude-in-chrome__*`) instead; a **hard `navigate` to `/store` dropped the session** (full reload,
redux-persist not rehydrated) → in-app keycap navigation only, per the web-loop lesson.

### 🚩 Flag (owed at M5)
- **Wallet balance ↔ ledger reconcile — off by 1 PX** — COHERENCE — the P8 Wallet hero reads **77** but the
  sum of **all** visible ledger rows is **76** (+10 pack · +30 pack · +1 daily · +30 pack · +5 starting
  grant). Confirmed at the source: the demo wallet row = 77, `SUM(currency_ledger.delta)` for the account =
  76 (a persistent +1 with no backing ledger row; it predates my BUY — pre-BUY it was balance 67 vs ledger
  66). This is exactly the **ledger↔balance-derivable invariant** P1's **G-I** gate signed ("the balance is
  always derivable from the ledger"), and it surfaces on the one surface where **wallet-history honesty is a
  gate-5 taste item** — a user who sums their own history gets a number 1 short of the hero. **The P6 client
  is faithful** (it renders `/me/wallet.balance` and the ledger rows exactly as served) — the fix is
  **server/seed-side** (a P1 ledger-service off-by-one, or, more likely, the `db:seed-dev` demo wallet
  hand-setting a balance that its seeded ledger rows don't derive). → re-derive the demo wallet balance from
  its ledger (or add the missing row), and run the P1 reconcile-assertion helper across the seed shelf.
  Parvati reports; this becomes an **OQ** (server/economy change-class, not a P6 client edit). Cite: manifest
  "the balance is always derivable from the ledger" (P1 §Ledger service) · DoD §8 G-I · board P8 `:1284–1292`.

### ✅ Expected (deferred / roster-empty — proceed)
- **Drop cover (ECON-08 seasonal)** — ABSENT — `/store.drops` is `[]`. Cite: manifest P1·2 / EXPECTED(P10).
- **NEW THIS WEEK premium grid** — ABSENT (section omitted; replaced by the graceful "New premium items
  arrive as the catalog fills — browse the aisles below." line) — `/store.premiumCosmetics` is `[]`. Cite:
  manifest P1·3 / EXPECTED(P4/P10). *(Empty-graceful omission is the right call — no invented cosmetic art.)*
- **Per-aisle counts (THE INDEX)** — the 9 taxonomy rows render with a plain `›`, no `n ›` count — no
  `GET /cosmetics` list source exists. Cite: manifest P1·4 / GAP(no aisle-count source).
- **P1b drop drawer** — unreachable-live (no drop exists to open). Cite: manifest P1b / EXPECTED(P10).
- **P2/P2b item detail sheet · PreviewStage · BuyBar hold-to-buy** — unreachable-live: `premiumCosmetics`
  is `[]` so there is **no ItemTile to tap** and no acquirable cosmetic (registry empty → 404 on every id).
  Components OWED + fake-timer unit-tested per manifest; the live walk is EXPECTED(P4). Cite: manifest P2·1–2.
- **OQ-046 non-hold accessible BUY path (reduce-motion → ConfirmSheet)** — not walkable live (same
  unreachability — no item sheet to reach). Both BUY paths are the launch gate, built + unit-tested per
  manifest; live verification EXPECTED(P4 roster). Cite: manifest P2·3 / OQ-046. **Owed on device:** a manual
  reduce-motion pass once an acquirable item exists (the a11y ConfirmSheet destructive-red confirm is the
  already-filed 🎨 to re-check then).
- **P3 whole-page theme preview · P4 device-shell preview** — unreachable-live (no premium theme/shell
  acquirable). Cite: manifest P3/P4 / EXPECTED(P4 roster).
- **P5 can't-afford bridge (`INSUFFICIENT_BALANCE {shortBy}`)** — unreachable-live (no acquirable item can
  409). Cite: manifest P5 / EXPECTED(P4).
- **P7 failure Toast + Restore "all caught up" line** — the success LandedMoment was walked; the failure
  Toast wasn't triggered (would need a forced `/iap/validate` failure) and Restore wasn't fired to avoid
  ledger noise. Both OWED components per manifest; not defects. Cite: manifest P7·2/·3.
- **P8 ECON-09 negative-balance variant + refund_reversal / admin_adjustment ledger rows** — unreachable-live
  (balance is positive; no reversal/adjustment rows exist for the demo account). Components OWED + unit-tested;
  live needs a seeded negative/reversal state. Cite: manifest P8·3 / EXPECTED.
- **P9 ownership item rows (OwnedTag/LockedTag/PriceChip) + TROPHY SHELF (EarnedOnlyTag)** — the aisle page
  renders **honest-empty** ("This aisle is being stocked…") — `/me/entitlements` is `[]` and no `GET /cosmetics`
  lists an aisle. Components OWED; content EXPECTED(P4/P10 roster · M7 earned). Cite: manifest P9·1/·2.
- **P10 Skeleton · P11 LoadError · P12 Offline** — not walked (would need the API stopped / a forced fetch
  failure / a write-while-offline; out of scope for a clean first-article walk). Lifecycle kit reused from
  P5 per manifest C4; unit-tested. Cite: manifest C4 / EXPECTED-not-walked-this-run.

### 🎨 Polish / iteration (built-app visual/DS)
- **Aisle page — the H1 title and the eyebrow both read the aisle name** — on the aisle sub-view the
  ScreenHead reads "STICKER PACKS" and the section eyebrow immediately below **also** reads "STICKER PACKS"
  (a redundant double-print of the same string, ~one line apart). Reads as a placeholder-eyebrow left in.
  → drop the eyebrow (the H1 already names the aisle) or replace it with the category descriptor. Not a
  blocker (honest-empty aisles are EXPECTED anyway). Owner's eye. Board P9 aisle head `:1344`.

### ✅ Matches (present · placed · on-aesthetic)
- **STORE nav-slot goes live** (C1) — the leftmost keycap is permanently **gold** and **active** on every
  `/store*` view (browse · topup · wallet · aisle), and a keypress navigates there. Matches board nav-band /
  design-spec §2.3 "keycap permanently gold".
- **ScreenHead + CurrencyCounter** (C2) — "STORE" head + the gold **◇ 67** counter reading `/me/wallet.balance`;
  after the mock BUY it **ticked 67→77** live (counterTick). Board `:529`.
- **Flow sub-views + RETURN TO STORE** (C3) — Top Up · Wallet · aisle each render in-screen with a
  "‹ RETURN TO STORE" link and the STORE keycap stays gold-active throughout (destinations OF the store, not
  tab routes). Board `:1131`.
- **DailyBonusBar — claimed/quiet state** (P1·1) — "✓ CLAIMED — BACK TOMORROW" + "+1 PX landed in your wallet
  ledger", the bar gone quiet (today already claimed, idempotent per UTC-day). Board `:619–627`.
- **THE INDEX — all aisles** (P1·4) — the COSM-01 taxonomy in the **correct order** (STICKER PACKS · EFFECTS ·
  FINISHES · FRAMES · NAMEPLATES · FONTS · DEVICE SHELLS · SCREEN THEMES · **PIXELS → TOP UP**), the PIXELS row
  a live gold "TOP UP ›" door. Board `:594–605`.
- **Free-baseline hint** (P1·5) — "The free baseline isn't sold here — it lives in the editors." Board `:606`.
- **Top Up — starter + 2×2 pack grid + value-math** (P6·1) — STARTER (gold-outlined, "FIRST PURCHASE ONLY",
  "≈ 12.1 PX per $ — 2.4× the base rate, once ever", 12 ◇ / $0.99) + 10 ("Base · ≈ 5.0 PX/$") · 30 ("+20% more
  PX/$") · 65 ("+30%") · 140 ("+40%", **BEST RATE**). **Every value line arithmetically correct** against the
  0072 ladder; $ on **cream** ScreenButton/secondary keycaps, PX + pixels-mark in **gold** (0069). Board
  `:1133–1147`. *(The consumable 30-pack carries `purchased:true` on the wire but correctly renders buyable,
  not dimmed — only the oneTime starter would dim; coherence checks out.)*
- **BUY a pack (mock) → live grant** (P6·2) — tapping $1.99 minted a mock receipt → `/iap/validate` → +10 PX,
  balance 67→77, `pack_purchase` ledger row landed. Board `:1150–1162`.
- **Restore Purchases + free-earn hint** (P6·3/·4) — "↺ RESTORE PURCHASES" link + "Pixels are earnable free —
  +1 daily claim & milestones. Packs skip the wait." both present. Board `:1148–1149`.
- **P7 LandedMoment** — a single clean beat: gold "PACK LANDED · RECEIPT VERIFIED" eyebrow · "+10 ◇" (display
  scale) · "67 → 77" arithmetic · one gold rule · "Logged in your wallet ledger." · BACK TO STORE (cream) +
  VIEW WALLET ›. **No pack grid** (OQ-040). Header counter glows/ticks. Board `:1202–1212`.
- **P8 Wallet balance hero** (P8·1) — "YOUR PIXELS" + big gold "77 ◇" + **BUY PIXELS** gold keycap; the header
  counter is **correctly dropped** here (the hero IS the number). Board `:1277–1282`.
- **P8 LedgerRow history** (P8·2) — "LEDGER — EVERY EARN & SPEND" + rows with signed gold **+** badge · label ·
  "TODAY HH:MM" · green "+N ◇": PIXEL PACK ×3 · DAILY BONUS · CLAIMED IN STORE · STARTING GRANT. Board
  `:1284–1292`. *(Labels are generic — the pack rows all read "PIXEL PACK" with no pack-size/name join; this
  is the **known-filed** no-name-join item, **confirmed**, not a new finding.)*
- **P9 aisle honest-empty** — the aisle page renders graceful-empty with the head + return link + counter
  intact; no invented cosmetic art. Board P9 `:1328`.

**Known-filed items — confirmed (not re-discovered):** premium storefront honest-empty (EXPECTED — drop
cover + NEW-THIS-WEEK + aisle rows all empty-graceful) ✓ · ledger generic labels / no name-join ("PIXEL PACK"
un-sized) ✓ · `store_products` dev-seed GAP (packs render because the BOOT walk seeded the 0072 ladder as
data; `db:seed-dev` still doesn't — the P10 seed owns it permanently) ✓ · the ConfirmSheet destructive-red
confirm on the a11y BUY path (already-filed 🎨) — **not re-verifiable this walk** (BUY path unreachable-live),
carried to the P4-roster device pass.

**Suite context (not parvati's lane, noted for the owner):** the 1 🚩 is a **data/seed** coherence gap, not a
P6-client build defect — the store client faithfully renders what the economy layer serves. The first-article
client surface itself is clean: every OWED-live flow (counter · daily-claim state · Top-Up · mock BUY · landed
moment · wallet + ledger · flow-nav) renders, places, and functions to the board. **→ the P6 first-article
owner walk can proceed;** the 🚩 routes to the server/economy lane (P1/P10 seed) as an OQ, and the 🎨 to the
iteration lane.

---

**🚩-1 RESOLUTION (orchestrator, 2026-07-12, same night):** traced to a hand-made hole, not a code
defect — the P6 builder deleted a `daily_claim` ledger row on the shared dev DB (to re-enable the
bonus for its BOOT walk) without adjusting the balance; every subsequent op carried the +1 forward.
The ECON-07 invariant is intact in code (211 integration tests incl. reconcile). Fix: demo balance
re-derived from its ledger (76 == 76, verified). Lesson filed to qa-runbook: **never hand-delete
ledger rows on the shared dev DB** — the ledger is append-only by design; use the service ops
(`adjustPixels`) or a disposable DB. 🚩 CLOSED. The 🎨 items (aisle double-print · ConfirmSheet
destructive-red on the a11y buy path) ride to the owner's first-article walk.
