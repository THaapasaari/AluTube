import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, UnitSystem, DesignFactor } from '../../src/hooks/useSettings';
import { colors } from '../../src/theme/colors';

const DF_OPTIONS: DesignFactor[] = [1, 2, 3, 4, 5, 6, 7];

export default function SettingsScreen() {
  const { units, setUnits, df, setDf } = useSettings();
  const [dfPickerOpen, setDfPickerOpen] = useState(false);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Settings</Text>

        <Section title="Default Units">
          <UnitToggle value={units} onChange={setUnits} />
        </Section>

        <Section title="Design Factor">
          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setDfPickerOpen(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={s.dropdownValue}>{df}:1</Text>
              <Text style={s.dropdownHint}>
                Tap to change · σ_allowable = σ_yield / {df}
              </Text>
            </View>
            <Text style={s.dropdownChevron}>▾</Text>
          </TouchableOpacity>
        </Section>

        <Modal
          visible={dfPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDfPickerOpen(false)}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setDfPickerOpen(false)}>
            <Pressable style={s.modalSheet}>
              <Text style={s.modalTitle}>Select Design Factor</Text>
              {DF_OPTIONS.map((n) => (
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
                      Allowable stress = {(255 / n).toFixed(1)} N/mm²
                    </Text>
                  </View>
                  {df === n && <Text style={s.modalCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Section title="Material">
          <View style={s.materialRow}>
            <Text style={s.materialLabel}>6061-T6 Aluminium</Text>
            <Text style={s.materialSub}>Fixed — more materials in a future update</Text>
          </View>
        </Section>

        <Section title="About">
          <InfoRow label="Young's Modulus (E)" value="70 000 N/mm²" />
          <InfoRow label="Yield Strength (σ)" value="255 N/mm²" />
          <InfoRow label="Density (ρ)" value="2.71 g/cm³" />
          <InfoRow label="Deflection Limit" value="L / 120  (serviceability)" />
          <InfoRow label="Standard" value="EN 755-2 / AISC" />
        </Section>

        <Section title="How Design Factor Works">
          <Text style={s.body}>
            The Design Factor (DF) divides the yield strength to give you an allowable
            stress. DF 1:1 means you use the full capacity of the tube — no safety
            margin. DF 3:1 means you only use one third of the capacity, giving you a
            3× safety buffer.{'\n\n'}
            On film sets a DF of 3:1 to 5:1 is common for rigging applications.
          </Text>
        </Section>

        <Section title="About This App">
          <Text style={s.body}>
            AluTube calculates point-load structural limits for 6061-T6 aluminium
            tubes modelled as a simply-supported beam. All formulas are verified
            against reference spreadsheet calculations.{'\n\n'}
            Always have your rigging verified by a qualified structural engineer for
            safety-critical applications.
          </Text>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
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
  scroll: { padding: 20, paddingBottom: 40 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    marginTop: 8,
  },
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
  materialRow: { gap: 4 },
  materialLabel: { fontSize: 16, color: colors.text, fontWeight: '600' },
  materialSub: { fontSize: 13, color: colors.textMuted },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '600', textAlign: 'right' },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
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
  },
  dropdownValue: { fontSize: 22, color: colors.primary, fontWeight: '800', letterSpacing: 0.5 },
  dropdownHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
});
