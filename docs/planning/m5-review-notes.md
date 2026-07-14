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

---

## Gate-1 sitting — 2026-07-13 (decision 0074)
Owner sat; watched the F36/reconcile/refund demos live (23/23, real PG). **G-I PASSED · §1-GO
ratified · refund posture signed** (full reversal, tripwire floor, no auto-clawback, operator
escalation, abuse watch-lever) · **generosity amendment signed** → ECON-02 rewritten (start 10 PX ·
7-claim Newcomer Ladder +2/2/3/3/4/5/6 · a free earned-only cosmetic EACH ladder day · newcomer set
owner-picked at the roster pass) → **packet P11 cut + launched.** Remaining owner gates: the
first-article Store walk (P7/P8) · the roster re-tag + newcomer set (P10) · G-J (rides §6).

---

## Owner first-article walk — Store, round 1 (2026-07-13)
Nine notes. Triage: **7 fixes → fix-round F-1** (Top-Up gold (F-02-conformant) · aisle rows taller ·
wallet hero↔BUY spacing · pack borders quieted to Starter+BEST-RATE only · mock-purchase confirm
sheet standing in for the native IAP sheet (absorbs the 🎨 destructive-red confirm — purchase-toned
variant) · LandedMoment pause→celebration (reduce-motion-aware) · CurrencyCounter on
Collection/Profile headers + X-GAMES chip height harmonized (ECON-07's "entry point elsewhere")) ·
**2 answered** (no hold-to-buy visible = premium aisles empty until the roster re-tag, by design ·
Restore = Apple re-sync, consumables never re-granted (0017), App-Store-required). Hold-to-buy
remains OWED-to-test at the roster sitting. P7/P8 stay held until F-1 lands + the owner's re-look.

---

## P7 premium-in-editors + P8 community gallery/adopt · parvati (M5, 2026-07-13)

**Verdict:** 1 🚩 flag · 6 ✅ expected · 3 🎨 polish · (many ✔ matches) — measured vs the M5 DoD
(§8 · §3-P7/P8), the `m5/gallery-manifest.md` enumeration + the m4-review-notes `EXPECTED(M5)` rows
(Styler/Canvas/Device P7 shopping list), the `game-page-states` CARDS-gallery + `styler`/`canvas`/`device`
boards, and the adopt/gallery/share/publish/acquire seams (api-contract 0.60/0.61; decisions
0072/0073/0074/0075).
**Reviewed from:** own real-Chrome `:8082` walk (logged in as `demo@ingame.app`), driven largely via the
a11y tree + `get_page_text` + live DB/ledger reads, because CDP screenshots froze on every animated
surface (see friction note). **This build shipped WITHOUT its crashed builders' BOOT walks — first eyes on
the running result.** **Roster-reality note:** unlike the P6 store-review era, the **P10 roster re-tag
(0075) HAS landed** — premium cosmetics are live entitlements now (chrome/deepsea/bitter owned by demo;
26 premium items tiered) — so P7's premium states are **reachable-live**, not roster-empty-EXPECTED.
**Pre-state found:** a crashed builder had already **adopted the Rival Cut as demo** (card_adoption row,
paid 3 PX, `bitter` entitlement granted) — so I verified the **already-adopted/owned** path renders, per
the task note. **Walk mutations disclosed:** (a) re-confirmed adopt → `ALREADY_ADOPTED` (idempotent, no
charge); (b) **published demo's "Elden Ring — Aurora" card** (`db648bb0`, status→published) to exercise
the Canvas PrintRitual — reversible via CARD-20 unpublish; (c) previewed device theme BERRY → **CANCEL**
(no spend). **Wallet ended 106 PX, ledger reconciles 106==106** (no off-by-one this milestone). Zero
console errors observed across the interactions tracked.

### 🚩 Flag (owed at M5)
- **Adopted card never lands in the "YOUR CARDS" switcher (COL-06)** — ABSENT/COHERENCE — after adopt, the
  success toast and the `ALREADY_ADOPTED` owned-note both assert **"it's in your switcher,"** but it is
  not: on Hollow Knight (where demo owns the adopted Rival Cut) **"YOUR CARDS FOR HOLLOW KNIGHT — 1"**
  shows only demo's own PRIVATE card, and the adopted design appears **nowhere** in the adopter's own
  surfaces. Confirmed structural at the source: the switcher is fed by `listMyCards` → `card-repo.listOwnedDesignsForGame`
  (`card-service.ts:324/337` · `card-repo.ts:68`), which filters strictly on `ownerId = actor` and **never
  unions `card_adoptions`**; the adopt mutation creates no adopter-side `card_designs` row and leaves the
  collection entry's `active_card_design_id` **NULL**. So a Cards-tag invalidation can't surface it — the
  adopted card is unequippable. **The DoD's browse→adopt→equip walk (§8 P8) cannot complete.** → the adopt
  path (or `listMyCards`) must materialize a switcher-visible representation of the adopted grant (a derived
  read that unions adoptions, or an equip pointer), OR the "it's in your switcher" copy is false and must
  change. Parvati reports; this becomes an **OQ** (behavior/contract gap, not a client-only edit). Cite:
  gallery-manifest §Inspect sheet row 4 (OWED · COL-06) · DoD §8 P8 "browse→adopt→**equip**" · board
  `:708` toast "it's in your switcher now (equip it any time)".

### ✅ Expected (deferred / documented-GAP — proceed)
- **No per-component equip readout on the inspect sheet** — the board draws an `equip` row (FRAME·… / FX·…
  / FIN·… / PLATE·…); the built sheet omits it. Cite: gallery-manifest §Inspect sheet row 3 —
  **GAP(no pre-adopt component breakdown on `galleryCardSchema`)**; the wire carries only the summed
  `priceForYou`, so the itemized list is deliberately absent (owner may add a `components[]`). Not a defect.
- **Styler ReconcileSheet funded-path (apply premium → cost-stack → KEEP → confirm-acquire + KeepBeat PX
  line)** — **not walkable in the web lane**: the Styler frame-rail premium swatches (GOLD/PLASMA, tried by
  ref + `scroll_to`+click) did **not register a selection** (save-line stayed "SAVED …s AGO"), so I could
  not reach KEEP. NOTE: this is a web-lane synthetic-event quirk on the Styler skia rail, **not** an
  asserted product bug — the **sibling acquire-batch funded-cart works** (Device KeepBar, below). Owed to
  the owner's device walk to confirm premium frame selection + ReconcileSheet end-to-end.
- **Live block execution** (`POST /me/blocks`) — the **affordance is present** ("Block rival_curator" in the
  sheet overflow; not executed per instruction) but the route may 404. Cite: gallery-manifest §Block —
  GAP(server route not registered at manifest time; P3/SOC tail).
- **Discover trending tap-through** — no Discover surface exists (M6). Cite: gallery-manifest §Discover —
  GAP(no Discover surface).
- **Native share / hold-to-buy feel / PrintRitual motion / reduce-motion** — all owed to the owner's device
  walk (web can only show the fallbacks: SHARE opened the branded PNG in a new tab; the Device KeepBar shows
  "HOLD TO BUY · 6 PX" but the hold gesture + its motion weren't exercised; the PrintRitual's animation
  froze CDP capture). Cite: gallery-manifest §SHARE row 2 (native = EXPECTED P9) · store first-article
  (hold-to-buy OWED-to-test).
- **Gallery SORT** — inert/decorative (no sort param on the wire). Cite: gallery-manifest §Gallery row 1 —
  EXPECTED(later · sort/pagination).

### 🎨 Polish / iteration (built-app visual/DS; owner's eye)
- **PrintRitual success SHARE reads deferred while CARD-21 share is LIVE** — the publish-success ritual
  shows **"↗ SHARE — arrives with card sharing"** (a deferred/disabled placeholder), yet the inspect-sheet
  SHARE **works** (opened the branded share PNG in a new tab). The just-published card is published →
  `/cards/:id/share-image` would serve it. → wire the ritual's SHARE to the now-live `shareCard` util, or
  drop the "arrives" copy. Inconsistent shipped-vs-deferred messaging for the same feature.
- **Store INDEX aisle count over-promises vs the empty aisle** — COHERENCE — THE INDEX now shows live counts
  ("FRAMES · 14 items", etc., a genuine improvement over the P6-review GAP), but tapping FRAMES lands on
  "This aisle is being stocked…" (empty). A user taps "14 items" → empty shelf. The count reads the full
  free+premium catalog while the aisle's buyable ItemTiles aren't wired. Store/P10 lane, tangential to
  P7/P8 — surfaced while passing through. Board `:1328`/`:1344`.
- **Device wears premium shell SUNSET (6 PX) without an owning entitlement** — the device readout wears
  SUNSET (a 6-PX-chipped premium shell) while demo's entitlements are only chrome/deepsea/bitter — no
  KeepBar/lock gates the worn shell the way THEME gates BERRY. Likely a pre-economy shell-pref carry-over;
  owner's call whether worn premium shells must be entitlement-gated at M5. Observation, not a hard flag.

### ✔ Matches (present · placed · behaving · on-aesthetic)
- **P8 CommunityGallery cell** — flattened `FlatCardImage` thumb (the Rival Cut art, RN `<Image>` not skia),
  "BY RIVAL_CURATOR", gold cell edge, foot row **FREE** chip + **1×** AdoptCount. Personalized price is
  correct: **FREE** because demo owns `bitter` (the stale pre-login tab's "3 / 0×" was a cache artifact;
  the live logged-in gallery reads FREE / 1× — matching the DB: 1 adoption, demo entitled). The M3 "arrives
  in a later release" placeholder is correctly **replaced** by the live gallery.
- **Inspect sheet** — head "COMMUNITY CARD — HOLLOW KNIGHT — RIVAL CUT" + ✕ · large flattened render ·
  "DESIGNED BY RIVAL_CURATOR · ADOPTED 1×" · overflow ⋯ carrying **"Block rival_curator"** · adopt bar
  "ADOPT — THE WHOLE CARD" + "You get the image, not the layers." (CARD-15) + **ADOPT · FREE** · SHARE ·
  free-adopt hint.
- **ADOPT → FREE-path ConfirmSheet** — "ADOPT THIS CARD?" + "It's free — the designer earns clout, not
  currency." + ADOPT/CANCEL, **no debit line** (correct FREE path).
- **ALREADY_ADOPTED owned state** — confirming adopt (already-owned) collapses the adopt bar to
  **"✓ YOU ALREADY HAVE THIS CARD — it's in your switcher."** — renders correctly, idempotent, no charge.
- **SHARE web fallback** — opened the branded share PNG (blob URL, 224×353 portrait) in a new tab — the
  documented web path (authenticated blob → object URL → new tab).
- **Empty-gallery SectionEmpty** (Elden Ring, pre-publish) — "NO COMMUNITY CARDS YET / Be the first to
  design a card for this game — the community gallery starts with you." + **DESIGN A CARD** door.
- **P7 Styler premium states** — PX **CurrencyCounter (106)** · PriceChips on unowned premium (GOLD 3 ·
  ORNATE GOLD 3 · EMBER GLOW 3 · PLASMA 3 · MARQUEE 8) · **✓ OwnedTag on CHROME** (demo owns it). Pays
  down the m4 `EXPECTED(M5)` price-chip/owned-tag/counter rows.
- **P7 Canvas publish thread** — PRESS ▸ → **"THE PRESS — WHERE DOES IT GO?"** with the CARD-19 checklist
  (**✓ Enough to stand on its own** · **◇ Checked against the gallery on publish** · **✓ Premium components
  owned**) + SAVE PRIVATE / TO THE STYLER → ◆ PUBLISH → **PrintRitual fires** ("THE PRESS RUNS · PUBLISHED
  · ◆ PUBLISHED FOR ELDEN RING · it's in the community gallery now · **18 CARDS DESIGNED** · 0 ADOPTIONS")
  → threaded to P3 live (card db648bb0 published, contributor stat ticked).
- **P7 Device premium states + KeepBar** — PX CountTag (106) · SHELL chips (GRAPE free · **SUNSET 6 · PINK
  6 · CARBON 8**) · THEME chips (**✓ OwnedTag DEEP SEA** · BERRY/MINT/LILAC 6 · MIDNIGHT/PAPER free) +
  "LEGIBILITY FLOOR HELD · SHELL STAYS SUNSET" · applying BERRY → **KeepBar cart**: "PREVIEWING PREMIUM · 6
  TO KEEP · BERRY 6 PX · YOU HAVE 106 PX · keep all 1 · **HOLD TO BUY · 6 PX** · CANCEL" → **CANCEL**
  reverted cleanly (theme back to MIDNIGHT, no spend).
- **Contributor stats live** — rival's `totalAdoptions = 1` (DB, post-adopt) · demo's designed count ticked
  to 18 on publish.
- **Wallet ledger honesty** — the adoption's `acquire −3 · cosmetic · bitter` row present; balance 106
  derives exactly from the ledger (no M4-style off-by-one).
- **CROSS — store aisle header fixed** — H1 reads **"STORE AISLE"** + aisle-name eyebrow "FRAMES" (the
  P6-review double-print is resolved); THE INDEX aisle counts now render.

**Workflow friction (doctor-nick):** the MCP Chrome window lived **whole-hidden** (`document.visibilityState:
hidden`) — the runbook's known freeze. The user32 foreground P/Invoke (ShowWindow+SetForegroundWindow, even
topmost-pin) **did not hold** — focus was stolen back within ~1s every time, so CDP `captureScreenshot`
timed out on nearly every animated RN-web/skia surface (gallery cell + a few static views captured; sheets,
Styler, Canvas, Device did not). Ran the whole walk off the **a11y tree + `get_page_text` + live DB/ledger
reads**, which never froze. Second friction: **Styler frame-rail premium swatches don't register synthetic
ref/coordinate clicks** (device swatches + all nav/dialog buttons do) — blocked the in-Styler ReconcileSheet
walk. Both belong in the "owed to the owner's device walk" bucket (native taps + reduce-motion + hold-to-buy
feel + PrintRitual motion). Candidate runbook addition: *foreground P/Invoke no longer holds on this box —
prefer a11y-tree-driven walking over screenshots for RN-web QA; the device-walk is the visual gate.*
