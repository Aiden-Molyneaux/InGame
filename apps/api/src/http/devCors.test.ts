import { describe, it, expect, vi } from 'vitest';
import { devCors } from './devCors';

// OQ-120 — the dev-only CORS allowlist: OFF by default (no headers — the production posture),
// exact-match localhost origins only, preflight short-circuits 204.

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  ended: boolean;
  setHeader: (k: string, v: string) => void;
  status: (c: number) => MockRes;
  end: () => void;
}

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    headers: {},
    ended: false,
    setHeader(k, v) {
      res.headers[k.toLowerCase()] = v;
    },
    status(c) {
      res.statusCode = c;
      return res;
    },
    end() {
      res.ended = true;
    },
  };
  return res;
}

function run(origins: string[], method: string, origin?: string) {
  const mw = devCors(origins);
  const res = mockRes();
  const next = vi.fn();
  mw({ method, headers: origin ? { origin } : {} } as never, res as never, next);
  return { res, next };
}

describe('OQ-120: dev-only CORS allowlist', () => {
  it('is a no-op when the allowlist is empty (the default / production posture)', () => {
    const { res, next } = run([], 'GET', 'http://localhost:8081');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('reflects an allowlisted localhost origin + Vary: Origin', () => {
    const { res, next } = run(['http://localhost:8081'], 'GET', 'http://localhost:8081');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(res.headers['vary']).toBe('Origin');
    expect(next).toHaveBeenCalled();
  });

  it('short-circuits an allowlisted preflight with 204 (no next)', () => {
    const { res, next } = run(['http://localhost:8081'], 'OPTIONS', 'http://localhost:8081');
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
    expect(next).not.toHaveBeenCalled();
  });

  it('sends nothing for a non-allowlisted origin', () => {
    const { res, next } = run(['http://localhost:8081'], 'GET', 'http://localhost:9999');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('ignores a NON-local origin even when the env var lists it (never a prod CORS surface)', () => {
    const { res } = run(['https://evil.example.com'], 'GET', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends nothing when the request has no Origin header', () => {
    const { res, next } = run(['http://localhost:8081'], 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
