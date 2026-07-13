import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorageProvider } from './StorageProvider';

// The local-disk StorageProvider (decision 0073 §0.5) — writes flattened renders under a gitignored
// media root, served by the API's static `/media` mount (no auth: a flattened published render is the
// public artifact by design). The media root defaults to `apps/api/.media` (resolved from this file so
// it is stable across the cwd the process is launched from) and is overridable with `MEDIA_DIR`.

/** The absolute media root — the static `/media` mount and this writer must agree on it. */
export function mediaRoot(): string {
  if (process.env.MEDIA_DIR) return resolve(process.env.MEDIA_DIR);
  // this file: apps/api/src/storage/LocalDiskStorage.ts → ../../.media = apps/api/.media
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../.media');
}

/** The URL prefix the API serves the media root at. */
export const MEDIA_URL_PREFIX = '/media';

/** Reject keys that could escape the media root (absolute, `..`, or backslash segments). */
function safeKey(key: string): string {
  const normal = key.replace(/^\/+/, '');
  if (normal.includes('..') || normal.startsWith('/') || normal.includes('\\')) {
    throw new Error(`StorageProvider: unsafe key "${key}"`);
  }
  return normal;
}

export class LocalDiskStorage implements StorageProvider {
  private readonly root: string;

  constructor(root: string = mediaRoot()) {
    this.root = root;
  }

  private pathFor(key: string): string {
    return join(this.root, safeKey(key).split('/').join(sep));
  }

  async put(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    void _contentType; // the local mount infers Content-Type from the extension (R2 will honour it)
    const filePath = this.pathFor(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return this.getUrl(key);
  }

  getUrl(key: string): string {
    return `${MEDIA_URL_PREFIX}/${safeKey(key)}`;
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }
}
