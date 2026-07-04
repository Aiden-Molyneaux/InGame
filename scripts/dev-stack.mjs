#!/usr/bin/env node
// InGame standing dev stack supervisor (decision 0060).
//
//   node scripts/dev-stack.mjs up      — ensure DB + API(:4000) + Metro-web(:8082) are healthy,
//                                        pre-warm the web bundle, then exit. Idempotent: a no-op
//                                        (~1s) when everything is already up. Safe to run always.
//   node scripts/dev-stack.mjs status  — one-shot health JSON, no side effects.
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

import { spawn, execFile } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = path.join(ROOT, '.devstack');
const DB_CONTAINER = 'ingame-dev-db';
const API_HEALTH = 'http://localhost:4000/api/health';
const METRO_BASE = 'http://localhost:8082';

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

function startDetached(name, args) {
  ensureRunDir();
  const logPath = path.join(RUN_DIR, `${name}.log`);
  // shell:true so `npm` resolves on Windows and so the >> redirection below works reliably
  // (fd-passing to a detached cmd tree produced empty logs); taskkill /T kills the whole tree.
  const child = spawn('npm', [...args, '>>', `"${logPath}"`, '2>&1'], {
    cwd: ROOT,
    detached: true,
    shell: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  fs.writeFileSync(pidFile(name), String(child.pid));
  child.unref();
  say(`started ${name} (pid ${child.pid}) → logs: .devstack/${name}.log`);
  return logPath;
}

function killTree(pid) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => resolve());
    } else {
      try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} }
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
else if (verb === 'down') await down();
else {
  console.log('usage: node scripts/dev-stack.mjs <up|status|down>');
  process.exit(2);
}
