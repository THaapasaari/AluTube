/**
 * Shared UI building blocks used by every calculator tab. Pulling them out of
 * each screen keeps the per-screen files focused on their own math and layout,
 * and means a tweak to e.g. ResultCard automatically applies everywhere.
 */

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import Svg, { Text as SvgText, TSpan } from 'react-native-svg';
import { colors } from '../theme/colors';
import { TubePreset } from '../hooks/usePresets';

// ── Sub-components ──────────────────────────────────────────────────────────

export function SectionHeader({ title }: { title: string }) {
  return <Text style={ui.sectionTitle}>{title}</Text>;
}

export function Divider() {
  return <View style={ui.divider} />;
}

export function InputRow({
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
    <View style={ui.row}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        style={ui.input}
        value={value}
        onChangeText={(v) => onChangeText(v.replace(',', '.'))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primary}
        selectTextOnFocus
      />
    </View>
  );
}

export function DerivedRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.derivedRow}>
      <Text style={ui.derivedLabel}>{label}</Text>
      <Text style={ui.derivedValue}>{value}</Text>
    </View>
  );
}

export function AdvRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.advRow}>
      <Text style={ui.advLabel}>{label}</Text>
      <Text style={ui.advValue}>{value}</Text>
    </View>
  );
}

export function ResultCard({
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
    <View style={[ui.resultCard, over && ui.resultCardOver]}>
      <View style={ui.resultHeader}>
        <Text style={[ui.resultTitle, over && ui.resultTitleOver]}>{title}</Text>
        {over && <Text style={ui.overTag}>OVER LIMIT</Text>}
      </View>
      <View style={ui.resultRow}>
        <Text style={ui.resultLabel}>Current</Text>
        <Text style={[ui.resultValue, over && ui.resultValueOver]}>{current}</Text>
      </View>
      <View style={ui.resultRow}>
        <Text style={ui.resultLabel}>Max allowed</Text>
        <Text style={ui.resultValueLimit}>{limit}</Text>
      </View>
      <View style={ui.barBg}>
        <View
          style={[ui.barFill, { width: `${clampedRatio * 100}%`, backgroundColor: barColor }]}
        />
      </View>
      <Text style={[ui.barPct, { color: barColor }]}>{(ratio * 100).toFixed(1)}% of limit</Text>
      <TouchableOpacity style={ui.advToggle} onPress={onToggleAdv} activeOpacity={0.6}>
        <Text style={ui.advToggleText}>{showAdv ? '▲ Hide details' : '▼ Show details'}</Text>
      </TouchableOpacity>
      {showAdv && <View style={ui.advBlock}>{advContent}</View>}
    </View>
  );
}

export function DFReminder({ df }: { df: number }) {
  return (
    <View style={ui.dfReminder}>
      <Text style={ui.dfReminderLabel}>Design Factor</Text>
      <Text style={ui.dfReminderValue}>{df}:1</Text>
      <Text style={ui.dfReminderHint}>change in Settings ⚙</Text>
    </View>
  );
}

/**
 * Standard top-of-screen header used on every calculator tab.
 * Layout: [icon placeholder]  TubeLoad                  [Reset]
 *                              <tab name, smaller font>
 */
export function AppHeader({
  tabName,
  onReset,
}: {
  tabName: string;
  onReset?: () => void;
}) {
  return (
    <View style={ui.appHeader}>
      <Image
        source={require('../../assets/TubeLoadApp_icon.png')}
        style={ui.appIcon}
      />
      <View style={ui.appHeaderTitles}>
        <Svg width={102} height={26}>
          <SvgText
            y={20}
            fontSize={20}
            fontWeight="900"
          >
            <TSpan x={1} fill={colors.text}>Tube</TSpan>
            <TSpan fill={colors.primary}>Load</TSpan>
          </SvgText>
        </Svg>
        <Text style={ui.appNameDivider}>│</Text>
        <Text style={ui.tabName}>{tabName}</Text>
      </View>
      {onReset && <ResetButton onPress={onReset} />}
    </View>
  );
}

