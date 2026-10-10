// Pure helpers behind the 行事曆 screen: month cells for the kit's
// MonthCalendar (with 假 / 考 marks), the grade filter and the footer that
// controls it, day titles, event row text, todo filter options and the date
// groups of the 待辦 view. Kept out of the screen so they can be unit tested
// without a renderer.
import { addDays, formatFullDate, formatMonthDayRange, fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';
import { CALENDAR_CELL_INDICATORS, type CalendarCell, type CalendarIndicator, type ChoiceOption } from '@/ui/types';

import { buildMonthGrid, groupTodosByDate, itemsForDay, type DayItem } from './calendar-grid';
import { GRADE_LABELS, isDayOff, isExamFor, isForGrade, showsOnDay, type Grade } from './school-days';
import { isCompleted, openFirst, openTodos } from './todo-state';
import type { CalendarEvent, Todo, TodoCategory } from './types';

function monthDayWeekday(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAY_ZH[date.getDay()]}`;
}

/** e.g. "2026年10月4日 星期日". */
export function formatLongDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getFullYear()}年${monthDayWeekday(date)}`;
}

/** e.g. "10月4日 星期日"; the year is kept when it is not this year's. */
export function formatDayTitle(key: string, today: Date = new Date()): string {
  const date = fromDateKey(key);
  const title = date.getFullYear() === today.getFullYear() ? monthDayWeekday(date) : formatLongDate(key);
  return key === toDateKey(today) ? `${title} · 今天` : title;
}

/** e.g. "2026/10/4", or "2026/10/4 – 2026/10/6" for a multi-day event. */
export function formatDateRange(startKey: string, endKey: string): string {
  const start = formatFullDate(fromDateKey(startKey));
  return endKey === startKey ? start : `${start} – ${formatFullDate(fromDateKey(endKey))}`;
}

function daySummary(items: readonly DayItem[]): string {
  const events = items.filter((item) => item.type === 'event').length;
  const todos = items.length - events;
  const parts = [events ? `${events} 個活動` : '', todos ? `${todos} 個待辦` : ''].filter(Boolean);
  return parts.length ? parts.join('、') : '沒有活動或待辦';
}

/**
 * A day's MonthCalendar indicators, at most CALENDAR_CELL_INDICATORS (all a
 * cell draws on every platform): one dot per distinct event category colour,
 * then one square in `todoColor` when the day has any todo. Deduplicating
 * matters because a busy school day is many same-colour 學校事務 events, which
 * would otherwise fill every slot; and the todo square always keeps its slot
 * so a todo never hides behind events. The exact counts are in the cell's
 * spoken label and the day list.
 */
export function dayIndicators(items: readonly DayItem[], todoColor: string): CalendarIndicator[] {
  const hasTodo = items.some((item) => item.type === 'todo');
  const dots = new Map<string, CalendarIndicator>();
  for (const item of items) {
    if (item.type !== 'event') continue;
    // Hex colours are case-insensitive; "#00897b" and "#00897B" are one dot.
    const key = `event-${item.event.category.color.toLowerCase()}`;
    if (!dots.has(key)) dots.set(key, { key, color: item.event.category.color, shape: 'dot' });
  }
  const shown = [...dots.values()].slice(0, CALENDAR_CELL_INDICATORS - (hasTodo ? 1 : 0));
  return hasTodo ? [...shown, { key: 'todo', color: todoColor, shape: 'square' }] : shown;
}

/** 假 when a school holiday covers the day, else 考 when an exam for `grade` does. */
export function dayMark(items: readonly DayItem[], grade: Grade | null): CalendarCell['mark'] {
  const events = items.flatMap((item) => (item.type === 'event' ? [item.event] : []));
  if (events.some(isDayOff)) return { text: '假', tone: 'holiday' };
  if (events.some((event) => isExamFor(event, grade))) return { text: '考', tone: 'exam' };
  return undefined;
}

/**
 * The 42 MonthCalendar cells of `year`/`month` (0-based), indicators per
 * dayIndicators and the 假 / 考 mark per dayMark. Each cell's spoken label
 * carries the full date, weekday and what is on that day, since the
 * indicators are colour only.
 */
