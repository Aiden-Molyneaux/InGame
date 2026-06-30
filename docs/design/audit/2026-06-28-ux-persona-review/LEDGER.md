# LEDGER — UX persona loop (cumulative) · ✅ CONVERGED & CLOSED (run 8/8)

**Loop complete.** 61 rows (L001–L061). 17 behaviors staged as OQ-086..102 (086–090 already accepted into
`open-questions.md`; 091–102 await batch triage). Runs 6–8 effectively dry — surface saturated. Next free OQ = OQ-103.
Highest-regret unresolved: L001 hours-cap, L051 privacy-gating, L058 input-validation, L055 journey seams, L045/L052 destructive-confirm grammar.

> **⚠️ ID-mapping note (2026-06-29) — `open-questions.md` is authoritative; this ledger's internal `OQ-086..102` labels were placeholders that COLLIDED with real, unrelated OQs.** True mapping:
> L001→OQ-091 · L002→OQ-092 · L003→OQ-093 · L004→OQ-094 · L005/L045/L052→**decision 0040** · L012→OQ-095 · L013→OQ-096 · L014→OQ-097 · L042→OQ-098 · L043→OQ-099 · L051→OQ-100 · L053→OQ-101 · L056→OQ-102 · L058→OQ-103 · L029/L030/L031/L034→OQ-104 (**decision 0044**) · L032/L033/L044/L059/L060→OQ-105 · L061→OQ-106 · L006/L007/L008/L020→OQ-107..110 · L010→ECON-06 · L011→OQ-043 (resolved) · L016→OQ-046 (resolved) · L015→**decision 0040**. Resolved so far: OQ-091/095/103 (0043), OQ-104/105/106 (0044), the confirm cluster (0040). The rest are filed + milestone-tracked (M3–M7) or design-spec follow-ups.

Ranked: ★ agreement (≥2 personas or runs) → sentiment → severity. Seeded from `findings.md` +
`recommendations.md` (run 0). Loop upserts by `screen+gap`. Sentiment −2 blocker … +2 delight.
Verdicts: ADOPT·QUICK·OQ·DEFER·RATIFY·DROP. No spec/OQ edits — audit folder only.
`runs` = first-seen→last-seen run. OQ-086..090 accepted into `open-questions.md`; 091–102 staged; next free = OQ-103.

## ★ P0 guards (cross-persona / highest regret)
| ID | screen:loc | persona | gap | sent | verdict | recommendation | runs |
|---|---|---|---|---|---|---|---|
| L001 | game-page:554 | Rex+Pip ★ | hours free numeric, no cap → fake-stat rot (compare/Top5/ach/store) | −2 | OQ-086 | sanity-cap + anomaly pending-review; field morph on edit | 0→1 |
| L002 | store:1292/1298 | Rex ★ | refund→keep permanents→negative balance; copy "NOTHING YOU OWN IS TAKEN BACK" pre-contradicts clawback | −2 | OQ-087 | lock/clawback on reversal; reconcile copy | 0→1 |
| L003 | report:514 | Rex ★ | no per-reporter cap → report-bomb soft-hides rivals | −2 | OQ-088 | reporter rate-limit + dedupe | 0→1 |
| L004 | add-game:1125 | Sam+Rex ★ | CREATE ANYWAY one-tap, no creation rate-limit; inline link easy to mistap | −1 | OQ-089 | cap creates/day + soft-queue + two-button layout | 0→1 |
| L005 | friends:653/656/671 | Rex+Pip ★ | silent UNFRIEND/BLOCK, no actor pre-confirm (mis-tap risk) — NB: target-not-notified IS by-design per decision 0010; this is about the acting user's confirm, not target silence | −1 | OQ-090 | ConfirmSheet (cf OQ-061) + resolve anim | 0→8 |
| L045 | settings:117/151·admin:447/1068·profile:88 | Rex+Sam+Pip ★ | destructive/session actions silent: LOGOUT no confirm, admin HIDE/SUSPEND/MERGE no per-action guard, profile UNFRIEND silent | −1 | OQ-098 | which destructive/session actions need ConfirmSheet vs silent | 2→3 |
| L051 | profile/contributor:373-779·discover:234·achievements:139-207/540 | Rex ★ | privacy-gating leak: public per-card ADOPTION counts → targeting + cross-profile hour inference (vs PROF-03); locked SECRET-tier node-detail may ship criterion/unlockedAt/reward; friend-view tier-visibility unclear (decision 0012/OQ-079) | −1 | OQ-099 | define what aggregates/detail/tier leak to public/non-friends; gate or bucket | 3→4 |

