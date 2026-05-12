import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from '../src/hooks/useSettings';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
