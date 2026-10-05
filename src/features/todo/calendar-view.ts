// Pure helpers behind the 行事曆 screen: month cells for the kit's
// MonthCalendar, day titles, event row text, todo filter options and the
// date groups of the 待辦 view. Kept out of the screen so they can be unit
// tested without a renderer.
import { formatFullDate, fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';
import type { CalendarCell, CalendarIndicator, ChoiceOption } from '@/ui/types';

import { buildMonthGrid, groupTodosByDate, itemsForDay, MAX_DAY_INDICATORS, type DayItem } from './calendar-grid';
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
  return date.getFullYear() === today.getFullYear() ? monthDayWeekday(date) : formatLongDate(key);
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
 * The 42 MonthCalendar cells of `year`/`month` (0-based): events as dots in
 * their category colour, then todos as squares in `todoColor`. Each cell's
 * spoken label carries the full date, weekday and what is on that day, since
 * the indicators are colour only.
 */
export function calendarCells(
  year: number,
  month: number,
  events: CalendarEvent[],
  todos: Todo[],
  todoColor: string,
  today: Date = new Date(),
): CalendarCell[] {
  return buildMonthGrid(year, month, today).map((day) => {
    const items = itemsForDay(day.key, events, todos);
    const indicators = items.slice(0, MAX_DAY_INDICATORS).map((item): CalendarIndicator => (
      item.type === 'event'
        ? { key: item.key, color: item.event.category.color, shape: 'dot' }
        : { key: item.key, color: todoColor, shape: 'square' }
    ));
    return {
      key: day.key,
      day: day.date.getDate(),
      inMonth: day.inMonth,
      isToday: day.isToday,
      indicators,
      accessibilityLabel: [day.isToday ? '今天' : '', formatLongDate(day.key), daySummary(items)].filter(Boolean).join('，'),
    };
  });
}

/**
 * Row text for an event in the day list: "category · dates". School events
 * also show their department (overline) and whether the date is tentative or
 * approximate, as the previous screen did.
 */
export function eventRowText(event: CalendarEvent): { subtitle: string; overline?: string } {
  const parts = [event.category.name, formatDateRange(event.startDate, event.endDate)];
  if (event.school?.tentative) parts.push('暫定日期');
  if (event.school?.approximate) parts.push('約略日期');
  return { subtitle: parts.join(' · '), overline: event.school?.department || undefined };
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

/** 顯示類別 options with counts, e.g. "所有待辦 (3)", "作業 (2)". */
export function todoFilterOptions(todos: readonly Todo[], categories: readonly TodoCategory[]): ChoiceOption[] {
  return [
    { label: `所有待辦 (${todos.length})`, value: ALL_TODOS },
    ...todoCategoryNames(todos, categories).map((name) => ({
      label: `${name} (${todos.filter((todo) => todo.category?.name === name).length})`,
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

/** One section per date (ascending, undated last), overdue dates flagged. */
export function todoSections(todos: Todo[], today: Date = new Date()): TodoSection[] {
  const todayKey = toDateKey(today);
  return groupTodosByDate(todos).map((group) => ({
    key: group.dateKey ?? 'undated',
    title: group.dateKey ? formatDayTitle(group.dateKey, today) : '無日期',
    overdue: group.dateKey !== null && group.dateKey < todayKey,
    todos: group.todos,
  }));
}
