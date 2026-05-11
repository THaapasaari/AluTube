import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, UnitSystem } from '../../src/hooks/useSettings';
import { colors } from '../../src/theme/colors';

export default function SettingsScreen() {
  const { units, setUnits } = useSettings();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Settings</Text>

        <Section title="Default Units">
          <UnitToggle value={units} onChange={setUnits} />
        </Section>

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
});
