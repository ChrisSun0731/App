// What 美食 and the /restaurant detail modal show, as pure functions so the
// screens stay declarative and this stays unit-tested: filtering, the status
// line and dot colour, the random pick, the weekly hours and the links.
import { CK_COORDINATE, distanceKm } from '@/features/transport/youbike';

import {
  DAY_LABELS,
  DISPLAY_DAY_ORDER,
  dayKeyOf,
  getOpenStatus,
  hoursLines,
  isOpenNow,
  nextChange,
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
  open: '營業中',
  favorites: '我的最愛',
};

/** The list's short status words. */
const SHORT_STATUS: Record<OpenStatus, string> = {
  open: '營業中',
  closingSoon: '快打烊',
  openingSoon: '快開門',
  closed: '休息中',
};

const clockOf = (minutes: number) => {
  const day = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(day / 60)).padStart(2, '0')}:${String(day % 60).padStart(2, '0')}`;
};

/**
 * A list row's status, e.g. 營業中 · 至 13:30, 快打烊 · 13:00, 快開門 · 17:00,
 * 休息中 · 明天 06:00, with the status's dot colour.
 */
export function statusLine(restaurant: Restaurant, now: Date): { text: string; color: string } {
  const status = getOpenStatus(restaurant.openingHours, now);
  const at = nextChange(restaurant.openingHours, now);
  let time = '';
  if (at !== null) {
    if (status === 'open') time = `至 ${clockOf(at)}`;
    else if (status === 'closed') time = at >= 1440 ? `明天 ${clockOf(at)}` : `${clockOf(at)} 開`;
    else time = clockOf(at);
  }
  return { text: [SHORT_STATUS[status], time].filter(Boolean).join(' · '), color: STATUS_COLORS[status] };
}

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

/**
 * The bracketed part of a name, which is a nickname (林家乾麵(林乾)) or a
 * branch (呷尚寶(泉州店)), split off; `aside` is null when there is none.
 */
export function splitName(full: string): { name: string; aside: string | null } {
  const match = /^(.+?)\s*[（(]([^（）()]+)[)）]\s*$/.exec(full.trim());
  return match ? { name: match[1].trim(), aside: match[2].trim() } : { name: full.trim(), aside: null };
}

/** What students call a place: its nickname (林乾) when the brackets hold one rather than a branch (…店). */
export function shortName(full: string): string {
  const { name, aside } = splitName(full);
  return aside && !aside.endsWith('店') ? aside : name;
}

/** Straight-line distance from the school's east gate (CK_COORDINATE), in metres. */
export function metresFromSchool([latitude, longitude]: Restaurant['position']): number {
  return Math.round(distanceKm(CK_COORDINATE.latitude, CK_COORDINATE.longitude, latitude, longitude) * 1000);
}

/** e.g. 150 m (to the nearest 10 m), 1.2 km. */
export function distanceLabel(metres: number): string {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** The restaurants open at `now` (closing soon counts), nearest the school first. */
export function openNearSchool(restaurants: readonly Restaurant[], now: Date): Restaurant[] {
  return restaurants
    .filter((restaurant) => isOpenNow(restaurant.openingHours, now))
    .map((restaurant) => ({ restaurant, metres: metresFromSchool(restaurant.position) }))
    .sort((a, b) => a.metres - b.metres)
    .map(({ restaurant }) => restaurant);
}
