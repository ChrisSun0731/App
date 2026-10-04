import { describe, expect, it } from '@jest/globals';

import { getOpenStatus, isRestaurantList, parseRanges } from './opening-hours';

describe('restaurant data and hours', () => {
  const restaurant = {
    name: '建中餐廳',
    position: [25.03, 121.51],
    openingHours: { monday: '11:00-14:00,17:00-20:00' },
  };

  it('accepts a usable listing and rejects coordinates or hours that could break the map', () => {
    expect(isRestaurantList([restaurant])).toBe(true);
    expect(isRestaurantList([{ ...restaurant, position: ['25.03', 121.51] }])).toBe(false);
    expect(isRestaurantList([{ ...restaurant, position: [91, 121.51] }])).toBe(false);
    expect(isRestaurantList([{ ...restaurant, position: [25.03, Infinity] }])).toBe(false);
    expect(isRestaurantList([{ ...restaurant, openingHours: null }])).toBe(false);
    expect(isRestaurantList([{ ...restaurant, openingHours: { monday: 11 } }])).toBe(false);
  });

  it('keeps yesterday’s overnight restaurant open after midnight', () => {
    const hours = { monday: '22:00-02:00', tuesday: '休息' };
    expect(getOpenStatus(hours, new Date(2026, 9, 6, 1, 0))).toBe('open');
    expect(getOpenStatus(hours, new Date(2026, 9, 6, 1, 30))).toBe('closingSoon');
    expect(getOpenStatus(hours, new Date(2026, 9, 6, 2, 0))).toBe('closed');
  });

  it('respects split shifts and the opening-soon boundary', () => {
    const hours = { monday: '11:00-14:00,17:00-20:00' };
    expect(getOpenStatus(hours, new Date(2026, 9, 5, 14, 0))).toBe('closed');
    expect(getOpenStatus(hours, new Date(2026, 9, 5, 16, 29))).toBe('closed');
    expect(getOpenStatus(hours, new Date(2026, 9, 5, 16, 30))).toBe('openingSoon');
    expect(parseRanges('22:00-26:00')).toEqual(parseRanges('22:00-02:00'));
  });
});
