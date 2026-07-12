# 0070 — Light-theme legibility: adapt the hue (themed `key` / `value` tokens)

**Status:** accepted (owner ruling, 2026-07-10) · **Date:** 2026-07-10 · **Author:** Claude (spec-owner)
· **Rules:** how the fixed-brand on-screen colours (cream secondary, F-02 gold) stay legible on the 3
LIGHT screen themes (Paper · Mint · Lilac). **Amends [`0069`](0069-button-convention-ratification.md)**
(secondary = cream) and **completes design-spec §1.1** (the `chip` token the theme engine dropped).
Resolves **OQ-144**. Companion to the §3.5 theme engine (device-manifest ARCH 1) + Foundation Rules
**F-02** (gold = value) / **F-09** (re-themeable accent).

## Context
The §3.5 theme engine shipped 6 screen themes incl. 3 LIGHT ones (Paper/Mint/Lilac). The `scr.*` tokens
re-theme correctly (dark-enough ink + accent on the light bgs), but two **fixed-brand** tokens do not:
- **`brand.cream`** — the 0069 secondary/keycap face — is ≈ **1.1:1** on Paper (`#f5f1e4` on `#ece5d1`):
  the button face vanishes. And the button is FLAT (F-03), so with no edge it doesn't read at all.
- **`brand.gold`** (F-02) is ≈ **1.1:1** on the light bgs too — gold text/faces wash out (the owner's
  "anything yellow is hard to read"). Confirmed on the owner's gate-5 walk (Paper theme).

The owner considered a dark ("charcoal") key but rejected it — it makes the *same* button read as two
different things across themes (light key on dark, dark key on light); the keycap identity breaks.

## Ruling — ADAPT THE HUE (owner, 2026-07-10)
The on-screen semantic brand colours become **themed tokens** that carry a light-theme-legible value —
preserving the MEANING (cream = the quiet key voice; gold = value) while adapting the shade for contrast.
Four fields join `ScreenTheme` (dark themes keep the brand values VERBATIM → **zero change on
Midnight/Deep-Sea/Berry**; the value-identity test still passes):

- **`scr.key`** — the secondary/keycap face (0069). `#f5f1e4` cream on dark themes; **`#ffffff` white on
  light**. A flat light key can't self-contrast on a light bg, so on light themes the SECONDARY button
  also takes a **`scr.dim` border** (the edge does the figure/ground work; F-03 stays flat). Dark themes:
  borderless, unchanged. *(This is §1.1's `chip` token — cream-on-dark / white-on-light — finished with
  the border insight the token alone doesn't carry.)*
- **`scr.value`** — the F-02 gold/value tone. `#ffd23f` bright on dark themes; **`#8a6d0a` deep goldenrod
  on light** (~4:1 on the light bgs; still gold-family, so the F-02 "gold = value" signal holds). Gold
  TEXT/borders read `scr.value` directly.
- **`scr.valueInk`** — text that sits ON a gold FACE (the `add` button). Dark `goldInk #3c2a09` on the
  bright gold; **cream `#f5f1e4` on the deep light-theme gold** (dark ink would vanish on deep gold).
- **`scr.isLight`** — theme polarity (the border trigger + any future light/dark-dependent treatment).

Plus a `withAlpha(hex, a)` helper so **theme-following tints** (the `SectionDock` active wash = the
theme accent at 10%) don't read as a fixed orange under a teal/violet theme.

**F-02 note (owner-blessed):** F-02 governs gold = value/authorship; it does not pin the exact hue. A
deeper gold on light themes is still gold — the signal is preserved, only the shade adapts for the
DEV-04 legibility floor (target: text ≥ 4.5:1, key edge ≥ 3:1 vs bg).

## Scope built now vs. deferred
- **Built (M4):** the tokens + the theme engine wiring; applied to the M4-live surfaces — `ScreenButton`
  **secondary** (`scr.key` + light-theme border) + **add** (`scr.value`/`scr.valueInk`), the **DESIGN
  NEW** tile (`CardSwitcher` — gold text/border → `scr.value`), and the **`SectionDock`** active tint.
- **Deferred to M5 (inherits the tokens):** the remaining gold surfaces that don't exist until M5 — the
  **wallet / PIXELS `CountTag` / price chips / published-card tags / ReconcileSheet** — adopt `scr.value`
  /`scr.valueInk` when they're built (a sweep, not a re-decision).

## Consequences
- **design-spec 0.58** (§1.1 gains the light-theme legibility set; §2.15 note) · **component-map 0.11**
  (already records the token pass) · **OQ-144 RESOLVED**. No product-spec (pure look, no behaviour/data).
- **Code:** `theme/palettes.ts` + `theme/index.ts` (the 4 tokens + `withAlpha`), `ScreenButton`,
  `CardSwitcher` (DESIGN NEW), `SectionDock`. Midnight/Teal render byte-identical (identity test holds).
- **Owed (M4, the CARD-16 / light-theme pass):** a parvati walk of every light theme confirming the
  ≥4.5:1 / ≥3:1 floors across the signed surfaces; the shell **nav-label** ink on Carbon's dark plastic
  (a separate shell-contrast check, noted in OQ-144).
