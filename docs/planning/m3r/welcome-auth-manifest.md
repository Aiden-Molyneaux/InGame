# Welcome/Auth + Register + Legal — screen manifest (R1-3)

> From `docs/design/mockups/welcome-auth/welcome-auth-states.html` (Draft B, W1–W8) +
> `apps/mobile/app/sign-in.tsx` · `apps/mobile/app/legal/{terms,privacy}.tsx` +
> `src/components/{TextField,TertiaryLink,ScreenButton,LegalScreen}.tsx`. Grounded 2026-07-04.
> **Scope filter: M3-R / R1-3** — the S2 owner-notes only. Elements owned by later milestones are
> listed EXPECTED(<milestone> · <cite>); parvati must not flag them, the builder must not build them.

## Locked context (honour — do NOT "fix")
- **§0.1 — the combined-form divergence is KEPT.** The board draws a games-forward **hero** (`.ghero`,
  S1-e) with a **separate CREATE screen** (`.screen-head`+`.return-link`, W2). The build is a single
  **centered mode-toggle form** (`sign-in.tsx`, `mode: 'signin' | 'create'`). The owner keeps this
  (walkthrough: "do not fix"). R1-3 applies the S2 fixes to the **existing combined form** — it does
  NOT rebuild the hero or split create into its own screen.
- **S1-e Welcome hero content** (the `.ghero` CardFan + system StatTiles + invite) is **design-owed**
  (§5) — EXPECTED(design-lane · §4.13). Not this build. The build's `wordmark`+`tagline` header stays.

## Owner-blessed scope rulings (this session, 2026-07-04)
- **S2-h FORGOT? = STUB** (owner ruling). Add the affordance now; on press it routes to a minimal
  "password reset coming soon" placeholder (`Alert`). NO new screen/RTK endpoint. The real request/
  confirm flow (board W7 · W8a/b/c) is EXPECTED(AUTH-04 · dedicated pass) — the backend endpoints
  `POST /auth/password-reset/{request,confirm}` already exist (`auth-routes.ts:67,79`) but stay
  unwired in the client until that pass.
- **S2-i SIWA = STUB** (AUTH-03, enrollment-deferred). Render the compact Apple button + "OR CONTINUE
  WITH" divider on **iOS + sign-in mode only** (`Platform.OS === 'ios'`); on press → the same "coming
  soon" placeholder. Real SIWA (native entitlement + `POST /auth/apple`, unwired in client) is
  EXPECTED(AUTH-03/09 · W6). **Not web-verifiable** (Platform ios) → parvati notes it device-only (R2).

---

## State: sign-in (mode='signin') — the landing form (board W1/W1b, build default)

| # | Element | Component | Board cite | Build cite | Status |
|---|---------|-----------|-----------|-----------|--------|
| 1 | INGAME wordmark + tagline | Text | `.wordmark`/`.eyebrow` | `sign-in.tsx:105–106` | PRE (kept; hero is S1-e design-owed) |
| 2 | EMAIL `TextField` | TextField | `.field` W1:457 | `sign-in.tsx:109–116` | PRE |
| 3 | PASSWORD `TextField` + **FORGOT?** on the label row | TextField (+`labelRight`) · TertiaryLink | `.flabel-row`+`.tlink.mini` W1:458 | `sign-in.tsx:133–140` (no forgot today) | **OWED (S2-h)** — stub route |
| 4 | PASSWORD **SHOW/HIDE reveal** inside the input | TextField (reveal) | `.reveal` W1:458 | `secureTextEntry` always-on, no toggle | **OWED (S2-j)** |
| 5 | SIGN IN primary (orange, block) | ScreenButton/primary | `.kc.primary` W1:459 | `sign-in.tsx:169–174` | PRE (label/gating change per S2-a) |
| 6 | **submit gating** — disabled on empty/erroring, not only busy | (logic) | disabled grammar | `disabled={busy \|\| (create&&!accepted)}` `:172` | **OWED (S2-a)** |
| 7 | **OR CONTINUE WITH** divider (iOS only) | (inline) | `.ordiv` W1:460 | absent | **OWED (S2-i)** iOS |
| 8 | **Sign in with Apple** compact stub (iOS only) | (Apple button) | `.apple.compact` W1:461 | absent | **OWED (S2-i)** iOS · stub |
| 9 | **swap-foot text link** "New to InGame? CREATE ACCOUNT" | TertiaryLink (chevron none) | `.swap-foot`+`.tlink` W1:462 | full `secondary` ScreenButton `:175–185` | **OWED (S2-g)** |
| 10 | top-line auth error (inline, not toast) | Text | authfail grammar (W5) | `sign-in.tsx:167` | PRE (W5 authfail-strip styling = EXPECTED(later)) |
| 11 | 13+/Terms footnote (sign-in) | Text | `.footnote` W1:463 | absent | EXPECTED(out-of-scope · not an S2 item; create-mode carries the real AUTH-10 gate) |

