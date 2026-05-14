import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { useSettings } from '../../src/hooks/useSettings';
import { usePresets, TubePreset } from '../../src/hooks/usePresets';
import {
  calcResults,
  deflectionAt,
  inToMm,
  mmToIn,
  ftToM,
  mToFt,
  lbsToKg,
  kgToLbs,
  NmToFtLb,
} from '../../src/engineering/calculations';
import BeamDiagram from '../../src/components/BeamDiagram';
import ForceDiagram from '../../src/components/ForceDiagram';
import {
  SectionHeader,
  InputRow,
  Divider,
  DerivedRow,
  AdvRow,
  ResultCard,
  DFReminder,
  NoResultBox,
  PresetChipStrip,
  SavePresetModal,
  AppHeader,
  ui,
} from '../../src/components/CalculatorUI';

export default function CalculatorScreen() {
  const { units, df, material } = useSettings();
  const imperial = units === 'imperial';

  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('5');
  const [length, setLength] = useState('4');
  const [load, setLoad] = useState('10');
  const [isCenter, setIsCenter] = useState(true);
  const [distance, setDistance] = useState('1000');
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const { presets, add: addPreset, remove: removePreset } = usePresets();
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const toggleAdvanced = (key: string) =>
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    Alert.alert('Reset inputs?', 'Restores tube, load and position to defaults.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setDiameter(imperial ? mmToIn(48).toFixed(3) : '48');
          setThickness(imperial ? mmToIn(5).toFixed(3) : '5');
          setLength(imperial ? mToFt(4).toFixed(2) : '4');
          setLoad(imperial ? kgToLbs(10).toFixed(1) : '10');
          setDistance(imperial ? mmToIn(1000).toFixed(1) : '1000');
          setIsCenter(true);
        },
      },
    ]);
  };

  const loadPreset = (p: TubePreset) => {
    setDiameter(imperial ? mmToIn(p.d_o_mm).toFixed(3) : String(p.d_o_mm));
    setThickness(imperial ? mmToIn(p.t_mm).toFixed(3) : String(p.t_mm));
  };
  const saveCurrentPreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const d_o_mm = imperial ? inToMm(parseFloat(diameter) || 0) : parseFloat(diameter) || 0;
    const t_mm = imperial ? inToMm(parseFloat(thickness) || 0) : parseFloat(thickness) || 0;
    if (d_o_mm <= 0 || t_mm <= 0) return;
    await addPreset(name, d_o_mm, t_mm);
    setPresetName('');
    setSavePresetOpen(false);
  };

  const siInputs = useMemo(() => {
    const d_o = imperial ? inToMm(parseFloat(diameter) || 0) : parseFloat(diameter) || 0;
    const t = imperial ? inToMm(parseFloat(thickness) || 0) : parseFloat(thickness) || 0;
    const Lm = parseFloat(length) || 0;
    const L = imperial ? ftToM(Lm) * 1000 : Lm * 1000;
    const P_kg = imperial ? lbsToKg(parseFloat(load) || 0) : parseFloat(load) || 0;
    const a = imperial ? inToMm(parseFloat(distance) || 0) : parseFloat(distance) || 0;
    return { d_o, t, L, P_kg, isCenter, a, DF: df, material };
  }, [diameter, thickness, length, load, isCenter, distance, df, imperial, material]);

  const valid =
    siInputs.d_o > 0 &&
    siInputs.t > 0 &&
    siInputs.t < siInputs.d_o / 2 &&
    siInputs.L > 0 &&
    siInputs.P_kg >= 0;

  const r = useMemo(() => (valid ? calcResults(siInputs) : null), [siInputs, valid]);

  const samplers = useMemo(() => {
    if (!r) return null;
    const a_eff = isCenter ? siInputs.L / 2 : siInputs.a;
    const P = siInputs.P_kg * 9.81;
    const w = r.self.w;
    const L = siInputs.L;
    const I = r.props.I;
    const b = L - a_eff;
    const R_A = (P * b) / L + (w * L) / 2;
    return {
      shear: (x: number) => (x > a_eff ? R_A - w * x - P : R_A - w * x),
      moment: (x: number) =>
        x > a_eff
          ? R_A * x - (w * x * x) / 2 - P * (x - a_eff)
          : R_A * x - (w * x * x) / 2,
      deflection: (x: number) => deflectionAt(x, L, I, P, a_eff, w, material.E),
      loads: [{ a: a_eff, label: 'P' }],
    };
  }, [r, siInputs, isCenter, material.E]);

  const loadStatus: 'safe' | 'warning' | 'danger' = useMemo(() => {
    if (!r) return 'safe';
    if (r.isDeflectionOver || r.isTensionOver || r.isTorqueOver) return 'danger';
    const mx = Math.max(r.deflectionRatio, r.tensionRatio, r.torqueRatio);
    return mx > 0.9 ? 'warning' : 'safe';
  }, [r]);

  const dUnit = imperial ? 'in' : 'mm';
  const lUnit = imperial ? 'ft' : 'm';
  const mUnit = imperial ? 'lbs' : 'kg';
  const momentUnit = imperial ? 'ft·lbf' : 'Nm';
  const dispDefl = (mm: number) => (imperial ? mmToIn(mm).toFixed(3) : mm.toFixed(2));
  const dispLoad = (kg: number) => (imperial ? kgToLbs(kg).toFixed(1) : kg.toFixed(2));
  const dispMoment = (Nmm: number) => {
    const Nm = Nmm / 1000;
    return imperial ? NmToFtLb(Nm).toFixed(1) : Nm.toFixed(1);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[1]}
        >
          <View>
            <AppHeader tabName="Simple Load" onReset={handleReset} />
            <Text style={s.sub}>
              {material.name} Aluminium · {units === 'metric' ? 'Metric' : 'Imperial'}
            </Text>
          </View>

          <View style={s.stickyBar}>
            {siInputs.L > 0 && (
              <BeamDiagram
                L_mm={siInputs.L}
                a_mm={isCenter ? siInputs.L / 2 : siInputs.a}
                isCenter={isCenter}
                imperial={imperial}
                P_kg={siInputs.P_kg}
                status={loadStatus}
                onChange={(newA_mm, newIsCenter) => {
                  setIsCenter(newIsCenter);
                  const out = imperial ? mmToIn(newA_mm) : newA_mm;
                  setDistance(out.toFixed(imperial ? 1 : 0));
                }}
              />
            )}
          </View>

          <View>
            <SectionHeader title="Tube Dimensions" />

            <PresetChipStrip
              presets={presets}
              imperial={imperial}
              mmToIn={mmToIn}
              onLoad={loadPreset}
              onLongPressDelete={(p) => removePreset(p.id)}
              onTapSaveCurrent={() => setSavePresetOpen(true)}
            />

            <View style={ui.card}>
              <InputRow
                label={`Outer Diameter  (${dUnit})`}
                value={diameter}
                onChangeText={setDiameter}
              />
              <Divider />
              <InputRow
                label={`Wall Thickness  (${dUnit})`}
                value={thickness}
                onChangeText={setThickness}
              />
              <Divider />
              <InputRow
                label={`Length  (${lUnit})`}
                value={length}
                onChangeText={setLength}
              />
            </View>

            <SectionHeader title="Load" />
            <View style={ui.card}>
              <InputRow
                label={`Point Load  (${mUnit})`}
                value={load}
                onChangeText={setLoad}
              />
              <Divider />
              <View style={ui.row}>
                <Text style={ui.label}>Load Position</Text>
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
                  />
                </>
              )}
            </View>

            <DFReminder df={df} />
          </View>

          <View>
            {r && (
              <>
                <SectionHeader title="Tube Properties" />
                <View style={[ui.card, ui.derivedCard]}>
                  <DerivedRow
                    label="Inner Diameter"
                    value={`${imperial ? mmToIn(r.props.d_i).toFixed(3) : r.props.d_i.toFixed(1)} ${dUnit}`}
                  />
                  <DerivedRow
                    label="Cross-Section Area"
                    value={`${imperial ? (r.props.A / 645.16).toFixed(4) : r.props.A.toFixed(1)} ${imperial ? 'in²' : 'mm²'}`}
                  />
                  <DerivedRow label="Tube Weight" value={`${dispLoad(r.tubeWeight)} ${mUnit}`} />
                  <DerivedRow
                    label="Total Load (tube + point)"
                    value={`${dispLoad(r.totalLoad)} ${mUnit}`}
                  />
                </View>

                <SectionHeader title="Results" />

                <ResultCard
                  title="Deflection"
                  current={`${dispDefl(r.totalDelta)} ${imperial ? 'in' : 'mm'}`}
                  limit={`${dispDefl(r.limits.maxDeflection)} ${imperial ? 'in' : 'mm'} (L/120)`}
                  ratio={r.deflectionRatio}
                  over={r.isDeflectionOver}
                  showAdv={!!showAdvanced['defl']}
                  onToggleAdv={() => toggleAdvanced('defl')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="deflection"
                          L={siInputs.L}
                          w={r.self.w}
                          support="simple"
                          loads={samplers.loads}
                          deflectionSampler={samplers.deflection}
                          maxLabel={`δ_max = ${dispDefl(r.totalDelta)} ${imperial ? 'in' : 'mm'}`}
                        />
                      )}
                      <AdvRow
                        label="Self-weight δ"
                        value={`${dispDefl(r.self.deltaS)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow
                        label="Point load δ"
                        value={`${dispDefl(r.point.deltaPoint)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow label="Formula (CPL)" value="δ = PL³ / (48EI)" />
                      <AdvRow label="Off-centre formula" value="δ = Pb(L²−b²)^1.5 / (9√3·EI·L)" />
                      <AdvRow label="Self-weight formula" value="δ = 5wL⁴ / (384EI)" />
                      <AdvRow label="Limit source" value="L/120 serviceability" />
                    </>
                  }
                />

                <ResultCard
                  title="Max Safe Point Load"
                  current={`${dispLoad(siInputs.P_kg)} ${mUnit}  (applied)`}
                  limit={`${dispLoad(r.limits.maxPointLoad)} ${mUnit}  (deflection limit)`}
                  ratio={r.limits.maxPointLoad > 0 ? siInputs.P_kg / r.limits.maxPointLoad : 1}
                  over={siInputs.P_kg > r.limits.maxPointLoad}
                  showAdv={!!showAdvanced['load']}
                  onToggleAdv={() => toggleAdvanced('load')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="full"
                          L={siInputs.L}
                          w={r.self.w}
                          support="simple"
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                          momentSampler={samplers.moment}
                          maxLabel={`M_max = ${dispMoment(r.totalMoment)} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="Max load (deflection)"
                        value={`${dispLoad(r.limits.maxPointLoad)} ${mUnit}`}
                      />
                      <AdvRow
                        label="Max load (stress)"
                        value={`${dispLoad(r.limits.maxPointLoadStress)} ${mUnit}`}
                      />
                      <AdvRow
                        label="Governing limit"
                        value={r.limits.maxPointLoad <= r.limits.maxPointLoadStress ? 'Deflection' : 'Stress'}
                      />
                      <AdvRow
                        label="At position"
                        value={isCenter
                          ? 'Centre (L/2)'
                          : `${imperial ? mmToIn(siInputs.a).toFixed(1) : siInputs.a.toFixed(0)} ${dUnit} from end`}
                      />
                    </>
                  }
                />

                <ResultCard
                  title="Bending Moment"
                  current={`${dispMoment(r.totalMoment)} ${momentUnit}`}
                  limit={`${dispMoment(r.limits.maxTorque)} ${momentUnit}`}
                  ratio={r.torqueRatio}
                  over={r.isTorqueOver}
                  showAdv={!!showAdvanced['torq']}
                  onToggleAdv={() => toggleAdvanced('torq')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="moment"
                          L={siInputs.L}
                          w={r.self.w}
                          support="simple"
                          loads={samplers.loads}
                          momentSampler={samplers.moment}
                          maxLabel={`M_max = ${dispMoment(r.totalMoment)} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="Self-weight moment"
                        value={`${dispMoment(r.self.Mself)} ${momentUnit}`}
                      />
                      <AdvRow
                        label="Point load moment"
                        value={`${dispMoment(r.point.Mpoint)} ${momentUnit}`}
                      />
                      <AdvRow label="Formula (CPL)" value="M = PL / 4" />
                      <AdvRow label="Off-centre formula" value="M = P·a·b / L" />
                      <AdvRow
                        label="Section modulus (Z)"
                        value={`${r.props.Z.toFixed(0)} mm³`}
                      />
                    </>
                  }
                />

                <ResultCard
                  title="Bending Stress"
                  current={`${r.tension.toFixed(2)} N/mm²`}
                  limit={`${r.limits.maxTension.toFixed(1)} N/mm²  (σ_yield/${df})`}
                  ratio={r.tensionRatio}
                  over={r.isTensionOver}
                  showAdv={!!showAdvanced['tens']}
                  onToggleAdv={() => toggleAdvanced('tens')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="shear"
                          L={siInputs.L}
                          w={r.self.w}
                          support="simple"
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                        />
                      )}
                      <AdvRow label="Formula" value="σ = M × (d_o/2) / I" />
                      <AdvRow
                        label="I (second moment)"
                        value={`${r.props.I.toFixed(0)} mm⁴`}
                      />
                      <AdvRow
                        label="Allowable stress"
                        value={`${material.yield} / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`}
                      />
                      <AdvRow
                        label="Utilisation"
                        value={`${(r.tensionRatio * 100).toFixed(1)}%`}
                      />
                    </>
                  }
                />
              </>
            )}

            {!valid && (
              <NoResultBox text="Enter valid tube dimensions and load to see results." />
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SavePresetModal
        open={savePresetOpen}
        onClose={() => {
          setPresetName('');
          setSavePresetOpen(false);
        }}
        currentLabel={
          imperial
            ? `${diameter || 0}″ × ${thickness || 0}″`
            : `Ø${diameter || 0} × ${thickness || 0} mm`
        }
        name={presetName}
        setName={setPresetName}
        onSave={saveCurrentPreset}
      />
    </SafeAreaView>
  );
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  sub: { fontSize: 12, color: colors.textMuted, marginBottom: 14, marginTop: 4, marginLeft: 56 },
  stickyBar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
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
});
