import { describe, expect, test } from '@jest/globals';

import { toSchoolEvents } from './school-calendar';
import {
  examTitle,
  gradeOfClass,
  gradesIn,
  isForGrade,
  nextSchoolDay,
  schoolDayOf,
  upcomingExam,
  type SchoolCalendarContext,
} from './school-days';

// Taken from the 115-1 行事曆 (calendar/115-1.json in the Data repo).
const EVENTS = toSchoolEvents({
  term: '115學年度第1學期',
  events: [
    { title: '開學', startDate: '2026-08-31', endDate: '2026-08-31' },
    { title: '開學典禮(08:10)', startDate: '2026-08-31', endDate: '2026-08-31', department: '學務處' },
    { title: '高三第1次學測模擬考', startDate: '2026-09-02', endDate: '2026-09-03', department: '教務處' },
    { title: '教師節', startDate: '2026-09-28', endDate: '2026-09-28' },
    { title: '國慶日補假', startDate: '2026-10-09', endDate: '2026-10-09' },
    { title: '國慶日', startDate: '2026-10-10', endDate: '2026-10-10' },
    { title: '高一、高二、高三第1次定期考(◆考後大掃除)', startDate: '2026-10-13', endDate: '2026-10-14', department: '教務處' },
    { title: '2026第七屆臺灣科學節(11/7-8、14-15，共4天)', startDate: '2026-11-07', endDate: '2026-11-08' },
    { title: '高三第2次定期考(◆考後大掃除)', startDate: '2026-11-18', endDate: '2026-11-19', department: '教務處' },
    { title: '休業式', startDate: '2027-01-20', endDate: '2027-01-20', department: '學務處' },
    { title: '寒假開始', startDate: '2027-01-21', endDate: '2027-01-21' },
    { title: '春節連假', startDate: '2027-02-04', endDate: '2027-02-10' },
    { title: '開學', startDate: '2027-02-11', endDate: '2027-02-11' },
  ],
});

const SECOND_YEAR: SchoolCalendarContext = { events: EVENTS, term: '115學年度第1學期', grade: 2 };
const day = (month: number, date: number, year = 2026) => new Date(year, month - 1, date, 10, 0);

describe('grades', () => {
  test('reads the grade from a class id', () => {
    expect(gradeOfClass('201')).toBe(2);
    expect(gradeOfClass('305')).toBe(3);
    expect(gradeOfClass('42')).toBeNull();
    expect(gradeOfClass('401')).toBeNull();
  });

  test('keeps events for the grade and for everyone', () => {
    expect(gradesIn('高一高二班級電腦領用')).toEqual([1, 2]);
    expect(isForGrade('高三第1次學測模擬考', 2)).toBe(false);
    expect(isForGrade('高一、高二、高三第1次定期考', 2)).toBe(true);
    expect(isForGrade('捐血活動', 2)).toBe(true);
    // 高中 names no grade.
    expect(isForGrade('第25屆高中地理奧林匹亞競賽', 1)).toBe(true);
    expect(isForGrade('高三第1次學測模擬考', null)).toBe(true);
  });
});

describe('school days', () => {
  test('a weekday in term is a school day', () => {
    expect(schoolDayOf(day(10, 7), SECOND_YEAR)).toEqual({ kind: 'school', exam: null });
  });

  test('holidays the 行事曆 lists without a 處室 are days off, by name', () => {
    expect(schoolDayOf(day(10, 9), SECOND_YEAR)).toEqual({ kind: 'off', name: '國慶日補假' });
    expect(schoolDayOf(day(9, 28), SECOND_YEAR)).toEqual({ kind: 'off', name: '教師節' });
    // A holiday on a weekend keeps its own name.
    expect(schoolDayOf(day(10, 10), SECOND_YEAR)).toEqual({ kind: 'off', name: '國慶日' });
    expect(schoolDayOf(day(10, 11), SECOND_YEAR)).toEqual({ kind: 'off', name: '週末' });
  });

  test('events without a 處室 that are not holidays do not cancel school', () => {
    // 開學 itself is a school day; 科學節 falls on a weekend anyway.
    expect(schoolDayOf(day(8, 31), SECOND_YEAR).kind).toBe('school');
    expect(schoolDayOf(day(11, 7), SECOND_YEAR)).toEqual({ kind: 'off', name: '週末' });
  });

  test('the breaks before and after the term, until the next term starts', () => {
    expect(schoolDayOf(day(8, 28), SECOND_YEAR)).toEqual({ kind: 'off', name: '暑假' });
    expect(schoolDayOf(day(1, 25, 2027), SECOND_YEAR)).toEqual({ kind: 'off', name: '寒假' });
    expect(schoolDayOf(day(2, 5, 2027), SECOND_YEAR)).toEqual({ kind: 'off', name: '春節連假' });
    expect(schoolDayOf(day(2, 11, 2027), SECOND_YEAR).kind).toBe('school');
  });

  test('exam days for the grade, with the day of the exam', () => {
    expect(schoolDayOf(day(10, 14), SECOND_YEAR)).toEqual({ kind: 'school', exam: { title: '第1次定期考', day: 2, days: 2 } });
    // 高三's exams are ordinary days for 高二.
    expect(schoolDayOf(day(11, 18), SECOND_YEAR)).toEqual({ kind: 'school', exam: null });
    expect(schoolDayOf(day(9, 2), { ...SECOND_YEAR, grade: 3 })).toEqual({
      kind: 'school',
      exam: { title: '第1次學測模擬考', day: 1, days: 2 },
    });
  });

  test('without the 行事曆, only weekends are off', () => {
    const none: SchoolCalendarContext = { events: [], term: '', grade: 2 };
    expect(schoolDayOf(day(10, 9), none).kind).toBe('school');
    expect(schoolDayOf(day(10, 10), none)).toEqual({ kind: 'off', name: '週末' });
  });

  test('the next school day skips weekends and holidays', () => {
    expect(nextSchoolDay(day(10, 8), SECOND_YEAR)).toEqual(new Date(2026, 9, 12));
    expect(nextSchoolDay(day(10, 5), SECOND_YEAR)).toEqual(new Date(2026, 9, 6));
    expect(nextSchoolDay(day(1, 21, 2027), SECOND_YEAR, 7)).toBeNull();
  });
});

describe('exams', () => {
  test('cleans the 行事曆 title', () => {
    expect(examTitle('高一、高二、高三第1次定期考(◆考後大掃除)')).toBe('第1次定期考');
    expect(examTitle('高三第2次定期考(◆考後大掃除)')).toBe('第2次定期考');
  });

  test('counts the days to the next exam for the grade, 0 while it is on', () => {
    expect(upcomingExam(day(10, 7), SECOND_YEAR)).toEqual({
      title: '第1次定期考',
      startDate: '2026-10-13',
      endDate: '2026-10-14',
      daysUntil: 6,
    });
    expect(upcomingExam(day(10, 14), SECOND_YEAR)?.daysUntil).toBe(0);
    // After it, 高二 has no more exams in this list (the 高三 one is skipped).
    expect(upcomingExam(day(10, 15), SECOND_YEAR)).toBeNull();
    expect(upcomingExam(day(10, 15), { ...SECOND_YEAR, grade: 3 })?.title).toBe('第2次定期考');
  });
});
