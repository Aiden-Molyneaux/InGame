import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { STICKER_BASE_HALF, type Sticker, type StickerZone } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { CHIN_ENABLED, PlacedSticker } from './deviceStickers';
import type { StickerEditSession } from './DeviceStickerContext';

// StickerBandLayer (device-manifest ARCH 2 · D4) — the sticker layer for ONE plastic band, mounted by
// the ROOT DeviceShell (forehead = top-band · chin = nav-band area). PASSIVE by default (renders the
// persisted decals on every screen, pointer-transparent so the keycaps stay live — F-04). When the
// /device editor publishes an edit `session` it turns INTERACTIVE: dashed decal-zone outline, the
// selected decal's TransformBox (accent ring + cream corner handles + rotation stem — the Canvas
// sel-ring kin, rotated WITH the decal), and a gesture surface where drag=move · corner=scale ·
// stem=rotate — every gesture LIVE-clamped to the zone by the callee (fitTransform / stickerFitsZone).
// A drag toward the screen/nav ghosts the decal + shows the refusal; a drop wholly inside the OTHER
// zone re-zones it (walk 3). Reduce-motion is a non-issue — no choreography here (instant).

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type ZoneGeom = MutableRefObject<Record<StickerZone, WindowRect | null>>;

const KNOB_DIST = 20; // the rotation knob's offset off the box edge
const GRAB = 22; // handle/knob grab radius (the Canvas CR-10 large hit-area)
const MOVE_SLOP = 6; // px before a press counts as a drag (not a tap)
const BASE = STICKER_BASE_HALF;

const ptIn = (x: number, y: number, r: WindowRect | null): boolean =>
  !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Rotate a touch into the decal's unrotated frame so grab tests match the DRAWN box (Canvas kin). */
