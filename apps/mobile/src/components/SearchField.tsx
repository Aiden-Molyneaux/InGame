import { TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

// SearchField (component-map §5.5) — the in-place filter / flow search input. Cream inset (a NAMED
// F-09 exception, like TextField); system keyboard (OQ-035).
export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** The keyboard's SEARCH/return key (board OQ-034: dismisses and KEEPS the filter). */
  onSubmit?: () => void;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.scr.faint}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={autoFocus}
      returnKeyType={onSubmit ? 'search' : undefined}
      onSubmitEditing={onSubmit}
      accessibilityLabel={placeholder ?? 'Search'}
      accessibilityRole="search"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.brand.cream,
    color: theme.brand.navy,
    fontFamily: theme.font.screen,
    fontSize: theme.type.title, // 15
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.corner.screen, // F-07 square
  },
});
