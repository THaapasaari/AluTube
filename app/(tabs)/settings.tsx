import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, UnitSystem } from '../../src/hooks/useSettings';
import { colors } from '../../src/theme/colors';
import { MATERIALS, ALUMINIUM_IDS, STEEL_IDS } from '../../src/engineering/materials';
import { AppHeader } from '../../src/components/CalculatorUI';

const DF_PRESETS = [1, 2, 3, 4, 5, 6, 7];

export default function SettingsScreen({ isActive }: { isActive?: boolean }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { if (isActive) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [isActive]);
  const { units, setUnits, df, setDf, material, materialId, setMaterialId, showReactions, setShowReactions } = useSettings();
  const [dfPickerOpen, setDfPickerOpen] = useState(false);
  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [customDfOpen, setCustomDfOpen] = useState(false);
  const [customDfText, setCustomDfText] = useState(String(df));

  const isPresetDf = DF_PRESETS.includes(df);

  const openCustomDf = () => {
    setCustomDfText(String(df));
    setDfPickerOpen(false);
    setCustomDfOpen(true);
  };

  const saveCustomDf = () => {
    const n = parseFloat(customDfText.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      setDf(n);
      setCustomDfOpen(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll}>
        <AppHeader tabName="Settings" />

        <Section title="Default Units">
          <UnitToggle value={units} onChange={setUnits} />
        </Section>

        <Section title="Material">
          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setMatPickerOpen(true)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.dropdownValue}>{material.name}</Text>
              <Text style={s.dropdownHint}>
                E {material.E.toLocaleString()} N/mm²  ·  σ {material.yield} N/mm²  ·  ρ {material.density} g/cm³
              </Text>
            </View>
            <Text style={s.dropdownChevron}>▾</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Design Factor">
          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setDfPickerOpen(true)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.dropdownValue}>{isPresetDf ? `${df}:1` : `${df}:1  (Custom)`}</Text>
              <Text style={s.dropdownHint}>
                Allowable stress = σ_yield / {df} = {(material.yield / df).toFixed(1)} N/mm²
              </Text>
            </View>
            <Text style={s.dropdownChevron}>▾</Text>
          </TouchableOpacity>
        </Section>

        {/* Material picker modal */}
        <Modal
          visible={matPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMatPickerOpen(false)}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setMatPickerOpen(false)}>
            <Pressable style={s.modalSheet}>
              <Text style={s.modalTitle}>Select Alloy</Text>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={s.groupHeader}>Aluminium</Text>
                {ALUMINIUM_IDS.map((id) => {
                  const m = MATERIALS[id];
                  const active = id === materialId;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[s.modalOption, active && s.modalOptionActive]}
                      onPress={() => {
                        setMaterialId(id);
                        setMatPickerOpen(false);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.modalOptionLabel, active && s.modalOptionLabelActive]}>
                          {m.name}
                        </Text>
                        <Text style={s.modalOptionHint}>
                          {m.note}  ·  σ {m.yield} N/mm²
                        </Text>
                      </View>
                      {active && <Text style={s.modalCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
                <View style={s.sectionDivider} />
                <Text style={s.groupHeader}>Steel</Text>
                {STEEL_IDS.map((id) => {
                  const m = MATERIALS[id];
                  const active = id === materialId;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[s.modalOption, active && s.modalOptionActive]}
                      onPress={() => {
                        setMaterialId(id);
                        setMatPickerOpen(false);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.modalOptionLabel, active && s.modalOptionLabelActive]}>
                          {m.name}
                        </Text>
                        <Text style={s.modalOptionHint}>
                          {m.note}  ·  σ {m.yield} N/mm²
                        </Text>
                      </View>
                      {active && <Text style={s.modalCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* DF picker modal */}
        <Modal
          visible={dfPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDfPickerOpen(false)}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setDfPickerOpen(false)}>
            <Pressable style={s.modalSheet}>
              <Text style={s.modalTitle}>Select Design Factor</Text>
              {DF_PRESETS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.modalOption, df === n && s.modalOptionActive]}
                  onPress={() => {
                    setDf(n);
                    setDfPickerOpen(false);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalOptionLabel, df === n && s.modalOptionLabelActive]}>
                      {n}:1
                    </Text>
                    <Text style={s.modalOptionHint}>
                      Allowable stress = {(material.yield / n).toFixed(1)} N/mm²
                    </Text>
                  </View>
                  {df === n && <Text style={s.modalCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.modalOption, !isPresetDf && s.modalOptionActive]}
                onPress={openCustomDf}
                activeOpacity={0.6}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalOptionLabel, !isPresetDf && s.modalOptionLabelActive]}>
                    Custom…
                  </Text>
                  <Text style={s.modalOptionHint}>
                    {isPresetDf ? 'Enter your own design factor' : `Currently ${df}:1`}
                  </Text>
                </View>
                {!isPresetDf && <Text style={s.modalCheck}>✓</Text>}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Custom DF input modal */}
        <Modal
          visible={customDfOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCustomDfOpen(false)}
        >
          <Pressable style={s.centerBackdrop} onPress={() => setCustomDfOpen(false)}>
            <Pressable style={s.dialog}>
              <Text style={s.modalTitle}>Custom Design Factor</Text>
              <Text style={s.dialogHint}>
                Enter a positive number. Allowable stress = σ_yield / DF.
              </Text>
              <TextInput
                style={s.dialogInput}
                value={customDfText}
                onChangeText={setCustomDfText}
                keyboardType="decimal-pad"
                autoFocus
                placeholder="e.g. 2.5"
                placeholderTextColor={colors.textDim}
                selectionColor={colors.primary}
              />
              <View style={s.dialogActions}>
                <TouchableOpacity
                  style={[s.dialogBtn, s.dialogCancel]}
                  onPress={() => setCustomDfOpen(false)}
                >
                  <Text style={s.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.dialogBtn, s.dialogSave]}
                  onPress={saveCustomDf}
                >
                  <Text style={s.dialogSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Section title="How Design Factor Works">
          <Text style={s.body}>
            The Design Factor (DF) divides the yield strength to give you an allowable
            stress. DF 1:1 means you use the full capacity of the tube — no safety
            margin. DF 3:1 means you only use one third of the capacity, giving you a
            3× safety buffer.{'\n\n'}
            On film sets a DF of 3:1 to 5:1 is common for rigging applications.
          </Text>
        </Section>

        <Section title="About TubeLoad">
          <Text style={s.body}>
            TubeLoad calculates structural limits for aluminium and steel tubes across four loading configurations: simply supported with one or two point loads, cantilever, and boom (overhanging with counterweight).{'\n\n'}
            Supported materials include common 6000-series aluminium alloys and structural steel grades (S235–S420), with both metric and imperial variants. All formulas are verified against reference spreadsheet calculations.{'\n\n'}
            Results include deflection, bending moment, bending stress, and load capacity, with shear force and bending moment diagrams. Support reactions are shown on the beam diagram when enabled in Display settings.
          </Text>
          <View style={s.warningRow}>
            <Text style={s.warningIcon}>⚠</Text>
            <Text style={s.warningText}>
              Always have your rigging verified by a qualified structural engineer for safety-critical applications.
            </Text>
          </View>
        </Section>

        <Section title="Display">
          <SwitchRow
            label="Show Support Reactions"
            hint="Displays R_A / R_B force labels above each support in beam diagrams"
            value={showReactions}
            onChange={setShowReactions}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.switchLabel}>{label}</Text>
        {hint ? <Text style={s.switchHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function UnitToggle({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (u: UnitSystem) => void;
}) {
  return (
    <View style={s.toggleRow}>
      {(['metric', 'imperial'] as UnitSystem[]).map((u) => (
        <TouchableOpacity
          key={u}
          style={[s.toggleBtn, value === u && s.toggleActive]}
          onPress={() => onChange(u)}
          activeOpacity={0.7}
        >
          <Text style={[s.toggleText, value === u && s.toggleTextActive]}>
            {u === 'metric' ? 'Metric  (mm / kg)' : 'Imperial  (in / lbs)'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40, maxWidth: 640, alignSelf: 'center', width: '100%' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, color: colors.primary, fontWeight: '700' },
  switchHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  toggleRow: { gap: 8 },
  toggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  toggleActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,212,255,0.12)',
  },
  toggleText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  toggleTextActive: { color: colors.primary, fontWeight: '700' },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  warningIcon: { fontSize: 16, color: colors.warning, lineHeight: 22 },
  warningText: { flex: 1, fontSize: 14, color: colors.warning, lineHeight: 22 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: -4,
    gap: 10,
  },
  dropdownValue: { fontSize: 20, color: colors.primary, fontWeight: '800', letterSpacing: 0.3 },
  dropdownHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  dropdownChevron: { fontSize: 18, color: colors.primaryDim },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '82%',
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  modalOptionActive: { backgroundColor: 'rgba(0,212,255,0.08)' },
  modalOptionLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalOptionLabelActive: { color: colors.primary },
  modalOptionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalCheck: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDim,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
    marginTop: 12,
    marginBottom: 14,
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  dialogHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  dialogInput: {
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontWeight: '700',
  },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  dialogCancel: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  dialogCancelText: { color: colors.textMuted, fontWeight: '600' },
  dialogSave: { backgroundColor: colors.primary },
  dialogSaveText: { color: colors.background, fontWeight: '700' },
});