export function calendarCells(
  year: number,
  month: number,
  events: CalendarEvent[],
  todos: Todo[],
  todoColor: string,
  today: Date = new Date(),
  grade: Grade | null = null,
): CalendarCell[] {
  return buildMonthGrid(year, month, today).map((day) => {
    const items = itemsForDay(day.key, events, todos);
    // A long school event (a sign-up window) would dot every day it spans;
    // it dots its first and last day, and the day list still shows it. A todo
    // checked off keeps its row in the day list but gives up its square.
    const marked = items.filter((item) => (item.type === 'event' ? showsOnDay(item.event, day.key) : !isCompleted(item.todo)));
    return {
      key: day.key,
      day: day.date.getDate(),
      inMonth: day.inMonth,
      isToday: day.isToday,
      indicators: dayIndicators(marked, todoColor),
      mark: dayMark(items, grade),
      accessibilityLabel: [day.isToday ? '今天' : '', formatLongDate(day.key), daySummary(items)].filter(Boolean).join('，'),
    };
  });
}

/**
 * The school events shown when only the grade's are wanted: those naming it
 * or no grade. `hidden` counts the ones left out in the month on screen.
 */
export function eventsForGrade(
  events: readonly CalendarEvent[],
  grade: Grade | null,
  month: { year: number; month: number },
): { events: CalendarEvent[]; hidden: number } {
  const first = toDateKey(new Date(month.year, month.month, 1));
  const last = toDateKey(new Date(month.year, month.month + 1, 0));
  const shown = events.filter((event) => isForGrade(event.title, grade));
  const hidden = events.filter((event) => !isForGrade(event.title, grade) && event.startDate <= last && event.endDate >= first).length;
  return { events: shown, hidden };
}

/**
 * Row text for an event in the day list: "category · dates". School events
 * also show their department (overline) and whether the date is tentative or
 * approximate, as the previous screen did.
 */
/** Where an event comes from: 學校 · 學務處 for the school's, else its category. */
export function eventSource(event: CalendarEvent): string {
  return event.school ? ['學校', event.school.department].filter(Boolean).join(' · ') : event.category.name;
}

export function eventRowText(event: CalendarEvent): { subtitle: string } {
  const parts = [eventSource(event)];
  parts.push(event.startDate === event.endDate ? '全天' : formatShortRange(event.startDate, event.endDate));
  if (event.school?.tentative) parts.push('暫定日期');
  if (event.school?.approximate) parts.push('約略日期');
  return { subtitle: parts.join(' · ') };
}

/** e.g. "10月13日–14日", "10月30日–11月2日" (keys "YYYY-MM-DD"). */
export function formatShortRange(startKey: string, endKey: string): string {
  return formatMonthDayRange(fromDateKey(startKey), fromDateKey(endKey));
}

/** An item of 接下來, with the day it falls on. */
export interface UpcomingItem {
  key: string;
  date: Date;
  item: DayItem;
}

/**
 * What comes after `dayKey`: events starting and open todos due on the next
 * days (up to `days` ahead), soonest first, at most `limit`. Events that
 * started earlier are left out; the day lists show them. So are todos checked
 * off: they are done, whatever day they were due.
 */
export function upcomingItems(
  dayKey: string,
  events: readonly CalendarEvent[],
  todos: readonly Todo[],
  { limit = 5, days = 14 }: { limit?: number; days?: number } = {},
): UpcomingItem[] {
  const last = toDateKey(addDays(fromDateKey(dayKey), days));
  const items: UpcomingItem[] = [
    ...events
      .filter((event) => event.startDate > dayKey && event.startDate <= last)
      .map((event): UpcomingItem => ({ key: `event-${event.id}`, date: fromDateKey(event.startDate), item: { type: 'event', key: `event-${event.id}`, event } })),
    ...todos
      .filter((todo): todo is Todo & { date: string } => !isCompleted(todo) && todo.date !== null && todo.date > dayKey && todo.date <= last)
      .map((todo): UpcomingItem => ({ key: `todo-${todo.id}`, date: fromDateKey(todo.date), item: { type: 'todo', key: `todo-${todo.id}`, todo } })),
  ];
  return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit);
}

