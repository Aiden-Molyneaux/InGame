import type { StorageProvider } from './StorageProvider';
import { LocalDiskStorage } from './LocalDiskStorage';

// The storage singleton. One StorageProvider per process; the local-disk impl now, R2 swap-in later
// (decision 0073 §0.5) — call sites depend only on the interface. Overridable in tests via setStorage.

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) provider = new LocalDiskStorage();
  return provider;
}

/** Test/seam hook — inject an alternate provider (e.g. a temp-dir disk or an in-memory fake). */
export function setStorage(next: StorageProvider): void {
  provider = next;
}

export type { StorageProvider } from './StorageProvider';
export {
  LocalDiskStorage,
  mediaRoot,
  MEDIA_URL_PREFIX,
  PUBLIC_MEDIA_PREFIXES,
} from './LocalDiskStorage';
