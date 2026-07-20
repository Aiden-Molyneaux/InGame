/**
 * DEV / LOAD-HARNESS (M6, UNCOMMITTED) — the CARD-VOLUME measurement script ("vol-measure").
 *
 * Profiles the API surfaces that embed a user's whole collection, per volume tier (50/200/1000/2000),
 * against the PARALLEL disposable API. Pure HTTP (plain node/tsx + global fetch — no autocannon/k6,
 * rule 8). Re-aimable at staging: it takes the API base URL from VOL_API_BASE / --base, so the only
 * change for a staging re-run is that flag (+ real network + R2-vs-API-served images).
 *
 * Reports, per tier:
 *   - GET /me/collection : latency cold + warm x3, response bytes, entry count, pagination shape.
 *   - GET /me            : latency cold + warm (the ~12-sequential-query self-shape — does volume amplify it?).
 *   - card-image path    : HEAD/GET a sample thumb, cache headers, and how many image URLs one shelf implies.
 *
 * Run (from apps/api):
 *   tsx scripts/vol-measure.ts [--base http://localhost:4001/api] [--manifest vol-users.json]
 */
import { readFileSync } from 'node:fs';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const BASE = (arg('base') ?? process.env.VOL_API_BASE ?? 'http://localhost:4001/api').replace(/\/+$/, '');
const ORIGIN = BASE.replace(/\/api$/, '');
const MANIFEST_PATH = arg('manifest') ?? 'vol-users.json';

interface ManifestUser { tier: number; email: string; username: string; userId: string; seeded: number; }
interface Manifest { password: string; users: ManifestUser[]; }

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const t = performance.now();
  const value = await fn();
  return { ms: performance.now() - t, value };
}
const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const f1 = (n: number): string => n.toFixed(1);

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} -> ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { accessToken?: string };
  if (!body.accessToken) throw new Error(`login ${email}: no accessToken in response`);
  return body.accessToken;
}

interface CollectionResult {
  count: number; bytes: number; nextCursor: unknown; total: number; collectionTotal: number;
  cold: number; warm: number[]; sampleThumb: string | null; sampleImage: string | null; customCount: number;
}

async function measureCollection(token: string): Promise<CollectionResult> {
  const h = { authorization: `Bearer ${token}` };
  const url = `${BASE}/me/collection`;
  const cold = await timed(() => fetch(url, { headers: h }).then((r) => r.text()));
  const body = JSON.parse(cold.value) as {
    items: Array<{ gameId: string; card?: { isCustom?: boolean; imageUrl?: string | null; thumbUrl?: string | null } }>;
    nextCursor: unknown; total: number; collectionTotal: number;
  };
  const warm: number[] = [];
  for (let i = 0; i < 3; i++) warm.push((await timed(() => fetch(url, { headers: h }).then((r) => r.text()))).ms);
  const custom = body.items.filter((it) => it.card?.isCustom);
  const withThumb = custom.find((it) => it.card?.thumbUrl);
  const withImage = custom.find((it) => it.card?.imageUrl);
  return {
    count: body.items.length,
    bytes: Buffer.byteLength(cold.value, 'utf8'),
    nextCursor: body.nextCursor,
    total: body.total,
    collectionTotal: body.collectionTotal,
    cold: cold.ms,
    warm,
    sampleThumb: withThumb?.card?.thumbUrl ?? null,
    sampleImage: withImage?.card?.imageUrl ?? null,
    customCount: custom.length,
  };
}

async function measureMe(token: string): Promise<{ cold: number; warm: number[]; bytes: number }> {
  const h = { authorization: `Bearer ${token}` };
  const url = `${BASE}/me`;
  const cold = await timed(() => fetch(url, { headers: h }).then((r) => r.text()));
  const warm: number[] = [];
  for (let i = 0; i < 3; i++) warm.push((await timed(() => fetch(url, { headers: h }).then((r) => r.text()))).ms);
  return { cold: cold.ms, warm, bytes: Buffer.byteLength(cold.value, 'utf8') };
}

async function measureImage(thumbPath: string): Promise<Record<string, string | number>> {
  const url = thumbPath.startsWith('http') ? thumbPath : `${ORIGIN}${thumbPath}`;
  const head = await timed(() => fetch(url, { method: 'HEAD' }));
  const get = await timed(() => fetch(url).then(async (r) => ({ status: r.status, buf: await r.arrayBuffer(), headers: r.headers })));
  const hdr = (get.value.headers as Headers);
  return {
    url,
    headStatus: (head.value as Response).status,
    getStatus: get.value.status,
    getMs: Number(f1(get.ms)),
    bytes: get.value.buf.byteLength,
    cacheControl: hdr.get('cache-control') ?? '(none)',
    etag: hdr.get('etag') ?? '(none)',
    lastModified: hdr.get('last-modified') ?? '(none)',
    contentType: hdr.get('content-type') ?? '(none)',
  };
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  console.log(`vol-measure: base=${BASE} · ${manifest.users.length} tiers\n`);

  const rows: Array<Record<string, unknown>> = [];
  let sampleThumbForImageTest: string | null = null;

  for (const u of manifest.users.sort((a, b) => a.tier - b.tier)) {
    const token = await login(u.email, manifest.password);
    const col = await measureCollection(token);
    const me = await measureMe(token);
    if (!sampleThumbForImageTest && col.sampleThumb) sampleThumbForImageTest = col.sampleThumb;

    rows.push({
      tier: u.tier,
      entries: col.count,
      custom: col.customCount,
      'coll_cold_ms': Number(f1(col.cold)),
      'coll_warm_med_ms': Number(f1(med(col.warm))),
      'coll_KB': Number((col.bytes / 1024).toFixed(1)),
      'bytes_per_entry': col.count ? Math.round(col.bytes / col.count) : 0,
      nextCursor: col.nextCursor === null ? 'null' : String(col.nextCursor),
      me_cold_ms: Number(f1(me.cold)),
      me_warm_med_ms: Number(f1(med(me.warm))),
      me_KB: Number((me.bytes / 1024).toFixed(1)),
    });
    console.log(
      `tier ${String(u.tier).padStart(4)} · entries=${col.count} custom=${col.customCount} · ` +
        `/me/collection cold=${f1(col.cold)}ms warm(med)=${f1(med(col.warm))}ms ${(col.bytes / 1024).toFixed(1)}KB ` +
        `(${col.count ? Math.round(col.bytes / col.count) : 0} B/entry, nextCursor=${col.nextCursor === null ? 'null' : col.nextCursor}) · ` +
        `/me cold=${f1(me.cold)}ms warm(med)=${f1(med(me.warm))}ms`,
    );
  }

  console.log('\n--- SCALING TABLE ---');
  console.table(rows);

  if (sampleThumbForImageTest) {
    console.log('\n--- CARD-IMAGE PATH (sample thumb) ---');
    const img = await measureImage(sampleThumbForImageTest);
    console.table(img);
    console.log(
      'Note: a self-shelf render of the OWNER\'s own cards renders live via Skia (composition rides ' +
        '/me/collection) — so it implies ~0 image GETs. A FRIEND/GALLERY view of the same N cards implies ' +
        'N thumb GETs (one per custom card), each an unauthenticated GET /media/cards/<id>/thumb.png.',
    );
  } else {
    console.log('\n(no custom-card thumb found in any tier — image path not sampled)');
  }
}

main().catch((e) => {
  console.error('vol-measure FAILED:', e);
  process.exitCode = 1;
});
