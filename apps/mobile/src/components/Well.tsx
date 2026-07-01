import { View, type ViewStyle, type ViewProps } from 'react-native';
import { theme } from '../theme';

// Well (component-map §5.4) — a hairline flat panel, one step LIGHTER than its background (F-09 — a
// flat plane, never a sunken/inset recess). Square corners on screen (F-07).
export function Well({ style, children, ...rest }: ViewProps & { style?: ViewStyle }) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.scr.panel,
          borderWidth: 1,
          borderColor: theme.scr.hairline,
          borderRadius: theme.corner.screen,
          padding: theme.space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
