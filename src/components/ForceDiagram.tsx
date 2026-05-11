import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Rect, Polygon, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  /** Tube length in mm */
  L: number;
  /** Distance from left support to point load in mm */
  a: number;
  /** Point load in N */
  P: number;
  /** Distributed self-weight in N/mm */
  w: number;
  /** Which diagrams to show */
  mode: 'shear' | 'moment' | 'deflection' | 'full';
  /** Height of the SVG canvas */
  height?: number;
  /** Optional pre-computed deflected shape sampler */
  deflectionSampler?: (x: number) => number; // returns δ in mm
  /** Label override for the max value annotation */
  maxLabel?: string;
}

const PAD_X = 32;
const BEAM_Y = 22;
const N_SAMPLES = 80;

export default function ForceDiagram({
  L,
  a,
  P,
  w,
  mode,
  height,
  deflectionSampler,
  maxLabel,
}: Props) {
  // Total canvas height depends on mode
  const sections = mode === 'full' ? 3 : 1;
  const beamSectionH = 60;
  const diagramH = 90;
  const calcH = beamSectionH + sections * diagramH + 20;
  const H = height ?? calcH;
  const W = 320; // viewBox width; SVG auto-scales

  // Reactions
  const b = L - a;
  const R_A = (P * b) / L + (w * L) / 2;
  const R_B = (P * a) / L + (w * L) / 2;

  // Shear and moment functions
  const shearAt = (x: number) => {
    let V = R_A - w * x;
    if (x > a) V -= P;
    return V;
  };
  const momentAt = (x: number) => {
    let M = R_A * x - (w * x * x) / 2;
    if (x > a) M -= P * (x - a);
    return M;
  };

  // Sample
  const samples = Array.from({ length: N_SAMPLES + 1 }, (_, i) => {
    const x = (i / N_SAMPLES) * L;
    return { x, V: shearAt(x), M: momentAt(x), δ: deflectionSampler?.(x) ?? 0 };
  });

  // Extremes for scaling
  const VmaxAbs = Math.max(...samples.map((s) => Math.abs(s.V)));
  const MmaxAbs = Math.max(...samples.map((s) => Math.abs(s.M)));
  const δmaxAbs = Math.max(...samples.map((s) => Math.abs(s.δ)));

  // Pixel mapping
  const xToPx = (x: number) => PAD_X + (x / L) * (W - 2 * PAD_X);
  const aPx = xToPx(a);

  // Render sub-pieces
  const renderBeam = (y: number) => (
    <G>
      {/* Distributed load arrows */}
      {Array.from({ length: 12 }).map((_, i) => {
        const px = PAD_X + ((i + 0.5) / 12) * (W - 2 * PAD_X);
        return (
          <G key={i}>
            <Line x1={px} y1={y - 18} x2={px} y2={y - 4} stroke={colors.primaryDim} strokeWidth={1} />
            <Polygon
              points={`${px - 2},${y - 6} ${px + 2},${y - 6} ${px},${y - 2}`}
              fill={colors.primaryDim}
            />
          </G>
        );
      })}
      {/* w label */}
      <SvgText x={W - PAD_X + 4} y={y - 12} fill={colors.textMuted} fontSize="9">
        w
      </SvgText>

      {/* The beam itself */}
      <Rect
        x={PAD_X}
        y={y - 2}
        width={W - 2 * PAD_X}
        height={6}
        fill={colors.primaryDim}
        stroke={colors.primary}
        strokeWidth={0.5}
      />

      {/* Point load arrow */}
      <G>
        <Line x1={aPx} y1={y - 30} x2={aPx} y2={y - 4} stroke={colors.primary} strokeWidth={2} />
        <Polygon
          points={`${aPx - 4},${y - 6} ${aPx + 4},${y - 6} ${aPx},${y - 1}`}
          fill={colors.primary}
        />
        <SvgText x={aPx + 6} y={y - 22} fill={colors.text} fontSize="10" fontWeight="700">
          P
        </SvgText>
      </G>

      {/* Reaction arrows pointing up at supports */}
      <G>
        <Line x1={PAD_X} y1={y + 22} x2={PAD_X} y2={y + 6} stroke={colors.success} strokeWidth={2} />
        <Polygon
          points={`${PAD_X - 4},${y + 9} ${PAD_X + 4},${y + 9} ${PAD_X},${y + 4}`}
          fill={colors.success}
        />
        <SvgText x={PAD_X - 18} y={y + 20} fill={colors.success} fontSize="9">
          R_A
        </SvgText>

        <Line x1={W - PAD_X} y1={y + 22} x2={W - PAD_X} y2={y + 6} stroke={colors.success} strokeWidth={2} />
        <Polygon
          points={`${W - PAD_X - 4},${y + 9} ${W - PAD_X + 4},${y + 9} ${W - PAD_X},${y + 4}`}
          fill={colors.success}
        />
        <SvgText x={W - PAD_X + 4} y={y + 20} fill={colors.success} fontSize="9">
          R_B
        </SvgText>
      </G>

      {/* Length label */}
      <SvgText
        x={W / 2}
        y={y + 40}
        fill={colors.textMuted}
        fontSize="10"
        textAnchor="middle"
      >
        L
      </SvgText>
      {/* a label tick */}
      <Line x1={PAD_X} y1={y + 33} x2={aPx} y2={y + 33} stroke={colors.textMuted} strokeWidth={0.5} />
      <SvgText x={(PAD_X + aPx) / 2} y={y + 31} fill={colors.textMuted} fontSize="9" textAnchor="middle">
        a
      </SvgText>
    </G>
  );

  // Diagram (V, M, or δ) — fills the area between curve and baseline
  const renderDiagram = (
    yTop: number,
    label: string,
    maxAbs: number,
    accessor: (s: typeof samples[number]) => number,
    maxValueLabel?: string
  ) => {
    const yMid = yTop + diagramH / 2;
    const half = diagramH * 0.4;
    const valToPx = (v: number) => yMid - (maxAbs > 0 ? (v / maxAbs) * half : 0);

    // Build a path that goes baseline → curve → baseline
    let d = `M ${xToPx(0)} ${yMid}`;
    samples.forEach((s) => {
      d += ` L ${xToPx(s.x)} ${valToPx(accessor(s))}`;
    });
    d += ` L ${xToPx(L)} ${yMid} Z`;

    // Find max value location for annotation
    let maxIdx = 0;
    let maxVal = 0;
    samples.forEach((s, i) => {
      const v = Math.abs(accessor(s));
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    });
    const maxPx = xToPx(samples[maxIdx].x);
    const maxValPx = valToPx(accessor(samples[maxIdx]));

    return (
      <G>
        {/* Y-axis label */}
        <SvgText x={6} y={yMid + 4} fill={colors.textMuted} fontSize="10" fontWeight="700">
          {label}
        </SvgText>

        {/* Baseline (zero line) */}
        <Line
          x1={PAD_X}
          y1={yMid}
          x2={W - PAD_X}
          y2={yMid}
          stroke={colors.textDim}
          strokeWidth={0.5}
        />

        {/* The filled curve */}
        <Path d={d} fill="rgba(0,212,255,0.25)" stroke={colors.primary} strokeWidth={1.5} />

        {/* Max value annotation */}
        {maxValueLabel && (
          <G>
            <Line
              x1={maxPx}
              y1={maxValPx}
              x2={maxPx}
              y2={maxValPx - 14}
              stroke={colors.warning}
              strokeWidth={0.8}
              strokeDasharray="2 2"
            />
            <SvgText
              x={maxPx}
              y={maxValPx - 17}
              fill={colors.warning}
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
            >
              {maxValueLabel}
            </SvgText>
          </G>
        )}
      </G>
    );
  };

  let cursor = BEAM_Y;
  let beamY = 0;

  return (
    <View style={s.container}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {mode === 'full' && (
          <>
            {renderBeam((beamY = cursor + 16))}
            {(cursor = beamY + 50) && null}
            {renderDiagram(cursor, 'V', VmaxAbs, (s) => s.V, maxLabel)}
            {(cursor = cursor + diagramH) && null}
            {renderDiagram(cursor, 'M', MmaxAbs, (s) => s.M, maxLabel)}
          </>
        )}
        {mode === 'shear' && (
          <>
            {renderBeam((beamY = cursor + 16))}
            {(cursor = beamY + 50) && null}
            {renderDiagram(cursor, 'V', VmaxAbs, (s) => s.V, maxLabel)}
          </>
        )}
        {mode === 'moment' && (
          <>
            {renderBeam((beamY = cursor + 16))}
            {(cursor = beamY + 50) && null}
            {renderDiagram(cursor, 'M', MmaxAbs, (s) => s.M, maxLabel)}
          </>
        )}
        {mode === 'deflection' && (
          <>
            {renderBeam((beamY = cursor + 16))}
            {(cursor = beamY + 50) && null}
            {renderDiagram(cursor, 'δ', δmaxAbs, (s) => -s.δ, maxLabel)}
            {/* δ is plotted negative so the curve bows downward like real deflection */}
          </>
        )}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,32,64,0.5)',
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 8,
  },
});
