// Pure helpers behind 今天 besides the 現在 card (./now.ts): the heading, the
// 今日 agenda (todos, the day's events), pinned news dates and the automatic
// timetable fill. Kept out of the screen so they can be unit tested without a
// renderer.
import type { ScheduleRow, Timetables, WeekParity } from '@/features/schedule/timetable';
import { isDayOff, isExamFor, isForGrade, showsOnDay, type Grade } from '@/features/todo/school-days';
import { openFirst } from '@/features/todo/todo-state';
import type { CalendarEvent, Todo } from '@/features/todo/types';
import { formatFullDate, fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';

/** e.g. "10月5日 星期一". */
export function formatTodayTitle(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAY_ZH[date.getDay()]}`;
}

/**
 * 今天's subtitle, e.g. "10月7日 星期三 · 第 6 週 · 雙週": the teaching week and
 * its parity on school days of a known semester.
 */
export function todayHeading(date: Date, week: number | null, parity: WeekParity | null): string {
  const parts = [formatTodayTitle(date)];
  if (week) parts.push(`第 ${week} 週`);
  if (parity) parts.push(parity === 'odd' ? '單週' : '雙週');
  return parts.join(' · ');
}

/** A pinned item's date, e.g. "2026/10/5"; undefined when the stored timestamp is unreadable. */
export function formatPinnedDate(pubDate: string): string | undefined {
  const date = new Date(pubDate);
  return Number.isNaN(date.getTime()) ? undefined : formatFullDate(date);
}

/** Todos dated `date` (local day): the open ones, then those checked off, each in the order they were added. */
export function todosDueOn(todos: readonly Todo[], date: Date): Todo[] {
  const key = toDateKey(date);
  return openFirst(todos.filter((todo) => todo.date === key));
}

/**
 * The events 今日 lists for `date`: the user's own, and the school's that
 * concern the grade. Days off and exams are left out (the 現在 card and the
 * exam row show them), and so are long school events except on their first
 * and last day.
 */
export function agendaEvents(
  date: Date,
  schoolEvents: readonly CalendarEvent[],
  ownEvents: readonly CalendarEvent[],
  grade: Grade | null,
): CalendarEvent[] {
  const key = toDateKey(date);
  const covers = (event: CalendarEvent) => event.startDate <= key && key <= event.endDate;
  const school = schoolEvents.filter((event) =>
    covers(event) &&
    isForGrade(event.title, grade) &&
    !isDayOff(event) &&
    !isExamFor(event, grade) &&
    showsOnDay(event, key));
  return [...ownEvents.filter(covers), ...school];
}

/** An agenda event's subtitle: its 處室, 暫定, and where today falls in a longer event. */
export function agendaSubtitle(event: CalendarEvent, date: Date): string {
  const key = toDateKey(date);
  const parts: string[] = event.school ? ['學校', ...(event.school.department ? [event.school.department] : [])] : [event.category.name];
  if (event.school?.tentative) parts.push('暫定');
  if (event.startDate !== event.endDate) {
    const end = fromDateKey(event.endDate);
    if (key === event.endDate) parts.push('最後一天');
    else parts.push(`到 ${end.getMonth() + 1}/${end.getDate()}`);
  }
  return parts.join(' · ');
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
