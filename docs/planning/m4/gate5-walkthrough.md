# Gate-5 acceptance walkthrough — Game Page (§3.1) + Styler (§3.2)

> The owner's device walk before the Canvas (§3.4). Compiled 2026-07-06 from the two manifests
> (+ADDENDA), both parvati verdicts, and the fix rounds (`m4-review-notes.md`). Every review flag
> from murr + parvati is closed — **anything tagged ✅ that looks wrong is a NEW flag.**
>
> **Tags:**
> - ✅ **SHIP** — built + verified; should feel right. Off = flag it.
> - 🎨 **TASTE** — known divergence held for your eye. Your call: keep or change.
> - ⏳ **LATER** — drawn on the board but deferred with a cite. Don't flag; it's on a ledger.
> - 🧪 **CHECK** — built but not independently exercised on device; your walk is its first proof.
>
> **Setup:** stack is up · Expo Go → `exp://192.168.68.58:8082` · `demo@ingame.app` / `InGameDemo1!`.
> Seed state: Elden Ring has 3 cards (DEFAULT · the walk card **◆ EQUIPPED** · "Aurora" PRIVATE).
> Residue you may delete: one style preset created by the review walk sits in your presets.
> Leave notes in your usual lean tagged style; I'll route them.

---

## Part A — the shelf wears the card (new since your last device look)

1. **Collection, on login.** The Now-Playing hero and the Elden Ring row thumb render the
   **equipped custom card** (live skia face), not the flat purple default. ✅
   *If a card ever fails to render, it should degrade to an empty card box — never a red screen.* ✅
2. **Profile.** Favourite / Top-3 / now-playing slots wear composed faces where the game has an
   equipped custom card. 🧪 (built app-wide in `e9138ce`; parvati verified Collection, not Profile)
3. Tap the hero (or a list row) → lands on `/game/:id`. ✅ (CARD-23 NAVIGATE)

## Part B — Game page · PLAY

4. **Head:** "GAME" + `▸ NOW PLAYING` tag (only while pinned) + `⋯` + `‹ RETURN TO COLLECTION`. ✅
5. **Hero, dual face:** the FACE is the **composed equipped card**; the STATS BACK shows
   HOURS / COMPLETE % / STATUS / SINCE and **CARD ARTIST — YOU** (custom) vs DEFAULT. ✅
6. **YOUR PLAY dossier:**
   - **NOTES reads back** what you saved, and EDIT pre-fills it — new, OQ-134 closed. ✅
   - PLATFORMS row shows an honest "—". ⏳ (COL-04 substrate · M5-lane, 0058 §7)
   - RATING = 5 greyed stars "PENDING". ⏳ (OQ-058 unresolved)
7. **Action row:** EDIT STATS (primary) · SWITCH CARD · SHARE greyed. SHARE ⏳ (CARD-21 · M5)
8. **EDIT-STATS:** form flips in place; stats-back label "↻ UPDATES LIVE"; **5 status chips —
   no WISHLIST** (OQ-070 ruling); hours/%/owned-since round-trip on ✓ DONE. ✅
   - 🎨 copy: status label reads "COMPLETED 100%" app-wide vs the board's "COMPLETED" — your
     standing copy call from §3.1, unchanged.
9. **⋯ overflow:** GAME OPTIONS → CLEAR NOW PLAYING · REMOVE FROM COLLECTION (danger) → the 0040
   ConfirmSheet, cancel-default. Cancel it — don't nuke the seed. ✅

## Part C — Game page · CARDS (the switcher, live multi-card)

10. **Head:** "YOUR CARDS FOR ELDEN RING — 3" (real count) + **⇅ SORT, present-but-greyed** —
    added this fix round. Ordering itself ⏳ (CARD-17 at-scale). ✅/⏳
11. **Tiles:** DEFAULT · ◆ EQUIPPED · PRIVATE tags; live composed faces; orange stepped
    select-ring moves on plain tap (select, never navigate). ✅
12. **Per-state guards** (tap each tile, read the inline options):
    - equipped → SET AS MAIN + DELETE greyed, note "Your shelf wears this card…". ✅
    - private → all live, DELETE danger-red → 0040 sheet (cancel it). ✅
    - default → EDIT/DELETE greyed. ✅
13. **SET AS MAIN** on "Aurora" → ◆ moves, the PLAY hero + Collection shelf re-wear it. Set the
    walk card back after. ✅
14. **CardDetail (INSPECT):** tap the PLAY hero → sheet with enlarged card + EquipReadout chips
    derived from the real composition + visible ✕ close. SHARE/EDIT greyed ⏳ (M5 / Styler edit
    rides the switcher instead). ✅
15. **BROWSE THE COMMUNITY** = an honest "arrives in a later release" placeholder. ⏳ (M5, 0062)
16. **ABOUT tab** = clean M5 placeholder. ⏳ · **Loading/error states** (L1 skeleton, L2 SIGNAL
    LOST) need a broken fetch to see — skip. 🧪

## Part D — the Styler, end to end

*Enter via DESIGN NEW (or SWITCH CARD → DESIGN NEW).*

