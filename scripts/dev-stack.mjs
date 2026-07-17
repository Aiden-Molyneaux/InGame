#!/usr/bin/env node
// InGame standing dev stack supervisor (decision 0060).
//
//   node scripts/dev-stack.mjs up      — ensure DB + API(:4000) + Metro-web(:8082) are healthy,
//                                        pre-warm the web bundle, then exit. Idempotent: a no-op
//                                        (~1s) when everything is already up. Safe to run always.
//   node scripts/dev-stack.mjs status  — one-shot health JSON, no side effects.
//   node scripts/dev-stack.mjs doctor  — read-only diagnosis: probe every KNOWN failure
//                                        signature and print the exact fix. Never mutates state.
//   node scripts/dev-stack.mjs down    — kill ONLY the processes this script started (pidfiles);
//                                        never touches the docker DB or externally-launched procs.
//
// Services it manages:
//   db     docker container `ingame-dev-db` (Postgres :5432) — started via `docker start` if stopped
//   api    npm -w @ingame/api run dev:local  (env from apps/api/.env.dev — restart-safe JWT secret)
//   metro  npm -w @ingame/mobile run web -- --port 8082  (the agent/browser lane; the owner's
//          phone Metro on :8081 is NEVER touched by this script)
//
// Logs + pidfiles live in .devstack/ (gitignored). If `up` is interrupted mid-wait (caller
// timeout), the services keep running detached — just run `up` again to resume waiting.

import { spawn, execFile, execFileSync } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = path.join(ROOT, '.devstack');
const DB_CONTAINER = 'ingame-dev-db';
const API_HEALTH = 'http://localhost:4000/api/health';
const METRO_BASE = 'http://localhost:8082';
const ENV_LOCAL_TRAP = path.join(ROOT, 'apps', 'mobile', '.env.local');
const API_ENV_DEV = path.join(ROOT, 'apps', 'api', '.env.dev');

const say = (msg) => console.log(`[dev-stack] ${msg}`);

function ensureRunDir() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
}

async function httpGet(url, timeoutMs) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function tcpUp(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    const done = (v) => { sock.destroy(); resolve(v); };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, checkFn, timeoutMs, logFile) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkFn()) return true;
    await sleep(1500);
  }
  say(`TIMED OUT waiting for ${label} after ${Math.round(timeoutMs / 1000)}s`);
  if (logFile && fs.existsSync(logFile)) {
    const tail = fs.readFileSync(logFile, 'utf8').split('\n').slice(-15).join('\n');
    say(`--- tail of ${path.basename(logFile)} ---\n${tail}`);
  }
  return false;
}

// --- health checks -------------------------------------------------------------------------

const dbUp = () => tcpUp(5432);
const apiUp = async () => (await httpGet(API_HEALTH, 2500))?.ok === true;
// Generous timeout: a Metro mid-build can be slow to answer /status without being down.
const metroUp = async () =>
  ((await httpGet(`${METRO_BASE}/status`, 10000))?.text ?? '').includes('packager-status:running');

// --- process management --------------------------------------------------------------------

function pidFile(name) {
  return path.join(RUN_DIR, `${name}.pid`);
}

// Resolve how to invoke npm WITHOUT a shell. On Windows `npm` is `npm.cmd`, and Node 20+ refuses
// to spawn a .cmd/.bat without shell:true (CVE-2024-27980) — but shell:true + detached is exactly
// the combo that breaks stdio inheritance to the metro grandchild (see startDetached). So on
// Windows we run node directly against npm-cli.js, which ships next to node.exe. On POSIX `npm` is
// a real executable and spawns fine with no shell.
function resolveNpm() {
  if (process.platform !== 'win32') return { command: 'npm', prefix: [] };
  const beside = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(beside)) return { command: process.execPath, prefix: [beside] };
  // Fallback: locate npm.cmd on PATH and derive npm-cli.js beside it.
  try {
    const npmCmd = execFileSync('where', ['npm.cmd']).toString().split(/\r?\n/)[0].trim();
    const cli = npmCmd && path.join(path.dirname(npmCmd), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (cli && fs.existsSync(cli)) return { command: process.execPath, prefix: [cli] };
  } catch { /* fall through */ }
  throw new Error('could not locate npm-cli.js next to node — cannot start a detached child without a shell');
}

