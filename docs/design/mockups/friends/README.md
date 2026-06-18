# Friends (§3.3) — mockups

The **Friends tab** design track. Friends is a top-level tab — *"keep up with people + find new
ones"* (Socializer). Scope = the **tab** (the SOC-06 activity feed + the friends list + the requests
inbox + **jump-offs** into the heavy sub-screens **4.6 Compare · 4.7 Lists · 4.8 Find/Add**), not those
sub-screens themselves. Design-side only — §5.10 Social is specified; gaps go to the inbox (OQ-071).

See **[`friends-drafts-brief.md`](friends-drafts-brief.md)** for the contract, the locked component
names, the 3 directions, the P1–P6 panel contract, and the hard rules.

## Drafts (for the owner gate — 2026-06-17)
Three **distinct organizing models** (different default + different primary surface, not a recolor).
Each renders **P1 landing · P2 feed (SOC-06) · P3 roster (SOC-01) · P4 requests (SOC-08) · P5 cold-start
(SOC-07/10) · P6 friend actions sheet (MOD-01/SOC-09 — no share)**. Lifecycle deferred to converge.

| File | Model | Thesis (the landing + the nav model) |
|---|---|---|
| [`friends-draft-a-feed.html`](friends-draft-a-feed.html) | **A · Feed-first** | The SOC-06 **aggregated feed IS the landing** — one low-noise scroll; roster = a slim `ONLINE NOW` rail, requests = an inline banner, find/add = a header key. No sub-tabs. The IA's stated default; the social-stream pole. |
| [`friends-draft-b-roster.html`](friends-draft-b-roster.html) | **B · Roster-first** | The friends **list is the body** (presence-sorted + a `PRESENCE / A–Z / RECENT` sort bar, active = orange accent border); the feed is a collapsed `RECENT` footer digest (→ SEE ALL), requests = a count-badged header key. The people-directory pole. |
| [`friends-draft-c-connect.html`](friends-draft-c-connect.html) | **C · Connect-first** | A priority-stacked landing — a top `CONNECT` zone (**requests to act on** + the `InviteHook`: search · invite link · QR → 4.8) leads as the hero; `YOUR CIRCLE` (compact roster) + an `ACTIVITY` digest sit beneath. Tuned to the cold-start / low-friend reality. The growth pole. |

**Status:** in pass → owner gate. **Do not converge** until the owner picks a direction + gives
iteration notes. Converge target (later): `friends-states.html` (full matrix incl. lifecycle).

## New components introduced (form is each draft's; names locked, ratified at converge)
`FeedRow`/`ActivityRow` · `FriendRow`/`FriendTile` · `RequestRow` · `PresenceDot`/`StatPeek` ·
`InviteHook`. Reuse: `GameCard/thumb`, the avatar monogram (PROF-08), the sheet/drawer family, flat
`KeycapButton`/`ToolKeycap` (Inset Recess), the COMPARE `chip`, the `DeviceShell` + `NavBand`, the §1.6
lifecycle family.

## Flags raised (design-side only — never edited the spec)
- **OQ-071** — `GET /me/feed` aggregated **item shape** is unenumerated (the central gap); proposed a
  shape in the inbox. Also notes **presence/online state** is un-specced (the roster's `PresenceDot` +
  `StatPeek` are drawn illustratively).
- **OQ-052** (already resolved) — no friend-profile SHARE; honored everywhere (the actions sheet has no
  share).
