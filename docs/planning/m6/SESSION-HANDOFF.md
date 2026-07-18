# M6 SESSION HANDOFF — the continuity receipt (2026-07-18)

> **Purpose.** This session ran the entire M6 build (Social + achievements pull-forward + report
> affordance + the pre-beta owner walks) as a Fable-5 orchestrator driving delegated builder agents.
> It's approaching the context limit. This doc is the **single reference to resume in the same
> capacity** after compaction. Read this + [`walk2-notes.md`](walk2-notes.md) + the two receipts and
> you have the whole picture. Branch: **`m6`**, head **`f9eaa2b`** (all work pushed to origin).

---

## 1. WHERE M6 STANDS (2026-07-18)

**Milestone:** M6 = Social (friends/profiles/compare/Top-10/recs/WTP/full-block/invites) **+ two owner
amendments** (ACH achievements/eggs pulled forward from M7; report affordance capture-only) **+ the ◆
closed beta at exit** (decision 0071). The overnight autonomous build shipped ALL 13 buildable packets;
three owner device walks then drove a large iteration batch (waves A/B/C). **Wave D remains.**

**Green at head:** typecheck + lint clean · **466 integration · ~591 mobile** · `/health` 🟢 ·
product-spec **0.61** · api-contract **0.71** · component-map **0.13**.

**Build status:**
- ✅ **Server (P1–P7 + §1 spike + §4 privacy audit):** social graph · friend-read fabric (the
  `SYS-01-FRIEND-READ` guard class) · invites (`AUTH-LOOKUP` bearer) · feed/recs · queue/Top-10 ·
  achievements engine + 0077 seed · reports capture + AUTH-01 breach check. Receipt:
  [`social-receipt.md`](social-receipt.md).
- ✅ **Client (P8–P13):** Friends tab (first article) · friend-view/compare · contributor · Top-10/
  Discover · achievements+celebration · settings/report. Receipt: [`surfaces-receipt.md`](surfaces-receipt.md).
- ✅ **Owner walk-2 iteration (waves A/B/C):** ~40 owner notes triaged + fixed. Ledger:
  [`walk2-notes.md`](walk2-notes.md) (every item, its commit, its diagnosis).
- ⬜ **Wave D — THE NEXT BUILD:** the adaptive Game page (owner-nodded model in
  [`game-page-postures.md`](game-page-postures.md)) + the Add-Game community-cards adopt step
  (OQ-136 reopened, W-C10). C5's game-detail aggregate (built in Wave C) is the seam. Largest
  remaining client packet.
- ⬜ **M6 EXIT GATES (owner lane, the beta):** R2/Cloudflare + API host + managed PG provisioning
  (P15/G-C) · EAS/TestFlight lane (P16) · the alpha wave (close friends) → cohort. See §6.
- ⬜ **Carried from M5:** P2b real-RevenueCat + G-J + the manual sandbox pass — rides Google Play
  verification (owner received Google confirmation; still needs the Android device — see memory
  [[ingame-m1p-provisioning]] + [`m1p-provisioning-log.md`](../m1p-provisioning-log.md)).

**Owner-gate sittings still owed (never sat — the build ran ahead of them per the owner's overnight
directive):** the M6 §0 was closed (decision 0076), but the runtime gates — **G-D re-fire** (friend-read
predicate strip → RED, owner-watched) · **§1-GO ratify** · **ACH intent/no-farm demo** · **G-K value
nods** (buckets, invite TTL, the 49-PX starter set, fuzzy-search) · the **◆ beta sign-off** — are all
pending the owner. They're 2–10 min each; batch them post-Wave-D.

---

## 2. THE ORCHESTRATION MODEL (how this session worked — keep doing this)

**Role:** Fable-5 orchestrates + reviews (builder≠verifier: I never review my own build output). Builders
are delegated agents. Per CLAUDE.md model directive: **Opus-4.8** for user-facing + hard server cores +
reviews; **Sonnet-5** for clear-spec mechanical; **never Haiku**; escalate freely if output misses the bar.

