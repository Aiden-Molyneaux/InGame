import { View, Text, Pressable } from 'react-native';
import type { CollectionItem } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { ScreenButton } from '../ScreenButton';
import { EntryCard } from '../EntryCard';
import { EquipReadout } from './EquipReadout';
import { themedStyles } from '../../theme';
import type { CardComposition } from '../../render/composition';

// CardDetailSheet (component-map §9 `CardDetail`, CARD-22/CARD-23) — the hero-tap ENLARGE: the card
// large + credit + the EquipReadout, in the one bottom-sheet drawer grammar (CARD-23 mode 3 INSPECT /
// decision 0048). A custom design renders LIVE (0066) and EDIT resumes it in the Styler; SHARE =
// CARD-21 (M5). A friend's variant (adopt) is M7.
export function CardDetailSheet({
  visible,
  entry,
  composition,
  onClose,
  onEdit,
  onShare,
  shareBusy = false,
}: {
  visible: boolean;
  entry: CollectionItem;
  composition: CardComposition | null;
  /** (imageUrl for an equipped ADOPTED card rides on `entry.card` — see the CardFace call below.) */
  onClose: () => void;
  /** Resume the equipped design in the Styler — undefined (the default face) disables EDIT. */
  onEdit?: () => void;
  /** Share the equipped card's branded image (CARD-21) — undefined disables SHARE. */
  onShare?: () => void;
  shareBusy?: boolean;
}) {
  const custom = composition !== null;
  const styles = useStyles();
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      {/* the sheet TITLE + a visible ✕ (owner gate-5 C.14; board `sh-h` `:691`) */}
      <View style={styles.head}>
        <Text style={styles.headTitle}>CARD DETAIL</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.cardWrap}>
        {/* larger than the hero it enlarges FROM (C.14) — /grid is 161, this inspects at 189×264.
            `animate`: the INSPECT view is exactly where a card shows off (0068 opt-in). EntryCard owns
            the own-composition vs adopted-flattened branch (imageUrl rides on entry.card; F-8/F-19). */}
        <EntryCard title={entry.title} card={{ composition, imageUrl: entry.card.imageUrl, thumbUrl: entry.card.thumbUrl }} size="pick" width={189} height={264} animate />
      </View>
      <Text style={styles.credit}>{custom ? 'YOUR DESIGN' : 'THE STANDARD FACE'}</Text>
      <EquipReadout card={entry.card} composition={composition} />
      <View style={styles.actions}>
        <ScreenButton
          label={shareBusy ? '…' : 'Share'}
          variant="secondary"
          disabled={!onShare || shareBusy}
          onPress={onShare}
          style={styles.actionBtn}
        />
        <ScreenButton
          label="Edit in Styler"
          variant="secondary"
          disabled={!onEdit}
          onPress={onEdit}
          style={styles.actionBtn}
        />
      </View>
      <Text style={styles.note}>
        {custom
          ? 'SHARE creates an image with your credit (once the card is published). EDIT resumes it in the Styler.'
          : 'Design your own card from the CARDS tab — the Styler is open.'}
      </Text>
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: t.space.sm },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 1.5 },
  close: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim },
  cardWrap: { alignItems: 'center', paddingVertical: t.space.sm },
  credit: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: t.space.md },
  actionBtn: { flex: 1 },
  note: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 15 },
}));
