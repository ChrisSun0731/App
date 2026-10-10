import { describe, expect, test } from '@jest/globals';

import { PERIOD_NAMES, WEEKDAYS, type Period, type ScheduleRow } from '@/features/schedule/timetable';
import { toSchoolEvents } from '@/features/todo/school-calendar';

import { dayLabel, nowCard, nowState, railOf, slotsOn, type NowInput } from './now';

// The real bell times and class 201's timetable (schedules/gaoer_schedules.json).
const PERIODS: Period[] = [
  ['08:10', '09:00'], ['09:10', '10:00'], ['10:10', '11:00'], ['11:10', '12:00'],
  ['13:00', '13:50'], ['14:00', '14:50'], ['15:10', '16:00'], ['16:10', '17:00'],
].map(([start, end], index) => ({ name: PERIOD_NAMES[index], start, end }));

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
// The user's own note on Wednesday's 物理.
ROWS[2].Wednesday = { subject: '物理', note: ' 實驗室上課 ' };

const EVENTS = toSchoolEvents({
  term: '115學年度第1學期',
  events: [
    { title: '開學', startDate: '2026-08-31', endDate: '2026-08-31' },
    { title: '國慶日補假', startDate: '2026-10-09', endDate: '2026-10-09' },
    { title: '國慶日', startDate: '2026-10-10', endDate: '2026-10-10' },
    { title: '高一、高二、高三第1次定期考(◆考後大掃除)', startDate: '2026-10-13', endDate: '2026-10-14', department: '教務處' },
    { title: '休業式', startDate: '2027-01-20', endDate: '2027-01-20', department: '學務處' },
  ],
});

/** Wednesday 2026-10-07 (week 6) at hh:mm, unless another day is given. */
const at = (hours: number, minutes: number, month = 10, day = 7) => new Date(2026, month - 1, day, hours, minutes);

const input = (now: Date, overrides: Partial<NowInput> = {}): NowInput => ({
  now,
  periods: PERIODS,
  rows: ROWS,
  semesterStart: '2026-08-31',
  events: EVENTS,
  term: '115學年度第1學期',
  grade: 2,
  ...overrides,
});

const card = (now: Date) => {
  const state = nowState(input(now));
  return nowCard(state, now, railOf(now, slotsOn(now, PERIODS, ROWS, '2026-08-31')));
};

