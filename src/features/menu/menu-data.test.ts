import { describe, expect, test } from '@jest/globals';

import { formatPrice, isMenuWeek, menuGroups, menuItemLabel, menuItems, type MenuWeek } from './menu-data';

// The week of 2026-10-05, as the Data repo writes it (Thursday's dishes from its menu image).
const WEEK: MenuWeek = {
  week: '2026-10-05',
  days: [
    { date: '2026-10-05', items: [] },
    { date: '2026-10-06', items: [{ number: 1, name: '雞腿飯', price: 120 }] },
    { date: '2026-10-07', items: [] },
    {
      date: '2026-10-08',
      items: [
        { number: 6, name: '滷味燙套餐', price: 80 },
        { number: 1, name: '雞腿飯', price: 120 },
        { number: 2, name: '宮保雞丁', price: 85 },
        { number: 3, name: '直火烤肉', price: 85 },
        { number: 4, name: '馬鈴薯燉肉', price: 85 },
        { number: 5, name: '南洋炒飯', price: 80 },
        { number: 7, name: '什錦烏龍麵', price: 80 },
        { number: 8, name: '招牌炸醬麵', price: '時價' },
      ],
    },
  ],
};

// What the Data repo's save_menu_json writes (scripts/menu_visualizer.py), verbatim.
const WRITTEN = JSON.parse(`{
  "week": "2026-10-12",
  "days": [
    { "date": "2026-10-12", "items": [{ "number": 1, "name": "雞腿飯", "price": 120 }, { "number": 2, "name": "辣子雞丁", "price": 85 }] },
    { "date": "2026-10-13", "items": [] },
    { "date": "2026-10-14", "items": [{ "number": 1, "name": "雞腿飯", "price": "時價" }, { "number": 2, "name": "例湯", "price": null }] },
    { "date": "2026-10-15", "items": [] },
    { "date": "2026-10-16", "items": [] }
  ]
}`);

describe('the week file', () => {
  test('accepts the Data repo\'s shape and nothing else', () => {
    expect(isMenuWeek(WEEK)).toBe(true);
    expect(isMenuWeek(WRITTEN)).toBe(true);
    expect(menuItems(WRITTEN, 3).map(menuItemLabel)).toEqual(['1，雞腿飯，時價', '2，例湯']);
    expect(isMenuWeek({ ...WEEK, days: [{ date: '2026-10-05', items: [{ number: 1, name: '雞腿飯', price: null }] }] })).toBe(true);
    // raw.githubusercontent's error page, and broken files.
    expect(isMenuWeek('404: Not Found')).toBe(false);
    expect(isMenuWeek(null)).toBe(false);
    expect(isMenuWeek({ ...WEEK, week: '10/5' })).toBe(false);
    expect(isMenuWeek({ ...WEEK, days: [{ date: '2026-10-05' }] })).toBe(false);
    expect(isMenuWeek({ ...WEEK, days: [{ date: '2026-10-05', items: [{ number: 0, name: '雞腿飯', price: 120 }] }] })).toBe(false);
    expect(isMenuWeek({ ...WEEK, days: [{ date: '2026-10-05', items: [{ number: 1, name: ' ', price: 120 }] }] })).toBe(false);
    expect(isMenuWeek({ ...WEEK, days: [{ date: '2026-10-05', items: [{ number: 1, name: '雞腿飯', price: true }] }] })).toBe(false);
  });

  test('gives a day its dishes in 項次 order; a day without any, or missing from the file, has none', () => {
    expect(menuItems(WEEK, 4).map((item) => item.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(menuItems(WEEK, 1)).toEqual([]);
    // Friday is not in the file.
    expect(menuItems(WEEK, 5)).toEqual([]);
  });
});

describe('a dish', () => {
  test('the rice dishes, then the rest, as the printed menu rules them off', () => {
    const groups = menuGroups(menuItems(WEEK, 4));
    expect(groups.map((group) => group.map((item) => item.number))).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8],
    ]);
    // A day with only rice dishes is one group.
    expect(menuGroups(menuItems(WEEK, 2))).toHaveLength(1);
    expect(menuGroups([])).toEqual([]);
  });

  test('its price as printed, and as read aloud', () => {
    expect(formatPrice(120)).toBe('$120');
    expect(formatPrice(' 時價 ')).toBe('時價');
    expect(formatPrice(null)).toBe('');
    expect(menuItemLabel({ number: 1, name: '雞腿飯', price: 120 })).toBe('1，雞腿飯，120 元');
    expect(menuItemLabel({ number: 8, name: '招牌炸醬麵', price: '時價' })).toBe('8，招牌炸醬麵，時價');
    expect(menuItemLabel({ number: 9, name: '例湯', price: null })).toBe('9，例湯');
  });
});
