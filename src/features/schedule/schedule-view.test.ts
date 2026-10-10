import { describe, expect, test } from '@jest/globals';

import {
  cellDetails,
  classOptions,
  classTimetable,
  DAY_OPTIONS,
  defaultDay,
  describeCell,
  describeDay,
  describeDayParts,
  describeWeek,
  displayedWeek,
  formatWeekInfo,
  shortSubject,
  periodOverline,
  scheduleLoadState,
} from './schedule-view';
import { PERIOD_NAMES, type Period, type ScheduleCell, type ScheduleRow, type Timetables } from './timetable';

const PERIODS: Period[] = [
  { name: '一', start: '08:10', end: '09:00' },
  { name: '二', start: '09:10', end: '10:00' },
  { name: '三', start: '10:10', end: '11:00' },
];

// 2026-08-31 is a Monday, so 2026-10-05 (Monday) starts week 6, a 雙週.
const SEMESTER_START = '2026-08-31';
const at = (hours: number, minutes: number, day = 5) => new Date(2026, 9, day, hours, minutes);

const empty: ScheduleCell = { subject: '' };

function rowsWith(column: 'Monday' | 'Tuesday', cells: ScheduleCell[]): ScheduleRow[] {
  return PERIOD_NAMES.slice(0, cells.length).map((name, index) => ({
    name,
    Monday: empty,
    Tuesday: empty,
    Wednesday: empty,
    Thursday: empty,
    Friday: empty,
    [column]: cells[index],
  }));
}

describe('period rows', () => {
  test('show the period, this week\'s subject, the rotation and the note', () => {
    const rows = rowsWith('Monday', [
      { subject: '國文', note: ' 帶課本 ', color: 'Red' },
      { subject: '物理', alternating: { odd: '物理', even: '化學' } },
      empty,
    ]);
    const result = describeDay({ rows, day: 'Monday', periods: PERIODS, semesterStart: SEMESTER_START, now: at(7, 0), scheme: 'light' });

    expect(result.map((row) => [row.period, row.overline, row.title, row.subtitle])).toEqual([
      ['一', '第一節 · 08:10', '國文', '帶課本'],
      // Week 6 is a 雙週.
      ['二', '第二節 · 09:10', '化學', '單週：物理　雙週：化學'],
      ['三', '第三節 · 10:10', '空堂', undefined],
    ]);
    expect(result[0]).toMatchObject({ fill: '#FFE0DE', ink: '#BF0018' });
    expect(result[1].fill).toBeUndefined();
    expect(result[0].accessibilityLabel).toBe('第一節，08:10，國文，帶課本，紅色');
  });

  test('mark 現在 only on today\'s column, until the bell', () => {
    const rows = rowsWith('Monday', [{ subject: '國文' }, { subject: '英文' }]);
    const input = { rows, periods: PERIODS, semesterStart: SEMESTER_START, scheme: 'light' as const };

    const monday = describeDay({ ...input, day: 'Monday', now: at(8, 59) });
    expect(monday.map((row) => row.current)).toEqual([true, false]);
    expect(monday[0].accessibilityLabel).toBe('第一節，08:10，國文，現在');
    // At the bell the period is over, and between periods nothing is in session.
    expect(describeDay({ ...input, day: 'Monday', now: at(9, 0) }).some((row) => row.current)).toBe(false);
    expect(describeDay({ ...input, day: 'Monday', now: at(9, 5) }).some((row) => row.current)).toBe(false);
    // Tuesday's column is not today's.
    expect(describeDay({ ...input, day: 'Tuesday', now: at(8, 30) }).some((row) => row.current)).toBe(false);
  });

  test('use the dark swatches in dark mode and the plain cell for 預設', () => {
    const options = { overline: '第一節', parity: 'odd' as const };
    expect(describeCell({ subject: '數學', color: 'Blue' }, { ...options, scheme: 'dark' })).toMatchObject({ fill: '#183554', ink: '#5CAAFF' });
    expect(describeCell({ subject: '數學', color: 'Default' }, { ...options, scheme: 'dark' }).fill).toBeUndefined();
    expect(describeCell({ subject: '數學', color: 'Default' }, { ...options, scheme: 'light' }).accessibilityLabel).toBe('第一節，數學');
  });

  test('show an empty week of a rotation as 空堂 and put the note on its own line', () => {
    const cell: ScheduleCell = { subject: '物理', alternating: { odd: '物理', even: '' }, note: '實驗室' };
    expect(cellDetails(cell)).toBe('單週：物理　雙週：空堂\n實驗室');
    const row = describeCell(cell, { overline: '第一節', parity: 'even', scheme: 'light' });
    expect(row.title).toBe('空堂');
    expect(row.accessibilityLabel).toBe('第一節，空堂，單週：物理　雙週：空堂，實驗室');
    // A subject the previous build saved over a rotation is not a rotation.
    expect(cellDetails({ subject: '自習', alternating: { odd: '物理', even: '化學' } })).toBeUndefined();
  });

  test('leave the start time out until the bell schedule loads', () => {
    expect(periodOverline('二', PERIODS)).toBe('第二節 · 09:10');
    expect(periodOverline('八', PERIODS)).toBe('第八節');
    expect(periodOverline('一', [])).toBe('第一節');
  });
});

