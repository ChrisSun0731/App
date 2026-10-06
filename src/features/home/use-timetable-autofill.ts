import { useEffect } from 'react';

import type { Timetables } from '@/features/schedule/timetable';
import { useScheduleStore } from '@/store/schedule';

import { timetableToAutofill } from './today';

/**
 * Fills an empty timetable with the user's class timetable once the class
 * timetables are available (the first launch, after 重設個人資料與設定, or
 * after an import that switched class without rows).
 *
 * The decision reads the store when the effect runs, not the rendered
 * snapshot: if anything wrote rows in between (the legacy import lands
 * asynchronously), those rows are kept. It also waits for the persisted state
 * to hydrate, so saved rows are never mistaken for an empty timetable.
 */
export function useTimetableAutofill(byClass: Timetables['byClass'] | undefined): void {
  // Re-run when the timetable empties or the class changes; the values
  // themselves are read fresh inside the effect.
  const empty = useScheduleStore((state) => state.rows.length === 0);
  const userClass = useScheduleStore((state) => state.userClass);

  useEffect(() => {
    if (!byClass || !empty) return;
    const fill = () => {
      const state = useScheduleStore.getState();
      const rows = timetableToAutofill(state, byClass);
      if (rows) state.resetRows(rows);
    };
    // Storage is synchronous, so this is normally hydrated already.
    if (!useScheduleStore.persist.hasHydrated()) return useScheduleStore.persist.onFinishHydration(fill);
    fill();
  }, [byClass, empty, userClass]);
}
