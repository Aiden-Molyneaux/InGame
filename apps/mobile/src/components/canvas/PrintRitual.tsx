import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CardFace } from '../CardFace';
import { FlatCardImage } from '../game/FlatCardImage';
import { ScreenButton } from '../ScreenButton';
import { useTheme, themedStyles, withAlpha } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';
// D8b — the share mark lives in the shared ShareGlyph (walk-4 Murr consolidation of three copies).
import { ShareGlyph } from '../ShareGlyph';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import type { CardComposition } from '../../render/composition';

// PrintRitual (component-map §8b / canvas board P8 · OQ-040) — "THE PRESS RUN", the FULL-tier celebration
// a Canvas PUBLISH earns (M5 motion pass; the deep editor's payoff, distinct from the Styler KEEP's light
// KeepBeat). Three beats, ≤1.6s + settle, committing fully to the print-shop metaphor: (1) THE PRESS
// BITES — a stepped shell-plastic bar stamps the plate; (2) THE PRINT EMERGES — the flattened render
// slides up out of the slot as a scanline shimmer rakes down it; (3) THE MARQUEE — the gold rule draws,
// PUBLISHED stamps in, the clout fades up, gold corner-shards pop. Tap anywhere skips to settled. Honors
// reduce-motion (0044 §104): the print cross-fades in, the rule + PUBLISHED appear without travel, no
// bar / shimmer / shards. RN-Animated + the shared useReducedMotion gate; themed tokens only.

const CARD_W = 138; // CardFace / FlatCardImage `pick` dims
const CARD_H = 193;
const SLOT_PAD = 12;
const BAR_W = CARD_W + SLOT_PAD * 2; // the press bar spans the whole slot zone
const BAR_H = 22;
const LIP_H = 8; // the thin stepped "slot lip" the print emerges from behind

// 5 gold corner-shards (beat 3) — half the coin-drop's energy: they pop OUT from the print's corners/
// edges and fade. Deterministic offsets (test-stable). `ox/oy` = the pop vector, `shade` a gold tone.
type Corner = { ox: number; oy: number; shade: 0 | 1 | 2; size: number; rot: number };
const CORNERS: Corner[] = [
  { ox: -34, oy: -30, shade: 0, size: 7, rot: 14 },
  { ox: 34, oy: -26, shade: 1, size: 6, rot: -18 },
  { ox: 38, oy: 28, shade: 2, size: 6, rot: 22 },
  { ox: -36, oy: 30, shade: 1, size: 7, rot: -12 },
  { ox: 0, oy: -40, shade: 0, size: 5, rot: 6 },
];

