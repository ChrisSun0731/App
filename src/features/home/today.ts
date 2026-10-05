// Pure helpers behind the home screen: the 今天 section (date, current or next
// period), today's todos, pinned news dates and the automatic timetable fill.
// Kept out of the screen so they can be unit tested without a renderer.
import {
  getCurrentPeriod,
  getWeekParity,
  subjectFor,
  weekdayOf,
  type Period,
  type ScheduleRow,
  type Timetables,
} from '@/features/schedule/timetable';
import type { Todo } from '@/features/todo/types';
import { formatFullDate, minutesOfDay, parseClockTime, toDateKey, WEEKDAY_ZH } from '@/lib/dates';

export interface TodayPeriod {
  /** 'current': in session now. 'next': the next period with a class later today. */
  status: 'current' | 'next';
  period: Period;
  /** The subject taught this week (rotations resolved); empty for a free period. */
  subject: string;
  /** The user's note for the slot, trimmed; empty when there is none. */
  note: string;
}

/**
 * The period to show on the home screen at `date`: the one in session, else
 * the next one today that has a subject or a note. Null on weekends, after
 * the last class, or before the timetable has loaded.
 *
 * A free period in session is still returned (as 本節沒有課程) because that
 * is what is happening now; free periods ahead are skipped so the row points
 * at the next real class instead of "第八節 · 本節沒有課程".
 */
export function getTodayPeriod(
  periods: Period[],
  rows: readonly ScheduleRow[],
  date: Date,
  semesterStart: string | null,
): TodayPeriod | null {
  const weekday = weekdayOf(date);
  if (!weekday) return null;
  const parity = getWeekParity(semesterStart, date);

  const slot = (period: Period) => {
    const cell = rows.find((row) => row.name === period.name)?.[weekday];
    if (!cell) return null;
    return { subject: subjectFor(cell, parity), note: cell.note?.trim() ?? '' };
  };

  // The same rule (inclusive end minute) as the 目前 badge on the 課表 screen.
  const currentName = getCurrentPeriod(periods, date);
  const current = periods.find((period) => period.name === currentName);
  const inSession = current ? slot(current) : null;
  if (current && inSession) return { status: 'current', period: current, ...inSession };

  const now = minutesOfDay(date);
  const upcoming = periods
    .map((period) => ({ period, start: parseClockTime(period.start) }))
    .filter((entry): entry is { period: Period; start: number } => entry.start !== null && entry.start > now)
    .sort((a, b) => a.start - b.start);
  for (const { period } of upcoming) {
    const next = slot(period);
    if (next && (next.subject || next.note)) return { status: 'next', period, ...next };
  }
  return null;
}

/** e.g. "第三節 10:10–11:00". */
export function formatPeriodOverline(period: Period): string {
  return `第${period.name}節 ${period.start}–${period.end}`;
}

/** e.g. "10月5日 星期一". */
export function formatTodayTitle(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAY_ZH[date.getDay()]}`;
}

/** A pinned item's date, e.g. "2026/10/5"; undefined when the stored timestamp is unreadable. */
export function formatPinnedDate(pubDate: string): string | undefined {
  const date = new Date(pubDate);
  return Number.isNaN(date.getTime()) ? undefined : formatFullDate(date);
}

/** Todos dated `date` (local day), in the order they were added. */
export function todosDueOn(todos: readonly Todo[], date: Date): Todo[] {
  const key = toDateKey(date);
  return todos.filter((todo) => todo.date === key);
}

/**
 * The class timetable to fill the user's timetable with, or null to leave it.
 *
 * Only an empty timetable is filled: rows that exist came from the user, the
 * legacy import or an earlier fill, and must never be replaced from here. The
 * legacy import relies on this too: filling an empty timetable is the one
 * change it does not count as the user's edit (see legacy-import/session.ts),
 * and an import that switches class without rows leaves them empty so this
 * loads that class.
 */
export function timetableToAutofill(
  state: { rows: readonly ScheduleRow[]; userClass: string },
  byClass: Timetables['byClass'] | undefined,
): ScheduleRow[] | null {
  if (state.rows.length > 0 || !byClass) return null;
  // Own keys only: a stray class id such as "constructor" must not match Object.prototype.
  return Object.prototype.hasOwnProperty.call(byClass, state.userClass) ? byClass[state.userClass] : null;
}
