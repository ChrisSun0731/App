import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { hadStoredStateAtLaunch, persistStorage } from '@/lib/storage';

/** The sections 今天 shows under its 現在 card (which is always there). */
export interface HomeWidgets {
  /** 今日: today's todos and school events, and the next exam. */
  todo: boolean;
  /** 午餐: 熱食部 and the restaurants open nearby. */
  lunch: boolean;
  /** 回家: the followed YouBike and Metro stations. */
  commute: boolean;
  /** 釘選的校網消息 */
  news: boolean;
}

const HOME_WIDGET_KEYS = ['todo', 'lunch', 'commute', 'news'] as const satisfies readonly (keyof HomeWidgets)[];

interface SettingsState {
  homeWidgets: HomeWidgets;
  /** 行事曆 shows only the school events for the user's grade (and for everyone). */
  calendarGradeOnly: boolean;
  /** The welcome screen (你是哪一班？) has been answered or skipped. */
  welcomed: boolean;
  setHomeWidget: (key: keyof HomeWidgets, value: boolean) => void;
  setCalendarGradeOnly: (value: boolean) => void;
  setWelcomed: (value: boolean) => void;
  reset: () => void;
}

const initialState = () => ({
  homeWidgets: { todo: true, lunch: true, commute: true, news: true } as HomeWidgets,
  calendarGradeOnly: true,
  welcomed: false,
});

// Older saved settings also hold a `toolbar` (the tabs, before they were
// fixed) and `homeWidgets.schedule` (目前課程, now the always-shown 現在
// card); merge ignores both and the next save drops them.
//
// Nor do they hold `welcomed`. With no flag saved, merge asks whether any
// store had saved state before this launch: if so the install predates
// 你是哪一班？ (an upgrade) and the question is skipped, since answering it
// would hand the user's edited timetable to setClass; if not, this is a fresh
// install and it is asked. The sign is hadStoredStateAtLaunch(), not this
// store's own key: a user who never changed a setting has no ck.settings
// (persist writes only on set) but does have the ck.schedule the timetable
// autofill saved, and the legacy import tells fresh from upgrade the same
// way. The welcome screen saves welcomed=false as soon as it shows
// (src/features/welcome/screen.tsx), so flag-less storage is never an
// install that was killed while the question was still up.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState(),
      setHomeWidget: (key, value) =>
        set((state) => ({ homeWidgets: { ...state.homeWidgets, [key]: value } })),
      setCalendarGradeOnly: (calendarGradeOnly) => set({ calendarGradeOnly }),
      setWelcomed: (welcomed) => set({ welcomed }),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.settings',
      storage: persistStorage,
      version: 1,
      partialize: ({ homeWidgets, calendarGradeOnly, welcomed }) => ({ homeWidgets, calendarGradeOnly, welcomed }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as {
          homeWidgets?: Partial<Record<keyof HomeWidgets, unknown>>;
          calendarGradeOnly?: unknown;
          welcomed?: unknown;
        };
        const saved = stored.homeWidgets ?? {};
        const homeWidgets = { ...current.homeWidgets };
        for (const key of HOME_WIDGET_KEYS) {
          const value = saved[key];
          if (typeof value === 'boolean') homeWidgets[key] = value;
        }
        const calendarGradeOnly = typeof stored.calendarGradeOnly === 'boolean' ? stored.calendarGradeOnly : current.calendarGradeOnly;
        // No flag saved (nothing saved at all on a fresh install): see the note above the store.
        const welcomed = typeof stored.welcomed === 'boolean' ? stored.welcomed : hadStoredStateAtLaunch();
        return { ...current, homeWidgets, calendarGradeOnly, welcomed };
      },
    },
  ),
);
