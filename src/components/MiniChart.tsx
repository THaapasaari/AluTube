import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  segments: Segment[];     // contributions that add to "current"
  limit: number;            // max allowed (full-scale on chart)
  unit: string;
}

/**
 * Horizontal stacked bar showing how the current value is composed
 * (e.g. self-weight contribution + point-load contribution) compared
 * to the limit. The bar scales such that the limit equals 100% width.
 */
export default function MiniChart({ title, segments, limit, unit }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  // Scale factor — use max(total, limit) so overflow shows visually
  const scaleMax = Math.max(total, limit) * 1.05;

  return (
    <View style={s.box}>
      <Text style={s.title}>{title}</Text>

      <View style={s.barTrack}>
        {/* Limit line marker */}
        <View
          style={[s.limitMarker, { left: `${(limit / scaleMax) * 100}%` }]}
        />

        {/* Stacked segments */}
        <View style={s.barInner}>
          {segments.map((seg, i) => (
            <View
              key={i}
              style={{
                width: `${(seg.value / scaleMax) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ))}
        </View>
      </View>

      <View style={s.legend}>
        {segments.map((seg, i) => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
            <Text style={s.legendText}>
              {seg.label}{' '}
              <Text style={s.legendValue}>
                {seg.value.toFixed(2)} {unit}
              </Text>
            </Text>
          </View>
        ))}
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textMuted }]} />
          <Text style={s.legendText}>
            Limit{' '}
            <Text style={s.legendValue}>
              {limit.toFixed(2)} {unit}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 8 },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  barTrack: {
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  barInner: {
    flexDirection: 'row',
    height: '100%',
  },
  limitMarker: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 2,
    backgroundColor: colors.warning,
    zIndex: 10,
  },
  legend: { marginTop: 10, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: colors.textMuted },
  legendValue: { color: colors.text, fontWeight: '600' },
});
