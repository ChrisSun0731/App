import { useDataFile } from '@/lib/remote-data';

import { SCHOOL_CALENDAR_FILE, isSchoolCalendarFile, toSchoolEvents } from './school-calendar';
import type { CalendarEvent } from './types';

const EMPTY: CalendarEvent[] = [];

/** The term 行事曆 as read-only calendar events (empty while unavailable). */
export function useSchoolEvents() {
  const { data, isPending, isRefetching, error, refetch } = useDataFile(SCHOOL_CALENDAR_FILE, isSchoolCalendarFile);
  return {
    events: data ? toSchoolEvents(data) : EMPTY,
    term: data?.term ?? '',
    isPending,
    isRefetching,
    error,
    refetch,
  };
}
