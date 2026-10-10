import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { usePalette } from '@/theme/palette';

type ScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Stack>['screenOptions']>,
  Record<string, unknown>
>;

/**
 * A tab root's title on iOS: the system large title over the grouped
 * background, collapsing into the bar as the list scrolls (UIKit finds the
 * SwiftUI List's scroll view). The screen's subtitle is the first row of its
 * list (ListScreen `subtitle`). Android keeps its top app bar title.
 */
export const LARGE_TITLE: ScreenOptions =
  process.env.EXPO_OS === 'ios' ? { headerLargeTitle: true, headerLargeTitleShadowVisible: false } : {};

/**
 * Header styling shared by every stack. iOS keeps the system navigation bar
 * (Liquid Glass on iOS 26+): buttons in the CK navy, titles in the label
 * colour. Android gets a Material 3 top app bar on the surface colour without
 * a shadow.
 */
export function useStackScreenOptions(): ScreenOptions {
  const palette = usePalette();
  if (process.env.EXPO_OS === 'ios') {
    return {
      headerTintColor: palette.tint as string,
      headerTitleStyle: { color: palette.text as string },
      headerLargeTitleStyle: { color: palette.text as string },
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
