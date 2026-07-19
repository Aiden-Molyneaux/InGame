# M6 wave — review-coverage trace (2026-07-19)

> Owner asked: has all the last-two-days work met our quality bar (Murr = code audit · Parvati =
> screen parity)? This traces every packet → its Murr + Parvati status → what's owed. Built from the
> `git log --since 2026-07-18` feature commits.

## The two gates
- **Murr** (`shipwright/skills/murr`) — adversarial code audit, runtime-bugs-first. Fresh-context agent over a diff.
- **Parvati** (`.claude/skills/parvati`) — screen parity vs mockup + DoD, from screenshots of the running app.
  Was DARK all session (browser wedge, root-caused + fixed 2026-07-19 — see qa-runbook). Now runnable via
  claude-in-chrome + settle-wait.

## Coverage matrix

| Packet | Commits | Murr | Parvati |
|---|---|---|---|
| **Wave D** adaptive game page + review pass | 934aa5f · 9c8d542 · 5b26ae1 · f9f6bcd | ✅ adversarial workflow (GO) | ❌ **OWED** |
| **Round-5** Profile/genres/Game/UpNext | 127ec8f · 55ab96b · d2d77b7 · dfebb37 · 9e00319 | ✅ Murr wave-audit (found+fixed the genres HIGH) | ❌ **OWED** |
| **Round-5** dev-copy A/B/C + D-bucket (RATING/adoption/drops) | strip · 1aa5e38 · 3fc5c1d · 57c2a1a | ✅ Murr wave-audit | ❌ **OWED** (RATING dossier, buy pages) |
| **W-1** Contributor VIEW ALL | 6b161fb | ✅ Murr wave-audit | ❌ **OWED** (the 2 new full-list routes) |
| **W-4** Monogram Forge | 57d6602 · 4c28e70 + person-summary follow-up | ✅ Murr wave-audit (found the list-row gap → fixed) | ❌ **OWED** (the forge UI + list-row monograms) |
| **Auth epic** P-A/P-B/P-D (server) | e98fec4 · 3805591 · 01fae0e | ✅ Murr wave-audit (found+fixed 2 MED) | n/a — server; the auth CLIENT screens (P-C/P-E) aren't built yet |
| **W-6** wiki game-editing | 53da735 | ✅ adversarial (GO) + Murr quality lens | ❌ **OWED** (AboutTab EDIT mode) |
| **Murr fixes** (genres/auth/W-6/W-4) | 3fb15d2 · f8a7e0d · d6a18b8 | ⏳ re-Murr owed on the 2 HIGH + 2 MED to confirm closed | rides the screen Parvati |
| **walk2 waves A/B/C** owner-walk fixes | 0d9438d · a5f8794 · bba9774 · f3be7b3 · c9acce2 · 477bfad · a5e4faf · c8f4fe1 · abff0c0 · a49bf8c · 50fd467 · edd9710 · 47d7a36 · 66cd26a · 94ef76b · dc05436 · e4ab962 · 5a3d878 | ⚠️ **GAP** — combined-verify + §4 privacy audit only; no dedicated Murr | ⚠️ owner device-walks were the parity check; a formal Parvati wasn't run this session |
| pre-compaction overnight M6 build (P1–P13) | (earlier) | §4 privacy cross-audit + gate reviews | ✅ reviewed+parvati'd per m6 receipts (memory) |

## What's owed (the closing passes)
1. **Re-Murr the 4 confirmed fixes** (2 HIGH genres + 2 MED auth) — verify closed, not just claimed. Combined verify first (waiting on the W-4 person-summary agent to land).
2. **Murr on the walk2 gap** — one pass over the walk2 A/B/C diff (the logic-bearing ones: theme-leak teardown, social-reads refetch, the C-wave server work). DISPATCHED.
3. **Parvati sweep** — the real hole. Every ❌-OWED screen, now that the browser works. Priority order:
   Game page (Wave D postures + RATING + AboutTab edit) → Profile (forge + teasers) → Collection → Up Next →
   Store → Friends/Feed/Contributor (list-row monograms + VIEW ALL) → Add Game → Device. Sequential (one browser).

## Recipe for Parvati captures (qa-runbook)
API healthy (`dev-stack up` + `doctor` green) → claude-in-chrome at `http://localhost:8082` → login
`demo@ingame.app` / `InGameDemo1!` → **wait ~3–4s per screen to settle** → screenshot. NOT the Claude_Browser preview pane.
