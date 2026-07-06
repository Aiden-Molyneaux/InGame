import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CollectionItem } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { ScreenButton } from '../ScreenButton';
import { CardFace } from '../CardFace';
import { EquipReadout } from './EquipReadout';
import { theme } from '../../theme';
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
}: {
  visible: boolean;
  entry: CollectionItem;
  composition: CardComposition | null;
  onClose: () => void;
  /** Resume the equipped design in the Styler — undefined (the default face) disables EDIT. */
  onEdit?: () => void;
}) {
  const custom = composition !== null;
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      {/* custom sheet head with a visible ✕ (the board `sh-h` carries one, `:691`) */}
      <View style={styles.head}>
        <Text style={styles.headTitle}>YOUR {entry.title.toUpperCase()} CARD</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.cardWrap}>
        <CardFace title={entry.title} composition={composition} size="pick" />
      </View>
      <Text style={styles.credit}>
        {custom && entry.card.name ? `«${entry.card.name.toUpperCase()}» · YOUR DESIGN` : 'THE STANDARD FACE'}
      </Text>
      <EquipReadout card={entry.card} composition={composition} />
      <View style={styles.actions}>
        <ScreenButton label="Share" variant="secondary" disabled style={styles.actionBtn} />
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
          ? 'SHARE (an image with your credit) arrives in a later release.'
          : 'Design your own card from the CARDS tab — the Styler is open.'}
      </Text>
    </PulledSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: theme.space.sm },
  headTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, letterSpacing: 1.5 },
  close: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim },
  cardWrap: { alignItems: 'center', paddingVertical: theme.space.sm },
  credit: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro,
    color: theme.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: theme.space.md },
  actionBtn: { flex: 1 },
  note: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, lineHeight: 15 },
});
