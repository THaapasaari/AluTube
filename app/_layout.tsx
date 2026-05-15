import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SettingsProvider } from '../src/hooks/useSettings';
import { PresetsProvider } from '../src/hooks/usePresets';
import { colors } from '../src/theme/colors';
import { useFonts, Oswald_700Bold } from '@expo-google-fonts/oswald';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Oswald_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsProvider>
        <PresetsProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </PresetsProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
