import { View, type ViewStyle, type ViewProps } from 'react-native';
import { useTheme } from '../theme';

// Well (component-map §5.4) — a hairline flat panel, one step LIGHTER than its background (F-09 — a
// flat plane, never a sunken/inset recess). Square corners on screen (F-07).
export function Well({ style, children, ...rest }: ViewProps & { style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.scr.panel,
          borderWidth: 1,
          borderColor: t.scr.hairline,
          borderRadius: t.corner.screen,
          padding: t.space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
