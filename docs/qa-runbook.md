# QA Runbook — the lessons ladder (tier 1: capture)

Workflow lessons for the QA/verify lane (dev stack, preview, screenshot capture, test running).
Owned by the **doctor-nick** skill (`.claude/skills/doctor-nick/`); decision 0065.

**The ladder:** capture instantly here → **twice = automate** into `node scripts/dev-stack.mjs
doctor` → stable invariants become CLAUDE.md law. When stuck on *workflow* (not product bugs):
run `doctor` → check this file → only then investigate from scratch.

**Entry format** (append under Active lessons; zero ceremony, do it mid-task):

    ## <short symptom title>
    - **Symptom:** what you observed (error text, blank page, hang…)
    - **Diagnosis:** actual cause
    - **Fix:** exact commands / steps that resolved it
    - **Verified:** YYYY-MM-DD · **Hits:** 1

Re-hit an existing entry → increment **Hits**, update **Verified**. At **Hits ≥ 2** and
deterministically checkable → promote to a `doctor` check and shrink the entry to a one-liner
under Promoted.

---

## Active lessons

## Hidden/backgrounded Chrome tab throttles RN-web QA
- **Symptom:** CDP screenshots time out ("renderer frozen"), captures serve stale frames, and RN-web timers freeze (the Styler save-line ticker stuck at "SAVED 0s AGO"; debounced autosaves never fire).
- **Diagnosis:** Chrome background-tab throttling — `document.visibilityState === 'hidden'` on the QA tab. Closing sibling tabs is NOT enough if the whole window is behind another.
- **Fix:** check `document.visibilityState` via `javascript_tool` before trusting captures. While hidden, verify via a11y tree / `get_page_text` / network log instead of screenshots (all still work), and prefer flows that flush explicitly (KEEP, ◂ quiet-exit) over waiting on debounce timers. Screenshots resume when the window comes forward.
- **Verified:** 2026-07-06 · **Hits:** 2 *(parvati's §3.2 walk 2026-07-06, then the fix-round verification the same day; not promotable — `doctor` can't probe Chrome tab visibility)*

## Chrome MCP `zoom` leaves a stuck viewport override
- **Symptom:** after a `zoom` capture, the tab's viewport stays frozen at the zoom-region size; `resize_window` and Ctrl+0 don't clear it.
- **Diagnosis:** the tooling's `zoom` sets a device-metrics override it never removes.
- **Fix:** open a fresh tab (the only reliable clear). Avoid `zoom` on RN-web QA tabs; use `computer` screenshot + region math instead.
- **Verified:** 2026-07-06 · **Hits:** 1 *(parvati's §3.2 walk)*

## Phone can't reach the dev stack — Expo Go silently boots a STALE cached bundle
- **Symptom:** the phone shows errors from OLD code (already-fixed redboxes) and reload / app-restart / phone-restart change nothing; `.devstack/metro.log` shows NO phone requests (only agent curls); local curls to the LAN IP (`http://192.168.68.58:8082/status`) answer fine.
- **Diagnosis:** Windows Firewall. The Wi-Fi is on the **Public** profile and the inbound allow rules for node cover only specific binaries (`%LOCALAPPDATA%\nvm\v20.19.6\node.exe` — the owner's terminal spawns). Agent shells resolve node via the **`C:\nvm4w\nodejs` junction**, which has NO rule → inbound to :8082/:4000 is dropped → Expo Go can't fetch a manifest and quietly falls back to its per-project cached bundle, replaying stale code. A local curl does not prove the phone can connect.
- **Fix:** restart the stack from the allowed binary:
  `"C:/Users/aiden.molyneaux/AppData/Local/nvm/v20.19.6/node.exe" scripts/dev-stack.mjs up` (with the same dir prefixed to PATH so npm/expo children inherit it). Verify with `(Get-Process -Id <pid-of-:8082>).Path` — it must be the appdata nvm path, not `C:\nvm4w\...`. (Durable alternative, owner-only: add a firewall allow rule for `C:\nvm4w\nodejs\node.exe`.)
- **Verified:** 2026-07-06 · **Hits:** 1

## Metro won't start — expo-cli dies with "Body is unusable: Body has already been read"
- **Symptom:** `dev-stack up` reports metro down; `.devstack/metro.log` ends with `TypeError: Body is unusable` at `getNativeModuleVersionsAsync` (expo-cli's dependency-validation step) and `expo start` exits 1.
- **Diagnosis:** expo-cli's version-check call to the Expo API double-reads a fetch response (upstream CLI bug); clearing `~/.expo/native-modules-cache` + `~/.expo/versions-cache` did NOT fix it.
- **Fix:** `EXPO_OFFLINE=1 node scripts/dev-stack.mjs up` — skips the validation (LAN bundle serving is unaffected; Expo Go connects via `exp://<LAN-IP>:8082`). If this re-hits, bake `EXPO_OFFLINE=1` into the supervisor's metro spawn.
- **Verified:** 2026-07-06 · **Hits:** 1

## Hard URL navigation logs the web session out
- **Symptom:** navigating the QA tab to an app URL (deep link like `/styler/:gameId?cardId=…`) lands on `/sign-in`; the deep link is not replayed after login.
- **Diagnosis:** the web dev session's access token lives in memory only (nothing in `localStorage` but `persist:ingame_prefs`) — a full page load wipes it, and the auth guard redirects before the refresh flow can restore anything.
- **Fix:** deep-link WITHOUT reloading: `history.pushState(null, '', '<path>'); window.dispatchEvent(new PopStateEvent('popstate'))` via `javascript_tool` — expo-router picks it up client-side and the session survives.
- **Verified:** 2026-07-06 · **Hits:** 1

---

## Promoted (owned by `doctor` — run `node scripts/dev-stack.mjs doctor`)

- Postgres container down → `doctor` **db :5432** check.
- API :4000 dead / unhealthy → `doctor` **api :4000** check (restart-safe; env in `apps/api/.env.dev`).
- Web login CORS-blocked → `doctor` **api CORS env** check (`DEV_CORS_ORIGINS` must include `http://localhost:8082`, OQ-120).
- Phone broken after Metro restart → `doctor` **.env.local trap** check (`apps/mobile/.env.local` must NOT exist).
- Preview unreachable / `preview_start` says "port 8082 in use" → `doctor` **metro :8082** check (that error means the standing Metro is UP — never kill it).
- Blank preview page (`scripts: 0`) → `doctor` **web bundle** check (tab loaded before first bundle; reload after "Bundled" appears in `.devstack/metro.log`).
- Leftover parallel API on :4001 → `doctor` **orphan :4001** check.

## Canonized (CLAUDE.md law — the invariants)

- Metro **:8081 is the owner's phone lane — never touch it**; agents use :8082 only.
- The standing Metro on **:8082 is never killed** to "free the port" — `preview_start`'s "port in use" error means it is UP; killing it re-pays the cold start.
- **Never create `apps/mobile/.env.local`** (also doctor-checked).
- Behavior checks → **supertest integration tests first**; the :8082 browser lane is for visual/UI verification.
- Destructive DB testing → parallel API on :4001 + disposable DB, killed after.
