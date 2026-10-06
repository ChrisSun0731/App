import { describe, expect, test } from '@jest/globals';

import { disabledLabel, overflowMenuLabel, spokenLabel } from './labels';

describe('kit labels', () => {
  test('joins visible texts into one spoken phrase and skips blanks', () => {
    expect(spokenLabel(['國文', undefined, '第一節 · 08:10', '', '  ', false, null, '目前'])).toBe('國文，第一節 · 08:10，目前');
    expect(spokenLabel([])).toBe('');
  });

  test('says when a control is turned off', () => {
    expect(disabledLabel('新增類別')).toBe('新增類別，已停用');
  });

  test('names the row in its overflow button label', () => {
    expect(overflowMenuLabel('課表')).toBe('「課表」的更多選項');
    expect(overflowMenuLabel('  捷運 台北車站 ')).toBe('「捷運 台北車站」的更多選項');
  });

  test('falls back to a plain label for a row without a name', () => {
    expect(overflowMenuLabel('')).toBe('更多選項');
    expect(overflowMenuLabel('   ')).toBe('更多選項');
  });
});
