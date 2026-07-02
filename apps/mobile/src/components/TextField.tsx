import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { theme } from '../theme';

// TextField (component-map §6) — a labelled input. Text inputs are a NAMED F-09 exception (cream
// inset is allowed). System keyboard (OQ-035). `error` shows the validation state.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.scr.faint}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.space.xs },
  label: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.brand.cream,
    color: theme.brand.navy,
    fontFamily: theme.font.screen,
    fontSize: theme.type.title, // 15
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.corner.screen, // F-07 square
  },
  inputError: { borderWidth: 1, borderColor: theme.brand.alert },
  error: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro,
    color: theme.brand.alert,
  },
});
