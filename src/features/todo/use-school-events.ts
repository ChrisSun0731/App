import { useMemo } from 'react';

import { useDataFile } from '@/lib/remote-data';

import { SCHOOL_CALENDAR_FILE, isSchoolCalendarFile, toSchoolEvents } from './school-calendar';
import type { CalendarEvent } from './types';

const EMPTY: CalendarEvent[] = [];

/** The term 行事曆 as read-only calendar events (empty while unavailable). */
export function useSchoolEvents() {
  const { data, isPending, isRefetching, error, refetch } = useDataFile(SCHOOL_CALENDAR_FILE, isSchoolCalendarFile);
  // The same array until the file changes, so screens (and the widget timeline) can depend on it.
  const events = useMemo(() => (data ? toSchoolEvents(data) : EMPTY), [data]);
  return {
    events,
    term: data?.term ?? '',
    isPending,
    isRefetching,
    error,
    refetch,
  };
}