describe('the week line and pickers', () => {
  test('formats the academic year, week and parity', () => {
    expect(formatWeekInfo('115學年度第1學期', SEMESTER_START, at(10, 0))).toBe('115學年度第1學期 · 第6週 · 雙週');
    expect(formatWeekInfo('115學年度第1學期', SEMESTER_START, new Date(2026, 8, 1))).toBe('115學年度第1學期 · 第1週 · 單週');
    // Before the semester: no week number. Unknown start: 單週, as the rows show.
    expect(formatWeekInfo('115學年度第1學期', SEMESTER_START, new Date(2026, 7, 24))).toBe('115學年度第1學期 · 雙週');
    expect(formatWeekInfo('', null, at(10, 0))).toBe('單週');
  });

  test('opens on today, or Monday at the weekend', () => {
    expect(defaultDay(new Date(2026, 9, 7))).toBe('Wednesday');
    expect(defaultDay(new Date(2026, 9, 4))).toBe('Monday');
    expect(DAY_OPTIONS.map((option) => option.label)).toEqual(['一', '二', '三', '四', '五']);
  });

  test('keeps the user\'s class in the class options', () => {
    expect(classOptions(['101', '102'], '102')).toEqual([
      { label: '101 班', value: '101' },
      { label: '102 班', value: '102' },
    ]);
    expect(classOptions(['101'], '330').map((option) => option.value)).toEqual(['330', '101']);
    expect(classOptions([], '101')).toEqual([{ label: '101 班', value: '101' }]);
  });

  test('looks classes up by own key only', () => {
    const rows = rowsWith('Monday', [{ subject: '國文' }]);
    const timetables: Timetables = { byClass: { '101': rows }, classIds: ['101'], periods: PERIODS, semesterStart: null, academicYear: '' };
    expect(classTimetable(timetables, '101')).toBe(rows);
    expect(classTimetable(timetables, '102')).toBeUndefined();
    expect(classTimetable(timetables, 'constructor')).toBeUndefined();
    expect(classTimetable(undefined, '101')).toBeUndefined();
  });
});

