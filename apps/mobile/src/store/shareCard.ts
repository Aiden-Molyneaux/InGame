import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// CARD-21 client share (P8 · F-8 E7b native image) — hand a card's branded share-image
// (GET /cards/:id/share-image, a raw PNG) to the platform's share/save path.
//   web  (the dev/test surface): the caller fetches the branded blob through the RTK base query (token +
//        OQ-123 reauth ride along), then this opens it in a new tab (view / save).
//   native: write the ALREADY-FETCHED blob to the cache (expo-file-system, so no re-download and the
//        auth header the caller carried is never re-needed) and hand the local file URI to the native
//        share sheet (expo-sharing) — the recipient gets the actual IMAGE, not a text line (owner
//        device-walk 🚩). Both modules ship in Expo Go SDK 54, so no dev-client rebuild is needed. If
//        the file/sheet path fails, we fall back to the RN-core `Share.share` text so the gesture still
//        completes.
// Moderation-refused / 404 → the caller shows a quiet "unavailable"; this never throws for that.

export type ShareResult = 'shared' | 'opened' | 'unavailable' | 'dismissed';

/** Read a Blob's bytes as base64 (no data-URI prefix) — the encoding expo-file-system writes. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Present a fetched share-image blob to the user. `blob` is the branded PNG (already authenticated by the
 * caller); `title` names the card for the native share message.
 */
export async function presentShareImage(blob: Blob, title: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      const url = URL.createObjectURL(blob);
      // Open the branded PNG in a new tab — the user views / saves / shares from there. Revoke lazily so
      // the tab has time to load the object URL.
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return 'opened';
      }
      URL.revokeObjectURL(url);
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  // native — write the branded PNG bytes to the cache and share the FILE so the image itself travels.
  try {
    const base64 = await blobToBase64(blob);
    const fileUri = `${FileSystem.cacheDirectory}ingame-card-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) {
      // shareAsync resolves when the sheet closes (no shared/dismissed discrimination on native).
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `${title} — made in InGame`,
        UTI: 'public.png',
      });
      return 'shared';
    }
  } catch {
    // fall through to the RN-core text share so the gesture still completes.
  }

  // fallback — a text message (sharing unavailable, or the file path failed).
  try {
    const res = await Share.share({ message: `${title} — made in InGame` });
    return res.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
