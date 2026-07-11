# InGame — Component Map (catalog → code)

> **What this is:** the bridge from the design-spec **§1.5 component catalog** to the codebase. It
> assigns every named component a **canonical code symbol**, a **props/variant shape**, the **tokens it
> consumes**, what it **composes from**, and a **build status**. It exists so the build agent implements
> each shared component **once, reusably**, instead of re-deriving it per screen. The map governs
> **naming + reuse conventions from the ground stage** — it is the executable echo of §1.5.

**Version:** 0.9 · **Date:** 2026-07-10 · **Author:** Claude · **Owner:** Aiden ·
**Maps from:** `design-spec.md` §1.5 (v0.57) · **Implements toward:** Expo / RN (product-spec §9).
**0.5:** §3.4 Canvas gate-5 batch (decision 0067) — **`TransformDrawer`** (position/size/rotation) **subsumes `NumPop`**; new shared **`ColorPicker`** (HS+value+hex; Canvas element fill/stroke — title-ink adoption OQ-137/M5); Canvas breakout = **zoom** (transform-only, no remount); **base pseudo-slip** + BASE off ADD; isolation **toggle**; cap-meter **orange**.
**0.6:** §3.4 gate-5 iteration round 3 (design-spec 0.54) — rail **z-ascending L→R, base leading**; TransformDrawer **finer nudges + hold ramp + X·Y read-out**; RESIZE-BOX-OFF hides the whole ring + the toggle rides the EDIT sheet; TRANSFORM accent-weighted + an EDIT-panel door; **one fixed bottom-panel height**; ColorPicker **applies on release** + FROM-CARD unfiltered; sliders/pickers **scroll-lock their host while held** (new `ScrollLock` util, not a UI component).
**0.7:** §3.4 gate-5 iteration round 4 (design-spec 0.55) — TRANSFORM keys go **cream** (the PROOF voice) + the panel-head doors run **both ways** (EDIT↔TRANSFORM); the TransformDrawer **condenses** (ROTATE inside POSITION; RESIZE BOX as the EDIT row grammar); tap = one 0.5% nudge (~350ms repeat delay) + a harder hold ramp; the **sel-ring rotates with the slip + gains a rotation handle** (quarter snaps; the slider stays the CARD-16 pair — CanvasStage gains `onRotate`); rack caption + cap-meter under the rail; PROOF∥PRESS right-docked, held through PROOFING; EDIT sheet meta-line dropped + OPACITY under FILL; ISOLATION chip higher + accent-when-ON.
**0.8:** §3.4 gate-5 iteration round 5 (design-spec 0.56) — DeviceShell breakout = a **boundary-continuous zoom** (measured framed→full rects; swap at coincidence; the dip retired); the **editbar persists** across bench/EDIT/TRANSFORM (RESET · cream TRANSFORM · unlabelled ↺/↻, one cluster — the EDIT-head TRANSFORM door retires); **ops/rename swap into the bench-button slot** (single-line scroll row; rename rides `KeyboardLift`; ops rendering lifts from LayerRack to CanvasSurface); rack caption row reverts to round 3; EDIT sheet MORE last; TransformDrawer **sliders → ◀ value ▶ stepper rows** (POSITION arrows inline).
**0.9:** button-convention ratification (decision 0069) — `ScreenButton/secondary` **build-conformed to cream/navy** (§1.5 already said cream; the build was grey `scr.panelHi`) + `mini` size + a cream `active` ON-state; the bespoke Canvas cream keys retired into the catalog (PROOF/TRANSFORM/panel-door → `secondary·mini`; undo/redo → `ToolButton`+`disabled`); `#d9d4c2` literal → `brand.creamPressed`; the AssetShelf category tabs were left as their original bespoke cream chips — a `SectionSwitch/cream` conversion was built then **reverted on owner visual review**; DESIGN NEW **build-conformed to gold** (F-02); Canvas DELETE → alert **fill**; 3 mockup F-rule rule-wins (styler `.chip.canvas` flat · game-page duplicate `:active` removed · `.newtile` gold). Grey `Tog`/`boxTog` extraction deferred to CARD-16/polish.
**0.2:** intentionality review — Keycap family → Screen/Tool/Count (owner ruling), social 5→2, Strip/GTag renamed.
**0.3:** housekeeping (decision 0042) — Admin `QueueRow`→`ModQueueRow`; onboarding banners named `LiveBanner`/`PrePrompt` (+ `InlineBanner` reuse); game-page `.presence` confirmed **live `PresenceStats` (CAT-09)**, not the cut presence — keep.
**0.4:** re-sync to §1.5 v0.49 — nameplate F-06 binding (0047); GameCard CARD-23 four-mode tap + CardDetail enlarge (0048); §4.7 Lists editor RETIRED, SlotFrame/RankSlot/CardPicker relocate to Collection TOP view-mode (0049/0050); Collection view-switch SHELF·GRID·LIST·TOP; Achievements (§13) + Admin (§14) formalized → 🔶 locked ✅; new brand.secret/scr.secret token; CommunityGallery + RecommendSheet + §1.6b A11y baseline added; §15 QueueRow(Admin)→ModQueueRow alias registered; VIEW COLLECTION / VIEW TOP 10 doors.

