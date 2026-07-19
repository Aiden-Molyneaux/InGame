import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AvatarConfig, AvatarFrame } from '@ingame/shared';
import { AVATAR_FRAMES } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { isReadableMonogram } from '../../theme/contrast';
import { Avatar } from '../Avatar';
import { ColorField } from '../ColorPicker';
import { TextField } from '../TextField';
import type { SaveOutcome } from './EditableIdentity';

// MonogramForge (W-4 · PROF-08 beta "Monogram Forge") — customise the monogram you already wear: a
// COLOUR PAIR (bg + ink, via the shared ColorField), a GLYPH override (default = your initials), and a
// small FRAME set. Per-field commit grammar (a settled colour / a glyph blur / a frame tap each PATCHes
// `{ avatarConfig }`), matching the rest of the in-place editor. A CONTRAST GUARD refuses to commit an
// unreadable colour pair (previews it, warns, holds the PATCH until it's legible). RESET clears the
// config back to the deterministic default monogram (PATCH null). The full avatar DESIGNER (flatten
// pipeline) stays the launch headline (product-spec PROF-08 §10) — this is the beta expression.

const FRAME_LABEL: Record<AvatarFrame, string> = {
  none: 'NONE',
  ring: 'RING',
  inset: 'INSET',
  double: 'DOUBLE',
};

// Keep only the schema's 1–2 alphanumerics (the glyph grammar); '' ⇒ fall back to derived initials.
function sanitizeGlyph(v: string): string {
  return v.replace(/[^a-z0-9]/gi, '').slice(0, 2);
}

export function MonogramForge({
  username,
  config,
  onCommit,
}: {
  username: string;
  config: AvatarConfig | null | undefined;
  /** PATCH `{ avatarConfig }` — the full blob, or null to reset to the default monogram. */
  onCommit: (config: AvatarConfig | null) => Promise<SaveOutcome>;
}) {
  const styles = useStyles();
  const t = useTheme();
  // Seed from the saved config, else the theme default that MATCHES today's monogram (panelHi · accent),
  // so opening the forge shows the current look and any change becomes a real config.
  const [bg, setBg] = useState(config?.bg ?? t.scr.panelHi);
  const [ink, setInk] = useState(config?.ink ?? t.scr.accent);
  const [glyph, setGlyph] = useState(config?.glyph ?? '');
  const [frame, setFrame] = useState<AvatarFrame>(config?.frame ?? 'none');
  const [warn, setWarn] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // A few quick swatches for each ColorField (brand + neutral picks); the picker covers the rest.
  const swatches = [t.scr.bg, t.scr.panelHi, t.scr.accent, t.brand.gold, t.brand.cream, '#ffffff', '#000000'];

  function buildConfig(over: Partial<AvatarConfig> & { glyph?: string }): AvatarConfig {
    const g = sanitizeGlyph(over.glyph ?? glyph);
    const f = over.frame ?? frame;
    const cfg: AvatarConfig = { bg: over.bg ?? bg, ink: over.ink ?? ink };
    if (g) cfg.glyph = g;
    if (f && f !== 'none') cfg.frame = f;
    return cfg;
  }

  // The commit gate — the contrast guard lives here: an unreadable pair PREVIEWS + WARNS but never
  // PATCHes (the config on the server stays the last legible one).
  async function apply(over: Partial<AvatarConfig> & { glyph?: string }) {
    const effBg = over.bg ?? bg;
    const effInk = over.ink ?? ink;
    setErr(null);
    if (!isReadableMonogram(effBg, effInk)) {
      setWarn('That pair is hard to read — nudge the colours further apart to save it.');
      return;
    }
    setWarn(null);
    const r = await onCommit(buildConfig(over));
    if (!r.ok) setErr(r.message ?? 'Couldn’t save your monogram.');
  }

  async function resetToDefault() {
    setWarn(null);
    setErr(null);
    setBg(t.scr.panelHi);
    setInk(t.scr.accent);
    setGlyph('');
    setFrame('none');
    const r = await onCommit(null);
    if (!r.ok) setErr(r.message ?? 'Couldn’t reset your monogram.');
  }

  // The live preview reflects the in-progress (possibly unreadable) local state.
  const previewConfig: AvatarConfig = buildConfig({});

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Avatar username={username} avatarConfig={previewConfig} size={64} />
        <View style={styles.headMeta}>
          <Text style={styles.title}>MONOGRAM FORGE</Text>
          <Text style={styles.sub}>Your colours, letters and frame — it shows everywhere you appear.</Text>
        </View>
      </View>

      {warn ? <Text style={styles.warn}>{warn}</Text> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.flabel}>BACKGROUND</Text>
        <ColorField value={bg} onChange={setBg} onCommit={(hex) => void apply({ bg: hex })} recents={swatches} />
      </View>

      <View style={styles.field}>
        <Text style={styles.flabel}>INK</Text>
        <ColorField value={ink} onChange={setInk} onCommit={(hex) => void apply({ ink: hex })} recents={swatches} />
      </View>

      <View style={styles.field}>
        <TextField
          label="Letters"
          value={glyph}
          onChangeText={(v) => setGlyph(sanitizeGlyph(v))}
          onBlur={() => void apply({})}
          placeholder={username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '??'}
          autoCapitalize="characters"
        />
        <Text style={styles.microcopy}>1–2 LETTERS · BLANK USES YOUR INITIALS</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.flabel}>FRAME</Text>
        <View style={styles.frames}>
          {AVATAR_FRAMES.map((f) => {
            const on = frame === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${FRAME_LABEL[f]} frame`}
                onPress={() => {
                  setFrame(f);
                  void apply({ frame: f });
                }}
                style={[styles.frameKey, on && styles.frameKeyOn]}
              >
                <Text style={[styles.frameText, on && styles.frameTextOn]}>{FRAME_LABEL[f]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset monogram to default"
        onPress={() => void resetToDefault()}
        hitSlop={6}
      >
        <Text style={styles.reset}>RESET TO DEFAULT</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.lg, backgroundColor: t.scr.panelHi, padding: t.space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  headMeta: { flex: 1, gap: t.space.xs },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 1.5 },
  sub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, lineHeight: 13 },
  warn: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, lineHeight: 13 },
  err: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, lineHeight: 13 },
  field: { gap: t.space.sm },
  flabel: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  microcopy: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 13, marginTop: -t.space.sm },
  frames: { flexDirection: 'row', gap: t.space.sm },
  frameKey: { flex: 1, alignItems: 'center', paddingVertical: t.space.sm, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  frameKeyOn: { borderColor: t.scr.accent },
  frameText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  frameTextOn: { color: t.scr.accent },
  reset: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
}));
