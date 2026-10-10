import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { NowInput } from '@/features/home/now';

import { nowTimeline } from './now-timeline';

/**
 * Check the installed binary before importing expo-widgets: its iOS entry
 * throws when ExpoWidgets is missing (Expo Go or a build made before adding
 * the dependency). The App Group directory also requires ENABLE_WIDGETS=1
 * at prebuild. Other builds and platforms never load the widget layout.
 */
export const WIDGETS_ENABLED = Platform.OS === 'ios'
  && Boolean(requireOptionalNativeModule<{ widgetsDirectory: string }>('ExpoWidgets')?.widgetsDirectory);

/**
 * Rewrites the 現在 widget's timeline (the next 36 hours, one entry per bell)
 * whenever what it shows changes, and once a day while 今天 is open. Without
 * the app being opened the widget still runs to the end of that timeline.
 */
export function useNowWidget(input: Omit<NowInput, 'now'> | null, dayKey: string) {
  const { periods, rows, semesterStart, events, term, grade } = input ?? {};
  useEffect(() => {
    if (!WIDGETS_ENABLED || !periods || !rows || semesterStart === undefined || !events || term === undefined || grade === undefined) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- The layout imports the optional native module.
    const { nowWidget } = require('./now-widget') as typeof import('./now-widget');
    nowWidget().updateTimeline(nowTimeline({ periods, rows, semesterStart, events, term, grade }, new Date()));
  }, [periods, rows, semesterStart, events, term, grade, dayKey]);
}
