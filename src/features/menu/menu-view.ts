// Pure helpers behind the 熱食部 screen: week paging, the segmented weekday
// options, section titles, the cache-busting image URL and the image's aspect
// ratio. Kept out of the screen so they can be unit tested without a renderer.
import { addDays, formatMonthDayRange, formatMonthDayZh, fromDateKey, toDateKey } from '@/lib/dates';
import type { ChoiceOption } from '@/ui/types';

import { MENU_DAYS, type MenuDay } from './menu-week';

/** A MenuDay as the segmented picker's string value. */
export type MenuDayValue = `${MenuDay}`;

/** 一 二 三 四 五, for the segmented weekday picker. */
export const DAY_OPTIONS: readonly ChoiceOption<MenuDayValue>[] = MENU_DAYS.map(({ day, label }) => ({
  label: label.slice(-1),
  value: `${day}`,
}));

export function toMenuDay(value: MenuDayValue): MenuDay {
  return Number(value) as MenuDay;
}

/** The Monday `weeks` weeks before (negative) or after `weekStart`. */
export function shiftWeek(weekStart: string, weeks: number): string {
  return toDateKey(addDays(fromDateKey(weekStart), weeks * 7));
}

/** e.g. "10月5日–9日". */
export function weekRangeLabel(weekStart: string): string {
  const monday = fromDateKey(weekStart);
  return formatMonthDayRange(monday, addDays(monday, 4));
}

/** The selected school day, e.g. "10月8日 星期四". */
export function menuDayTitle(weekStart: string, day: MenuDay): string {
  const date = addDays(fromDateKey(weekStart), day - 1);
  return `${formatMonthDayZh(date)} ${MENU_DAYS[day - 1].label}`;
}

/**
 * The image URL actually requested. After a manual refresh every request
 * carries `?refresh=<revision>`, so neither the image cache nor a CDN can hand
 * back a menu that was replaced in the Data repo.
 */
export function menuRequestUrl(url: string, revision: number): string {
  return revision ? `${url}?refresh=${revision}` : url;
}

/** Portrait A4-ish; only used if the image reports no usable size. */
export const FALLBACK_ASPECT_RATIO = 0.7;

/** width / height of the loaded menu image. */
export function imageAspectRatio(width: number, height: number): number {
  const ratio = width / height;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : FALLBACK_ASPECT_RATIO;
}