describe('load state', () => {
  const idle = { hasRows: false, isPending: false, isFetching: false, isError: false };

  test('shows a loading row until the first load, then the rows or the empty state', () => {
    expect(scheduleLoadState({ ...idle, isPending: true, isFetching: true })).toEqual({ banner: 'none', day: 'loading' });
    // Paused (offline) before anything loaded still reads as loading.
    expect(scheduleLoadState({ ...idle, isPending: true })).toEqual({ banner: 'none', day: 'loading' });
    expect(scheduleLoadState({ ...idle, hasRows: true })).toEqual({ banner: 'none', day: 'rows' });
    expect(scheduleLoadState(idle)).toEqual({ banner: 'none', day: 'empty' });
  });

  test('a background refresh leaves saved rows alone', () => {
    expect(scheduleLoadState({ ...idle, hasRows: true, isFetching: true })).toEqual({ banner: 'none', day: 'rows' });
  });

  test('重新整理 on the empty state shows a loading row while it runs', () => {
    expect(scheduleLoadState({ ...idle, isFetching: true })).toEqual({ banner: 'none', day: 'loading' });
  });

  test('a failed load shows the notice, and a retry replaces it with one loading row', () => {
    expect(scheduleLoadState({ ...idle, isError: true })).toEqual({ banner: 'error', day: 'empty' });
    expect(scheduleLoadState({ ...idle, hasRows: true, isError: true })).toEqual({ banner: 'error', day: 'rows' });
    // React Query keeps the error while retrying: no rows, so the day section loads...
    expect(scheduleLoadState({ ...idle, isError: true, isFetching: true })).toEqual({ banner: 'none', day: 'loading' });
    // ...with rows, the notice's place does.
    expect(scheduleLoadState({ ...idle, hasRows: true, isError: true, isFetching: true }))
      .toEqual({ banner: 'retrying', day: 'rows' });
  });
});

// The real bell times.
const BELLS: Period[] = [
  ['08:10', '09:00'], ['09:10', '10:00'], ['10:10', '11:00'], ['11:10', '12:00'],
  ['13:00', '13:50'], ['14:00', '14:50'], ['15:10', '16:00'], ['16:10', '17:00'],
].map(([start, end], index) => ({ name: PERIOD_NAMES[index], start, end }));

/** Class 201's Wednesday, with a note and a colour on 物理. */
const WEDNESDAY: ScheduleRow[] = ['各類文學選讀', '各類文學選讀', '物理', '英語文', '地理', '地理', '班會', ''].map((subject, index) => ({
  name: PERIOD_NAMES[index],
  Monday: empty,
  Tuesday: empty,
  Wednesday: index === 2 ? { subject, note: '實驗室上課', color: 'Purple' } : { subject },
  Thursday: empty,
  Friday: empty,
}));

describe('the day as 上午 and 下午', () => {
  const parts = (now: Date) =>
    describeDayParts({ rows: WEDNESDAY, day: 'Wednesday', periods: BELLS, semesterStart: SEMESTER_START, now, scheme: 'light' });

  test('splits at lunch and merges a 連堂 into one row', () => {
    const [morning, afternoon] = parts(at(7, 0, 7));
    expect([morning.title, morning.detail]).toEqual(['上午', '08:10–12:00']);
    expect([afternoon.title, afternoon.detail]).toEqual(['下午', '13:00–17:00']);
    expect(morning.rows.map((row) => row.time)).toEqual(['08:10–10:00', '10:10–11:00', '11:10–12:00']);
    expect(morning.rows.map((row) => [row.overline, row.title])).toEqual([
      ['第一、二節 · 08:10–10:00 · 連堂', '各類文學選讀'],
      ['第三節 · 10:10–11:00', '物理'],
      ['第四節 · 11:10–12:00', '英語文'],
    ]);
    expect(morning.rows[0].periods).toEqual(['一', '二']);
    expect(afternoon.rows.map((row) => row.title)).toEqual(['地理', '班會', '空堂']);
    expect(afternoon.rows[0].periods).toEqual(['五', '六']);
  });

  test('marks the row in session, a 連堂 through both periods, with the minutes to the bell', () => {
    expect(parts(at(10, 37, 7))[0].rows.map((row) => row.current)).toEqual([false, true, false]);
    expect(parts(at(10, 37, 7))[0].rows.map((row) => row.untilBell)).toEqual([null, 23, null]);
    expect(parts(at(9, 30, 7))[0].rows[0]).toMatchObject({ current: true, untilBell: 30 });
    expect(parts(at(10, 37, 7))[0].rows[1].accessibilityLabel).toBe('第三節，10:10–11:00，物理，實驗室上課，現在，紫色');
  });

  test('different notes or colours keep periods apart', () => {
    const rows = WEDNESDAY.map((row) => (row.name === '二' ? { ...row, Wednesday: { subject: '各類文學選讀', note: '小考' } } : row));
    const [morning] = describeDayParts({ rows, day: 'Wednesday', periods: BELLS, semesterStart: SEMESTER_START, now: at(7, 0, 7), scheme: 'light' });
    expect(morning.rows.map((row) => row.periods)).toEqual([['一'], ['二'], ['三'], ['四']]);
  });

  test('without bell times, one part of single periods', () => {
    const result = describeDayParts({ rows: WEDNESDAY, day: 'Wednesday', periods: [], semesterStart: SEMESTER_START, now: at(7, 0, 7), scheme: 'light' });
    expect(result).toHaveLength(1);
    expect(result[0].rows).toHaveLength(8);
  });
});

