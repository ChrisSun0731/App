import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PeriodName, ScheduleCell, ScheduleRow, Weekday } from '@/features/schedule/timetable';
import { persistStorage } from '@/lib/storage';

export const DEFAULT_CLASS = '101';

interface ScheduleState {
  /** Class id, e.g. "101". */
  userClass: string;
  /**
   * The user's timetable: a copy of the class's bundled timetable, plus any
   * subject/note/colour edits. Empty until the timetables first load.
   */
  rows: ScheduleRow[];
  /** Switches class, replacing every edit with that class's timetable. */
  setClass: (userClass: string, rows: ScheduleRow[]) => void;
  /** Reloads the class's timetable, discarding edits. */
  resetRows: (rows: ScheduleRow[]) => void;
  updateCell: (period: PeriodName, day: Weekday, cell: ScheduleCell) => void;
  reset: () => void;
}

const initialState = () => ({ userClass: DEFAULT_CLASS, rows: [] as ScheduleRow[] });

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      ...initialState(),
      setClass: (userClass, rows) => set({ userClass, rows }),
      resetRows: (rows) => set({ rows }),
      updateCell: (period, day, cell) =>
        set((state) => ({
          rows: state.rows.map((row) => (row.name === period ? { ...row, [day]: cell } : row)),
        })),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.schedule',
      storage: persistStorage,
      version: 1,
      partialize: ({ userClass, rows }) => ({ userClass, rows }),
    },
  ),
);
