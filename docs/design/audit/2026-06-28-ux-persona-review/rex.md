# Rex — adversarial + impatient power user

*How do I break it, abuse it, drain it, or get stuck?* Tags `[P]/[B]`, sev major/minor. Skipped token nits.

Up front: lifecycle hygiene is unusually good — skeleton/offline/load-error on nearly every screen,
hold-to-buy, refund-reversal, mod non-disclosure, cooldowns. So I hunted the **seams**: self-reported
stats, report-bombing, dedup spam, double-submit, one-tap destructive social.

## 1 · welcome-auth
- [B][major] live username availability (W3 :595) = enumeration oracle, no bot guard → throttle, don't instant-confirm.
- [B][major] W4 "email taken" (:633) leaks registered emails → neutral copy both ways.
- [B][minor] age "13+" passive footer (:463) → log consent ts. Reset expired loops W7 (:937) no resend cap → cap/hr.

## 2 · onboarding · 3 · collection
- [B][minor] notif O7 one-shot (:880); verify O6→O7 debounced. Bulk popular-rail add uncapped (low harm).
- [B][minor] coll friend offline drawn; reorder long-press no offline-gate note (:1736) → confirm queue write.

## 4 · add-game
- [B][major] "CREATE ANYWAY" one-tap bypasses dedup, no creation rate-limit (add-game:1125) → cap creates/day + soft-queue suspicious.
- [B][minor] adopt 1 PX no confirm on fan → cheap repeat-drain.

## 5 · styler · 6 · canvas
- [B][minor] HOLD ACQUIRE gated when short (:991); OQ-046 a11y non-hold owed (:1014) → no-hold users can't buy.
- [B][minor] canvas DELETE slip no confirm (:715) → fat-finger nukes layer (undo-only). Cap 9/30 + PRESS offline-gate good.

## 7 · game-page
- [B][major] **HOURS is free numeric (:554), no sanity cap** → inflate to 1.2M; feeds compare, Top-5, leaderboard, store earned-only trophies → fake-stat farming. Cap/anomaly-flag.
- [B][minor] soft-hidden card non-disclosed + fallback (:1208) — excellent.

## 8-9 · device / discover
- [B][minor] device reconcile+bridge after KEEP, offline-gated — no drain hole. Up Next uncapped (low harm).

## 10 · friends
- [B][major] UNFRIEND SILENT fires from sheet, no confirm (:653) → frantic tap severs (cooldown to undo). Add confirm.
- [B][minor] BLOCK straight to action (:656), C2 post-confirm mitigates double-tap.

## 11 · find-add · 12-13 · compare/lists
- [B][minor] re-request 26d cooldown good; invite token no expiry/cap (:560) = harvestable.
- [B][minor] compare hidden hours never leak (:608) — clean (but #7 inflation wins here). lists cap 5 good; SAVE overwrite no confirm (low).

## 14 · store
- [B][major] **refund→negative**: "reversed 30 PX, nothing you own taken back" (:1292) → buy pack, spend on permanents, refund pack, keep items, owe negative = free cosmetics → clawback/lock on reversal.
- [B][minor] only HOLD confirms spend (:752), no idempotency → mid-grant drop double-spends. Daily +1 no clock-guard (:605). earned-only trophies (:1358) ride inflatable stats.

## 15-19 · profile / contributor / achievements / settings / report
- [B][minor] blocked/suspended/deleted collapse to one unavailable (:1196) — correct. delete S7 ConfirmSheet strong (:642); rename 30d good; resend no cap.
- [B][major] **report-bombing**: required details good (:514) but no per-reporter cap; coordinated reports soft-hide rivals (hidden thresholds) → rate-limit + dedupe reporters.

## 20 · admin
- [B][minor] SuspendSheet logged/reversible/appeal (:846), HIDE logged, MERGE re-points, restore window — strong. Offline gates writes (acceptable).

## TOP 5 Rex risks
1. Self-reported HOURS, no cap (game-page:554) — one field rots compare/Top-5/achievements/store.
2. Refund→keep items→negative balance (store:1292) — free cosmetics.
3. Report-bombing soft-hides cards (report:514, game-page:1208) — no reporter cap.
4. CREATE ANYWAY + no creation cap (add-game:1125) — catalog pollution.
5. One-tap silent UNFRIEND/BLOCK, no pre-confirm (friends:653/656).

## States the app forgot to draw
- Spend double-tap / idempotency ("already processing") on mid-grant drop (store P7).
- Report/create/adopt rate-limit caps (cooldowns exist only for requests + rename).
- Hours/stats validation rejection / pending-review (game-page M2).
- Block/unfriend confirm (delete got one; social destroys didn't).
- Daily-bonus clock-abuse guard. Invite-token expired/spent/revoked sad-path.
