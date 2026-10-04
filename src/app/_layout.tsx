import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { LegacyImporter } from '@/features/legacy-import/legacy-importer';
import { isAttemptingLegacyImport, startLegacyImport } from '@/features/legacy-import/session';
import { queryClient } from '@/lib/query-client';
import { useStackScreenOptions } from '@/navigation/stack-options';

void SplashScreen.preventAutoHideAsync();

// Decided once per launch, before the first render.
startLegacyImport();

// The root can mount again in a JS runtime that outlived the splash screen
// (Android 11 and earlier finish the activity on back), so this is per runtime.
let splashHidden = false;

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const options = useStackScreenOptions();
  // Read at mount: the attempt may have ended while an earlier mount was up.
  const [reading, setReading] = useState(isAttemptingLegacyImport);
  // While the previous app's data is read, the splash stays up (at most
  // SPLASH_TIMEOUT_MS) with no screen mounted, so neither the user nor the
  // screens' automatic timetable load can write to the stores first.
  const [holding, setHolding] = useState(() => reading && !splashHidden);
  const splashOver = useCallback(() => setHolding(false), []);
  const settled = useCallback(() => { setReading(false); setHolding(false); }, []);
  useEffect(() => {
    if (holding) return;
    splashHidden = true;
    void SplashScreen.hideAsync();
  }, [holding]);
  // The reader comes second so it stays mounted when the app appears.
  return <>
    {holding ? null : <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={options}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="feature/[id]" />
          <Stack.Screen name="settings" options={{ title: '設定' }} />
          <Stack.Screen name="about" options={{ title: '關於 CK APP' }} />
          <Stack.Screen name="event-editor" options={{ presentation: 'modal', title: '活動' }} />
          <Stack.Screen name="todo-editor" options={{ presentation: 'modal', title: '待辦事項' }} />
          <Stack.Screen name="schedule-editor" options={{ presentation: 'modal', title: '編輯課程' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>}
    {reading && <LegacyImporter onSplashOver={splashOver} onSettled={settled} />}
  </>;
}
