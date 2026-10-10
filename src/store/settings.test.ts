import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// The device's SQLite storage, kept across simulated launches.
const mockMemory = new Map<string, string>();
// As the real module captures it while loading: whether any store had saved
// state before this launch's stores hydrate or write.
let mockStoredAtLaunch = false;

jest.mock('@/lib/storage', () => {
  const { createJSONStorage } = jest.requireActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    hadStoredStateAtLaunch: () => mockStoredAtLaunch,
    persistStorage: createJSONStorage(() => ({
      getItem: (key: string) => mockMemory.get(key) ?? null,
      setItem: (key: string, value: string) => { mockMemory.set(key, value); },
      removeItem: (key: string) => { mockMemory.delete(key); },
    })),
  };
});

/** A fresh JS runtime over the same storage, as on an app launch. */
function launch() {
  mockStoredAtLaunch = mockMemory.size > 0;
  jest.resetModules();
  return jest.requireActual<typeof import('./settings')>('./settings').useSettingsStore;
}

/** Saves a store's state the way persist does. */
function save(key: string, state: object) {
  mockMemory.set(key, JSON.stringify({ state, version: 1 }));
}

beforeEach(() => {
  mockMemory.clear();
});

describe('welcomed on launch', () => {
  test('a fresh install is asked 你是哪一班？', () => {
    expect(launch().getState().welcomed).toBe(false);
  });

  test('settings saved before the welcome screen existed count as answered', () => {
    save('ck.settings', { homeWidgets: { todo: true, lunch: false, commute: true, news: true }, calendarGradeOnly: false });
    const settings = launch().getState();
    expect(settings.welcomed).toBe(true);
    expect(settings.homeWidgets.lunch).toBe(false);
  });

  test('a saved timetable with no saved settings counts as answered too', () => {
    // A pre-4.0 user who never changed a setting: only the autofill's ck.schedule.
    save('ck.schedule', { userClass: '201', rows: [] });
    expect(launch().getState().welcomed).toBe(true);
  });

  test('the open question the welcome screen saves outlives other stores saving meanwhile', () => {
    launch().getState().setWelcomed(false);
    // e.g. the legacy import landing while the question is up.
    save('ck.todo', { todos: [] });
    expect(launch().getState().welcomed).toBe(false);
  });

  test('an answer is kept', () => {
    launch().getState().setWelcomed(true);
    expect(launch().getState().welcomed).toBe(true);
  });
});
