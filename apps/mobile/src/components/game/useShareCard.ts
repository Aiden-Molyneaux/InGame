import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { shareCardImage } from '../../store/shareCard';

// CARD-21 — the ONE share-a-card handler (walk-4 Murr consolidation). The token + busy flag +
// unavailable/error toast copy lived copy-pasted in three hosts (game page · friend game page ·
// community full list), and P4-d's dressed SHARE row made a fourth caller (the add-game fork's
// sheet) inevitable — so the handler collapses here. Share bytes stay OFF-store (round-2 bug 6):
// the access token rides to `shareCardImage` directly; no RTK query cache ever holds the Blob.
// `notify` is the host's error-toast setter; the messages are the P8 copy exactly.
export function useShareCard(notify: (message: string) => void): {
  shareBusy: boolean;
  shareCard: (cardId: string, title: string) => Promise<void>;
} {
  const token = useAppSelector((s) => s.auth.accessToken);
  const [shareBusy, setShareBusy] = useState(false);

  async function shareCard(cardId: string, title: string) {
    setShareBusy(true);
    try {
      const res = await shareCardImage(cardId, title, token);
      if (res === 'unavailable') notify('Sharing isn’t available for this card yet.');
    } catch {
      notify('This card can’t be shared yet.');
    } finally {
      setShareBusy(false);
    }
  }

  return { shareBusy, shareCard };
}
