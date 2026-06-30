# Sam — average / low-frequency user

*I open this every few weeks, half-remember it, and want the obvious job done fast.*
Tags: `[P]`=presentation `[B]`=behavior. Skipped DS/token nits.

## 1 · welcome-auth
First impression: *"Pretty cards and big numbers — but I just want to sign in; where's the box?"*
- [B][major] sign-in form sits BELOW a full hero so a returning user scrolls past marketing to log in (welcome-auth-states.html:442-459) → anchor email/password above the fold for returning users; hero is for first-timers.
- [P][minor] FORGOT? is a 9px mini link, easy to miss when I've forgotten it (welcome-auth-states.html:458) → normal tappable size.
- [P][minor] errors shout ALL CAPS ("TOO SHORT…") (:644) → sentence case reads friendlier.
- [B][minor] W9 SKIP FOR NOW is dim/buried; unsure skipping is safe (:1005) → "you can verify later in Settings" inline.
- Delight: W9 "YOU'RE IN / Let's fill your cabinet" is a warm hand-off (:997-998).

## 2 · onboarding
First impression: *"A minute, skippable, my shelf isn't empty after — yes please."*
- [B][minor] two ask-screens O6→O7 feel like being asked twice (:824,880) → keep O6 "why" crisp.
- [B][minor] zero-add lands on inviting-empty, never dead grid (:1073) → make next add one tap.
- Delight: never lands on empty collection (:993).

## 3 · collection
First impression: *"Ghost card + ADD A GAME — I know what to do."*
- [P][minor] tools bar is unlabeled dimmed icons; geography taught, meaning isn't (collection-states.html:477-481) → tiny labels until used once.
- [B][minor] no hint a card tap opens the game (:530) → micro-hint "tap a card to open."
- [P][minor] double heading "INSERT FIRST GAME"+"BUILD YOUR SHELF" (:460-461) → one.
- Delight: ghost card teaches shape, POPULAR FIRST ADDS routes to Add (:458-465).

## 4 · add-game
First impression: *"Type a name, a blank card appears — satisfying."*
- [P][minor] "CREATE — KEEP IT IN HAND" + "ADD & CONTINUE" is jargon (:1140,1478) → plainer "Add this game."
- [B][minor] dedup "CREATE ANYWAY" makes a dup with no friction (:1125) → nudge "most people use the match."
- Delight: dedup shows matched card FACE (:1119); P8 "FILED ✓ slot 49" payoff (:1471).

## 5 · styler
First impression: *"KEEP, SAVE PRIVATE, CANVAS? I just wanted a frame."*
- [B][major] three exits with no plain difference (styler-states.html:584,609,611) → human labels; hide Canvas under "Advanced."
- [B][major] premium "CHARGED AT KEEP" racks a bill while browsing free-feeling chips (:652) → running cost as I add.
- [P][minor] "CARD-16" spec ID leaks into UI hint (:493) → drop code.
- Delight: SURPRISE ME deals a finished start (:514).

## 6 · canvas
First impression: *"A full design studio — too much; I'd back out."*
- [B][minor] PUBLISH/SAVE PRIVATE/TO THE STYLER, publish≠save unclear (:832,844) → one line each.
- [P][minor] "Canvas" name doesn't say it's advanced (:409) → "Edit Art."
- Delight: "AUTOSAVED 12S" (:466).

## 7 · game-page
First impression: *"Card + my stats, EDIT STATS obvious — good."*
- [B][minor] 3 nav layers (RETURN, dock, NavBand) (:457,494) → ensure back always means back.
- [P][minor] report buried under ⋯ (:455) → OK for low-use.
- Delight: dual-face + EDIT STATS readout→form (:488,492).

## 8 · device
- [P][minor] sticker no-go only learned by refusal (device-states.html:487) → faint "plastic only."
- [B][minor] D7c premium reconcile = pay-surprise like Styler (:777) → preview total first.
- Delight: shell swap keeps stickers; handles-off preview (:378,546).

## 9 · discover
- [B][minor] wishlist add is dim 9px tertiary (:588) → equal weight.
- [P][minor] toggle at bottom; forget my lens on reopen (:591) → lens in header.
- Delight: empty queue = one clear ADD FROM COLLECTION (:582).

## 10 · friends
- [B][major] feed-first with no feed = dead landing (friends-states.html:614) → roster/connect-first cold-start.
- Delight: cold-start gives 3 find paths inline (:587).

## 11 · find-add-friends · 12 · compare · 13 · lists
- [P][minor] PersonRow many states, sent vs added risk (find-add:604) → confirm toast.
- [P][minor] privacy-limited must not read as broken (compare:579).
- Delight: VS "YOU LEAD +60 HRS" (compare:298); lists ghost podium shows result first (:355).

## 14 · store · 15 · profile
- [B][minor] locked "RETURNS WITH ITS DROP" no timing (store:1349) → add when/notify.
- [P][minor] fresh profile 5+ ADD CTAs at once (713-734) → prioritize one. ADMIN II tier means nothing to me (:467) → hide non-staff.
- Delight: can't-afford bridge "COVERS IT" (store:1067).

## 16-20 · contributor / achievements / settings / report / admin
- [B][minor] contributor near-identical to Profile (:319) → clearer "catalog contributions" label.
- Delight: settings DELETE red vs SIGN OUT cream unambiguous (:344); report dormant SUBMIT explains why (:440). Admin = not for me.

## TOP 5 Sam pains
1. Pay-by-surprise editors: free-feeling chips "CHARGED AT KEEP," no running total (styler:652; device:777).
2. Styler exits KEEP/SAVE PRIVATE/CANVAS undefined (styler:584-611).
3. Returning sign-in below the hero (welcome:442-459).
4. Friends cold-start = feed with no feed (friends:614).
5. Twin Styler/Canvas + code-leaked hints (styler:493; canvas:409).

## Sam delight wins
1. Dedup shows colliding card face + "FILED ✓ slot 49" (add-game:1119,1471).
2. Empties invite not nag — ghost cards everywhere (collection:458, discover:582, lists:355).
3. Compare VS scoreboard pays in one glance (compare:298).
