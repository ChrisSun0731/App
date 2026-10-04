import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { PERIOD_NAMES, WEEKDAYS, type ScheduleRow } from '@/features/schedule/timetable';

import { LEGACY_IMPORT_KEY, MAX_ATTEMPTS } from './status';

// The device's SQLite storage, kept across simulated launches.
const mockMemory = new Map<string, string>();
// Keys whose writes fail, as on a full disk.
const mockFailing = new Set<string>();

jest.mock('@/lib/storage', () => {
  const { createJSONStorage } = jest.requireActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    // As captured by the real module: before this launch's stores wrote anything.
    hadStoredStateAtLaunch: () => [...mockMemory.keys()].some((key) => key !== 'ck.legacy-import'),
    readJson: (key: string) => {
      const raw = mockMemory.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    writeJson: (key: string, value: unknown) => { mockMemory.set(key, JSON.stringify(value)); },
    persistStorage: createJSONStorage(() => ({
      getItem: (key: string) => mockMemory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (mockFailing.has(key)) throw new Error('database or disk is full');
        mockMemory.set(key, value);
      },
      removeItem: (key: string) => { mockMemory.delete(key); },
    })),
  };
});

/** A fresh JS runtime over the same storage, as on an app launch. */
function launch() {
  jest.resetModules();
  // (requireActual only because babel-jest leaves dynamic import() alone; the
  // modules' own imports still get the storage mock.)
  const load = <T,>(path: string) => jest.requireActual<T>(path);
  return {
    ...load<typeof import('./session')>('./session'),
    schedule: load<typeof import('@/store/schedule')>('@/store/schedule').useScheduleStore,
    todo: load<typeof import('@/store/todo')>('@/store/todo').useTodoStore,
    news: load<typeof import('@/store/news')>('@/store/news').useNewsStore,
    food: load<typeof import('@/store/food')>('@/store/food').useFoodStore,
    transport: load<typeof import('@/store/transport')>('@/store/transport').useTransportStore,
    settings: load<typeof import('@/store/settings')>('@/store/settings').useSettingsStore,
  };
}

const rows = (subject: string): ScheduleRow[] => PERIOD_NAMES.map((name) => {
  const row = { name } as ScheduleRow;
  for (const day of WEEKDAYS) row[day] = { subject };
  return row;
});

const legacyStore = JSON.stringify({
  schedule: { userClass: '205', scheduleData: rows('舊課').map((row) => ({ ...row, Monday: { subject: '國文', note: '小考' } })) },
  todo: { todos: [{ id: 1759600000000, title: '交作業', date: null, completed: false, category: null }] },
  food: { favoriteRestaurants: [{ name: '南門市場' }] },
});
const found = { kind: 'found', origin: 'https://localhost', store: legacyStore, userClass: '205' } as const;
const status = () => JSON.parse(mockMemory.get(LEGACY_IMPORT_KEY) ?? 'null');

