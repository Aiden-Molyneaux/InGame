# Acceptance Suite — W-4 (Avatar Editor) → now

> An owner walkthrough to accept every new component/functionality landed since the Monogram Forge,
> a physical route through the app (auth → collection → profile → device → game page → store →
> friends → add-game). Tick each box; jot findings in the margin — they become the next walk-notes
> stash. Built from the branch-`m6` @ `ecebb29` code map.

**Scope boundary.** The **avatar editor (W-4 Monogram Forge, product-spec 0.64)** is the landmark. This
suite covers W-4 → now: the Monogram Forge · the auth **client** screens (forgot-password · Sign in with
Apple · choose-username — all built this session) · **W-5** Ultimate cosmetics · the reworked **Game-About**
surface (W-6 wiki edit + the walk-3 details/stats) · the **adopted-card readout** · and the two walk waves
(the 17-finding wave + the stash-3 features: add-game fork, community-cards list, structural styler).

**Legend.** `[ ]` do it · **PASS =** the acceptance bar · ⚠ = **seed-blocked** on the current dev seed
(see *Seed readiness* at the end — I can fix most of it with a richer seed in ~10 min) · 🔒 = **owner-gate
owed** before it can be exercised for real.

**Login:** demo@ingame.app / InGameDemo1!. The `walkseed_*` data is loaded: **walkseed_avatar** (a friend
with a loud pink/cyan `W4·ring` monogram) · an **adopted Hades** card on demo's shelf · a **teal ultimate
Stardew** card owned by walkseed_ultimate.

---

## Part 1 · Auth surfaces (before you log in)

