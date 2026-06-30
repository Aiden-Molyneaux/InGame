# InGame — Component Map (catalog → code)

> **What this is:** the bridge from the design-spec **§1.5 component catalog** to the codebase. It
> assigns every named component a **canonical code symbol**, a **props/variant shape**, the **tokens it
> consumes**, what it **composes from**, and a **build status**. It exists so the build agent implements
> each shared component **once, reusably**, instead of re-deriving it per screen. The map governs
> **naming + reuse conventions from the ground stage** — it is the executable echo of §1.5.

**Version:** 0.3 · **Date:** 2026-06-29 · **Author:** Claude · **Owner:** Aiden ·
**Maps from:** `design-spec.md` §1.5 (v0.41) · **Implements toward:** Expo / RN (product-spec §9).
**0.2:** intentionality review — Keycap family → Screen/Tool/Count (owner ruling), social 5→2, Strip/GTag renamed.
**0.3:** housekeeping (decision 0042) — Admin `QueueRow`→`ModQueueRow`; onboarding banners named `LiveBanner`/`PrePrompt` (+ `InlineBanner` reuse); game-page `.presence` confirmed **live `PresenceStats` (CAT-09)**, not the cut presence — keep.

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
| 1.1 scr.* | `theme.scr` | 3 dark + 3 light (Midnight★); `accent`+`accentInk` paired; drives DEV-04 |
| 1.1 brand.* | `theme.brand` | accent(pink LED) · gold(value) · cream · navy · alert · success — invariant |
| 1.2 type.* | `theme.type` | **21/15/11/9 only** (F-06); Chakra Petch screen, Paytone shell (F-08) |
| 1.3 space/corner | `theme.space`/`theme.corner` | step 4/8·3·2.5; C5 square on-screen; radius shell-only (F-07) |
| 1.4 motion.* | `theme.motion` | scanlineEnergize · stateMark · holdToBuy · counterTick · foilSweep |
| F-01..F-09 | `<ThemeProvider>` + lint rules | no-crop, gold-disambig, flat+scanline, no-sunken — enforced in review |

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
| GameCard | `GameCard` | **`size`**: hero·grid(161×225)·cell(96×134)·mini(64×89)·thumb · `custom`(owner shell+`FoilTag`) · `flipped`(stats back) — never cropped (F-01) | scr · step 4/8 | ✅⭐ |
| NowTag · FoilTag | `NowTag` `FoilTag` | corner plate tags, 9px | scr.accent · gold | ✅ |
| RankChip | `RankChip` | `first`(gold) else accent; #1 list-marker = `StateMark`, not gold | gold/accent | ✅ |

### 5.3 Buttons / controls (Keycap system, F-03 flat+scanline)
| §1.5 name | Code | Variants / props | Tokens | Status |
|---|---|---|---|---|
| KeycapButton→ScreenButton | `ScreenButton` | **`variant`**: primary·action-alt·secondary·destructive · `add`(gold+step F-02) · `block`/`mini` size; flat, pressed=scanline | scr.accent · gold · cream · alert | ✅⭐ |
| ToolKeycap→ToolButton | `ToolButton` | cream 28–32, icon[+label], `active`+StateMark | cream/navy | ✅⭐ |
| TertiaryLink | `TertiaryLink` | `dim`(cancel) · `return-link`(back-seam) | scr.accent | ✅⭐ |
| SectionSwitch | `SectionSwitch` | **`variant`**: pair·chips·rail; active=accent border+StateMark (collapses SegmentedKeycap+SectionChips, §9) | scr.accent | ✅⭐ |
| Toggle | `Toggle` | square knob; ON=accent+right; `disabled` | scr.accent/grip | ✅ |
| IntensitySlider | `IntensitySlider` | flat track + cream thumb; value→reconcile | scr.accent | ✅ |

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
| CardDetail · EquipReadout · CleanPeek | `CardDetail` `EquipReadout` `CleanPeek` | gallery hero+ledger · equipped chips · hold-to-bare | ✅ |
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
| CanvasStage · AssetShelf/ElementTray | `CanvasStage` `AssetShelf` | press-bed+shell-swing breakout · ADD drawer (reuses `Sheet`) | ✅ |
| LayerRack · slip · editbar · NumPop | `LayerRack` `Slip` `EditBar` `NumPop` | pull-to-isolate · cap-meter 30 · undo/redo · X/Y popover | ✅ |
| PROOF · PRESS · PrintRitual | `ProofView` `PressSheet` `PrintRitual` | size-ladder · finish-up · first-print 3-beat | ✅ |

