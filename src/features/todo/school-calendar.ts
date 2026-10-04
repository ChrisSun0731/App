// The term 行事曆, read from the Data repo (calendar/<term>.json). Generated
// there from the school's PDF by tools/convert_calendar_pdf.py.
import { isDateKey } from '@/lib/dates';

import type { CalendarEvent, EventCategory } from './types';

/** The term file to load. Update this when a new term's file is published. */
export const SCHOOL_CALENDAR_FILE = 'calendar/115-1.json';

/** Events in this category came from the school and cannot be edited. */
export const SCHOOL_EVENT_CATEGORY: EventCategory = { name: '學校事務', color: '#00897B' };

interface RawSchoolEvent {
  title: string;
  startDate: string;
  endDate: string;
  department?: string;
  tentative?: boolean;
  approximate?: boolean;
}

export interface SchoolCalendarFile {
  term?: string;
  events: RawSchoolEvent[];
}

export function isSchoolCalendarFile(data: unknown): data is SchoolCalendarFile {
  return typeof data === 'object' && data !== null && !Array.isArray(data) &&
    Array.isArray((data as SchoolCalendarFile).events) &&
    ((data as SchoolCalendarFile).term === undefined || typeof (data as SchoolCalendarFile).term === 'string');
}

/** Converts the term file into calendar events, skipping malformed entries. */
export function toSchoolEvents(file: SchoolCalendarFile): CalendarEvent[] {
  return file.events.flatMap((event, index): CalendarEvent[] => {
    if (!event || typeof event !== 'object' || typeof event.title !== 'string' || !event.title.trim() ||
      !isDateKey(event.startDate) || !isDateKey(event.endDate) || event.endDate < event.startDate) {
      return [];
    }
    return [
      {
        id: `school-${index}`,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        category: SCHOOL_EVENT_CATEGORY,
        school: {
          department: typeof event.department === 'string' ? event.department : undefined,
          tentative: event.tentative === true,
          approximate: event.approximate === true,
        },
      },
    ];
  });
}

export function isSchoolEvent(event: CalendarEvent): boolean {
  return event.school !== undefined || event.category.name === SCHOOL_EVENT_CATEGORY.name;
}
