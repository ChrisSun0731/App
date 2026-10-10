import { describe, expect, test } from '@jest/globals';

import { PERIOD_NAMES, WEEKDAYS, type Period, type ScheduleRow } from '@/features/schedule/timetable';
import { toSchoolEvents } from '@/features/todo/school-calendar';

import { nowTimeline } from './now-timeline';

const PERIODS: Period[] = [
  ['08:10', '09:00'], ['09:10', '10:00'], ['10:10', '11:00'], ['11:10', '12:00'],
  ['13:00', '13:50'], ['14:00', '14:50'], ['15:10', '16:00'], ['16:10', '17:00'],
].map(([start, end], index) => ({ name: PERIOD_NAMES[index], start, end }));

// Class 201 (schedules/gaoer_schedules.json).
const TIMETABLE: Record<(typeof WEEKDAYS)[number], string[]> = {
  Monday: ['公民與社會', '公民與社會', '體育', '數學(彈性學習)', '化學', '國語文', '國語文', ''],
  Tuesday: ['選修生物', '選修生物', '國語文', '國語文', '英語文', '英語文', '音樂', ''],
  Wednesday: ['各類文學選讀', '各類文學選讀', '物理', '英語文', '地理', '地理', '班會', ''],
  Thursday: ['體育', '音樂', '歷史', '歷史', '數學', '數學', '英語文', ''],
  Friday: ['生活科技', '生活科技', '彈性學習', '彈性學習', '綜合活動', '數學', '數學', ''],
};
const ROWS: ScheduleRow[] = PERIOD_NAMES.map((name, index) => {
  const row = { name } as ScheduleRow;
  for (const day of WEEKDAYS) row[day] = { subject: TIMETABLE[day][index] };
  return row;
});

const INPUT = {
  periods: PERIODS,
  rows: ROWS,
  semesterStart: '2026-08-31',
  events: toSchoolEvents({ events: [{ title: '國慶日補假', startDate: '2026-10-09', endDate: '2026-10-09' }] }),
  term: '115學年度第1學期',
  grade: 2 as const,
};

const time = (date: Date) => `${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

describe('the 現在 widget timeline', () => {
  const entries = nowTimeline(INPUT, new Date(2026, 9, 7, 10, 37));

  test('starts now and then changes at every bell and midnight', () => {
    expect(entries.slice(0, 6).map((entry) => time(entry.date))).toEqual(['7 10:37', '7 11:00', '7 11:10', '7 12:00', '7 13:00', '7 13:50']);
    expect(entries.some((entry) => time(entry.date) === '8 00:00')).toBe(true);
    // 36 hours ahead at most, in order and without repeats.
    expect(time(entries[entries.length - 1].date)).toBe('8 17:00');
    const stamps = entries.map((entry) => entry.date.getTime());
    expect(stamps).toEqual([...new Set(stamps)].sort((a, b) => a - b));
  });

  test('counts down to the bell in class and to the next class in breaks', () => {
    expect(entries[0].props).toMatchObject({
      eyebrow: '第三節',
      title: '物理',
      detail: '10:10–11:00',
      until: new Date(2026, 9, 7, 11, 0).getTime(),
      untilLabel: '後下課',
      next: '接下來 英語文 11:10',
    });
    expect(entries[1].props).toMatchObject({ eyebrow: '下課', title: '英語文', untilLabel: '後上課', until: new Date(2026, 9, 7, 11, 10).getTime() });
    expect(entries[3].props).toMatchObject({ eyebrow: '午餐', title: '午餐時間', next: '第五節 地理' });
  });

  test('after school it points at tomorrow, and the next morning counts down to it', () => {
    const afterSchool = entries.find((entry) => time(entry.date) === '7 16:00');
    expect(afterSchool?.props).toMatchObject({ eyebrow: '放學了', title: '體育', next: '明天 08:10 第一節' });
    expect(afterSchool?.props.upcoming).toBeUndefined();
    const morning = entries.find((entry) => time(entry.date) === '8 00:00');
    expect(morning?.props).toMatchObject({ eyebrow: '第一節 08:10', title: '體育', untilLabel: '後上課', next: '16:00 放學' });
  });

  test('the rail and what comes next, for the small and medium widgets', () => {
    expect(entries[0].props.upcoming).toEqual([
      { title: '英語文', time: '11:10' },
      { title: '午餐', time: '12:00' },
      { title: '地理 · 連堂', time: '13:00' },
      { title: '班會', time: '15:10' },
    ]);
    expect(entries[0].props.rail?.map((mark) => `${mark.kind}:${mark.state}`)).toEqual([
      'lesson:past', 'lesson:past', 'lesson:now', 'lesson:ahead', 'lunch:ahead',
      'lesson:ahead', 'lesson:ahead', 'lesson:ahead', 'free:ahead',
    ]);
  });

  test('two note-only slots in a row are separate lessons, not a 連堂', () => {
    // Thursday's 數學 連堂 (第五、六節) becomes 自習 then 班會, neither with a
    // subject: two rows, while the 歷史 連堂 before 午餐 still merges into one.
    const rows: ScheduleRow[] = ROWS.map((row) => {
      if (row.name === '五') return { ...row, Thursday: { subject: '', note: '自習' } };
      if (row.name === '六') return { ...row, Thursday: { subject: '', note: '班會' } };
      return row;
    });
    const [entry] = nowTimeline({ ...INPUT, rows }, new Date(2026, 9, 8, 9, 30));
    expect(entry.props.upcoming).toEqual([
      { title: '歷史 · 連堂', time: '10:10' },
      { title: '午餐', time: '12:00' },
      { title: '自習', time: '13:00' },
      { title: '班會', time: '14:00' },
    ]);
  });

  test('a day off from the 行事曆 names it', () => {
    const holiday = nowTimeline(INPUT, new Date(2026, 9, 8, 20, 0)).find((entry) => time(entry.date) === '9 00:00');
    expect(holiday?.props).toEqual({ eyebrow: '今天不用上課', title: '國慶日補假', next: '下次上課 10/12 星期一 公民與社會' });
  });
});
