import { describe, expect, test } from '@jest/globals';

import { PERIOD_NAMES, WEEKDAYS, type ScheduleRow } from '@/features/schedule/timetable';

import { mergeLegacyImport } from './merge';
import type { LegacyImport, StoresData } from './types';

const rows = (subject: string): ScheduleRow[] => PERIOD_NAMES.map((name) => {
  const row = { name } as ScheduleRow;
  for (const day of WEEKDAYS) row[day] = { subject };
  return row;
});

const DEFAULT_CATEGORY = { name: 'Default', color: '#ADADAD' };
const BIKE_SCHOOL = { sna: 'YouBike2.0_泉州寧波西街口', nickname: '建中東側門', city: '臺北市' as const };
const BIKE_GARDEN = { sna: 'YouBike2.0_植物園', nickname: '台北植物園', city: '臺北市' as const };

/** Each store's defaults, as in src/store (no class until one is chosen). */
const initial: StoresData = {
  schedule: { userClass: '', rows: [] },
  todo: { events: [], eventCategories: [DEFAULT_CATEGORY], todos: [], todoCategories: [], view: 'calendar' },
  news: { pinned: [], lastClearedTime: null },
  food: { favorites: [] },
  transport: { youbike: [BIKE_SCHOOL, BIKE_GARDEN], metro: ['中正紀念堂', '小南門', '西門'] },
  settings: { homeWidgets: { todo: true, lunch: true, commute: true, news: true } },
};

const legacy: LegacyImport = {
  schedule: { userClass: '205', rows: rows('舊') },
  todo: {
    events: [{ id: '1', title: '段考', startDate: '2026-10-14', endDate: '2026-10-16', category: { name: '考試', color: '#FF0000' } }],
    eventCategories: [DEFAULT_CATEGORY, { name: '考試', color: '#FF0000' }],
    todos: [{ id: '2', title: '交作業', date: '2026-10-05', category: { name: '作業' } }],
    todoCategories: [{ name: '作業' }],
    view: 'todoList',
  },
  news: { pinned: [{ title: '公告', link: 'https://www.ck.tp.edu.tw/a', pubDate: '2026-09-30T02:00:00.000Z' }], lastClearedTime: '2026-10-01T00:00:00.000Z' },
  food: { favorites: ['南門市場'] },
  // The user had removed 植物園 and 西門.
  transport: { youbike: [BIKE_SCHOOL], metro: ['中正紀念堂', '小南門', '台北車站'] },
  settings: { homeWidgets: { news: false } },
};

describe('legacy import merge', () => {
  test('replaces untouched defaults on the first launch, keeping removals made in the previous app', () => {
    const merged = mergeLegacyImport(initial, legacy, initial, { scheduleEdited: false });
    expect(merged).toEqual({
      schedule: legacy.schedule,
      todo: legacy.todo,
      news: legacy.news,
      food: legacy.food,
      transport: legacy.transport,
      settings: { homeWidgets: { todo: true, lunch: true, commute: true, news: false } },
    });
    // Nothing to import leaves everything as it is.
    expect(mergeLegacyImport(initial, {}, initial, { scheduleEdited: false })).toEqual(initial);
  });

  test('never drops what the user created in this app on a later attempt', () => {
    const current: StoresData = {
      schedule: { userClass: '101', rows: rows('新') },
      todo: {
        events: [{ id: 'a-1', title: '社團', startDate: '2026-10-07', endDate: '2026-10-07', category: DEFAULT_CATEGORY }],
        eventCategories: [DEFAULT_CATEGORY, { name: '社團', color: '#2E7D32' }],
        todos: [{ id: '2', title: '已在新 app 修改', date: null, category: null }],
        todoCategories: [],
        view: 'calendar',
      },
      news: { pinned: [], lastClearedTime: '2026-10-04T08:00:00.000Z' },
      food: { favorites: ['建中黑白切'] },
      transport: { youbike: [BIKE_SCHOOL, BIKE_GARDEN], metro: ['中正紀念堂', '小南門', '西門', '東門'] },
      settings: { homeWidgets: { todo: false, lunch: false, commute: true, news: true } },
    };
    const merged = mergeLegacyImport(current, legacy, initial, { scheduleEdited: true });
    // The user edited the timetable here: it stays.
    expect(merged.schedule).toBe(current.schedule);
    expect(merged.todo).toEqual({
      events: [current.todo.events[0], legacy.todo?.events?.[0]],
      eventCategories: [DEFAULT_CATEGORY, { name: '社團', color: '#2E7D32' }, { name: '考試', color: '#FF0000' }],
      // Same id: this app's copy wins.
      todos: current.todo.todos,
      // Still at its default, so the previous app's list replaces it.
      todoCategories: [{ name: '作業' }],
      view: 'todoList',
    });
    expect(merged.news).toEqual({ pinned: legacy.news?.pinned, lastClearedTime: '2026-10-04T08:00:00.000Z' });
    expect(merged.food.favorites).toEqual(['建中黑白切', '南門市場']);
    // Untouched default stations take the previous app's list; changed ones are combined.
    expect(merged.transport).toEqual({ youbike: [BIKE_SCHOOL], metro: ['中正紀念堂', '小南門', '西門', '東門', '台北車站'] });
    // Settings already changed here are kept, the rest come over.
    expect(merged.settings).toEqual({ homeWidgets: { todo: false, lunch: false, commute: true, news: false } });
  });

  test('replaces an automatically filled timetable, but not one the user edited', () => {
    const autoFilled = { ...initial, schedule: { userClass: '101', rows: rows('101') } };
    expect(mergeLegacyImport(autoFilled, legacy, initial, { scheduleEdited: false }).schedule).toEqual(legacy.schedule);
    expect(mergeLegacyImport(autoFilled, legacy, initial, { scheduleEdited: true }).schedule).toBe(autoFilled.schedule);
    // An edited-but-empty timetable has nothing to lose.
    expect(mergeLegacyImport(initial, legacy, initial, { scheduleEdited: true }).schedule).toEqual(legacy.schedule);
  });

  test('a class without saved rows starts empty only when it differs', () => {
    const autoFilled = { ...initial, schedule: { userClass: '101', rows: rows('101') } };
    expect(mergeLegacyImport(autoFilled, { schedule: { userClass: '205' } }, initial, { scheduleEdited: false }).schedule)
      .toEqual({ userClass: '205', rows: [] });
    expect(mergeLegacyImport(autoFilled, { schedule: { userClass: '101' } }, initial, { scheduleEdited: false }).schedule)
      .toEqual(autoFilled.schedule);
    expect(mergeLegacyImport(autoFilled, { schedule: { rows: rows('舊') } }, initial, { scheduleEdited: false }).schedule)
      .toEqual({ userClass: '101', rows: rows('舊') });
  });
});
