import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { MAX_FEATURE_TABS, TAB_FEATURE_IDS } from '@/features/registry';
import { defaultToolbar, normalizeToolbar, useSettingsStore, visibleTabs } from '@/store/settings';
import { featureHref } from './feature-link';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
jest.mock('@/lib/storage', () => ({
  persistStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

beforeEach(() => { useSettingsStore.getState().reset(); });

describe('customizable native destinations', () => {
  test('routes an unpinned feature through the stack and a pinned one through its tab', () => {
    expect(featureHref('todo')).toBe('/(tabs)/todo');
    expect(featureHref('food')).toEqual({ pathname: '/feature/[id]', params: { id: 'food' } });
    useSettingsStore.getState().setToolbarVisible('todo', false);
    expect(featureHref('todo')).toEqual({ pathname: '/feature/[id]', params: { id: 'todo' } });
    expect(featureHref('help')).toEqual({ pathname: '/feature/[id]', params: { id: 'help' } });
  });
  test('allows replacing a pinned feature without exceeding the five native destinations', () => {
    useSettingsStore.getState().setToolbarVisible('food', true);
    expect(visibleTabs(useSettingsStore.getState().toolbar)).not.toContain('food');
    useSettingsStore.getState().setToolbarVisible('promo', false);
    useSettingsStore.getState().setToolbarVisible('food', true);
    expect(visibleTabs(useSettingsStore.getState().toolbar)).toHaveLength(MAX_FEATURE_TABS);
    expect(featureHref('food')).toBe('/(tabs)/food');
  });
  test('repairs old or malformed saved destinations without duplicates or too many tabs', () => {
    const restored = normalizeToolbar([null, { id: 'removed', visible: true }, { id: 'food', visible: true },
      { id: 'food', visible: true }, ...TAB_FEATURE_IDS.map((id) => ({ id, visible: true }))]);
    expect(visibleTabs(restored)).toHaveLength(MAX_FEATURE_TABS);
    expect(restored[0].id).toBe('food');
    expect(new Set(restored.map((item) => item.id)).size).toBe(TAB_FEATURE_IDS.length);
    expect(normalizeToolbar('corrupt')).toEqual(defaultToolbar());
  });
  test('does not corrupt destinations when a stale reorder index is submitted', () => {
    const before = useSettingsStore.getState().toolbar;
    useSettingsStore.getState().moveToolbarItem(-1, 0);
    useSettingsStore.getState().moveToolbarItem(99, 0);
    expect(useSettingsStore.getState().toolbar).toEqual(before);
  });
});
