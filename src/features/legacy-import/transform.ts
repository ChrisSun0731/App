// Converts the previous app's saved data into data for this app's stores.
//
// The Quasar/Capacitor app (git 74fc879) saved its whole Vuex state as JSON
// under the WebView localStorage key "store" after every mutation
// (src/store/localStoragePlugin.js), and the class again under "userClass".
// Its modules were schedule, todo, news, food, youbike, metro and settings.
//
// The saved state can come from any earlier version, or from that app's old
// Firebase restore, so every slice may be missing, partial or junk. Nothing
// here throws: whatever is valid is kept, and a field is left out when there
// is nothing usable for it, which leaves this app's value alone.
import type { NewsItem } from '@/features/news/rss';
import { CELL_COLORS } from '@/features/schedule/cell-colors';
import {
  PERIOD_NAMES,
  WEEKDAYS,
  type CellColor,
  type PeriodName,
  type ScheduleCell,
  type ScheduleRow,
  type Weekday,
} from '@/features/schedule/timetable';
import { SCHOOL_EVENT_CATEGORY } from '@/features/todo/school-calendar';
import {
  DEFAULT_EVENT_CATEGORY,
  type CalendarEvent,
  type EventCategory,
  type Todo,
  type TodoCategory,
} from '@/features/todo/types';
import { STATION_LINES } from '@/features/transport/metro-lines';
import { stationDisplayName, type City } from '@/features/transport/youbike';
import { isDateKey, toDateKey } from '@/lib/dates';
import type { FollowedYoubike } from '@/store/transport';

import type { LegacyImport } from './types';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Trimmed text of a string or a finite number (old ids and classes were numbers); '' otherwise. */
const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

const flag = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

/** The first item for each key, in order. */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Drops undefined fields, or the whole object when none are left. */
function compact<T extends object>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, field]) => field !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

