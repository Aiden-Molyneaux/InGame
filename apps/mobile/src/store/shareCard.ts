import { Platform, Share } from 'react-native';

// CARD-21 client share (P8) — hand a card's branded share-image (GET /cards/:id/share-image, a raw PNG)
// to the platform's share/save path. NO new dependency: expo-sharing / expo-file-system are not
// installed, and adding one is a justified-dependency decision this packet doesn't take unilaterally
// (gallery-manifest ASSUMPTION). So:
//   web  (the dev/test surface): the caller fetches the branded blob through the RTK base query (token +
//        OQ-123 reauth ride along), then this opens it in a new tab (view / save).
//   native: RN core `Share.share` best-effort. The robust native branded-image share (write a temp file,
//        `expo-sharing`) is EXPECTED(P9 / native-polish).
// Moderation-refused / 404 → the caller shows a quiet "unavailable"; this never throws for that.

export type ShareResult = 'shared' | 'opened' | 'unavailable' | 'dismissed';

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

  // native — best-effort. Without a temp-file writer we can't hand the branded PNG bytes to the native
  // sheet directly; share a text message so the gesture still completes. The image-carrying native path
  // awaits expo-sharing (EXPECTED · P9). base64 data URIs are unreliable across RN versions, so we don't
  // pretend to attach the image here.
  try {
    const res = await Share.share({ message: `${title} — made in InGame` });
    return res.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
