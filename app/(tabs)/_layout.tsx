import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { colors } from '../../src/theme/colors';
import { PagerScrollContext } from '../../src/hooks/usePagerScroll';

import SimpleScreen from './index';
import TwoLoadsScreen from './two-loads';
import CantileverScreen from './cantilever';
import BoomScreen from './boom';
import SettingsScreen from './settings';

type TabScreen = React.ComponentType<{ isActive: boolean }>;

const TABS: { key: string; title: string; Icon: React.ComponentType<{ color: string }>; Screen: TabScreen }[] = [
  { key: 'simple',     title: 'Simple',     Icon: SimpleIcon,     Screen: SimpleScreen as TabScreen },
  { key: 'two-loads',  title: 'Two Loads',  Icon: TwoLoadsIcon,   Screen: TwoLoadsScreen as TabScreen },
  { key: 'cantilever', title: 'Cantilever', Icon: CantileverIcon, Screen: CantileverScreen as TabScreen },
  { key: 'boom',       title: 'Boom',       Icon: BoomIcon,       Screen: BoomScreen as TabScreen },
  { key: 'settings',   title: 'Settings',   Icon: SettingsIcon,   Screen: SettingsScreen as TabScreen },
];

export default function TabLayout() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const pager = useRef<PagerView>(null);
  const insets = useSafeAreaInsets();

  return (
    <PagerScrollContext.Provider value={setScrollEnabled}>
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <PagerView
        ref={pager}
        style={s.pager}
        initialPage={0}
        overdrag
        scrollEnabled={scrollEnabled}
        onPageSelected={(e: { nativeEvent: { position: number } }) => setActiveIndex(e.nativeEvent.position)}
      >
        {TABS.map((tab, i) => (
          <View key={tab.key} style={s.page}>
            <tab.Screen isActive={i === activeIndex} />
          </View>
        ))}
      </PagerView>

      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => {
                pager.current?.setPage(i);
                setActiveIndex(i);
              }}
              activeOpacity={0.7}
            >
              <View style={s.tabIconWrap}>
                <tab.Icon color={active ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
    </PagerScrollContext.Provider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIconWrap: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});

function TextIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

function CantileverIcon({ color }: { color: string }) {
  return <TextIcon label="⊢" color={color} />;
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
  return (
    <Svg width={22} height={20} viewBox="0 0 22 20">
      <Line x1="4" y1="4" x2="18" y2="4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="9" y1="4" x2="9" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
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
