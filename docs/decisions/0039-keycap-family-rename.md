# 0039 — Keycap-family rename (Screen/Tool/Count)

**Date:** 2026-06-28 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (naming-only) · **Closes:** OQ-090 · **Bumps:** design-spec 0.40 · component-map 0.2

## Context
An intentionality review (component-map work) checked whether §1.5 names still describe what they
render. The 0.20 flat-button ruling reserved keycap travel to the 5 shell keys (F-03), but the
on-screen button family kept the "Keycap" name — and `CountKeycap` isn't even pressable. Pre-change
names, drifted intent.

## Ruling (owner)
Rename for accuracy — code and spec agree, "Keycap" = the shell only:
- `KeycapButton` → **`ScreenButton`** (variants ride: `/primary` `/action-alt` `/secondary` `/destructive` `/add`)
- `ToolKeycap` → **`ToolButton`**
- `CountKeycap` → **`CountTag`** (display-only, not pressable)

Kept "Keycap": `NavKeycap` + shell physics (true 3D travel). `SegmentedKeycap` already aliased →
`SectionSwitch`.

## Ripple
Renamed across design-spec §1.5 + all §2 compositions (0.40); component-map 0.2 canonical + alias
table; throwaway mockup `.btn`/`.kc` classes left. No behaviour/token/API change.
