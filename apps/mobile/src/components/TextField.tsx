import { useState, type ReactNode } from 'react';
import { View, Text, TextInput, Pressable, type KeyboardTypeOptions } from 'react-native';
import { themedStyles, useTheme } from '../theme';

// TextField (component-map §6) — a labelled input. Text inputs are a NAMED F-09 exception (cream
// inset is allowed). System keyboard (OQ-035). `error` shows the validation state.
// R1-3 additions: `labelRight` docks an accessory on the label row (the board `.flabel-row`, e.g. the
// FORGOT? link, S2-h); `secureTextEntry` fields grow an internal SHOW/HIDE reveal (board `.reveal`,
// S2-j). All additive — existing call-sites are unaffected.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
  labelRight,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
  /** Optional accessory docked at the right of the label row (board `.flabel-row` — e.g. FORGOT?). */
  labelRight?: ReactNode;
}) {
  // S2-j — reveal toggles masking of the typed value (not the field). Only meaningful when secure.
  const [revealed, setRevealed] = useState(false);
  const masked = !!secureTextEntry && !revealed;
  const t = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.field}>
      {labelRight ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {labelRight}
        </View>
      ) : (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      )}
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.scr.faint}
          secureTextEntry={masked}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          accessibilityLabel={label}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
          >
            <Text style={styles.reveal}>{revealed ? 'HIDE' : 'SHOW'}</Text>
          </Pressable>
        ) : null}
      </View>
      {/* R2 (4b) — the error line's space is ALWAYS reserved, so showing/clearing an error never
          reflows the form (layout stability over compactness). Shared here → every TextField form. */}
      <View style={styles.errorSlot}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  field: { gap: t.space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
  // the cream inset now lives on the ROW wrapper so the reveal can dock inside it; the TextInput is
  // transparent + flex-1 within (F-09 named exception · F-07 square).
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    backgroundColor: t.brand.cream,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderRadius: t.corner.screen, // F-07 square
  },
  inputWrapError: { borderWidth: 1, borderColor: t.brand.alert },
  inputText: {
    flex: 1,
    color: t.brand.navy,
    fontFamily: t.font.screen,
    fontSize: t.type.title, // 15
    padding: 0, // padding lives on the wrapper — avoid the platform TextInput default doubling it
  },
  reveal: {
    fontFamily: t.font.screenBold, // board `.reveal` 700
    fontSize: t.type.micro, // 9
    color: t.brand.navy,
    opacity: 0.55,
    letterSpacing: 1,
  },
  // R2 (4b) — reserve one line of the 9px error so the field's height is stable with/without an error.
  errorSlot: { minHeight: 13, justifyContent: 'flex-start' },
  error: {
    fontFamily: t.font.screenSemi, // S2-e — board `.ferr` 600 (was regular; reads more legibly at 9px)
    fontSize: t.type.micro,
    color: t.brand.alert,
  },
}));
