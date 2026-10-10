import { addDays, toDateKey } from '@/lib/dates';

import { openFirst } from './todo-state';
import type { CalendarEvent, Todo } from './types';

export interface CalendarDay {
  /** "YYYY-MM-DD" */
  key: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}

export type DayItem =
  | { type: 'event'; key: string; event: CalendarEvent }
  | { type: 'todo'; key: string; todo: Todo };

/** Six full weeks (Sunday first) covering the month of `year`/`month` (0-based). */
export function buildMonthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1);
  const gridStart = addDays(first, -first.getDay());
  const todayKey = toDateKey(today);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    return { key, date, inMonth: date.getMonth() === month, isToday: key === todayKey };
  });
}

/** Whether a multi-day event covers the day `dayKey` (all keys "YYYY-MM-DD"). */
export function eventCoversDay(event: CalendarEvent, dayKey: string): boolean {
  return event.startDate <= dayKey && dayKey <= event.endDate;
}

/**
 * Events (by start date) followed by todos (open ones first), for one day.
 * Events come first because the calendar indicators and the day list both
 * show them first.
 */
export function itemsForDay(dayKey: string, events: CalendarEvent[], todos: Todo[]): DayItem[] {
  const dayEvents: DayItem[] = events
    .filter((event) => eventCoversDay(event, dayKey))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((event) => ({ type: 'event', key: `event-${event.id}`, event }));
  const dayTodos: DayItem[] = openFirst(todos.filter((todo) => todo.date === dayKey))
    .map((todo) => ({ type: 'todo', key: `todo-${todo.id}`, todo }));
  return [...dayEvents, ...dayTodos];
}

export function monthTitle(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export interface TodoGroup {
  /** "YYYY-MM-DD", or null for undated todos. */
  dateKey: string | null;
  todos: Todo[];
}

/** Groups todos by date, dated groups ascending, undated last. */
export function groupTodosByDate(todos: Todo[]): TodoGroup[] {
  const groups = new Map<string | null, Todo[]>();
  for (const todo of todos) {
    const list = groups.get(todo.date) ?? [];
    list.push(todo);
    groups.set(todo.date, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    })
    .map(([dateKey, list]) => ({ dateKey, todos: list }));
}