## ★ Cross-persona pain
| L006 | styler:652·device:777 | Sam+Rex ★ | premium "CHARGED AT KEEP" pay-by-surprise (now/at-save ambiguous) | −1 | ADOPT | running-cost meter + "will charge at KEEP"; pricing=OQ-002 | 0→1 |
| L007 | styler:584-611 | Sam ★ | KEEP/SAVE PRIVATE/CANVAS exits undefined; no CANCEL ALL / discard confirm | −1 | ADOPT | outcome labels; explicit cancel+discard; demote CANVAS→"Edit art (adv)" | 0→1 |
| L008 | welcome:442/82/445 | Sam+Pip ★ | sign-in below hero + locked nav silent + static fan | −1 | ADOPT | sign-in above fold; "sign in to use"; fan-in | 0→1 |
| L009 | friends:614 | Sam+Pip ★ | feed-first with no feed = dead landing | −1 | ADOPT | connect-first cold-start + "invite to get started" CTA | 0→1 |
| L046 | report:225/512 | Sam+Rex+Pip ★ | dormant SUBMIT no clear "needs note" locked affordance (reads broken); note moderator-only? unclear (gating logic exists report:394 — gap is the affordance, not the guard) | 0 | ADOPT | locked-state visual + "(moderators only)" hint | 2→5 |
| L052 | game-page:88/180·canvas·styler:469·admin:349/846·settings:140 | Sam+Rex+Pip ★ | confirm/destructive grammar inconsistent: red-alert vs cream keycap split (SIGN OUT cream but reversible≠permanent); KEEP vs SAVE PRIVATE labels diverge; primary/secondary color misused (ADD TO LIST orange); consequence notes unstyled (admin "invalidates sessions") | 0 | ADOPT | formalize confirm-grammar + outcome-label + consequence-emphasis vocabulary (reinforces L045) | 3→4 |
| L055 | game-page:70·compare:288·styler-entry·discover:216 | Sam ★ NEW | journey return/entry seams: game-page return-link hardcoded to collection (loses add-game/styler origin); compare return targets only @RIKO not friends feed; styler entry doesn't say DESIGN vs EDIT; no discover→compare→store cross-feature entry path | −1 | ADOPT | context-aware return targets + cross-feature entry points + entry-mode labels | 4 |

