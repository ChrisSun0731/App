import { describe, expect, test } from '@jest/globals';

import { overflowMenuLabel } from './labels';

describe('kit labels', () => {
  test('names the row in its overflow button label', () => {
    expect(overflowMenuLabel('課表')).toBe('「課表」的更多選項');
    expect(overflowMenuLabel('  捷運 台北車站 ')).toBe('「捷運 台北車站」的更多選項');
  });

  test('falls back to a plain label for a row without a name', () => {
    expect(overflowMenuLabel('')).toBe('更多選項');
    expect(overflowMenuLabel('   ')).toBe('更多選項');
  });
});
