import { describe, expect, it, jest } from '@jest/globals';

import { defaultMenuDay, menuImageUrl, menuWeekStart } from './menu-week';

jest.mock('@/lib/remote-data', () => ({
  dataUrl: (path: string) => `https://raw.githubusercontent.com/CKApp-Dev/Data/main/${path}`,
}));

describe('cafeteria menu dates', () => {
  it('uses local Monday before 08:00 and selects the next week on weekends', () => {
    expect(menuWeekStart(new Date(2026, 9, 5, 1, 0))).toBe('2026-10-05');
    expect(menuWeekStart(new Date(2026, 9, 10, 18, 0))).toBe('2026-10-12');
    expect(menuWeekStart(new Date(2026, 9, 11, 1, 0))).toBe('2026-10-12');
    expect(defaultMenuDay(new Date(2026, 9, 11))).toBe(1);
    expect(defaultMenuDay(new Date(2026, 9, 8))).toBe(4);
  });

  it('names each image from the week’s Monday and selected school day', () => {
    expect(menuImageUrl('2026-10-05', 4)).toBe('https://raw.githubusercontent.com/CKApp-Dev/Data/main/menus/2026-10-05_4.png');
  });
});