17. **P1 BaseRail — never blank:** 3-up fan, ‹ › rotate with the dot rail tracking; DEFAULT ·
    NEBULA/HORIZON (TEMPLATE) · ARCADE/MUSEUM (KIT) · **your saved presets ride alongside**
    (CARD-24b). ✅
    - 🎨 **TASTE #1:** the fore-label doubles on the default — "DEFAULT — DEFAULT · FOREFRONT".
    - 🎨 **TASTE #2:** **START WITH THIS renders gold/stepped**; the board draws it as the plain
      primary button. Coherent with DESIGN NEW + KEEP as a create-family — your call.
18. **⯒ SURPRISE ME** deals a real multi-attribute start, re-dealable. ✅
19. **START WITH THIS** → the edit surface on a fresh draft. Double-tap shouldn't double-create
    (guarded this round). ✅
20. **P2 the surface:** save-state line lives ("SAVING… → SAVED 0s AGO → ticks up"); hero
    **redraws on every pick**; section chips FRAME·EFFECT·FINISH·PLATE·TITLE are tabs; the
    **⤢ CANVAS chip is present-but-disabled** — that's the §3.4 posture, it's what we build next. ⏳
21. **The five rails** (decision 0063 free roster, all FREE-tagged):
    - FRAME 6 · EFFECT none+5 with **INTENSITY slider** (appears with an active effect; drag it —
      it now owns the whole track, taps on the thumb don't snap to 0) · FINISH none+2 ·
      PLATE none+3 · TITLE 2 fonts + 6 inks. ✅
    - **PLATE + TITLE tiles preview larger (96×134)** so the plate/font actually shows —
      fixed this round (they previewed identically before). ✅
    - Fonts are 2-of-5 ⏳ (pixel/serif/script ride the pre-launch roster pass, 0063) · price
      chips / PREVIEW flags / premium anything ⏳ (M5 · 0062) · section swipe gesture ⏳ (§3.6,
      chips + dots for now).
22. **THE fix-round repro — plate NONE keeps the title's font/ink:** pick a KIT start (ARCADE =
    PAYTONE font) → PLATE → NONE → TITLE → pick an ink → **the font stays PAYTONE** → PLATE →
    SLAB → title returns wearing that font + ink. Pre-fix, the ink pick reset the font. ✅
    - 🎨/OQ **TASTE #3 → OQ-135:** plate **NONE renders a face with no title at all**. Decision
      0063 sanctions it; the board hints "THE NAME ALWAYS RENDERS". **Your ruling:** is a
      titleless face acceptable, or does NONE owe a floating plateless title?
23. **Autosave exits (the murr lane, all fixed this round):**
    - Edit something, then **◂ immediately** (inside the debounce) → re-enter from the switcher →
      the last pick is there. ✅ (quiet-exit now flushes)
    - **◂ on an untouched new draft** → it silently vanishes (no orphan). ✅
    - **⋯ → SAVE AS NEW CARD, then ◂ without editing** → the copy **survives** in the switcher.
      Pre-fix it was silently deleted. ✅
    - Kill the app mid-edit → the draft survives server-side, listed DRAFT, resumes by tile. ✅
    - A DRAFT tile → SET AS MAIN is greyed ("finish it to equip it"). ✅
24. **⋯ overflow:** SAVE AS NEW CARD · SAVE STYLE AS PRESET (lands in your presets, cap 30; it
    then rides the BaseRail) · DISCARD DRAFT → 0040 sheet. ✅
25. **KEEP — EQUIP IT** → **KeepBeat:** card centered wearing the gold edge, "✓ EQUIPPED FOR
    ELDEN RING / Your shelf wears it now.", **honest clout** ("N CARDS DESIGNED" = real count),
    disabled Canvas door, DONE lands on the game page **wearing it**. ✅
    - 🎨 **TASTE #4:** EQUIP IT is missing its **◆ glyph** (board draws the gold stepped button
      *with* the diamond). One glyph — say keep-or-add.
    - PX-spent line on the beat ⏳ (M5 wallet).
26. **SAVE PRIVATE** (quiet tertiary, left) → no beat, straight back; the card lists PRIVATE,
    not equipped. ✅
27. **Clean up:** DELETE the cards you created (0040-confirmed) and re-equip the walk card.

## Part E — the standing taste sheet (decide these, then Canvas)

| # | Call | Where |
|---|------|-------|
| 1 | BaseRail "DEFAULT — DEFAULT" label doubling — suppress the type token when name=type? | P1 |
| 2 | START WITH THIS gold/stepped vs the board's plain primary | P1 |
| 3 | **OQ-135** — plate-NONE titleless face vs "the name always renders" | P3/hero |
| 4 | EQUIP IT missing the ◆ diamond glyph | P2 tools |
| 5 | "COMPLETED 100%" vs "COMPLETED" (app-wide status label, from §3.1) | EDIT-STATS |
| 6 | **Two skins of "default"** — the switcher's DEFAULT tile is the static purple CARD-18 asset while the BaseRail's DEFAULT base renders the skia dark-indigo face; adjacent surfaces show different "defaults". Resolves when CARD-18 becomes one composition render — pull that forward, or live with it? | CARDS ↔ P1 |

## Known ledger (don't flag — already cited)

M5 / later, drawn-not-built: wallet + price chips + premium picks + reconcile (0062) · publish +
community gallery + adopt (M5) · SHARE everywhere (CARD-21) · platforms (COL-04) · rating (OQ-058) ·
sort ordering (CARD-17) · swipe gesture (§3.6) · 3 more fonts (0063 roster pass) · offline (SYS-10) ·
ABOUT content (M5) · the ⤢ Canvas door (§3.4 — next).