/** An instant from a serialised JS Date, a timestamp, or a Firestore Timestamp from the old restore. */
function toInstant(value: unknown): Date | null {
  const raw = isRecord(value) && typeof value.seconds === 'number' ? value.seconds * 1000 : value;
  if (typeof raw === 'number' || (typeof raw === 'string' && raw.trim())) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

// The old 恢復已讀訊息 (NewsPage revertDeletedNews) set the read marker to
// 2010-01-01 instead of clearing it. This app's restoreAll clears it (null),
// and only then disables that button.
const NEVER_CLEARED = Date.UTC(2010, 0, 1);

function clearedTime(value: unknown): string | undefined {
  const date = toInstant(value);
  return date && date.getTime() > NEVER_CLEARED ? date.toISOString() : undefined;
}

export interface TransformOptions {
  /**
   * Local calendar date of an instant. Defaults to the device's time zone,
   * the zone the previous app read these dates in.
   */
  dateKey?: (date: Date) => string;
}

// Event and todo dates were JS Dates at the picked day's local midnight,
// serialised in UTC ("2026-10-03T16:00:00.000Z" is 10/4 in Taipei), or at UTC
// midnight when an event was saved again unchanged; in Taipei both fall on the
// picked day.
function dateKeyOf(value: unknown, dateKey: (date: Date) => string): string | null {
  if (isDateKey(value)) return value;
  const date = toInstant(value);
  return date ? dateKey(date) : null;
}

/** "#RRGGBB" from the colour formats a Quasar colour picker or a typed value could hold. */
export function toHexColor(value: unknown): string | null {
  const color = text(value);
  const short = /^#([0-9a-f]{3})[0-9a-f]?$/i.exec(color);
  if (short) return `#${[...short[1]].map((digit) => digit + digit).join('')}`.toUpperCase();
  const long = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(color);
  if (long) return `#${long[1]}`.toUpperCase();
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+%?\s*)?\)$/i.exec(color);
  if (rgb && rgb.slice(1).every((channel) => Number(channel) <= 255)) {
    return `#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  return null;
}

// 學校事務 is reserved for the read-only school 行事曆 here (the old app also
// refused to edit events in it), so a user category of that name is renamed
// to keep its events editable.
function categoryName(value: unknown): string {
  const name = text(value);
  return name === SCHOOL_EVENT_CATEGORY.name ? `${name}（自訂）` : name;
}

function eventCategories(value: unknown): EventCategory[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const categories = uniqueBy((value as unknown[]).flatMap((item): EventCategory[] => {
    if (!isRecord(item)) return [];
    const name = categoryName(item.name);
    return name ? [{ name, color: toHexColor(item.color) ?? DEFAULT_EVENT_CATEGORY.color }] : [];
  }), (category) => category.name);
  // The old app let users delete every category; this one needs one to add events to.
  return categories.length ? categories : [{ ...DEFAULT_EVENT_CATEGORY }];
}

// Events kept their own copy of the category when saved, and the old form
// could save an empty {} when none was picked.
function eventCategory(value: unknown, known: ReadonlyMap<string, EventCategory>): EventCategory {
  const name = categoryName(isRecord(value) ? value.name : value);
  if (!name) return { ...DEFAULT_EVENT_CATEGORY };
  const color = (isRecord(value) ? toHexColor(value.color) : null) ?? known.get(name)?.color;
  return { name, color: color ?? DEFAULT_EVENT_CATEGORY.color };
}

/** Old ids were Date.now() numbers; this app's are strings. Duplicates get the fallback. */
function uniqueId(value: unknown, fallback: string, used: Set<string>): string {
  const id = text(value);
  const result = id && !used.has(id) ? id : fallback;
  used.add(result);
  return result;
}

function events(value: unknown, categories: readonly EventCategory[], dateKey: (date: Date) => string): CalendarEvent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const known = new Map(categories.map((category) => [category.name, category]));
  const ids = new Set<string>();
  return (value as unknown[]).flatMap((item, index): CalendarEvent[] => {
    if (!isRecord(item)) return [];
    const title = text(item.title);
    let startDate = dateKeyOf(item.startDate, dateKey);
    let endDate = dateKeyOf(item.endDate, dateKey) ?? startDate;
    startDate ??= endDate;
    if (!title || !startDate || !endDate) return [];
    if (endDate < startDate) [startDate, endDate] = [endDate, startDate];
    return [{
      id: uniqueId(item.id, `legacy-event-${index}`, ids),
      title,
      startDate,
      endDate,
      category: eventCategory(item.category, known),
    }];
  });
}

function todos(value: unknown, dateKey: (date: Date) => string): Todo[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = new Set<string>();
  return (value as unknown[]).flatMap((item, index): Todo[] => {
    // Checking a todo marked it completed and removed it half a second later.
    if (!isRecord(item) || item.completed === true) return [];
    const title = text(item.title);
    if (!title) return [];
    const category = text(isRecord(item.category) ? item.category.name : item.category);
    return [{
      id: uniqueId(item.id, `legacy-todo-${index}`, ids),
      title,
      // An unparseable date was saved as null by JSON.stringify, i.e. undated.
      date: dateKeyOf(item.date, dateKey),
      category: category ? { name: category } : null,
    }];
  });
}

function todoCategories(value: unknown): TodoCategory[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const names = (value as unknown[]).map((item) => text(isRecord(item) ? item.name : item)).filter(Boolean);
  return [...new Set(names)].map((name) => ({ name }));
}

// The old editor stored the chosen Quasar option itself ({label, value}) in
// the cell; older cells hold just the label. Fills are matched defensively.
const LEGACY_DEFAULT_FILL = '#f4f4f1';

function cellColor(value: unknown): CellColor {
  for (const candidate of isRecord(value) ? [value.label, value.value] : [value]) {
    const raw = text(candidate).toLowerCase();
    const option = CELL_COLORS.find((color) => color.key.toLowerCase() === raw || color.light?.toLowerCase() === raw);
    if (option) return option.key;
    if (raw === LEGACY_DEFAULT_FILL) return 'Default';
  }
  return 'Default';
}

function scheduleCell(value: unknown): ScheduleCell {
  if (typeof value === 'string') return { subject: value.trim() };
  if (!isRecord(value)) return { subject: '' };
  // The editor offered a 自訂科目名稱 field once the subject read 自訂, but kept
  // displaying 自訂; the name typed there is the one the user meant.
  const custom = text(value.customSubject);
  const cell: ScheduleCell = { subject: text(value.subject) === '自訂' && custom ? custom : text(value.subject) };
  // Kept even when the subject was overridden: getAlternating() reads a
  // subject matching neither week as the user's override, as the old app did.
  const { alternating } = value;
  if (isRecord(alternating) && typeof alternating.odd === 'string' && typeof alternating.even === 'string') {
    cell.alternating = { odd: alternating.odd, even: alternating.even };
  }
  const note = text(value.note);
  if (note) cell.note = note;
  const color = cellColor(value.color);
  if (color !== 'Default') cell.color = color;
  return cell;
}

function buildRow(name: PeriodName, cell: (day: Weekday) => ScheduleCell): ScheduleRow {
  const row = { name } as ScheduleRow;
  for (const day of WEEKDAYS) row[day] = cell(day);
  return row;
}

function periodOf(value: unknown): PeriodName | undefined {
  const name = text(value);
  return PERIOD_NAMES.find((period) => period === name) ?? (/^[1-8]$/.test(name) ? PERIOD_NAMES[Number(name) - 1] : undefined);
}

function scheduleRows(value: unknown): ScheduleRow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const byPeriod = new Map<PeriodName, ScheduleRow>();
  (value as unknown[]).forEach((raw, index) => {
    if (!isRecord(raw)) return;
    // Rows were named 一…八; anything else is placed by position.
    const period = periodOf(raw.name) ?? PERIOD_NAMES[index];
    if (period && !byPeriod.has(period)) byPeriod.set(period, buildRow(period, (day) => scheduleCell(raw[day])));
  });
  const hasContent = (cell: ScheduleCell) => !!(cell.subject || cell.alternating || cell.note || cell.color);
  // Nothing in it (the old app had not loaded a timetable yet): leave it to
  // the screens, which load the class's own.
  if (![...byPeriod.values()].some((row) => WEEKDAYS.some((day) => hasContent(row[day])))) return undefined;
  return PERIOD_NAMES.map((name) => byPeriod.get(name) ?? buildRow(name, () => ({ subject: '' })));
}

const classId = (...values: unknown[]) => values.map(text).find((id) => /^[1-9]\d*$/.test(id));

function pinnedNews(value: unknown): NewsItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return uniqueBy((value as unknown[]).flatMap((item): NewsItem[] => {
    if (!isRecord(item)) return [];
    const title = text(item.title);
    const link = text(item.link);
    const date = toInstant(item.pubDate);
    return title && /^https?:\/\//i.test(link) && date ? [{ title, link, pubDate: date.toISOString() }] : [];
  }), (item) => item.title);
}

/** Whole restaurant objects were saved; this app keeps the names, which are unique in the data. */
function favoriteNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set((value as unknown[]).map((item) => text(isRecord(item) ? item.name : item)).filter(Boolean))];
}

function cityOf(value: unknown): City | null {
  const city = text(value).replace(/^台/, '臺');
  return city === '臺北市' || city === '新北市' ? city : null;
}

/** Keyed by station id ("YouBike2.0_植物園") in the order added, which was the order shown. */
function youbikeStations(value: unknown): FollowedYoubike[] | undefined {
  if (!isRecord(value)) return undefined;
  return uniqueBy(Object.entries(value).flatMap(([key, data]): FollowedYoubike[] => {
    if (!isRecord(data)) return [];
    const sna = key.trim();
    const city = cityOf(data.city);
    return sna && city ? [{ sna, nickname: text(data.nickname) || stationDisplayName(sna), city }] : [];
  }), (station) => `${station.city}|${station.sna}`);
}

function metroStations(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  // A name missing from the line table (junk, or a renamed station) could not be shown with its lines.
  const known = (station: string) => Object.prototype.hasOwnProperty.call(STATION_LINES, station);
  return [...new Set((value as unknown[]).map(text).filter(known))];
}

function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * The previous app's data for each store. `store` is its "store" localStorage
 * value (JSON text, or already parsed) and `userClass` its "userClass" value.
 *
 * The cached news (news.fetchedNews / lastFetchTime) is not carried over: it
 * is refetched on launch and is not the user's data. Nor is the toolbar
 * (settings.menuItems): this app's tab bar is fixed.
 */
export function transformLegacyStore(store: unknown, userClass?: unknown, { dateKey = toDateKey }: TransformOptions = {}): LegacyImport {
  const parsed = parse(store);
  const state: Json = isRecord(parsed) ? parsed : {};
  const slice = (name: string): Json => {
    const value = state[name];
    return isRecord(value) ? value : {};
  };
  const [schedule, todo, news, food, youbike, metro] =
    ['schedule', 'todo', 'news', 'food', 'youbike', 'metro'].map(slice);
  const categories = eventCategories(todo.eventCategories);
  const view = todo.currentView;
  return compact<LegacyImport>({
    schedule: compact({
      // The module's value is authoritative; the separate key and the
      // top-level field of early versions are fallbacks.
      userClass: classId(schedule.userClass, userClass, state.userClass),
      rows: scheduleRows(schedule.scheduleData),
    }),
    todo: compact({
      events: events(todo.events, categories ?? [], dateKey),
      eventCategories: categories,
      todos: todos(todo.todos, dateKey),
      todoCategories: todoCategories(todo.todoCategories),
      view: view === 'calendar' || view === 'todoList' ? view : undefined,
    }),
    news: compact({
      pinned: pinnedNews(news.pinnedNews),
      lastClearedTime: clearedTime(news.lastClearedTime ?? state.lastClearedTime),
    }),
    food: compact({ favorites: favoriteNames(food.favoriteRestaurants) }),
    transport: compact({ youbike: youbikeStations(youbike.stationList), metro: metroStations(metro.metroStationList) }),
    settings: compact({
      // displayScheduleWidget has no counterpart: 今天's 現在 card is always shown.
      homeWidgets: compact({
        todo: flag(todo.displayTodoWidget),
        news: flag(news.displayNewsWidget),
      }),
    }),
  }) ?? {};
}

/** Whether the previous app left anything to import. */
export function hasLegacyData(legacy: LegacyImport): boolean {
  return Object.keys(legacy).length > 0;
}
