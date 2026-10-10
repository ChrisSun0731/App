// Pure helpers behind 熱食部: week paging, labels, image requests and fitting
// the printed dish band. Kept out of the screen to test without a renderer.
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

export const MENU_TEMPLATE = { width: 420, height: 1000 };
export const MENU_BAND = { top: 120, bottom: 758 };
export const MENU_BAND_HEIGHT = MENU_BAND.bottom - MENU_BAND.top;
export const MENU_BAND_RATIO = MENU_TEMPLATE.width / MENU_BAND_HEIGHT;
export const MENU_MAX_HEIGHT = MENU_BAND_HEIGHT;
export const MENU_PAPER = '#F8F9FA';
export const MENU_DIM = 'rgba(0,0,0,0.2)';

/** Only the known printed template has a redundant date band and blank tail. */
export function isMenuTemplate(width: number, height: number): boolean {
  return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height) && Math.abs(width / height - 0.42) <= 0.002;
}

/** Keep printed 28px dish names at least 12pt at the user's text scale. */
export function menuFitFloor(fontScale: number): number {
  return Math.ceil(MENU_BAND_HEIGHT * Math.max(11, 12 * fontScale) / 28);
}

interface Size { width: number; height: number }

/** Centre the dish band inside the card; preserve the whole sheet for unfamiliar images. */
export function menuPictureLayout(image: Size, box: Size) {
  if (![image.width, image.height, box.width, box.height].every((size) => Number.isFinite(size) && size > 0)) return null;
  const template = isMenuTemplate(image.width, image.height);
  const unit = image.height / MENU_TEMPLATE.height;
  const bandHeight = template ? MENU_BAND_HEIGHT * unit : image.height;
  const scale = Math.min(box.width / image.width, box.height / bandHeight);
  return {
    sheet: { width: image.width * scale, height: bandHeight * scale },
    picture: { width: image.width * scale, height: image.height * scale, top: template ? -MENU_BAND.top * unit * scale : 0 },
  };
}
