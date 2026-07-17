# M6 Entry Decision Log — the §0 gate receipt

> The [m6-build-task §0](m6-build-task.md) entry-gate receipt (template: the M5 log). Filed as a
> skeleton 2026-07-16; **✅ GATE CLOSED same day** — the owner ratified all twelve rulings as
> recommended ("I'll take your recommendations"). Authority: decisions
> [0076](../decisions/0076-m6-entry-gate-rulings.md) (the gate) +
> [0077](../decisions/0077-m6-ach-starter-content.md) (the §0.4 content picks);
> DoD = m6-build-task §8.

**No M6 surface build starts until:** (a) this gate is landed **✅ DONE (2026-07-16)** **and**
(b) the §1 friend-fabric spike GO (the first build act — launched at gate close, budget-capped,
go/no-go = the first owner checkpoint).

## The rulings

| §0 | Item | Ruling | Recorded in |
|---|---|---|---|
| 0.1 | **Friend-read class** (gate-3) | RATIFIED — `SYS-01-FRIEND-READ` + `friendScoped()` + allowlist shapes + the MOD-09 byte-identical unavailable-collapse; statement-scoped lint; G-D re-fires at P1 | 0076 · product-spec 0.60 (SYS-01) |
| 0.2 | **OQ-146** equipped readout | RATIFIED — publish-time label denormalization (+ backfill); lands M6 P2 | 0076 · api-contract 0.69 · OQ-146 resolved |
| 0.3 | **OQ-145** deletion posture | RULED (implement M8) — status-flip never DELETE · `authorShapeFor` wired · PII kept-set = keep financial rows, anonymize user · beta ships without in-app deletion (support-channel path in the welcome note) | 0076 · OQ-145 annotated (stays open for M8/G-N) |
| 0.4 | **ACH pull-forward + content** | RATIFIED — engine full on the ACH-08 spine; **content picks = 0077** (12 milestones + 6 eggs; B7 prod-target owed at beta-content deploy; A14 slot empty until the content pass); ECON-05 milestone half rides it; celebration in-app only (push M7) | 0076 + **0077** · product-spec 0.60 · OQ-004 annotated |
| 0.5 | **Report slice** (E8b) | RATIFIED — capture-only + ReportSheet + Block cross-link; auto-hide/queue/console M7 | 0076 · product-spec 0.60 changelog |
| 0.6 | **SOC-10 invites + OQ-096** | RATIFIED — AUTH-LOOKUP class · signed token · TTL 7d · cap 5 · multi-redeem · beta fallback = QR + static-landing URL; share-link half → M8 | 0076 · api-contract 0.69 · OQ-096 invite-half resolved |
| 0.7 | **Refusal codes + buckets** (G-K async) | RATIFIED — the 8-code 409 family · the five buckets · queue cap 50 (`LIST_FULL`) · cooldown 7d | 0076 · api-contract 0.69 · OQ-097 fully closed |
| 0.8 | **Discover M6 slice** | RATIFIED — UP NEXT full · DISCOVER browse-only · notify-me → M7 · CAT-12 rail on Add Game | 0076 |
| 0.9 | **AUTH-01 breach check** | RATIFIED — HIBP range/k-anonymity · fail-open + telemetry · SYS-04 kill-switch | 0076 · product-spec 0.60 (AUTH-01) |
| 0.10 | **Settings M6 slice** | RATIFIED — lean-list shell + BLOCKED page + sign-out home; notifications/feedback M7 · delete row M8 | 0076 |
| 0.11 | **Beta mechanics** (0071) | RATIFIED — alpha wave (close friends, TF internal) on the first EAS build · external group + Beta App Review early · group chat = the beta channel · 12-Android quota recruits beyond the cohort · safety-rail acceptance at the exit sitting | 0076 |
| 0.12 | **Deferred-carryover table** | RATIFIED — OQ-136 → onboarding-era · OQ-140 ⟨stretch⟩ again · **OQ-142 resolved** (~6/zone cap ratified) · **worn-premium-shell → GATED** (one-time data fix resets un-entitled worn rows, rides P1's migration window) · store INDEX honesty → P10 lane · OQ-143 rides the next design-spec touch | 0076 · product-spec 0.60 (DEV-03) · OQ-136/140/142 annotated |

## Owner-lane kickoffs (scheduled at the sitting — the owner's week)
- **R2 + hosting provisioning sitting** (~60 min — the pre-beta blocker; API host + managed PG ride it) → P15/G-C.
- **EAS first build** → the alpha wave installs (P16).
- **Android device buy** (provisioning #2) · **Play-tester recruiting toward 12** (#9) · **watch the Google email** (→ #3–#5 → P14/G-J).
- ~~The §0.4 content taste pass~~ **DONE at this gate** (0077 — the sheet's recommendations taken; the one residue = B7's production target game, a 30-second nod at the P16 welcome-note sitting).

## Health
`/health` re-run after the 0076/0077 doc-graph bumps (product-spec 0.60 · api-contract 0.69 ·
OQ sweep) → recorded in the gate-close commit.
