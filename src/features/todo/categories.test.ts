import { describe, expect, test } from '@jest/globals';

import {
  categoryKind,
  colorOptions,
  EVENT_COLORS,
  eventCategoryProblem,
  isHexColor,
  withCurrentCategory,
} from './categories';

describe('category management rules', () => {
  test('reads the route kind, defaulting to todo categories', () => {
    expect(categoryKind('event')).toBe('event');
    expect(categoryKind('todo')).toBe('todo');
    expect(categoryKind(undefined)).toBe('todo');
    expect(categoryKind(['event'])).toBe('todo');
  });

  test('accepts only #RRGGBB colour codes', () => {
    expect(isHexColor('#c62828')).toBe(true);
    expect(isHexColor('#C62828')).toBe(true);
    expect(isHexColor('C62828')).toBe(false);
    expect(isHexColor('#C628')).toBe(false);
    expect(isHexColor('#C62828FF')).toBe(false);
    expect(isHexColor('#GGGGGG')).toBe(false);
  });

  test('reserves the school calendar category name and checks the colour', () => {
    expect(eventCategoryProblem(' 學校事務 ', '#ADADAD')).toBe('「學校事務」是學校行事曆專用類別。');
    expect(eventCategoryProblem('社團', '#12')).toBe('請選擇顏色或輸入 #RRGGBB 格式的色碼。');
    expect(eventCategoryProblem('社團', '#123456')).toBeNull();
  });

  test('shows a typed code as 自訂顏色 so the picker always has the current value', () => {
    expect(colorOptions('#C62828')).toBe(EVENT_COLORS);
    expect(colorOptions('#123456').at(-1)).toEqual({ label: '自訂顏色', value: '#123456' });
  });

  test("keeps an item's deleted category available in its editor", () => {
    const categories = [{ name: '作業' }];
    expect(withCurrentCategory(categories, { name: '舊類別' })).toEqual([{ name: '作業' }, { name: '舊類別' }]);
    expect(withCurrentCategory(categories, { name: '作業' })).toEqual(categories);
    expect(withCurrentCategory(categories, null)).toEqual(categories);
  });
});
