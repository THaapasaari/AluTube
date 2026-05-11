import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { useSettings } from '../../src/hooks/useSettings';
import {
  calcResults,
  inToMm,
  mmToIn,
  ftToM,
  mToFt,
  lbsToKg,
  kgToLbs,
  NmToFtLb,
} from '../../src/engineering/calculations';

const DF_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function CalculatorScreen() {
  const { units } = useSettings();
  const imperial = units === 'imperial';

  // Raw string inputs
  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('4.3');
  const [length, setLength] = useState('4');
  const [load, setLoad] = useState('25');
  const [isCenter, setIsCenter] = useState(true);
  const [distance, setDistance] = useState('1000');
  const [df, setDf] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  const toggleAdvanced = (key: string) =>
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));

  // Convert inputs to SI (mm / kg)
  const siInputs = useMemo(() => {
    const d_o = imperial ? inToMm(parseFloat(diameter) || 0) : parseFloat(diameter) || 0;
    const t = imperial ? inToMm(parseFloat(thickness) || 0) : parseFloat(thickness) || 0;
    const Lm = parseFloat(length) || 0;
    const L = imperial ? ftToM(Lm) * 1000 : Lm * 1000; // → mm
    const P_kg = imperial ? lbsToKg(parseFloat(load) || 0) : parseFloat(load) || 0;
    const a = imperial ? inToMm(parseFloat(distance) || 0) : parseFloat(distance) || 0;
    return { d_o, t, L, P_kg, isCenter, a, DF: df };
  }, [diameter, thickness, length, load, isCenter, distance, df, imperial]);

  const valid =
    siInputs.d_o > 0 &&
    siInputs.t > 0 &&
    siInputs.t < siInputs.d_o / 2 &&
    siInputs.L > 0 &&
    siInputs.P_kg >= 0;

  const r = useMemo(() => (valid ? calcResults(siInputs) : null), [siInputs, valid]);

  // Haptic feedback when limits breached
  const prevOver = useMemo(() => r?.isDeflectionOver || r?.isTensionOver || r?.isTorqueOver, [r]);
  if (prevOver) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

  const dUnit = imperial ? 'in' : 'mm';
  const lUnit = imperial ? "ft" : 'm';
  const mUnit = imperial ? 'lbs' : 'kg';

  const dispDefl = (mm: number) => (imperial ? mmToIn(mm).toFixed(3) : mm.toFixed(2));
  const dispLoad = (kg: number) => (imperial ? kgToLbs(kg).toFixed(1) : kg.toFixed(2));
  const dispMoment = (Nmm: number) => {
    const Nm = Nmm / 1000;
    return imperial ? NmToFtLb(Nm).toFixed(1) : Nm.toFixed(1);
  };
  const momentUnit = imperial ? 'ft·lbf' : 'Nm';

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.heading}>AluTube</Text>
          <Text style={s.sub}>6061-T6 Aluminium  ·  {units === 'metric' ? 'Metric' : 'Imperial'}</Text>

          {/* ── Inputs ───────────────────────────────────── */}
          <SectionHeader title="Tube Dimensions" />
          <View style={s.card}>
            <InputRow
              label={`Outer Diameter  (${dUnit})`}
              value={diameter}
              onChangeText={setDiameter}
              placeholder={imperial ? '1.89' : '48'}
            />
            <Divider />
            <InputRow
              label={`Wall Thickness  (${dUnit})`}
              value={thickness}
              onChangeText={setThickness}
              placeholder={imperial ? '0.17' : '4.3'}
            />
            <Divider />
            <InputRow
              label={`Length  (${lUnit})`}
              value={length}
              onChangeText={setLength}
              placeholder={imperial ? '13.1' : '4'}
            />
          </View>

          <SectionHeader title="Load" />
          <View style={s.card}>
            <InputRow
              label={`Point Load  (${mUnit})`}
              value={load}
              onChangeText={setLoad}
              placeholder={imperial ? '55' : '25'}
            />
            <Divider />
            {/* CPL toggle */}
            <View style={s.row}>
              <Text style={s.label}>Load Position</Text>
              <View style={s.segmentRow}>
                <SegBtn label="Centre" active={isCenter} onPress={() => setIsCenter(true)} />
                <SegBtn label="Custom" active={!isCenter} onPress={() => setIsCenter(false)} />
              </View>
            </View>
            {!isCenter && (
              <>
                <Divider />
                <InputRow
                  label={`Distance from End  (${dUnit})`}
                  value={distance}
                  onChangeText={setDistance}
                  placeholder={imperial ? '39.4' : '1000'}
                />
              </>
            )}
            <Divider />
            {/* Design Factor */}
            <View style={s.row}>
              <Text style={s.label}>Design Factor</Text>
              <View style={s.dfRow}>
                {DF_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[s.dfBtn, df === n && s.dfActive]}
                    onPress={() => setDf(n)}
                  >
                    <Text style={[s.dfText, df === n && s.dfTextActive]}>{n}:1</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Derived tube info ──────────────────────── */}
          {r && (
            <>
              <SectionHeader title="Tube Properties" />
              <View style={[s.card, s.derivedCard]}>
                <DerivedRow label="Inner Diameter" value={`${imperial ? mmToIn(r.props.d_i).toFixed(3) : r.props.d_i.toFixed(1)} ${dUnit}`} />
                <DerivedRow label="Cross-Section Area" value={`${imperial ? (r.props.A / 645.16).toFixed(4) : r.props.A.toFixed(1)} ${imperial ? 'in²' : 'mm²'}`} />
                <DerivedRow label="Tube Weight" value={`${dispLoad(r.tubeWeight)} ${mUnit}`} />
                <DerivedRow label="Total Load (tube + point)" value={`${dispLoad(r.totalLoad)} ${mUnit}`} />
              </View>

              {/* ── Results ──────────────────────────────── */}
              <SectionHeader title="Results" />

              <ResultCard
                title="Deflection"
                current={`${dispDefl(r.totalDelta)} ${imperial ? 'in' : 'mm'}`}
                limit={`${dispDefl(r.limits.maxDeflection)} ${imperial ? 'in' : 'mm'} (L/120)`}
                ratio={r.deflectionRatio}
                over={r.isDeflectionOver}
                advKey="defl"
                showAdv={!!showAdvanced['defl']}
                onToggleAdv={() => toggleAdvanced('defl')}
                advContent={
                  <>
                    <AdvRow label="Self-weight deflection (δ_self)" value={`${dispDefl(r.self.deltaS)} ${imperial ? 'in' : 'mm'}`} />
                    <AdvRow label="Point load deflection (δ_point)" value={`${dispDefl(r.point.deltaPoint)} ${imperial ? 'in' : 'mm'}`} />
                    <AdvRow label="Formula (CPL)" value="δ = PL³ / (48EI)" />
                    <AdvRow label="Self-weight formula" value="δ = 5wL⁴ / (384EI)" />
                    <AdvRow label="Limit source" value="L/120 serviceability" />
                  </>
                }
              />

              <ResultCard
                title="Max Safe Point Load"
                current={`${dispLoad(siInputs.P_kg)} ${mUnit}  (applied)`}
                limit={`${dispLoad(r.limits.maxPointLoad)} ${mUnit}  (deflection limit)`}
                ratio={siInputs.P_kg / r.limits.maxPointLoad}
                over={siInputs.P_kg > r.limits.maxPointLoad}
                advKey="load"
                showAdv={!!showAdvanced['load']}
                onToggleAdv={() => toggleAdvanced('load')}
                advContent={
                  <>
                    <AdvRow label="Max load (stress)" value={`${dispLoad(r.limits.maxPointLoadStress)} ${mUnit}`} />
                    <AdvRow label="Governing limit" value={r.limits.maxPointLoad <= r.limits.maxPointLoadStress ? 'Deflection' : 'Stress'} />
                    <AdvRow label="Design Factor" value={`${df}:1`} />
                    <AdvRow label="Yield Strength" value="255 N/mm²  (6061-T6)" />
                  </>
                }
              />

              <ResultCard
                title="Bending Moment"
                current={`${dispMoment(r.totalMoment)} ${momentUnit}`}
                limit={`${dispMoment(r.limits.maxTorque)} ${momentUnit}`}
                ratio={r.torqueRatio}
                over={r.isTorqueOver}
                advKey="torq"
                showAdv={!!showAdvanced['torq']}
                onToggleAdv={() => toggleAdvanced('torq')}
                advContent={
                  <>
                    <AdvRow label="Self-weight moment (M_self)" value={`${dispMoment(r.self.Mself)} ${momentUnit}`} />
                    <AdvRow label="Point load moment (M_point)" value={`${dispMoment(r.point.Mpoint)} ${momentUnit}`} />
                    <AdvRow label="Formula (CPL)" value="M = PL / 4" />
                    <AdvRow label="Section modulus (Z)" value={`${r.props.Z.toFixed(0)} mm³`} />
                    <AdvRow label="Max = σ_allow × Z" value={`(255/${df}) × ${r.props.Z.toFixed(0)}`} />
                  </>
                }
              />

              <ResultCard
                title="Bending Stress"
                current={`${r.tension.toFixed(2)} N/mm²`}
                limit={`${r.limits.maxTension.toFixed(1)} N/mm²  (σ_yield/${df})`}
                ratio={r.tensionRatio}
                over={r.isTensionOver}
                advKey="tens"
                showAdv={!!showAdvanced['tens']}
                onToggleAdv={() => toggleAdvanced('tens')}
                advContent={
                  <>
                    <AdvRow label="Formula" value="σ = M × (d_o/2) / I" />
                    <AdvRow label="I (second moment)" value={`${r.props.I.toFixed(0)} mm⁴`} />
                    <AdvRow label="Allowable stress" value={`255 / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`} />
                    <AdvRow label="Utilisation" value={`${(r.tensionRatio * 100).toFixed(1)}%`} />
                  </>
                }
              />
            </>
          )}

          {!valid && (
            <View style={s.noResultBox}>
              <Text style={s.noResultText}>Enter valid tube dimensions and load to see results.</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primary}
      />
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function SegBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.segBtn, active && s.segActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DerivedRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.derivedRow}>
      <Text style={s.derivedLabel}>{label}</Text>
      <Text style={s.derivedValue}>{value}</Text>
    </View>
  );
}

function AdvRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.advRow}>
      <Text style={s.advLabel}>{label}</Text>
      <Text style={s.advValue}>{value}</Text>
    </View>
  );
}

function ResultCard({
  title,
  current,
  limit,
  ratio,
  over,
  advKey,
  showAdv,
  onToggleAdv,
  advContent,
}: {
  title: string;
  current: string;
  limit: string;
  ratio: number;
  over: boolean;
  advKey: string;
  showAdv: boolean;
  onToggleAdv: () => void;
  advContent: React.ReactNode;
}) {
  const warn = !over && ratio > 0.9;
  const barColor = over ? colors.danger : warn ? colors.warning : colors.success;
  const clampedRatio = Math.min(ratio, 1);

  return (
    <View style={[s.resultCard, over && s.resultCardOver]}>
      <View style={s.resultHeader}>
        <Text style={[s.resultTitle, over && s.resultTitleOver]}>{title}</Text>
        {over && <Text style={s.overTag}>OVER LIMIT</Text>}
      </View>

      <View style={s.resultRow}>
        <Text style={s.resultLabel}>Current</Text>
        <Text style={[s.resultValue, over && s.resultValueOver]}>{current}</Text>
      </View>
      <View style={s.resultRow}>
        <Text style={s.resultLabel}>Max allowed</Text>
        <Text style={s.resultValueLimit}>{limit}</Text>
      </View>

      {/* Progress bar */}
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${clampedRatio * 100}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[s.barPct, { color: barColor }]}>
        {(ratio * 100).toFixed(1)}% of limit
      </Text>

      {/* Advanced toggle */}
      <TouchableOpacity style={s.advToggle} onPress={onToggleAdv} activeOpacity={0.6}>
        <Text style={s.advToggleText}>{showAdv ? '▲ Hide details' : '▼ Show details'}</Text>
      </TouchableOpacity>

      {showAdv && <View style={s.advBlock}>{advContent}</View>}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 24, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 8,
  },
  label: { fontSize: 14, color: colors.textMuted, flex: 1 },
  input: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: -16 },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  segActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,212,255,0.12)' },
  segText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  segTextActive: { color: colors.primary },
  dfRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  dfBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  dfActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,212,255,0.15)' },
  dfText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dfTextActive: { color: colors.primary },
  derivedCard: { paddingVertical: 4 },
  derivedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  derivedLabel: { fontSize: 13, color: colors.textMuted },
  derivedValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  resultCardOver: { borderColor: colors.danger, backgroundColor: 'rgba(255,68,68,0.06)' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  resultTitleOver: { color: colors.danger },
  overTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    backgroundColor: 'rgba(255,68,68,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultLabel: { fontSize: 13, color: colors.textMuted },
  resultValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  resultValueOver: { color: colors.danger },
  resultValueLimit: { fontSize: 13, color: colors.textMuted },
  barBg: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barPct: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'right' },
  advToggle: { marginTop: 12, alignSelf: 'flex-start' },
  advToggleText: { fontSize: 12, color: colors.primaryDim, fontWeight: '600' },
  advBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  advRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  advLabel: { fontSize: 12, color: colors.textMuted, flex: 1 },
  advValue: { fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'right', flex: 1 },
  noResultBox: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  noResultText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