function startDetached(name, args) {
  ensureRunDir();
  const logPath = path.join(RUN_DIR, `${name}.log`);
  // Log via inherited file descriptors, NOT a shell `>>` redirection. On Windows a detached cmd.exe
  // tree does not propagate stdio (nor a `>>` redirect) down to the metro grandchild — that left
  // metro.log at 0 bytes and the child dying on startup with no trace. Spawning node→npm-cli.js
  // directly (no shell) and handing it an appended fd as stdout+stderr fixes both, and makes the
  // recorded pid the real npm root (not a throwaway cmd wrapper) so `down`'s taskkill /T still
  // tears down the whole tree.
  const out = fs.openSync(logPath, 'a');
  const { command, prefix } = resolveNpm();
  const child = spawn(command, [...prefix, ...args], {
    cwd: ROOT,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', out, out],
    // EXPO_OFFLINE baked in (runbook promotion — Hits≥2): expo-cli's dependency-version validation
    // fetch double-reads a response / throws in getVersionedNativeModulesAsync and kills `expo start`.
    // Offline mode skips that network step; LAN/web bundle serving is unaffected. Harmless for the API.
    env: { ...process.env, EXPO_OFFLINE: '1' },
  });
  fs.writeFileSync(pidFile(name), String(child.pid));
  child.unref();
  fs.closeSync(out); // the child holds its own duplicated handle
  say(`started ${name} (pid ${child.pid}) → logs: .devstack/${name}.log`);
  return logPath;
}

function killTree(pid) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => resolve());
    } else {
      try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* process already gone */ } }
      resolve();
    }
  });
}

// --- verbs ---------------------------------------------------------------------------------

