import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiUrl } from './mediaUrl';

// CARD-21 client share (P8 · F-8 E7b native image) — fetch a card's branded share-image
// (GET /cards/:id/share-image, a raw PNG) and hand it to the platform's share/save path.
//
// ROUND-2 BUG 6 — the share bytes are fetched with a PLAIN authenticated fetch, NEVER through RTK
// Query. The prior flow ran the image through `getShareImage` (an RTK endpoint typed `Blob`), which
// stored the fulfilled Blob in redux state — a non-serializable value the store's serializability
// check flagged and logged on every share ("A non-serializable value was detected in state, path
// api.queries.getShareImage(...).data, Value: Blob"). A binary that never needs caching does not
// belong in the tag graph; this helper owns the whole fetch→present path off-store:
//   web  (the dev/test surface): fetch the blob, open its object-URL in a new tab (view / save), then
//        revoke it lazily. No redux, no cache.
//   native: DOWNLOAD the PNG straight to the cache with the auth header (expo-file-system
//        downloadAsync — no Blob, no base64 round-trip) and hand the local file URI to the native
//        share sheet (expo-sharing) so the recipient gets the actual IMAGE. Both modules ship in Expo
//        Go SDK 54, so no dev-client rebuild is needed. If the file/sheet path fails, fall back to the
//        RN-core `Share.share` text (carrying the card name) so the gesture still completes.
// Moderation-refused / not-published / 404 → 'unavailable'; this never throws for that.

export type ShareResult = 'shared' | 'opened' | 'unavailable' | 'dismissed';

/** The authenticated request headers for the share-image fetch (the caller supplies the access token). */
function authHeaders(token: string | null): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch a card's branded share-image and present it. `token` is the caller's access token (read from
 * the auth slice — this helper stays off-store, so it can't reach it itself); `title` names the card
 * for the native share message (owner round-2: the share must carry the card's name).
 */
export async function shareCardImage(
  cardId: string,
  title: string,
  token: string | null,
): Promise<ShareResult> {
  const url = apiUrl(`/cards/${cardId}/share-image`);

  if (Platform.OS === 'web') {
    try {
      const res = await fetch(url, { headers: authHeaders(token) });
      if (!res.ok) return 'unavailable';
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      // Open the branded PNG in a new tab — the user views / saves / shares from there. Revoke lazily so
      // the tab has time to load the object URL. Nothing here touches redux.
      if (typeof window !== 'undefined' && window.open) {
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return 'opened';
      }
      URL.revokeObjectURL(objectUrl);
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  // native — download the branded PNG to the cache (auth header rides the request) and share the FILE
  // so the image itself travels; the dialog title carries the card name.
  try {
    const fileUri = `${FileSystem.cacheDirectory}ingame-card-${Date.now()}.png`;
    const dl = await FileSystem.downloadAsync(url, fileUri, { headers: authHeaders(token) });
    if (dl.status !== 200) return 'unavailable';
    if (await Sharing.isAvailableAsync()) {
      // shareAsync resolves when the sheet closes (no shared/dismissed discrimination on native).
      await Sharing.shareAsync(dl.uri, {
        mimeType: 'image/png',
        dialogTitle: `${title} — made in InGame`,
        UTI: 'public.png',
      });
      return 'shared';
    }
  } catch {
    // fall through to the RN-core text share so the gesture still completes.
  }

  // fallback — a text message carrying the card name (sharing unavailable, or the file path failed).
  try {
    const res = await Share.share({ message: `${title} — made in InGame` });
    return res.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