> ✅ **Re-synced to §1.5 v0.49 (v0.4, 2026-06-30).** Top-10/card-tap/admin/achievements tracks reconciled;
> 🔶 Achievements (4.10) + Admin (4.4) names LOCKED. Remaining M2-entry gate work (OQ-111) is component-library
> build, not name drift.

## 0. Truth precedence (where this sits)
1. **`design-spec.md` §1.5 + Foundation Rules F-01..F-09 win.** This map never invents or changes
   behavior/visuals; it *names the code*. A name conflict → the spec is right, fix the map.
2. **A new component starts in §1.5, then lands here** (00-INDEX §4). Code-first components are a
   smell — file to `open-questions.md` first.
3. **Mockup CSS classes are throwaway.** The `class seen` column is evidence only; never the API.

## 1. Naming law (non-negotiable — the reason this doc governs)
1. **One symbol per §1.5 name, verbatim PascalCase.** `ScreenButton` in spec ⇒ `ScreenButton` in code.
   Grep an ID/name across spec→map→code→tests must hit one thing. No RN-idiom renames.
2. **Slash-variants are PROPS, never new components.** `ScreenButton/primary` ⇒ `variant="primary"`;
   `GameCard/cell` ⇒ `size="cell"`; `SectionSwitch/rail` ⇒ `variant="rail"`. Forking a component per
   screen is the #1 thing review rejects.
3. **Aliases collapse to the canonical, with a pointer** (§9). `SegmentedKeycap`/`SectionChips` are
   `SectionSwitch` variants (decision 0030); the old names stay searchable, not implemented.
4. **Lifecycle/state is ONE family** (`Skeleton`/`LoadError`/`Unavailable`/`Offline`/`EmptyState`/
   `Toast`), built once, themed — never re-cut per board (§1.6, F shared).
5. **Tokens only — no literals.** Every colour/size/step reads from the theme module (§2). The
   4-step scale 21/15/11/9 is the only on-screen type (F-06); radius only on shell (F-07); selection =
   accent border + `StateMark` (F-09); RoleTag/trust markers **not gold** (F-02).
6. **Sheets:** `*Sheet` = summoned drawer (no handle), `PulledSheet` = grab-handle. One primitive, §6.

