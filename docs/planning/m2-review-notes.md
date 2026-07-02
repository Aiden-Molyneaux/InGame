# M2 — Review Notes (owner on-device observations, triaged)

> A running punch-list of what the owner spots reviewing the M2 build on a real device, measured
> against the **M2 Definition of Done** + the `/me`-style **contract** + the **mockups** (in that order
> of "is it owed now"). Each note is sorted into a **bucket** and given a **verdict**.
>
> **Buckets** — `ABSENT` (data/element not there) · `MISPLACED` (present but structurally/placement wrong
> vs the design) · `UNPOLISHED` (right element, visual/token off) · `MATCHES`.
> **Verdicts** — 🚩 **FLAG** (owed at M2 → fix before DoD) · ✅ **EXPECTED** (deferred to a later
> milestone → proceed) · 🎨 **POLISH** (built-app visual/DS — **Parvati** surfaces it, citing the F-rule;
> the iteration lane. *Burt audits mockup files only, now dormant since the mockups converged.*).
>
> **Feeds:** the Claude Code **lead-audit** (the ABSENT / claim-vs-reality class) · **Burt** (the
> UNPOLISHED / DS class, on the mockups) · the **spec** (a FLAG that's really a behavior/contract gap → an OQ).
> Rule of thumb: capturing is free — note it, keep going; the verdict column is the triage.

## Profile screen
| # | Observation | Bucket | Verdict | Cite / note |
|---|---|---|---|---|
| P1 | **Bio** not rendered | ABSENT | 🚩 FLAG | `GET /me` returns `bio`; mockup shows a bio line (`profile-states.html:498`); part of "self-profile render". The exact self-view field list was never pinned → folds into **OQ-116** (which will formally rule it M2-owed). |
| P2 | **Favourite game / PINNED FAVOURITE** not rendered | ABSENT | ✅ EXPECTED | **Refined by Parity + OQ-116:** `/me` returns a **bare `favouriteGameId`** (uuid) — rendering a favourite-game *set-piece* (title/art) needs the **catalog (M3)**, so it can't show real data at M2; not owed now. (The field is wired; the display is M3-blocked — same as the expanded `favouriteGame`/`nowPlaying`.) mockup `profile-states.html:514`. *(Was 🚩; downgraded — the DISPLAY is M3-gated, not a dropped-data gap like bio.)* |
| P3 | No **settings** link/entry | ABSENT | ✅ EXPECTED | Settings screen (§4.15) is a later slice; the profile's M2 affordance is **EDIT** (edit-mode), not a settings gear (mockup has no settings entry). Revisit when Settings is scheduled. |
| P4 | **Gamertags** not rendered | ABSENT | 🚩 FLAG | `GET /me` returns `gamertags` (0.42 self-shape, OQ-116) and the mockup self-view shows them (`profile-states.html` identity block, L587). Same class as P1 (bio): contract-fed identity data the render drops — cheap to add. |
| P5 | **MY DEVICE hero**: renders **screen-width** (should be a small `.mini-dev` ~42×92), **no "MY DEVICE" label**, weird frame | MISPLACED | 🚩 FLAG (size/label) + 🎨 POLISH (F-03) | Mockup renders it as a **small `.mini-dev`** (42×92, `profile-states.html:190/545`) labeled **"MY DEVICE"**. Build renders it full-width + unlabeled + a broken frame (entangled with the not-yet-correct app-wrapping DeviceShell). Size + label = M2 flag; the F-03 styling → POLISH; real shell/screen *customization* = DEV-*/**M4** (EXPECTED). *(Parvati earlier caught only "empty box, not F-03" — missed the size + label; order in P8.)* |
| P6 | No **EDIT** affordance on the profile | ABSENT | ✅ EXPECTED | `PATCH /me` is wired (the F29 slice, widened), but the edit-mode **UI** wasn't in the M2 render DoD ("Device hero · Top-3 · Now Playing · stats"). The write path is ready for when the edit UI is built (a small follow, not M2-owed). |
| P7 | No **Share / Achievements teaser / Contributions teaser** | ABSENT | ✅ EXPECTED | Share = SOC-07 (social → M7); Achievements teaser = ACH (later); Contributions teaser = CAT-07 (needs the catalog → M3). All later-milestone; PROF-05 lists them but they're deferred. |
| P8 | Profile **section order is scrambled** | MISPLACED | 🚩 FLAG | Mockup order (`profile-states.html:505–547`): identity → **STATS** → **PINNED FAVOURITE** → **TOP 3** → **NOW PLAYING** → **MY DEVICE**. Build order: identity → device → now-playing → top-3 → stats. All sections *present* but in the wrong vertical sequence — cheap reorder, mockup-specified. *(Parvati miss — marked the sections MATCHES on presence without checking order; method now sharpened: presence ≠ placement.)* |
| P9 | **Stats** not **centered + spanning** | UNPOLISHED | 🎨 POLISH | The stat tiles should be centered + span the width (mockup `.stats` block, `profile-states.html:506`); build renders them off-layout. Visual/layout → the iteration lane. |

## Collection screen
| # | Observation | Bucket | Verdict | Cite / note |
|---|---|---|---|---|
| C1 | View-switch (SHELF/GRID/LIST/TOP) at the **TOP**; sort/filter options render **bare** | MISPLACED | 🚩 FLAG (placement) · ✅ EXPECTED (drawer) | **(a)** the always-visible **view-switch** (SectionSwitch) docks at the **bottom** tools bar (`.tools` `border-top`, `collection-states.html`) → the M2 placement flag. **(b)** the separate **sort/filter is a bottom DRAWER** (`.sheet { bottom:0 }`, mockup L203/205), not bare — but real *filtering* needs the M3 collection-query backend (COL-07/09), so the drawer being absent now is **EXPECTED** (M3). Fix placement at M2; the drawer rides M3. |
| C2 | Control bar "not rendered correctly" (styling) | UNPOLISHED | 🎨 POLISH | The tools-bar visual/token treatment → the iteration lane (Parvati surfaces built-app DS), once placement C1 is fixed. |
| C3 | Game cards render as flat **colour blocks** (no art) | ABSENT (art) | ✅ EXPECTED | Card **composition/art** is CARD-15 → **M4**; M2 seeds placeholder cards. The *shelf* (2-col grid, frames, titles, NOW tag) is the styled M2 part and it landed. Not a gap. |
| C4 | **"15 OF 48"** count — claims 48 but only 15 cards render | ABSENT (coherence) | ✅ EXPECTED | **Format is correct** — the CountTag is `total OF collectionTotal` (api-contract:85 — "2 OF 48"). But the **seed hardcoded `collectionTotal: 48` while seeding 15 games** → 33 phantom. Seed-scratch → real from `/me/collection` at **M3**; the seed should at least be **internally coherent** (48↔15). *(Owner-caught; a Parvati miss → her method now sanity-checks displayed counts for coherence.)* |

## App shell (cross-cutting)
| # | Observation | Bucket | Verdict | Cite / note |
|---|---|---|---|---|
| S1 | **DeviceShell doesn't wrap the whole app** — mounted only in `(tabs)/_layout.tsx` (collection/profile); sign-in + root index render outside it, and it re-mounts on entering tabs | MISPLACED | 🚩 FLAG (structural) + 🎨 POLISH (F-03 chrome) | Component-map §5.1: `DeviceShell` **"wraps every screen"** ✅⭐; the M2 DoD owes the styled tab-nav shell. Fix: **hoist `DeviceShell` to the ROOT layout** (`app/_layout.tsx`) so one instance persistently frames every screen (NavBand **`locked`** pre-auth). Match the mockup's **final dimensions** (`profile-states.html`: `.device` 404×884 r30 · `.top-band` 64 · `.screen-bezel` pad 9 r20 · `.screen` r13 · `.nav-band` 128) so the **usable screen area is correct now**; the decorative chrome (grille/logo/3D bevel) is 🎨 POLISH. *(Owner-flagged in the profile pass — "the app hasn't figured out the device frame that always containerizes the whole application"; distinct from the profile's MY DEVICE thumbnail, P5.)* |

## Parvati run — 2026-06-30 (profile + collection, vs the M2 DoD)
**Tally:** 🚩 6 flag · ✅ 6 expected · 🎨 4 polish. *(Updated after the owner's Collection + Profile passes, the Burt→Parvati transition, the presence≠placement sharpening, and the app-shell scope correction.)*
- 🚩 **FLAG (owed at M2):** **S1 app-shell — DeviceShell not wrapping the whole app** · P1 bio · P4 gamertags (contract-fed identity the render drops) · **P5 device-hero size/label** (screen-width + unlabeled — should be a small "MY DEVICE" mini-dev) · **P8 profile section-order scrambled** · C1 collection view-switch docked top-not-bottom.
- ✅ **EXPECTED (proceed):** P2 favourite-game (M3 catalog) · P3 settings (later slice) · P6 edit-UI (write path wired; UI a follow) · P7 Share/teasers (SOC/ACH/CAT) · C3 card art (M4) · C4 count-coherence (seed → real at M3).
- 🎨 **POLISH / iteration** (Parvati surfaces built-app DS; Burt mockup-only + dormant): **S1 app-shell F-03 chrome (grille/logo/bevel)** · P5 device F-03 render/frame · **P9 stats not centered+spanning** · C2 control-bar styling.
- ✅ **MATCHES (landed, on-aesthetic):** IdentityBlock (avatar + `demo_curator` + MEMBER SINCE) · Now Playing (seeded) · Top-3 (seeded) · the 6 stat tiles (seeded) · SIGN OUT · the NavBand (COLLECT/DISCOVER/STORE/FRIENDS/PROFILE, active state); Collection header + "15 OF 48" count · the 2-col shelf + titles + NOW tag · the SHELF/GRID/LIST/TOP view-modes.
- **Read of it:** the DoD's enumerated M2 self-profile render (device hero · Top-3 · Now Playing · stats) is all **present**; the real gaps are the two dropped `/me` identity fields (bio, gamertags → the fix pass / OQ-116) and the misplaced collection control bar (C1). Everything else absent is genuinely a later milestone. Solid first-slice shape.

## Lead-audit — M2 fix pass (commit `acde8b9`) · 2026-07-01
**Verdict: PASS with one latent finding — 6 CONFIRMED · 1 PARTIAL.** 7 adversarial verifiers (each told to
refute); CI **independently** confirmed green on `acde8b9` (run 28534568319 — gitleaks/SCA/Build/Export/F04
all run + passed on SDK-54).
- ✅ **gitleaks** (content-scoped regex allowlist, no path blind spot) · **CI guard** (`if: ${{ !cancelled() }}` on all 9 steps, no `continue-on-error` masking, a failing step still fails the job) · **login timing** (dummy argon2 verify on the not-found branch; both branches run one verify) · **argon2id** params pinned (`algorithm:2` + m=19456/t=2/p=1/outputLen=32) · **asActor** (non-optional + runtime guard; `ownedBy` always ANDs the owner predicate — no widening) · **completeness** (all 6 fix-task items map; Fix 5 = receipt honesty, Fix 6 = asActor nit; no scope creep; deferred set untouched).
- ⚠️ **PARTIAL — Fix 2 / `rule-02-scoping`:** the requested AUTH-LOOKUP **reads-only tightening works** (marked `.update`/`.delete` fail closed, marked `.from` passes; green test + corpus fixture). But rule-02's detection is a **3-verb denylist** (`.from`/`.update`/`.delete`); unmarked cross-user **writes** via `.insert(...).onConflictDoUpdate(...)` (an upsert mutating an existing row) and a raw `db.execute` of a `sql` template doing `UPDATE`/`DELETE` bypass the whole rule, in any repo. **Pre-existing guardrail gap, no confirmed live hole** (runtime `asActor`/`ownedBy` scoping is sound). → **OQ-118** (flip rule-02 to a read-verb allowlist / extend detection); **fast-follow before M3**, does **not** block M2 sign-off.
- **Residual (non-blocking):** login-timing has a one-time per-process warmup artifact (pre-warm the dummy hash at startup) and no automated timing-parity test — hardening nits, not oracles.

## Parvati run — 2026-07-01 (sign-on + shell + fix-pass re-verify, vs the M2 DoD)
**Reviewed from:** Expo web @390×844 (headless-Edge captures + live DOM measurements), signed in as
the seeded `demo_curator2`; owner phone screenshot for the shell pass.
**All six OpenCode fixes VERIFIED in the running app:** S1 shell dims exact (device r30 · top-band 64 ·
bezel pad 9 r20 · screen r13 · nav-band 128 · locked 0.45) · P8 order · P1 bio · P4 gamertags ·
P5 MiniDevice 42×92 labelled · C1 bottom-docked SectionSwitch (F-09 grammar) · C4 count coherent.

| # | Observation | Bucket | Verdict | Outcome |
|---|---|---|---|---|
| S2 | **Nav key ORDER wrong** — build COLLECT·DISCOVER·STORE·FRIENDS·PROFILE; every board renders STORE·DISCOVER·COLLECTION(centre)·PROFILE·FRIENDS | MISPLACED | 🚩 FLAG | **FIXED same-day** (`ShellNav.tsx` ORDER); glyph-caps + outside-label grammar also built (owner directive — `react-native-svg`, rule-8 justification filed) |
| W1 | **Create-account mode hardcodes `acceptedTerms: true`** — no W2 acceptance row (13+ assertion, Terms/Privacy links) | ABSENT (behavior) | 🚩 FLAG → **OQ-119** | Owner ruling owed: add the W2 row or drop create mode from M2 |
| C5 | Shelf rows lack the showcase artboard's per-row meta | — | **WITHDRAWN** | Owner ruling: the shelf is 2-up card faces + the NOW hero — the hero-row artboard was the not-adopted OQ-033 direction → **decision 0057**; build reworked same-day |
| W2r | Sign-in wordmark PINK (`brand.accent`, F-05 shell-only) at 40px — mockup cream (`--scr-head`) 34px | UNPOLISHED | 🎨 POLISH | iteration lane (one-line token swap) |
| W3r | Wrong-credentials beat renders plain centred text, not the W5 `InlineBanner` strip | UNPOLISHED | 🎨 POLISH | rides the landing build-out (M3) |
| C6 | TOP view: #1 rank GOLD (F-02 — mockup `.tv-rank.first` is accent orange); layout = list rows vs #1-hero + tv-cell grid | UNPOLISHED | 🎨 POLISH | recolor cheap now; structure rides COL-13 formal (M3) |
| C7 | `/mini` cards still carry in-face titles that wrap sub-9px — decision 0047 says /mini·/thumb DROP the plate (titles already render beside in LIST/TOP) | UNPOLISHED | 🎨 POLISH (F-06/0047) | iteration lane |
| P10 | Top-3 set-pieces lack rank chips + VIEW TOP 10 › door | ABSENT | ✅ EXPECTED / 🎨 | chips cheap; the door rides COL-13 (M3); OQ-114 RULED on main (0047 corrected: /cell + 10px plate) |
| — | Side finds (not parity): **OQ-120** API sends no CORS headers (web dev loop blocked — verified live) · **OQ-121** login `user.gamertags: []` vs `/me` inline (contract pinned 0.45/0056; issuance alignment rides gate-3) · **OQ-123** robust 401→auto-sign-out filed | — | inbox | filed 2026-07-01 |

**Owner device-pass rulings (2026-07-01, all implemented + verified same-day):** shelf 2-up faces +
NOW hero (→ 0057) · seed cut to a coherent 12 (12 OF 12; profile stats derive) · nav-band
content-sized (keys ~½cm above the device bottom) · INGAME logo centred in the top-band content box
(was under the notch) · profile stat tiles in centred panel wells (P9 closed) · NavKeycap glyph caps
+ outside labels + always-present pip.
**Still open for the owner:** OQ-119 (AUTH-10 form) · the M2 gate
sitting (gate-3 · G-D..G-G · G-M — now incl. `react-native-svg` · G-K).

## Owner register attempt — 2026-07-01 evening (found live on device)
| # | Observation | Bucket | Verdict | Cite / note |
|---|---|---|---|---|
| B1 | **`VALIDATION_ERROR` responses carry NO field detail** — `POST /auth/register` with a bad username returns only `{"error":{"code":"VALIDATION_ERROR","message":"Validation failed."}}` (verified live via curl), leaving the user guessing which field failed. The api-contract **promises field-targeted detail** on register rejections (0.32: duplicate email/username · screened username · weak password) | ABSENT (contract parity) | 🚩 FLAG (backend) | Error serializer drops the zod issues; fix = pass through **sanitized** per-field issues (never echo raw input — SYS-02). Client follow: render per-field errors (W4 grammar) + wire the W3 `username-available` pre-check. Folded into the M3 brief's fast-follow batch. The policy side (charset/normalize/casing rules) → **OQ-124**. |

## (more — owner to add; I'll triage each)
_Append below and I'll bucket + verdict them._
