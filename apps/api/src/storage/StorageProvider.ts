// The flattened-render storage seam (decision 0073 §0.5). Publish-time images (CARD-15 full + thumb,
// CARD-21 share later) are written through this interface and read back over the API's static `/media`
// mount. The local-disk implementation ships now (dev-stack friendly); a Cloudflare R2 + CDN impl is
// the swap-in before the M6 beta (provisioning-log #14) — same interface, no call-site change.

export interface StorageProvider {
  /** Store `buffer` under `key` (a slash-delimited path, no leading slash), returning the public URL. */
  put(key: string, buffer: Buffer, contentType: string): Promise<string>;
  /** The public URL a stored `key` is served at (API-relative `/media/<key>` for the local impl). */
  getUrl(key: string): string;
  /** Remove a stored object (idempotent — a missing key is a no-op). */
  delete(key: string): Promise<void>;
}
