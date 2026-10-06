import { describe, expect, test } from '@jest/globals';
import { createElement, Fragment } from 'react';

import { toDateKey } from '@/lib/dates';

import type { RowAction } from '../types';
import {
  chunk,
  footerSpeech,
  iosMajorVersion,
  isAccessibilityTextSize,
  pickerDate,
  pickerMinimum,
  sf,
  spokenLabel,
  trailingSwipeActions,
  withAlpha,
} from './helpers';

const noop = () => {};

function action(key: string, destructive = false): RowAction {
  return { key, label: key, destructive, onPress: noop };
}

describe('SwiftUI kit helpers', () => {
  test('reads only SF Symbol strings as symbols', () => {
    expect(sf('heart.fill')).toBe('heart.fill');
    expect(sf(undefined)).toBeUndefined();
    expect(sf({ uri: 'file:///favorite.xml' })).toBeUndefined();
  });

  test('joins visible texts into one spoken phrase and skips blanks', () => {
    expect(spokenLabel(['國文', '第一節 · 08:10', undefined, '', '  ', '目前'])).toBe('國文，第一節 · 08:10，目前');
  });

  test('speaks crowd bars by their label, metric pills by their metrics, and nested fragments', () => {
    const crowd = createElement('CrowdBar', { accessibilityLabel: '車廂擁擠度：舒適', levels: [] });
    const pills = createElement('MetricPills', { metrics: [{ key: 'rent', label: '可借 3' }, { key: 'dock', label: '可還 7' }] });
    expect(footerSpeech(createElement(Fragment, null, pills, crowd))).toEqual(['可借 3', '可還 7', '車廂擁擠度：舒適']);
    expect(footerSpeech('更新中')).toEqual(['更新中']);
    expect(footerSpeech(null)).toEqual([]);
  });

  test('puts destructive swipe actions at the edge and keeps at most three', () => {
    const ordered = trailingSwipeActions([action('rename'), action('share'), action('remove', true), action('pin')]);
    expect(ordered.map((item) => item.key)).toEqual(['remove', 'rename', 'share']);
  });

  test('leaves disabled actions out of the swipe buttons, so a full swipe cannot fire one', () => {
    const ordered = trailingSwipeActions([
      action('rename'),
      { ...action('remove', true), disabled: true },
      { ...action('share'), disabled: true },
      action('pin'),
    ]);
    expect(ordered.map((item) => item.key)).toEqual(['rename', 'pin']);
  });

  test('splits tiles and calendar cells into rows', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunk(Array.from({ length: 42 }, (_, index) => index), 7)).toHaveLength(6);
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });

  test('parses the iOS major version from Platform.Version', () => {
    expect(iosMajorVersion('17.4')).toBe(17);
    expect(iosMajorVersion('16.4.1')).toBe(16);
    expect(iosMajorVersion(18)).toBe(18);
    expect(iosMajorVersion('')).toBe(0);
  });

  test('gives the date picker local midnight of the key, and today for a malformed key', () => {
    const date = pickerDate('2026-10-04');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 4, 0]);
    expect(toDateKey(pickerDate('not-a-date', new Date(2026, 0, 31, 23, 30)))).toBe('2026-01-31');
  });

  test('never bounds the date picker above the value it must show', () => {
    expect(pickerMinimum('2026-10-12', '2026-10-10')).toBe('2026-10-10');
    expect(pickerMinimum('2026-10-10', '2026-10-10')).toBe('2026-10-10');
    // An end date before the start: the picker still shows the end date.
    expect(pickerMinimum('2026-10-05', '2026-10-10')).toBe('2026-10-05');
    expect(pickerMinimum('2026-10-05', undefined)).toBeUndefined();
    expect(pickerMinimum('not-a-date', '2026-10-10')).toBeUndefined();
    expect(pickerMinimum('2026-10-05', '2026-13-01')).toBeUndefined();
  });

  test('treats only accessibility text sizes as large', () => {
    expect(isAccessibilityTextSize(1)).toBe(false);
    expect(isAccessibilityTextSize(1.353)).toBe(false);
    expect(isAccessibilityTextSize(1.786)).toBe(true);
    expect(isAccessibilityTextSize(3.571)).toBe(true);
  });

  test('adds an alpha channel to hex colours only', () => {
    expect(withAlpha('#03328d', 0.15)).toBe('#03328D26');
    expect(withAlpha('#FFFFFF', 2)).toBe('#FFFFFFFF');
    expect(withAlpha('#FFFFFF', -1)).toBe('#FFFFFF00');
    expect(withAlpha('systemRed', 0.5)).toBe('systemRed');
    expect(withAlpha('#FFF', 0.5)).toBe('#FFF');
  });
});
