import { describe, expect, test } from '@jest/globals';

import { addDays, clock, fromDateKey, isDateKey, parseClockTime, startOfWeekMonday, toDateKey } from './dates';

describe('calendar date boundaries', () => {
  test('accepts leap days but rejects invalid dates rather than rolling them over', () => {
    expect(isDateKey('2024-02-29')).toBe(true);
    for (const date of ['2026-02-29', '2026-02-30', '2026-99-99', '2026-04-31', '2026-00-01']) {
      expect(isDateKey(date)).toBe(false);
      expect(() => fromDateKey(date)).toThrow(RangeError);
    }
  });
  test('keeps Monday and additions in local calendar time across year boundaries', () => {
    const sunday = new Date(2027, 0, 3, 1, 30);
    expect(toDateKey(startOfWeekMonday(sunday))).toBe('2026-12-28');
    expect(toDateKey(addDays(fromDateKey('2026-12-31'), 1))).toBe('2027-01-01');
  });
  test('allows extended overnight hours and rejects impossible minutes', () => {
    expect(parseClockTime('26:30')).toBe(1590);
    expect(parseClockTime('12:60')).toBeNull();
  });
  test('formats minutes since midnight as a zero-padded clock time, hours past 23 included', () => {
    expect(clock(490)).toBe('08:10');
    expect(clock(1020)).toBe('17:00');
    expect(clock(1590)).toBe('26:30');
  });
});
