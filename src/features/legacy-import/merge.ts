// How the previous app's data joins what is already in this app's stores.
//
// On the usual first launch after the update the stores are still at their
// defaults and the previous app's data simply takes their place. When this
// app already holds the user's own data (an earlier launch timed out before
// the import, or a pre-release build was used) nothing of it is lost: lists
// are combined, and a setting the user already changed here is kept.
import type { LegacyImport, StoresData } from './types';

/** The stores hold plain JSON, so equal serialisations mean equal values. */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A value still at its default was never chosen in this app, so the previous app's choice applies. */
function pick<T>(current: T, initial: T, legacy: T | undefined): T {
  return legacy !== undefined && same(current, initial) ? legacy : current;
}

/**
 * A list still at its default is replaced, so default stations or categories
 * the user removed in the previous app do not come back. Otherwise both are
 * kept, this app's entries first and the previous app's new ones after.
 */
function combine<T>(current: T[], initial: T[], legacy: T[] | undefined, key: (item: T) => string): T[] {
  if (!legacy) return current;
  if (same(current, initial)) return legacy;
  const seen = new Set(current.map(key));
  return [...current, ...legacy.filter((item) => !seen.has(key(item)))];
}

const self = (value: string) => value;
const byName = (item: { name: string }) => item.name;
const byId = (item: { id: string }) => item.id;

export interface MergeOptions {
  /**
   * The user changed the timetable or class in this app before the import
   * (or may have: see LegacyImportStatus.scheduleEdited).
   */
  scheduleEdited: boolean;
}

function mergeSchedule(current: StoresData['schedule'], legacy: LegacyImport['schedule'], scheduleEdited: boolean): StoresData['schedule'] {
  // Rows belong to their class, so the timetable is replaced as a whole or not
  // at all: only when the user has not made this one their own. Rows filled
  // automatically from the class's timetable do not count as theirs.
  if (!legacy || (scheduleEdited && current.rows.length > 0)) return current;
  const userClass = legacy.userClass ?? current.userClass;
  // Without saved rows, a different class starts empty so the screens load its timetable.
  const rows = legacy.rows ?? (userClass === current.userClass ? current.rows : []);
  return { userClass, rows };
}

/** The stores' data after the import. `initial` holds each store's defaults. */
export function mergeLegacyImport(current: StoresData, legacy: LegacyImport, initial: StoresData, { scheduleEdited }: MergeOptions): StoresData {
  const { todo = {}, news = {}, food = {}, transport = {}, settings = {} } = legacy;
  const widgets = settings.homeWidgets ?? {};
  return {
    schedule: mergeSchedule(current.schedule, legacy.schedule, scheduleEdited),
    todo: {
      events: combine(current.todo.events, initial.todo.events, todo.events, byId),
      eventCategories: combine(current.todo.eventCategories, initial.todo.eventCategories, todo.eventCategories, byName),
      todos: combine(current.todo.todos, initial.todo.todos, todo.todos, byId),
      todoCategories: combine(current.todo.todoCategories, initial.todo.todoCategories, todo.todoCategories, byName),
      view: pick(current.todo.view, initial.todo.view, todo.view),
    },
    news: {
      pinned: combine(current.news.pinned, initial.news.pinned, news.pinned, (item) => item.title),
      lastClearedTime: pick(current.news.lastClearedTime, initial.news.lastClearedTime, news.lastClearedTime),
    },
    food: { favorites: combine(current.food.favorites, initial.food.favorites, food.favorites, self) },
    transport: {
      youbike: combine(current.transport.youbike, initial.transport.youbike, transport.youbike, (station) => `${station.city}|${station.sna}`),
      metro: combine(current.transport.metro, initial.transport.metro, transport.metro, self),
    },
    settings: {
      // The toolbar is one choice (order and visibility together), not a list to combine.
      toolbar: pick(current.settings.toolbar, initial.settings.toolbar, settings.toolbar),
      homeWidgets: {
        schedule: pick(current.settings.homeWidgets.schedule, initial.settings.homeWidgets.schedule, widgets.schedule),
        todo: pick(current.settings.homeWidgets.todo, initial.settings.homeWidgets.todo, widgets.todo),
        news: pick(current.settings.homeWidgets.news, initial.settings.homeWidgets.news, widgets.news),
      },
    },
  };
}
