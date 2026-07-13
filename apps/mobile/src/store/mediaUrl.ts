import { Platform } from 'react-native';

// Media-URL seam (P8 gallery). Published card renders (`imageUrl`/`thumbUrl`) and the share-image are
// served from the API's static `/media` mount, which sits OUTSIDE the `/api` prefix and returns
// API-RELATIVE urls (`/media/<key>`). The client must resolve them against the API ORIGIN.
//
// api.ts owns the base URL but keeps it private (not exported) and is off-limits to this packet, so the
// same target split is replicated here (a 3-line duplication, flagged in gallery-manifest.md): the dev
// browser talks to localhost (Chrome PNA), the phone to its LAN IP. Kept in lock-step with api.ts's
// API_BASE — if that base ever changes, this must too.
const API_ORIGIN = (
  Platform.OS === 'web'
    ? 'http://localhost:4000/api'
    : (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api')
).replace(/\/api\/?$/, '');

/**
 * Resolve a possibly-relative media path to an absolute URL the RN `<Image>` / share sheet can load.
 * Already-absolute (`http(s)://…`) urls pass through untouched; `null`/empty → null (the caller shows a
 * placeholder). Never mutates query strings — a bare `/media/<key>` path is prefixed with the origin.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** The absolute URL of an API endpoint path (`/cards/:id/share-image`) — origin + `/api` + path. */
export function apiUrl(path: string): string {
  return `${API_ORIGIN}/api${path.startsWith('/') ? '' : '/'}${path}`;
}
