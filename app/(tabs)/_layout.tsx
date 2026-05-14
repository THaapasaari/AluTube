import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Simple',
          tabBarIcon: ({ color }) => <SimpleIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="two-loads"
        options={{
          title: 'Two Loads',
          tabBarIcon: ({ color }) => <TwoLoadsIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="cantilever"
        options={{
          title: 'Cantilever',
          tabBarIcon: ({ color }) => <TextIcon label="⊢" color={color} />,
        }}
      />
      <Tabs.Screen
        name="boom"
        options={{
          title: 'Boom',
          tabBarIcon: ({ color }) => <BoomIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

function TextIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

function SimpleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={20} viewBox="0 0 22 20">
      <Polygon points="5,2 17,2 11,12" fill={color} />
    </Svg>
  );
}

function TwoLoadsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={20} viewBox="0 0 22 20">
      <Polygon points="1,2 10,2 5.5,12" fill={color} />
      <Polygon points="12,2 21,2 16.5,12" fill={color} />
    </Svg>
  );
}

function BoomIcon({ color }: { color: string }) {
  // Stem 8px tall (y=6–14), centred at y=10 to match ⊢; bar at top of stem
  return (
    <Svg width={22} height={20} viewBox="0 0 22 20">
      <Line x1="4" y1="4" x2="18" y2="4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="9" y1="4" x2="9" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  // Three horizontal slider lines with dots
  return (
    <Svg width={22} height={20} viewBox="0 0 22 20">
      <Line x1="3" y1="4"  x2="19" y2="4"  stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="14" cy="4"  r="2.5" fill={color} />
      <Line x1="3" y1="10" x2="19" y2="10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="8"  cy="10" r="2.5" fill={color} />
      <Line x1="3" y1="16" x2="19" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="14" cy="16" r="2.5" fill={color} />
    </Svg>
  );
}
