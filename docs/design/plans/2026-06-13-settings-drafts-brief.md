# Settings (§4.15) — design-track kickoff: ONE page + the feedback surface ×3 → gate → converge

Authored by the SETTINGS track (self-briefed from ui-design-req §4.15 + the api-contract Feedback &
support / Auth / Profile / Social / Notif sections + design-spec §1.1–1.6 + product-spec SYS-11 et al).
Settings is the next queued **coverage-driven gap-closer** in `SCREEN-STATUS.md` (UP NEXT #5 — *"rows ·
toggles · destructive confirm"*). Settings itself is a **well-trodden pattern** — build it ONCE,
conventionally, composed from the catalog. The genuinely **novel** surface is the new **feedback /
bug-report + diagnostic-log-upload** control (SYS-11, decision 0022) — that gets the **multi-draft
divergence** (3 distinct interaction models → gate → converge). This file is the plan; the gate ruling
gets appended verbatim at the bottom.

## The page (the contract — ui-design-req §4.15)
Settings renders as a **`FlowTakeover`** reached from Profile's `ScreenHead` gear (decision 0011) —
**`FlowHeader` ◂ + "SETTINGS"**, the device **frame + `NavBand` persist** (PROFILE keycap stays active,
pressed + `PipLight`). **Non-commerce → no PIXELS mark, no `CountKeycap`** (the header wallet counter is
chrome elsewhere; Settings is functional-only). Compose straight from the §1.5 catalog — sections are
`Well`s of `ListRow`s under `SectionHeader`s; cite IDs, never restate behavior.

**Sections / rows:**
- **ACCOUNT** — email · **username change** w/ cooldown microcopy ("NEXT CHANGE OK NOW", `PROF-06`) ·
  **email-verification status + resend** (`AUTH-08` — the **unverified** variant is a page state) ·
  **sign out** (`AUTH-05`, light — reversible, no heavy confirm) · **delete account** (`AUTH-07` —
  destructive → the `ConfirmDialog`).
- **PRIVACY** — friends-only vs limited public (`PROF-03`) — a `Toggle` row (off = friends-only default;
  on = non-friends see a limited profile), with a one-line readout of what each setting exposes.
- **BLOCKED USERS** (`SOC-09`) — a `ListRow` with a count → the blocked-list sub-page (list + per-row
  **UNBLOCK**; Unblock is the MOD-09 terminal's lone exception).
- **NOTIFICATIONS** (`NOTIF-02`) — per-type `Toggle`s (friend activity · game releases =`release` ·
  card adoptions · store drops · friend requests · recommendations); **OS-permission-declined recovery
  guidance** (`NOTIF-04`) = a top-of-section `InlineBanner` (OPEN PHONE SETTINGS) with the toggles
  gated — a page state.
- **FEEDBACK & SUPPORT** — **Feedback & bug reporting** (`SYS-11` — the row that opens the surface
  below) · **Help & Contact** (`SYS-09`, a mailto/form — distinct from feedback).
- **ABOUT & LEGAL** — Terms of Service + Privacy Policy (`AUTH-10`) · app version (chrome).
- **NOT here:** screen theme (`DEV-04` — lives in the Device editor; a caption note only, no row).

**Page states (the §1.6/§1.8 families):** loaded · unverified-email (`AUTH-08`) · **destructive-confirm
(delete account, `ConfirmDialog`/`AUTH-07`)** · loading (`Skeleton`) · offline (writes gated — toggles ·
sign-out · delete · resend, `SYS-10`) · error (`LoadError` "Signal Lost" + RETRY; `Toast` on a write
hiccup). Plus coverage artboards: blocked-users list · notifications OS-declined recovery.

## New components this screen closes (design-spec §1.5 "To design" gaps) — flagged at the gate
Introduced under **working names** (form is mine; names ratified → design-spec at converge):

- **`Toggle`** (the switch — notification prefs · privacy · the bug-logs opt-in). **Square** (F-07: radius
  lives on plastic; on-screen chrome is square), a **two-position keycap-knob**: a cream knob carrying the
  F-03 drop edge slides L↔R over a flat track (F-09 — flat plane, never sunken). **ON = `scr.accent`
  track + knob right; OFF = `scr.grip` track + knob left.** The orange fill is the "on" tell (the action
  colour, kin to `KeycapButton/primary`); disabled/gated = both dimmed. *(No pink pip — pink stays the
  LED voice, F-05; the orange fill carries state, consistent with the F-09 selection language.)*
- **`ConfirmDialog`** (the destructive delete-account confirm — the §1.8 "destructive actions always
  confirm" mandate; §1.5 lists "destructive **confirm dialog**" as an open gap). A **centered modal** over
  the scrim — a square flat `scr.well` panel (F-07/F-09): a **red alert `seal`** + title + **plain-words
  `AUTH-07` ripple** (collection/wallet/friends deleted; published cards unpublished but existing adopters
  keep their copy; can't be undone) + red `KeycapButton/destructive` DELETE + cream CANCEL. **Judgment
  call flagged:** this is a **new spatial frame** (centered modal) vs the app's established **one-drawer**
  grammar — the alternative is to wear the same bottom-`drawer` as `ReportSheet`. Owner picks at the gate.

**The feedback set** (shared across all three variants — survive regardless of which wins):
- **`LogAttach`** (the headline) — the **bug-only** device-logs opt-in: a `Toggle` (**off by default**) +
  a one-line **consent** note (support-facing — *logs can hold personal info; support team only, never
  shown to other players*) + **room reserved for the TBD log payload** (`OQ-060`): a flat panel that,
  once ON, reads "INGAME DIAGNOSTIC LOGS · ATTACHED" with a "WHAT'S INCLUDED?" `TertiaryLink` and a
  deliberately-reserved sub-row where **bundle size / summary will render once the format is defined**.
- **`FeedbackConfirm`** — the calm submitted seal ("THANKS — WE GOT IT"; `scr.accent` check, the kin of
  `ReportConfirm` — support-facing, not the gold celebration tier).
- Variant-specific (only the winner's get ratified): **`TypePick`** (A's inline 3-up segmented type
  keycaps) · **`FeedbackInline`** (A's expand-in-place row→form) · **`TriageCard`** (C's "what's this
  about?" chooser cards).

**Reuse everything else (locked names):** `ListRow`(`RowIcon`+label+value+chevron) · `SectionHeader` ·
`Well` · `FlowTakeover`/`FlowHeader` · `TextField`(`/area`) · `SelectField` (B's type picker) ·
`KeycapButton/*` (**delete-account + feedback SUBMIT = `/destructive`** per the brief — same support/mod
filing commit grammar as the report SUBMIT; *flagged judgment call — see below*) · `KeycapButton/secondary`
(CANCEL · SIGN OUT) · `TertiaryLink` · `InlineBanner` (the NOTIF-04 recovery + the unverified notice) ·
`Skeleton` · `LoadError` · `Offline`/`OfflineStrip` · `Toast`.

## The feedback surface — THREE distinct variants (SYS-11). Distinctness axis = **how you get from a
Settings row to a filed report**.
All three carry: a **type** (feedback · suggestion · bug) · a **message** (`TextField/area`) · and — when
type = **bug** — the **`LogAttach`** opt-in (toggle off by default · consent line · reserved OQ-060 payload
room). Support-facing copy throughout (NOT "this will be public"). Rides **`POST /feedback`** (+
`POST /feedback/:id/logs` for the opt-in bundle, `log_ref`, OQ-060). Each variant draws **5 states**:
idle · bug-with-logs-attached · submitting · submitted-confirmation · error.

- **A — "INLINE EXPANDING ROW"** (zero-navigation pole). The Feedback row **expands in place** into a
  compact form; the rows below push down; you **submit without leaving Settings**. Type = `TypePick`
  (inline 3-up segments); message = a short `TextField/area`; bug → `LogAttach` unfurls inline; SUBMIT is
  small + right-aligned; submitted collapses to an inline `FeedbackConfirm`. **MUST PROVE:** the
  bug→`LogAttach` control fits the inline footprint **without feeling cramped or hiding the consent line**.
  → `settings/feedback-draft-a-inline.html`
- **B — "DEDICATED SHEET"** (richer-form pole). Tapping the row opens a focused **`FlowTakeover`**
  (`FlowHeader` ◂ "SEND FEEDBACK") — **one roomy screen, all controls at once**: a `SelectField` type
  picker (→ `OptionSheet`), a tall `TextField/area`, and `LogAttach` in its **fullest** treatment (a
  `Well`-framed block: toggle + 2-line consent + the reserved payload panel with explicit room for
  size/preview). Submit → `FeedbackConfirm`. **MUST PROVE:** the richer form **earns the navigation**, and
  the bug path's extra affordances read clearly with space to breathe.
  → `settings/feedback-draft-b-sheet.html`
- **C — "TYPE-FIRST TRIAGE"** (routing pole). A first **`TriageCard`** screen asks *"what's this about?"*
  (feedback / suggestion / bug — three choice cards), then **routes to a tailored form per type**: the
  **bug** form is purpose-built — it **foregrounds `LogAttach`** (the largest treatment) + consent +
  read-only **diagnostic-context** chips (app version · platform, the non-PII client context SYS-11
  captures); **feedback / suggestion** stay minimal (just a message + submit — no logs, no tax). **MUST
  PROVE:** triaging first makes the **bug path better without taxing the common (non-bug) path**.
  → `settings/feedback-draft-c-triage.html`

*(Two genuinely-distinct variants would be acceptable if a third were a contrivance — but inline /
dedicated-rich / triage-routed are three real interaction models, so all three are built.)*

### The device-logs control — the thing to prove (carried identically into all three)
(a) an explicit **`Toggle`, OFF by default** — logs are never auto-attached (SYS-11) · (b) a one-line
**consent** note — *support team only, never shown to others; may contain personal info* · (c) **reserved
room for the OQ-060 payload** — the bundle format/size/preview is undefined in v2, so the UI leaves a
labeled slot for it (an "INGAME LOGS · ATTACHED / WHAT'S INCLUDED?" affordance with space for size +
summary once defined). The three variants differ in **how much room** the control gets — A proves it
survives the inline squeeze; B gives it a roomy `Well`; C makes it the bug-form hero.

### Flagged judgment call — the feedback SUBMIT colour
The brief specifies **feedback SUBMIT = `KeycapButton/destructive`** (red), reusing the `ReportSheet`
commit grammar (both file to the same **support/moderator-facing, outside-MOD-07, rate-limited** channel,
and share the dormant→in-flight-pressed lifecycle). I've **followed the brief** (red SUBMIT in all three).
**Tension to rule at the gate:** red can read as *alarm/danger* on a friendly feedback channel — the
alternative is `KeycapButton/primary` (on-theme orange) for feedback/suggestion, reserving red for the
bug path (which carries data) or dropping it entirely. Owner's call.

## Hard rules (carried from the tracks)
- **Compose from the design-spec §1.5 catalog**; reuse the locked names above. Introduce only
  `Toggle`/`ConfirmDialog` + the feedback set (`LogAttach`/`FeedbackConfirm` + the variant-specific
  `TypePick`/`FeedbackInline`/`TriageCard`), each **flagged at the gate** — never silently.
- **Tokens verbatim** (Teal shell + Midnight screen; `scr.accent`/`accentInk`, `scr.grip`, `brand.alert`
  for destructive, `brand.cream`/`navy`). **No PIXELS mark** (non-commerce). **Standalone self-contained
  HTML artboards** (Claude Design exports lack local deps). Google Fonts via `media="print" onload`;
  **hand-drawn / built-in SVG only** (no external icon libs).
- **Sample data:** a signed-in account — **email `aiden@ingame.app`** · **username `@aiden`** with
  **"NEXT CHANGE OK NOW"** microcopy (PROF-06) — plus an **unverified-email** variant; **2–3 blocked
  users** (Riko · Vanta · Mossbone); notification toggles in a realistic mix; a realistic **bug message**
  ("Card editor froze when I added a 12th sticker…").
- **HTML only — never commit PNGs.** Headless-Edge self-checks go to TEMP and are **deleted before the
  turn ends**.
- **Scope discipline:** behavior questions → **APPEND to `docs/open-questions.md` only**. Do NOT edit
  product-spec / api-contract / design-spec / catalog / other tracks' files, or any `SCREEN-STATUS` row
  other than **4.15 Settings** (+ UP NEXT). Personal git identity (Aiden-Molyneaux; HTTPS; don't
  override); `git pull --rebase` before every push (parallel tracks active — stage only my paths).

## File map
Folder: `docs/design/mockups/settings/` — `settings-page.html` (the conventional page + all page states) +
`feedback-draft-{a-inline,b-sheet,c-triage}.html` (README gets a row per file). **Converge target (LATER,
after the owner picks):** `settings/settings-states.html` (Settings + the chosen feedback surface, full
matrix incl. lifecycle).

## Process
1. Author this brief → commit/push. Flip `SCREEN-STATUS` §4.15 Settings **🔜 → 🔶** (in pass); adjust UP
   NEXT (Settings in pass; Device editor / OQ-045 the next queued coverage-closer). Touch only the 4.15
   row + UP NEXT.
2. Build `settings-page.html` (all sections + the page states) → headless verify (delete shots) → README
   row → commit → push.
3. Build the feedback variants A → B → C → README rows → commit → push.
4. **Present at the owner gate (STOP):** the page + each variant's thesis (interaction-model difference
   explicit) · its `LogAttach` treatment (the opt-in toggle · the consent line · the reserved OQ-060
   payload room) · the new components flagged (`Toggle`/`ConfirmDialog`/the feedback set) · the SUBMIT-
   colour judgment call + any others · any OQ logged · the changed `SCREEN-STATUS` row. **Do NOT
   converge** — await the owner's pick + iteration notes.

---

## Owner gate ruling — 2026-06-14 (verbatim)

> "use feedback draft C triage and make the notifications feature its own page, similar to triage."

**Decoded → applied to `settings-states.html` (converge):**
1. **Feedback model: Draft C "Type-first triage" wins.** The feedback row opens a triage screen (3
   `TriageCard`s) → tailored per-type forms (minimal feedback/suggestion; the purpose-built **bug form**
   foregrounding the non-PII diagnostic-context chips + the `LogAttach` hero). Drafts A (inline) + B
   (sheet) retire, kept for history.
2. **Notifications → its own page.** The inline NOTIFICATIONS section becomes a **`ListRow` in Settings
   that opens a dedicated NOTIFICATIONS page** (FlowHeader ◂ NOTIFICATIONS) hosting the per-type
   `Toggle`s (grouped Social / Games & Cards / Store) + the NOTIF-04 OS-permission-declined recovery.
   *Interpretation flagged: "similar to triage" read as the **row → focused dedicated page** navigation
   pattern C established (Settings becomes a lean list; each heavier feature — notifications · blocked ·
   feedback — opens its own focused page), **not** a literal "what kind of notification?" card-chooser
   layered over 6 toggles (judged over-engineering). If a category-chooser was intended, the
   notifications page is a small redo.*
3. **Both former residuals resolved (owner refinement, 2026-06-14):** *"let's make this a mid-button
   primary, and let's make the confirm dialog a bottom drawer."*
   - **Feedback SUBMIT** → a **mid-width `KeycapButton/primary`** (centered, on-theme `scr.accent` orange,
     not the full-bleed red `/destructive`) — across every feedback state. *(The delete-account DELETE
     button stays red `/destructive` — deletion IS destructive.)*
   - **Destructive delete confirm** → a **bottom `ConfirmSheet`** (the app's one-drawer grammar, kin to
     `ReportSheet`; summoned, no grab handle). The working name **`ConfirmDialog` retires → `ConfirmSheet`**,
     aligning with the game-page track's destructive `ConfirmSheet` (OQ-061) — **spec-owner to ratify one
     shared component** at formalization.

Converge target: `settings/settings-states.html` — the lean Settings list (notifications now a row → its
own page) + the C-triage feedback surface + the full §1.6 lifecycle matrix. `settings-page.html` +
feedback drafts a/b/c kept for history.
