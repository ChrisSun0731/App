import { describe, expect, test } from '@jest/globals';

import {
  ALL_TODOS,
  calendarCells,
  dayIndicators,
  effectiveFilter,
  eventRowText,
  filterTodos,
  formatDateRange,
  formatDayTitle,
  todoFilterOptions,
  todoSections,
} from './calendar-view';
import { itemsForDay } from './calendar-grid';
import { SCHOOL_EVENT_CATEGORY } from './school-calendar';
import type { CalendarEvent, Todo } from './types';

const TINT = '#03328D';
const exam: CalendarEvent = {
  id: 'exam',
  title: '段考',
  startDate: '2026-10-04',
  endDate: '2026-10-06',
  category: { name: '考試', color: '#C62828' },
};
const homework: Todo = { id: 'hw', title: '數學作業', date: '2026-10-04', category: { name: '作業' } };
const undated: Todo = { id: 'read', title: '讀書', date: null, category: null };

describe('day titles and ranges', () => {
  test('drops the year only for the current year', () => {
    const today = new Date(2026, 9, 5);
    expect(formatDayTitle('2026-10-04', today)).toBe('10月4日 星期日');
    expect(formatDayTitle('2027-01-02', today)).toBe('2027年1月2日 星期六');
  });

  test('shows one date for a single-day event and a span otherwise', () => {
    expect(formatDateRange('2026-10-04', '2026-10-04')).toBe('2026/10/4');
    expect(formatDateRange('2026-12-31', '2027-01-02')).toBe('2026/12/31 – 2027/1/2');
  });
});

describe('month calendar cells', () => {
  test('draws events as category-colour dots before a todo tint square', () => {
    const cells = calendarCells(2026, 9, [exam], [homework], TINT, new Date(2026, 9, 5));
    expect(cells).toHaveLength(42);
    const day = cells.find((cell) => cell.key === '2026-10-04')!;
    expect(day.indicators).toEqual([
      { key: 'event-#c62828', color: '#C62828', shape: 'dot' },
      { key: 'todo', color: TINT, shape: 'square' },
    ]);
    expect(day.accessibilityLabel).toBe('2026年10月4日 星期日，1 個活動、1 個待辦');
    // Multi-day events mark every day they cover.
    expect(cells.find((cell) => cell.key === '2026-10-06')!.indicators).toHaveLength(1);
  });

  test('marks today and days outside the month, and speaks empty days', () => {
    const cells = calendarCells(2026, 9, [], [], TINT, new Date(2026, 9, 5));
    const today = cells.find((cell) => cell.isToday)!;
    expect(today.key).toBe('2026-10-05');
    expect(today.accessibilityLabel).toBe('今天，2026年10月5日 星期一，沒有活動或待辦');
    expect(cells[0]).toMatchObject({ key: '2026-09-27', day: 27, inMonth: false });
  });
});

