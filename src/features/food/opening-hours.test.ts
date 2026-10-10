import { describe, expect, it } from '@jest/globals';

import { DAY_KEYS, getOpenStatus, isOpenNow, isRestaurantList, parseRanges, type OpeningHours } from './opening-hours';

/** October 2026: the 4th is a Sunday, the 5th a Monday ... the 10th a Saturday. */
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const everyDay = (hours: string): OpeningHours => Object.fromEntries(DAY_KEYS.map((key) => [key, hours]));

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

  it('parses 24:00 and full-day, overnight and junk ranges', () => {
    expect(parseRanges('00:00-24:00')).toEqual([{ open: 0, close: 1440 }]);
    expect(parseRanges('00:00-03:00,11:00-24:00')).toEqual([{ open: 0, close: 180 }, { open: 660, close: 1440 }]);
    expect(parseRanges('17:00-01:00')).toEqual([{ open: 1020, close: 1500 }]);
    expect(parseRanges('11:00–14:00')).toEqual([{ open: 660, close: 840 }]);
    expect(parseRanges('休息')).toEqual([]);
    expect(parseRanges(undefined)).toEqual([]);
    // Zero-length, opening after midnight, longer than a day, or not a time.
    for (const junk of ['10:00-10:00', '24:00-02:00', '10:00-35:00', '10:00', '10:00-12:60', 'abc']) {
      expect(parseRanges(junk)).toEqual([]);
    }
  });

  it('never reports a 24-hour shop as closing or closed', () => {
    const hours = everyDay('00:00-24:00');
    for (const [hour, minute] of [[0, 0], [0, 10], [12, 0], [23, 30], [23, 45], [23, 59]]) {
      expect(getOpenStatus(hours, at(5, hour, minute))).toBe('open');
    }
  });

  it('treats a range ending at 24:00 and the next day’s 00:00 range as one opening', () => {
    // As in restaurantData.json: open 11:00 until 03:00 the next morning.
    const hours = everyDay('00:00-03:00,11:00-24:00');
    expect(getOpenStatus(hours, at(5, 23, 30))).toBe('open');
    expect(getOpenStatus(hours, at(5, 23, 59))).toBe('open');
    expect(getOpenStatus(hours, at(6, 2, 29))).toBe('open');
    expect(getOpenStatus(hours, at(6, 2, 30))).toBe('closingSoon');
    expect(getOpenStatus(hours, at(6, 3, 0))).toBe('closed');
    expect(getOpenStatus(hours, at(6, 10, 30))).toBe('openingSoon');
    // Closed the next day, so it really does close at midnight.
    const beforeDayOff = { ...hours, tuesday: '休息' };
    expect(getOpenStatus(beforeDayOff, at(5, 23, 29))).toBe('open');
    expect(getOpenStatus(beforeDayOff, at(5, 23, 30))).toBe('closingSoon');
    expect(getOpenStatus(beforeDayOff, at(6, 0, 30))).toBe('closed');
  });

  it('follows chains of ranges across several midnights', () => {
    const hours = { monday: '18:00-24:00', tuesday: '00:00-24:00', wednesday: '00:00-02:00' };
    expect(getOpenStatus(hours, at(5, 23, 45))).toBe('open');
    expect(getOpenStatus(hours, at(6, 12, 0))).toBe('open');
    expect(getOpenStatus(hours, at(6, 23, 45))).toBe('open');
    expect(getOpenStatus(hours, at(7, 1, 29))).toBe('open');
    expect(getOpenStatus(hours, at(7, 1, 45))).toBe('closingSoon');
    expect(getOpenStatus(hours, at(7, 2, 0))).toBe('closed');
  });

  it('reports a shop opening at 00:00 tomorrow as opening soon tonight', () => {
    const hours = { monday: '10:00-20:00', tuesday: '00:00-06:00' };
    expect(getOpenStatus(hours, at(5, 23, 29))).toBe('closed');
    expect(getOpenStatus(hours, at(5, 23, 30))).toBe('openingSoon');
    expect(getOpenStatus(hours, at(5, 23, 45))).toBe('openingSoon');
    expect(getOpenStatus(hours, at(6, 0, 0))).toBe('open');
    // Saturday 23:45 looks ahead to Sunday across the week boundary.
    expect(getOpenStatus({ sunday: '00:00-06:00' }, at(10, 23, 45))).toBe('openingSoon');
  });

  it('keeps an overnight range open past midnight however it is written', () => {
    for (const monday of ['17:00-01:00', '17:00-25:00']) {
      const hours = { monday, tuesday: '休息' };
      expect(getOpenStatus(hours, at(5, 16, 30))).toBe('openingSoon');
      expect(getOpenStatus(hours, at(5, 23, 30))).toBe('open');
      expect(getOpenStatus(hours, at(6, 0, 29))).toBe('open');
      expect(getOpenStatus(hours, at(6, 0, 30))).toBe('closingSoon');
      expect(getOpenStatus(hours, at(6, 1, 0))).toBe('closed');
    }
    // An overnight range overlapping the next day's early range runs until the later close.
    const overlapping = { monday: '17:00-01:00', tuesday: '00:00-02:00' };
    expect(getOpenStatus(overlapping, at(6, 0, 45))).toBe('open');
    expect(getOpenStatus(overlapping, at(6, 1, 30))).toBe('closingSoon');
    // Saturday's overnight range carries into Sunday across the week boundary.
    expect(getOpenStatus({ saturday: '20:00-02:00' }, at(11, 1, 0))).toBe('open');
  });

  it('stays closed on 休息 days and missing days', () => {
    const hours = { sunday: '休息', monday: '06:00-14:00' };
    for (const hour of [0, 9, 12, 23]) expect(getOpenStatus(hours, at(4, hour, 45))).toBe('closed');
    expect(getOpenStatus(hours, at(7, 12, 0))).toBe('closed');
    expect(isOpenNow(hours, at(5, 6, 0))).toBe(true);
    expect(isOpenNow(hours, at(4, 12, 0))).toBe(false);
  });

  it('uses inclusive 30-minute closing-soon and opening-soon thresholds', () => {
    const hours = { monday: '11:00-14:00,17:00-20:00' };
    expect(getOpenStatus(hours, at(5, 10, 29))).toBe('closed');
    expect(getOpenStatus(hours, at(5, 10, 30))).toBe('openingSoon');
    expect(getOpenStatus(hours, at(5, 11, 0))).toBe('open');
    expect(getOpenStatus(hours, at(5, 13, 29))).toBe('open');
    expect(getOpenStatus(hours, at(5, 13, 30))).toBe('closingSoon');
    expect(getOpenStatus(hours, at(5, 19, 59))).toBe('closingSoon');
    expect(getOpenStatus(hours, at(5, 20, 0))).toBe('closed');
    expect(isOpenNow(hours, at(5, 19, 45))).toBe(true);
  });
});
