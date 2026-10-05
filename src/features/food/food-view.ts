// What 美食 and the /restaurant detail modal show, as pure functions so the
// screens stay declarative and this stays unit-tested: filtering, the status
// line and dot colour, the random pick, the weekly hours and the links.
import {
  DAY_LABELS,
  DISPLAY_DAY_ORDER,
  dayKeyOf,
  getOpenStatus,
  hoursLines,
  isOpenNow,
  STATUS_LABELS,
  type DayKey,
  type OpenStatus,
  type Restaurant,
} from './opening-hours';

/**
 * Status colours for the list dots and the map pins. They are data (the map
 * legend names them), so they stay the same in light and dark mode; the
 * status text always accompanies them.
 */
export const STATUS_COLORS: Record<OpenStatus, string> = {
  open: '#1B873F',
  closingSoon: '#C77800',
  openingSoon: '#2965B3',
  closed: '#777777',
};

export const STATUS_LEGEND = '綠色：營業中　橘色：即將打烊　藍色：即將開業　灰色：已打烊';

export type FoodFilterKey = 'open' | 'favorites';

export interface FoodFilters {
  query: string;
  openOnly: boolean;
  favoritesOnly: boolean;
}

export const FILTER_LABELS: Record<FoodFilterKey, string> = {
  open: '正在營業',
  favorites: '我的最愛',
};

/** Name search (case-insensitive) plus the 正在營業 / 我的最愛 filters, in data order. */
export function filterRestaurants(
  restaurants: readonly Restaurant[],
  { query, openOnly, favoritesOnly }: FoodFilters,
  favorites: readonly string[],
  now: Date,
): Restaurant[] {
  const needle = query.trim().toLocaleLowerCase();
  return restaurants.filter((restaurant) =>
    (!needle || restaurant.name.toLocaleLowerCase().includes(needle)) &&
    (!openOnly || isOpenNow(restaurant.openingHours, now)) &&
    (!favoritesOnly || favorites.includes(restaurant.name)),
  );
}

export interface RestaurantSummary {
  status: OpenStatus;
  statusLabel: string;
  color: string;
  /** Today's hours, e.g. 06:00-14:00、16:30-19:30 (or 休息). */
  todayHours: string;
  /** 正在營業 · 今日 06:00-14:00、16:30-19:30 */
  subtitle: string;
}

export function summarize(restaurant: Restaurant, now: Date): RestaurantSummary {
  const status = getOpenStatus(restaurant.openingHours, now);
  const todayHours = hoursLines(restaurant.openingHours[dayKeyOf(now)]).join('、');
  return {
    status,
    statusLabel: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    todayHours,
    subtitle: `${STATUS_LABELS[status]} · 今日 ${todayHours}`,
  };
}

/** A random restaurant that is open now (closing soon counts), or null when none is. */
export function pickRandomOpen(
  restaurants: readonly Restaurant[],
  now: Date,
  random: () => number = Math.random,
): Restaurant | null {
  const open = restaurants.filter((restaurant) => isOpenNow(restaurant.openingHours, now));
  if (!open.length) return null;
  // Math.random() is below 1, but a custom source returning 1 must not overrun.
  return open[Math.min(open.length - 1, Math.floor(random() * open.length))];
}

export interface DayHours {
  day: DayKey;
  /** 星期一 */
  label: string;
  /** One line per opening range. */
  hours: string;
  today: boolean;
}

/** Monday to Sunday, as the detail modal lists them, with today marked. */
export function weeklyHours(restaurant: Restaurant, now: Date): DayHours[] {
  const today = dayKeyOf(now);
  return DISPLAY_DAY_ORDER.map((day) => ({
    day,
    label: DAY_LABELS[day],
    hours: hoursLines(restaurant.openingHours[day]).join('\n'),
    today: day === today,
  }));
}

/** The street address, or the coordinates when the listing has none. */
export function addressText(restaurant: Restaurant): string {
  if (typeof restaurant.address === 'string' && restaurant.address.trim()) return restaurant.address;
  return `位置：${restaurant.position[0]}, ${restaurant.position[1]}`;
}

/** A Google Maps search for the coordinates: the Maps app if installed, else the browser. */
export function mapsUrl([latitude, longitude]: Restaurant['position']): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/** The website only when it is an http(s) link; anything else in the data is not opened. */
export function websiteUrl(website: unknown): string | null {
  return typeof website === 'string' && /^https?:\/\//i.test(website) ? website : null;
}

/** Restaurant names are unique in restaurantData.json, so the name is the route key. */
export function findRestaurant(restaurants: readonly Restaurant[] | undefined, name: string | undefined) {
  if (!restaurants || !name) return undefined;
  return restaurants.find((restaurant) => restaurant.name === name);
}
