import { describe, expect, test } from '@jest/globals';

import {
  buildTimetables,
  cellFromDraft,
  draftFromCell,
  getAlternating,
  getCurrentPeriod,
  getWeekNumber,
  getWeekParity,
  isGradeFile,
  setDraftRotating,
  subjectFor,
  type CellDraft,
  type GradeFile,
  type ScheduleCell,
} from './timetable';

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

  test('shows a rotation week left blank as a free period instead of the other week', () => {
    const cell = { subject: '物理', alternating: { odd: '物理', even: '' } };
    expect(subjectFor(cell, 'odd')).toBe('物理');
    expect(subjectFor(cell, 'even')).toBe('');
  });
});

describe('schedule editor cells', () => {
  const imported: ScheduleCell = { subject: '物理', alternating: { odd: '物理', even: '化學' } };
  const save = (cell: ScheduleCell, edit: Partial<CellDraft>) =>
    cellFromDraft({ ...draftFromCell(cell), ...edit });

  test('opens an imported rotation with each week editable', () => {
    expect(draftFromCell(imported)).toEqual({
      rotating: true, subject: '物理', odd: '物理', even: '化學', note: '', color: 'Default',
    });
    expect(draftFromCell({ subject: '國文', note: '帶課本', color: 'Blue' })).toEqual({
      rotating: false, subject: '國文', odd: '', even: '', note: '帶課本', color: 'Blue',
    });
  });

  test('turning rotation off replaces it with a single subject, and a blank one is a free period', () => {
    const always = save(imported, { rotating: false, subject: ' 物理 ' });
    expect(always).toEqual({ subject: '物理', note: '', color: 'Default' });
    expect(getAlternating(always)).toBeNull();
    expect(subjectFor(always, 'even')).toBe('物理');

    const free = save(imported, { rotating: false, subject: '' });
    expect(free).not.toHaveProperty('alternating');
    expect(subjectFor(free, 'odd')).toBe('');
    expect(subjectFor(free, 'even')).toBe('');
  });

  test('saves each week of a rotation separately, including weeks that become free', () => {
    const edited = save(imported, { odd: '地科', even: ' 化學 ', note: ' 實驗室 ', color: 'Green' });
    expect(edited).toEqual({ subject: '地科', alternating: { odd: '地科', even: '化學' }, note: '實驗室', color: 'Green' });
    expect(subjectFor(edited, 'odd')).toBe('地科');
    expect(subjectFor(edited, 'even')).toBe('化學');

    const evenFree = save(imported, { even: '' });
    expect(subjectFor(evenFree, 'odd')).toBe('物理');
    expect(subjectFor(evenFree, 'even')).toBe('');
    const oddFree = save(imported, { odd: '' });
    expect(subjectFor(oddFree, 'odd')).toBe('');
    expect(subjectFor(oddFree, 'even')).toBe('化學');
  });

  test('stores a rotation with the same subject both weeks as a plain subject', () => {
    expect(save(imported, { odd: '物理', even: '物理 ' })).toEqual({ subject: '物理', note: '', color: 'Default' });
    expect(save(imported, { odd: ' ', even: '' })).toEqual({ subject: '', note: '', color: 'Default' });
  });

  test('turns rotation on for a regular slot starting from the subject typed so far', () => {
    const draft = setDraftRotating({ ...draftFromCell({ subject: '國文' }), subject: '數學' }, true);
    expect(draft).toMatchObject({ rotating: true, odd: '數學', even: '' });
    const cell = cellFromDraft({ ...draft, even: '音樂' });
    expect(cell).toEqual({ subject: '數學', alternating: { odd: '數學', even: '音樂' }, note: '', color: 'Default' });
    expect(subjectFor(cell, 'even')).toBe('音樂');
    // Typed weeks survive switching rotation off and back on.
    expect(setDraftRotating(setDraftRotating({ ...draft, even: '音樂' }, false), true)).toMatchObject({ odd: '數學', even: '音樂' });
  });

  test('keeps the meaning of overrides saved by the previous build', () => {
    // It only replaced `subject` and left `alternating` in place.
    const override = { ...imported, subject: '自習' };
    expect(getAlternating(override)).toBeNull();
    expect(subjectFor(override, 'even')).toBe('自習');
    // The editor shows it as a single subject but can restore the imported weeks.
    expect(draftFromCell(override)).toMatchObject({ rotating: false, subject: '自習' });
    expect(setDraftRotating(draftFromCell(override), true)).toMatchObject({ rotating: true, odd: '物理', even: '化學' });
    // Saving rewrites it without the stale rotation.
    expect(cellFromDraft(draftFromCell(override))).toEqual({ subject: '自習', note: '', color: 'Default' });
  });

  test('saves every slot unambiguously so reopening it shows what was saved', () => {
    const drafts: Partial<CellDraft>[] = [
      { rotating: false, subject: '物理' }, { rotating: false, subject: '化學' }, { rotating: false, subject: '' },
      { rotating: true, odd: '化學', even: '物理' }, { rotating: true, odd: '', even: '物理' }, { rotating: true, odd: '物理', even: '' },
    ];
    for (const edit of drafts) {
      const cell = save(imported, edit);
      const reopened = draftFromCell(cell);
      expect(cellFromDraft(reopened)).toEqual(cell);
      expect(reopened.rotating).toBe(edit.rotating);
    }
  });
});
