import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { LoadStatus } from './BeamDiagram';
import { usePagerScroll } from '../hooks/usePagerScroll';

// Snap within this fraction of L from each snap point
const SNAP_FRACTION = 0.025;
const TAP_MAX_TRAVEL = 6;
const DOUBLE_TAP_MS = 280;
// Support is clamped to [MIN_FRAC, MAX_FRAC] × L to avoid CW → ∞
const MIN_FRAC = 0.08;
const MAX_FRAC = 0.92;
// Snap fractions
const SNAP_POINTS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];

function alphaFor(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(0,212,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}

interface Props {
  L_mm: number;
  a_mm: number;        // support position from left
  P_kg: number;        // load at right end
  CW_kg: number;       // counterweight at left end
  R_kg: number;        // support reaction
  imperial: boolean;
  status?: LoadStatus;
  onChange: (a_mm: number) => void;
}

const PADDING = 24;
const BEAM_HEIGHT = 7.5;
const HANDLE_SIZE = 28;

export default function BoomDiagram({
  L_mm,
  a_mm,
  P_kg,
  CW_kg,
  R_kg,
  imperial,
  status = 'safe',
  onChange,
}: Props) {
  const statusColor =
    status === 'danger' ? colors.danger : status === 'warning' ? colors.warning : colors.success;

  const [trackWidth, setTrackWidth] = useState(0);

  const clampedA = Math.max(MIN_FRAC * L_mm, Math.min(MAX_FRAC * L_mm, a_mm));
  const pixelX = trackWidth > 0 ? (clampedA / L_mm) * trackWidth : 0;

  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const LRef = useRef(L_mm);
  LRef.current = L_mm;
  const aRef = useRef(a_mm);
  aRef.current = a_mm;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const startPixelRef = useRef(0);
  const snappedRef = useRef(false);
  const lastTapRef = useRef(0);

  const setPagerScroll = usePagerScroll();
  const setPagerScrollRef = useRef(setPagerScroll);
  setPagerScrollRef.current = setPagerScroll;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setPagerScrollRef.current(false);
          const w = trackWidthRef.current;
          const a = Math.max(MIN_FRAC * LRef.current, Math.min(MAX_FRAC * LRef.current, aRef.current));
          startPixelRef.current = w > 0 ? (a / LRef.current) * w : 0;
          snappedRef.current = false;
        },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          const minPx = MIN_FRAC * w;
          const maxPx = MAX_FRAC * w;
          const newPixel = Math.max(minPx, Math.min(maxPx, startPixelRef.current + g.dx));
          let newA = (newPixel / w) * LRef.current;

          // Snap to common fractions
          const snapWindow = LRef.current * SNAP_FRACTION;
          let snapped = false;
          for (const frac of SNAP_POINTS) {
            const snapA = frac * LRef.current;
            if (Math.abs(newA - snapA) < snapWindow) {
              newA = snapA;
              snapped = true;
              break;
            }
          }
          if (snapped && !snappedRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          snappedRef.current = snapped;
          onChangeRef.current(newA);
        },
        onPanResponderRelease: (_, g) => {
          setPagerScrollRef.current(true);
          const travel = Math.hypot(g.dx, g.dy);
          if (travel <= TAP_MAX_TRAVEL) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onChangeRef.current(LRef.current / 3);
              lastTapRef.current = 0;
            } else {
              lastTapRef.current = now;
            }
          }
        },
        onPanResponderTerminate: () => { setPagerScrollRef.current(true); },
      }),
    []
  );

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const totalLabel = imperial
    ? `${(L_mm / 25.4 / 12).toFixed(2)} ft`
    : `${(L_mm / 1000).toFixed(2)} m`;

  const supportLabel = imperial
    ? `${(clampedA / 25.4).toFixed(1)} in`
    : clampedA >= 1000
    ? `${(clampedA / 1000).toFixed(2)} m`
    : `${clampedA.toFixed(0)} mm`;

  const loadLabel = (kg: number) =>
    imperial ? `${(kg * 2.20462).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.miniLabel}>TUBE LENGTH</Text>
        <Text style={s.lengthLabel}>{totalLabel}</Text>
      </View>

      <View style={s.stage}>
        <View style={s.trackArea} onLayout={onLayout}>
          {/* Guideline at support */}
          {trackWidth > 0 && (
            <View style={[s.guideline, { left: pixelX - 0.5 }]} />
          )}

          {/* Left end: CW load arrow */}
          {trackWidth > 0 && (
            <View style={[s.endLoadContainer, { left: -PADDING + 2 }]} pointerEvents="none">
              <Text style={s.endLoadLabel}>CW</Text>
              <Text style={s.endLoadValue}>{loadLabel(CW_kg)}</Text>
              <Text style={[s.arrow, { color: colors.textMuted, textShadowColor: colors.textMuted }]}>▼</Text>
            </View>
          )}

          {/* Right end: P load arrow */}
          {trackWidth > 0 && (
            <View style={[s.endLoadContainer, { right: -PADDING + 2 }]} pointerEvents="none">
              <Text style={s.endLoadLabel}>P</Text>
              <Text style={s.endLoadValue}>{loadLabel(P_kg)}</Text>
              <Text style={[s.arrow, { color: colors.primary, textShadowColor: colors.primary }]}>▼</Text>
            </View>
          )}

          {/* Beam */}
          <View style={s.beam} />

          {/* Support triangle below beam */}
          {trackWidth > 0 && (
            <View
              pointerEvents="none"
              style={[s.supportTriangle, { left: pixelX - 7, borderTopColor: statusColor }]}
            />
          )}

          {/* Reaction arrow (upward) at support */}
          {trackWidth > 0 && (
            <View
              style={[s.reactionContainer, { left: pixelX - 20 }]}
              pointerEvents="none"
            >
              <Text style={[s.arrow, { color: statusColor, textShadowColor: statusColor, transform: [{ rotate: '180deg' }] }]}>▼</Text>
              <Text style={[s.reactionLabel, { color: statusColor }]}>{loadLabel(R_kg)}</Text>
            </View>
          )}

          {/* Draggable handle at support position */}
          {trackWidth > 0 && (
            <View
              {...panResponder.panHandlers}
              hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
              style={[
                s.handle,
                {
                  left: pixelX - HANDLE_SIZE / 2,
                  borderColor: statusColor,
                  backgroundColor: alphaFor(statusColor, 0.18),
                },
              ]}
            >
              <View style={[s.handleInner, { backgroundColor: statusColor }]} />
            </View>
          )}
        </View>
      </View>

      <View style={s.bottomLabelRow}>
        <Text style={s.miniLabel}>SUPPORT FROM LEFT</Text>
        <Text style={s.distLabel}>{supportLabel}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingVertical: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    marginBottom: 4,
    gap: 10,
  },
  miniLabel: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
    width: 130,
    textAlign: 'right',
  },
  lengthLabel: { fontSize: 13, color: colors.text, fontWeight: '700' },
  distLabel: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  stage: {
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: PADDING,
  },
  trackArea: {
    height: BEAM_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  beam: {
    height: BEAM_HEIGHT,
    backgroundColor: colors.primaryDim,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  guideline: {
    position: 'absolute',
    top: -30,
    bottom: -22,
    width: 1,
    backgroundColor: colors.border,
  },
  endLoadContainer: {
    position: 'absolute',
    top: -34,
    alignItems: 'center',
    width: 52,
  },
  endLoadLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  endLoadValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 1,
  },
  arrow: {
    fontSize: 14,
    textShadowRadius: 6,
  },
  supportTriangle: {
    position: 'absolute',
    bottom: -11,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  reactionContainer: {
    position: 'absolute',
    bottom: -28,
    alignItems: 'center',
    width: 40,
  },
  reactionLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  handle: {
    position: 'absolute',
    top: BEAM_HEIGHT / 2 - HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 20,
    elevation: 6,
  },
  handleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background,
  },
  bottomLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 10,
  },
});
