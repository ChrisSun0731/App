import { describe, expect, test } from '@jest/globals';

import {
  cellDetails,
  classOptions,
  classTimetable,
  describeCell,
  describeWeek,
  displayedWeek,
  periodOverline,
  scheduleLoadState,
  scheduleSubtitle,
} from './schedule-view';
import { hueSwatch, subjectPalette } from './subject-colors';
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

describe('編輯課程\'s preview row', () => {
  const palette = subjectPalette(rowsWith('Monday', [{ subject: '國文' }, { subject: '數學' }, { subject: '物理', alternating: { odd: '物理', even: '化學' } }]));
  const light = (name: string) => hueSwatch(palette.get(name)!, 'light');

  test('shows the period, this week\'s subject, the rotation and the note', () => {
    const own = describeCell({ subject: '國文', note: ' 帶課本 ', color: 'Red' }, { overline: '第一節 · 08:10', parity: 'even', scheme: 'light', palette });
    expect([own.overline, own.title, own.subtitle]).toEqual(['第一節 · 08:10', '國文', '帶課本']);
    expect(own).toMatchObject({ fill: '#FFE0DE', ink: '#BF0018' });
    expect(own.accessibilityLabel).toBe('第一節，08:10，國文，帶課本，紅色');

    // Week 6 is a 雙週; 預設 is the subject's own colour.
    const rotating = describeCell({ subject: '物理', alternating: { odd: '物理', even: '化學' } }, { overline: '第二節', parity: 'even', scheme: 'light', palette });
    expect([rotating.title, rotating.subtitle]).toEqual(['化學', '單週：物理　雙週：化學']);
    expect(rotating).toMatchObject({ fill: light('化學').fill, ink: light('化學').ink });

    const free = describeCell(empty, { overline: '第三節', parity: 'even', scheme: 'light', palette });
    expect([free.title, free.subtitle, free.fill]).toEqual(['空堂', undefined, undefined]);
  });

  test('uses the dark swatches in dark mode and the subject\'s colour for 預設', () => {
    const options = { overline: '第一節', parity: 'odd' as const, palette };
    expect(describeCell({ subject: '數學', color: 'Blue' }, { ...options, scheme: 'dark' })).toMatchObject({ fill: '#183554', ink: '#5CAAFF' });
    const math = hueSwatch(palette.get('數學')!, 'dark');
    expect(describeCell({ subject: '數學', color: 'Default' }, { ...options, scheme: 'dark' })).toMatchObject({ fill: math.fill, ink: math.ink });
    expect(describeCell({ subject: '', color: 'Default' }, { ...options, scheme: 'dark' }).fill).toBeUndefined();
    expect(describeCell({ subject: '數學', color: 'Default' }, { ...options, scheme: 'light' }).accessibilityLabel).toBe('第一節，數學');
  });

  test('shows an empty week of a rotation as 空堂 and puts the note on its own line', () => {
    const cell: ScheduleCell = { subject: '物理', alternating: { odd: '物理', even: '' }, note: '實驗室' };
    expect(cellDetails(cell)).toBe('單週：物理　雙週：空堂\n實驗室');
    const row = describeCell(cell, { overline: '第一節', parity: 'even', scheme: 'light', palette });
    expect(row.title).toBe('空堂');
    expect(row.accessibilityLabel).toBe('第一節，空堂，單週：物理　雙週：空堂，實驗室');
    // A coloured slot that is blank this week is the plain badge: its colour is neither drawn nor spoken.
    const blank = describeCell({ subject: '', color: 'Red' }, { overline: '第一節', parity: 'odd', scheme: 'light', palette });
    expect(blank.fill).toBeUndefined();
    expect(blank.accessibilityLabel).toBe('第一節，空堂');
    // A subject the previous build saved over a rotation is not a rotation.
    expect(cellDetails({ subject: '自習', alternating: { odd: '物理', even: '化學' } })).toBeUndefined();
  });

  test('leaves the start time out until the bell schedule loads', () => {
    expect(periodOverline('二', PERIODS)).toBe('第二節 · 09:10');
    expect(periodOverline('八', PERIODS)).toBe('第八節');
    expect(periodOverline('一', [])).toBe('第一節');
  });
});

