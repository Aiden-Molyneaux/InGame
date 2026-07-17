import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { themedStyles, useTheme } from '../../theme';

// QrCard (P8 · SOC-07/10 · find-add board P3) — the in-person add: the invite QR rendered CLIENT-SIDE
// from the POST /me/invites token/url (OQ-073, the sanctioned react-native-qrcode-svg dep, which draws
// through the already-present react-native-svg). A cream card (the board's `.qrcard`) with dark modules;
// the username sits above so a scanner sees whose invite it is. `value` is the tokenized invite URL —
// scanning it opens the InviteLanding (SOC-10).
export function QrCard({ value, username, size = 164 }: { value: string; username: string; size?: number }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{username.toUpperCase()}</Text>
      <View style={styles.card} accessibilityRole="image" accessibilityLabel={`${username} invite QR code`}>
        <QRCode value={value} size={size} color={t.shell.bezel} backgroundColor={t.brand.cream} ecl="M" />
      </View>
      <Text style={styles.cap}>
        Have someone scan this to send <Text style={styles.capStrong}>you</Text> a request — no link needed.
      </Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.md },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1.5 },
  card: {
    padding: t.space.lg,
    backgroundColor: t.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.4, textAlign: 'center', lineHeight: 14, maxWidth: 244 },
  capStrong: { color: t.scr.ink },
}));
