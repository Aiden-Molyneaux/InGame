import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AvatarConfig, AvatarFrame } from '@ingame/shared';
import { AVATAR_FRAMES } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { isReadableMonogram } from '../../theme/contrast';
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
//
// walk-4 P3-a — the forge draws NO head of its own. It publishes the in-progress config through
// `onPreview` and the IDENTITY avatar (the one already on the screen, an arm's length above) IS the
// live preview: one avatar, one truth. The owner walked two heads reacting in lockstep and called it.
// walk-4 P3-b — the bg/ink pair is single-open: expanding one picker collapses the other, so the
// forge never grows two full picker surfaces at once.

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

// The config the four controls currently describe. Module-level + pure so the preview effect can key
// on the four VALUES alone (a component-scoped builder would be a new dep every render).
function makeConfig(bg: string, ink: string, glyph: string, frame: AvatarFrame): AvatarConfig {
  const g = sanitizeGlyph(glyph);
  const cfg: AvatarConfig = { bg, ink };
  if (g) cfg.glyph = g;
  if (frame && frame !== 'none') cfg.frame = frame;
  return cfg;
}

/** A config's identity for the no-change commit guard (pure; glyph/frame normalized like makeConfig). */
function configKey(c: AvatarConfig): string {
  return `${c.bg}|${c.ink}|${c.glyph ?? ''}|${c.frame ?? 'none'}`;
}

export function MonogramForge({
  username,
  config,
  onCommit,
  onPreview,
}: {
  username: string;
  config: AvatarConfig | null | undefined;
  /** PATCH `{ avatarConfig }` — the full blob, or null to reset to the default monogram. */
  onCommit: (config: AvatarConfig | null) => Promise<SaveOutcome>;
  /** P3-a — the in-progress (possibly not-yet-committed, possibly unreadable) config, published on
   *  every change so the host's identity avatar can BE the live preview. */
  onPreview?: (config: AvatarConfig) => void;
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
  // P3-b — which colour field is expanded (at most one). The ColorFields report their own opens.
  const [openField, setOpenField] = useState<'bg' | 'ink' | null>(null);

  // P3-a — publish the in-progress config so the host's identity avatar previews it live. Effect
  // (not render) so the parent's setState never lands during our render pass; keyed on the four
  // control values, so it fires exactly when the look actually changes.
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  useEffect(() => {
    onPreviewRef.current?.(makeConfig(bg, ink, glyph, frame));
  }, [bg, ink, glyph, frame]);

  // A few quick swatches for each ColorField (brand + neutral picks); the picker covers the rest.
  const swatches = [t.scr.bg, t.scr.panelHi, t.scr.accent, t.brand.gold, t.brand.cream, '#ffffff', '#000000'];

  function buildConfig(over: Partial<AvatarConfig> & { glyph?: string }): AvatarConfig {
    return makeConfig(over.bg ?? bg, over.ink ?? ink, over.glyph ?? glyph, over.frame ?? frame);
  }

  // Walk-4 Murr fix — the NO-CHANGE guard. A ColorField collapse (and the LETTERS blur) commits the
  // CURRENT value unconditionally, and P3-b's single-open coordination made "open one, open the
  // other" a normal gesture — which would PATCH a config the user never chose (worst on a
  // default-monogram user: null → an explicit blob, flipping their surfaces from the default box to
  // the labeled monogram). Baseline = the served config, else the untouched seed; a commit that
  // matches it is skipped, and a successful commit (or reset) moves it.
  const baselineRef = useRef(configKey(makeConfig(config?.bg ?? t.scr.panelHi, config?.ink ?? t.scr.accent, config?.glyph ?? '', config?.frame ?? 'none')));

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
    const next = buildConfig(over);
    if (configKey(next) === baselineRef.current) return; // no-change — nothing to save
    const r = await onCommit(next);
    if (r.ok) baselineRef.current = configKey(next);
    else setErr(r.message ?? 'Couldn’t save your monogram.');
  }

  async function resetToDefault() {
    setWarn(null);
    setErr(null);
    setBg(t.scr.panelHi);
    setInk(t.scr.accent);
    setGlyph('');
    setFrame('none');
    const r = await onCommit(null);
    if (r.ok) baselineRef.current = configKey(makeConfig(t.scr.panelHi, t.scr.accent, '', 'none'));
    else setErr(r.message ?? 'Couldn’t reset your monogram.');
  }

  return (
    <View style={styles.wrap}>
      {/* P3-a — no head here: the identity avatar above IS the live preview (see `onPreview`). */}
      <View style={styles.head}>
        <Text style={styles.title}>MONOGRAM FORGE</Text>
        <Text style={styles.sub}>Your colours, letters and frame — the avatar above previews it live.</Text>
      </View>

      {warn ? <Text style={styles.warn}>{warn}</Text> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.flabel}>BACKGROUND</Text>
        {/* P3-b — one picker at a time: opening this one collapses INK (and vice versa). The
            defensive `p === 'bg'` guard means a stray close-report can only ever clear ITS OWN slot. */}
        <ColorField
          value={bg}
          onChange={setBg}
          onCommit={(hex) => void apply({ bg: hex })}
          recents={swatches}
          open={openField === 'bg'}
          onOpenChange={(o) => setOpenField((p) => (o ? 'bg' : p === 'bg' ? null : p))}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.flabel}>INK</Text>
        <ColorField
          value={ink}
          onChange={setInk}
          onCommit={(hex) => void apply({ ink: hex })}
          recents={swatches}
          open={openField === 'ink'}
          onOpenChange={(o) => setOpenField((p) => (o ? 'ink' : p === 'ink' ? null : p))}
        />
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
  // P3-a — the head is a title block now (the preview head moved up to the identity avatar).
  head: { gap: t.space.xs },
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
