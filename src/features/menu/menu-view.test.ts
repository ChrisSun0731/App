import { describe, expect, it, jest } from '@jest/globals';

import {
  DAY_OPTIONS,
  FALLBACK_ASPECT_RATIO,
  imageAspectRatio,
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
    expect(weekRangeLabel('2026-10-05')).toBe('10/5 (一) — 10/9 (五)');
    expect(weekRangeLabel('2026-12-28')).toBe('12/28 (一) — 1/1 (五)');
    expect(menuDayTitle('2026-10-05', 1)).toBe('2026/10/5 星期一');
    expect(menuDayTitle('2026-12-28', 5)).toBe('2027/1/1 星期五');
  });

  it('cache-busts the image URL only after a manual refresh', () => {
    const url = 'https://raw.githubusercontent.com/CKApp-Dev/Data/main/menus/2026-10-05_1.png';
    expect(menuRequestUrl(url, 0)).toBe(url);
    expect(menuRequestUrl(url, 1_790_000_000_000)).toBe(`${url}?refresh=1790000000000`);
  });

  it('uses the image’s own aspect ratio, falling back for unusable sizes', () => {
    expect(imageAspectRatio(420, 1000)).toBeCloseTo(0.42);
    expect(imageAspectRatio(0, 1000)).toBe(FALLBACK_ASPECT_RATIO);
    expect(imageAspectRatio(420, 0)).toBe(FALLBACK_ASPECT_RATIO);
    expect(imageAspectRatio(Number.NaN, 1000)).toBe(FALLBACK_ASPECT_RATIO);
  });
});
