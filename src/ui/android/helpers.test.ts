import { describe, expect, test } from '@jest/globals';
import { createElement, Fragment, type ReactElement } from 'react';

import {
  chunk,
  dialogDateFromKey,
  dialogMinimumFromKey,
  flattenChildren,
  formatDateLabel,
  joinLabel,
  keyFromDialogDate,
  segmentsFit,
  withAlpha,
} from './helpers';

describe('Compose kit helpers', () => {
  test('applies alpha to #RRGGBB and multiplies an existing alpha', () => {
    expect(withAlpha('#03328d', 1)).toBe('#03328DFF');
    expect(withAlpha('#03328D', 0.5)).toBe('#03328D80');
    expect(withAlpha('#1B1B21FF', 0.38)).toBe('#1B1B2161');
    expect(withAlpha('#00000080', 0.5)).toBe('#00000040');
    expect(withAlpha('red', 0.5)).toBe('red');
  });

  test('joins the non-empty parts of a spoken row label', () => {
    expect(joinLabel(['國文', undefined, '第一節 · 08:10', '', false, '目前'])).toBe('國文，第一節 · 08:10，目前');
    expect(joinLabel([])).toBe('');
  });

  test('formats a local date key with its weekday', () => {
    expect(formatDateLabel('2026-10-04')).toBe('2026年10月4日 星期日');
    expect(formatDateLabel('2027-01-01')).toBe('2027年1月1日 星期五');
  });

  test('round-trips dates through the UTC-midnight values of the Material date picker', () => {
    for (const key of ['2026-10-04', '2026-12-31', '2027-01-01', '2028-02-29']) {
      const reported = new Date(new Date(dialogDateFromKey(key)).getTime());
      expect(reported.getUTCHours()).toBe(0);
      expect(keyFromDialogDate(reported)).toBe(key);
    }
  });

  test('gives selectable-date bounds as local midnight, which the native side reads by calendar fields', () => {
    const minimum = dialogMinimumFromKey('2026-10-04');
    expect(minimum && [minimum.getFullYear(), minimum.getMonth(), minimum.getDate(), minimum.getHours()]).toEqual([
      2026, 9, 4, 0,
    ]);
    expect(dialogMinimumFromKey(undefined)).toBeUndefined();
    expect(dialogMinimumFromKey('2026-02-30')).toBeUndefined();
  });

  test('falls back from segmented buttons when the labels would not fit', () => {
    // A 360dp phone: 328dp between the list gutters, 296dp inside a card.
    expect(segmentsFit(['一', '二', '三', '四', '五'], 328)).toBe(true);
    expect(segmentsFit(['月曆', '待辦'], 296)).toBe(true);
    expect(segmentsFit(['未讀', '已釘選', '已讀', '全部'], 328)).toBe(false);
    expect(segmentsFit(['未讀', '已釘選', '已讀', '全部'], 440)).toBe(true);
    expect(segmentsFit(['BL', 'BR', 'R', 'G', 'O', 'Y'], 600)).toBe(false);
    expect(segmentsFit(['一', '二', '三', '四', '五'], 296)).toBe(false);
    expect(segmentsFit(['一', '二', '三', '四', '五'], 328, 1.3)).toBe(false);
    expect(segmentsFit(['一', '二', '三', '四', '五'], 380, 1.3)).toBe(true);
    expect(segmentsFit([], 100)).toBe(true);
  });

  test('chunks items into rows', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });

  test('flattens fragments into uniquely keyed rows and drops non-elements', () => {
    const row = (key: string) => createElement('row', { key });
    const rows = flattenChildren([
      row('a'),
      null,
      false,
      'text',
      createElement(Fragment, { key: 'group' }, row('b'), [row('c')], createElement(Fragment, null, row('d'))),
    ]);
    expect(rows.map((element: ReactElement) => element.type)).toEqual(['row', 'row', 'row', 'row']);
    const keys = rows.map((element: ReactElement) => element.key);
    expect(new Set(keys).size).toBe(4);
  });
});
