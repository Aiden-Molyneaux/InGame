import { Suspense, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { themedStyles } from '../../theme';
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
  const styles = useStyles();
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
  const styles = useStyles();
  return (
    <View style={styles.ladderItem}>
      {children}
      <Text style={styles.ladderLabel}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: t.space.md },
  bedWell: {
    padding: t.space.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  printFallback: { width: 189, height: 264, backgroundColor: t.scr.panel },
  flattenErr: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert, textAlign: 'center' },
  hint: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  hintBold: { color: t.scr.ink, fontFamily: t.font.screenBold },
  sizes: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.md, gap: t.space.md },
  sizesHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  ladder: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: t.space.xl },
  ladderItem: { alignItems: 'center', gap: t.space.sm },
  ladderLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  sizesHint: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, textAlign: 'center' },
}));
