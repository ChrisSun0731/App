// 熱食部 menu images live in the Data repo's menus/ folder, one PNG per school
// day, named after that week's Monday plus the weekday: 2025-09-11 (a
// Thursday) is menus/2025-09-08_4.png.
import { addDays, startOfWeekMonday, toDateKey } from '@/lib/dates';
import { dataUrl } from '@/lib/remote-data';

export type MenuDay = 1 | 2 | 3 | 4 | 5;

export const MENU_DAYS: readonly { day: MenuDay; label: string }[] = [
  { day: 1, label: '星期一' },
  { day: 2, label: '星期二' },
  { day: 3, label: '星期三' },
  { day: 4, label: '星期四' },
  { day: 5, label: '星期五' },
];

/**
 * Monday ("YYYY-MM-DD") of the menu week shown on `date`. On weekends the
 * coming week's menu is shown.
 *
 * The Quasar app formatted this with toISOString(), i.e. in UTC, so before
 * 08:00 in Taipei it named the previous day (a Sunday) and the Data repo had
 * to publish every menu under both dates. This is the local date.
 */
export function menuWeekStart(date: Date): string {
  const day = date.getDay();
  const reference = day === 6 ? addDays(date, 2) : day === 0 ? addDays(date, 1) : date;
  return toDateKey(startOfWeekMonday(reference));
}

/** The weekday selected on open: today, or Monday on weekends. */
export function defaultMenuDay(date: Date): MenuDay {
  const day = date.getDay();
  return day >= 1 && day <= 5 ? (day as MenuDay) : 1;
}

export function menuImageUrl(weekStart: string, day: MenuDay): string {
  return dataUrl(`menus/${weekStart}_${day}.png`);
}

/** The week's dishes as data (menu-data.ts), e.g. menus/2025-09-08.json. */
export function menuDataPath(weekStart: string): string {
  return `menus/${weekStart}.json`;
}
