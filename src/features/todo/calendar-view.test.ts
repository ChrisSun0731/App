import { describe, expect, test } from '@jest/globals';

import {
  ALL_TODOS,
  calendarCells,
  dayIndicators,
  effectiveFilter,
  eventRowText,
  eventsForGrade,
  filterTodos,
  formatDateRange,
  formatDayTitle,
  formatShortRange,
  gradeFilterFooter,
  otherGrades,
  spacedTerm,
  todoFilterOptions,
  todoSections,
  upcomingItems,
} from './calendar-view';
import { itemsForDay } from './calendar-grid';
import { SCHOOL_EVENT_CATEGORY, toSchoolEvents } from './school-calendar';
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
/** 數學作業, checked off on the evening of its day. */
const done: Todo = { ...homework, id: 'done', completedAt: new Date(2026, 9, 4, 20).toISOString() };

describe('day titles and ranges', () => {
  test('drops the year only for the current year', () => {
    const today = new Date(2026, 9, 5);
    expect(formatDayTitle('2026-10-04', today)).toBe('10月4日 星期日');
    expect(formatDayTitle('2027-01-02', today)).toBe('2027年1月2日 星期六');
    expect(formatDayTitle('2026-10-05', today)).toBe('10月5日 星期一 · 今天');
  });

  test('short ranges name the month once', () => {
    expect(formatShortRange('2026-10-13', '2026-10-14')).toBe('10月13日–14日');
    expect(formatShortRange('2026-10-30', '2026-11-02')).toBe('10月30日–11月2日');
    expect(formatShortRange('2026-12-31', '2027-01-02')).toBe('2026年12月31日–2027年1月2日');
  });

  test('接下來 lists what starts after the day, soonest first', () => {
    const events: CalendarEvent[] = [
      exam,
      { id: 'later', title: '校慶', startDate: '2026-10-08', endDate: '2026-10-08', category: { name: '活動', color: '#00897B' } },
    ];
    const todos: Todo[] = [homework, undated, { id: 'next', title: '交報告', date: '2026-10-07', category: null }];
    expect(upcomingItems('2026-10-04', events, todos).map((entry) => entry.key)).toEqual(['todo-next', 'event-later']);
    expect(upcomingItems('2026-10-04', events, todos, { limit: 1 })).toHaveLength(1);
    expect(otherGrades(2)).toBe('高一、高三');
    expect(spacedTerm('115學年度第1學期')).toBe('115 學年度第 1 學期');
  });

  test('接下來 leaves out todos already checked off', () => {
    const todos: Todo[] = [{ ...done, date: '2026-10-06' }, { id: 'next', title: '交報告', date: '2026-10-07', category: null }];
    expect(upcomingItems('2026-10-04', [], todos).map((entry) => entry.key)).toEqual(['todo-next']);
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

  test('a todo checked off keeps its day in the list but gives up its square', () => {
    const today = new Date(2026, 9, 4);
    const day = calendarCells(2026, 9, [], [done], TINT, today).find((cell) => cell.key === '2026-10-04')!;
    expect(day.indicators).toEqual([]);
    expect(day.accessibilityLabel).toBe('今天，2026年10月4日 星期日，1 個待辦');
    // An open todo on the same day brings the square back.
    const withOpen = calendarCells(2026, 9, [], [done, homework], TINT, today).find((cell) => cell.key === '2026-10-04')!;
    expect(withOpen.indicators).toEqual([{ key: 'todo', color: TINT, shape: 'square' }]);
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
    expect(eventRowText(exam)).toEqual({ subtitle: '考試 · 10月4日–6日' });
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
    expect(eventRowText(school)).toEqual({ subtitle: '學校 · 學務處 · 全天 · 暫定日期 · 約略日期' });
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

  test('counts only what is left to do, still offering a category only a done todo carries', () => {
    const doneElsewhere: Todo = { ...done, category: { name: '社團' } };
    expect(todoFilterOptions([homework, done, doneElsewhere], [{ name: '作業' }])).toEqual([
      { label: '所有待辦 (1)', value: ALL_TODOS },
      { label: '作業 (1)', value: '作業' },
      { label: '社團 (0)', value: '社團' },
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
      { key: '2026-10-04', title: '10月4日 星期日 · 今天', overdue: false },
      { key: 'undated', title: '無日期', overdue: false },
    ]);
  });

  test('lists a date\'s open todos before those checked off', () => {
    const sections = todoSections([done, homework, { ...done, id: 'done-2' }], new Date(2026, 9, 4, 9));
    expect(sections.map((section) => section.todos.map((todo) => todo.id))).toEqual([['hw', 'done', 'done-2']]);
  });
});

describe('day marks and the grade filter', () => {
  // Taken from the 115-1 行事曆.
  const school = toSchoolEvents({
    events: [
      { title: '國慶日補假', startDate: '2026-10-09', endDate: '2026-10-09' },
      { title: '高一、高二、高三第1次定期考(◆考後大掃除)', startDate: '2026-10-13', endDate: '2026-10-14', department: '教務處' },
      { title: '高三大學多元入學說明會', startDate: '2026-10-16', endDate: '2026-10-16', department: '教務處' },
      { title: '高一健康檢查', startDate: '2026-10-20', endDate: '2026-10-22', department: '學務處' },
      { title: '高三第2次學測模擬考', startDate: '2026-10-28', endDate: '2026-10-29', department: '教務處' },
      { title: '高一X光篩檢', startDate: '2026-11-05', endDate: '2026-11-05', department: '學務處' },
    ],
  });
  const marks = (grade: 1 | 2 | 3) =>
    Object.fromEntries(
      calendarCells(2026, 9, school, [], TINT, new Date(2026, 9, 7), grade)
        .filter((cell) => cell.inMonth && cell.mark)
        .map((cell) => [cell.day, cell.mark?.text]),
    );

  test('假 on holidays and 考 on the grade\'s exam days', () => {
    expect(marks(2)).toEqual({ 9: '假', 13: '考', 14: '考' });
    // 高三 also sits its 模擬考.
    expect(marks(3)).toEqual({ 9: '假', 13: '考', 14: '考', 28: '考', 29: '考' });
  });

  test('a long school event dots only its first and last day', () => {
    const window = toSchoolEvents({
      events: [{ title: '國際數理奧賽/科展升學優待辦法送件(開學後2個月內)', startDate: '2026-09-01', endDate: '2026-10-24', department: '教務處' }],
    });
    const dotted = calendarCells(2026, 9, window, [], TINT, new Date(2026, 9, 7))
      .filter((cell) => cell.inMonth && cell.indicators.length > 0)
      .map((cell) => cell.day);
    expect(dotted).toEqual([24]);
  });

  test('hides the other grades\' events and counts those in the month', () => {
    const { events, hidden } = eventsForGrade(school, 2, { year: 2026, month: 9 });
    expect(events.map((event) => event.title)).toEqual(['國慶日補假', '高一、高二、高三第1次定期考(◆考後大掃除)']);
    // 健康檢查, 說明會 and 模擬考 fall in October; the X光 is in November.
    expect(hidden).toBe(3);
    expect(eventsForGrade(school, 2, { year: 2026, month: 10 }).hidden).toBe(1);
  });

  test('the footer is the filter\'s one control, shown only while the month has events it concerns', () => {
    expect(gradeFilterFooter(2, true, 3)).toEqual({
      text: '已隱藏 3 則只給高一、高三的活動。',
      action: { label: '全部顯示', gradeOnly: false },
    });
    expect(gradeFilterFooter(2, false, 3)).toEqual({
      text: '顯示所有年級的活動。',
      action: { label: '只顯示和高二有關的', gradeOnly: true },
    });
    expect(gradeFilterFooter(2, true, 0)).toBeNull();
    expect(gradeFilterFooter(2, false, 0)).toBeNull();
    // Without a known grade there is nothing to filter by.
    expect(gradeFilterFooter(null, false, 3)).toBeNull();
  });
});
