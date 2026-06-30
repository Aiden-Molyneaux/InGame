# Pip — UI/UX perfectionist

*Motion, micro-interaction, a11y, hierarchy, copy.* Tags `[P]/[B]/[A]` (A=a11y), sev major/minor.
Deliberately skipped DS-token conformance (Burt's lane).

Verdict-shaping facts: only compare/friends/find-add/game-page carry any `transition` (70ms press
fade); **zero** files have `prefers-reduced-motion`; `role=` absent everywhere; ARIA = 2 stray
labels; skeletons are static fills, no shimmer. Captions *describe* motion (flip, redraw, press-runs,
bloom) the artboards never encode.

## 1 · welcome-auth
- [P][major] CardFan dead-static on cold-open (:445) → stagger fan-in + reduce-motion crossfade.
- [B][major] locked nav `pointer-events:none`, tap does nothing (:82) → shake + "sign in to use."
- [P][minor] stats wow-moment unanimated (:452) → count-up. [A][major] no reduce-motion path whole flow.

## 2 · onboarding
- [P][major] "shelf is live" finale static (:348) → slide-in + dissolve. [B][major] step dots don't fill (:551).
- [B][major] push pre-prompt drawer no rise/scrim (:303); [P] ✓ADDED no pop (:603). [A] SKIP contrast (:550).

## 3 · collection
- [P][major] peek-flip described, not built; reduce-motion fallback owed (:1074). [B] flip coachmark has no artboard (:1073).
- [B] long-press no progress/haptic (:1072); grid insert pops; [A] view-toggle aria-pressed.

## 4 · add-game
- [B][major] fan rotate / keystroke-sharpen has no spec (:826); [P][major] add-confirm no celebratory beat (P3) → lift+pop+haptic.
- [B] results restack no transition (:877); [P] NONE-OF-THESE fork too quiet (:827); [A] search/clear SR labels (:833).

## 5 · styler
- [P][major] live redraw no crossfade (:571) — the magic moment. [P][major] KEEP beat unanimated (:611).
- [B] carousel slide static (:626); [A][major] orange CANVAS chip reads like attribute chips for SR (:584).

## 6 · canvas
- Strongest motion design (3 beats, bloom, reduce-motion crossfade :920). [P] beats need timing/sound (:917); [B] skeleton no progress (:968); SHARE peak flat (:877).

## 7 · game-page
- [B][major] EDIT STATS→form has no transition (:488); [B] tab dock no slide (:494); [P] NOW PLAYING no pulse (:455); [A] star rating no numeric SR (:484).

## 8 · device
- [B][major] apply-look swaps shell no transition (:632); [P][major] sticker place/rotate no drag/snap/haptic (:560); [A] remove labelled (:616, good).

## 9 · discover
- [A][major] DRAG TO REORDER gesture-only, no non-gesture path (:440); [B] toggle instant (:470); [P] pin pulse unify (:437).

## 10-11 · friends / find-add
- [P][major] request accept/decline no resolve anim (:303); [A] avatar color sole identity (:311). [P][major] add-sent no morph; [B] copy no toast (:432).

## 12-13 · compare / lists
- [A][major] win/lead color-only (:313) → "you lead" label; [P][major] bars no fill-grow (:308). [A][major] podium drag no keyboard path.

## 14 · store
- [B][major] hold-to-buy no progress-ring/release-early pair (:840); [P] daily tick (:605), toast static (:1208); [A] disabled buy needs reason (:1076).

## 15-17 · profile / contributor / achievements
- [P][major] "EDITS SAVE AS YOU GO" no feedback (:609) → check-pulse. [P] signature no foil shimmer (:304).
- [P][major] achievement rays static, no reduce-motion (:792/789); rewards no cascade (:799).

## 18-20 · settings / report / admin
- [P] triage tap instant (:700), SEND no confirm (:719); [A] toggles aria-checked.
- [B][major] report drawer no slide/scrim (:402); [P] SUBMIT arm no transition (:392). admin ConfirmSheet no focus-trap (:403).

## TOP 5 Pip polish bets
1. **Global `prefers-reduced-motion` contract** — zero files; canvas/collection only describe it.
2. **Encode styler live-redraw + KEEP beat** (:571,611) — "browsing is editing" signature.
3. **Celebration micro-motion**: achievements rays (:792) + onboarding "shelf is live" (:348) drawn but frozen.
4. **Non-gesture reorder** (discover:440, lists podium) — drag-only blocks SR/motor.
5. **Hold-to-buy ring + add-game confirm beats** (store:840, add-game P3).

## Missing-animations roster
Welcome fan/stat (:445,452) · onboarding rail/hero/finale (:348,551) · collection insert/peek-flip
(:1069) · add-game fan/restack (:826,877) · styler redraw/carousel (:571,626) · game-page edit-flip/tabs
(:488,494) · device crossfade/sticker-snap (:632,560) · discover toggle/reorder (:470,440) · friends
collapse/badge (:303,299) · compare bar-grow/tally (:308,301) · store hold-ring/daily (:840,605) ·
profile autosave (:609) · achievements rays/cascade (:792,799) · report rise (:402) · now-playing pulse.
Skeletons all static.

## A11y must-fixes
No reduce-motion anywhere · gesture-only reorder (discover/lists) · color-only status (compare:313,
friends:311) · sparse ARIA (2 labels/20 files); icon keys need names; no role= on tabs/toggles ·
locked NavBand silent · star ratings need numeric SR value.
