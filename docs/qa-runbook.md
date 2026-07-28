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
- **Fix:** check `document.visibilityState` via `javascript_tool` before trusting captures. While hidden, verify via a11y tree / `get_page_text` / network log instead of screenshots (all still work), and prefer flows that flush explicitly (KEEP, ◂ quiet-exit) over waiting on debounce timers. Screenshots resume when the window comes forward. **The MCP tab group may live in a WHOLE-HIDDEN browser window** (the §3.4 walk found it in a minimized Edge window — `IsWindowVisible` false, every screenshot frozen): force it forward from the shell —
  enumerate top-level windows for a `localhost` title, then `ShowWindow(hWnd, 9)` + `SetForegroundWindow(hWnd)` via a PowerShell `Add-Type` user32 P/Invoke. Re-run it whenever captures freeze again mid-walk (the window falls back).
- **Verified:** 2026-07-26 · **Hits:** 6 *(parvati's §3.2 walk; the fix-round; the §3.4 BOOT walk; parvati's §3.4 walk; parvati's M5 P7/P8 walk — re-front ~5× per long session, the window keeps falling back. Not promotable — `doctor` can't probe tab visibility. Walk-4 Batch-1 sweep: hidden-tab claude-in-chrome lane — CDP clicks no-op'd + intermittent capture freezes; the F-17 synthetic-pointer recipe + pushState deep-links drove the whole sweep, and ~half the screenshots still captured fine between freezes)*
- **2026-07-13 update (M5 P7/P8 walk):** on this box the foreground P/Invoke **no longer holds at all** — even topmost-pin (`SetWindowPos HWND_TOPMOST`) + the ALT-key foreground-lock release got stolen back within ~1s, so `captureScreenshot` timed out on **every animated surface** (PulledSheet/adopt sheet, Styler, Canvas, Device — all skia/Reanimated). Only the fresh-tab-first-paint captured. **Working posture: don't fight it — drive the whole walk off the a11y tree (`read_page`/`find`) + `get_page_text` + live DB/ledger reads + `read_network_requests`; the owner's device walk is the visual gate.** Also newly observed: **Styler frame-rail premium swatches ignore synthetic ref/coordinate clicks** (save-line never flips) while **Device swatches + all nav/dialog buttons register fine** — so interactive Styler-rail flows (apply premium → ReconcileSheet) aren't web-lane-drivable; verify the sibling acquire-batch on Device (KeepBar) instead, and leave the Styler ReconcileSheet to the device walk.

## Chrome MCP `zoom` leaves a stuck viewport override
- **Symptom:** after a `zoom` capture, the tab's viewport stays frozen at the zoom-region size; `resize_window` and Ctrl+0 don't clear it.
- **Diagnosis:** the tooling's `zoom` sets a device-metrics override it never removes.
- **Fix:** open a fresh tab (the only reliable clear). Avoid `zoom` on RN-web QA tabs; use `computer` screenshot + region math instead.
- **Verified:** 2026-07-06 · **Hits:** 1 *(parvati's §3.2 walk)*

## `resize_window` mid-walk latches a CDP device-metrics override on the skia surface
- **Symptom:** nudging the browser window mid-walk (to clear the rn-skia-web blank bed) shrank the tab's viewport to ~183×22 and froze its captures for the rest of the walk.
- **Diagnosis:** same class as the `zoom` override — `resize_window` sets a device-metrics override that the skia surface + CDP capture path don't recover from cleanly.
- **Fix:** don't `resize_window` mid-walk on a page with a live skia canvas. Drive from a **fresh tab + re-login** to get a clean viewport; if the bed is blank, a full fresh-tab reload beats an in-place resize.
- **Verified:** 2026-07-08 · **Hits:** 1 *(parvati's §3.4 device-walk)*

## On-device "X is not installed!" from an optional-dep proxy — check TRANSITIVE native versions
- **Symptom:** Expo Go redboxes "react-native-reanimated is not installed!" (skia's `OptionalDependencyNotInstalledError`) even though the package is installed and present in the served chunk.
- **Diagnosis:** the proxy's `try { require(...) } catch` swallows the REAL error — here a JS/native mismatch: reanimated 4.1.7 pulled `react-native-worklets@0.8.3` while Expo Go SDK 54 ships worklets **0.5.1** natively; worklets threw at init. `expo install` pins only the package you name — its transitive native deps can still drift off the SDK matrix (F41's blind spot).
- **Fix:** compare `npm ls <transitive-native-dep>` against `node_modules/expo/bundledNativeModules.json`; pin the SDK version direct (`npx expo install react-native-worklets`) **plus a root `overrides` entry** (npm otherwise keeps the newer copy nested under the parent). Rebuild Metro with cleared caches.
- **Verified:** 2026-07-06 · **Hits:** 1

## Phone can't reach the dev stack — Expo Go silently boots a STALE cached bundle
- **Symptom:** the phone shows errors from OLD code (already-fixed redboxes) and reload / app-restart / phone-restart change nothing; `.devstack/metro.log` shows NO phone requests (only agent curls); local curls to the LAN IP (`http://192.168.68.58:8082/status`) answer fine.
- **Diagnosis:** Windows Firewall. The Wi-Fi is on the **Public** profile and the inbound allow rules for node cover only specific binaries (`%LOCALAPPDATA%\nvm\v20.19.6\node.exe` — the owner's terminal spawns). Agent shells resolve node via the **`C:\nvm4w\nodejs` junction**, which has NO rule → inbound to :8082/:4000 is dropped → Expo Go can't fetch a manifest and quietly falls back to its per-project cached bundle, replaying stale code. A local curl does not prove the phone can connect.
- **Fix:** restart the stack from the allowed binary:
  `"C:/Users/aiden.molyneaux/AppData/Local/nvm/v20.19.6/node.exe" scripts/dev-stack.mjs up` (with the same dir prefixed to PATH so npm/expo children inherit it). Verify with `(Get-Process -Id <pid-of-:8082>).Path` — it must be the appdata nvm path, not `C:\nvm4w\...`. (Durable alternative, owner-only: add a firewall allow rule for `C:\nvm4w\nodejs\node.exe`.)
- **Verified:** 2026-07-27 · **Hits:** 2 → **PROMOTED (done):** `doctor` now checks the :4000
  process's binary path (`api node binary` — WARNs on the `nvm4w` junction with the exact restart
  fix). *The 2026-07-27 re-hit's new wrinkle: an AGENT restarting the shared API mid-session (e.g.
  to reload env) silently respawns it under the blocked junction binary — every LOCAL check stays
  green while the phone is firewalled out. If an agent must restart the API, it must relaunch via
  the allowed AppData nvm node (the doctor fix line has the exact command).*
- **⚠ Correction (2026-07-08):** the "Expo Go connects via `exp://…:8082`" line is wrong — :8082 is **web-only** (`--web`). Device tests need a **native** Metro on **:8081** (see "Device (Expo Go) tests need a NATIVE Metro"). The firewall/allowed-node lesson here still applies to the shared **API :4000** the phone must reach.

## Metro won't start — expo-cli dies with "Body is unusable: Body has already been read"
- **Symptom:** `dev-stack up` reports metro down; `.devstack/metro.log` ends with `TypeError: Body is unusable` at `getNativeModuleVersionsAsync` (expo-cli's dependency-validation step) and `expo start` exits 1.
- **Diagnosis:** expo-cli's version-check call to the Expo API double-reads a fetch response (upstream CLI bug); clearing `~/.expo/native-modules-cache` + `~/.expo/versions-cache` did NOT fix it.
- **Fix:** `EXPO_OFFLINE=1 node scripts/dev-stack.mjs up` — skips the validation (LAN bundle serving is unaffected; Expo Go connects via `exp://<LAN-IP>:8082`). If this re-hits, bake `EXPO_OFFLINE=1` into the supervisor's metro spawn.
- **Verified:** 2026-07-08 · **Hits:** 2 → **PROMOTED (done).** `EXPO_OFFLINE=1` is now **baked into `startDetached`'s child `env`** in `scripts/dev-stack.mjs` (the metro + api spawn), so `up` no longer needs the shell prefix. *The 2026-07-08 device-walk re-hit surfaced the real story: the crash text (`getVersionedNativeModulesAsync`/`Body is unusable`) was a red herring — the metro actually **bundled fine** on the offline run and only died because a `timeout`-wrapped `dev-stack up` (bash tool) **cascade-killed the detached child** (see the "console-cascade" entry). Fix that stuck: (1) baked-in EXPO_OFFLINE, (2) launch via PowerShell `Start-Process -WindowStyle Hidden node scripts/dev-stack.mjs up` (survives), (3) poll `:8082` — came up HTTP 200. `up`'s prewarm can log a non-fatal SSR `window is not defined` (expo-router web prerender + async-storage) — ignore it; the interactive bundle serves.*

## Hard URL navigation logs the web session out
- **Symptom:** navigating the QA tab to an app URL (deep link like `/styler/:gameId?cardId=…`) lands on `/sign-in`; the deep link is not replayed after login.
- **Diagnosis:** the web dev session's access token lives in memory only (nothing in `localStorage` but `persist:ingame_prefs`) — a full page load wipes it, and the auth guard redirects before the refresh flow can restore anything.
- **Fix:** deep-link WITHOUT reloading: `history.pushState(null, '', '<path>'); window.dispatchEvent(new PopStateEvent('popstate'))` via `javascript_tool` — expo-router picks it up client-side and the session survives. **Corollaries (§3.4 walk):** a Metro module-graph change (new files/dirs) forces a full refresh → same logout — re-login is the cost of editing code mid-walk; and `router.back()` after a pushState deep-link can no-op (no real history entry) — an automation artifact, not a product bug; exit flows verify on real navigation.
- **Verified:** 2026-07-06 · **Hits:** 2

## RN-web drags: CDP `left_click_drag` works on PanResponder overlays, NOT everywhere
- **Symptom:** `left_click_drag` moves elements on the §3.4 press bed fine, but some RN-web drag targets (IntensitySlider, long-press drag-Z) ignore it.
- **Diagnosis:** single-shot CDP drags dispatch a tight down/move/up burst; responders that need long-press arming or granular move events never engage.
- **Fix:** dispatch a STEPPED mouse sequence via `javascript_tool` — `mousedown`, several spaced `mousemove`s, `mouseup` (see parvati's §3.4 workflow notes in `m4-review-notes.md` for the working recipe). Long-press arming stays flaky under automation — judge via the built-alongside tap pair instead.
- **Verified:** 2026-07-07 · **Hits:** 2 *(styler slider ×1; §3.4 walk ×1)*

## Dev LogBox overlay steals taps after an uncaught error
- **Symptom:** after any uncaught error, the RN-web LogBox banner re-EXPANDS on every remount/navigation and eats taps meant for the app (walk actions silently no-op).
- **Diagnosis:** dev-only LogBox; it re-opens itself per mount while the error list is non-empty.
- **Fix:** dismiss it via its own Dismiss/✕ each time (or fix the underlying error and reload — a clean console spawns no LogBox). Budget for it whenever a walk intentionally provokes errors.
- **Verified:** 2026-07-07 · **Hits:** 1 *(parvati's §3.4 walk)*

## Device (Expo Go) tests need a NATIVE Metro — `dev-stack up` only serves web-only :8082
- **Symptom:** owner "can't connect" / stuck on the sign-in screen on the phone even though the dev stack is green and the web preview (:8082) works; `.devstack/metro.log` shows only `platform=web` requests, never `ios`/`android`.
- **Diagnosis:** the dev-stack Metro is `expo start --web --port 8082` (`scripts/dev-stack.mjs:353`) — a **web-only** server. Expo Go cannot pull a **native** bundle from a `--web` server, and `dev-stack up` never starts a native Metro. The phone lane (:8081) is a SEPARATE native `expo start` that has to be running. *(This corrects the older "Phone can't reach the dev stack" entry, which says "Expo Go connects via exp://…:8082" — :8082 is web-only.)*
- **Fix:** start a native Metro under the firewall-allowed node, **detached via Start-Process** (see the next entry): `…/v20.19.6/node.exe node_modules/expo/bin/cli start --port 8081` (CWD `apps/mobile`, `EXPO_OFFLINE=1`). Point Expo Go at `exp://<LAN-IP>:8081` (or reopen the project). The API (:4000) is shared and fine. Verify it's on the allowed node: `(Get-Process -Id <pid-of-:8081>).Path`.
- **Verified:** 2026-07-08 · **Hits:** 1

## Servers spawned from the bash tool die on a later command's kill (Windows console-cascade)
- **Symptom:** the API (:4000) and/or a hand-started Metro were up a moment ago, then vanish mid-session; `.devstack/api.log` ends with npm exit **3221225786** (`0xC000013A` = STATUS_CONTROL_C_EXIT). Seen right after a `dev-stack up` that the bash tool **terminated on timeout**, and after `nohup … & disown` background starts.
- **Diagnosis:** Git-Bash `nohup`/`disown` does **not** detach from the tool's Windows console; when the tool kills a timed-out command it delivers a console-close (CTRL_CLOSE) to **every** process attached to that console — including "backgrounded"/detached children and the supervisor's just-spawned API+Metro.
- **Fix:** start durable servers with **PowerShell `Start-Process -WindowStyle Hidden -RedirectStandardOutput <log> -RedirectStandardError <err>`** under the firewall-allowed node — a real detached process, immune to the bash-tool lifecycle. AND don't let `dev-stack up` be killed by a too-short tool timeout — give it **≥300s** so its prewarm finishes and its detached children survive. Re-check the port after an unrelated command to confirm survival.
- **Verified:** 2026-07-08 · **Hits:** 1

## `findstr -E` silently matches nothing (that's grep syntax, not findstr)
- **Symptom:** a port check like `netstat -ano | findstr -E ":4000 :8081"` returns EMPTY → you wrongly conclude the ports are down.
- **Diagnosis:** `findstr` has no `-E` flag; it treats `-E` as a literal token and matches nothing (silent false-negative).
- **Fix:** one pattern per findstr — `netstat -ano | findstr ":4000" | findstr "LISTENING"`; for several ports run separate checks (or `findstr /R /C:"…"`).
- **Verified:** 2026-07-08 · **Hits:** 1

## Rapid successive edits to a LAZY module wedge Metro's transform cache (fresh reloads still serve the old code)
- **Symptom:** an edit that adds a hook import crashes at runtime (`useEffect is not defined`); the import is then fixed, but the SAME error persists across HMR **and full page reloads**, even though `fetch`ing the module's `.bundle` URL shows the new code text. Error-boundary-wrapped components (e.g. a DeviceShell layer) silently vanish instead of crashing the app.
- **Diagnosis:** two writes to the same file in quick succession (the second landing while Metro processed the first) left the **lazy-loaded** module's transform cache stale — the served import bindings predate the fix. `modulesOnly` lazy bundles don't self-heal on reload.
- **Fix:** restart Metro — `node scripts/dev-stack.mjs down` then a **detached** `up` (PowerShell `Start-Process`, the console-cascade rule). Expect the re-bundle wait + the web session logout (below). Avoid the trigger: batch multi-part edits to one file into ONE write where possible.
- **Verified:** 2026-07-10 · **Hits:** 1 *(the §3.5 Device walk)*

## RN-WEB: the DeviceShell band decals render 0-size (onLayout AND measureInWindow both fail on the sticker band layers)
- **Symptom:** placed device stickers are invisible on the `:8082` web preview — the decal `<svg>`s mount with `width="0"` — while the composition, pipeline, readout, TransformBox and server truth are all correct. **Native renders fine** (owner-verified live, 2026-07-10: freeform drag/scale coordinates only a working native surface could produce).
- **Diagnosis:** `StickerBandLayer` sizes decals from a measured `rect`; on RN-web the layer's `onLayout` never delivers AND the ref's `measureInWindow` returns zeros through a 30-frame retry; even a `getBoundingClientRect`-first fallback didn't heal in-session (the DOM node itself measures correctly from the console — the failure is in the view/ref layer, unresolved). Same class as the rn-skia-web bed-paint quirk: a **web-lane limitation, not a ship blocker**.
- **Fix:** none yet on web — verify decal rendering **on device**. The fallback code stays (harmless; may heal other cases). If this re-hits and matters, instrument which node the RN-web ref actually points at.
- **Verified:** 2026-07-10 · **Hits:** 1 *(the §3.5 Device walk)*

## RN-web automation: synthetic keyboard/`form_input` don't reach React state — dispatch native-setter + Pointer events
- **Symptom:** `computer type` into RN-web TextInputs leaves them empty; `form_input` fills the DOM value but the submit button still no-ops (React's controlled state never updated, no POST fires). Synthetic single-tick taps on Pressables (steppers) land inconsistently.
- **Fix (the recipe that works):** set values via the native setter + `input` event — `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input, v); input.dispatchEvent(new Event('input',{bubbles:true}))` — and "click" RN-web Pressables by dispatching `PointerEvent('pointerdown')` → `('pointerup')` → `MouseEvent('click')` at the element's centre. For **hold-to-repeat** steppers, separate down/up by real time (`setTimeout` ≥300ms) — a zero-tick tap can register nothing; step-cadence checks belong on device.
- **Verified:** 2026-07-10 · **Hits:** 1 *(the §3.5 Device walk — login + section taps + steppers)*

---

## Heavy agent file-churn corrupts WATCHING Metros (new dirs/files land under a running packager)
- **Symptom:** two variants, one cause. (a) NEW directories created while Metro runs → imports from
  them 500 the bundle ("web bundle — bundle request errored (status 500)" in doctor; M6 P12 hit it
  with `src/components/report/`). (b) Sustained multi-agent churn (many files + commits under BOTH
  watching Metros) → the phone lane red-screens with a Metro-INTERNAL crash: `Cannot read properties
  of undefined (reading 'get')` at `metro/src/node-haste/DependencyGraph.js` `getOrCreateMap` — the
  incremental haste/dependency map itself is corrupted, not the app code (typecheck/jest green).
- **Diagnosis:** Metro's file-map watcher doesn't reliably absorb new directories or rapid bursts;
  its on-disk caches (`%TMP%\metro-cache`, `%TMP%\metro-file-map-*`, `node_modules/.cache/metro*`)
  persist the corruption across a plain restart.
- **Fix:** a CACHE-CLEARED restart of the affected lane(s). Phone lane (:8081, owner-run):
  `Ctrl+C` → re-run the usual start with `-c` (e.g. `npx expo start -c --port 8081`). Agent lane
  (:8082): `node scripts/dev-stack.mjs down` → delete `%TMP%\metro-cache` + `%TMP%\metro-file-map-*`
  + `node_modules/.cache/metro*` → `up` → doctor green. Expect one cold bundle per lane.
  **Prevention during owner walks:** batch fix-round commits; expect this after any multi-agent
  build burst and pre-emptively `-c` restart before a device session.
- **Verified:** 2026-07-17 (both lanes healed; doctor green board) · **Hits:** 2

## Mobile jest MUST run via the workspace, never bare `npx jest` from the repo root
- **Symptom:** `npx jest src/foo.test.tsx` from the repo root fails to PARSE a perfectly valid `.tsx`
  test — cascading phantom errors: first a TS construct ("Missing initializer in const declaration" /
  "Unexpected token, expected ',' " on an `as` cast), and once types are stripped, "Support for the
  experimental syntax 'jsx' isn't currently enabled". The same file passes fine in the real suite.
- **Diagnosis:** bare `npx jest` from `C:\personal\InGame` picks up a root/default babel config that
  has NEITHER `@babel/preset-typescript` NOR JSX — the mobile package's `jest-expo` preset
  (`apps/mobile/jest.config.js` + `babel-preset-expo`) is what enables both, and it only applies when
  jest runs in the mobile workspace. The parse errors are an artifact of the wrong runner, not the test.
- **Fix:** run mobile tests as **`npm -w @ingame/mobile test`** (optionally `-- <name-filter>` to scope,
  e.g. `npm -w @ingame/mobile test -- store-preview-teardown`). Never `npx jest` from the root for
  `apps/mobile/**`. (API tests are vitest: `npm run test:integration` / `test:unit`.)
- **Verified:** 2026-07-18 (chased a phantom parse error through two needless test rewrites before
  running it correctly — 2/2 green) · **Hits:** 1

## Mass integration beforeAll hook-timeouts + healthy docker + ONE surviving suite ⇒ check MACHINE LOAD first
- **Symptom:** a parallel integration run fails 26/27 files, every failure the same `Hook timed out in
  120000ms` in `beforeAll` (Testcontainers Postgres start); docker itself is healthy (`docker ps` fine,
  the dev DB container untouched); ONE suite — whichever won the race — runs green; a re-run fails the
  same way with a different survivor. Also elevated same-day flakiness (socket resets, jest contention).
- **Diagnosis:** machine-wide CPU starvation, not code and not docker: a heavyweight neighbour process
  (here `vmware-vmx`, the owner's work CAD VM, holding ~3 cores at 100%) starves 26 concurrent
  container starts past the hook timeout. The failure pattern — uniform infra-stage timeouts with a
  single survivor — is the signature that distinguishes it from a real regression (which fails specific
  suites at the TEST stage, not all-but-one at the hook stage).
- **Fix:** check load FIRST — `Get-Process | Sort-Object CPU -Descending | Select-Object -First 5` (or
  Task Manager) and look for a non-dev hog (`vmware-vmx`, encoders, indexers). Suspend/stop it (the
  owner suspended the VM), then re-run; parallel mode is fine again. If the hog can't be stopped, run
  serial: `npm run test:integration -- --no-file-parallelism` (~22 min but immune to the start storm).
  Never diagnose 26/27 hook-timeouts as a code regression before ruling out machine load.
- **Verified:** 2026-07-26 · **Hits:** 1 *(walk-4 Batch-1 verify; serial run then witnessed 539/539)*

## Background test runs piped through `tail` swallow the failure details
- **Symptom:** a backgrounded full-suite run (`npm run test:integration 2>&1 | tail -25` +
  run_in_background) reports "2 failed" but the output file holds ONLY the summary lines — the
  failing test names/assertions are gone, forcing scoped re-runs to rediscover which files failed.
- **Diagnosis:** the pipe through `tail` truncates by construction; backgrounding captures the
  pipeline's stdout, i.e. tail's.
- **Fix:** background the BARE command (no pipe) — the harness writes the full output to the task
  file; read the tail of THAT with Read/`tail` afterwards. Reserve pipes for foreground runs where
  the full scrollback was already displayed.
- **Verified:** 2026-07-26 · **Hits:** 1 *(walk-4 Batch-3 verify — cost two scoped re-runs to re-find
  the 0047 backfill failure)*

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

## Economy dev-data rule (M5, 2026-07-12)
**Never hand-delete or hand-edit `currency_ledger` rows on the shared dev DB** — the ledger is
append-only and `sum(delta) == wallets.balance` is a standing invariant (ECON-07); a deleted row
silently breaks wallet↔ledger reconciliation for every later walk (found by parvati as a P6 🚩:
balance 77 vs ledger 76). To reset economy state: use the service ops (`adjustPixels` — writes an
honest `admin_adjustment` row) or a disposable `PORT=4001` DB. If you must hand-fix, re-derive the
balance from the ledger afterward.

## Multi-Metro manifest contamination (the phone-lane trap, 2026-07-14)
Symptom: the phone's login POSTs go to a stale IP **no matter how many times the 8081 Metro is
restarted with `-c`.** Cause: the :8081 phone Metro and the :8082 agents Metro share
`apps/mobile/.expo/` state — the manifest served on 8081 can point the phone's BUNDLE download at
:8082, whose cache carries the `.env` from ITS last restart. The `-c` cleans the wrong server.
Diagnosis: `curl -H "expo-platform: ios" http://localhost:8081/ | grep -oE 'http://[0-9.]+:[0-9]+'`
— more than one host, or any :8082, = contaminated. Fix: kill BOTH Metros → `rm -rf
apps/mobile/.expo` → start the phone lane with the advertised host pinned:
`REACT_NATIVE_PACKAGER_HOSTNAME=100.83.86.46 npx expo start -c --port 8081` (the tailnet address —
see the web-loop memory). Verify by grepping the served bundle for exactly one `:4000/api` host.
In Expo Go: NEVER tap recents/discovered entries after a server change — type the URL fresh.

## Post-logout renderer freeze = the reauth loop signature (F-17, 2026-07-15)
If the web renderer freezes so hard even `Runtime.evaluate` times out right after a logout, it's the
teardown→refetch→401→teardown loop class (fixed by the tokenless-401 guard in `baseQueryWithReauth`,
commit F-17): check for cycling 401s in the API log. Related recipe: RN-web Pressables ignore CDP
ref-clicks while the tab is hidden — dispatch a synthetic pointerdown/mousedown/pointerup/mouseup/click
sequence via javascript_tool instead; it makes the hidden-tab lane fully drivable.

## Migration drift — API 500s "column ... does not exist" → app can't load → screenshot hangs
- **Symptom:** every API query 500s (login/refresh/etc.) with `column "X" does not exist` (seen: `avatar_config`); the API `/health` may pass but the app can't load data; the web app hangs on a perpetual failing/loading state and the **screenshot renderer times out** (read_page/JS still work — DOM is there, but the capture never gets a stable frame). Would also break the owner's phone.
- **Diagnosis:** a feature wave GENERATED + committed migrations (schema.ts + `drizzle/*.sql`) that passed the integration suite (Testcontainers apply every migration to a fresh DB) but were **never applied to the standing dev DB `local_ingame`** — so the code SELECTs columns/tables the dev DB lacks.
- **Fix:** `DATABASE_URL=postgres://ingame:ingame@localhost:5432/local_ingame npm -w @ingame/api run db:migrate` (applies pending). Verify: `docker exec ingame-dev-db psql -U ingame -d local_ingame -tc "select 1 from information_schema.columns where column_name='<col>'"`.
- **PROMOTED to `doctor`** (2026-07-19): `dev-stack.mjs doctor` now compares on-disk `drizzle/*.sql` count vs `drizzle.__drizzle_migrations` applied count → FAIL "migration drift" with the exact db:migrate fix. Run `up` + `doctor` after any wave that adds migrations.
- **Verified:** 2026-07-19 · **Hits:** 1

## Screenshot capture wedged — use claude-in-chrome + settle-wait, NOT the Claude_Browser preview pane
- **Symptom:** `mcp__Claude_Browser__computer{screenshot}` on `:8082` times out after 30s every time, all session, on every page — while read_page / get_page_text / javascript_tool / network all work. Looks like a total browser wedge; it is NOT.
- **Diagnosis:** the Claude_Browser *preview pane's* screenshot renderer is broken in this environment (it also can't attach to the standing Metro on :8082 — CLAUDE.md). It's the CAPTURE path, not the app or the network (once the API is healthy the page loads fine). Separately, RN-web keeps a rAF render loop busy briefly during load/route transitions, so a capture fired immediately also fails ("page busy / script injection timed out").
- **Fix:** view/screenshot the running app via **claude-in-chrome** (real Chrome + extension) at `http://localhost:8082`, and **`wait` ~3–4s for the RN-web page to settle** before `screenshot`. Recipe: load the core tools (ToolSearch `select:mcp__claude-in-chrome__{tabs_context_mcp,navigate,computer,read_page,tabs_create_mcp}`) → tabs_context_mcp{createIfEmpty} → navigate `http://localhost:8082` → wait 3s → screenshot. This is the standing path for Parvati captures. Demo login `demo@ingame.app` / `InGameDemo1!`.
- **Verified:** 2026-07-19 · **Hits:** 1
