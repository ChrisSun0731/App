import { describe, expect, it, jest } from '@jest/globals';

import {
  DAY_OPTIONS,
  isMenuTemplate,
  menuFitFloor,
  menuPictureLayout,
  menuDayTitle,
  menuRequestUrl,
  shiftWeek,
  toMenuDay,
  weekRangeLabel,
} from './menu-view';

jest.mock('@/lib/remote-data', () => ({
  dataUrl: (path: string) => `https://raw.githubusercontent.com/CKApp-Dev/Data/main/${path}`,
}));

describe('熱食部 view helpers', () => {
  it('offers the five school days as one-character segments', () => {
    expect(DAY_OPTIONS.map((option) => option.label)).toEqual(['一', '二', '三', '四', '五']);
    expect(DAY_OPTIONS.map((option) => toMenuDay(option.value))).toEqual([1, 2, 3, 4, 5]);
  });

  it('pages whole weeks across month and year boundaries', () => {
    expect(shiftWeek('2026-10-05', 1)).toBe('2026-10-12');
    expect(shiftWeek('2026-10-05', -1)).toBe('2026-09-28');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
  });

  it('labels the week and the selected day', () => {
    expect(weekRangeLabel('2026-10-05')).toBe('10月5日–9日');
    expect(weekRangeLabel('2026-12-28')).toBe('2026年12月28日–2027年1月1日');
    expect(menuDayTitle('2026-10-05', 1)).toBe('10月5日 星期一');
    expect(menuDayTitle('2026-12-28', 5)).toBe('1月1日 星期五');
  });

  it('cache-busts the image URL only after a manual refresh', () => {
    const url = 'https://raw.githubusercontent.com/CKApp-Dev/Data/main/menus/2026-10-05_1.png';
    expect(menuRequestUrl(url, 0)).toBe(url);
    expect(menuRequestUrl(url, 1_790_000_000_000)).toBe(`${url}?refresh=1790000000000`);
  });

  it('only crops the known printed template, including higher resolution renders', () => {
    expect(isMenuTemplate(420, 1000)).toBe(true);
    expect(isMenuTemplate(840, 2000)).toBe(true);
    expect(isMenuTemplate(419, 1017)).toBe(false);
    expect(isMenuTemplate(580, 1393)).toBe(false);
    expect(isMenuTemplate(881, 2413)).toBe(false);
    expect(isMenuTemplate(0, 0)).toBe(false);
  });

  it('keeps printed text readable as the system text size grows', () => {
    expect(menuFitFloor(1)).toBe(274);
    expect(menuFitFloor(0.823)).toBe(251);
    expect(menuFitFloor(1.353)).toBe(370);
  });

  it('centres all eight dishes in the available card without the repeated date band', () => {
    const layout = menuPictureLayout({ width: 420, height: 1000 }, { width: 353, height: 450 })!;
    expect(layout.sheet.width).toBeCloseTo(296.238);
    expect(layout.sheet.height).toBe(450);
    expect(layout.picture.height).toBeCloseTo(705.329);
    expect(layout.picture.top).toBeCloseTo(-84.639);
    expect(menuPictureLayout({ width: 840, height: 2000 }, { width: 353, height: 450 })).toEqual(layout);
  });

  it('preserves unfamiliar images whole and waits for usable layout dimensions', () => {
    const layout = menuPictureLayout({ width: 419, height: 1017 }, { width: 380, height: 507 })!;
    expect(layout.sheet.width).toBeCloseTo(208.882);
    expect(layout.sheet.height).toBe(507);
    expect(layout.picture.top).toBe(0);
    expect(menuPictureLayout({ width: 420, height: 1000 }, { width: 0, height: 0 })).toBeNull();
    expect(menuPictureLayout({ width: Number.NaN, height: 1000 }, { width: 380, height: 507 })).toBeNull();
  });
});