/** A term name spaced like the rest of the UI: 115學年度第1學期 → 115 學年度第 1 學期. */
export function spacedTerm(term: string): string {
  return term.replace(/(\d)(?=[^\d\s])/g, '$1 ').replace(/([^\d\s])(?=\d)/g, '$1 ');
}

/** The grades other than `grade`, e.g. 高一、高三, for the hidden-events note. */
export function otherGrades(grade: Grade): string {
  return ([1, 2, 3] as const).filter((other) => other !== grade).map((other) => GRADE_LABELS[other]).join('、');
}

export interface GradeFilterFooter {
  text: string;
  /** The footer link: its label, and the value it gives the filter. */
  action: { label: string; gradeOnly: boolean };
}

/**
 * The footer under the month that is the grade filter's one control on the
 * screen (設定 has the other). `hidden` counts the month's school events for
 * other grades only: with the filter on it says how many are hidden and
 * offers 全部顯示, with it off it offers the filter back. Nothing when the
 * month has none, or the grade is unknown: the filter needs one.
 */
export function gradeFilterFooter(grade: Grade | null, gradeOnly: boolean, hidden: number): GradeFilterFooter | null {
  if (grade === null || hidden === 0) return null;
  return gradeOnly
    ? { text: `已隱藏 ${hidden} 則只給${otherGrades(grade)}的活動。`, action: { label: '全部顯示', gradeOnly: false } }
    : { text: '顯示所有年級的活動。', action: { label: `只顯示和${GRADE_LABELS[grade]}有關的`, gradeOnly: true } };
}

/** The 顯示類別 value meaning every todo. Category names are never empty. */
export const ALL_TODOS = '';

/** Categories to filter by: the defined ones plus any (deleted) a todo still carries. */
export function todoCategoryNames(todos: readonly Todo[], categories: readonly TodoCategory[]): string[] {
  return [...new Set([
    ...categories.map((category) => category.name),
    ...todos.flatMap((todo) => (todo.category ? [todo.category.name] : [])),
  ])];
}

/**
 * 顯示類別 options with counts of what is left to do, e.g. "所有待辦 (3)",
 * "作業 (2)". A category only a checked-off todo carries is still offered, so
 * that todo can be found while it shows.
 */
export function todoFilterOptions(todos: readonly Todo[], categories: readonly TodoCategory[]): ChoiceOption[] {
  const open = openTodos(todos);
  return [
    { label: `所有待辦 (${open.length})`, value: ALL_TODOS },
    ...todoCategoryNames(todos, categories).map((name) => ({
      label: `${name} (${open.filter((todo) => todo.category?.name === name).length})`,
      value: name,
    })),
  ];
}

/**
 * The filter actually in effect: a category that no longer exists (deleted
 * and no todo left in it) falls back to every todo, so the picker never
 * shows a value it has no option for.
 */
export function effectiveFilter(filter: string, todos: readonly Todo[], categories: readonly TodoCategory[]): string {
  return filter !== ALL_TODOS && todoCategoryNames(todos, categories).includes(filter) ? filter : ALL_TODOS;
}

export function filterTodos(todos: Todo[], filter: string): Todo[] {
  return filter === ALL_TODOS ? todos : todos.filter((todo) => todo.category?.name === filter);
}

export interface TodoSection {
  key: string;
  /** e.g. "10月4日 星期日", or 無日期. */
  title: string;
  /** Dated before today. */
  overdue: boolean;
  todos: Todo[];
}

/** One section per date (ascending, undated last), open todos before checked-off ones, overdue dates flagged. */
export function todoSections(todos: Todo[], today: Date = new Date()): TodoSection[] {
  const todayKey = toDateKey(today);
  return groupTodosByDate(todos).map((group) => ({
    key: group.dateKey ?? 'undated',
    title: group.dateKey ? formatDayTitle(group.dateKey, today) : '無日期',
    overdue: group.dateKey !== null && group.dateKey < todayKey,
    todos: openFirst(group.todos),
  }));
}