describe('the week grid', () => {
  test('a column per weekday of the displayed week, a row per period, lunch after 第四節', () => {
    const week = describeWeek({
      rows: WEDNESDAY,
      periods: BELLS,
      semesterStart: SEMESTER_START,
      now: at(10, 37, 7),
      scheme: 'light',
      offDay: (date) => (date.getDate() === 9 ? '國慶日補假' : null),
    });
    expect(week.columns.map((column) => [column.label, column.date, column.today, column.off])).toEqual([
      ['一', '5', false, null],
      ['二', '6', false, null],
      ['三', '7', true, null],
      ['四', '8', false, null],
      ['五', '9', false, '國慶日補假'],
    ]);
    expect(week.rows.map((row) => row.highlighted)).toEqual([false, false, true, false, false, false, false, false]);
    expect(week.rows.map((row) => row.detail)).toEqual(['08:10', '09:10', '10:10', '11:10', '13:00', '14:00', '15:10', '16:10']);
    expect(week.lunchAfter).toBe(3);
    const wednesday = week.cells.map((row) => row[2]);
    expect(wednesday.map((cell) => cell.text)).toEqual(['文學選讀', '文學選讀', '物理', '英文', '地理', '地理', '班會', '']);
    // A 連堂 is one cell covering the next period; lunch is never crossed.
    expect(wednesday.map((cell) => cell.span)).toEqual([2, 0, 1, 1, 2, 0, 1, 1]);
    expect(wednesday[0].accessibilityLabel).toBe('星期三第一、二節，各類文學選讀，連堂');
    expect(wednesday[2]).toMatchObject({ current: true, color: '#F2E3FA', ink: '#8944AB', accessibilityLabel: '星期三第三節，物理，現在，紫色' });
    expect(wednesday[7].empty).toBe(true);
  });

  test('shortens subjects to fit a cell', () => {
    expect(shortSubject('國語文')).toBe('國文');
    expect(shortSubject('數學(彈性學習)')).toBe('數學彈');
    expect(shortSubject('選修物理')).toBe('選修物理');
    expect(shortSubject('探索與實作研究')).toBe('探索與實');
  });
});

describe('weekends show the coming week', () => {
  test('its Monday, parity and week number', () => {
    expect(displayedWeek(new Date(2026, 9, 10, 12, 0))).toEqual(new Date(2026, 9, 12));
    expect(displayedWeek(new Date(2026, 9, 7, 12, 0))).toEqual(new Date(2026, 9, 5));
    expect(formatWeekInfo('115學年度第1學期', SEMESTER_START, new Date(2026, 9, 11))).toBe('115學年度第1學期 · 第7週 · 單週');
  });
});
