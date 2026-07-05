import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CollectionItem } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { ScreenButton } from '../ScreenButton';
import { GameCard } from '../GameCard';
import { EquipReadout } from './EquipReadout';
import { theme } from '../../theme';

// CardDetailSheet (component-map §9 `CardDetail`, CARD-22/CARD-23) — the hero-tap ENLARGE: the card
// large + designer credit + the EquipReadout, in the one bottom-sheet drawer grammar (CARD-23 mode 3
// INSPECT / decision 0048). For YOUR card the actions are share/edit (a friend's M7 → adopt, EXPECTED).
// Board sheet `:688–706` (drawn for a community card; the owned variant reuses the structure). At M4
// the card is the CARD-18 default (no designer, composed face EXPECTED). SHARE = CARD-21 (M5).
export function CardDetailSheet({
  visible,
  entry,
  onClose,
}: {
  visible: boolean;
  entry: CollectionItem;
  onClose: () => void;
}) {
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      {/* custom sheet head with a visible ✕ (the board `sh-h` carries one, `:691`) — dismissal isn't
          scrim-only. */}
      <View style={styles.head}>
        <Text style={styles.headTitle}>YOUR {entry.title.toUpperCase()} CARD</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.cardWrap}>
        <GameCard title={entry.title} size="pick" />
      </View>
      <Text style={styles.credit}>STANDARD CARD · THE DEFAULT FACE (CARD-18)</Text>
      <EquipReadout card={entry.card} />
      <View style={styles.actions}>
        <ScreenButton label="Share" variant="secondary" disabled style={styles.actionBtn} />
        <ScreenButton label="Edit in Styler" variant="secondary" disabled style={styles.actionBtn} />
      </View>
      <Text style={styles.note}>
        SHARE (a "made in InGame" image, CARD-21) and EDIT (the Styler) arrive with the card editor
        (§3.2 / M5). Your custom card FACE renders here once the composition pipeline lands.
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