describe('day indicators', () => {
  const day = '2026-10-14';
  const schoolEvent = (index: number): CalendarEvent => ({
    id: `school-${index}`,
    title: `學校活動 ${index}`,
    startDate: day,
    endDate: day,
    category: SCHOOL_EVENT_CATEGORY,
  });
  const userEvent = (index: number, color: string): CalendarEvent => ({
    id: `user-${index}`,
    title: `活動 ${index}`,
    startDate: day,
    endDate: day,
    category: { name: `類別 ${index}`, color },
  });
  const todo = (index: number): Todo => ({ id: `todo-${index}`, title: `待辦 ${index}`, date: day, category: null });

  test('a busy school day shows one school dot and still shows its todo', () => {
    const events = Array.from({ length: 5 }, (_, index) => schoolEvent(index));
    const cell = calendarCells(2026, 9, events, [todo(1)], TINT, new Date(2026, 9, 5)).find(({ key }) => key === day)!;
    expect(cell.indicators).toEqual([
      { key: 'event-#00897b', color: SCHOOL_EVENT_CATEGORY.color, shape: 'dot' },
      { key: 'todo', color: TINT, shape: 'square' },
    ]);
    // The spoken label keeps the real counts.
    expect(cell.accessibilityLabel).toContain('5 個活動、1 個待辦');
  });

  test('keeps the todo square within three slots and caps colours to fit', () => {
    const events = ['#C62828', '#1565C0', '#2E7D32', '#6A1B9A'].map((color, index) => userEvent(index, color));
    const withTodos = dayIndicators(itemsForDay(day, events, [todo(1), todo(2), todo(3)]), TINT);
    expect(withTodos.map((indicator) => indicator.color)).toEqual(['#C62828', '#1565C0', TINT]);
    expect(withTodos.map((indicator) => indicator.shape)).toEqual(['dot', 'dot', 'square']);
    const eventsOnly = dayIndicators(itemsForDay(day, events, []), TINT);
    expect(eventsOnly.map((indicator) => indicator.color)).toEqual(['#C62828', '#1565C0', '#2E7D32']);
  });

  test('treats colours differing only in case as one dot, and todos alone as one square', () => {
    const events = [userEvent(1, '#00897b'), userEvent(2, '#00897B')];
    expect(dayIndicators(itemsForDay(day, events, []), TINT)).toEqual([
      { key: 'event-#00897b', color: '#00897b', shape: 'dot' },
    ]);
    expect(dayIndicators(itemsForDay(day, [], [todo(1), todo(2)]), TINT)).toEqual([
      { key: 'todo', color: TINT, shape: 'square' },
    ]);
    expect(dayIndicators([], TINT)).toEqual([]);
  });
});

describe('event rows', () => {
  test('user events show category and dates', () => {
    expect(eventRowText(exam)).toEqual({ subtitle: '考試 · 2026/10/4 – 2026/10/6', overline: undefined });
  });

  test('school events add department, 暫定 and 約略', () => {
    const school: CalendarEvent = {
      id: 'school-1',
      title: '校慶',
      startDate: '2026-10-04',
      endDate: '2026-10-04',
      category: SCHOOL_EVENT_CATEGORY,
      school: { department: '學務處', tentative: true, approximate: true },
    };
    expect(eventRowText(school)).toEqual({ subtitle: '學校事務 · 2026/10/4 · 暫定日期 · 約略日期', overline: '學務處' });
  });
});

describe('todo list', () => {
  const todos: Todo[] = [homework, undated, { id: 'old', title: '借書', date: '2026-10-01', category: { name: '已刪除' } }];

  test('offers every todo plus each category, deleted ones included, with counts', () => {
    expect(todoFilterOptions(todos, [{ name: '作業' }, { name: '社團' }])).toEqual([
      { label: '所有待辦 (3)', value: ALL_TODOS },
      { label: '作業 (1)', value: '作業' },
      { label: '社團 (0)', value: '社團' },
      { label: '已刪除 (1)', value: '已刪除' },
    ]);
  });

  test('filters by category and falls back to every todo for a vanished one', () => {
    expect(filterTodos(todos, '作業')).toEqual([homework]);
    expect(filterTodos(todos, ALL_TODOS)).toHaveLength(3);
    expect(effectiveFilter('社團', todos, [{ name: '社團' }])).toBe('社團');
    expect(effectiveFilter('社團', todos, [])).toBe(ALL_TODOS);
  });

  test('groups by date with overdue dates flagged and undated last', () => {
    const sections = todoSections(todos, new Date(2026, 9, 4, 9));
    expect(sections.map(({ key, title, overdue }) => ({ key, title, overdue }))).toEqual([
      { key: '2026-10-01', title: '10月1日 星期四', overdue: true },
      { key: '2026-10-04', title: '10月4日 星期日', overdue: false },
      { key: 'undated', title: '無日期', overdue: false },
    ]);
  });
});