## Behavior — OQ candidates
| L010 | store:752/422 | Rex ★ | no spend idempotency → press-hold re-tap double-spends; no submit-failed retry state | −1 | OQ-091 | processing/receipt-dedupe state | 0→2 |
| L011 | store:605/520 | Rex ★ | daily +1 no clock guard; no "available again in 23:47" countdown | −1 | OQ-092 | server-time gate + next-claim countdown | 0→2 |
| L012 | welcome:595/633·settings:445 | Rex ★ | username/email enumeration oracle; RESEND EMAIL no idempotency | −1 | OQ-093 | throttle + neutral copy; resend cap + idempotency | 0→3 |
| L013 | faf:560·discover/compare/game-page share | Rex ★ | invite token no expiry/cap; share/deep-links undrawn (no signature/TTL) | 0 | OQ-094 | TTL + cap + signature for invite AND share links | 0→3 |
| L014 | discover/store | Rex ★ | Up Next + adopt PX uncapped; bulk-adopt loop undefended | 0 | OQ-095 | length cap + adopt confirm | 0→1 |
| L015 | canvas:715 | Rex ★ | DELETE slip no confirm / no undo barrier | 0 | ADOPT | cheap confirm guard | 0→2 |
| L016 | styler:1014 | Rex+Pip ★ | no-hold buy path; held state never rendered in preview | −1 | OQ-046 | known | 0→2 |
| L042 | report:281·add-game(SYS-10) | Rex ★ | offline-gated write forms lose draft on scrim-dismiss/reconnect | −1 | OQ-096 | persist + restore draft (report/add-game) | 1→2 |
| L043 | report:251 | Rex | no "view your reports" / mod-queue status tracker after submit | 0 | OQ-097 | reporter status surface (cf MOD-01/02) | 1 |
| L053 | collection:607·discover:440 | Rex | add/adopt stays active offline (SYS-10 L3 missing) → silent queue + no idempotency → double-add | −1 | OQ-100 | offline-disabled state + adopt/add idempotency; backfill offline+retry empties | 3 |
| L056 | onboarding:844-870/920·settings:546 | Rex | notif-flow guards: O6 pre-prompt re-triggerable N times (no one-shot/cooldown); OPEN PHONE SETTINGS no double-tap guard | −1 | OQ-101 | server one-shot/cooldown on pre-prompt; rate-limit settings-jump | 4 |
| L058 | report:217·faf:172/419·profile:597·admin:187 | Rex ★ NEW | free-text inputs unbounded/unsanitized: report note + admin mod-note no maxlength (paste-DoS); username search no length/charset; bio no readonly at cap; QR payload sanitization unstated (upload art is SVG/design-only — no image-upload surface yet) | −1 | OQ-102 | input-validation policy: maxlength + charset + server sanitization for all free-text + QR | 5 |

## Quick wins (copy/markup)
| L017 | welcome:442 | Sam | returning sign-in above hero | 0 | QUICK | — | 0→1 |
| L018 | welcome:644 | Sam ★ | ALL-CAPS errors read hostile | 0 | QUICK | sentence case | 0→1 |
| L019 | welcome:458/152 | Sam ★ | FORGOT? too small/dim; touch-target <44px | 0 | QUICK | enlarge + brighten + ≥44px tap area | 0→5 |
| L020 | styler:493 | Sam | "CARD-16" spec ID in copy | 0 | QUICK | strip IDs app-wide | 0 |
| L021 | device:487 | Sam | sticker no-go only by refusal | 0 | ADOPT | plastic-only hint | 0 |
| L022 | discover:588 | Sam ★ | wishlist add dim + no confirmed-saved pill | 0 | ADOPT | equal weight + saved state | 0→1 |
| L023 | store:1349 | Sam ★ | locked drop no timing | 0 | ADOPT | when/notify countdown | 0→1 |
| L024 | compare:579 | Sam ★ | privacy lock reads as error | 0 | QUICK | "keeps hours private / ask to view" | 0→1 |
| L025 | lists:342 | Sam ★ | SAVE-0 no hint; no saved toast | 0 | QUICK | "select 5 to save" + saved state | 0→1 |
| L026 | profile:713 | Sam ★ | 5 fresh CTAs compete | 0 | ADOPT | sequence one primary | 0→1 |
| L027 | contributor:319 | Sam ★ | vs Profile undiff | 0 | ADOPT | label/eyebrow | 0→1 |
| L028 | collection:477 | Sam ★ | unlabeled tools | 0 | ADOPT | labels until learned | 0→1 |
| L041 | onboarding:~150/195 | Sam+Pip ★ | step-rail dots unlabeled, no "X of Y", no role=progressbar | 0 | ADOPT | name steps + counter + role/SR | 1→3 |
| L047 | faf:280 | Sam | cooldown disabled, no "try again in X" countdown | 0 | ADOPT | show countdown | 2 |
| L048 | device:632/166 | Sam | save model ambiguous (SAVE vs auto-save); no active-shell indicator | 0 | ADOPT | clarify save + ring active shell | 2 |
| L050 | achievements:337/342 | Sam | in-progress meters unlabeled; SECRET tier weakly distinguished | 0 | ADOPT | "IN PROGRESS X/Y" + stronger legend | 2 |
| L057 | settings:360/494/550·onboarding:920·friends:299 | Rex NEW | notif presentation: OS-declined toggles still render green/"on"; no "granted" confirmation chip after OS allow; "4 ON" summary ≠ toggle slices; NOTIF-03 in-app fallback inbox unlinked; pending-count no freshness | 0 | ADOPT | grey declined toggles; granted chip; recount summary; link fallback inbox | 4 |

