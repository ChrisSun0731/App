import { describe, expect, test } from '@jest/globals';

import {
  cellDetails,
  classOptions,
  classTimetable,
  DAY_OPTIONS,
  defaultDay,
  describeCell,
  describeDay,
  formatWeekInfo,
  periodOverline,
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
    expect(result[0].background).toBe('#FFCCCB');
    expect(result[1].background).toBeUndefined();
    expect(result[0].accessibilityLabel).toBe('第一節，08:10，國文，帶課本，紅色');
  });

  test('mark 目前 only on today\'s column, bell minute included', () => {
    const rows = rowsWith('Monday', [{ subject: '國文' }, { subject: '英文' }]);
    const input = { rows, periods: PERIODS, semesterStart: SEMESTER_START, scheme: 'light' as const };

    const monday = describeDay({ ...input, day: 'Monday', now: at(9, 0) });
    expect(monday.map((row) => row.current)).toEqual([true, false]);
    expect(monday[0].accessibilityLabel).toBe('第一節，08:10，國文，目前');
    // Between periods nothing is in session.
    expect(describeDay({ ...input, day: 'Monday', now: at(9, 5) }).some((row) => row.current)).toBe(false);
    // Tuesday's column is not today's.
    expect(describeDay({ ...input, day: 'Tuesday', now: at(8, 30) }).some((row) => row.current)).toBe(false);
  });

  test('use the dimmed fills in dark mode and keep the list colour for 預設', () => {
    const options = { overline: '第一節', parity: 'odd' as const };
    expect(describeCell({ subject: '數學', color: 'Blue' }, { ...options, scheme: 'dark' }).background).toBe('#1E4553');
    expect(describeCell({ subject: '數學', color: 'Default' }, { ...options, scheme: 'dark' }).background).toBeUndefined();
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