describe('the moment of the school day', () => {
  test('before school: the first class, in minutes when it is near and on the clock when not', () => {
    expect(card(at(7, 48))).toMatchObject({
      eyebrow: '第一節',
      eyebrowDetail: '08:10–09:00',
      title: '各類文學選讀',
      footer: '22 分鐘後上課',
      footerDetail: '16:00 放學',
    });
    expect(card(at(6, 30)).footer).toBe('08:10 上課');
  });

  test('in class: time to the bell, the 連堂 and what comes after it', () => {
    expect(card(at(8, 30))).toMatchObject({
      eyebrow: '第一節',
      title: '各類文學選讀',
      subtitle: '連堂到 10:00',
      footer: '30 分鐘後下課',
      footerDetail: '下一節 物理 10:10',
    });
    expect(card(at(10, 37))).toMatchObject({
      eyebrow: '第三節',
      eyebrowDetail: '10:10–11:00',
      title: '物理',
      subtitle: '實驗室上課',
      footer: '23 分鐘後下課',
      footerDetail: '下一節 英語文 11:10',
    });
  });

  test('the last class of the day says so', () => {
    expect(card(at(15, 30))).toMatchObject({ title: '班會', footerDetail: '今天最後一節' });
  });

  test('at the bell the period is over: 下課 until the next one starts', () => {
    expect(card(at(11, 0))).toMatchObject({ eyebrow: '下課 · 接下來第四節', title: '英語文', footer: '10 分鐘後上課' });
    expect(nowState(input(at(11, 4)))).toMatchObject({ kind: 'break', minutes: 6 });
  });

  test('lunch is the long gap between the morning and the afternoon', () => {
    expect(card(at(12, 14))).toMatchObject({
      eyebrow: '午餐',
      eyebrowDetail: '12:00–13:00',
      title: '午餐時間',
      footer: '46 分鐘後上課',
      footerDetail: '第五節 地理 13:00',
    });
  });

  test('after the last class (第八節 is free): school is out, with tomorrow\'s first class', () => {
    expect(card(at(16, 12))).toMatchObject({ eyebrow: '今天的課上完了', eyebrowDetail: '16:12', title: '放學了', subtitle: '明天 08:10 第一節 體育' });
  });

  test('a holiday from the 行事曆, with the next school day', () => {
    // A long weekend says how long it lasts.
    expect(card(at(10, 0, 10, 9))).toMatchObject({
      eyebrow: '今天不用上課',
      eyebrowDetail: '星期五',
      title: '國慶日補假',
      subtitle: '連假到 10月11日',
      details: [{ key: 'next', label: '下次上課', value: '10/12 星期一 08:10 公民與社會' }],
    });
    // The last day off has nothing more to say.
    expect(card(at(10, 0, 10, 11))).toMatchObject({ title: '週末', subtitle: undefined });
  });

  test('an exam day replaces the timetable', () => {
    expect(card(at(9, 0, 10, 14))).toMatchObject({
      eyebrow: '今天考試',
      eyebrowDetail: '第 2 天，共 2 天',
      title: '第1次定期考',
      subtitle: '祝考試順利！',
      rail: undefined,
    });
  });

  test('a free period in session', () => {
    const rows = ROWS.map((row) => (row.name === '三' ? { ...row, Wednesday: { subject: '' } } : row));
    expect(nowState(input(at(10, 30), { rows }))).toMatchObject({ kind: 'class', slot: { subject: '' } });
  });

  test('without rows: no class yet asks for one, a class the data lacks says so', () => {
    const noClass = nowState(input(at(10, 30), { rows: [], userClass: '' }));
    expect(noClass).toEqual({ kind: 'no-timetable', hasClass: false });
    expect(nowCard(noClass, at(10, 30), null)).toMatchObject({
      eyebrow: '現在',
      title: '選擇班級',
      subtitle: '選好班級，就能看到現在的課。',
      rail: undefined,
    });
    // Blank is no class either.
    expect(nowState(input(at(10, 30), { rows: [], userClass: ' ' }))).toEqual({ kind: 'no-timetable', hasClass: false });

    const unknown = nowState(input(at(10, 30), { rows: [], userClass: '999' }));
    expect(unknown).toEqual({ kind: 'no-timetable', hasClass: true });
    expect(nowCard(unknown, at(10, 30), null)).toMatchObject({
      eyebrow: '現在',
      title: '還沒有課表',
      subtitle: '找不到這個班級的課表，可在設定換一班。',
    });
    // A caller that does not know the class (the widget timeline) gets the timetable wording.
    expect(nowState(input(at(10, 30), { rows: [] }))).toEqual({ kind: 'no-timetable', hasClass: true });
  });

  test('a free period with only a note is still worth pointing at', () => {
    const rows = ROWS.map((row) => (row.name === '一' ? { ...row, Wednesday: { subject: '', note: '自習' } } : row));
    expect(nowCard(nowState(input(at(7, 0), { rows })), at(7, 0), null)).toMatchObject({ eyebrow: '第一節', title: '自習' });
  });

  test('uses bell times, not the order the periods arrive in', () => {
    const shuffled = [PERIODS[3], PERIODS[0], PERIODS[7], PERIODS[2], PERIODS[1], PERIODS[5], PERIODS[4], PERIODS[6]];
    expect(nowState(input(at(10, 37), { periods: shuffled }))).toEqual(nowState(input(at(10, 37))));
  });

  test('rotations follow the week; without a semester start weeks count as 單週', () => {
    // Monday 10/5 starts week 6, a 雙週.
    const rows = ROWS.map((row) =>
      row.name === '一' ? { ...row, Monday: { subject: '物理', alternating: { odd: '物理', even: '化學' } } } : row);
    expect(nowState(input(at(8, 30, 10, 5), { rows }))).toMatchObject({ kind: 'class', slot: { subject: '化學' } });
    expect(nowState(input(at(8, 30, 10, 5), { rows, semesterStart: null }))).toMatchObject({ kind: 'class', slot: { subject: '物理' } });
  });

  test('without the 行事曆 only weekends are off', () => {
    expect(nowState(input(at(10, 30, 10, 9), { events: [] }))).toMatchObject({ kind: 'class', slot: { subject: '彈性學習' } });
  });

  test('the spoken label reads the card in order', () => {
    expect(card(at(10, 37)).accessibilityLabel).toBe('第三節，10:10–11:00，物理，實驗室上課，23 分鐘後下課，下一節 英語文 11:10');
  });
});

describe('the bell rail', () => {
  test('one segment per period, lunch in between, filled up to now', () => {
    const rail = railOf(at(10, 37), slotsOn(at(10, 37), PERIODS, ROWS, '2026-08-31'))!;
    expect(rail.start).toBe(490);
    expect(rail.end).toBe(1020);
    expect(rail.now).toBe(637);
    expect(rail.segments.map((segment) => segment.label)).toEqual(['一', '二', '三', '四', '午', '五', '六', '七', '八']);
    expect(rail.segments.map((segment) => segment.kind)).toEqual([
      'lesson', 'lesson', 'lesson', 'lesson', 'lunch', 'lesson', 'lesson', 'lesson', 'free',
    ]);
    expect(rail.segments[2]).toMatchObject({ current: true, progress: 0.54 });
    expect(rail.segments[1]).toMatchObject({ current: false, progress: 1 });
    expect(rail.segments[3].progress).toBe(0);
  });

  test('outside the day there is no marker; on weekends no rail', () => {
    expect(railOf(at(17, 30), slotsOn(at(17, 30), PERIODS, ROWS, null))?.now).toBeNull();
    expect(railOf(at(10, 0, 10, 10), slotsOn(at(10, 0, 10, 10), PERIODS, ROWS, null))).toBeNull();
  });
});

describe('labels', () => {
  test('day names', () => {
    expect(dayLabel(new Date(2026, 9, 8), at(16, 0))).toBe('明天');
    expect(dayLabel(new Date(2026, 9, 12), at(16, 0, 10, 9))).toBe('10/12 星期一');
  });
});