export function ResetButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={ui.resetBtn}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Reset inputs"
    >
      <Text style={ui.resetIcon}>↻</Text>
    </TouchableOpacity>
  );
}

export function NoResultBox({ text }: { text: string }) {
  return (
    <View style={ui.noResultBox}>
      <Text style={ui.noResultText}>{text}</Text>
    </View>
  );
}

// ── Preset chip strip + save modal ──────────────────────────────────────────

interface PresetChipStripProps {
  presets: TubePreset[];
  imperial: boolean;
  /** Imperial-aware helper to format mm as inches when needed. */
  mmToIn: (mm: number) => number;
  onLoad: (p: TubePreset) => void;
  onLongPressDelete: (p: TubePreset) => Promise<void> | void;
  onTapSaveCurrent: () => void;
}

export function PresetChipStrip({
  presets,
  imperial,
  mmToIn,
  onLoad,
  onLongPressDelete,
  onTapSaveCurrent,
}: PresetChipStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={ui.presetRowOuter}
      contentContainerStyle={ui.presetRow}
      keyboardShouldPersistTaps="handled"
    >
      {presets.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={ui.presetChip}
          onPress={() => onLoad(p)}
          onLongPress={() =>
            Alert.alert('Delete preset?', `Remove "${p.name}" from your saved tubes?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onLongPressDelete(p) },
            ])
          }
          activeOpacity={0.7}
        >
          <Text style={ui.presetChipName}>{p.name}</Text>
          <Text style={ui.presetChipMeta}>
            {imperial
              ? `${mmToIn(p.d_o_mm).toFixed(2)}″ × ${mmToIn(p.t_mm).toFixed(3)}″`
              : `Ø${p.d_o_mm} × ${p.t_mm} mm`}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[ui.presetChip, ui.presetSaveChip]}
        onPress={onTapSaveCurrent}
        activeOpacity={0.7}
      >
        <Text style={ui.presetSaveLabel}>+ Save current</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface SavePresetModalProps {
  open: boolean;
  onClose: () => void;
  /** Human-readable subtitle showing the current Ø × wall. */
  currentLabel: string;
  name: string;
  setName: (s: string) => void;
  onSave: () => void;
}

export function SavePresetModal({
  open,
  onClose,
  currentLabel,
  name,
  setName,
  onSave,
}: SavePresetModalProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ui.presetModalBackdrop} onPress={onClose}>
        <Pressable style={ui.presetModalSheet}>
          <Text style={ui.presetModalTitle}>Save Tube Preset</Text>
          <Text style={ui.presetModalSub}>{currentLabel}</Text>
          <TextInput
            style={ui.presetModalInput}
            value={name}
            onChangeText={setName}
            placeholder={'e.g. "1.5″ Schedule 40"'}
            placeholderTextColor={colors.textDim}
            autoFocus
            selectionColor={colors.primary}
          />
          <View style={ui.presetModalActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[ui.presetModalBtn, ui.presetModalCancel]}
            >
              <Text style={ui.presetModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              style={[ui.presetModalBtn, ui.presetModalSave]}
              disabled={!name.trim()}
            >
              <Text style={ui.presetModalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text style={ui.presetModalHint}>Long-press a chip to delete it.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────

export const ui = StyleSheet.create({
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
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  appHeaderTitles: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  appNameDivider: {
    fontSize: 22,
    color: colors.border,
    fontWeight: '600',
  },
  tabName: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.text,
    letterSpacing: 0.5,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetIcon: { fontSize: 20, color: colors.primary, fontWeight: '700' },
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
  presetModalCancel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetModalCancelText: { color: colors.textMuted, fontWeight: '600' },
  presetModalSave: { backgroundColor: colors.primary },
  presetModalSaveText: { color: colors.background, fontWeight: '700' },
  presetModalHint: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
