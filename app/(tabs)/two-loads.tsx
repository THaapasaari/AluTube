import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
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
  calcResultsTwoLoads,
  deflectionAtTwoLoads,
  momentAtTwoLoads,
  shearAtTwoLoads,
} from '../../src/engineering/calc-two-loads';
import BeamDiagramTwoLoads from '../../src/components/BeamDiagramTwoLoads';
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

export default function TwoLoadsScreen({ isActive }: { isActive?: boolean }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { if (isActive) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [isActive]);
  const { units, df, material, showReactions } = useSettings();
  const imperial = units === 'imperial';

  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('5');
  const [length, setLength] = useState('4');
  const [load1, setLoad1] = useState('10');
  const [pos1, setPos1] = useState('1000');
  const [load2, setLoad2] = useState('10');
  const [pos2, setPos2] = useState('3000');
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const { presets, add: addPreset, remove: removePreset } = usePresets();
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const toggleAdvanced = (key: string) =>
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    Alert.alert('Reset inputs?', 'Restores tube and both loads to defaults.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setDiameter(imperial ? mmToIn(48).toFixed(3) : '48');
          setThickness(imperial ? mmToIn(5).toFixed(3) : '5');
          setLength(imperial ? mToFt(4).toFixed(2) : '4');
          setLoad1(imperial ? kgToLbs(10).toFixed(1) : '10');
          setPos1(imperial ? mmToIn(1000).toFixed(1) : '1000');
          setLoad2(imperial ? kgToLbs(10).toFixed(1) : '10');
          setPos2(imperial ? mmToIn(3000).toFixed(1) : '3000');
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
    const P1_kg = imperial ? lbsToKg(parseFloat(load1) || 0) : parseFloat(load1) || 0;
    const P2_kg = imperial ? lbsToKg(parseFloat(load2) || 0) : parseFloat(load2) || 0;
    const a1 = imperial ? inToMm(parseFloat(pos1) || 0) : parseFloat(pos1) || 0;
    const a2 = imperial ? inToMm(parseFloat(pos2) || 0) : parseFloat(pos2) || 0;
    return {
      d_o,
      t,
      L,
      P1_kg,
      P2_kg,
      a1: Math.max(0, Math.min(L, a1)),
      a2: Math.max(0, Math.min(L, a2)),
      DF: df,
      material,
    };
  }, [diameter, thickness, length, load1, load2, pos1, pos2, df, material, imperial]);

  const valid =
    siInputs.d_o > 0 &&
    siInputs.t > 0 &&
    siInputs.t < siInputs.d_o / 2 &&
    siInputs.L > 0;

  const r = useMemo(() => (valid ? calcResultsTwoLoads(siInputs) : null), [siInputs, valid]);

  const samplers = useMemo(() => {
    if (!r) return null;
    const { L, a1, a2 } = siInputs;
    const P1 = siInputs.P1_kg * 9.81;
    const P2 = siInputs.P2_kg * 9.81;
    const w = r.self.w;
    return {
      shear: (x: number) => shearAtTwoLoads(x, L, P1, a1, P2, a2, w),
      moment: (x: number) => momentAtTwoLoads(x, L, P1, a1, P2, a2, w),
      deflection: (x: number) =>
        deflectionAtTwoLoads(x, L, r.props.I, P1, a1, P2, a2, w, material.E),
      loads: [
        { a: a1, label: 'P1' },
        { a: a2, label: 'P2' },
      ],
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
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[1]}
        >
          <View>
            <AppHeader tabName="Two Loads" onReset={handleReset} />
            <Text style={s.sub}>
              {material.name} {material.category === 'aluminium' ? 'Aluminium' : 'Steel'} · Simply supported · {units === 'metric' ? 'Metric' : 'Imperial'}
            </Text>
          </View>

          <View style={s.stickyBar}>
            {siInputs.L > 0 && (
              <BeamDiagramTwoLoads
                L_mm={siInputs.L}
                a1_mm={siInputs.a1}
                a2_mm={siInputs.a2}
                P1_kg={siInputs.P1_kg}
                P2_kg={siInputs.P2_kg}
                imperial={imperial}
                status={loadStatus}
                R_A_kN={showReactions && r ? (siInputs.P1_kg * 9.81 * (siInputs.L - siInputs.a1) / siInputs.L + siInputs.P2_kg * 9.81 * (siInputs.L - siInputs.a2) / siInputs.L + r.self.w * siInputs.L / 2) / 1000 : undefined}
                R_B_kN={showReactions && r ? (siInputs.P1_kg * 9.81 * siInputs.a1 / siInputs.L + siInputs.P2_kg * 9.81 * siInputs.a2 / siInputs.L + r.self.w * siInputs.L / 2) / 1000 : undefined}
                onChange1={(newA) =>
                  setPos1((imperial ? mmToIn(newA) : newA).toFixed(imperial ? 1 : 0))
                }
                onChange2={(newA) =>
                  setPos2((imperial ? mmToIn(newA) : newA).toFixed(imperial ? 1 : 0))
                }
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

            <SectionHeader title="Load 1" />
            <View style={ui.card}>
              <InputRow label={`Load P1  (${mUnit})`} value={load1} onChangeText={setLoad1} />
              <Divider />
              <InputRow label={`Position  (${dUnit} from left)`} value={pos1} onChangeText={setPos1} />
            </View>

            <SectionHeader title="Load 2" />
            <View style={ui.card}>
              <InputRow label={`Load P2  (${mUnit})`} value={load2} onChangeText={setLoad2} />
              <Divider />
              <InputRow label={`Position  (${dUnit} from left)`} value={pos2} onChangeText={setPos2} />
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
                    label="Total Load (tube + P1 + P2)"
                    value={`${dispLoad(r.totalLoad)} ${mUnit}`}
                  />
                </View>

                <SectionHeader title="Results" />

                <ResultCard
                  title="Max Deflection"
                  current={`${dispDefl(Math.abs(r.maxDeflection))} ${imperial ? 'in' : 'mm'}`}
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
                          maxLabel={`δ_max = ${dispDefl(Math.abs(r.maxDeflection))} ${imperial ? 'in' : 'mm'}`}
                        />
                      )}
                      <AdvRow
                        label="δ_max at"
                        value={`${imperial ? mmToIn(r.xOfMaxDeflection).toFixed(1) : r.xOfMaxDeflection.toFixed(0)} ${dUnit} from left`}
                      />
                      <AdvRow
                        label="Self-weight δ"
                        value={`${dispDefl(r.self.deltaS)} ${imperial ? 'in' : 'mm'}`}
                      />
                      <AdvRow label="Method" value="Superposition (Roark)" />
                    </>
                  }
                />

                <ResultCard
                  title="Load Capacity"
                  current={`Applied: P1 + P2 = ${dispLoad(siInputs.P1_kg + siInputs.P2_kg)} ${mUnit}`}
                  limit={`Headroom: ${r.scaleAtFirstLimit.toFixed(2)}× (both loads scaled together)`}
                  ratio={r.scaleAtFirstLimit > 0 ? 1 / r.scaleAtFirstLimit : 1}
                  over={r.scaleAtFirstLimit < 1}
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
                          maxLabel={`M_max = ${dispMoment(Math.abs(r.maxMoment))} ${momentUnit}`}
                        />
                      )}
                      <AdvRow label="Scale to first limit" value={`${r.scaleAtFirstLimit.toFixed(2)}×`} />
                      <AdvRow label="If ≥ 1.0" value="Both loads are safe at current values" />
                      <AdvRow label="If < 1.0" value="At least one limit is exceeded" />
                    </>
                  }
                />

                <ResultCard
                  title="Max Bending Moment"
                  current={`${dispMoment(Math.abs(r.maxMoment))} ${momentUnit}`}
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
                          maxLabel={`M_max = ${dispMoment(Math.abs(r.maxMoment))} ${momentUnit}`}
                        />
                      )}
                      <AdvRow
                        label="M_max at"
                        value={`${imperial ? mmToIn(r.xOfMaxMoment).toFixed(1) : r.xOfMaxMoment.toFixed(0)} ${dUnit} from left`}
                      />
                      <AdvRow
                        label="Section modulus (Z)"
                        value={`${r.props.Z.toFixed(0)} mm³`}
                      />
                      <AdvRow label="Formula" value="M = Σ R_x − Σ load·(x−a)" />
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
                        label="Allowable stress"
                        value={`${material.yield} / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`}
                      />
                      <AdvRow label="Utilisation" value={`${(r.tensionRatio * 100).toFixed(1)}%`} />
                    </>
                  }
                />
              </>
            )}

            {!valid && <NoResultBox text="Enter valid tube dimensions to see results." />}

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
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 640, alignSelf: 'center', width: '100%' },
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