beforeEach(() => {
  mockMemory.clear();
  mockFailing.clear();
  // Unfinished attempts are logged.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('legacy import across launches', () => {
  test('imports on the first launch after the update, once', () => {
    let app = launch();
    expect(app.startLegacyImport()).toBe(true);
    app.finishLegacyImport(found);
    expect(app.schedule.getState().userClass).toBe('205');
    expect(app.schedule.getState().rows[0].Monday).toEqual({ subject: '國文', note: '小考' });
    expect(app.todo.getState().todos).toEqual([{ id: '1759600000000', title: '交作業', date: null, category: null }]);
    expect(app.food.getState().favorites).toEqual(['南門市場']);
    expect(status()).toEqual({ done: true, attempts: 1, scheduleEdited: false, outcome: 'imported', reader: 1 });

    // Settings' 重設 resets the stores but not the status: no second import.
    app.food.getState().reset();
    app = launch();
    expect(app.food.getState().favorites).toEqual([]);
    expect(app.startLegacyImport()).toBe(false);
  });

  test('a fresh install finishes without touching the stores', () => {
    const app = launch();
    expect(app.startLegacyImport()).toBe(true);
    app.finishLegacyImport({ kind: 'empty' });
    expect(status()).toEqual({ done: true, attempts: 1, scheduleEdited: false, outcome: 'empty', reader: 1 });
    expect([...mockMemory.keys()]).toEqual([LEGACY_IMPORT_KEY]);
  });

  test('after a timeout, the automatic timetable load does not count as the user\'s', () => {
    let app = launch();
    app.startLegacyImport();
    app.finishLegacyImport({ kind: 'waiting' });
    // The screens fill the empty timetable with the default class's.
    app.schedule.getState().resetRows(rows('101 課'));
    app.todo.getState().addTodo({ title: '新 app 的待辦', date: null, category: null });

    app = launch();
    expect(app.startLegacyImport()).toBe(true);
    app.finishLegacyImport(found);
    expect(app.schedule.getState().userClass).toBe('205');
    expect(app.schedule.getState().rows[0].Monday.subject).toBe('國文');
    expect(app.todo.getState().todos.map((todo) => todo.title)).toEqual(['新 app 的待辦', '交作業']);
    expect(status()).toMatchObject({ done: true, attempts: 2, scheduleEdited: false });
  });

  test('an answer after the splash merges into what the screens already loaded', () => {
    const app = launch();
    app.startLegacyImport();
    expect(app.isAttemptingLegacyImport()).toBe(true);
    // The splash went; the app shows while the reader carries on.
    app.schedule.getState().resetRows(rows('101 課'));
    app.todo.getState().addTodo({ title: '新 app 的待辦', date: null, category: null });
    app.finishLegacyImport(found);
    expect(app.isAttemptingLegacyImport()).toBe(false);
    expect(app.schedule.getState().userClass).toBe('205');
    expect(app.todo.getState().todos.map((todo) => todo.title)).toEqual(['新 app 的待辦', '交作業']);
    expect(status()).toMatchObject({ done: true, attempts: 1, scheduleEdited: false, outcome: 'imported' });
  });

  test('a reset while the reader is still running drops its late answer', () => {
    let app = launch();
    app.startLegacyImport();
    app.schedule.getState().resetRows(rows('101 課'));
    for (const store of [app.schedule, app.todo, app.news, app.food, app.transport, app.settings]) store.getState().reset();
    expect(app.isAttemptingLegacyImport()).toBe(false);
    app.finishLegacyImport(found);
    expect(app.food.getState().favorites).toEqual([]);
    expect(status()).toMatchObject({ done: true, outcome: 'reset' });

    app = launch();
    expect(app.isAttemptingLegacyImport()).toBe(false);
    expect(app.startLegacyImport()).toBe(false);
  });

  test('if a write fails partway, edits made afterwards still protect the timetable', () => {
    let app = launch();
    app.startLegacyImport();
    app.schedule.getState().resetRows(rows('101 課'));
    mockFailing.add('ck.todo');
    app.finishLegacyImport(found);
    // The timetable landed, the todos did not: still owed.
    expect(app.schedule.getState().userClass).toBe('205');
    expect(status()).toMatchObject({ done: false, scheduleEdited: false });
    mockFailing.clear();
    app.schedule.getState().updateCell('一', 'Tuesday', { subject: '自習', note: '', color: 'Default' });
    expect(status()).toMatchObject({ done: false, scheduleEdited: true });

    app = launch();
    app.startLegacyImport();
    app.finishLegacyImport(found);
    expect(app.schedule.getState().rows[0].Tuesday.subject).toBe('自習');
    expect(app.todo.getState().todos.map((todo) => todo.title)).toEqual(['交作業']);
    expect(status()).toMatchObject({ done: true, attempts: 2, outcome: 'imported' });
  });

  test('after a timeout, a timetable the user edited is kept', () => {
    let app = launch();
    app.startLegacyImport();
    app.finishLegacyImport({ kind: 'failed' });
    app.schedule.getState().resetRows(rows('101 課'));
    app.schedule.getState().updateCell('一', 'Monday', { subject: '自習', note: '', color: 'Default' });
    expect(status()).toMatchObject({ done: false, scheduleEdited: true });

    app = launch();
    app.startLegacyImport();
    app.finishLegacyImport(found);
    expect(app.schedule.getState().userClass).toBe('101');
    expect(app.schedule.getState().rows[0].Monday.subject).toBe('自習');
    expect(app.food.getState().favorites).toEqual(['南門市場']);
  });

  test('a build that already had data before the importer keeps its timetable', () => {
    let app = launch();
    app.schedule.getState().setClass('101', rows('自訂課'));
    app.settings.getState().setHomeWidget('news', false);

    app = launch();
    app.startLegacyImport();
    app.finishLegacyImport(found);
    expect(app.schedule.getState().rows[0].Monday.subject).toBe('自訂課');
    expect(app.settings.getState().homeWidgets.news).toBe(false);
    expect(app.todo.getState().todos).toHaveLength(1);
  });

  test('Settings\' reset while the import is owed ends it: nothing comes back next launch', () => {
    let app = launch();
    app.startLegacyImport();
    app.finishLegacyImport({ kind: 'waiting' });
    app.schedule.getState().resetRows(rows('101 課'));
    app.todo.getState().addTodo({ title: '新 app 的待辦', date: null, category: null });
    // As clearData in src/app/settings.tsx does.
    for (const store of [app.schedule, app.todo, app.news, app.food, app.transport, app.settings]) store.getState().reset();
    expect(status()).toMatchObject({ done: true, attempts: 1, outcome: 'reset' });

    app = launch();
    expect(app.startLegacyImport()).toBe(false);
    app.finishLegacyImport(found);
    expect(app.todo.getState().todos).toEqual([]);
    expect(app.food.getState().favorites).toEqual([]);
  });

  test('emptying a store by hand is not a reset', async () => {
    let app = launch();
    app.startLegacyImport();
    app.finishLegacyImport({ kind: 'waiting' });
    app.todo.getState().addTodo({ title: '暫時的', date: null, category: null });
    app.todo.getState().deleteTodo(app.todo.getState().todos[0].id);
    for (const store of [app.schedule, app.news, app.food]) store.getState().reset();
    // Resets in separate tasks are not Settings' one-tap reset.
    await Promise.resolve();
    for (const store of [app.todo, app.transport, app.settings]) store.getState().reset();
    expect(status()).toMatchObject({ done: false });

    app = launch();
    expect(app.startLegacyImport()).toBe(true);
    app.finishLegacyImport(found);
    expect(app.food.getState().favorites).toEqual(['南門市場']);
  });

  test('gives up after the last attempt', () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const app = launch();
      expect(app.startLegacyImport()).toBe(true);
      app.finishLegacyImport({ kind: 'waiting' });
    }
    const app = launch();
    expect(app.startLegacyImport()).toBe(false);
    expect(status()).toMatchObject({ done: true, attempts: MAX_ATTEMPTS, outcome: 'gave-up' });
  });
});
