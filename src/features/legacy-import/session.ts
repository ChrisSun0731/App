// One launch's part in the legacy import: whether to attempt it, and what to
// do with the result. The UI side (hidden WebView, splash) is in
// legacy-importer.tsx.
import { hadStoredStateAtLaunch, readJson, writeJson } from '@/lib/storage';
import { useFoodStore } from '@/store/food';
import { useNewsStore } from '@/store/news';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import { useTransportStore } from '@/store/transport';

import { mergeLegacyImport } from './merge';
import {
  beginAttempt,
  LEGACY_IMPORT_KEY,
  parseStatus,
  READER_VERSION,
  type LegacyImportStatus,
  type LegacySource,
} from './status';
import { hasLegacyData, transformLegacyStore } from './transform';
import type { StoresData } from './types';

let status: LegacyImportStatus | null = null;
let attempting = false;
// Set while the import itself writes to the stores: those changes are not the user's.
let applying = false;
let stopWatching = () => {};

interface WatchedStore {
  subscribe: (listener: (state: object) => void) => () => void;
  getInitialState: () => object;
}
/** Every store the import writes to. */
const STORES: readonly WatchedStore[] = [useScheduleStore, useTodoStore, useNewsStore, useFoodStore, useTransportStore, useSettingsStore];

function save(next: LegacyImportStatus) {
  status = next;
  writeJson(LEGACY_IMPORT_KEY, next);
}

function finish(outcome: 'imported' | 'empty' | 'reset') {
  if (!status) return;
  attempting = false;
  stopWatching();
  save({ ...status, done: true, outcome, ...(outcome === 'reset' ? {} : { reader: READER_VERSION }) });
}

// While the import is owed, two things the user does here matter to it.
//
// The timetable changes in two ways: a class's bundled timetable fills an
// empty one (the screens' automatic load for a class already set, or the
// first class picked on 你是哪一班？ or in 設定 over a class-less, empty
// timetable), or the user edits a cell, reloads, or changes class. Only the
// latter makes it theirs, which a later attempt must then leave alone; a first
// pick only answers the question, so the previous app's class and edits still
// land on a later attempt.
//
// Settings' 重設個人資料與設定 puts every store back to its initial state in
// one go. The user asked to start over, so the previous app's data must not
// arrive afterwards either. Nothing else resets them all in the same task
// (emptying one list by hand is not that), which is how it is recognised
// without the settings screen having to know about the import.
function watchUser() {
  const reset = new Set<WatchedStore>();
  const unsubscribe = [
    useScheduleStore.subscribe((state, prev) => {
      if (applying || !status || status.done || status.scheduleEdited) return;
      // A first class over an empty, class-less timetable: its bundled rows.
      if (prev.userClass === '' && prev.rows.length === 0) return;
      if (state.userClass === prev.userClass && (prev.rows.length === 0 || state.rows === prev.rows)) return;
      save({ ...status, scheduleEdited: true });
    }),
    ...STORES.map((store) => store.subscribe((state) => {
      // The stores hold plain JSON (actions drop out of the comparison).
      if (applying || JSON.stringify(state) !== JSON.stringify(store.getInitialState())) return;
      if (reset.size === 0) void Promise.resolve().then(() => reset.clear());
      reset.add(store);
      if (reset.size === STORES.length) abandonLegacyImport();
    })),
  ];
  stopWatching = () => unsubscribe.forEach((stop) => stop());
}

/**
 * Whether this launch should attempt the import. Decided once per launch,
 * before anything renders; the attempt is counted now.
 */
export function startLegacyImport(): boolean {
  if (status) return attempting;
  const saved = parseStatus(readJson(LEGACY_IMPORT_KEY));
  const begun = beginAttempt(saved, hadStoredStateAtLaunch());
  status = begun.status;
  attempting = begun.run;
  if (status !== saved) save(status);
  if (attempting) watchUser();
  return attempting;
}

/**
 * Whether this launch's attempt is still running, so the reader should be
 * mounted. Read when the root mounts: it can mount again in the same JS
 * runtime after the attempt has ended.
 */
export function isAttemptingLegacyImport(): boolean {
  return attempting;
}

/**
 * Ends the import without importing, for when the user has started over in
 * this app (watchUser recognises Settings' reset; callers may also say so
 * directly). Does nothing once the import is done.
 */
export function abandonLegacyImport(): void {
  if (status && !status.done) finish('reset');
}

function storesData(read: <S>(store: { getState: () => S; getInitialState: () => S }) => S): StoresData {
  const schedule = read(useScheduleStore);
  const todo = read(useTodoStore);
  const news = read(useNewsStore);
  const food = read(useFoodStore);
  const transport = read(useTransportStore);
  const settings = read(useSettingsStore);
  return {
    schedule: { userClass: schedule.userClass, rows: schedule.rows },
    todo: {
      events: todo.events,
      eventCategories: todo.eventCategories,
      todos: todo.todos,
      todoCategories: todo.todoCategories,
      view: todo.view,
    },
    news: { pinned: news.pinned, lastClearedTime: news.lastClearedTime },
    food: { favorites: food.favorites },
    transport: { youbike: transport.youbike, metro: transport.metro },
    settings: { homeWidgets: settings.homeWidgets },
  };
}

/**
 * Ends this launch's attempt. Found data is merged into the stores and the
 * import is done; so it is when no origin had any. Anything else (an origin
 * failed, or the time ran out) leaves it owed for the next launch.
 */
export function finishLegacyImport(source: LegacySource): void {
  if (!attempting || !status || status.done) return;
  attempting = false;
  try {
    if (source.kind === 'found') {
      const legacy = transformLegacyStore(source.store, source.userClass);
      const next = mergeLegacyImport(
        storesData((store) => store.getState()),
        legacy,
        storesData((store) => store.getInitialState()),
        { scheduleEdited: status.scheduleEdited },
      );
      // Each write persists synchronously and throws if SQLite cannot store
      // it. Watching stops only once all have landed, so if one fails the
      // user's later timetable edits are still recorded for the next attempt.
      applying = true;
      try {
        useScheduleStore.setState(next.schedule);
        useTodoStore.setState(next.todo);
        useNewsStore.setState(next.news);
        useFoodStore.setState(next.food);
        useTransportStore.setState(next.transport);
        useSettingsStore.setState(next.settings);
        // The previous app knew the class: no need to ask 你是哪一班？
        if (legacy.schedule?.userClass) useSettingsStore.setState({ welcomed: true });
      } finally {
        applying = false;
      }
      finish(hasLegacyData(legacy) ? 'imported' : 'empty');
    } else if (source.kind === 'empty') {
      finish('empty');
    } else {
      console.warn(`[legacy-import] attempt ${status.attempts} did not finish (${source.kind}); retrying next launch`);
    }
  } catch (error) {
    // Left owed: the next launch tries again, up to MAX_ATTEMPTS.
    console.warn('[legacy-import] could not import the previous app\'s data:', error);
  }
}