## State: create (mode='create') — the register form (board W2, build toggle)

| # | Element | Component | Board cite | Build cite | Status |
|---|---------|-----------|-----------|-----------|--------|
| 1 | EMAIL / USERNAME / PASSWORD `TextField`s | TextField | W2:563–565 | `sign-in.tsx:109–140` | PRE (username+password gain reveal/clear per S2-j/f) |
| 2 | USERNAME **availability** advisory line | Text | `.stat` W3:606–607 (board=inline; build=below) | `sign-in.tsx:126–130`, `82–97` | PRE placement (build shows it BELOW the field — kept; W3 inline-`.stat` is EXPECTED refinement, not an S2 item) |
| 3 | availability **copy** — taken vs screened | (logic) | W3 AVAILABLE / W4 "NOT ALLOWED" | `:86–92` taken→"TAKEN", else→"NOT ALLOWED" | **OWED (S2-c)** — taken→"NOT AVAILABLE" |
| 4 | AUTH-10 acceptance checkbox + Terms/Privacy links | Pressable+Text | `.accept` W2:566–569 | `sign-in.tsx:142–165` | PRE (OQ-119 · AUTH-10) |
| 5 | CREATE ACCOUNT primary (gated) | ScreenButton/primary | `.kc.primary`/`.disabled` W2:570/W4:646 | `:169–174` | PRE (gating widened per S2-a) |
| 6 | **swap-foot** "Already have one? SIGN IN" | TertiaryLink | `.swap-foot` W2:571 | secondary ScreenButton | **OWED (S2-g)** |
| 7 | field-error text under inputs | TextField `error` | `.ferr` 600·9px W4:642–644 | `TextField.tsx:63–67` 9px·regular | **OWED (S2-e)** weight→screenSemi |
| 8 | **errors clear as user types** (+restore availability) | (logic) | §1.8 "fixable field never a toast" W4 | cleared only on submit `:62–63` | **OWED (S2-f)** |

### create — EXPECTED (later milestones, not built)
- W5 authfail-strip / W5b rate-limit / W5c suspended error variants → EXPECTED(later · AUTH-02/SYS-05/MOD-09).
- W6 SIWA→username-completion (ibanner) → EXPECTED(AUTH-09).
- W3 inline `.stat` in-field (checking spinner / ✓ AVAILABLE in the input) → EXPECTED(refinement; build keeps the below-field advisory line, not an S2 item).

## State: legal (terms · privacy) — `LegalScreen` (build only; no legal mockup board)

| # | Element | Component | Build cite | Status |
|---|---------|-----------|-----------|--------|
| 1 | screen title (display-21) | Text | `LegalScreen.tsx:13,34–39` | PRE |
| 2 | **‹ BACK** link — must sit **UNDER** the title | Pressable+Text | `LegalScreen.tsx:10–12` (ABOVE title today) | **OWED (S2-b)** move under title |
| 3 | DRAFT note + body paragraphs | Text | `LegalScreen.tsx:14–21` | PRE |

## Component enhancements (compose, don't dupe — §1.2)
- **TextField** gains: (a) an optional `labelRight` slot → the `.flabel-row` (label left · FORGOT? right); (b) an internal SHOW/HIDE **reveal** when `secureTextEntry` (board `.reveal`); (c) error text weight → `screenSemi` (board `.ferr` 600). All additive; existing call-sites unaffected.
- **TertiaryLink** gains a `chevron?: 'trailing' | 'leading-back' | 'none'` (default **'trailing'** → collection/add-game/profile callers unchanged); swap-foot = 'none', legal back = 'leading-back' (‹ prefix).

## Owner-notes fold-in
| Note | Manifest line(s) |
|------|------------------|
| S2-g Create account → text link | sign-in #9 · create #6 |
| S2-h FORGOT? affordance (stub) | sign-in #3 |
| S2-i SIWA placeholder (iOS stub) | sign-in #7, #8 |
| S2-j password show/hide | sign-in #4 (+create pw) |
| S2-a submit disabled on empty/erroring | sign-in #6 · create #5 |
| S2-c availability copy | create #3 |
| S2-e field-error to 9px floor (weight) | create #7 |
| S2-f errors clear on type | create #8 |
| S2-b legal BACK under title | legal #2 |

## Predicate self-check plan (recalibration rule b — walked in the receipt)
Changed/added predicates to table-walk when built: **canSubmit** gate (S2-a: empty × erroring × accepted × busy × mode), **reveal** toggle (S2-j: secure × revealed), **availability copy** branch (S2-c: available/taken/screened/checking), **field-error clear** (S2-f: per-field edit → error+availability state), **platform×mode** guard for SIWA/divider (S2-i).
