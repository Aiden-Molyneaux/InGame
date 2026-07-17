import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { RECOMMENDATION_NOTE_MAX_LEN } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { EntryCard } from '../EntryCard';
import { ScreenButton } from '../ScreenButton';
import { TextField } from '../TextField';
import { themedStyles, useTheme } from '../../theme';
import { useGetCollectionQuery } from '../../store/api';
import { useCreateRecommendationMutation } from '../../store/recommendationApi';

// RecommendSheet (P8 · SOC-05 · friends-states P6 · OQ-075 ASSUMPTION — the minimal compose the plan
// sanctions) — pick a game from YOUR collection + an optional note → POST /recommendations. It lands in
// the friend's recommendations feed (NOT auto-queued). Friend-only: NOT_FRIENDS / SELF_TARGET / the block
// collapse surface as the error Toast. Every card face is an EntryCard (F-20). The richer compose stays
// OQ-075; this is deliberately the CardPicker-grammar minimum.
type ReqError = { status?: number | string; data?: { error?: { code?: string } } };

export function RecommendSheet({
  visible,
  toUserId,
  toUsername,
  onClose,
  onSent,
  onError,
}: {
  visible: boolean;
  toUserId: string | null;
  toUsername: string | null;
  onClose: () => void;
  onSent: (username: string) => void;
  onError?: (message: string) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const { data: collection, isLoading } = useGetCollectionQuery(undefined, { skip: !visible });
  const [createRec, { isLoading: sending }] = useCreateRecommendationMutation();
  const [gameId, setGameId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Reset the compose when a new friend is targeted or the sheet reopens.
  useEffect(() => {
    setGameId(null);
    setNote('');
  }, [toUserId, visible]);

  const items = collection?.items ?? [];

  async function onSend() {
    if (!toUserId || !gameId) return;
    try {
      await createRec({ toUserId, gameId, note: note.trim() || undefined }).unwrap();
      onSent(toUsername ?? 'your friend');
      onClose();
    } catch (e) {
      const code = (e as ReqError)?.data?.error?.code;
      if (code === 'NOT_FRIENDS') onError?.('You can only recommend to friends.');
      else if (code === 'SELF_TARGET') onError?.("You can't recommend to yourself.");
      else onError?.("Couldn't send that recommendation. Try again.");
    }
  }

  return (
    <PulledSheet visible={visible} onClose={onClose} title={toUsername ? `Recommend to ${toUsername}` : 'Recommend a game'}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.scr.accent} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Add games to your collection first — then you can recommend them.</Text>
      ) : (
        <>
          <Text style={styles.pickLabel}>PICK A GAME FROM YOUR COLLECTION</Text>
          <View style={styles.grid}>
            {items.map((it) => {
              const selected = gameId === it.gameId;
              return (
                <Pressable
                  key={it.gameId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={it.title}
                  onPress={() => setGameId(it.gameId)}
                  style={[styles.pick, selected && styles.pickSel]}
                >
                  <EntryCard card={it.card} title={it.title} size="cell" />
                  <Text style={styles.pickTitle} numberOfLines={1}>
                    {it.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteWrap}>
            <TextField
              label={`Add a note (optional · ${RECOMMENDATION_NOTE_MAX_LEN} max)`}
              value={note}
              onChangeText={(v) => setNote(v.slice(0, RECOMMENDATION_NOTE_MAX_LEN))}
              placeholder="Why they'd love it…"
              autoCapitalize="sentences"
            />
          </View>

          <ScreenButton
            label={sending ? 'Sending…' : 'Send recommendation'}
            variant="primary"
            onPress={() => void onSend()}
            disabled={!gameId || sending}
            block
          />
        </>
      )}
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  center: { paddingVertical: t.space.xxl, alignItems: 'center' },
  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16, paddingVertical: t.space.lg },
  pickLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5, marginBottom: t.space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  pick: { alignItems: 'center', gap: t.space.xs, padding: t.space.xs, borderWidth: 1.5, borderColor: 'transparent' },
  pickSel: { borderColor: t.scr.accent },
  pickTitle: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, maxWidth: 64, textAlign: 'center' },
  noteWrap: { marginVertical: t.space.lg },
}));
