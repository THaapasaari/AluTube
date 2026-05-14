import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { LoadStatus } from './BeamDiagram';
import { usePagerScroll } from '../hooks/usePagerScroll';

interface Props {
  L_mm: number;
  a1_mm: number;
  a2_mm: number;
  onChange1: (a_mm: number) => void;
  onChange2: (a_mm: number) => void;
  imperial: boolean;
  P1_kg: number;
  P2_kg: number;
  status?: LoadStatus;
  R_A_kN?: number;
  R_B_kN?: number;
}

const PADDING = 24;
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

export default function BeamDiagramTwoLoads({
  L_mm,
  a1_mm,
  a2_mm,
  onChange1,
  onChange2,
  imperial,
  P1_kg,
  P2_kg,
  status = 'safe',
  R_A_kN,
  R_B_kN,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const statusColor =
    status === 'danger' ? colors.danger : status === 'warning' ? colors.warning : colors.success;

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const totalLabel = imperial
    ? `${(L_mm / 25.4 / 12).toFixed(2)} ft`
    : `${(L_mm / 1000).toFixed(2)} m`;

  const distLabel = (mm: number) =>
    imperial
      ? `${(mm / 25.4).toFixed(1)} in`
      : mm >= 1000
      ? `${(mm / 1000).toFixed(2)} m`
      : `${mm.toFixed(0)} mm`;
  const loadLabel = (kg: number) =>
    imperial ? `${(kg * 2.20462).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.miniLabel}>TUBE LENGTH</Text>
        <Text style={s.lengthLabelTop}>{totalLabel}</Text>
      </View>

      <View style={s.stage}>
        <View style={s.trackArea} onLayout={onLayout}>
          <View style={s.beam} />
          <View style={[s.support, { left: -8 }]} />
          <View style={[s.support, { right: -8 }]} />

          {/* Reaction force labels above each support */}
          {R_A_kN !== undefined && (
            <Text pointerEvents="none" style={[s.reactionLabel, { left: 0 }]}>{R_A_kN.toFixed(2)} kN</Text>
          )}
          {R_B_kN !== undefined && (
            <Text pointerEvents="none" style={[s.reactionLabel, { right: 0, textAlign: 'right' }]}>{R_B_kN.toFixed(2)} kN</Text>
          )}

          {trackWidth > 0 && (
            <>
              <Handle
                trackWidth={trackWidth}
                L_mm={L_mm}
                a_mm={a1_mm}
                P_kg={P1_kg}
                label="P1"
                onChange={onChange1}
                imperial={imperial}
                color={statusColor}
                loadLabel={loadLabel(P1_kg)}
                isAbove
              />
              <Handle
                trackWidth={trackWidth}
                L_mm={L_mm}
                a_mm={a2_mm}
                P_kg={P2_kg}
                label="P2"
                onChange={onChange2}
                imperial={imperial}
                color={statusColor}
                loadLabel={loadLabel(P2_kg)}
                isAbove={false}
              />
            </>
          )}
        </View>
      </View>

      <View style={s.bottomLabels}>
        <View style={s.bottomLabelRow}>
          <Text style={s.miniLabel}>P1 FROM LEFT</Text>
          <Text style={s.distLabel}>{distLabel(a1_mm)}</Text>
        </View>
        <View style={s.bottomLabelRow}>
          <Text style={s.miniLabel}>P2 FROM LEFT</Text>
          <Text style={s.distLabel}>{distLabel(a2_mm)}</Text>
        </View>
      </View>
    </View>
  );
}

interface HandleProps {
  trackWidth: number;
  L_mm: number;
  a_mm: number;
  P_kg: number;
  label: string;
  onChange: (a_mm: number) => void;
  imperial: boolean;
  color: string;
  loadLabel: string;
  /** If true, draw the load label ABOVE the beam; else stack labels visually separated. */
  isAbove: boolean;
}

function Handle({
  trackWidth,
  L_mm,
  a_mm,
  label,
  onChange,
  color,
  loadLabel,
}: HandleProps) {
  const pixelX = (Math.max(0, Math.min(L_mm, a_mm)) / L_mm) * trackWidth;
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
          startPixelRef.current = w > 0 ? (aRef.current / LRef.current) * w : 0;
        },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          const newPixel = Math.max(0, Math.min(w, startPixelRef.current + g.dx));
          onChangeRef.current((newPixel / w) * LRef.current);
        },
        onPanResponderRelease: (_, g) => {
          setPagerScrollRef.current(true);
          const travel = Math.hypot(g.dx, g.dy);
          if (travel <= TAP_MAX_TRAVEL) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onChangeRef.current(LRef.current / 2);
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

  return (
    <>
      <View style={[s.guideline, { left: pixelX - 0.5 }]} />
      <View style={[s.loadArrowContainer, { left: pixelX - 12 }]} pointerEvents="none">
        <Text style={s.loadValue}>{label}: {loadLabel}</Text>
        <Text style={[s.arrow, { color, textShadowColor: color }]}>▼</Text>
      </View>
      <View
        {...panResponder.panHandlers}
        hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
        style={[
          s.handle,
          {
            left: pixelX - HANDLE_SIZE / 2,
            borderColor: color,
            backgroundColor: alphaFor(color, 0.18),
          },
        ]}
      >
        <View style={[s.handleInner, { backgroundColor: color }]} />
      </View>
    </>
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
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
    width: 100,
    textAlign: 'center',
    marginLeft: -38,
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
  reactionLabel: {
    position: 'absolute',
    top: -18,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    width: 64,
  },
  bottomLabels: { gap: 2 },
  bottomLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 10,
  },
});