# 9. Discover · Settings · Game page
| §1.5 name | Code | Variants | Status |
|---|---|---|---|
| QueueRow·ReleaseRow·RecRow·AdoptCount·NotifyToggle | same | reorder · upcoming · friend-rec · clout count · notify | ✅ |
| LogAttach·FeedbackConfirm·TriageCard | same | bug-logs opt-in · seal · type-chooser | ✅ |
| DualFaceHero·PlayStats·CardSwitcher·FriendContext | same | face+stats · dossier · 3-up select · friend compare | ✅ |

# 10. Social — Friends · Find/Add · Compare · Contributor
| §1.5 name | Code | Variants | Status |
|---|---|---|---|
| FeedRow·FriendRow·FriendTile·RequestRow·InviteHook | same | activity · roster row/tile · request · cold-start CTA | ✅ |
| PersonRow·QrCard·InviteLanding·SenderSummary | same | relationship spine (ADD/CANCEL/ACCEPT…) · QR · arrival | ✅ |
| CompareHeader·CompareTotals·ComparePair·FriendsLeaderboard·LeaderRow | same | face-off · card-vs-card · cohort rank | ✅ |
| SectionEmpty | `SectionEmpty` | gold DESIGN-A-CARD / neutral ADD-A-GAME | ✅ |

# 11. Device editor
| §1.5 name | Code | Status |
|---|---|---|
| SectionCard·StickerStage·TransformBox·PlacedSticker·StickerTray·SavedLook·LooksGrid·KeepBar | same | ✅ |

# 12. Top-5 / Lists (4.7 — Draft A slots)
| §1.5 name | Code | Status |
|---|---|---|
| SlotFrame·RankSlot·CardPicker(PickerSheet)·SaveBar | `SlotFrame` `RankSlot` `CardPicker` `SaveBar` | ✅ |

# 13. Achievements (🔶 spec-debt — lock at 4.10 formalization)
| Board class | Provisional code | Status |
|---|---|---|
| BadgeTile·MysterySlot·ProgressMeter·RewardChip·CelebrationMoment·AchievementSheet·TierLegend·ListSummary | same | 🔶 |

# 14. Admin console (🔶 spec-debt — lock at 4.4 formalization)
| Board class | Provisional code | Status |
|---|---|---|
| ModQueueRow·ReviewPanel·SuspendSheet·MergePicker·RestoreRow·TierBanner·CountTag·FunctionRow·FieldRemediationRow·ModerationNotice | same | 🔶 |

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
| Strip | `GameStrip` |
| GTag | `GenreTag` |
| slip · LayerSlip | `Slip` · editbar → `EditBar` |

# 15b. Intentionality review (2026-06-28) — names verified against render
Drift fixed above: 0.20 flattened on-screen → "Keycap" reserved to shell keys (owner ruling, renamed
ScreenButton/ToolButton/CountTag — **rippled into design-spec 0.40, OQ-090 resolved**); social 5→2 collapse; Strip/GTag de-vagued; map's LayerSlip/EditBar
aligned to spec. **Watch (not renamed):** `KeepBeat`(styler celebrate) vs `KeepBar`(device cart) — 1
letter apart, keep distinct, never co-located. `AssetShelf`/`ElementTray` = one `Sheet`. Verified
ACCURATE: GameCard, DualFaceHero, PlayStats, CardFan, StateMark, ReconcileSheet, TransformBox, NumPop,
SavedLook, PctPill, RoleTag, SectionSwitch + ~30. **Keycap→Screen rename rippled to design-spec 0.40 (OQ-090 done).**

# 16. Gaps & cleanup surfaced by the sweep
- game-page `.presence` — **maps to `PresenceStats` (CAT-09); KEEP.** The class name collides with the
  CUT online-presence (`PresenceDot`/`StatPeek`, OQ-071) but the content is **live** CAT-09 stats
  (in-collections · friends-have · community-cards). Throwaway class; optional rename `.pstats` (decision 0042, OQ-089).
- friends aggregated-request banner + actions sheet — map to `OptionSheet`; name banner? → OQ.
- onboarding O9 shelf-live = **`LiveBanner`**, O6 NOTIF-04 priming = **`PrePrompt`**, Friends aggregated-request banner = reuse **`InlineBanner`** (decision 0042, OQ-088).

# 17. Open questions raised → inbox
- ✅ Resolved (decision 0042): Admin/Discover `QueueRow` → `ModQueueRow`; onboarding banner names (`LiveBanner`/`PrePrompt`/`InlineBanner`).
- OQ-063 SectionSwitch consolidation: resolved as variants here.