describe('the subtitle and pickers', () => {
  test('keeps the user\'s class in the class options', () => {
    expect(classOptions(['101', '102'], '102')).toEqual([
      { label: '101 班', value: '101' },
      { label: '102 班', value: '102' },
    ]);
    expect(classOptions(['101'], '330').map((option) => option.value)).toEqual(['330', '101']);
    expect(classOptions([], '101')).toEqual([{ label: '101 班', value: '101' }]);
    // No class chosen yet is not a choice.
    expect(classOptions(['101', '102'], '').map((option) => option.value)).toEqual(['101', '102']);
    expect(classOptions([], '')).toEqual([]);
  });

  test('the subtitle names the class and the week, or the week alone until a class is chosen', () => {
    expect(scheduleSubtitle('201', SEMESTER_START, at(10, 0))).toBe('201 · 第 6 週 · 雙週');
    expect(scheduleSubtitle('', SEMESTER_START, at(10, 0))).toBe('第 6 週 · 雙週');
    // Unknown semester start: no week number, 單週 as the rows show.
    expect(scheduleSubtitle('201', null, at(10, 0))).toBe('201 · 單週');
    expect(scheduleSubtitle('', null, at(10, 0))).toBe('單週');
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
    expect(scheduleLoadState({ ...idle, isPending: true, isFetching: true })).toEqual({ banner: 'none', table: 'loading' });
    // Paused (offline) before anything loaded still reads as loading.
    expect(scheduleLoadState({ ...idle, isPending: true })).toEqual({ banner: 'none', table: 'loading' });
    expect(scheduleLoadState({ ...idle, hasRows: true })).toEqual({ banner: 'none', table: 'rows' });
    expect(scheduleLoadState(idle)).toEqual({ banner: 'none', table: 'empty' });
  });

  test('a background refresh leaves saved rows alone', () => {
    expect(scheduleLoadState({ ...idle, hasRows: true, isFetching: true })).toEqual({ banner: 'none', table: 'rows' });
  });

  test('重新整理 on the empty state shows a loading row while it runs', () => {
    expect(scheduleLoadState({ ...idle, isFetching: true })).toEqual({ banner: 'none', table: 'loading' });
  });

  test('a failed load shows the notice, and a retry replaces it with one loading row', () => {
    expect(scheduleLoadState({ ...idle, isError: true })).toEqual({ banner: 'error', table: 'empty' });
    expect(scheduleLoadState({ ...idle, hasRows: true, isError: true })).toEqual({ banner: 'error', table: 'rows' });
    // React Query keeps the error while retrying: no rows, so the table's place loads...
    expect(scheduleLoadState({ ...idle, isError: true, isFetching: true })).toEqual({ banner: 'none', table: 'loading' });
    // ...with rows, the notice's place does.
    expect(scheduleLoadState({ ...idle, hasRows: true, isError: true, isFetching: true }))
      .toEqual({ banner: 'retrying', table: 'rows' });
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

describe('the week table', () => {
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
    expect(week.rows[0].time).toBe('08:10–09:00');
    expect(week.lunchAfter).toBe(3);
    const wednesday = week.cells.map((row) => row[2]);
    const own = (name: string) => hueSwatch(subjectPalette(WEDNESDAY).get(name)!, 'light');
    // Full names, one cell per period; the user's colour, else the subject's own.
    expect(wednesday.map((cell) => cell.text)).toEqual(['各類文學選讀', '各類文學選讀', '物理', '英語文', '地理', '地理', '班會', '']);
    expect(wednesday[0]).toMatchObject({
      color: own('各類文學選讀').fill,
      ink: own('各類文學選讀').ink,
      note: false,
      accessibilityLabel: '星期三第一節，08:10–09:00，各類文學選讀',
    });
    expect(wednesday[2]).toMatchObject({
      current: true,
      color: '#F2E3FA',
      ink: '#8944AB',
      note: true,
      details: '實驗室上課',
      accessibilityLabel: '星期三第三節，10:10–11:00，物理，實驗室上課，現在，紫色',
    });
    expect(wednesday[6]).toMatchObject({ color: own('班會').fill, ink: own('班會').ink });
    expect(wednesday[7]).toMatchObject({ empty: true, color: undefined });
  });

  test('every subject in a colour of its own, the same in each of its cells', () => {
    const week = describeWeek({ rows: WEDNESDAY, periods: BELLS, semesterStart: SEMESTER_START, now: at(7, 0, 7), scheme: 'dark' });
    const wednesday = week.cells.map((row) => row[2]);
    // A 連堂 is two cells of one colour.
    expect(wednesday[1].color).toBe(wednesday[0].color);
    expect(wednesday[5].color).toBe(wednesday[4].color);
    // 各類文學選讀, 英語文, 地理, 班會 (物理 wears the user's purple).
    const colours = [0, 3, 4, 6].map((index) => wednesday[index].color);
    expect(new Set(colours).size).toBe(4);
    const english = hueSwatch(subjectPalette(WEDNESDAY).get('英語文')!, 'dark');
    expect(wednesday[3]).toMatchObject({ color: english.fill, ink: english.ink });
  });

  test('anchored on the class\'s own timetable, a subject typed in does not take one of its colours', () => {
    // 國語文 and 化學(彈性學習) hash to the same slot, and 化 sorts first.
    const base = rowsWith('Monday', [{ subject: '國語文' }]);
    const edited = rowsWith('Monday', [{ subject: '國語文' }, { subject: '化學(彈性學習)' }]);
    const chinese = (rows: ScheduleRow[], anchor?: ScheduleRow[]) =>
      describeWeek({ rows, base: anchor, periods: PERIODS, semesterStart: SEMESTER_START, now: at(7, 0), scheme: 'light' }).cells[0][0].color;
    expect(chinese(edited, base)).toBe(chinese(base, base));
    // Without the anchor the new subject would push 國語文 to another colour.
    expect(chinese(edited)).not.toBe(chinese(base));
  });

  test('a free period with a note shows the note, as 今天 does; the label speaks bell times, rotation and note', () => {
    const rows = rowsWith('Monday', [
      { subject: '', note: ' 補考 ' },
      { subject: '化學', alternating: { odd: '化學', even: '物理' }, note: '帶實驗衣' },
    ]);
    const week = describeWeek({ rows, periods: PERIODS, semesterStart: SEMESTER_START, now: at(7, 0), scheme: 'light' });
    const [free, rotating] = week.cells.map((row) => row[0]);
    expect(free).toMatchObject({
      subject: '',
      text: '補考',
      empty: false,
      note: true,
      color: undefined,
      details: '補考',
      accessibilityLabel: '星期一第一節，08:10–09:00，空堂，補考',
    });
    // Week 6 is a 雙週.
    expect(rotating).toMatchObject({
      subject: '物理',
      text: '物理',
      details: '單週：化學　雙週：物理\n帶實驗衣',
      accessibilityLabel: '星期一第二節，09:10–10:00，物理，單週：化學　雙週：物理，帶實驗衣',
    });
  });

  test('no 現在 on a day off', () => {
    const rows = rowsWith('Monday', [{ subject: '國文' }, { subject: '英文' }]);
    const input = { rows, periods: PERIODS, semesterStart: SEMESTER_START, now: at(8, 30), scheme: 'light' as const };
    const off = describeWeek({ ...input, offDay: (date) => (date.getDate() === 5 ? '補假' : null) });
    expect(off.cells.some((row) => row.some((cell) => cell.current))).toBe(false);
    expect(off.rows.some((row) => row.highlighted)).toBe(false);
    // The same moment on a school day.
    const school = describeWeek(input);
    expect([school.cells[0][0].current, school.rows[0].highlighted]).toEqual([true, true]);
    expect(school.cells[0][0].accessibilityLabel).toBe('星期一第一節，08:10–09:00，國文，現在');
  });

  test('until the bell times load, the timetable\'s own periods, untimed', () => {
    const week = describeWeek({ rows: WEDNESDAY, periods: [], semesterStart: SEMESTER_START, now: at(10, 37, 7), scheme: 'light' });
    expect(week.rows.map((row) => [row.label, row.detail, row.time, row.highlighted])).toEqual(PERIOD_NAMES.map((name) => [name, '', '', false]));
    expect(week.cells.map((row) => row[2].text)).toEqual(['各類文學選讀', '各類文學選讀', '物理', '英語文', '地理', '地理', '班會', '']);
    expect(week.cells[0][2].accessibilityLabel).toBe('星期三第一節，各類文學選讀');
    expect(week.cells.some((row) => row.some((cell) => cell.current))).toBe(false);
    expect([week.lunchAfter, week.lunchTime]).toEqual([null, null]);
  });

  test('a coloured slot that is blank this week is drawn plain, its colour unspoken', () => {
    const rows = rowsWith('Monday', [
      { subject: '', color: 'Red' },
      { subject: '物理', alternating: { odd: '物理', even: '' }, color: 'Red' },
    ]);
    const week = describeWeek({ rows, periods: PERIODS, semesterStart: SEMESTER_START, now: at(10, 37, 7), scheme: 'light' });
    const monday = week.cells.map((row) => row[0]);
    expect(monday[0]).toMatchObject({ empty: true, color: undefined, accessibilityLabel: '星期一第一節，08:10–09:00，空堂' });
    // Week 6 is a 雙週: the rotation's empty week.
    expect(monday[1]).toMatchObject({ empty: true, color: undefined, accessibilityLabel: '星期一第二節，09:10–10:00，空堂，單週：物理　雙週：空堂' });
  });
});

describe('weekends show the coming week', () => {
  test('its Monday, parity and week number', () => {
    expect(displayedWeek(new Date(2026, 9, 10, 12, 0))).toEqual(new Date(2026, 9, 12));
    expect(displayedWeek(new Date(2026, 9, 7, 12, 0))).toEqual(new Date(2026, 9, 5));
    expect(scheduleSubtitle('201', SEMESTER_START, new Date(2026, 9, 11))).toBe('201 · 第 7 週 · 單週');
  });
});