## Consistency / Motion (P2) / A11y (P3)
| L054 | collection:82/462·friends:92/322·canvas vs collection sheets·profile:292 vs ach:188 | Sam+Pip ★ | consistency batch: back/exit affordance varies; empty-state tone/voice drift; feed verb-tense mixed; error-payload placement (inside vs above sheet) differs; identical dashed lock-well = privacy on one board, secret-tier on another | 0 | ADOPT | unify exit pattern, empty-state voice, feed SVO/past-tense, sheet error grammar, disambiguate lock-well | 3 |
| L029 | global | Pip ★ | no prefers-reduced-motion anywhere | −1 | ADOPT | global contract first | 0→3 |
| L030 | styler:571/611·canvas:920·welcome:212 | Pip ★ | marquee moments (fan/count-up, peek-flip, redraw, KEEP beat) unanimated AND have no timing/easing spec | 0 | ADOPT | signature motion + shared timing/easing tokens | 0→4 |
| L031 | ach:792·onb:348 | Pip ★ | celebration frozen (rays @keyframes absent; added-tag static) | 0 | DEFER | tie OQ-040 | 0→4 |
| L032 | discover:440·lists:166·add-game:262 | Pip ★ | gesture-only reorder + CardFan dots no keyboard rotation/"card N of M"; SR not coupled to aria-live | −1 | ADOPT | non-gesture path + aria-live | 0→5 |
| L033 | 20 files | Pip ★ | a11y batch: sparse ARIA; toggles no role=switch; chevron/icon/cbadge/ADD-button unlabeled (icon-only); color-only tier swatches; decorative SVG no aria-hidden; chip roles; slip/sticker affordance; disabled attr; SR ratings | −1 | ADOPT | a11y sweep | 0→3 |
| L044 | global | Pip ★ | no :focus-visible on any control (visible ring only — does NOT cover focus-trap, see L060) | −1 | ADOPT | global focus-visible ring | 1→5 |
| L059 | welcome:110/158·profile:247·settings:197·report:509 | Pip ★ NEW | form-semantics a11y: inputs not <label>-associated; required not marked (aria-required/*); error+hint not linked (aria-describedby); ToS/age "checkbox" is styled div, no real input/aria-checked | −1 | ADOPT | form a11y pass (labels, required, describedby, real checkboxes) | 5 |
| L060 | report:196/270·settings:130·lists:190·add-game:262 | Pip ★ NEW | dynamic a11y: sheets lack role=dialog/aria-modal, focus-trap, return-focus, Esc-dismiss; async results (toast/save/claim, "card N of M") have no role=status/aria-live | −1 | ADOPT | modal focus management + live-region announcements | 5 |
| L061 | collection:121·game-page:71/160·friends:169·admin:qrow | Pip NEW | content-resilience: long game titles/usernames silently ellipsis-truncated (no cue/tooltip); friends .pname max-width:52px breaks long/intl names; extreme hours (99999+) unformatted, no max-width → dossier layout break (reinforces L001 cap) | 0 | ADOPT | wrap/2-line + truncation cue; number formatting + width guards | 7 |
| L034 | ~17 boards | Pip ★ | no motion-token vocabulary: marquee/energize ad-hoc per board; F-03 Scanline Energize applied inconsistently (some boards add 70ms transition, contradicting motion-free rule); static skeletons (no shimmer) | 0 | DEFER | establish timing/easing tokens; reconcile F-03 energize across boards | 0→4 |

## Coverage / RATIFY (by-design) / delights
| L049 | admin-console:236/279/415/956 | Rex+Pip | board thin vs spec: queue lacks approve/reject/merge actions; no audit-log READ (MOD-10); no dossier (MOD-12); 3-day restore no countdown/rate-limit/offline-gate | 0 | DEFER | coverage flag → SCREEN-STATUS | 2→3 |
| L035 | onb:824 | Sam | O6→O7 double-prompt | +0 | RATIFY | NOTIF-04 intentional | 0 |
| L036 | game:494 | Sam | 3 nav layers | +0 | RATIFY | back==back | 0 |
| L037 | profile:467 | Sam | ADMIN II self-tier | +0 | RATIFY | PROF-09; confirm self-only | 0 |
| L038 | add-game:1471 | Sam | dedup face + "FILED ✓" | +2 | KEEP | delight | 0 |
| L039 | compare:298 | Sam | VS scoreboard | +2 | KEEP | delight | 0 |
| L040 | canvas:920 | Pip ★ | best-in-set celebration spec | +2 | KEEP | model for others | 0→1 |

## RUNLOG
- run 0 · 2026-06-28 · seed · new=40 dedup=0 flips=0 · top regret: L001 hours-cap
- run 1 · 2026-06-28 · Sam+Rex+Pip · new=4 (L041,L042→096,L043→097,L044) dedup=7 flips=0 · top regret: L042 offline draft loss
- run 2 · 2026-06-28 · Sam+Rex+Pip (deep-state) · new=6 (L045→098,L046,L047,L048,L049,L050) dedup=6 flips=0 · top regret: L045 silent logout/admin destructive
- run 3 · 2026-06-28 · Sam+Rex+Pip (consistency + attack surface) · new=4 (L051→099,L052,L053→100,L054) dedup=8 flips=0 · top regret: L051 adoption/payload privacy leak
- run 4 · 2026-06-28 · Sam(journeys)+Rex(settings/notif)+Pip(motion-system) · new=3 (L055 journey-nav-seams, L056→101 notif-guards, L057 notif-presentation) dedup=9 (admin-suspend-emphasis→L052, summary-mismatch/inbox/granted-chip/pending-freshness→L057/L054, tier-visibility→L051, motion-specs+F-03-energize→L030/L034, styler-entry→L055) flips=0 · convergence high — mostly confirms · top regret: L055 stranded-journey return/entry seams
- run 5 · 2026-06-28 · Sam(challenge)+Rex(input/upload)+Pip(form/modal a11y) · new=3 (L058→102 input-validation, L059 form-semantics-a11y, L060 modal-focus+live-region) dedup=4 (touch-target→L019, cardfan-keyboard→L032, dormant-gating-clarified→L046, focus-trap-vs-ring→L044/L060) flips=0 drops=0 · noise: Sam pass drifted to DS-tokens (Burt scope) — discarded · negative find: no image-upload attack surface yet (card art SVG) · top regret: L058 unbounded free-text inputs (paste-DoS/injection)
- run 6 · 2026-06-28 · Sam(tone)+Rex(write-action sweep)+Pip(control-type completeness) · **new=0 dedup=0 flips=0** · ALL THREE personas independently report saturation: voice consistent · all material write-actions covered by OQ-086..102 · all control types mapped to L029–L060 · **CONVERGED (1st dry run)** · top regret: unchanged — L055 journey seams / L058 input-validation
- run 7 · 2026-06-28 · Sam(newest boards)+Rex(exploit-chains)+Pip(content-resilience) · new=1 (L061 content-resilience — a fresh dimension never probed) dedup=0 flips=0 · Sam dry (lists+ach clean), Rex dry (no chains beyond OQ-086..102); only Pip's new angle yielded · top regret: L061 silent truncation / extreme-number layout break
- run 8 · 2026-06-29 · Sam(resilience extend)+Rex(final behavior)+Pip(final a11y) · **new=0 dedup=0 flips=0** · ALL THREE dry: resilience adequate on remaining boards · behavior closed at OQ-086..102 · a11y closed L029–L061 · clarified L005 (actor-confirm ≠ decision-0010 target-silence) · **STOP at 8 — LOOP CLOSED, CONVERGED.** new-find trajectory: 40→4→6→4→3→3→0→1→0.
