// SYS-03 — env-only config; never hardcoded. Secrets live in the host secret store, never in the
// repo or the client bundle. See .env.example for the documented variables + the F04 key taxonomy.

export interface ApiEnv {
  databaseUrl: string;
  /** F03 fail-closed sentinel — only ever true on a disposable DB. */
  disposableDb: boolean;
  port: number;
  nodeEnv: string;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const flag = (source.DISPOSABLE_DB ?? '').toLowerCase();
  return {
    databaseUrl: source.DATABASE_URL ?? '',
    disposableDb: flag === '1' || flag === 'true',
    port: Number(source.PORT ?? 4000),
    nodeEnv: source.NODE_ENV ?? 'development',
  };
}
