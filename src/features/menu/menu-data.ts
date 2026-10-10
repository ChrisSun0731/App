// 熱食部's dishes as data: the Data repo's menus/<Monday>.json, written next to
// the day images by its update_menu.py from the cafeteria's weekly sheet. A
// week without that file (published before it existed, or not readable yet)
// falls back to the day's image.
import { addDays, fromDateKey, isDateKey, toDateKey } from '@/lib/dates';

import type { MenuDay } from './menu-week';

export interface MenuItem {
  /** The sheet's 項次, from 1. */
  number: number;
  name: string;
  /** NT$; the sheet's own text when it is not a number (時價…); null when it has none. */
  price: number | string | null;
}

export interface MenuWeek {
  /** The week's Monday, "YYYY-MM-DD". */
  week: string;
  /** Monday to Friday: each day's date and dishes (none: no menu that day). */
  days: { date: string; items: MenuItem[] }[];
}

/** The printed menu rules a line under the rice dishes (項次 1–5); noodles and sets follow. */
const RICE_DISHES = 5;

function isMenuItem(value: unknown): value is MenuItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.number === 'number' &&
    Number.isInteger(item.number) &&
    item.number >= 1 &&
    typeof item.name === 'string' &&
    item.name.trim() !== '' &&
    (item.price === null || typeof item.price === 'string' || (typeof item.price === 'number' && Number.isFinite(item.price)))
  );
}

export function isMenuWeek(value: unknown): value is MenuWeek {
  if (typeof value !== 'object' || value === null) return false;
  const week = value as Record<string, unknown>;
  return (
    isDateKey(week.week) &&
    Array.isArray(week.days) &&
    week.days.every((day: unknown) => {
      if (typeof day !== 'object' || day === null) return false;
      const { date, items } = day as Record<string, unknown>;
      return isDateKey(date) && Array.isArray(items) && items.every(isMenuItem);
    })
  );
}

/** The dishes of `day` (1 = Monday) in 項次 order; none when the file has no menu for it. */
export function menuItems(week: MenuWeek, day: MenuDay): MenuItem[] {
  const date = toDateKey(addDays(fromDateKey(week.week), day - 1));
  const items = week.days.find((entry) => entry.date === date)?.items ?? [];
  return [...items].sort((a, b) => a.number - b.number);
}

/** The rice dishes and the rest, as the printed menu divides them; an empty group is left out. */
export function menuGroups(items: readonly MenuItem[]): MenuItem[][] {
  return [items.filter((item) => item.number <= RICE_DISHES), items.filter((item) => item.number > RICE_DISHES)].filter(
    (group) => group.length > 0,
  );
}

/** "$120"; the sheet's text as it is; '' without a price. */
export function formatPrice(price: MenuItem['price']): string {
  if (price === null) return '';
  return typeof price === 'number' ? `$${price}` : price.trim();
}

/** What VoiceOver and TalkBack read, e.g. "1，雞腿飯，120 元". */
export function menuItemLabel(item: MenuItem): string {
  const price = typeof item.price === 'number' ? `${item.price} 元` : formatPrice(item.price);
  return [String(item.number), item.name, price].filter(Boolean).join('，');
}
