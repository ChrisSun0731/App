import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { MAX_FEATURE_TABS, TAB_FEATURE_IDS, type TabFeatureId } from '@/features/registry';
import { persistStorage } from '@/lib/storage';

export interface ToolbarItem {
  id: TabFeatureId;
  visible: boolean;
}

export interface HomeWidgets {
  /** 目前課程 */
  schedule: boolean;
  /** 今日待辦事項 */
  todo: boolean;
  /** 釘選校網內容 */
  news: boolean;
}

/** The Quasar app's toolbar order; the first MAX_FEATURE_TABS are shown. */
export function defaultToolbar(): ToolbarItem[] {
  return TAB_FEATURE_IDS.map((id, index) => ({ id, visible: index < MAX_FEATURE_TABS }));
}

/**
 * Repairs a toolbar from storage or migration: drops unknown and duplicate
 * entries, appends features it lacks (hidden), and caps the visible count.
 */
export function normalizeToolbar(items: unknown): ToolbarItem[] {
  if (!Array.isArray(items)) return defaultToolbar();
  const seen = new Set<TabFeatureId>();
  const result: ToolbarItem[] = [];
  let shown = 0;
  for (const item of items) {
    if (!item || typeof item !== 'object' || !(TAB_FEATURE_IDS as readonly string[]).includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    const visible = item.visible === true && shown < MAX_FEATURE_TABS;
    if (visible) shown++;
    result.push({ id: item.id, visible });
  }
  for (const id of TAB_FEATURE_IDS) {
    if (!seen.has(id)) result.push({ id, visible: false });
  }
  return result;
}

export function visibleTabs(toolbar: readonly ToolbarItem[]): TabFeatureId[] {
  return toolbar.filter((item) => item.visible).map((item) => item.id);
}

interface SettingsState {
  toolbar: ToolbarItem[];
  homeWidgets: HomeWidgets;
  setToolbarVisible: (id: TabFeatureId, visible: boolean) => void;
  moveToolbarItem: (from: number, to: number) => void;
  setHomeWidget: (key: keyof HomeWidgets, value: boolean) => void;
  reset: () => void;
}

const initialState = () => ({
  toolbar: defaultToolbar(),
  homeWidgets: { schedule: true, todo: true, news: true },
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState(),
      setToolbarVisible: (id, visible) =>
        set((state) => {
          if (visible && visibleTabs(state.toolbar).length >= MAX_FEATURE_TABS) {
            return state;
          }
          return {
            toolbar: state.toolbar.map((item) => (item.id === id ? { ...item, visible } : item)),
          };
        }),
      moveToolbarItem: (from, to) =>
        set((state) => {
          if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= state.toolbar.length
            || to < 0 || to >= state.toolbar.length || from === to) return state;
          const toolbar = [...state.toolbar];
          const [item] = toolbar.splice(from, 1);
          toolbar.splice(to, 0, item);
          return { toolbar };
        }),
      setHomeWidget: (key, value) =>
        set((state) => ({ homeWidgets: { ...state.homeWidgets, [key]: value } })),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.settings',
      storage: persistStorage,
      version: 1,
      partialize: ({ toolbar, homeWidgets }) => ({ toolbar, homeWidgets }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          toolbar: normalizeToolbar(saved.toolbar ?? current.toolbar),
          homeWidgets: {
            schedule: typeof saved.homeWidgets?.schedule === 'boolean' ? saved.homeWidgets.schedule : current.homeWidgets.schedule,
            todo: typeof saved.homeWidgets?.todo === 'boolean' ? saved.homeWidgets.todo : current.homeWidgets.todo,
            news: typeof saved.homeWidgets?.news === 'boolean' ? saved.homeWidgets.news : current.homeWidgets.news,
          },
        };
      },
    },
  ),
);
