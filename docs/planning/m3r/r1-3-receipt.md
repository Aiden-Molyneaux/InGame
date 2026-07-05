# R1-3 · Welcome/Auth + Register + Legal — fix ledger (receipt)

> **Builder:** Opus / Claude Code (owner put this session on Opus, 2026-07-04 — the MODEL PLAN's
> non-Opus preference noted; verifier independence preserved via the fresh murr/parvati subagents).
> **Surface:** R1-3 (M3-R). **Branch:** `m3` (uncommitted at write time).
> **Manifest:** [`welcome-auth-manifest.md`](welcome-auth-manifest.md) (grounded — zero UNVERIFIED rows).
> **Files touched:** `apps/mobile/app/sign-in.tsx` (assembly) · `src/components/TextField.tsx`
> (labelRight · reveal · error weight) · `src/components/TertiaryLink.tsx` (chevron option) ·
> `apps/mobile/src/components/LegalScreen.tsx` (back order) (+ manifest, this receipt).
> **Not touched:** `legal/{terms,privacy}.tsx` (consume `LegalScreen` unchanged); any parallel-session file.

## Task 1 — manifest grounding (recalibration: PRE needs evidence)
Read `sign-in.tsx` (254 lines) + the four components + the board's W1–W8 artboards before changing a
line; every manifest row carries a board cite **and** a build cite. Key grounded findings: the build's
**combined mode-toggle form** (vs the board's separate hero + create screen) is the **§0.1 LOCKED-kept
divergence** — R1-3 fixes the S2 items *on the existing structure*, it does not rebuild layout; the
availability line, AUTH-10 checkbox, and error-splitting plumbing were already PRE; the field-error
was already 9px (S2-e is a weight, not a size, fix).

## Owner rulings folded in (this session)
- **S2-h FORGOT? = STUB** (owner ruling) — affordance present, routes to an `Alert` "coming soon"; the
  W7/W8 reset flow defers to a dedicated AUTH-04 pass (backend endpoints exist, client stays unwired).
- **S2-i SIWA = STUB** (AUTH-03 enrollment-deferred) — iOS + sign-in only; same "coming soon" beat.

## Fix ledger — one row per S2 item

| Item | Files:lines | What changed | Self-verified (web :8082) |
|------|-------------|--------------|---------------------------|
| **S2-g** Create acct → text link | `sign-in.tsx` swap-foot (`~305–316`); removed the secondary `ScreenButton` | full button → `.swap-foot` row: soft "New to InGame?"/"Already have one?" + a `TertiaryLink chevron="none"` CREATE ACCOUNT / SIGN IN | ✅ text link renders; mode-swap works both directions (copy flips) |
| **S2-h** FORGOT? affordance | `sign-in.tsx` password `labelRight` (`~230–240`); `TextField` `.flabel-row` | FORGOT? `TertiaryLink` docked on the password label row, **sign-in only**; tap → `comingSoon('Password reset')` | ✅ renders in sign-in, **absent in create** (guard proven); tap → Alert (native) |
| **S2-i** SIWA placeholder | `sign-in.tsx` OR-divider + Apple stub (`~258–283`) | iOS + sign-in only: `.ordiv` "OR CONTINUE WITH" + compact black Apple button (SVG glyph) → `comingSoon('Sign in with Apple')` | ⚠️ **iOS-only — not web-visible** (Platform.OS web hides it); device/R2 confirms |
| **S2-j** password show/hide | `TextField.tsx` reveal (`~55–72`, `~104–110`) | internal `revealed` state; `masked = secureTextEntry && !revealed`; SHOW/HIDE reveal docked in the input (board `.reveal` 700·9px navy·.55) | ✅ SHOW→HIDE toggle confirmed (zoom) |
| **S2-a** submit gating | `sign-in.tsx` `canSubmit` (`~130–138`, button `:253`) | `!busy && requiredFilled && noFieldErrors` (create also needs `accepted`) — not only the checkbox | ✅ disabled-on-empty in **both** modes; enable-on-fill = code-verified (RN-web typing didn't register live) |
| **S2-c** availability copy | `sign-in.tsx` `availabilityText` (`~152–160`) | taken → **"USERNAME NOT AVAILABLE"** (was "TAKEN"); screened/other → "NOT ALLOWED" (kept) | code-verified (needs a live taken-name check → parvati/R2) |
| **S2-e** field-error legibility | `TextField.tsx:135` | error text weight `screen`(400) → `screenSemi`(600) at the same 9px (board `.ferr` 600); already at the F-06 floor | code-verified; parvati eyes-on |
| **S2-f** errors clear on type | `sign-in.tsx` `editField` (`~74–86`), wired on all 3 fields | editing a field clears its error + the top-line error; username edit re-shows the availability line | code-verified (needs an error state to edit → parvati/R2) |
| **S2-b** legal BACK under title | `LegalScreen.tsx:9–13` | title first, then ‹ BACK (was BACK above title) | ✅ confirmed on `/legal/terms` |

## Component enhancements (composed, not duped — §1.2)
- **TextField** (`+labelRight`, `+reveal`, error weight) — additive; the label becomes a `.flabel-row`
  only when `labelRight` is passed; reveal appears only for `secureTextEntry`. Existing call-sites unaffected.
- **TertiaryLink** (`+chevron: 'trailing' | 'leading-back' | 'none'`, default **'trailing'**) — the
  collection/add-game/profile callers keep the "LABEL ›" grammar unchanged.

## Predicate state-table walks (recalibration rule b — every changed/new predicate)

**1. `canSubmit` (S2-a):** `!busy && requiredFilled && Object.keys(fieldErrors).length===0`.
- signin: `requiredFilled = email.trim() && password` — empty either → disabled (✅ live); both filled + no errors → enabled.
- create: `requiredFilled = email.trim() && candidate && password && accepted` — any empty or unchecked → disabled (✅ live: checkbox-off + empty → disabled); all filled + checked + no errors → enabled.
- a field error present (post-submit) → `hasFieldErrors` true → disabled until the user edits it (S2-f clears it → re-enables).
- busy (in-flight login/register) → disabled regardless.

**2. `masked` reveal (S2-j):** `masked = !!secureTextEntry && !revealed`.
- non-secure field → `secureTextEntry` falsy → no reveal control, `masked=false` always.
- secure + revealed=false (default) → masked (dots), label "SHOW".
- secure + revealed=true → plaintext, label "HIDE" (✅ toggle confirmed).
- toggle is local to the field; unmount/remount (mode swap) resets to masked (safe default).

**3. `availabilityText` (S2-c):** guarded by `showAvailability = create && candidate.length>=3 && !fieldErrors.username`.
- not fresh (fetching / stale args) → "CHECKING…" (dim).
- fresh + available → "USERNAME AVAILABLE" (success).
- fresh + !available + reason==='taken' → "USERNAME NOT AVAILABLE" (alert).
- fresh + !available + reason!=='taken' (screened/reserved) → "USERNAME NOT ALLOWED" (alert).
- username field erroring → line hidden (S2-f edit clears the error → line returns).

**4. `editField` clear (S2-f):** `(v) => { setter(v); setError(null); drop fieldErrors[field] }`.
- editing email/password/username → that field's error removed + top-line auth error cleared.
- editing username specifically → `fieldErrors.username` removed → `showAvailability` un-gates → advisory line reappears.
- no error present → `fieldErrors` returned unchanged (referential no-op, no needless re-render).

**5. SIWA/divider guard (S2-i) + FORGOT? guard (S2-h):** `mode==='signin' && Platform.OS==='ios'` (SIWA) · `mode==='signin'` (FORGOT?).
- signin + ios → divider + Apple stub render; FORGOT? on the password row.
- signin + web/android → no SIWA (✅ web: absent); FORGOT? still renders (mode-only).
- create (any platform) → no SIWA, no FORGOT? (✅ live: FORGOT? absent in create).

## Declared gaps / EXPECTED (never silent)
- **W5/W5b/W5c sign-in error variants** (authfail strip · rate-limit · suspended) → EXPECTED(later · AUTH-02/SYS-05/MOD-09). The build keeps its single inline top-line error.
- **W6 SIWA→username completion** → EXPECTED(AUTH-09). **W7/W8 reset flow** → EXPECTED(AUTH-04, owner-deferred this session).
- **W3 inline in-field `.stat`** (spinner/✓ inside the input) → the build keeps the below-field advisory line (not an S2 item) — EXPECTED refinement.
- **S1-e games-forward hero** (CardFan + StatTiles + invite) → design-owed (§5); the build keeps `wordmark`+`tagline`.
- **RN-web synthetic typing didn't register** in my self-check, so the enable-on-fill (S2-a), availability copy (S2-c), and error-clear (S2-f) live paths are **code-verified, live-pending** → parvati / R2 device.

## Check outputs
- `npm -w @ingame/mobile run typecheck` → clean (exit 0).
- `npm run lint:custom` → 8/8 rules pass, 0 errors/warnings.
- `npm -w @ingame/mobile run test -- --watchAll=false` → 3 suites / 6 tests pass.
- **Browser BOOT check (mandatory):** sign-in (signin + create) + `/legal/terms` all boot clean on
  :8082, **zero console errors**; mode-swap, reveal toggle, and legal nav exercised live.

## Self-check + environment
Standing dev stack (decision 0060), verified via claude-in-chrome at `http://localhost:8082` (own tab
group, isolated from the concurrent session). Windows Chrome clamped the phone-viewport resize; judged
at desktop width. Reads-only — no account created (typing didn't register anyway; the enable/availability
paths are parvati's live lane). Owner's :8081 + :4000 untouched; no `.env.local`.

## Verification lane
- **murr** (diff): **SOUND ✅** — 0 blocker/major/minor. Traced `canSubmit` against the *actual*
  server field-error paths (register `email/username/password` all clear via `editField` → re-enable;
  signin errors carry no `details` so never gate; the `acceptedTerms` path is unreachable) — no
  deadlock, no hole. `editField` functional-updater has no stale closure + no-op returns `prev`.
  TextField masking/`padding:0`/hook-order/`error`-drives-both all correct. `Alert.alert` on RN-web =
  a no-op (read from source), degrades gracefully. Chevron default `'trailing'` byte-identical for the
  3 existing callers. **One 🧹 fixed:** the `'leading-back'` chevron was **dead code** — I'd added it
  for legal BACK but only reordered the raw `<Text>` in `LegalScreen`, so the branch (and the
  manifest/receipt/comment claiming it) described wiring that didn't exist. **Fixed:** `LegalScreen`
  now renders `<TertiaryLink label="Back" chevron="leading-back" .../>` (kills a near-dupe per §1.2;
  the docs are now true). typecheck + lint re-green.
- **🤔 Accepted owner-call (murr):** `comingSoon` uses `Alert.alert`, which is a no-op on **RN-web**
  (dev lane only) but native on **iOS + Android** (both shipped platforms). Web isn't a shipped surface
  (CLAUDE.md), so the FORGOT?/SIWA stubs give real feedback everywhere it ships; only the dev web
  tester sees silence. Non-issue — accepted, not engineered around.
- **parvati** (running app vs the manifest): **CLEAN ✅ — 0 🚩 flags. All 9 S2 items confirmed, zero
  divergence.** Enumerated from the manifest. **Live (5):** S2-g swap text-link both ways · S2-h FORGOT?
  sign-in-only (absent in create) · S2-j SHOW/HIDE flips `type=password→text` + a11y label · **S2-a
  enable-on-fill** (CREATE ACCOUNT disabled→enabled only once all 3 fields filled AND box checked —
  parvati filled the fields where my synthetic typing couldn't) · S2-b ‹ BACK under the title on
  `/legal/terms`+`/privacy`; plus the S2-f availability re-show on username edit. **Code-confirmed (4,
  live-blocked by the `GET /auth/username-available` 503 from the LAN-IP base — network-traced,
  environmental not a build gap, each with a code cite):** S2-c copy mapping matches the server
  contract (`reason 'taken'` vs `'screened'`, integration test `auth-slice.test.ts:366,370`) · S2-e
  weight · S2-f server-error paint · S2-i iOS Platform-fork (never paints on web → R2 device). Locked
  divergences (mode-toggle form · S1-e hero) honoured, not flagged.

## Outcome
Pipeline: **manifest → build → murr SOUND (1 dead-code finding fixed) → parvati CLEAN (0 flags) →
done.** All 9 S2 owner-notes built + verified; the only live-pending items (availability-copy paint,
server-error paint, SIWA) are blocked by the username-available 503 / iOS-only rendering — both
environmental, each code-cited, owed to a healthy-API / R2 device pass. Locked divergences untouched.
