import { describe, expect, it } from '@jest/globals';

import {
  addressText,
  distanceLabel,
  metresFromSchool,
  openNearSchool,
  shortName,
  splitName,
  filterRestaurants,
  findRestaurant,
  mapsUrl,
  pickRandomOpen,
  statusLine,
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

  it('says briefly when the status next changes', () => {
    expect(statusLine(noodles, mondayNoon)).toEqual({ text: '營業中 · 至 14:00', color: '#1B873F' });
    expect(statusLine(cafe, mondayNoon).text).toBe('快打烊 · 12:20');
    expect(statusLine(nightMarket, new Date(2026, 9, 5, 16, 45)).text).toBe('快開門 · 17:00');
    expect(statusLine(noodles, new Date(2026, 9, 5, 15, 0)).text).toBe('休息中 · 16:30 開');
    expect(statusLine(noodles, new Date(2026, 9, 5, 20, 0)).text).toBe('休息中');
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

describe('names and distances', () => {
  it('splits the bracketed nickname or branch off a name', () => {
    expect(splitName('林家乾麵(林乾)')).toEqual({ name: '林家乾麵', aside: '林乾' });
    expect(splitName('呷尚寶（泉州店）')).toEqual({ name: '呷尚寶', aside: '泉州店' });
    expect(splitName('烤上台大')).toEqual({ name: '烤上台大', aside: null });
  });

  it('calls a place by its nickname, but a branch by the name', () => {
    expect(shortName('廣東小吃(廣炒)')).toBe('廣炒');
    expect(shortName('Q Burger(中正寧波店)')).toBe('Q Burger');
    expect(shortName('烤上台大')).toBe('烤上台大');
  });

  it('measures from the school gate and rounds for display', () => {
    expect(metresFromSchool([25.031204, 121.515966])).toBe(0);
    expect(distanceLabel(147)).toBe('150 m');
    expect(distanceLabel(1240)).toBe('1.2 km');
  });

  it('lists open places nearest first', () => {
    const near: Restaurant = { ...noodles, name: '近', position: [25.0312, 121.5158] };
    const far: Restaurant = { ...noodles, name: '遠', position: [25.04, 121.53] };
    const closed: Restaurant = { ...noodles, name: '休息', position: [25.0312, 121.516], openingHours: { monday: '休息' } };
    expect(openNearSchool([far, closed, near], mondayNoon).map((restaurant) => restaurant.name)).toEqual(['近', '遠']);
  });
});
