import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { LoadStatus } from './BeamDiagram';

interface Props {
  L_mm: number;
  a_mm: number;
  onChange: (a_mm: number) => void;
  imperial: boolean;
  P_kg: number;
  status?: LoadStatus;
}

const PADDING_RIGHT = 24;
const PADDING_LEFT = 32; // extra room for the fixed-wall hatching on the left
const BEAM_HEIGHT = 7.5;
const HANDLE_SIZE = 28;
const TAP_MAX_TRAVEL = 6;
const DOUBLE_TAP_MS = 280;

function alphaFor(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(0,212,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}

export default function BeamDiagramCantilever({
  L_mm,
  a_mm,
  onChange,
  imperial,
  P_kg,
  status = 'safe',
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const displayA = Math.max(0, Math.min(L_mm, a_mm));
  const pixelX = trackWidth > 0 ? (displayA / L_mm) * trackWidth : 0;

  const statusColor =
    status === 'danger' ? colors.danger : status === 'warning' ? colors.warning : colors.success;

  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const LRef = useRef(L_mm);
  LRef.current = L_mm;
  const aRef = useRef(a_mm);
  aRef.current = a_mm;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const startPixelRef = useRef(0);
  const lastTapRef = useRef(0);

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
          const w = trackWidthRef.current;
          startPixelRef.current = w > 0 ? (aRef.current / LRef.current) * w : 0;
        },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          const newPixel = Math.max(0, Math.min(w, startPixelRef.current + g.dx));
          onChangeRef.current((newPixel / w) * LRef.current);
        },
        onPanResponderRelease: (_, g) => {
          // Double-tap → snap to tip
          const travel = Math.hypot(g.dx, g.dy);
          if (travel <= TAP_MAX_TRAVEL) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onChangeRef.current(LRef.current); // jump to tip
              lastTapRef.current = 0;
            } else {
              lastTapRef.current = now;
            }
          }
        },
      }),
    []
  );

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const distLabel = imperial
    ? `${(displayA / 25.4).toFixed(1)} in`
    : displayA >= 1000
    ? `${(displayA / 1000).toFixed(2)} m`
    : `${displayA.toFixed(0)} mm`;
  const totalLabel = imperial
    ? `${(L_mm / 25.4 / 12).toFixed(2)} ft`
    : `${(L_mm / 1000).toFixed(2)} m`;
  const loadLabel = imperial ? `${(P_kg * 2.20462).toFixed(1)} lbs` : `${P_kg.toFixed(1)} kg`;

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.miniLabel}>TUBE LENGTH</Text>
        <Text style={s.lengthLabelTop}>{totalLabel}</Text>
      </View>

      <View style={s.stage}>
        {/* Fixed-end "wall" hatching */}
        <View style={s.wall}>
          <Svg width={14} height={56}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Line
                key={i}
                x1={14}
                y1={i * 10}
                x2={0}
                y2={i * 10 + 14}
                stroke={colors.textMuted}
                strokeWidth={1}
              />
            ))}
            <Line x1={14} y1={0} x2={14} y2={56} stroke={colors.textMuted} strokeWidth={1.5} />
          </Svg>
        </View>

        {/* Track */}
        <View style={s.trackArea} onLayout={onLayout}>
          {trackWidth > 0 && (
            <View style={[s.guideline, { left: pixelX - 0.5 }]} />
          )}

          {trackWidth > 0 && (
            <View
              style={[s.loadArrowContainer, { left: pixelX - 12 }]}
              pointerEvents="none"
            >
              <Text style={s.loadValue}>{loadLabel}</Text>
              <Text style={[s.arrow, { color: statusColor, textShadowColor: statusColor }]}>▼</Text>
            </View>
          )}

          <View style={s.beam} />

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
        <Text style={s.miniLabel}>FROM FIXED END</Text>
        <Text style={s.distLabel}>{distLabel}</Text>
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
    width: 110,
    textAlign: 'right',
  },
  lengthLabelTop: { fontSize: 13, color: colors.text, fontWeight: '700' },
  distLabel: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  stage: {
    paddingTop: 30,
    paddingBottom: 18,
    paddingLeft: PADDING_LEFT,
    paddingRight: PADDING_RIGHT,
    position: 'relative',
  },
  wall: {
    position: 'absolute',
    left: 12,
    top: 14,
    width: 14,
    height: 56,
    justifyContent: 'center',
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
