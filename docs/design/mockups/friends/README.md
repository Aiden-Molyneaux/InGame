# Friends (§3.3) — mockups

The **Friends tab** design track. Friends is a top-level tab — *"keep up with people + find new
ones"* (Socializer). Scope = the **tab** (the SOC-06 activity feed + the friends list + the requests
inbox + **jump-offs** into the heavy sub-screens **4.6 Compare · 4.7 Lists · 4.8 Find/Add**), not those
sub-screens themselves. Design-side only — §5.10 Social is specified; gaps go to the inbox (OQ-071).

See **[`friends-drafts-brief.md`](friends-drafts-brief.md)** for the contract, the locked component
names, the 3 directions, the P1–P6 panel contract, and the hard rules.

## CONVERGED → [`friends-states.html`](friends-states.html) (2026-06-23)
Owner ruling (2026-06-22/23): **A "Feed-first" won**; **B / C retired to history** (kept for reference).
The converged states board carries Draft A's **P1 landing · P2 active feed (SOC-06) · P3 roster (SOC-01) ·
P4 ADD FRIENDS hub · P5 cold-start (SOC-07/10) · P6 friend actions sheet (MOD-01/SOC-09 — no share)** and
adds, at converge:
- **Lifecycle (now drawn):** **L1 Skeleton** (solid fills) · **L2 "Signal Lost" + RETRY** · **L3 Offline**
  (feed + roster from cache, writes gated — SYS-10).
- **Q1 quiet-feed / empty-requests** — the §3.3 "quiet vs active" state (thin window → digest + nudge; no
  pending ⇒ no banner). Draft A only described these.
- **Flat buttons rippled Inset-Recess → Scanline Energize** (F-03, locked 2026-06-18 — the *draft* was
  skipped by that sweep); on-screen type held to **F-06** (no drift).

**IA seam:** the full **find/add + requests inbox = 4.8** ([`../find-add-friends/find-add-friends-states.html`](../find-add-friends/find-add-friends-states.html));
the Friends tab's header key + requests banner jump there. The in-tab ADD FRIENDS hub (P4) is kept as
drawn and cross-references 4.8 (no behavior duplication).

| Draft | Model | Status |
|---|---|---|
| [`friends-draft-a-feed.html`](friends-draft-a-feed.html) | **A · Feed-first** (the SOC-06 feed IS the landing; roster = a rail, requests = a banner, find/add = a header key) | **WON → converged** |
| [`friends-draft-b-roster.html`](friends-draft-b-roster.html) | B · Roster-first (the list is the body) | retired (history) |
| [`friends-draft-c-connect.html`](friends-draft-c-connect.html) | C · Connect-first (the CONNECT/InviteHook hero) | retired (history) |

## Components (ratified into design-spec §1.5 at the spec-owner's formalization)
`FeedRow`/`ActivityRow` · `FriendRow`/`FriendTile` · `RequestRow` · `InviteHook`. **`PresenceDot`/`StatPeek`
were CUT** (owner 2026-06-18 — no presence/now-playing) and are not formalized. Reuse: `GameCard/thumb`,
the avatar monogram (PROF-08), the sheet/drawer family, the flat **Scanline** `KeycapButton`/`ToolKeycap`,
the COMPARE `chip`, `DeviceShell` + `NavBand`, the §1.6 lifecycle family.

## Burt audit
**PASS** (0 blocker · 0 major), reconciled against F-01..F-09 + the Scanline-F-03 / StateMark-F-09
directives. **F-06 clean** (the historical drift is gone). One **owner-ratification**: `.achv` uses
`--gold` for the **achievement-badge** glyph in the feed (the catalog classes gold-as-trophy a judgment
call, not a violation) — inherited from Draft A; bless gold-as-achievement or recolor to `--scr-accent`.

## Flags raised (design-side only — never edited the spec)
- **OQ-071** — `GET /me/feed` aggregated **item shape** is unenumerated (the central gap); proposed a
  shape in the inbox. (Presence is no longer drawn — it was cut.)
- **OQ-075** — **SOC-05 recommend-a-game compose surface** (pick game + note) is entry-only in the actions
  sheet; drawn on no board. Deferred — decide its home at the spec-owner pass.
- **OQ-052** (resolved) — no friend-profile SHARE; honored everywhere (the actions sheet has no share).
