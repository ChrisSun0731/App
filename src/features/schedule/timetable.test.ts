import { describe, expect, test } from '@jest/globals';

import { buildTimetables, getCurrentPeriod, getWeekNumber, getWeekParity, isGradeFile, subjectFor, type GradeFile } from './timetable';

const grade: GradeFile = {
  semester_start: '2026-08-31',
  periods: [{ period: 2, time: '09:10-10:00' }, { period: 1, time: '08:10-09:00' }],
  classes: [{ id: 101, schedule: { monday: [{ odd: '物理', even: '化學' }, '國文'] } }],
};

describe('class timetable feeds', () => {
  test('accepts numeric class IDs and keeps period names matched to the actual bell times', () => {
    expect(isGradeFile(grade)).toBe(true);
    const result = buildTimetables([grade]);
    expect(result?.classIds).toEqual(['101']);
    expect(result?.periods).toEqual([
      { name: '一', start: '08:10', end: '09:00' },
      { name: '二', start: '09:10', end: '10:00' },
    ]);
    expect(result?.byClass['101'][0].Monday).toEqual({ subject: '物理', alternating: { odd: '物理', even: '化學' } });
  });

  test('rejects invalid feed cells and clocks rather than caching data that would break the screen', () => {
    expect(isGradeFile({ ...grade, classes: [{ id: '101', schedule: { monday: [null] } }] })).toBe(false);
    expect(isGradeFile({ ...grade, classes: [{ id: '101', schedule: { monday: [{ odd: '物理' }] } }] })).toBe(false);
    expect(isGradeFile({ ...grade, periods: [{ period: 1, time: '08:75-09:90' }] })).toBe(false);
    expect(isGradeFile({ ...grade, periods: [{ period: 1, time: '10:00-09:00' }] })).toBe(false);
    expect(isGradeFile({ ...grade, semester_start: '2026-02-30' })).toBe(false);
  });

  test('marks only real lessons as current and leaves break time unmarked', () => {
    const periods = buildTimetables([grade])!.periods;
    expect(getCurrentPeriod(periods, new Date(2026, 9, 5, 8, 30))).toBe('一');
    expect(getCurrentPeriod(periods, new Date(2026, 9, 5, 9, 5))).toBeNull();
    expect(getCurrentPeriod(periods, new Date(2026, 9, 5, 12, 0))).toBeNull();
  });

  test('advances week parity on Mondays and honors a personal subject override', () => {
    expect(getWeekParity('2026-08-31', new Date(2026, 8, 6))).toBe('odd');
    expect(getWeekParity('2026-08-31', new Date(2026, 8, 7))).toBe('even');
    expect(getWeekNumber('2026-08-31', new Date(2026, 7, 30))).toBeNull();
    const cell = { subject: '物理', alternating: { odd: '物理', even: '化學' } };
    expect(subjectFor(cell, 'even')).toBe('化學');
    expect(subjectFor({ ...cell, subject: '自習' }, 'even')).toBe('自習');
  });
});
