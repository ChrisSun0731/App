import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { usePalette } from '@/theme/palette';

type ScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Stack>['screenOptions']>,
  Record<string, unknown>
>;

/**
 * Header styling shared by every stack. iOS keeps the system navigation bar
 * (Liquid Glass on iOS 26+) tinted with the CK navy; Android gets a Material 3
 * top app bar on the surface colour without a shadow.
 */
export function useStackScreenOptions(): ScreenOptions {
  const palette = usePalette();
  if (process.env.EXPO_OS === 'ios') {
    return {
      headerTintColor: palette.tint as string,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: palette.background },
    };
  }
  return {
    headerStyle: { backgroundColor: palette.background as string },
    headerTintColor: palette.text as string,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: palette.background },
  };
}
