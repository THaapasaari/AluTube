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
  calcResultsBoom,
  shearAtBoom,
  momentAtBoom,
  deflectionAtBoom,
} from '../../src/engineering/calc-boom';
import BoomDiagram from '../../src/components/BoomDiagram';
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

export default function BoomScreen() {
  const { units, df, material } = useSettings();
  const imperial = units === 'imperial';

  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('5');
  const [length, setLength] = useState('4');
  const [load, setLoad] = useState('10');
  // Support position — default 1/3 of L in mm; actual value in display units
  const [supportDist, setSupportDist] = useState(
    imperial ? mmToIn(4000 / 3).toFixed(1) : String(Math.round(4000 / 3))
  );
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const { presets, add: addPreset, remove: removePreset } = usePresets();
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const toggleAdvanced = (key: string) =>
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    Alert.alert('Reset inputs?', 'Restores tube and load to defaults; support to L/3.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          const defL_mm = 4000;
          setDiameter(imperial ? mmToIn(48).toFixed(3) : '48');
          setThickness(imperial ? mmToIn(5).toFixed(3) : '5');
          setLength(imperial ? mToFt(4).toFixed(2) : '4');
          setLoad(imperial ? kgToLbs(10).toFixed(1) : '10');
          setSupportDist(
            imperial ? mmToIn(defL_mm / 3).toFixed(1) : String(Math.round(defL_mm / 3))
          );
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
    const aRaw = imperial
      ? inToMm(parseFloat(supportDist) || 0)
      : parseFloat(supportDist) || 0;
    // Clamp to 8%–92% of L to prevent CW going to infinity
    const a = L > 0 ? Math.max(0.08 * L, Math.min(0.92 * L, aRaw)) : aRaw;
    return { d_o, t, L, P_kg, a, DF: df, material };
  }, [diameter, thickness, length, load, supportDist, df, material, imperial]);

  const valid =
    siInputs.d_o > 0 &&
    siInputs.t > 0 &&
    siInputs.t < siInputs.d_o / 2 &&
    siInputs.L > 0 &&
    siInputs.P_kg >= 0;

  const r = useMemo(() => (valid ? calcResultsBoom(siInputs) : null), [siInputs, valid]);

  const samplers = useMemo(() => {
    if (!r) return null;
    const { L, a, P_kg } = siInputs;
    const P_N = P_kg * 9.81;
    const CW_N = r.CW_N;
    const w = r.self.w;
    const I = r.props.I;
    return {
      shear: (x: number) => shearAtBoom(x, L, P_N, a, CW_N, w),
      moment: (x: number) => momentAtBoom(x, L, P_N, a, CW_N, w),
      deflection: (x: number) => deflectionAtBoom(x, L, I, P_N, a, CW_N, w, material.E),
      loads: [
        { a: 0, label: 'CW' },
        { a: L, label: 'P' },
      ] as { a: number; label: string }[],
      supportFrac: a / L,
    };
  }, [r, siInputs, material.E]);

  const maxPGoverning = r ? Math.min(r.limits.maxPointLoad, r.limits.maxPointLoadDefl) : 0;
  const pRatio = maxPGoverning > 0 ? siInputs.P_kg / maxPGoverning : 1;
  const isPOver = siInputs.P_kg > maxPGoverning;

  const loadStatus: 'safe' | 'warning' | 'danger' = useMemo(() => {
    if (!r) return 'safe';
    if (r.isMomentOver || r.isTensionOver || r.isDeflectionOver || isPOver) return 'danger';
    const mx = Math.max(r.momentRatio, r.tensionRatio, r.deflectionRatio, pRatio);
    return mx > 0.9 ? 'warning' : 'safe';
  }, [r, isPOver, pRatio]);

  const dUnit = imperial ? 'in' : 'mm';
  const lUnit = imperial ? 'ft' : 'm';
  const mUnit = imperial ? 'lbs' : 'kg';
  const momentUnit = imperial ? 'ft·lbf' : 'Nm';
  const dispLoad = (kg: number) => (imperial ? kgToLbs(kg).toFixed(1) : kg.toFixed(2));
  const dispMoment = (Nmm: number) => {
    const Nm = Nmm / 1000;
    return imperial ? NmToFtLb(Nm).toFixed(1) : Nm.toFixed(1);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
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
            <AppHeader tabName="Simple Boom" onReset={handleReset} />
            <Text style={s.sub}>
              {material.name} Aluminium · Seesaw/lever · {units === 'metric' ? 'Metric' : 'Imperial'}
            </Text>
          </View>

          <View style={s.stickyBar}>
            {siInputs.L > 0 && r && (
              <BoomDiagram
                L_mm={siInputs.L}
                a_mm={siInputs.a}
                P_kg={siInputs.P_kg}
                CW_kg={r.CW_kg}
                R_kg={r.R_kg}
                imperial={imperial}
                status={loadStatus}
                onChange={(newA_mm) => {
                  const out = imperial ? mmToIn(newA_mm) : newA_mm;
                  setSupportDist(out.toFixed(imperial ? 1 : 0));
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
              <InputRow label={`Point Load at Right End  (${mUnit})`} value={load} onChangeText={setLoad} />
              <Divider />
              <InputRow
                label={`Support Position from Left  (${dUnit})`}
                value={supportDist}
                onChangeText={setSupportDist}
              />
            </View>

            <DFReminder df={df} />
          </View>

          <View>
            {r && (
              <>
                <SectionHeader title="Boom Balance" />
                <View style={[ui.card, ui.derivedCard]}>
                  <DerivedRow
                    label="Counterweight (CW) needed"
                    value={`${dispLoad(r.CW_kg)} ${mUnit}`}
                  />
                  <DerivedRow
                    label="Support reaction (R)"
                    value={`${dispLoad(r.R_kg)} ${mUnit}`}
                  />
                  <DerivedRow label="Tube weight" value={`${dispLoad(r.tubeWeight)} ${mUnit}`} />
                </View>

                <SectionHeader title="Results" />

                <ResultCard
                  title="Max Tip Deflection"
                  current={`${imperial ? mmToIn(r.maxTipDeflection).toFixed(3) : r.maxTipDeflection.toFixed(2)} ${imperial ? 'in' : 'mm'}`}
                  limit={`${imperial ? mmToIn(r.limits.maxDeflection).toFixed(3) : r.limits.maxDeflection.toFixed(2)} ${imperial ? 'in' : 'mm'} (L/120)`}
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
                          support="single-interior"
                          supportFrac={samplers.supportFrac}
                          loads={samplers.loads}
                          deflectionSampler={samplers.deflection}
                          maxLabel={`δ_max = ${imperial ? mmToIn(r.maxTipDeflection).toFixed(3) : r.maxTipDeflection.toFixed(2)} ${imperial ? 'in' : 'mm'}`}
                        />
                      )}
                      <AdvRow
                        label="Right tip (P side)"
                        value={`${imperial ? mmToIn(r.deflectionRightTip).toFixed(3) : r.deflectionRightTip.toFixed(2)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow
                        label="Left tip (CW side)"
                        value={`${imperial ? mmToIn(r.deflectionLeftTip).toFixed(3) : r.deflectionLeftTip.toFixed(2)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow label="Right tip formula" value="δ = P·b³/(3EI) + w·b⁴/(8EI)" />
                      <AdvRow label="Left tip formula" value="δ = CW·a³/(3EI) + w·a⁴/(8EI)" />
                    </>
                  }
                />

                <ResultCard
                  title="Max Safe Tip Load"
                  current={`${dispLoad(siInputs.P_kg)} ${mUnit}  (applied)`}
                  limit={`${dispLoad(maxPGoverning)} ${mUnit}  (${r.limits.maxPointLoad <= r.limits.maxPointLoadDefl ? 'stress' : 'deflection'} limit)`}
                  ratio={pRatio}
                  over={isPOver}
                  showAdv={!!showAdvanced['load']}
                  onToggleAdv={() => toggleAdvanced('load')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="full"
                          L={siInputs.L}
                          w={r.self.w}
                          support="single-interior"
                          supportFrac={samplers.supportFrac}
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                          momentSampler={samplers.moment}
                          maxLabel={`M = ${dispMoment(r.momentAtSupport)} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="Max P (stress)"
                        value={`${dispLoad(r.limits.maxPointLoad)} ${mUnit}`}
                      />
                      <AdvRow
                        label="Max P (deflection)"
                        value={`${dispLoad(r.limits.maxPointLoadDefl)} ${mUnit}`}
                      />
                      <AdvRow
                        label="CW at max P"
                        value={`${dispLoad(r.limits.maxCombinedLoad - maxPGoverning)} ${mUnit}`}
                      />
                    </>
                  }
                />

                <ResultCard
                  title="Support Moment"
                  current={`${dispMoment(r.momentAtSupport)} ${momentUnit}`}
                  limit={`${dispMoment(r.limits.maxTorque)} ${momentUnit}`}
                  ratio={r.momentRatio}
                  over={r.isMomentOver}
                  showAdv={!!showAdvanced['torq']}
                  onToggleAdv={() => toggleAdvanced('torq')}
                  advContent={
                    <>
                      {samplers && (
                        <ForceDiagram
                          mode="full"
                          L={siInputs.L}
                          w={r.self.w}
                          support="single-interior"
                          supportFrac={samplers.supportFrac}
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                          momentSampler={samplers.moment}
                          maxLabel={`M = ${dispMoment(r.momentAtSupport)} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="Max load P (stress limit)"
                        value={`${dispLoad(r.limits.maxPointLoad)} ${mUnit}`}
                      />
                      <AdvRow label="Formula" value="|M| = P·b + w·b²/2" />
                      <AdvRow label="Where b" value="L − support position" />
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
                          support="single-interior"
                          supportFrac={samplers.supportFrac}
                          loads={samplers.loads}
                          shearSampler={samplers.shear}
                        />
                      )}
                      <AdvRow label="Formula" value="σ = M × (d_o/2) / I" />
                      <AdvRow
                        label="Allowable stress"
                        value={`${material.yield} / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`}
                      />
                      <AdvRow
                        label="I (second moment)"
                        value={`${r.props.I.toFixed(0)} mm⁴`}
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