export function PrintRitual({
  title,
  composition,
  imageUrl,
  cardsDesigned,
  adoptionCount,
  onDone,
  onShare,
}: {
  title: string;
  composition: CardComposition;
  /** The FLATTENED published render (0066 §1). Present → the print that emerges from the slot; absent
   *  (web dev, flatten still pending) → the live-composition CardFace, so the reveal is never broken. */
  imageUrl?: string | null;
  cardsDesigned: number | null;
  /** D-iii — how many users have adopted THIS design (all-time AdoptCount); 0 for a first publish. */
  adoptionCount: number;
  onDone: () => void;
  /** CARD-21 share (P9) — absent, the door renders as the deferred "arrives with sharing" line. */
  onShare?: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const reduceMotion = useReducedMotion();

  const press = useRef(new Animated.Value(0)).current; // beat 1 — bar sweep + plate dip
  const emerge = useRef(new Animated.Value(0)).current; // beat 2 — print slides up out of the slot
  const shimmer = useRef(new Animated.Value(0)).current; // beat 2 — scanline rakes down the print
  const rule = useRef(new Animated.Value(0)).current; // beat 3 — gold rule draws L→R
  const stamp = useRef(new Animated.Value(0)).current; // beat 3 — PUBLISHED overshoot-snaps in
  const strip = useRef(new Animated.Value(0)).current; // beat 3 — clout + actions fade up
  const shards = useRef(new Animated.Value(0)).current; // beat 3 — corner shards pop

  const [settled, setSettled] = useState(false);
  const runningRef = useRef<Animated.CompositeAnimation | null>(null);

  // jump every value to its settled end (skip + unmount + natural completion funnel here — no leaks).
  const settleNow = useRef<() => void>(() => {});
  settleNow.current = () => {
    runningRef.current?.stop();
    runningRef.current = null;
    press.setValue(1);
    emerge.setValue(1);
    shimmer.setValue(1);
    rule.setValue(1);
    stamp.setValue(1);
    strip.setValue(1);
    shards.setValue(1); // 1 = fully popped & faded (shard opacity is 0 at both ends)
    setSettled(true);
  };

  useEffect(() => {
    if (reduceMotion) {
      // 0044 §104 — the print cross-fades in; the rule + PUBLISHED + clout appear without travel; no
      // press bar, no shimmer, no shards.
      press.setValue(1);
      shimmer.setValue(1);
      shards.setValue(0); // held at 0 → shard opacity stays 0 (never shown)
      setSettled(true);
      const fade = Animated.parallel([
        Animated.timing(emerge, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(rule, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(stamp, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(strip, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]);
      runningRef.current = fade;
      fade.start();
      return () => fade.stop();
    }

    press.setValue(0);
    emerge.setValue(0);
    shimmer.setValue(0);
    rule.setValue(0);
    stamp.setValue(0);
    strip.setValue(0);
    shards.setValue(0);
    setSettled(false);

    const seq = Animated.sequence([
      // beat 1 — THE PRESS BITES (one stamp, ~250ms)
      Animated.timing(press, { toValue: 1, duration: 250, useNativeDriver: true }),
      // beat 2 — THE PRINT EMERGES (~600ms) with ONE scanline shimmer riding down it
      Animated.parallel([
        Animated.timing(emerge, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(shimmer, { toValue: 1, duration: 460, useNativeDriver: true }),
        ]),
      ]),
      // beat 3 — THE MARQUEE (~500ms): rule draw · PUBLISHED overshoot · clout fade · shards pop
      Animated.parallel([
        Animated.timing(rule, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(120),
          Animated.spring(stamp, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(180),
          Animated.timing(strip, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(shards, { toValue: 1, duration: 340, useNativeDriver: true }),
        ]),
      ]),
    ]);
    runningRef.current = seq;
    seq.start(({ finished }) => {
      if (finished) setSettled(true);
    });
    return () => seq.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // ── derived transforms ──
  // beat 1: the bar sweeps down over the plate and back up (one stamp); the plate dips at contact.
  const barY = press.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-BAR_H - 6, CARD_H / 2, -BAR_H - 6] });
  const barOpacity = press.interpolate({ inputRange: [0, 0.06, 0.94, 1], outputRange: [0, 1, 1, 0] });
  const plateScale = press.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.98, 1] });
  // beat 2: the print rides up from below the slot; reduce-motion holds it in place (cross-fade only).
  const printY = reduceMotion
    ? 0
    : emerge.interpolate({ inputRange: [0, 1], outputRange: [CARD_H, 0], extrapolate: 'clamp' });
  const shimmerY = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-CARD_H * 0.5, CARD_H] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.7, 0.7, 0] });
  // beat 3
  const ruleScaleX = reduceMotion ? 1 : rule;
  const stampScale = reduceMotion ? 1 : stamp.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] });
  const stripY = strip.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  const shellSteps = [t.shell.plastic, t.shell.hi, t.shell.lo];
  const goldShade = [t.brand.gold, withAlpha(t.brand.gold, 0.82), withAlpha(t.brand.gold, 0.6)] as const;

  return (
    <View style={styles.wrap}>
      {/* the tap-anywhere-to-skip catcher — a full-bleed Pressable BEHIND the content (not wrapping it,
          so the SHARE + Done buttons are never nested inside a button, an invalid-DOM/hydration error on
          web). Decorative layers are pointerEvents="none" → a tap falls through to this; only the settle
          block's buttons capture their own taps. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => settleNow.current()}
        accessibilityRole="button"
        accessibilityLabel={`Published ${title}. Adoptable by everyone. Tap to continue.`}
      />
      <Text pointerEvents="none" style={styles.eyebrow}>THE PRESS RUNS · PUBLISHED</Text>

      {/* the press zone — the slot the print emerges from, the press bar that stamps it, the shimmer */}
      <Animated.View pointerEvents="none" style={[styles.stampWrap, { transform: [{ scale: plateScale }] }]}>
        {/* the slot mask (overflow hidden) — the print rides up from behind the lip */}
        <View style={styles.slot}>
          <Animated.View style={{ opacity: emerge, transform: [{ translateY: printY }] }}>
            {imageUrl ? (
              <FlatCardImage title={title} imageUrl={imageUrl} size="pick" />
            ) : (
              <CardFace title={title} composition={composition} size="pick" animate />
            )}
            {/* the scanline shimmer — a soft highlight band raking down the print once */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                { opacity: shimmerOpacity, backgroundColor: withAlpha(t.brand.cream, 0.55), transform: [{ translateY: shimmerY }] },
              ]}
            />
          </Animated.View>
        </View>

        {/* the slot lip — a thin stepped bar the print emerges from behind */}
        <View style={styles.lip} pointerEvents="none">
          <Svg width={BAR_W} height={LIP_H}>
            <Path d={steppedRectPath(BAR_W, LIP_H, 3, { tl: true, br: true })} fill={t.shell.hi} />
          </Svg>
        </View>

        {/* beat 1 — the press bar (stepped, shell-plastic) sweeps over the plate */}
        <Animated.View pointerEvents="none" style={[styles.pressBar, { opacity: barOpacity, transform: [{ translateY: barY }] }]}>
          <Svg width={BAR_W} height={BAR_H}>
            <Path d={steppedRectPath(BAR_W, BAR_H, 4, { tl: true, br: true })} fill={shellSteps[0]} />
            <Path d={steppedRectPath(BAR_W, 4, 2, { tl: true, br: true })} fill={shellSteps[1]} />
          </Svg>
        </Animated.View>

        {/* beat 3 — the gold corner-shards pop out and fade */}
        <View style={styles.shardLayer} pointerEvents="none">
          {CORNERS.map((c, i) => {
            const p = shards.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
            const opacity = shards.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  opacity,
                  transform: [
                    { translateX: Animated.multiply(p, c.ox) },
                    { translateY: Animated.multiply(p, c.oy) },
                    { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                    { rotate: `${c.rot}deg` },
                  ],
                }}
              >
                <View style={{ width: c.size, height: c.size, backgroundColor: goldShade[c.shade] }} />
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* beat 3 — the gold rule draws left→right (transform-origin left); reduce-motion fades it without travel */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rule,
          { opacity: rule.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }), transform: [{ scaleX: ruleScaleX }] },
        ]}
      />

      {/* beat 3 — PUBLISHED stamps in (overshoot snap) */}
      <Animated.View pointerEvents="none" style={[styles.okStrip, { opacity: stamp, transform: [{ scale: stampScale }] }]}>
        <Text style={styles.okIc}>◆</Text>
        <View style={styles.okTx}>
          <Text style={styles.okTitle}>PUBLISHED FOR {title.toUpperCase()}</Text>
          <Text style={styles.okSub}>Adoptable by everyone — it’s in the community gallery now.</Text>
        </View>
      </Animated.View>

      {/* beat 3 — the clout + actions fade up. box-none so the decorative clout passes taps through to the
          skip catcher; the SHARE link + Done button capture their own. */}
      <Animated.View pointerEvents="box-none" style={[styles.settleBlock, { opacity: strip, transform: [{ translateY: stripY }] }]}>
        {cardsDesigned !== null ? (
          <Text pointerEvents="none" style={styles.clout}>
            {cardsDesigned} CARD{cardsDesigned === 1 ? '' : 'S'} DESIGNED · {adoptionCount} ADOPTION{adoptionCount === 1 ? '' : 'S'}
          </Text>
        ) : null}

        {onShare ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Share this card" onPress={onShare} hitSlop={6} style={styles.shareRow}>
            <ShareGlyph size={11} color={t.scr.accent} />
            <Text style={styles.shareDoorLive}>SHARE THIS CARD</Text>
          </Pressable>
        ) : null}
        <ScreenButton label="Done — back to the game" onPress={onDone} block />
      </Animated.View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.lg },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 2 },
  stampWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SLOT_PAD, paddingVertical: t.space.md },
  slot: { width: CARD_W, height: CARD_H, overflow: 'hidden', backgroundColor: t.scr.panel },
  shimmer: { position: 'absolute', left: 0, right: 0, height: CARD_H * 0.5 },
  lip: { position: 'absolute', top: t.space.md - LIP_H / 2, left: 0 },
  pressBar: { position: 'absolute', top: 0, left: 0 },
  shardLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  rule: {
    alignSelf: 'stretch',
    height: 2,
    marginHorizontal: t.space.xxl,
    backgroundColor: t.brand.gold,
    transformOrigin: 'left', // draw L→R (RN ≥0.74)
  },
  okStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: withAlpha(t.brand.gold, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(t.brand.gold, 0.55),
    alignSelf: 'stretch',
  },
  okIc: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold },
  okTx: { gap: 2, flexShrink: 1 },
  okTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.8 },
  okSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  settleBlock: { alignItems: 'center', gap: t.space.lg, alignSelf: 'stretch' },
  clout: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  shareDoorLive: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
}));
