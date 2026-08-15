import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// P6/R7 (perf-investigation §R7 · fix-wave #5, server half) — the public `/media` mount serves the
// flattened published renders with FAR-FUTURE caching instead of express.static's default
// `public, max-age=0`, which made every remount of every thumb pay a conditional GET. The renders are
// immutable per URL by design (copy-on-write mints a new card id, so a new key, for any edit), so the
// only thing these tests must hold is: the far-future header is actually sent, revalidation still WORKS
// (the escape hatch for the in-place maintenance rewrites — reflatten/regenerate-thumbs), and the mount
// is still scoped to the PUBLIC prefixes only (the P9 ruling: `share/` composites stay route-only).

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const YEAR = 31_536_000;

let dir: string;
let app: Express;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ingame-media-'));
  await mkdir(join(dir, 'cards', 'card-1'), { recursive: true });
  await writeFile(join(dir, 'cards', 'card-1', 'thumb.png'), PNG);
  await mkdir(join(dir, 'share'), { recursive: true });
  await writeFile(join(dir, 'share', 'card-1.png'), PNG);
  process.env.MEDIA_DIR = dir; // mediaRoot() reads it when createApp mounts the static dirs
  const { createApp } = await import('./app');
  app = createApp();
  // The cold ./app import alone takes ~8s under a loaded parallel run — the default 10s hook
  // timeout flakes on machine contention (observed 2026-08-15, full-suite runs on the new box).
}, 30_000);

afterAll(async () => {
  delete process.env.MEDIA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe('P6/R7 — /media cache headers', () => {
  it('serves a flattened render with a far-future max-age', async () => {
    const res = await request(app).get('/media/cards/card-1/thumb.png');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(`public, max-age=${YEAR}`);
  });

  it('keeps the revalidation escape hatch — a validator is sent and NOT marked immutable', async () => {
    const res = await request(app).get('/media/cards/card-1/thumb.png');
    expect(res.headers['etag']).toBeDefined();
    expect(res.headers['last-modified']).toBeDefined();
    // `immutable` would tell every client to skip revalidation even on an explicit reload — the one way
    // an in-place reflatten could still be picked up without a url bust.
    expect(res.headers['cache-control']).not.toContain('immutable');
  });

  it('still answers a conditional request with 304 (the cheap revalidation path)', async () => {
    const first = await request(app).get('/media/cards/card-1/thumb.png');
    const res = await request(app)
      .get('/media/cards/card-1/thumb.png')
      .set('If-None-Match', first.headers['etag']!);
    expect(res.status).toBe(304);
  });

  it('does NOT statically serve a non-public prefix (the CARD-21 share composites stay route-only)', async () => {
    const res = await request(app).get('/media/share/card-1.png');
    expect(res.status).toBe(404);
  });
});
