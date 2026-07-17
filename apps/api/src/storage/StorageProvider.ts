// The flattened-render storage seam (decision 0073 §0.5). Publish-time images (CARD-15 full + thumb,
// CARD-21 share later) are written through this interface and read back over the API's static `/media`
// mount. The local-disk implementation ships now (dev-stack friendly); a Cloudflare R2 + CDN impl is
// the swap-in before the M6 beta (provisioning-log #14) — same interface, no call-site change.

export interface StorageProvider {
  /** Store `buffer` under `key` (a slash-delimited path, no leading slash), returning the public URL. */
  put(key: string, buffer: Buffer, contentType: string): Promise<string>;
  /**
   * Read a stored object's bytes back, or `null` when absent. The publish-time full/thumb renders
   * never needed this (they're served by the static `/media` mount); CARD-21's share-image endpoint
   * does — it must run per-request authz before returning bytes, so it proxies the cached PNG through
   * the API route instead of pointing at a standing public URL (decision 0073 §0.5 seam, P9 extension).
   */
  get(key: string): Promise<Buffer | null>;
  /** The public URL a stored `key` is served at (API-relative `/media/<key>` for the local impl). */
  getUrl(key: string): string;
  /** Remove a stored object (idempotent — a missing key is a no-op). */
  delete(key: string): Promise<void>;
}