## 2. Foundation → code (tokens, not components)
| §1.x | Code | Shape / rule baked in |
|---|---|---|
| 1.1 shell.* | `theme.shell` | 5 colourways (Teal★/Grape/Sunset/Pink/Carbon); Carbon flips silk light |
| 1.1 scr.* | `theme.scr` | 3 dark + 3 light (Midnight★); `accent`+`accentInk` paired; drives DEV-04; **scr.secret** SECRET-tier accent (DEV-04-exempt) |
| 1.1 brand.* | `theme.brand` | accent(pink LED) · gold(value) · cream · navy · alert · success · **secret (#e85ad0 magenta — SECRET-tier, theme-invariant)** — invariant |
| 1.2 type.* | `theme.type` | **21/15/11/9 only** (F-06); Chakra Petch screen, Paytone shell (F-08) |
| 1.3 space/corner | `theme.space`/`theme.corner` | step 4/8·3·2.5; C5 square on-screen; radius shell-only (F-07) |
| 1.4 motion.* | `theme.motion` | scanlineEnergize · stateMark · holdToBuy · counterTick · foilSweep |
| F-01..F-09 | `<ThemeProvider>` + lint rules | no-crop, gold-disambig, flat+scanline, no-sunken — enforced in review |

> A11y & resilience baseline (§1.6b, decision 0044) — not a component: global :focus-visible, form semantics, `*Sheet` focus-trap/role=dialog, live-regions, role=switch/carousel roles, content-resilience (COL-03 ≤99,999). Enforced in review like F-rules.

## 3. Status legend
- ✅ **converged** — §1.5 entry final; build to it now.
- 🔶 **debt-pending** — board converged, §1.5 formalization owed (Achievements 4.10, Admin 4.4); name
  is provisional, lock at formalization before coding.
- ⭐ **shared primitive** — built once, consumed everywhere; highest reuse priority.

## 4. Build order (so primitives land before screens)
`theme` → shell + lifecycle family + Buttons + Card + Furniture + Sheets (the ⭐ spine) → Forms/Flow →
domain sets. A screen never ships before its primitives.

---

# 5. The shared spine (⭐ build first — consumed everywhere)

### 5.1 Shell (3D, F-03)
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| DeviceShell | `DeviceShell` | `shell`(5) · screws/grille/LED/logo slots; wraps every screen | shell.* · corner | ✅⭐ |
| NavBand | `NavBand` | holds 5 `NavKeycap`; `locked` (logged-out: gray + non-interactive) | shell.* · brand.accent LED | ✅⭐ |
| NavKeycap | `NavKeycap` | `tab`(5) · `active`(pressed+`PipLight`) · `accent`: store-gold/collection-pink | shell · brand | ✅ |
| MiniDevice | `MiniDevice` | thumbnail device; `looks` preview cell | shell.* | ✅ |
| PipLight | `PipLight` | shell LED only — **round, pink** (`brand.accent`); F-05; ≠ StateMark | brand.accent · glow | ✅ |

### 5.2 The card
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| GameCard | `GameCard` | **`size`**: hero·grid(161×225)·cell(96×134)·mini(64×89)·thumb · `custom`(owner shell+`FoilTag`) · `flipped`(stats back) — never cropped (F-01); **`.plate` = F-06 9px-floor UI label — `/mini` + `/thumb` carry NO plate (drop → legible label beside/below), `/cell` plate at 10px floor (decision 0047)**; **tap = CARD-23 four-mode by host** (NAVIGATE·FLIP·INSPECT·ACT-IN-PLACE·inert), whole card is tap-target (decision 0048) | scr · step 4/8 | ✅⭐ |

> ⚠ **decision-0047 §B typo, owner-flag:** 0047 §B L30 writes `GameCard/grid` **(96×134)** for the Profile Top-3 set-pieces, but the §5.2 variant table has grid=161×225 / cell=96×134, and 0047's own §B.1 board treatment snaps those seats to a **`/cell` 10px plate**. The map cites 0047 §B verbatim (grid) but the 96×134 dimension reads as **/cell**, not /grid — flag to owner to correct decision-0047 rather than guessing which the door builds to.
| NowTag · FoilTag | `NowTag` `FoilTag` | corner plate tags, 9px | scr.accent · gold | ✅ |
| RankChip | `RankChip` | `first`(gold) else accent; #1 list-marker = `StateMark`, not gold | gold/accent | ✅ |

### 5.3 Buttons / controls (Keycap system, F-03 flat+scanline)
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| KeycapButton→ScreenButton | `ScreenButton` | **`variant`**: primary·action-alt·secondary·destructive · `add`(gold+step F-02) · `block`/`mini` size; flat, pressed=scanline; **`secondary`=cream/navy** (build conformed 0069) · **`active`** cream ON-state (PROOF/TRANSFORM) | scr.accent · gold · cream · alert | ✅⭐ |
| ToolKeycap→ToolButton | `ToolButton` | cream 28–32, icon[+label], `active`+StateMark · **`disabled`** (undo/redo ends, 0069) | cream/navy | ✅⭐ |
| TertiaryLink | `TertiaryLink` | `dim`(cancel) · `return-link`(back-seam) | scr.accent | ✅⭐ |

> Profile→Collection doors are `TertiaryLink` instances: **VIEW TOP 10 ›** (opens Collection TOP view active) and friend-only **VIEW COLLECTION ›** (opens friend Collection shelf); Top-3 cards are GameCard/grid set-pieces whose tap opens Collection TOP focused on that game (decisions 0047 §B, 0050 §C — see the 0047 §B grid/cell size flag above).
| SectionSwitch | `SectionSwitch` | **`variant`**: pair·chips·rail; active=accent border+StateMark (collapses SegmentedKeycap+SectionChips, §9) | scr.accent | ✅⭐ |
| Toggle | `Toggle` | square knob; ON=accent+right; `disabled` | scr.accent/grip | ✅ |
| IntensitySlider | `IntensitySlider` | flat track + cream thumb; value→reconcile; **scroll-locks its host while held** (round 3) | scr.accent | ✅ |
| ColorField · ColorPicker | `ColorField` `ColorPicker` | **`ColorField`** = the default colour control (gate-5 iteration): picker CLOSED by default — the last-10 recents + OPEN-PICKER button + a **FROM-CARD** grab (eyedropper interim; carries EVERY card colour incl. the base, unfiltered — round 3). **`ColorPicker`** = the full HS area + value + **hex**, opened on demand; **applies on RELEASE** (live in-picker preview; the cursor never re-seeds off its own echo — round 3); scroll-locks while held. Canvas element fill/stroke + the **base colour-only slip** (CR-08 iteration). CR-11 / decision 0067. *(Styler title-ink rides OQ-137/M5.)* | scr.accent · cream | 🔜 |

### 5.4 Screen furniture
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| ScreenHead · CountKeycap→CountTag | `ScreenHead` `CountTag` | display title + flat gold count (CountTag = display-only, not pressable) | type.display · gold | ✅⭐ |
| Well · ToolsBar · SectionHeader | `Well` `ToolsBar` `SectionHeader` | hairline panel · grip+tools+CTA · caps+TertiaryLink | scr.panel/hairline | ✅⭐ |
| StatTile · PctPill | `StatTile` `PctPill` | boxless tiles; pill gold, threshold/privacy-gated | gold | ✅ |
| ListRow · RowIcon · Strip | `ListRow` `GameStrip` | icon+label+value+chevron · thumb+meta (renamed from Strip — collided w/ OfflineStrip/PreviewStrip) | scr.well | ✅⭐ |
| GTag | `GenreTag` | `add`(dashed) genre tag (renamed from opaque GTag) | scr | ✅ |
| Avatar · DesignBadge | `Avatar` `DesignBadge` | monogram; corner badge→editor (PROF-08) | scr | ✅⭐ |
| RoleTag | `RoleTag` | accent-outline chip, 9px; **NOT gold**; self=tier/public=STAFF | scr.accent | ✅ |
| IdentityBlock | `IdentityBlock` | name + Avatar + RoleTag cluster | scr | ✅ |
| StateMark | `StateMark` | on-screen selection: orange notched square; ≠ PipLight (F-05/09) | scr.accent | ✅⭐ |

### 5.5 Inputs & search
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| SearchField | `SearchField` | `in-place` filter; bottom-dock in flows (OQ-035); system keyboard | scr.well inset | ✅⭐ |
| MatchTag | `MatchTag` | dev/publisher hit | scr | ✅ |

### 5.6 Lifecycle / state (ONE family — F-06 titles=15)
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| EmptyState | `EmptyState` | `inviting` doorway; sets `SectionEmpty` sibling | scr | ✅⭐ |
| Skeleton·LoadError·Unavailable·Offline | `Skeleton` `LoadError` `Unavailable` `Offline`+`OfflineStrip` | shared silhouette; retry/terminal/calm (SYS-10/MOD-09) | scr · accent RETRY | ✅⭐ |
| Toast | `Toast` | under-header banner + accent RETRY | scr.accent | ✅⭐ |

### 5.7 Overlays / sheets (one primitive)
| §1.5 name | Code | Variants / props | Status |
|---|---|---|---|
| (suffix `*Sheet`) | `Sheet` | summoned drawer, no handle, scrim+CANCEL — base for Report/Confirm/Reconcile/Option | ✅⭐ |
| PulledSheet | `PulledSheet` | grab-handle (sort/filter, store detail) | ✅⭐ |
| ConfirmSheet · OptionSheet | `ConfirmSheet` `OptionSheet` | destructive confirm · select list | ✅ |
| FlowTakeover · FlowHeader | `FlowTakeover` `FlowHeader` | tier-2 takeover (NavBand stays); ✕/◂ or return-link | ✅⭐ |

---

# 6. Forms & flow (Add Game set)
| §1.5 name | Code | Variants / props | Status |
|---|---|---|---|
| TextField · SelectField | `TextField` `SelectField` | `area`/`error`; select→OptionSheet; cream inset (F-09 exempt) | ✅⭐ |
| ResultRow · MatchTag | `ResultRow` | search-hit: title·year·studio·in-collection✓·report | ✅ |
| InlineBanner | `InlineBanner` | dedup warning (CAT-03), never a toast | ✅ |
| CardFan | `CardFan` | `pick`; 3-up swipe, zero plate occlusion; pips square | ✅⭐ |
| CardDetail · EquipReadout · CleanPeek | `CardDetail` `EquipReadout` `CleanPeek` | gallery hero+ledger · **owned/friend ENLARGE** (Game-page hero tap → enlarged CardDetail + EquipReadout CARD-22; yours=share/edit, friend's=adopt; R-ENLARGE) · equipped chips · hold-to-bare | ✅ |
| ReportSheet · ReportConfirm | `ReportSheet` `ReportConfirm` | `target`: card·game·user(+BLOCK); +`block` confirm | ✅ |

# 7. Commerce (Store/Wallet set — gold = economy, F-02)
| §1.5 name | Code | Variants | Status |
|---|---|---|---|
| PIXELS · CurrencyCounter | `PixelsMark` `CurrencyCounter` | `negative`; counterTick; gold | ✅⭐ |
| PriceChip · BuyBar | `PriceChip` `BuyBar` | `big`; hold-to-buy (OQ-046) | ✅ |
| PackTile · ItemTile | `PackTile` `ItemTile` | `starter`; $ on ScreenButton/secondary | ✅ |
| LedgerRow | `LedgerRow` | earn·spend·reversal·admin_adjustment (ECON-11) | ✅ |
| OwnedTag·LockedTag·EarnedOnlyTag | `OwnedTag` `LockedTag` `EarnedOnlyTag` | gold-outline never fill (COSM-04) | ✅ |
| DailyBonusBar·AisleIndex·PreviewStrip·PreviewStage | same | claimed · index · theme preview (DEV-04) | ✅ |

# 8. Editor — Styler (8a) + Canvas (8b)
| §1.5 name | Code | Variants / props | Status |
|---|---|---|---|
| AttributeSection · BaseRail · ReconcileSheet · KeepBeat | same | 5 attrs incl NAMEPLATE · start-from · acquire-gate · light celebrate | ✅ |
| CanvasStage · AssetShelf/ElementTray | `CanvasStage` `AssetShelf` | press-bed + **zoom** breakout (transform-only, no remount, 0067/CR-01) · ADD drawer (reuses `Sheet`; **BASE off categories** CR-08; **pick→open-EDIT** CR-09) | ✅ |
| LayerRack · slip · editbar · TransformDrawer | `LayerRack` `Slip` `EditBar` `TransformDrawer` | pull-to-isolate (isolation **toggle**, CR-05) · **base pseudo-slip** (pinned · recolour-only, CR-08) — rides **at the rail HEAD** (leftmost; the rail reads **z-ascending L→R**, round 3) · cap-meter 30 (**orange** F-02, CR-03) · undo/redo · **`TransformDrawer`** = position (**direction arrows, 0.5% nudge + slow-start hold ramp + X·Y read-out**, round 3) / size (sliders) / rotation (**slider 0–360°**) + a **hide-resize-box toggle** (OFF hides the WHOLE sel-ring; the toggle also rides the EDIT sheet — round 3), **subsumes `NumPop`** (deleted); the editbar TRANSFORM key is **accent-weighted** + the EDIT panel head carries a TRANSFORM door (round 3); base slip lives **in the rail** (colour-only EDIT). Rendered **inline in the CanvasSurface bottom panel at ONE fixed (bench-measured) height**, not a drawer (device-walks 2026-07-08/09). Round 4 (0.55): TRANSFORM keys **cream** (PROOF voice) · head doors **both ways** · ROTATE folded into POSITION · RESIZE BOX row grammar · tap=one 0.5% nudge + harder hold ramp · **sel-ring rotates with the slip + a rotation handle** (`CanvasStage onRotate`, quarter snaps) · rack caption+chip under the rail · PROOF∥PRESS held through PROOFING. | ✅ |
| PROOF · PRESS · PrintRitual | `ProofView` `PressSheet` `PrintRitual` | size-ladder · finish-up · first-print 3-beat | ✅ |

# 9. Discover · Settings · Game page
| §1.5 name | Code | Variants | Status |
|---|---|---|---|
| QueueRow·ReleaseRow·RecRow·AdoptCount·NotifyToggle | same | reorder · upcoming · friend-rec · clout count · notify | ✅ |
| LogAttach·FeedbackConfirm·TriageCard | same | bug-logs opt-in · seal · type-chooser | ✅ |
| DualFaceHero·PlayStats·CardSwitcher·FriendContext | same | face+stats · dossier · 3-up select · friend compare | ✅ |
| CommunityGallery | `CommunityGallery` | 3-up `GameCard/cell` roster; each cell `AdoptCount` + DESIGNED-BY credit + `PriceChip`/FREE; tap → `CardDetail` enlarge (CARD-22, decision 0048); GET /games/:gameId/cards, adopt POST /cards/:id/adopt (ECON-03/04, M4) | ✅ |

# 10. Social — Friends · Find/Add · Compare · Contributor
| §1.5 name | Code | Variants | Status |
|---|---|---|---|
| FeedRow·FriendRow·FriendTile·RequestRow·InviteHook | same | activity · roster row/tile · request · cold-start CTA | ✅ |
| PersonRow·QrCard·InviteLanding·SenderSummary | same | relationship spine (ADD/CANCEL/ACCEPT…) · QR · arrival | ✅ |
| CompareHeader·CompareTotals·ComparePair·FriendsLeaderboard·LeaderRow | same | face-off · card-vs-card · cohort rank | ✅ |
| SectionEmpty | `SectionEmpty` | gold DESIGN-A-CARD / neutral ADD-A-GAME | ✅ |
| RecommendSheet | `RecommendSheet` | GameCard/cell picker + note TextField/area + SEND → Toast; POST /recommendations (SOC-05, decision 0036) | ✅ |

# 11. Device editor
| §1.5 name | Code | Status |
|---|---|---|
| SectionCard·StickerStage·TransformBox·PlacedSticker·StickerTray·SavedLook·LooksGrid·KeepBar | same | ✅ |

# 12. Collection TOP view-mode (Top-10 curation — §4.7 Lists editor RETIRED, relocated into Collection)
| §1.5 name | Code | Status |
|---|---|---|
| SlotFrame·RankSlot·CardPicker(PickerSheet) | `SlotFrame` `RankSlot` `CardPicker` | **the Collection TOP view-mode** (COL-13): #1 emphasized + rank chips over collection data; self=drag-rerank ARRANGE + `+ ADD` ghost → CardPicker (cap-10 LIST_FULL); friend=read-only ranked Top-10. The standalone §4.7 Lists screen is RETIRED (decisions 0049/0050). | ✅ |

> Collection COL-07 view keycap now cycles **SHELF · GRID · LIST · TOP** (was SHELF·GRID·LIST); TOP = the view-mode above (decision 0050, COL-13).

> `SaveBar` is **not yet a §1.5-named component** — the SAVE/SWAP affordance is currently `ScreenButton/secondary` (§1.5 L122). Keep provisional until §1.5 names it (mirrors FunctionRow/FieldRemediationRow/ModerationNotice treatment in §14).

# 13. Achievements (✅ formalized §1.5 + §2.19, decision 0038)
| Board class | Code | Status |
|---|---|---|
| BadgeTile·MysterySlot·ProgressMeter·RewardChip·TierLegend·AchievementSheet·CelebrationMoment | same | ✅ |

> Tiles UNIFORM (glyph+label; criterion/reward/date in AchievementSheet). Tier-themed by ACH-09: PRESTIGE brand.gold · STANDARD scr.accent (DEV-04) · SECRET scr.secret #e85ad0. F-02 carve-out: gold marks PRESTIGE (non-acquisitive). F-05 carve-out: flat magenta square for SECRET.

# 14. Admin console (✅ formalized §1.5 + §2.18, decision 0037)
| Board class | Code | Status |
|---|---|---|
| ModQueueRow·ReviewPanel·SuspendSheet·MergePicker·RestoreRow·TierBanner·CountTag | same | ✅ |

> `FunctionRow·FieldRemediationRow·ModerationNotice` are **not yet named in §1.5 — keep provisional (MOD-11..15)**: remediation surfaces backing OQ-081 IDs MOD-11..15 — prose in §2.18, not yet named components; keep provisional until §1.5 names them.

> Admin `CountTag` = flat **scr.accent rectangle** (utility, square F-07, `.zero` muted variant, per-row pending count) — NOT the §5.4 brand.gold display CountTag. Same symbol, two visual specs → model as `CountTag/admin` variant (prop), NOT a fork.

> **Why CountTag collapses but QueueRow forks:** the two CountTags are the *same primitive re-themed* (a count rectangle, gold vs scr.accent) → one symbol, `/admin` variant (naming-law rule 2). The two QueueRows are *genuinely different behavior* — Discover's is a **drag-to-reorder** row (PATCH /me/queue/reorder), Admin's is a **read-only moderation object** in a review queue — so they stay two symbols, with Admin's given the distinct code name `ModQueueRow` (decision 0042). Behavior, not theme, is the fork test.

> Admin reports-queue row = **`ModQueueRow`**; Discover keeps `QueueRow` (decision 0042, OQ-087).

# 15. Aliases (collapse, don't implement)
| Old §1.5 name | Canonical |
|---|---|
| SegmentedKeycap · SectionChips | `SectionSwitch` (pair/chips) |
| ActivityRow | `FeedRow` |
| SearchResultRow | `PersonRow` |
| ChipPip · PipLight(on-screen) | `StateMark` |
| KeycapButton | `ScreenButton` (flat; "keycap" reserved to shell) |
| ToolKeycap | `ToolButton` |
| CountKeycap | `CountTag` (display-only) |
| QueueRow (Admin-target variant) | `ModQueueRow` (decision 0042) |
| Strip | `GameStrip` |
| GTag | `GenreTag` |
| slip · LayerSlip | `Slip` · editbar → `EditBar` |

# 15b. Intentionality review (2026-06-28) — names verified against render
Drift fixed above: 0.20 flattened on-screen → "Keycap" reserved to shell keys (owner ruling, renamed
ScreenButton/ToolButton/CountTag — **rippled into design-spec 0.40, OQ-090 resolved**); social 5→2 collapse; Strip/GTag de-vagued; map's LayerSlip/EditBar
aligned to spec. **Watch (not renamed):** `KeepBeat`(styler celebrate) vs `KeepBar`(device cart) — 1
letter apart, keep distinct, never co-located. `AssetShelf`/`ElementTray` = one `Sheet`. Verified
ACCURATE: GameCard, DualFaceHero, PlayStats, CardFan, StateMark, ReconcileSheet, TransformBox,
SavedLook, PctPill, RoleTag, SectionSwitch + ~30. **0.5 (0067):** `NumPop` **subsumed by `TransformDrawer`**; **`ColorPicker`** added (§5.3). **Keycap→Screen rename rippled to design-spec 0.40 (OQ-090 done).**

# 16. Gaps & cleanup surfaced by the sweep
- game-page `.presence` — **maps to `PresenceStats` (CAT-09); KEEP.** The class name collides with the
  CUT online-presence (`PresenceDot`/`StatPeek`, OQ-071) but the content is **live** CAT-09 stats
  (in-collections · friends-have · community-cards). Throwaway class; optional rename `.pstats` (decision 0042, OQ-089).
- friends aggregated-request banner + actions sheet — map to `OptionSheet`; name banner? → OQ.
- onboarding O9 shelf-live = **`LiveBanner`**, O6 NOTIF-04 priming = **`PrePrompt`**, Friends aggregated-request banner = reuse **`InlineBanner`** (decision 0042, OQ-088).

# 17. Open questions raised → inbox
- ✅ Resolved (decision 0042): Admin/Discover `QueueRow` → `ModQueueRow`; onboarding banner names (`LiveBanner`/`PrePrompt`/`InlineBanner`).
- OQ-063 SectionSwitch consolidation: resolved as variants here.
