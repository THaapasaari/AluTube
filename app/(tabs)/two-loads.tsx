import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { useSettings } from '../../src/hooks/useSettings';
import { usePresets, TubePreset } from '../../src/hooks/usePresets';
import {
  inToMm,
  mmToIn,
  ftToM,
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

export default function TwoLoadsScreen() {
  const { units, df, material } = useSettings();
  const imperial = units === 'imperial';

  const [diameter, setDiameter] = useState('48');
  const [thickness, setThickness] = useState('4.3');
  const [length, setLength] = useState('4');
  const [load1, setLoad1] = useState('15');
  const [pos1, setPos1] = useState('1000');
  const [load2, setLoad2] = useState('15');
  const [pos2, setPos2] = useState('3000');
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const { presets, add: addPreset, remove: removePreset } = usePresets();
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const toggleAdvanced = (key: string) =>
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));

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
  const confirmDeletePreset = (p: TubePreset) => {
    Alert.alert('Delete preset?', `Remove "${p.name}" from your saved tubes?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePreset(p.id) },
    ]);
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
            <Text style={s.heading}>Two Loads</Text>
            <Text style={s.sub}>{material.name} Aluminium  ·  Simply supported · 2 point loads</Text>
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.presetRowOuter}
              contentContainerStyle={s.presetRow}
              keyboardShouldPersistTaps="handled"
            >
              {presets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={s.presetChip}
                  onPress={() => loadPreset(p)}
                  onLongPress={() => confirmDeletePreset(p)}
                  activeOpacity={0.7}
                >
                  <Text style={s.presetChipName}>{p.name}</Text>
                  <Text style={s.presetChipMeta}>
                    {imperial
                      ? `${mmToIn(p.d_o_mm).toFixed(2)}″ × ${mmToIn(p.t_mm).toFixed(3)}″`
                      : `Ø${p.d_o_mm} × ${p.t_mm} mm`}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.presetChip, s.presetSaveChip]}
                onPress={() => setSavePresetOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={s.presetSaveLabel}>+ Save current</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={s.card}>
              <InputRow label={`Outer Diameter  (${dUnit})`} value={diameter} onChangeText={setDiameter} />
              <Divider />
              <InputRow label={`Wall Thickness  (${dUnit})`} value={thickness} onChangeText={setThickness} />
              <Divider />
              <InputRow label={`Length  (${lUnit})`} value={length} onChangeText={setLength} />
            </View>

            <SectionHeader title="Load 1" />
            <View style={s.card}>
              <InputRow label={`Load P1  (${mUnit})`} value={load1} onChangeText={setLoad1} />
              <Divider />
              <InputRow label={`Position  (${dUnit} from left)`} value={pos1} onChangeText={setPos1} />
            </View>

            <SectionHeader title="Load 2" />
            <View style={s.card}>
              <InputRow label={`Load P2  (${mUnit})`} value={load2} onChangeText={setLoad2} />
              <Divider />
              <InputRow label={`Position  (${dUnit} from left)`} value={pos2} onChangeText={setPos2} />
            </View>

            <View style={s.dfReminder}>
              <Text style={s.dfReminderLabel}>Design Factor</Text>
              <Text style={s.dfReminderValue}>{df}:1</Text>
              <Text style={s.dfReminderHint}>change in Settings ⚙</Text>
            </View>
          </View>

          <View>
            {r && (
              <>
                <SectionHeader title="Tube Properties" />
                <View style={[s.card, s.derivedCard]}>
                  <DerivedRow label="Inner Diameter" value={`${imperial ? mmToIn(r.props.d_i).toFixed(3) : r.props.d_i.toFixed(1)} ${dUnit}`} />
                  <DerivedRow label="Tube Weight" value={`${dispLoad(r.tubeWeight)} ${mUnit}`} />
                  <DerivedRow label="Total Load (tube + P1 + P2)" value={`${dispLoad(r.totalLoad)} ${mUnit}`} />
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
                      <AdvRow label="δ_max at" value={`${imperial ? mmToIn(r.xOfMaxDeflection).toFixed(1) : r.xOfMaxDeflection.toFixed(0)} ${dUnit} from left`} />
                      <AdvRow label="Self-weight δ" value={`${dispDefl(r.self.deltaS)} ${imperial ? 'in' : 'mm'}`} />
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
                      <AdvRow label="M_max at" value={`${imperial ? mmToIn(r.xOfMaxMoment).toFixed(1) : r.xOfMaxMoment.toFixed(0)} ${dUnit} from left`} />
                      <AdvRow label="Section modulus (Z)" value={`${r.props.Z.toFixed(0)} mm³`} />
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
                      <AdvRow label="Allowable stress" value={`${material.yield} / ${df} = ${r.limits.maxTension.toFixed(1)} N/mm²`} />
                      <AdvRow label="Utilisation" value={`${(r.tensionRatio * 100).toFixed(1)}%`} />
                    </>
                  }
                />
              </>
            )}

            {!valid && (
              <View style={s.noResultBox}>
                <Text style={s.noResultText}>Enter valid tube dimensions to see results.</Text>
              </View>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={savePresetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSavePresetOpen(false)}
      >
        <Pressable style={s.presetModalBackdrop} onPress={() => setSavePresetOpen(false)}>
          <Pressable style={s.presetModalSheet}>
            <Text style={s.presetModalTitle}>Save Tube Preset</Text>
            <Text style={s.presetModalSub}>
              {imperial
                ? `${diameter || 0}″ × ${thickness || 0}″`
                : `Ø${diameter || 0} × ${thickness || 0} mm`}
            </Text>
            <TextInput
              style={s.presetModalInput}
              value={presetName}
              onChangeText={setPresetName}
              placeholder={'e.g. "1.5″ Schedule 40"'}
              placeholderTextColor={colors.textDim}
              autoFocus
              selectionColor={colors.primary}
            />
            <View style={s.presetModalActions}>
              <TouchableOpacity
                onPress={() => {
                  setPresetName('');
                  setSavePresetOpen(false);
                }}
                style={[s.presetModalBtn, s.presetModalCancel]}
              >
                <Text style={s.presetModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveCurrentPreset}
                style={[s.presetModalBtn, s.presetModalSave]}
                disabled={!presetName.trim()}
              >
                <Text style={s.presetModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.presetModalHint}>Long-press a chip to delete it.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components (same as other screens) ───────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function InputRow({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primary}
        onFocus={() => {
          setTimeout(() => {
            const end = value.length;
            inputRef.current?.setNativeProps({ selection: { start: end, end } });
          }, 0);
        }}
      />
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
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
  showAdv,
  onToggleAdv,
  advContent,
}: {
  title: string;
  current: string;
  limit: string;
  ratio: number;
  over: boolean;
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
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${clampedRatio * 100}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[s.barPct, { color: barColor }]}>{(ratio * 100).toFixed(1)}% of limit</Text>
      <TouchableOpacity style={s.advToggle} onPress={onToggleAdv} activeOpacity={0.6}>
        <Text style={s.advToggleText}>{showAdv ? '▲ Hide details' : '▼ Show details'}</Text>
      </TouchableOpacity>
      {showAdv && <View style={s.advBlock}>{advContent}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 32, fontWeight: '800', color: colors.primary, marginTop: 8, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 16, marginTop: 2 },
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 8 },
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
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resultLabel: { fontSize: 13, color: colors.textMuted },
  resultValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  resultValueOver: { color: colors.danger },
  resultValueLimit: { fontSize: 13, color: colors.textMuted },
  barBg: { height: 5, backgroundColor: colors.border, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
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
  advRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  advLabel: { fontSize: 12, color: colors.textMuted, flex: 1 },
  advValue: { fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'right', flex: 1 },
  dfReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 10,
  },
  dfReminderLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dfReminderValue: { fontSize: 18, color: colors.primary, fontWeight: '800' },
  dfReminderHint: { fontSize: 11, color: colors.textDim, fontStyle: 'italic', marginLeft: 'auto' },
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
  presetRowOuter: { marginBottom: 8, marginHorizontal: -16 },
  presetRow: { paddingHorizontal: 16, gap: 8 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    minWidth: 110,
  },
  presetChipName: { fontSize: 13, color: colors.text, fontWeight: '700' },
  presetChipMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  presetSaveChip: {
    borderStyle: 'dashed',
    borderColor: colors.primaryDim,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  presetSaveLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  presetModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  presetModalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetModalTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  presetModalSub: { fontSize: 16, color: colors.text, fontWeight: '700', marginBottom: 14 },
  presetModalInput: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  presetModalActions: { flexDirection: 'row', gap: 10 },
  presetModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  presetModalCancel: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  presetModalCancelText: { color: colors.textMuted, fontWeight: '600' },
  presetModalSave: { backgroundColor: colors.primary },
  presetModalSaveText: { color: colors.background, fontWeight: '700' },
  presetModalHint: { fontSize: 11, color: colors.textDim, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
});
