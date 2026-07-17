// DELIBERATELY BAD (rule-theme-tokens). A component sheet that bakes the LIVE screen/shell token
// layers off the static `theme` const at module scope — so a theme/shell switch (DEV-02/04) can never
// repaint it. This path is NOT under src/theme/**, so the theme-engine guard fails it in CI. The fix is
// `themedStyles((t) => ({ … t.scr.bg … t.shell.plastic … }))` + `const styles = useStyles()`.
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.scr.bg }, // ❌ live screen token off the static const
  frame: { borderColor: theme.shell.plastic }, // ❌ live shell token off the static const
});

export default styles;
