import { describe, expect, test } from '@jest/globals';

import type { ScheduleCell, ScheduleRow, Timetables } from '@/features/schedule/timetable';
import { PERIOD_NAMES } from '@/features/schedule/timetable';
import { toSchoolEvents } from '@/features/todo/school-calendar';
import type { CalendarEvent, Todo } from '@/features/todo/types';

import { agendaEvents, agendaSubtitle, formatPinnedDate, formatTodayTitle, timetableToAutofill, todayHeading, todosDueOn } from './today';

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

describe('今天 labels', () => {
  test('the date, the class and this week\'s parity', () => {
    expect(formatTodayTitle(at(8, 0))).toBe('10月5日 星期一');
    expect(formatTodayTitle(at(8, 0, 4))).toBe('10月4日 星期日');
    expect(todayHeading(at(8, 0), 6, 'even')).toBe('10月5日 星期一 · 第 6 週 · 雙週');
    expect(todayHeading(at(8, 0), null, null)).toBe('10月5日 星期一');
  });

  test('pinned dates', () => {
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

describe('the 今日 agenda', () => {
  // Taken from the 115-1 行事曆.
  const school = toSchoolEvents({
    events: [
      { title: '國際數理奧賽/科展升學優待辦法送件(開學後2個月內)', startDate: '2026-09-01', endDate: '2026-10-24', department: '教務處' },
      { title: '115-1校內獎學金線上申請截止日', startDate: '2026-10-08', endDate: '2026-10-08', department: '教務處' },
      { title: '捐血活動', startDate: '2026-10-08', endDate: '2026-10-08', department: '學務處' },
      { title: '高一X光篩檢(13:00-16:00)', startDate: '2026-10-08', endDate: '2026-10-08', department: '學務處' },
      { title: '國慶日補假', startDate: '2026-10-09', endDate: '2026-10-09' },
      { title: '心臟病篩檢(13:00-16:00)', startDate: '2026-10-05', endDate: '2026-10-06', department: '學務處', tentative: true },
      { title: '高一、高二、高三第1次定期考(◆考後大掃除)', startDate: '2026-10-13', endDate: '2026-10-14', department: '教務處' },
    ],
  });
  const own: CalendarEvent[] = [
    { id: 'a', title: '社團成發', startDate: '2026-10-08', endDate: '2026-10-08', category: { name: '社團', color: '#2E7D32' } },
  ];
  const titles = (date: Date) => agendaEvents(date, school, own, 2).map((event) => event.title);

  test('the user\'s events first, then the school\'s for the grade', () => {
    expect(titles(at(8, 0, 8))).toEqual(['社團成發', '115-1校內獎學金線上申請截止日', '捐血活動']);
  });

  test('days off and exams are left to the card and the exam row', () => {
    expect(titles(at(8, 0, 9))).toEqual([]);
    expect(titles(at(8, 0, 13))).toEqual([]);
  });

  test('long school events only on their first and last day', () => {
    expect(titles(at(8, 0, 1)).length).toBe(0);
    expect(titles(new Date(2026, 8, 1))).toContain('國際數理奧賽/科展升學優待辦法送件(開學後2個月內)');
    expect(titles(new Date(2026, 9, 24))).toContain('國際數理奧賽/科展升學優待辦法送件(開學後2個月內)');
  });

  test('subtitles name the 處室, 暫定 and where today falls', () => {
    const screening = school.find((event) => event.title.startsWith('心臟病'))!;
    expect(agendaSubtitle(screening, at(8, 0, 5))).toBe('學校 · 學務處 · 暫定 · 到 10/6');
    expect(agendaSubtitle(screening, at(8, 0, 6))).toBe('學校 · 學務處 · 暫定 · 最後一天');
    expect(agendaSubtitle(own[0], at(8, 0, 8))).toBe('社團');
  });
});

describe('automatic timetable fill', () => {
  const rows = rowsWithMonday([{ subject: '國文' }]);
  const byClass: Timetables['byClass'] = { '101': rows, '102': rowsWithMonday([]) };

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