async function status() {
  const [db, api, metro] = await Promise.all([dbUp(), apiUp(), metroUp()]);
  const result = {
    db: db ? 'up' : 'down',
    api: api ? 'up' : 'down',
    metro: metro ? 'up' : 'down',
    ready: db && api && metro,
    apiHealth: API_HEALTH,
    webPreview: `${METRO_BASE}/`,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

// --- doctor (QA lessons ladder, tier 2 — decision 0065) -------------------------------------
// Read-only diagnostics: probe every KNOWN failure signature and print the exact fix.
// NEVER mutates state — starts/stops/kills nothing, and never touches the phone Metro on :8081.
// New signatures graduate here from docs/qa-runbook.md when an entry reaches Hits >= 2.
// Caveat: the warmth probe's bundle GET may kick off a background compile on a cold Metro —
// beneficial (a later run reports warm), but not strictly zero-effect.

async function doctor() {
  const rows = [];
  const check = (sev, name, ok, detail, fix) => rows.push({ sev, name, ok, detail, fix });

  // db
  const db = await dbUp();
  check('FAIL', 'db :5432', db,
    db ? 'postgres answering' : 'no listener on :5432',
    `node scripts/dev-stack.mjs up  (starts docker ${DB_CONTAINER}; still failing -> is Docker Desktop running?)`);

  // api
  const api = await apiUp();
  check('FAIL', 'api :4000', api,
    api ? '/api/health ok' : '/api/health not answering',
    'node scripts/dev-stack.mjs up  (API is restart-safe; env incl. stable JWT secret in apps/api/.env.dev)');

  // api env file + CORS for the :8082 web origin (OQ-120)
  let corsOk = false, corsDetail, corsFix;
  if (!fs.existsSync(API_ENV_DEV)) {
    corsDetail = 'apps/api/.env.dev is MISSING';
    corsFix = 'copy apps/api/.env.example -> apps/api/.env.dev, fill values; if an API is already running it will NOT reload env — kill it first (taskkill /PID (Get-Content .devstack/api.pid) /T /F), then node scripts/dev-stack.mjs up';
  } else {
    corsOk = /^DEV_CORS_ORIGINS=.*http:\/\/localhost:8082/m.test(fs.readFileSync(API_ENV_DEV, 'utf8'));
    corsDetail = corsOk ? 'DEV_CORS_ORIGINS allows :8082' : 'DEV_CORS_ORIGINS missing http://localhost:8082 (web login will CORS-fail)';
    corsFix = 'add http://localhost:8082 to DEV_CORS_ORIGINS in apps/api/.env.dev, then restart JUST the API so it reloads env (up alone will NOT): taskkill /PID (Get-Content .devstack/api.pid) /T /F, then node scripts/dev-stack.mjs up';
  }
  check('FAIL', 'api CORS env', corsOk, corsDetail, corsFix);

  // the retired .env.local trap
  const trap = fs.existsSync(ENV_LOCAL_TRAP);
  check('FAIL', '.env.local trap', !trap,
    trap ? 'apps/mobile/.env.local EXISTS — a restarted Metro would point the PHONE at localhost' : 'absent (good)',
    'delete apps/mobile/.env.local and never recreate it (the web bundle needs no base-URL override)');

  // metro :8082 — port ownership + packager health
  const metroPort = await tcpUp(8082);
  const metro = metroPort && (await metroUp());
  check('FAIL', 'metro :8082', metro,
    !metroPort ? 'nothing on :8082' : metro ? 'packager running' : 'port owned but /status unhealthy (booting or wedged)',
    !metroPort
      ? 'node scripts/dev-stack.mjs up  (NOT preview_start — its "port 8082 in use" error means the standing Metro is UP)'
      : 'wait ~60s, re-run doctor; still red -> tail .devstack/metro.log. Do NOT kill :8082 — that re-pays the cold start');

  // web bundle warmth (only meaningful when metro is healthy)
  if (metro) {
    let warm = false, warmDetail;
    const page = await httpGet(`${METRO_BASE}/`, 8000);
    const m = page?.text.match(/src="([^"]*\.bundle[^"]*)"/);
    if (!page) warmDetail = 'index page did not answer in 8s (cold)';
    else if (!m) warmDetail = 'index page has no bundle tag (cold)';
    else {
      const res = await httpGet(`${METRO_BASE}${m[1]}`, 15000);
      warm = res?.ok === true;
      warmDetail = warm ? 'bundle answers fast (warm)'
        : res ? `bundle request errored (status ${res.status}) — likely a build error, not cold`
        : 'bundle did not answer in 15s (cold/building)';
    }
    check('WARN', 'web bundle', warm, warmDetail,
      'node scripts/dev-stack.mjs up (pre-warms); blank preview tab = loaded before "Bundled" appeared in .devstack/metro.log -> reload');
  } else {
    check('INFO', 'web bundle', true, 'skipped (metro not healthy)', null);
  }

  // phone lane — report only, NEVER acted on
  const phone = await tcpUp(8081);
  check('INFO', 'phone Metro :8081', true,
    phone ? "up (owner's lane — NEVER touch)" : 'down (fine — owner not running it)', null);

  // orphaned parallel API from destructive-DB testing
  const orphan = await tcpUp(4001);
  check('WARN', 'orphan :4001', !orphan,
    orphan ? 'something listening on :4001 (leftover parallel API — task-stop orphans the tsx child)' : 'clear',
    'netstat -ano | findstr :4001  -> taskkill /PID <pid> /F');

  let blocking = 0;
  for (const r of rows) {
    const mark = r.sev === 'INFO' ? 'INFO' : r.ok ? 'OK  ' : r.sev;
    say(`${mark}  ${r.name} — ${r.detail}`);
    if (!r.ok && r.fix) say(`      fix: ${r.fix}`);
    if (!r.ok && r.sev === 'FAIL') blocking++;
  }
  if (blocking) {
    say(`doctor: ${blocking} blocking issue(s) — apply the fixes above, re-run doctor. Novel failure? -> docs/qa-runbook.md`);
    process.exit(1);
  }
  const warns = rows.filter((r) => !r.ok && r.sev === 'WARN').length;
  say(warns ? `doctor: no blocking issues (${warns} warning(s) above) — QA away.` : 'doctor: green board — QA away.');
}

async function prewarmBundle() {
  // Fetch the web entry bundle once so the first real preview load hits a warm transform cache.
  // The index render itself can take a while on a cold Metro — wait generously.
  const page = await httpGet(`${METRO_BASE}/`, 120000);
  if (!page) {
    say('prewarm: Metro index page did not answer in 120s (still crawling the cache?) — rerun up to retry');
    return false;
  }
  const match = page.text.match(/src="([^"]*\.bundle[^"]*)"/);
  if (!match) {
    say('prewarm: no bundle URL found in Metro index page (skipping — first load will be slow)');
    return false;
  }
  const bundleUrl = `${METRO_BASE}${match[1]}`;
  say(`prewarm: fetching web bundle (first build after a cache reset can take minutes)...`);
  const start = Date.now();
  const res = await httpGet(bundleUrl, 570000);
  const secs = Math.round((Date.now() - start) / 1000);
  if (res?.ok) {
    say(`prewarm: bundle ready in ${secs}s — preview loads will be fast now`);
    return true;
  }
  say(`prewarm: bundle fetch did not complete (${secs}s) — Metro may still be building; rerun 'up' to retry`);
  return false;
}

// Ensure one healthy instance of a service, whoever owns it. Adopt a healthy one; if the port is
// owned but unhealthy, wait (something external — e.g. preview_start's Metro — may still be
// booting); spawn our own ONLY when the port stays empty through a grace window. The grace window
// closes the race where an external launcher returned but hasn't bound the port yet.
async function ensureService({ name, port, healthCheck, healthLabel, spawnArgs, waitMs }) {
  if (await healthCheck()) {
    say(`${name}: already up (:${port})`);
    return;
  }
  const graceEnd = Date.now() + 12000;
  let portOwned = await tcpUp(port);
  while (!portOwned && Date.now() < graceEnd) {
    await sleep(1500);
    if (await healthCheck()) {
      say(`${name}: already up (:${port})`);
      return;
    }
    portOwned = await tcpUp(port);
  }
  if (portOwned) {
    say(`${name}: :${port} is owned by another process — adopting it; waiting for ${healthLabel}...`);
    if (!(await waitFor(healthLabel, healthCheck, waitMs))) {
      say(`${name}: the process on :${port} never became healthy — investigate (netstat -ano | findstr :${port})`);
      process.exit(1);
    }
    say(`${name}: up (external)`);
    return;
  }
  const log = startDetached(name, spawnArgs);
  if (!(await waitFor(healthLabel, healthCheck, waitMs, log))) process.exit(1);
  say(`${name}: up`);
}

async function up() {
  ensureRunDir();

  // 1. Postgres (docker container)
  if (await dbUp()) {
    say('db: already up (:5432)');
  } else {
    say(`db: starting docker container ${DB_CONTAINER}...`);
    await new Promise((resolve, reject) =>
      execFile('docker', ['start', DB_CONTAINER], (err, _out, stderr) =>
        err ? reject(new Error(`docker start failed: ${stderr || err.message}. Is Docker Desktop running?`)) : resolve()
      )
    );
    if (!(await waitFor('postgres :5432', dbUp, 30000))) process.exit(1);
    say('db: up');
  }

  // 2. API :4000
  await ensureService({
    name: 'api',
    port: 4000,
    healthCheck: apiUp,
    healthLabel: 'api /api/health',
    spawnArgs: ['-w', '@ingame/api', 'run', 'dev:local'],
    waitMs: 90000,
  });

  // 3. Metro web :8082
  await ensureService({
    name: 'metro',
    port: 8082,
    healthCheck: metroUp,
    healthLabel: 'metro :8082/status',
    spawnArgs: ['-w', '@ingame/mobile', 'run', 'web', '--', '--port', '8082'],
    waitMs: 240000,
  });

  // 4. Pre-warm the web bundle (idempotent: near-instant when already warm)
  await prewarmBundle();

  say('stack ready.');
  await status();
}

async function down() {
  let killed = 0;
  for (const name of ['api', 'metro']) {
    const pf = pidFile(name);
    if (!fs.existsSync(pf)) continue;
    const pid = Number(fs.readFileSync(pf, 'utf8').trim());
    if (Number.isFinite(pid)) {
      say(`stopping ${name} (pid ${pid}, incl. children)`);
      await killTree(pid);
      killed++;
    }
    fs.rmSync(pf, { force: true });
  }
  if (!killed) say('nothing to stop (no pidfiles — externally-started services are left alone)');
  say(`db container ${DB_CONTAINER} left running (stop manually with docker if needed)`);
}

const verb = process.argv[2];
if (verb === 'up') await up();
else if (verb === 'status') await status();
else if (verb === 'doctor') await doctor();
else if (verb === 'down') await down();
else {
  console.log('usage: node scripts/dev-stack.mjs <up|status|doctor|down>');
  process.exit(2);
}
