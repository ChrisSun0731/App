import { describe, expect, test } from '@jest/globals';

import type { Period, ScheduleCell, ScheduleRow, Timetables } from '@/features/schedule/timetable';
import { PERIOD_NAMES } from '@/features/schedule/timetable';
import type { Todo } from '@/features/todo/types';

import {
  formatPeriodOverline,
  formatPinnedDate,
  formatTodayTitle,
  getTodayPeriod,
  timetableToAutofill,
  todosDueOn,
} from './today';

const PERIODS: Period[] = [
  { name: '一', start: '08:10', end: '09:00' },
  { name: '二', start: '09:10', end: '10:00' },
  { name: '三', start: '10:10', end: '11:00' },
  { name: '四', start: '11:10', end: '12:00' },
];

// 2026-08-31 is a Monday, so 2026-10-05 (Monday) starts week 6, a 雙週.
const SEMESTER_START = '2026-08-31';
const at = (hours: number, minutes: number, day = 5) => new Date(2026, 9, day, hours, minutes);

const empty: ScheduleCell = { subject: '' };

/** Rows whose Monday column is `monday`; other days are free. */
function rowsWithMonday(monday: ScheduleCell[]): ScheduleRow[] {
  return PERIOD_NAMES.map((name, index) => ({
    name,
    Monday: monday[index] ?? empty,
    Tuesday: empty,
    Wednesday: empty,
    Thursday: empty,
    Friday: empty,
  }));
}

const ROWS = rowsWithMonday([
  { subject: '國文', note: '  帶課本 ' },
  { subject: '物理', alternating: { odd: '物理', even: '化學' } },
  empty,
  { subject: '英文' },
]);

describe('the current or next period today', () => {
  test('returns the period in session with this week\'s subject and the trimmed note', () => {
    expect(getTodayPeriod(PERIODS, ROWS, at(8, 30), SEMESTER_START)).toEqual({
      status: 'current',
      period: PERIODS[0],
      subject: '國文',
      note: '帶課本',
    });
    // The bell minute still counts as in session, like the 課表 screen's 目前.
    expect(getTodayPeriod(PERIODS, ROWS, at(9, 0), SEMESTER_START)?.status).toBe('current');
    // Week 6 is a 雙週, so the rotating slot teaches 化學.
    expect(getTodayPeriod(PERIODS, ROWS, at(9, 30), SEMESTER_START)?.subject).toBe('化學');
  });

  test('shows a free period in session as it is', () => {
    expect(getTodayPeriod(PERIODS, ROWS, at(10, 30), SEMESTER_START)).toEqual({
      status: 'current',
      period: PERIODS[2],
      subject: '',
      note: '',
    });
  });

  test('before school and between periods, points at the next class and skips free periods', () => {
    expect(getTodayPeriod(PERIODS, ROWS, at(7, 30), SEMESTER_START)).toMatchObject({ status: 'next', period: PERIODS[0] });
    expect(getTodayPeriod(PERIODS, ROWS, at(9, 5), SEMESTER_START)).toMatchObject({ status: 'next', subject: '化學' });
    // 第三節 is free, so after 第二節 the next class is 第四節.
    expect(getTodayPeriod(PERIODS, ROWS, at(10, 5), SEMESTER_START)).toMatchObject({ status: 'next', period: PERIODS[3] });
  });

  test('a free period with a note is still worth pointing at', () => {
    const rows = rowsWithMonday([empty, { subject: '', note: '自習' }]);
    expect(getTodayPeriod(PERIODS, rows, at(7, 0), SEMESTER_START)).toMatchObject({ status: 'next', period: PERIODS[1], note: '自習' });
  });

  test('uses bell times, not the order the periods arrive in', () => {
    const shuffled = [PERIODS[3], PERIODS[1], PERIODS[0], PERIODS[2]];
    expect(getTodayPeriod(shuffled, ROWS, at(7, 0), SEMESTER_START)?.period).toEqual(PERIODS[0]);
  });

  test('nothing after the last class, on weekends, or without a timetable', () => {
    expect(getTodayPeriod(PERIODS, ROWS, at(12, 30), SEMESTER_START)).toBeNull();
    expect(getTodayPeriod(PERIODS, ROWS, at(8, 30, 4), SEMESTER_START)).toBeNull();
    expect(getTodayPeriod(PERIODS, [], at(8, 30), SEMESTER_START)).toBeNull();
    expect(getTodayPeriod([], ROWS, at(8, 30), SEMESTER_START)).toBeNull();
  });

  test('without a semester start, weeks count as 單週', () => {
    expect(getTodayPeriod(PERIODS, ROWS, at(9, 30), null)?.subject).toBe('物理');
  });
});

describe('home screen labels', () => {
  test('formats the period overline, today\'s title and pinned dates', () => {
    expect(formatPeriodOverline(PERIODS[2])).toBe('第三節 10:10–11:00');
    expect(formatTodayTitle(at(8, 0))).toBe('10月5日 星期一');
    expect(formatTodayTitle(at(8, 0, 4))).toBe('10月4日 星期日');
    expect(formatPinnedDate(new Date(2026, 8, 30, 15, 0).toISOString())).toBe('2026/9/30');
    expect(formatPinnedDate('not a date')).toBeUndefined();
  });
});

describe('today\'s todos', () => {
  test('keeps only todos dated today, in their saved order', () => {
    const todo = (id: string, date: string | null): Todo => ({ id, title: id, date, category: null });
    const todos = [todo('a', '2026-10-05'), todo('b', '2026-10-04'), todo('c', null), todo('d', '2026-10-05')];
    expect(todosDueOn(todos, at(23, 59)).map((item) => item.id)).toEqual(['a', 'd']);
  });
});

describe('automatic timetable fill', () => {
  const byClass: Timetables['byClass'] = { '101': ROWS, '102': rowsWithMonday([]) };

  test('fills an empty timetable with the user\'s class', () => {
    expect(timetableToAutofill({ rows: [], userClass: '102' }, byClass)).toBe(byClass['102']);
  });

  test('never replaces rows that exist (edited, imported or filled before)', () => {
    const imported = rowsWithMonday([{ subject: '自訂' }]);
    expect(timetableToAutofill({ rows: imported, userClass: '101' }, byClass)).toBeNull();
  });

  test('leaves the timetable empty when the class or the timetables are unknown', () => {
    expect(timetableToAutofill({ rows: [], userClass: '999' }, byClass)).toBeNull();
    expect(timetableToAutofill({ rows: [], userClass: 'constructor' }, byClass)).toBeNull();
    expect(timetableToAutofill({ rows: [], userClass: '101' }, undefined)).toBeNull();
  });
});
