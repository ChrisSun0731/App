import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/lib/query-client';
import { useStackScreenOptions } from '@/navigation/stack-options';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const options = useStackScreenOptions();
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