function unrotate(px: number, py: number, cx: number, cy: number, deg: number): [number, number] {
  if (!deg) return [px, py];
  const a = (-deg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

const normDeg = (d: number): number => (((d % 360) + 540) % 360) - 180;

interface GestureState {
  mode: 'idle' | 'move' | 'scale' | 'rotate';
  cornerX: -1 | 1;
  cornerY: -1 | 1;
  startX: number;
  startY: number;
  startScale: number;
  startSide: number;
  startRot: number;
  startCx: number;
  startCy: number;
  downX: number;
  downY: number;
  moved: boolean;
}

export function StickerBandLayer({
  zone,
  stickers,
  session,
  zoneGeom,
  navWarn,
  onNavWarn,
}: {
  zone: StickerZone;
  stickers: Sticker[];
  session: StickerEditSession | null;
  zoneGeom: ZoneGeom;
  navWarn: boolean;
  onNavWarn: (b: boolean) => void;
}) {
  const styles = useStyles();
  const [rect, setRect] = useState({ w: 0, h: 0 });
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const layerRef = useRef<View>(null);
  const otherZone: StickerZone = zone === 'forehead' ? 'chin' : 'forehead';

  // MOUNT-MEASURE FALLBACK (Fable §3.5 walk find): on RN-WEB the absolutely-positioned band layer's
  // `onLayout` can fail to deliver — and its patched `measureInWindow` was observed returning ZEROS
  // through 30 retry frames — leaving `rect` at 0×0: the decals render collapsed (0-size Svg) even
  // though the composition/pipeline/readout are all correct. On web the RN View ref IS the DOM node,
  // so `getBoundingClientRect` (which reports the true rect — verified) is used first; native keeps
  // measureInWindow but in practice heals via its dependable onLayout. Retries a few frames (the
  // first can be pre-layout); inert once a real rect lands (onLayout or here).
  useEffect(() => {
    if (rect.h > 0) return;
    let tries = 0;
    let id: ReturnType<typeof requestAnimationFrame>;
    const land = (x: number, y: number, w: number, h: number): boolean => {
      if (w <= 0 || h <= 0) return false;
      setRect((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      zoneGeom.current[zone] = { x, y, w, h };
      return true;
    };
    const attempt = () => {
      const node = layerRef.current as unknown as {
        getBoundingClientRect?: () => { x: number; y: number; width: number; height: number };
        measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
      } | null;
      if (!node) return;
      if (typeof node.getBoundingClientRect === 'function') {
        const r = node.getBoundingClientRect();
        if (land(r.x, r.y, r.width, r.height)) return;
        if (++tries < 30) id = requestAnimationFrame(attempt);
        return;
      }
      node.measureInWindow?.((x, y, w, h) => {
        if (!land(x, y, w, h) && ++tries < 30) id = requestAnimationFrame(attempt);
      });
    };
    id = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(id);
  }, [rect.h, zone, zoneGeom]);

  const selected = session ? stickers.find((s) => s.id === session.selectedId) ?? null : null;

  // current-values ref so the once-created PanResponder reads live state (the Canvas frozen-closure fix).
  const stateRef = useRef({ rect, stickers, selected, session, zone });
  stateRef.current = { rect, stickers, selected, session, zone };

  const gRef = useRef<GestureState>({
    mode: 'idle',
    cornerX: 1,
    cornerY: 1,
    startX: 0,
    startY: 0,
    startScale: 1,
    startSide: 0,
    startRot: 0,
    startCx: 0,
    startCy: 0,
    downX: 0,
    downY: 0,
    moved: false,
  });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!stateRef.current.session,
      onMoveShouldSetPanResponder: () => !!stateRef.current.session,
      onPanResponderGrant: (e) => {
        const { rect: r, selected: sel } = stateRef.current;
        const px = e.nativeEvent.locationX;
        const py = e.nativeEvent.locationY;
        const g = gRef.current;
        g.mode = 'idle';
        g.moved = false;
        g.downX = px;
        g.downY = py;
        if (!sel || r.h <= 0) return;
        const cx = sel.x * r.w;
        const cy = sel.y * r.h;
        const side = 2 * sel.scale * BASE * r.h;
        const half = side / 2;
        const [ux, uy] = unrotate(px, py, cx, cy, sel.rotation);
        g.startX = sel.x;
        g.startY = sel.y;
        g.startScale = sel.scale;
        g.startSide = side;
        g.startRot = sel.rotation;
        g.startCx = cx;
        g.startCy = cy;
        // corners first (they win a tie with the knob on a small band — Canvas F5)
        const corner = (
          [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ] as [-1 | 1, -1 | 1][]
        ).find(([sx, sy]) => Math.abs(ux - (cx + sx * half)) <= GRAB && Math.abs(uy - (cy + sy * half)) <= GRAB);
        if (corner) {
          g.mode = 'scale';
          g.cornerX = corner[0];
          g.cornerY = corner[1];
          return;
        }
        // the rotation knob — off the box top, flipping below when the box hugs the band top
        const below = cy - half - KNOB_DIST < 0;
        const knobY = below ? cy + half + KNOB_DIST : cy - half - KNOB_DIST;
        if (Math.abs(ux - cx) <= GRAB && Math.abs(uy - knobY) <= GRAB) {
          g.mode = 'rotate';
          return;
        }
        if (Math.abs(ux - cx) <= half + 6 && Math.abs(uy - cy) <= half + 6) {
          g.mode = 'move';
        }
      },
      onPanResponderMove: (_e, gs) => {
        const g = gRef.current;
        const { rect: r, selected: sel, session: sess } = stateRef.current;
        if (Math.abs(gs.dx) + Math.abs(gs.dy) > MOVE_SLOP) g.moved = true;
        if (g.mode === 'idle' || !sel || !sess || r.h <= 0 || !g.moved) return;
        if (g.mode === 'move') {
          const nx = g.startX + gs.dx / r.w;
          const ny = g.startY + gs.dy / r.h;
          sess.mutate(sel.id, { x: nx, y: ny });
          // refusal / nav-protect via WINDOW coords (moveX/Y are screen-space, as are the zone rects)
          const own = zoneGeom.current[stateRef.current.zone];
          const other = zoneGeom.current[otherZone];
          const inOwn = ptIn(gs.moveX, gs.moveY, own);
          const inOther = ptIn(gs.moveX, gs.moveY, other);
          const refusing = !inOwn && !inOther;
          setRefusingId(refusing ? sel.id : null);
          onNavWarn(refusing);
        } else if (g.mode === 'scale') {
          const a = (-g.startRot * Math.PI) / 180;
          const ldx = gs.dx * Math.cos(a) - gs.dy * Math.sin(a);
          const ldy = gs.dx * Math.sin(a) + gs.dy * Math.cos(a);
          const grow = g.cornerX * ldx + g.cornerY * ldy; // outward drag on either axis grows the square
          const newSide = g.startSide + grow;
          sess.mutate(sel.id, { scale: newSide / (2 * BASE * r.h) });
        } else if (g.mode === 'rotate') {
          // rotate by the angle the touch has swept around the box centre since the grab.
          const cur = (Math.atan2(g.downY + gs.dy - g.startCy, g.downX + gs.dx - g.startCx) * 180) / Math.PI;
          const grab = (Math.atan2(g.downY - g.startCy, g.downX - g.startCx) * 180) / Math.PI;
          let deg = normDeg(g.startRot + (cur - grab));
          const quarter = Math.round(deg / 90) * 90; // light snap at 0/±90/±180
          if (Math.abs(deg - quarter) <= 5) deg = normDeg(quarter);
          sess.mutate(sel.id, { rotation: deg });
        }
      },
      onPanResponderRelease: (_e, gs) => {
        const g = gRef.current;
        const { selected: sel, session: sess, stickers: list, zone: z } = stateRef.current;
        setRefusingId(null);
        onNavWarn(false);
        if (!sess) return;
        if (g.moved) {
          if (g.mode === 'move' && sel && CHIN_ENABLED) {
            // cross-band re-zone on drop (walk 3) — only while chin is a valid target; with chin off
            // the drag just clamps back into the forehead (no re-zone).
            const other = zoneGeom.current[otherZone];
            if (other && ptIn(gs.moveX, gs.moveY, other)) {
              const nx = (gs.moveX - other.x) / other.w;
              const ny = (gs.moveY - other.y) / other.h;
              sess.mutate(sel.id, { zone: otherZone, x: nx, y: ny });
            }
          }
          sess.commit();
        } else if (g.mode === 'idle') {
          // a TAP — select the topmost decal under the touch in this zone, else deselect
          const r = stateRef.current.rect;
          let hit: string | null = null;
          for (let i = list.length - 1; i >= 0; i--) {
            const s = list[i]!;
            const cx = s.x * r.w;
            const cy = s.y * r.h;
            const half = s.scale * BASE * r.h;
            const [ux, uy] = unrotate(g.downX, g.downY, cx, cy, s.rotation);
            if (Math.abs(ux - cx) <= half + 6 && Math.abs(uy - cy) <= half + 6) {
              hit = s.id;
              break;
            }
          }
          sess.select(hit);
        }
        g.mode = 'idle';
      },
      onPanResponderTerminate: () => {
        setRefusingId(null);
        onNavWarn(false);
        gRef.current.mode = 'idle';
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setRect((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    // window rect for cross-zone refusal / re-zone (screen coords)
    requestAnimationFrame(() => {
      layerRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) zoneGeom.current[zone] = { x, y, w, h };
      });
    });
  };

  // the chin band stays PASSIVE while chin is toggled off (owner 2026-07-12) — it still renders any
  // existing chin decals, but shows no editor outline / gesture surface / drop-target.
  const editing = !!session && (zone === 'forehead' || CHIN_ENABLED);
  const selBox =
    editing && selected && rect.h > 0
      ? {
          side: 2 * selected.scale * BASE * rect.h,
          left: selected.x * rect.w,
          top: selected.y * rect.h,
          rot: selected.rotation,
        }
      : null;

  return (
    <View
      ref={layerRef}
      onLayout={onLayout}
      pointerEvents={editing ? 'box-none' : 'none'}
      style={styles.layer}
    >
      {/* dashed decal-zone outline (editor only) */}
      {editing ? (
        <View pointerEvents="none" style={styles.decalZone}>
          {zone === 'forehead' ? <Text style={styles.zoneLabel}>DECAL ZONE</Text> : null}
        </View>
      ) : null}

      {/* the decals (passive on every screen; the refused one ghosts) */}
      {stickers.map((s) => (
        <PlacedSticker key={s.id} sticker={s} rectW={rect.w} rectH={rect.h} ghost={refusingId === s.id} />
      ))}

      {/* NB: the non-gesture SELECT path is the visible placed-sticker rail in the STICKERS panel
          (owner 2026-07-12 — the "slips" rail), which is an accessible Pressable list; it replaced the
          transparent per-decal select-targets that used to sit here (cleaner + no iOS overlap edge). */}

      {/* the TransformBox on the selected decal — rotates WITH it (Canvas sel-ring kin) */}
      {selBox ? (
        <View
          pointerEvents="none"
          style={[
            styles.tbox,
            {
              width: selBox.side,
              height: selBox.side,
              left: selBox.left - selBox.side / 2,
              top: selBox.top - selBox.side / 2,
              transform: [{ rotate: `${selBox.rot}deg` }],
            },
          ]}
        >
          <View style={[styles.handle, { left: -5, top: -5 }]} />
          <View style={[styles.handle, { right: -5, top: -5 }]} />
          <View style={[styles.handle, { left: -5, bottom: -5 }]} />
          <View style={[styles.handle, { right: -5, bottom: -5 }]} />
          {selBox.top - selBox.side / 2 - KNOB_DIST < 0 ? (
            <>
              <View style={[styles.stem, { left: selBox.side / 2 - 0.75, bottom: -(KNOB_DIST - 6), height: KNOB_DIST - 6 }]} />
              <View style={[styles.knob, { left: selBox.side / 2 - 6, bottom: -KNOB_DIST - 6 }]} />
            </>
          ) : (
            <>
              <View style={[styles.stem, { left: selBox.side / 2 - 0.75, top: -(KNOB_DIST - 6), height: KNOB_DIST - 6 }]} />
              <View style={[styles.knob, { left: selBox.side / 2 - 6, top: -KNOB_DIST - 6 }]} />
            </>
          )}
        </View>
      ) : null}

      {/* refusal + nav-protect tags */}
      {editing && refusingId ? (
        <View pointerEvents="none" style={styles.blockTag}>
          <Text style={styles.blockText}>⊘ SCREEN — DISPLAY ONLY</Text>
        </View>
      ) : null}
      {zone === 'chin' && navWarn ? (
        <View pointerEvents="none" style={styles.navProtect}>
          <Text style={styles.navProtectText}>NAV — KEEP CLEAR</Text>
        </View>
      ) : null}

      {/* the gesture surface (editor only) — the decals/TransformBox above are pointer-transparent, so
          touches land here and are hit-tested against the decal boxes in local coords. */}
      {editing ? <View style={StyleSheet.absoluteFill} {...pan.panHandlers} accessibilityLabel={`${zone} decals`} /> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  layer: { ...StyleSheet.absoluteFillObject },
  // transparent a11y-only hit target over a decal (sighted touches land on the gesture surface above)
  decalZone: {
    ...StyleSheet.absoluteFillObject,
    margin: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.scr.accent,
    opacity: 0.7,
  },
  zoneLabel: {
    // centered at the top of the forehead band so it clears the POWER label (far left) and the grille
    // (far right) — the old top-left placement sat on top of "POWER".
    position: 'absolute',
    left: 0,
    right: 0,
    top: 1,
    textAlign: 'center',
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.accent,
    letterSpacing: 1,
    opacity: 0.9,
  },
  tbox: { position: 'absolute', borderWidth: 1.5, borderColor: t.scr.accent },
  handle: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: t.brand.cream,
    borderWidth: 1.5,
    borderColor: t.scr.accent,
  },
  knob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.brand.cream,
    borderWidth: 1.5,
    borderColor: t.scr.accent,
  },
  stem: { position: 'absolute', width: 1.5, backgroundColor: t.scr.accent },
  blockTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    alignItems: 'center',
  },
  blockText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.cream,
    letterSpacing: 1,
    backgroundColor: t.brand.alert,
    paddingHorizontal: t.space.sm,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  navProtect: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.brand.alert,
  },
  navProtectText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.alert,
    letterSpacing: 1,
  },
}));
