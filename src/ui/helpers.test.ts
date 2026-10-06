import { describe, expect, test } from '@jest/globals';

import { chunk, withAlpha } from './helpers';

describe('shared kit helpers', () => {
  test('applies alpha to #RRGGBB and multiplies an existing alpha', () => {
    expect(withAlpha('#03328d', 1)).toBe('#03328DFF');
    expect(withAlpha('#03328d', 0.15)).toBe('#03328D26');
    expect(withAlpha('#03328D', 0.5)).toBe('#03328D80');
    expect(withAlpha('#1B1B21FF', 0.38)).toBe('#1B1B2161');
    expect(withAlpha('#00000080', 0.5)).toBe('#00000040');
  });

  test('clamps alpha and leaves other colour strings alone', () => {
    expect(withAlpha('#FFFFFF', 2)).toBe('#FFFFFFFF');
    expect(withAlpha('#FFFFFF', -1)).toBe('#FFFFFF00');
    expect(withAlpha('red', 0.5)).toBe('red');
    expect(withAlpha('systemRed', 0.5)).toBe('systemRed');
    expect(withAlpha('#FFF', 0.5)).toBe('#FFF');
  });

  test('splits tiles and calendar cells into rows', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunk(Array.from({ length: 42 }, (_, index) => index), 7)).toHaveLength(6);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });
});
