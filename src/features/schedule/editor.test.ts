import { describe, expect, test } from '@jest/globals';

import { cellColorOptions, editorTitle, parseEditorTarget, subjectHint } from './editor';
import { draftFromCell, setDraftRotating } from './timetable';

describe('the schedule editor route', () => {
  test('accepts a known period and weekday only', () => {
    expect(parseEditorTarget({ period: '三', day: 'Friday' })).toEqual({ period: '三', day: 'Friday' });
    expect(parseEditorTarget({ period: '九', day: 'Friday' })).toBeNull();
    expect(parseEditorTarget({ period: '三', day: 'Saturday' })).toBeNull();
    expect(parseEditorTarget({ period: ['三'], day: 'Friday' })).toBeNull();
    expect(parseEditorTarget({})).toBeNull();
  });

  test('titles the sheet with the slot', () => {
    expect(editorTitle({ period: '一', day: 'Monday' })).toBe('星期一第一節');
    expect(editorTitle(null)).toBe('編輯課程');
  });
});

describe('the 科目 section footer', () => {
  test('explains each mode and names the weeks turning 輪替 off replaces', () => {
    const alternating = { odd: '物理', even: '' };
    const draft = draftFromCell({ subject: '物理', alternating });
    expect(subjectHint(draft, alternating)).toBe('單週與雙週分別顯示各自的科目，留空代表該週空堂。');
    expect(subjectHint(setDraftRotating(draft, false), alternating)).toBe(
      '每週都顯示此科目，留空代表空堂。原為單週 物理／雙週 空堂。',
    );
    expect(subjectHint(draftFromCell({ subject: '國文' }), undefined)).toBe('每週都顯示此科目，留空代表空堂。');
  });
});

test('offers the eight cell colours, 預設 first, each with a dot in its hue', () => {
  const light = cellColorOptions('light', '#2E9E5B');
  expect(light).toHaveLength(8);
  // 預設's dot is the subject's own colour.
  expect(light[0]).toEqual({ label: '預設（依科目）', value: 'Default', dot: '#2E9E5B' });
  expect(light.find((option) => option.value === 'Red')).toEqual({ label: '紅色', value: 'Red', dot: '#FF3B30' });
  expect(cellColorOptions('dark').find((option) => option.value === 'Red')?.dot).toBe('#FF453A');
  expect(light.map((option) => option.label)).toContain('粉紅色');
  // Each named colour has a dot of its own.
  expect(new Set(light.slice(1).map((option) => option.dot)).size).toBe(7);
  // A 空堂 has no colour of its own, so 預設 has no dot.
  expect(cellColorOptions('light')[0].dot).toBeUndefined();
});