**Two delegation mechanisms, both used:**
1. **Persistent builder agents** (Agent tool → then SendMessage to continue with context intact). Each
   "owns" a surface across the session. Roster (agentId → surface) — use SendMessage to resume:
   - `a946c085f33052b1b` — P13 contributor / device editor / card-render (GameCard/EntryCard) / the header audits
   - `a548ca759e9c234e5` — P8 Friends tab / Find-Add / feed
   - `af9fce0276e0b1c89` — P9 friend-view (`app/user/[id]`) / compare
   - `a3105e74edcc8deef` — P10 Top-10 / Discover / WTP
   - `a174da40d607c30a0` — P11 achievements client / celebration
   - `a5f477075e0a8c8cd` — P12 settings / report / Profile edit
   - `ab9d805ef3ea28b5b` — P2 friend-read server fabric / render/flatten / catalog serializers
   - `a8527f4c3559149bd` — P1 social graph server
   - `a3dbed82fab7a2dff` — P4 feed/recs server · `ae1ebcb18ac241d16` — P6 achievements engine server
   - *(Note: these ids are not guaranteed to persist across a full app restart. A fresh Agent call
     starts clean; that's fine — the ledger + receipts carry the context.)*
2. **Workflows** (Ultracode is ON → use for substantive tasks). Used twice, both excellent:
   - `theme-leak-hunt` (3 investigators → diagnose → fix → adversarial verify) — root-caused the Berry
     theme leak.
   - `wave-c-server` (sequential domain agents catalog→social→ach/coll → adversarial review) — the
     Wave C server batch. **Sequential domain agents = the pattern for shared-server-tree work** (avoids
     barrel/schema/Testcontainers collisions).

**Non-negotiable discipline (learned the hard way — enforce every dispatch):**
- **Disjoint file ownership** per concurrent agent; **explicit-pathspec commits** (`git commit -- <files>`,
  never `git add -A` / bare commit) — prevents the sweep near-misses that bit several times.
- **Builder prompts say:** "do the work directly yourself; never spawn sub-agents or poll-wait; verify
  inline." (Agents stalled 3× waiting on a monitor — always instruct inline verification.)
- **Server work HOLDS while the owner is on-device** (API restarts under his walk dropped his achievement
  unlocks once). Client-only one-liners may hot-reload through selectively.
- **I review every diff** (murr-style) + run the **combined** typecheck/suite myself before pushing —
  cross-tree type breaks (e.g. a shared-schema union change breaking a client screen) are invisible to
  per-tree agent passes. This caught real breaks.
- **Push cadence:** commit locally as agents land; push in batches after a combined-green verify. Push as
  the personal account via the token one-shot (see §5).

---

## 3. THE KEY ARTIFACTS (read these to resume)

- **[`walk2-notes.md`](walk2-notes.md)** — THE walk-2 ledger. Every owner note (waves A/B/C + round-3),
  its status (✅/⬜), commit hash, root-cause diagnosis. The live to-do surface.
- **[`social-receipt.md`](social-receipt.md)** + **[`surfaces-receipt.md`](surfaces-receipt.md)** — what
  the M6 server + client builds delivered, with the load-bearing decisions.
- **[`game-page-postures.md`](game-page-postures.md)** — the Wave D design (OWNER-NODDED; 4 answers +
  Q4 reshape recorded). **Build this next.**
- **Decisions [0076](../../decisions/0076-m6-entry-gate-rulings.md)** (M6 entry gate),
  **[0077](../../decisions/0077-m6-ach-starter-content.md)** (achievement content),
  **[0078](../../decisions/0078-m6-walk2-ruling-omnibus.md)** (the walk-2 ruling omnibus — rank metals,
  DESIGN-NEW orange, no send-toast, buy grammar, header geometry, sticker flow, celebration surface,
  fuzzy search, OQ-147/148/150 resolutions, Wave-D nod).
- **[`m6-build-task.md`](../m6-build-task.md)** — the original M6 brief (packet plan, gates, DoD).
- **[`m1p-provisioning-log.md`](../m1p-provisioning-log.md)** — the owner provisioning register (the beta blocker).

---

## 4. OPEN QUESTIONS / OWNER-EYE ITEMS (in flight)

- **OQ-152** (filed) — fuzzy people-search reused the `AUTH-LOOKUP` guard marker for a multi-row directory
  read; works + leaks nothing but stretches the class's intent. Owner call: overload it or mint
  `SYS-01-DIRECTORY-READ`. No rush (M6/M7-entry).
- **Profile privacy toggle direction** ("Public profile" ON=public) — confirm on device (board's
  "LIMITED PUBLIC PROFILE" wording reads backwards).
- **W-B15** — "a less blank default card visual" (owner design-taste todo; a drafts pass or pre-launch pass).
- **W-A9b** — the store-drawer "unusable" glitch hardening (optional; the theme leak itself is fixed).
- **Avatar editor** — Profile ships the PROF-08 monogram only; the vector-composition avatar editor is a
  future packet (v2 = no image uploads).

---

## 5. ENVIRONMENT / MECHANICS (the traps, banked in the runbook)

- **Dev stack:** `node scripts/dev-stack.mjs up` (idempotent) · `doctor` on friction · Metro **:8082**
  agents (NEVER :8081 = owner's phone lane) · demo login `demo@ingame.app` / `InGameDemo1!`.
- **Mobile jest MUST run via `npm -w @ingame/mobile test`** — NOT bare `npx jest` from the repo root (wrong
  config, no JSX/TS → phantom parse errors). API tests = vitest (`npm run test:integration` / `test:unit`).
  *(Both banked in [`../../qa-runbook.md`](../../qa-runbook.md).)*
- **Metro corrupts under heavy multi-agent churn** → red-screen (`DependencyGraph` / bundle 500). Fix:
  cache-cleared restart per lane (`down` → delete `%TMP%/metro-*` + `node_modules/.cache/metro*` → `up`;
  phone lane = `-c`). Pre-emptively `-c` restart before a device walk after a build burst.
- **Testcontainers contention:** concurrent integration runs → mass `beforeAll` timeouts (false reds). Run
  server suites sequentially; agents run only their slice; I run the full suite once.
- **Push (personal account):** the work git-intercepts as `VTM-Aiden-Molyneaux` → 403. Recovery:
  `GIT_TERMINAL_PROMPT=0 git push https://Aiden-Molyneaux:$(gh auth token -u Aiden-Molyneaux)@github.com/Aiden-Molyneaux/InGame.git m6:m6`. (Memory [[ingame-push-credential-recovery]].)
- **RN-web browser lane** is flaky (renderer wedges 0×0); jest + curl are the primary verification, the
  owner device walk is the visual gate.

---

## 6. NEXT ACTIONS (in order, when resuming)

1. **Build Wave D** — the adaptive Game page (`game-page-postures.md`, owner-nodded) + the Add-Game
   community-cards step (OQ-136/W-C10). One large client packet riding C5's game-detail aggregate. This
   is the last big M6 client item.
2. **Owner sitting batch** (post-Wave-D, ~20 min total): G-D re-fire · §1-GO · ACH no-farm demo · G-K nods
   (49-PX set, buckets, fuzzy search) · the deferred owner-eye items (§4).
3. **The beta exit lane** (owner-heavy, the whole point): the R2/hosting provisioning sitting (Fable-guided,
   like the Apple one) → P15/G-C · EAS/TestFlight → P16 · the alpha wave (close friends on TestFlight
   internal) → the 5–20 cohort. Google verification arrived; still needs the Android device + the
   12-tester Play recruiting. This gets M6 onto friends' phones = the ◆ closed beta = M6 exit.
4. **M7 forward-look:** first packet is PUSH (NOTIF-*), which retires the beta's group-chat return
   mechanism and closes the achievement other-actor-unlock gap. Then moderation console (reads P7's
   reports table) · MOD-07 screening · discovery completion.

**The owner's cadence:** he gives explicit per-wave/per-task go-aheads, walks the app on device and dumps
tagged notes (batch mode: file + triage silently, dispatch in waves when he pauses), and rules decisions
live. Match that. He is sensitive to visual polish and to consuming the shipped component library rather
than redrawing (the recurring walk-fix theme).
