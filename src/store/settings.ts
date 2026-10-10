import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

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
        const welcomed = typeof stored.welcomed === 'boolean' ? stored.welcomed : current.welcomed;
        return { ...current, homeWidgets, calendarGradeOnly, welcomed };
      },
    },
  ),
);
