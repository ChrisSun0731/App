import { describe, expect, test } from '@jest/globals';

import { buildMonthGrid, groupTodosByDate, itemsForDay } from './calendar-grid';
import { isSchoolCalendarFile, isSchoolEvent, toSchoolEvents, type SchoolCalendarFile } from './school-calendar';
import type { CalendarEvent, Todo } from './types';

describe('calendar dates and items', () => {
  test('shows six Sunday-first weeks across the year boundary with a correct today marker', () => {
    const days = buildMonthGrid(2027, 0, new Date(2027, 0, 1));
    expect(days).toHaveLength(42);
    expect(days[0].key).toBe('2026-12-27');
    expect(days[41].key).toBe('2027-02-06');
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
    expect(days.find((day) => day.isToday)?.key).toBe('2027-01-01');
  });

  test('keeps multi-day events inclusive and todos tied to their own calendar date', () => {
    const event: CalendarEvent = { id: 'event', title: '考試', startDate: '2026-12-31', endDate: '2027-01-02', category: { name: '考試', color: '#C62828' } };
    const todo: Todo = { id: 'todo', title: '複習', date: '2027-01-02', category: null };
    expect(itemsForDay('2027-01-02', [event], [todo]).map((item) => item.type)).toEqual(['event', 'todo']);
    expect(itemsForDay('2027-01-03', [event], [todo])).toEqual([]);
  });

  test('lists a day\'s open todos before those checked off', () => {
    const done: Todo = { id: 'done', title: '交作業', date: '2027-01-02', category: null, completedAt: new Date(2027, 0, 2, 8).toISOString() };
    const todo: Todo = { id: 'todo', title: '複習', date: '2027-01-02', category: null };
    expect(itemsForDay('2027-01-02', [], [done, todo]).map((item) => item.key)).toEqual(['todo-todo', 'todo-done']);
  });

  test('sorts across different years and keeps undated todos last', () => {
    const todos: Todo[] = [
      { id: '1', title: 'a', date: null, category: null },
      { id: '2', title: 'b', date: '2027-01-01', category: null },
      { id: '3', title: 'c', date: '2026-12-31', category: null },
    ];
    expect(groupTodosByDate(todos).map((group) => group.dateKey)).toEqual(['2026-12-31', '2027-01-01', null]);
  });
});

describe('read-only school calendar', () => {
  test('ignores malformed or reversed dates without dropping the valid school activity', () => {
    const file = { term: '115-1', events: [
      null,
      { title: '無效日期', startDate: '2026-02-30', endDate: '2026-02-30' },
      { title: '倒序日期', startDate: '2026-10-05', endDate: '2026-10-04' },
      { title: '校慶', startDate: '2026-10-04', endDate: '2026-10-04', department: '學務處', tentative: true },
    ] };
    expect(isSchoolCalendarFile(file)).toBe(true);
    const events = toSchoolEvents(file as unknown as SchoolCalendarFile);
    expect(events).toHaveLength(1);
    expect(events[0].school).toMatchObject({ department: '學務處', tentative: true });
    expect(isSchoolEvent(events[0])).toBe(true);
    expect(isSchoolCalendarFile({ term: [], events: [] })).toBe(false);
  });
});
