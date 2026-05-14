import { View, StyleSheet } from 'react-native';
import Svg, { Line, Path, Rect, Polygon, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../theme/colors';

export interface BeamLoadMarker {
  /** Position along beam in mm */
  a: number;
  /** Optional label drawn near the arrow (e.g. "P", "P1") */
  label?: string;
}

export type SupportKind = 'simple' | 'cantilever-left' | 'single-interior';

interface Props {
  L: number;
  w: number; // distributed self-weight, N/mm (drives the small arrows on the beam)
  /** Where the point load(s) are. Used only for the beam illustration arrows. */
  loads: BeamLoadMarker[];
  /** Support boundary condition for the beam illustration. */
  support: SupportKind;
  /** Used with support='single-interior': pivot position as fraction of L (0–1) */
  supportFrac?: number;
  /** What to render below the beam */
  mode: 'shear' | 'moment' | 'deflection' | 'full';
  /** Samplers — required for whichever curve the mode renders. */
  shearSampler?: (x: number) => number;
  momentSampler?: (x: number) => number;
  deflectionSampler?: (x: number) => number;
  /** Annotation drawn on the most prominent curve. */
  maxLabel?: string;
  height?: number;
}

const PAD_X = 32;
const BEAM_Y = 22;
const N_SAMPLES = 80;

export default function ForceDiagram({
  L,
  w,
  loads,
  support,
  supportFrac,
  mode,
  shearSampler,
  momentSampler,
  deflectionSampler,
  maxLabel,
  height,
}: Props) {
  const sections = mode === 'full' ? 3 : 1;
  const beamSectionH = 60;
  const diagramH = 90;
  const calcH = beamSectionH + sections * diagramH + 20;
  const H = height ?? calcH;
  const W = 320;

  const xs = Array.from({ length: N_SAMPLES + 1 }, (_, i) => (i / N_SAMPLES) * L);
  const shear = shearSampler ? xs.map(shearSampler) : [];
  const moment = momentSampler ? xs.map(momentSampler) : [];
  const defl = deflectionSampler ? xs.map(deflectionSampler) : [];

  const absMax = (arr: number[]) => (arr.length ? Math.max(...arr.map(Math.abs)) : 0);
  const VmaxAbs = absMax(shear);
  const MmaxAbs = absMax(moment);
  const δmaxAbs = absMax(defl);

  const xToPx = (x: number) => PAD_X + (x / L) * (W - 2 * PAD_X);

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
      <SvgText x={W - PAD_X + 4} y={y - 12} fill={colors.textMuted} fontSize="9">
        w
      </SvgText>

      {/* Beam */}
      <Rect
        x={PAD_X}
        y={y - 2}
        width={W - 2 * PAD_X}
        height={6}
        fill={colors.primaryDim}
        stroke={colors.primary}
        strokeWidth={0.5}
      />

      {/* Point load arrows */}
      {loads.map((ld, i) => {
        const aPx = xToPx(ld.a);
        return (
          <G key={i}>
            <Line x1={aPx} y1={y - 30} x2={aPx} y2={y - 4} stroke={colors.primary} strokeWidth={2} />
            <Polygon
              points={`${aPx - 4},${y - 6} ${aPx + 4},${y - 6} ${aPx},${y - 1}`}
              fill={colors.primary}
            />
            <SvgText x={aPx + 6} y={y - 22} fill={colors.text} fontSize="10" fontWeight="700">
              {ld.label ?? 'P'}
            </SvgText>
          </G>
        );
      })}

      {/* Supports */}
      {support === 'simple' && (
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
      )}
      {support === 'cantilever-left' && (
        <G>
          {/* Hatched wall on left */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={i}
              x1={PAD_X - 4}
              y1={y - 14 + i * 6}
              x2={PAD_X - 14}
              y2={y - 6 + i * 6}
              stroke={colors.textMuted}
              strokeWidth={1}
            />
          ))}
          <Line
            x1={PAD_X - 4}
            y1={y - 14}
            x2={PAD_X - 4}
            y2={y + 20}
            stroke={colors.textMuted}
            strokeWidth={1.5}
          />
          <SvgText x={PAD_X - 20} y={y + 32} fill={colors.success} fontSize="9">
            FIXED
          </SvgText>
        </G>
      )}

      {support === 'single-interior' && supportFrac !== undefined && (
        <G>
          {/* Pivot triangle below beam */}
          {(() => {
            const px = PAD_X + supportFrac * (W - 2 * PAD_X);
            return (
              <G>
                <Polygon
                  points={`${px - 5},${y + 10} ${px + 5},${y + 10} ${px},${y + 3}`}
                  fill={colors.success}
                />
                <SvgText x={px} y={y + 22} fill={colors.success} fontSize="9" textAnchor="middle">
                  R
                </SvgText>
              </G>
            );
          })()}
        </G>
      )}

      {/* Length tick */}
      <SvgText x={W / 2} y={y + 40} fill={colors.textMuted} fontSize="10" textAnchor="middle">
        L
      </SvgText>
    </G>
  );

  const renderDiagram = (
    yTop: number,
    label: string,
    values: number[],
    maxAbs: number,
    showMaxLabel?: string,
    invertSign = false
  ) => {
    if (!values.length) return null;
    const yMid = yTop + diagramH / 2;
    const half = diagramH * 0.4;
    const sign = invertSign ? -1 : 1;
    const valToPx = (v: number) => yMid - (maxAbs > 0 ? (sign * v / maxAbs) * half : 0);

    let d = `M ${xToPx(0)} ${yMid}`;
    values.forEach((v, i) => {
      d += ` L ${xToPx(xs[i])} ${valToPx(v)}`;
    });
    d += ` L ${xToPx(L)} ${yMid} Z`;

    let maxIdx = 0;
    let maxVal = 0;
    values.forEach((v, i) => {
      const a = Math.abs(v);
      if (a > maxVal) {
        maxVal = a;
        maxIdx = i;
      }
    });
    const maxPx = xToPx(xs[maxIdx]);
    const maxValPx = valToPx(values[maxIdx]);

    return (
      <G>
        <SvgText x={6} y={yMid + 4} fill={colors.textMuted} fontSize="10" fontWeight="700">
          {label}
        </SvgText>
        <Line x1={PAD_X} y1={yMid} x2={W - PAD_X} y2={yMid} stroke={colors.textDim} strokeWidth={0.5} />
        <Path d={d} fill="rgba(0,212,255,0.25)" stroke={colors.primary} strokeWidth={1.5} />
        {showMaxLabel && (
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
              {showMaxLabel}
            </SvgText>
          </G>
        )}
      </G>
    );
  };

  let cursor = BEAM_Y + 16;
  const beamY = cursor;
  cursor = beamY + 50;

  return (
    <View style={s.container}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {renderBeam(beamY)}
        {mode === 'full' && (
          <>
            {renderDiagram(cursor, 'V', shear, VmaxAbs, maxLabel)}
            {renderDiagram(cursor + diagramH, 'M', moment, MmaxAbs, maxLabel)}
          </>
        )}
        {mode === 'shear' && renderDiagram(cursor, 'V', shear, VmaxAbs, maxLabel)}
        {mode === 'moment' && renderDiagram(cursor, 'M', moment, MmaxAbs, maxLabel)}
        {mode === 'deflection' &&
          renderDiagram(cursor, 'δ', defl, δmaxAbs, maxLabel, /* invert */ true)}
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