### 1.1 · Forgot password
- [ ] Sign-in (signin mode) → the password row's **"Forgot?"** link → `/forgot-password`.
- [ ] **S1 email** → "Send code" (enter demo@ingame.app). **PASS:** advances to S2 with neutral copy.
- [ ] Grab the 6-digit code from the **API console** (the stub provider logs it: `stub email "sent"` — I can read it to you live). Enter a **wrong** code first. **PASS:** inline "That code is invalid or has expired," stays on S2.
- [ ] Watch the **RESEND IN {n}s** cooldown tick, then resend. Enter the real code → **S3** → new password (≥8) → **the seal** ("ALL SET / PASSWORD UPDATED / Return to sign in"). **PASS:** whole loop works; the seal offers a clean return.
- [ ] *Enumeration check:* try a **nonexistent** email at S1. **PASS:** it advances identically (never reveals the account doesn't exist).
- 🔒 *Owed before real emails send:* the Resend sending-domain setup (your sitting item). Today the code only reaches the log, not an inbox.

### 1.2 · Sign in with Apple + choose-username ⚠🔒
- [ ] Sign-in (signin mode) → look for the **"OR CONTINUE WITH"** divider + black **Sign in with Apple** button.
- ⚠ **On web/Expo Go the button is intentionally absent** (iOS-native-only). You can only truly accept SIWA on an **EAS dev build**, and that needs the **App-ID capability toggle** (your ~5-min sitting item). 🔒
- [ ] *Choose-username (reachable via a mock-Apple dev token, or accept on the EAS build):* type a name → the **advisory line** (CHECKING… / AVAILABLE / NOT AVAILABLE / NOT ALLOWED) → **Claim handle**. **PASS:** advisory updates live; CLAIM stays pressable even on "NOT AVAILABLE" (by design — the server is the real check); the `usernamePending` gate walls a half-finished account here from every entry.

---

## Part 2 · Collection

### 2.1 · Equal-height header counters
- [ ] Look top-right at **"{N} GAMES"** next to the **Pixel counter**. **PASS:** the two chips are the **same container height** (the regression you flagged — they share one stretch band now).

### 2.2 · The flip-hint (layout-neutral)
- [ ] Fresh session on SHELF or GRID → the **"Tap a card to flip it for your stats"** hint appears. **PASS:** it appears/dismisses **without shifting the shelf** (it's an absolute overlay now). Flip a card to dismiss; nothing below jumps.

### 2.3 · Row-body tap-to-open
- [ ] SHELF view → tap a row **anywhere on the meta/chevron area** (not the card). **PASS:** opens the game page. Then tap the **card face**. **PASS:** it **flips** (stats), does *not* navigate. (a11y label reads "Open {game}".)

---

## Part 3 · Profile — the Monogram Forge (W-4)

### 3.1 · The Forge
- [ ] Profile tab → **"Edit profile"** (cream pencil) → tap the avatar's **✎ pencil badge** → the **Monogram Forge** mounts inline.
- [ ] Exercise all four fields: **BACKGROUND** colour · **INK** colour · **Letters** (glyph; blank → your initials) · **FRAME** (NONE / RING / INSET / DOUBLE). **PASS:** the 64px preview head updates live; each field commits on settle (colour) / blur (glyph) / tap (frame).
- [ ] **Contrast guard:** pick a low-contrast bg/ink pair. **PASS:** "That pair is hard to read…" shows and the change is **withheld** (not saved).
- [ ] **RESET TO DEFAULT** → **PASS:** reverts to the deterministic default monogram (byte-identical to a null config).

### 3.2 · The monogram renders everywhere (cross-check)
- [ ] Go to Friends → find **walkseed_avatar**. **PASS:** its loud **pink-bg / cyan-ink / "W4" / ring-frame** monogram renders in the roster row (and will in feed / search / compare — the one `<Avatar>` carries the config app-wide). This closes the W-4 row-monogram-colour verification gap.

---

## Part 4 · Device editor

### 4.1 · Sticker save-slot (no jar)
- [ ] Profile → **My Device** row's **EDIT** keycap → `/device` → select a sticker and **move it** a few times.
- [ ] **PASS:** the "SAVING… ↔ settled" status **does not grow/shrink the screen** during drag→release→drag (it now swaps inside a fixed-height reserved slot). This is the "editing device banner jars every move" fix.
- 🤔 *Consideration W3-D:* the `PLACING`/save readout survives (part of the old W-B5 banner family). Bless it now that it doesn't jar, or say the word to retire it entirely.

---

## Part 5 · Game page (open one of your own games, e.g. Hades)

### 5.1 · About — edit via the overflow + disclaimer + age-gate
- [ ] On the OWN game page → the **"⋯"** overflow (top-right) → **"Edit catalog details"** → jumps to ABOUT in edit mode.
- [ ] **PASS:** the accuracy disclaimer renders as the standard **InlineBanner** (accent-bordered — *not* the old bespoke left-bar box you flagged); copy encourages accurate edits.
- ⚠🔒 *Age-gate:* editing needs the account ≥ **14 days** old. If the demo account is younger it shows "EDITING UNLOCKS AFTER 14 DAYS" — accept the gate copy, but the edit fields themselves need an aged (or admin) account.
- 🤔 *Consideration W3-A:* on CATALOG/FRIEND postures the EDIT key stays **inline** (those pages have no overflow). Bless the posture split, or ask me to grow a catalog overflow.

### 5.2 · About — labeled details
- [ ] Read the DETAILS block. **PASS:** explicit labeled rows **STUDIO / PUBLISHER / RELEASE DATE / GENRES** (genres as chips, **exactly once** — the double-render bug is gone); an absent field **omits its whole row** (no empty labels).

### 5.3 · About — community stats
- [ ] Read the stats **on Hades**. **PASS:** **COLLECTIONS** · **FRIENDS HAVE IT** show; **AVG RATING = 4.0★** and **AVG HOURS = 68** (rich-seeded: 4 raters at 3/4/5/4, 7 owners incl. one add-without-rate — the raters-vs-owners denominators working). A game with no raters omits the tile (never a misleading "0"). (Note: I labeled it AVG RATING, not "ranking" — the app's concept is the 1–5 rating; flag if you want different wording.)

### 5.4 · Adopted-card cosmetics readout
- [ ] Game page → **CARDS** dock tab → the card switcher → tap the **ADOPTED** Hades card (walkseed). **PASS:** it now shows a **read-only cosmetics readout** (from server labels) plus "Adopted from {designer} — adopted cards can't be edited"; only Set-as-main / Share / Remove offered. This closes the W-A1 adopted-artist gap and the "adopted cards show no cosmetics" regression.

### 5.5 · Community cards — inline + full list
- [ ] CARDS tab → the inline **COMMUNITY CARDS** gallery. **PASS:** shows top-12 with a **SORT** toggle (TOP↔NEW) and a **SEE ALL {N} ›** door.
- [ ] SEE ALL → `/game/[id]/cards` → **TOP / NEW** switch, the grid, **Load more** / "That's everything." **PASS:** TOP is adoption-ranked, NEW is recency; adopt gated to the right contexts.
- **Rich-seeded on Stardew Valley (31 published cards):** the inline gallery shows top-12 + **SEE ALL 31 ›**; the full list pages 24 then **Load more** → the remaining 7 → "That's everything." **TOP's head order is 4·3·2·1·1 adoptions** (designer1's card first) and visibly differs from NEW (designer6's latest first) — flip the toggle and watch the reorder.

### 5.6 · Styler — structural start-froms + DEAL A CARD *(your attempt-three verdict)*
- [ ] CARDS tab → **Design new** → the **"START FROM — STRUCTURES & YOUR PRESETS"** fan. **PASS (taste is yours):** 3 **backdrops** (DIAGONAL SPLIT / INSET PANEL / BANDED THIRDS) · 3 **title layouts** (ARC BANNER with the *real* title arced / TAG+MONOGRAM / CAPTION BLOCK) · 2 **emblems** (ringed invader / crown-shield) · DEFAULT last — each reads as a **structure a user would reach for**, not a moodboard.
- [ ] **Change the base** (the layer-rail base slip) then re-open the fan. **PASS:** the template tones **re-derive from the new base** (indigo panels on an ember base = fail — this was a Murr catch, now fixed).
- [ ] **"Deal a card"** ×4–5. **PASS-or-cut:** each deal is coherent and zone-respecting (never overlaps title/nameplate), occasionally emblem-free. **Per your framing, removal is on the table** — one array-delete — if it still doesn't clear your bar.
- 🤔 *Polish (Parvati):* a deal that draws TAG+MONOGRAM + BADGE CLUSTER reads slightly dense (zone-legal, just busy).

### 5.7 · Styler — Ultimate colour fields (W-5)
- [ ] Adopt/equip the **teal Stardew ultimate** card (or design new with an ultimate SKU) → in the styler, select the ultimate design. **PASS:** a **COLOUR** ColorField mounts in the **FRAME** (marquee-ultimate) or **PLATE** (brass-ultimate) section; a **TITLE** with an ultimate font upgrades the ink row to **"INK — ANY COLOUR"** free-pick. Non-ultimate designs never mount it. This is the whole W-5 payoff — you're also eyeballing the "saturated hue on the live marquee" polish item here.

---

## Part 6 · Store (gold nav keycap)

### 6.1 · Spotlight + Ultimate presentation
- [ ] Browse → the lead grid reads **SPOTLIGHT** (not "New This Week"). **PASS:** it's a fixed curated set, not a promise of weekly churn.
- [ ] Open **THE INDEX — ALL AISLES** → a FRAMES / NAMEPLATES / FONTS aisle. **PASS:** the three ultimates (**MARQUEE / BRASS / SCRIPT ULTIMATE**) **sort first**, wear the gold **ULTIMATE chip** + **hue-strip** glyph, and their sheets say **"ANY COLOUR — YOURS TO PICK"**; non-ultimate items wear neither tell. ⚠ Depends on the premium roster being server-tagged in this build.
- 🤔 *Considerations:* Spotlight **curation policy** (W3-C) is yours to set at the design round — and note the empty-list fallback is the registry tail (shells/themes), so keep the curated list non-empty. Base-vs-ultimate co-listing in an aisle (Parvati eye): does it read as a dupe to a first-timer?

### 6.2 · Bottom entries
- [ ] Scroll to the store foot → the **StoreEntries** section. **PASS:** two rows — **PIXEL TOP-UP** (→ top-up) and **WALLET** (→ wallet), drawn in the Index row grammar; and **THE INDEX is aisles-only** now (the Top-Up door moved here).

---

## Part 7 · Friends

### 7.1 · Friend profile
- [ ] Friends → open a friend. **PASS on each:** **{NAME}'S CONTRIBUTIONS** teaser (routes to their contributor page, shown even at 0) · **Compare hours** in the **cream/white secondary** voice · the **"⋯"** overflow opens a **real report/block sheet** (the scrim-with-nothing bug is dead) · the **Achievements** heading/count at the correct (smaller) size matching your own profile.
- **Pinned favourite — rich-seeded:** open **walkseed_avatar** — their PINNED FAVOURITE hero shows **Hades (60h) wearing their own published card face**. (A friend with no pin correctly shows no hero.)

---

## Part 8 · Add-Game flow (Collection → gold Add)

### 8.1 · Search — no jar
- [ ] Start typing in the search bar. **PASS:** the results-status area (spinner ↔ NO MATCHES) **does not shove the screen** as you type (reserved-height anchor + overlay spinner).

### 8.2 · The card fork *(the "missing functionality" you flagged — now built)*
- [ ] Add a game **with** community cards (Stardew has the teal ultimate). Post-add sequence: **ADDED stats → SET A STATUS (Next) → the FORK**. **PASS:** "ADOPT A CARD — OR DESIGN YOUR OWN" with a **top-6 adoption-ranked strip** · **SEE ALL {N} ›** · **Design your own ›** (→ the styler) · **Keep the default for now**.
- [ ] Add a **card-less** game. **PASS:** the fork still renders (design + keep, no strip/see-all) — **no more silent skip** (that silent auto-advance is why you never saw this step before).
- 🤔 *Consideration W3-J:* if you adopt via the fork's **SEE ALL** door then back out, the fork still reads "Keep the default" (state persists correctly, the label just lies). Cheap fix — say the word.

### 8.3 · Full list from the fork
- [ ] SEE ALL from the fork → the paged list with TOP/NEW. **PASS:** same as 5.5 — fully exercisable now (add Stardew-adjacent games, or re-walk 5.5's list; Stardew itself is already on your shelf, so the fork demo uses any card-bearing game not in your collection).

---

## Outstanding questions & considerations — nod or redirect (one pass)

My recommendation is first; **"Other"** is always yours.

| # | Question | My recommendation |
|---|---|---|
| **W3-A** | About-EDIT lives in the overflow on OWN, inline on CATALOG/FRIEND — unify? | **Bless the split** for beta (those postures have no overflow to hide it in); revisit only if it grates. |
| **W3-B** | The flip-hint re-shows every relog (logout purges per-user prefs) — once-ever instead? | **Leave for beta** (few relogins); once-ever needs a purge-surviving flag — cheap but a semantics change. |
| **W3-C** | Spotlight curation cadence/policy | **Manual curation, set at the design round.** No auto-churn. Keep the list non-empty (the empty fallback is shells/themes). |
| **W3-D** | Retire the device PLACING/save readout entirely (W-B5 direction)? | **Keep it** now that it doesn't jar — it's real save feedback. Retire only if you're committed to the full banner purge. |
| **W3-E** | `cardsPublished` is required-not-nullable (breaks the file's nullable-for-rollout convention) | **Bless required for beta** (client+server deploy in lockstep); make it `.nullable()` only if you ever stagger deploys. |
| **W3-F** | *(Superseded)* the old styler palette-family veto | **Obsolete** — the structural rebuild replaced families. The live question is your **5.6 verdict** (fan + keep-or-cut DEAL). |
| **W3-G** | Garbage/overflow cursor → silent page 1 vs a 422 | **Keep silent page-1** — matches the contributor-list grammar; the overflow-500 bug is already fixed underneath it. |
| **W3-H** | Offset paging can dup/skip a row if an adoption lands mid-scroll | **Accept at beta scale** (12 testers, rare concurrency). Conscious acceptance; revisit if it shows. |
| **W3-I** | Adopting from the full list resets accumulated pages (snaps to page 1) | **Accept for beta** (contributor precedent); polish candidate for deep-scroll+adopt. |
| **W3-J** | Fork's SEE-ALL adopt leaves the exit reading "Keep the default" | **Fix it** — the one UX lie here; cheap. My recommendation is to action this. |
| **Parked-1** | W-5 draft **share-image** can leak an unowned ultimate's colour freedom (pre-existing M5-P9 class, W-5 widened) | **Owner call.** Low-value exploit, pre-existing — I lean *accept for beta + note*, or I gate the draft-share path if you'd rather. |
| **Parked-2** | HueStrip's 5 spectrum colour literals (only new file with non-token colours) | **Bless** — illustrative art, matches the CosmeticSwatch precedent. |
| **Parked-3** | W-5 Parvati eyes: saturated-hue read · optional featured-slot swap · aisle co-listing | Judge on the **5.7 / 6.1** walk; all cosmetic. |
| **Copy-1** | Community "avg **ranking**" → I shipped **AVG RATING** (the app's 1–5 concept) | Confirm the wording, or name the metric you meant. |

**Also owed before *full* acceptance is even possible** (your sitting batch, not walk items): the **SIWA App-ID toggle** (1.2) · the **email sending domain** (1.1) · an **aged/admin demo account** for the wiki-edit gate (5.1).

---

## Iteration notes (the running backlog)

- **Pre-beta performance (the load-harness cliffs)** — `/me/collection` is unpaginated · the shelf mounts N live skia canvases (no windowing) · thumbs serve `max-age=0` (no caching) · every mutation refetches + re-parses the whole shelf. These are a **candidate build wave before beta** (details in `load-harness-notes.md`). I'd slot them ahead of the beta-exit lane.
- **Richer walk-seed** — five acceptance steps are seed-blocked (below). One ~10-min seed closes them all.
- **Sticker packs** — the ghost aisle (wired end-to-end, zero catalog rows) is the headline gap in `cosmetic-inventory.md`; rides the next cosmetic design round.
- **Styler polish** — the dense TAG+MONOGRAM+BADGE deal combo (5.6).
- **Auth test hygiene** — the forgot-password/choose-username jest suites flake on timeouts under full-suite parallel contention (never in clean runs); a timeout bump is owed.
- **Older parked polish** — "H" vs "HRS" unit label · the now-playing pin's kept ▶ NOW badge.

---

## Seed readiness — RICH SEED LANDED (2026-07-21, `walk-seed-rich.ts`)

The rich walk-seed is in (strictly additive, zero deletions, demo/ADawg untouched — backup
`local_ingame_2026-07-21T23-09-38.sql` taken first). **Every check in this suite is now exercisable
in the web walk except two:**

- **1.2 SIWA** — needs an **EAS dev build** + the App-ID toggle (never on web). Rides P16 + your sitting.
- **5.1 wiki edit fields** — needs the demo account **≥14 days** old (or admin). The gate copy itself is acceptable now.

**What the rich seed added (all `walkseed_*`, all via real services):** 5 rater users on Hades
(hours 12/45/80/150/30, ratings 3/4/5/4/— → **avgRating 4.0 · avgHours 68**, owners 7 > raters 4) ·
walkseed_avatar's **pinned Hades favourite wearing their own published card** (+ a rater1↔avatar
bond) · **30 new free Stardew cards** from 6 designer users (total 31 with the teal ultimate) with an
**11-adoption spread (4·3·2·1·1·0…)** so TOP visibly reorders vs NEW, SEE ALL 31 shows, and Load-more
pages 24 → 7. The seed script is idempotent (safe to re-run).
