import { describe, expect, it } from '@jest/globals';

import {
  activeFilterLabels,
  addressText,
  filterRestaurants,
  findRestaurant,
  mapHeight,
  mapsUrl,
  pickRandomOpen,
  resultsTitle,
  summarize,
  websiteUrl,
  weeklyHours,
} from './food-view';
import type { Restaurant } from './opening-hours';

/** October 2026: the 5th is a Monday. */
const mondayNoon = new Date(2026, 9, 5, 12, 0);

const noodles: Restaurant = {
  name: '林家乾麵(林乾)',
  position: [25.030181, 121.51412],
  openingHours: { monday: '06:00-14:00,16:30-19:30', tuesday: '休息' },
};
const nightMarket: Restaurant = {
  name: 'Night Bistro',
  position: [25.03, 121.515],
  openingHours: { monday: '17:00-01:00' },
  address: '臺北市中正區南海路56號',
  website: 'https://example.com',
};
const cafe: Restaurant = {
  name: '建中咖啡',
  position: [25.031, 121.512],
  openingHours: { monday: '11:00-12:20' },
};
const all = [noodles, nightMarket, cafe];
const noFilters = { query: '', openOnly: false, favoritesOnly: false };

describe('美食 list', () => {
  it('searches names case-insensitively and ignores surrounding spaces', () => {
    expect(filterRestaurants(all, { ...noFilters, query: '  night ' }, [], mondayNoon)).toEqual([nightMarket]);
    expect(filterRestaurants(all, { ...noFilters, query: '乾麵' }, [], mondayNoon)).toEqual([noodles]);
    expect(filterRestaurants(all, noFilters, [], mondayNoon)).toEqual(all);
  });

  it('combines the open-now and favourites filters, counting closing-soon as open', () => {
    expect(filterRestaurants(all, { ...noFilters, openOnly: true }, [], mondayNoon)).toEqual([noodles, cafe]);
    expect(filterRestaurants(all, { ...noFilters, favoritesOnly: true }, [cafe.name], mondayNoon)).toEqual([cafe]);
    expect(filterRestaurants(all, { query: '', openOnly: true, favoritesOnly: true }, [nightMarket.name], mondayNoon))
      .toEqual([]);
  });

  it('titles the results with the filters in use', () => {
    expect(activeFilterLabels({ openOnly: false, favoritesOnly: false })).toEqual([]);
    expect(activeFilterLabels({ openOnly: true, favoritesOnly: true })).toEqual(['正在營業', '我的最愛']);
    expect(activeFilterLabels({ openOnly: false, favoritesOnly: true })).toEqual(['我的最愛']);
    expect(resultsTitle(89)).toBe('89 間餐廳');
    expect(resultsTitle(89, [])).toBe('89 間餐廳');
    expect(resultsTitle(3, ['正在營業'])).toBe('3 間餐廳 · 篩選：正在營業');
    expect(resultsTitle(1, ['正在營業', '我的最愛'])).toBe('1 間餐廳 · 篩選：正在營業、我的最愛');
  });

  it('describes the status and today’s hours on one line', () => {
    expect(summarize(noodles, mondayNoon)).toEqual({
      status: 'open',
      statusLabel: '正在營業',
      color: '#1B873F',
      todayHours: '06:00-14:00、16:30-19:30',
      subtitle: '正在營業 · 今日 06:00-14:00、16:30-19:30',
    });
    expect(summarize(cafe, mondayNoon).subtitle).toBe('即將打烊 · 今日 11:00-12:20');
    expect(summarize(nightMarket, new Date(2026, 9, 5, 16, 45)).statusLabel).toBe('即將開業');
    // A day missing from the data reads as a day off.
    expect(summarize(noodles, new Date(2026, 9, 7, 12, 0)).subtitle).toBe('已打烊 · 今日 休息');
  });

  it('picks only open restaurants at random, or none', () => {
    expect(pickRandomOpen(all, mondayNoon, () => 0)).toBe(noodles);
    expect(pickRandomOpen(all, mondayNoon, () => 0.99)).toBe(cafe);
    expect(pickRandomOpen(all, mondayNoon, () => 1)).toBe(cafe);
    expect(pickRandomOpen(all, new Date(2026, 9, 6, 12, 0))).toBeNull();
    expect(pickRandomOpen([], mondayNoon)).toBeNull();
  });
});

describe('/restaurant detail', () => {
  it('lists Monday to Sunday with one line per range and today marked', () => {
    const week = weeklyHours(noodles, mondayNoon);
    expect(week.map((day) => day.label)).toEqual(['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']);
    expect(week[0]).toEqual({ day: 'monday', label: '星期一', hours: '06:00-14:00\n16:30-19:30', today: true });
    expect(week[1].hours).toBe('休息');
    expect(week.filter((day) => day.today)).toHaveLength(1);
  });

  it('falls back to coordinates without an address', () => {
    expect(addressText(nightMarket)).toBe('臺北市中正區南海路56號');
    expect(addressText(noodles)).toBe('位置：25.030181, 121.51412');
    expect(addressText({ ...noodles, address: '  ' })).toBe('位置：25.030181, 121.51412');
  });

  it('opens maps by coordinates and only http(s) websites', () => {
    expect(mapsUrl(noodles.position)).toBe('https://www.google.com/maps/search/?api=1&query=25.030181,121.51412');
    expect(websiteUrl('https://example.com')).toBe('https://example.com');
    expect(websiteUrl('HTTP://example.com')).toBe('HTTP://example.com');
    for (const unsafe of ['javascript:alert(1)', 'tel:0223034381', 'example.com', '', undefined, 42]) {
      expect(websiteUrl(unsafe)).toBeNull();
    }
  });

  it('finds a restaurant by its exact name', () => {
    expect(findRestaurant(all, '建中咖啡')).toBe(cafe);
    expect(findRestaurant(all, '建中')).toBeUndefined();
    expect(findRestaurant(undefined, '建中咖啡')).toBeUndefined();
    expect(findRestaurant(all, undefined)).toBeUndefined();
  });
});

describe('美食 map height', () => {
  it('takes about half of the visible list area in portrait', () => {
    // iPhone 15: 852pt window, ~155pt header with the search field, 83pt tab bar.
    expect(mapHeight(852 - 155 - 83)).toBe(307);
  });

  it('leaves the list header and a row in view on short screens', () => {
    // A phone in landscape: ~260pt between the header and the tab bar.
    expect(mapHeight(260)).toBe(120);
    expect(mapHeight(320)).toBe(160);
    expect(mapHeight(320)).toBeLessThanOrEqual(320 - 150);
  });

  it('never drops below a usable map', () => {
    expect(mapHeight(100)).toBe(120);
  });
});
