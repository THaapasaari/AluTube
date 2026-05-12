import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

// Drag is "snapped" when within this fraction of the beam length from centre
const SNAP_FRACTION = 0.025;
// Two taps within this many ms register as a double-tap
const DOUBLE_TAP_MS = 280;
// A gesture with this little movement (in px) counts as a tap, not a drag
const TAP_MAX_TRAVEL = 6;

// Convert "#RRGGBB" to "rgba(r,g,b,a)" for handle background tint.
function alphaFor(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(0,212,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}

export type LoadStatus = 'safe' | 'warning' | 'danger';

interface Props {
  L_mm: number;          // tube length in mm (SI)
  a_mm: number;          // distance from left end in mm
  isCenter: boolean;
  onChange: (a_mm: number, isCenter: boolean) => void;
  imperial: boolean;
  P_kg: number;
  /** Worst-of-all-limits status. Drives handle + arrow colour. */
  status?: LoadStatus;
}

const PADDING = 24;
const BEAM_HEIGHT = 7.5;
const HANDLE_SIZE = 28;

export default function BeamDiagram({
  L_mm,
  a_mm,
  isCenter,
  onChange,
  imperial,
  P_kg,
  status = 'safe',
}: Props) {
  const statusColor =
    status === 'danger'
      ? colors.danger
      : status === 'warning'
      ? colors.warning
      : colors.success;
  const [trackWidth, setTrackWidth] = useState(0);

  // Position used for display: when in CPL mode, snap to centre
  const displayA = isCenter ? L_mm / 2 : Math.max(0, Math.min(L_mm, a_mm));

  // Pixel position of the load along the track
  const pixelX = trackWidth > 0 ? (displayA / L_mm) * trackWidth : 0;

  // Refs so the gesture closure sees the latest values
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const LRef = useRef(L_mm);
  LRef.current = L_mm;
  const aRef = useRef(a_mm);
  aRef.current = a_mm;
  const isCenterRef = useRef(isCenter);
  isCenterRef.current = isCenter;
  const startPixelRef = useRef(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Snap-state: remembers whether we're currently inside the centre snap zone,
  // so we only fire one haptic per crossing (not on every move event).
  const snappedRef = useRef(false);
  // Tap detection for double-tap → reset to centre
  const lastTapRef = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture immediately on touch — beats the ScrollView
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        // Refuse to give it back once we have it (otherwise ScrollView steals)
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          const w = trackWidthRef.current;
          const a = isCenterRef.current ? LRef.current / 2 : aRef.current;
          startPixelRef.current = w > 0 ? (a / LRef.current) * w : 0;
          snappedRef.current = isCenterRef.current;
        },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          const newPixel = Math.max(0, Math.min(w, startPixelRef.current + g.dx));
          let newA = (newPixel / w) * LRef.current;

          // Centre snap with haptic
          const centre = LRef.current / 2;
          const snapWindow = LRef.current * SNAP_FRACTION;
          const inSnapZone = Math.abs(newA - centre) < snapWindow;

          if (inSnapZone) {
            newA = centre;
            if (!snappedRef.current) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              snappedRef.current = true;
            }
            onChangeRef.current(newA, true); // snapped → CPL mode on
          } else {
            snappedRef.current = false;
            onChangeRef.current(newA, false);
          }
        },
        onPanResponderRelease: (_, g) => {
          // Treat a near-zero-travel gesture as a tap; two taps within
          // DOUBLE_TAP_MS reset the load to the centre.
          const travel = Math.hypot(g.dx, g.dy);
          if (travel <= TAP_MAX_TRAVEL) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onChangeRef.current(LRef.current / 2, true);
              lastTapRef.current = 0;
            } else {
              lastTapRef.current = now;
            }
          }
        },
        onPanResponderTerminate: () => {},
      }),
    []
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const distLabel = imperial
    ? `${(displayA / 25.4).toFixed(1)} in`
    : displayA >= 1000
    ? `${(displayA / 1000).toFixed(2)} m`
    : `${displayA.toFixed(0)} mm`;
  const totalLabel = imperial
    ? `${(L_mm / 25.4 / 12).toFixed(2)} ft`
    : `${(L_mm / 1000).toFixed(2)} m`;
  const loadLabel = imperial
    ? `${(P_kg * 2.20462).toFixed(1)} lbs`
    : `${P_kg.toFixed(1)} kg`;

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.miniLabel}>TUBE LENGTH</Text>
        <Text style={s.lengthLabelTop}>{totalLabel}</Text>
      </View>

      <View style={s.stage}>
        {/* Track (where the beam + load sit) */}
        <View style={s.trackArea} onLayout={onLayout}>
          {/* Vertical guideline for current position */}
          {trackWidth > 0 && (
            <View
              style={[
                s.guideline,
                { left: pixelX - 0.5 },
              ]}
            />
          )}

          {/* Load arrow (above beam) */}
          {trackWidth > 0 && (
            <View
              style={[
                s.loadArrowContainer,
                { left: pixelX - 12 },
              ]}
              pointerEvents="none"
            >
              <Text style={s.loadValue}>{loadLabel}</Text>
              <Text style={[s.arrow, { color: statusColor, textShadowColor: statusColor }]}>▼</Text>
            </View>
          )}

          {/* Beam itself */}
          <View style={s.beam} />

          {/* Supports (triangles) */}
          <View style={[s.support, { left: -8 }]} />
          <View style={[s.support, { right: -8 }]} />

          {/* Draggable handle — sits above the beam, on top of everything */}
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
        <Text style={s.miniLabel}>FROM LEFT</Text>
        <Text style={s.distLabel}>{distLabel}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 10,
  },
  miniLabel: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
    width: 95,
  },
  distLabel: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  stage: {
    paddingTop: 30,    // room for arrow + load label above beam
    paddingBottom: 18, // room for handle below
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
  support: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.textMuted,
    transform: [{ rotate: '180deg' }],
  },
  guideline: {
    position: 'absolute',
    top: -24,
    bottom: -14,
    width: 1,
    backgroundColor: colors.border,
  },
  loadArrowContainer: {
    position: 'absolute',
    top: -28,
    alignItems: 'center',
    width: 24,
  },
  loadValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
    width: 80,
    textAlign: 'center',
    marginLeft: -28,
  },
  arrow: {
    fontSize: 14,
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowRadius: 6,
  },
  handle: {
    position: 'absolute',
    top: BEAM_HEIGHT / 2 - HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderWidth: 1,
    borderColor: colors.primary,
    zIndex: 20,
    elevation: 6,
  },
  handleInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  bottomLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    gap: 10,
  },
  lengthLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  lengthLabelTop: { fontSize: 13, color: colors.text, fontWeight: '700' },
});
