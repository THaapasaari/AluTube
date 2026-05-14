import {
  View,
  Text,
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
  inToMm,
  mmToIn,
  ftToM,
  mToFt,
  lbsToKg,
  kgToLbs,
  NmToFtLb,
} from '../../src/engineering/calculations';
import {
  calcResultsCantilever,
  deflectionAtCantilever,
} from '../../src/engineering/calc-cantilever';
import BeamDiagramCantilever from '../../src/components/BeamDiagramCantilever';
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

export default function CantileverScreen() {
  const { units, df, material } = useSettings();
  const imperial = units === 'imperial';

  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('5');
  const [length, setLength] = useState('4');
  const [load, setLoad] = useState('10');
  const [distance, setDistance] = useState('4000');
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
          setDistance(imperial ? mmToIn(4000).toFixed(1) : '4000');
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
    return { d_o, t, L, P_kg, a: Math.max(0, Math.min(L, a)), DF: df, material };
  }, [diameter, thickness, length, load, distance, df, material, imperial]);

  const valid =
    siInputs.d_o > 0 &&
    siInputs.t > 0 &&
    siInputs.t < siInputs.d_o / 2 &&
    siInputs.L > 0 &&
    siInputs.P_kg >= 0;

  const r = useMemo(() => (valid ? calcResultsCantilever(siInputs) : null), [siInputs, valid]);

  const samplers = useMemo(() => {
    if (!r) return null;
    const a = siInputs.a;
    const P = siInputs.P_kg * 9.81;
    const w = r.self.w;
    const L = siInputs.L;
    const I = r.props.I;
    return {
      shear: (x: number) => (x < a ? w * (L - x) + P : w * (L - x)),
      moment: (x: number) =>
        x <= a ? (w * (L - x) ** 2) / 2 + P * (a - x) : (w * (L - x) ** 2) / 2,
      deflection: (x: number) =>
        deflectionAtCantilever(x, L, I, P, a, w, material.E),
      loads: [{ a, label: 'P' }],
    };
  }, [r, siInputs, material.E]);

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
            <AppHeader tabName="Cantilever" onReset={handleReset} />
            <Text style={s.sub}>{material.name} Aluminium · Fixed at one end</Text>
          </View>

          <View style={s.stickyBar}>
            {siInputs.L > 0 && (
              <BeamDiagramCantilever
                L_mm={siInputs.L}
                a_mm={siInputs.a}
                imperial={imperial}
                P_kg={siInputs.P_kg}
                status={loadStatus}
                onChange={(newA_mm) => {
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
              <InputRow label={`Outer Diameter  (${dUnit})`} value={diameter} onChangeText={setDiameter} />
              <Divider />
              <InputRow label={`Wall Thickness  (${dUnit})`} value={thickness} onChangeText={setThickness} />
              <Divider />
              <InputRow label={`Length  (${lUnit})`} value={length} onChangeText={setLength} />
            </View>

            <SectionHeader title="Load" />
            <View style={ui.card}>
              <InputRow label={`Point Load  (${mUnit})`} value={load} onChangeText={setLoad} />
              <Divider />
              <InputRow
                label={`Distance From Fixed End  (${dUnit})`}
                value={distance}
                onChangeText={setDistance}
              />
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
                  <DerivedRow label="Tube Weight" value={`${dispLoad(r.tubeWeight)} ${mUnit}`} />
                  <DerivedRow
                    label="Total Load (tube + point)"
                    value={`${dispLoad(r.totalLoad)} ${mUnit}`}
                  />
                </View>

                <SectionHeader title="Results" />

                <ResultCard
                  title="Tip Deflection"
                  current={`${dispDefl(r.totalDeflectionTip)} ${imperial ? 'in' : 'mm'}`}
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
                          support="cantilever-left"
                          loads={samplers.loads}
                          deflectionSampler={samplers.deflection}
                          maxLabel={`δ_max = ${dispDefl(r.totalDeflectionTip)} ${imperial ? 'in' : 'mm'}`}
                        />
                      )}
                      <AdvRow
                        label="Self-weight δ_tip"
                        value={`${dispDefl(r.self.deltaS)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow
                        label="Point load δ_tip"
                        value={`${dispDefl(r.pointDeflectionTip)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow label="Tip-load formula" value="δ = PL³ / (3EI)" />
                      <AdvRow label="Off-tip formula" value="δ_tip = Pa²(3L−a) / (6EI)" />
                      <AdvRow label="Self-weight formula" value="δ = wL⁴ / (8EI)" />
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
                          support="cantilever-left"
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                          momentSampler={samplers.moment}
                          maxLabel={`M_max = ${dispMoment(r.totalMomentFixed)} ${momentUnit}`}
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
                        value={`${imperial ? mmToIn(siInputs.a).toFixed(1) : siInputs.a.toFixed(0)} ${dUnit} from fixed end`}
                      />
                    </>
                  }
                />

                <ResultCard
                  title="Fixed-end Moment"
                  current={`${dispMoment(r.totalMomentFixed)} ${momentUnit}`}
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
                          support="cantilever-left"
                          loads={samplers.loads}
                          momentSampler={samplers.moment}
                          maxLabel={`M_max = ${dispMoment(r.totalMomentFixed)} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="Self-weight moment"
                        value={`${dispMoment(r.self.Mself)} ${momentUnit}`}
                      />
                      <AdvRow
                        label="Point load moment"
                        value={`${dispMoment(r.pointMomentFixed)} ${momentUnit}`}
                      />
                      <AdvRow label="M_point formula" value="M_fix = P · a" />
                      <AdvRow label="M_self formula" value="M_fix = wL²/2" />
                      <AdvRow
                        label="Section modulus (Z)"
                        value={`${r.props.Z.toFixed(0)} mm³`}
                      />
                    </>
                  }
                />

                <ResultCard
                  title="Bending Stress (at fixed end)"
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
                          support="cantilever-left"
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                        />
                      )}
                      <AdvRow label="Formula" value="σ = M × (d_o/2) / I" />
                      <AdvRow
                        label="Allowable stress"
                        value={`${material.yield} / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`}
                      />
                      <AdvRow label="Utilisation" value={`${(r.tensionRatio * 100).toFixed(1)}%`} />
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
});
