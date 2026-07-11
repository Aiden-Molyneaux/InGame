import { Suspense, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { LazyProofPrint } from './lazySkia';
import { CardFace } from '../CardFace';
import type { CardComposition } from '../../render/composition';

// ProofView (component-map §8b / board P6, change-2) — the TRUE PRINT: the composition
// client-flattened to a PNG (CARD-15's flatten, its first in-app consumer) with the closed
// attributes live (frame · plate · the effect+finish painted OVER the image — the viewer
// architecture M5 publish ships), plus the size ladder at the GameCard set sizes so "does it
// still read small?" is answered AT PROOF TIME (CARD-07; F-06/0047 — the plate rides only the
// 96px render, mini/thumb drop it). Sizes are the app's real dims (CardFace SIZE_DIMS): CELL·96 ·
// MINI·64 · THUMB·48 (the board's GRID·96/THUMB·44 labels map to the app truth — manifest P6).

export function ProofView({ composition, title }: { composition: CardComposition; title: string }) {
  const [flattenFailed, setFlattenFailed] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.bedWell}>
        <SkiaErrorBoundary fallback={<View style={styles.printFallback} />}>
          <Suspense fallback={<View style={styles.printFallback} />}>
            <LazyProofPrint composition={composition} width={189} height={264} onFlattenError={() => setFlattenFailed(true)} />
          </Suspense>
        </SkiaErrorBoundary>
      </View>
      {flattenFailed ? <Text style={styles.flattenErr}>The flatten hiccuped — showing the live draw instead. Nothing is lost.</Text> : null}
      <Text style={styles.hint}>
        <Text style={styles.hintBold}>PROOFING</Text> — THE TRUE PRINT, CLOSED ATTRIBUTES LIVE · RELEASE / TAP AGAIN TO LIFT IT
      </Text>
      <View style={styles.sizes}>
        <Text style={styles.sizesHead}>
          HOW THE PRINT READS <Text style={styles.hintBold}>AT EVERY SIZE IT&apos;LL APPEAR</Text>
        </Text>
        <View style={styles.ladder}>
          <LadderItem label="CELL · 96">
            <CardFace title={title} composition={composition} size="cell" />
          </LadderItem>
          <LadderItem label="MINI · 64">
            <CardFace title={title} composition={composition} size="mini" />
          </LadderItem>
          <LadderItem label="THUMB · 48">
            <CardFace title={title} composition={composition} size="thumb" />
          </LadderItem>
        </View>
        {/* CR-16 — the proof-ladder coaching hint is removed (the owner walked it) */}
      </View>
    </View>
  );
}

function LadderItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.ladderItem}>
      {children}
      <Text style={styles.ladderLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: theme.space.md },
  bedWell: {
    padding: theme.space.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  printFallback: { width: 189, height: 264, backgroundColor: theme.scr.panel },
  flattenErr: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert, textAlign: 'center' },
  hint: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  hintBold: { color: theme.scr.ink, fontFamily: theme.font.screenBold },
  sizes: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md, gap: theme.space.md },
  sizesHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  ladder: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: theme.space.xl },
  ladderItem: { alignItems: 'center', gap: theme.space.sm },
  ladderLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  sizesHint: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 0.5, textAlign: 'center' },
});
