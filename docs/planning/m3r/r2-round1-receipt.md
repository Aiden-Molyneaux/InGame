# M3-R · R2 — device-review iteration, round 1 (receipt)

> The first batch of owner R2 device-pass fixes (branch `m3`). Source: the owner's on-device review
> of the [R2 delta walkthrough](r2-delta-walkthrough.md), 2026-07-04. **Files touched:**
> `apps/mobile/app/(tabs)/collection.tsx` · `app/sign-in.tsx` · `src/components/{DeviceShell,NavKeycap,
> PulledSheet,TextField}.tsx`. Note: the owner reviews on their **:8081 phone**, whose Metro watches the
> source — so each fix HMR'd onto the device live as it was made.

## Fix ledger — one row per R2 note

| # | Owner note | Fix | File:cite |
|---|------------|-----|-----------|
| **0a** | nav keycap drop-edge lighter | shadowOpacity 1→**0.55** (native) + web boxShadow → `color-mix(ink 55%)` (mockup `.nav-btn` = ink @ 55%) | `NavKeycap.tsx` `key`/`keyPressed` |
| **0b** | drawer needs a "Log Hours" title | `PulledSheet` gains an optional **`title`** prop (page title under the handle); `LogHoursSheet` passes `title="Log Hours"`, its section title → the game name | `PulledSheet.tsx` · `collection.tsx` `LogHoursSheet` |
| **1a** | top bar higher by ~12px | `TOP_BAND` 56→**36**, `TOP_PAD` 8→**4** — content centre = (TOP_PAD+TOP_BAND)/2 below the inset, so 32→20 (up 12); content box 32 (POWER ~23 · grille 23 fit) | `DeviceShell.tsx:53–54` |
| **1b** | PROFILE/DISCOVER labels higher | `lblAbove` translateY −11→**−13** | `NavKeycap.tsx:145` |
| **2a** | ADD button too big — only the `+` icon needed it | removed the `addBtn` size override (button back to **base size**); `PlusIcon size={20}` (was 15) on the tools ADD only | `collection.tsx` ADD button + PlusIcon |
| **4a** | Apple text = Sign In text size | `appleText` weight → **screenBold** (both already 11px; the perceptible gap was weight) | `sign-in.tsx` `appleText` |
| **4b** | errors must not reflow the form (app-wide) | `TextField` always reserves the error line's height (`errorSlot` minHeight 13) → showing/clearing an error causes **no layout shift**; shared → every TextField form | `TextField.tsx` |

## Open-question rulings folded in
| ❓ | Owner ruling | Action |
|----|--------------|--------|
| **OQ-131** | hero should NOT appear during search | ✅ **confirmed** — already the behavior (hero gated on `q===''`); **resolved, no change** |
| **OQ-129** | A–Z ascending by default | on sort-key SWITCH, `setSortAsc(key === 'title')` — A–Z opens ascending, others descending; re-tap still flips (`collection.tsx` sort onPress) |
| **OQ-130** | yes, want a no-results state | new `NoResults` beat ("NO MATCHES" + Clear) when `filtered.length===0 && collectionTotal>0`; hero also yields on filter-zero (`&& filtered.length > 0`); `clearAll` drops filters + exits search |
| **OQ-132** | leave bezel colour as-is | resolved earlier (open-questions.md) |
| **§3 add-game polish** | looks good as-is | GAP-1..4 accepted — **no change** |

## Interpretations flagged to the owner
- **4a** — the Apple + Sign In labels were already both 11px; the difference was weight, so I matched the button's weight. If the owner wants the Apple text *larger* (not just heavier), that's a one-line bump.
- **4b** — reserving error space makes every TextField form a bit taller (stability over compactness — the owner's stated preference). Applied in the shared component, so all its forms benefit; non-TextField error spots (e.g. the sign-in availability line) can get the same treatment as they're hit.

## Checks
- `npm -w @ingame/mobile run typecheck` → clean · `npm run lint:custom` → 8/8 · `test` → 3 suites / 6 pass.
- **Boot check:** `/sign-in` + `/legal/terms` render clean on :8082 (0 console errors), R2 shell changes visible (top bar higher, thinner bezel, labels higher). A `ReferenceError: Pressable is not defined` at LegalScreen appeared during a Fast-Refresh cycle — verified a **stale Metro-bundle artifact** (LegalScreen source has zero `Pressable`; grep + a fresh full load both render clean), the f5628409 staleness — NOT this diff. A dev-stack `down/up` restart (the one owed for the CORS fix) flushes it.
- **Collection changes (0b/2a/129/130) not web-verified** — the :8082 login is blocked (stale-API CORS), so collection is unreachable on web this session. They are code-confirmed + **live on the owner's device** (their phone HMR'd them) + covered by murr on the diff.

## Verification lane
- **murr** (diff): **SOUND ✅** — 0 blocker/major/minor/debt. Walked the OQ-129 sort machine across
  all 5 keys (A–Z→ascending, others→descending, re-tap flips, no batch/stale hazard) + cross-checked
  the `filtered` comparator; proved OQ-130's misleading "total>0 but empty items" state **unreachable**
  (`collection-service.ts:94` returns `collectionTotal === items.length`, no pagination), `clearAll`
  fully restores the shelf, the hero gate hides exactly when NoResults shows; 4b reflow eliminated
  (single-line); 1a content fits the 32px box with the logo aligned; 0a's pressed edge inherits the
  0.55 opacity + `color-mix` is valid on the web dev surface; `PulledSheet.title` optional (SortFilterSheet
  unaffected), `addBtn` removed with zero remaining refs, `PlusIcon size={20}` only on the tools ADD.
  **Two 🤔 owner-calls (bounded, not defects):** a 2-line error still reflows past the 13px reserve
  (single-line is stable); the top-band 32px box fits but is a device-feel judgment — both the owner's
  to confirm at R2.
- **parvati:** the owner's **live device review IS the R2 gate** for this iteration (they see every
  change on the phone); murr covers the code. A separate web-parvati adds little (collection unreachable
  on web).
