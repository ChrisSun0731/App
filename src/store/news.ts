import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { NewsItem } from '@/features/news/rss';
import { persistStorage } from '@/lib/storage';

interface NewsState {
  pinned: NewsItem[];
  /** Items published before this ISO time count as read. */
  lastClearedTime: string | null;
  /** The last successful fetch, shown immediately on the next launch. */
  cached: NewsItem[];
  lastFetchTime: string | null;
  pin: (item: NewsItem) => void;
  unpin: (title: string) => void;
  /** 已讀所有訊息 */
  markAllRead: () => void;
  /** 恢復所有已讀訊息 */
  restoreAll: () => void;
  setFetched: (items: NewsItem[], at: string) => void;
  reset: () => void;
}

const initialState = () => ({
  pinned: [] as NewsItem[],
  lastClearedTime: null as string | null,
  cached: [] as NewsItem[],
  lastFetchTime: null as string | null,
});

export const useNewsStore = create<NewsState>()(
  persist(
    (set) => ({
      ...initialState(),
      pin: (item) =>
        set((state) =>
          state.pinned.some((p) => p.title === item.title) ? state : { pinned: [...state.pinned, item] },
        ),
      unpin: (title) => set((state) => ({ pinned: state.pinned.filter((p) => p.title !== title) })),
      markAllRead: () => set({ lastClearedTime: new Date().toISOString() }),
      restoreAll: () => set({ lastClearedTime: null }),
      setFetched: (cached, lastFetchTime) => set({ cached, lastFetchTime }),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.news',
      storage: persistStorage,
      version: 1,
      partialize: ({ pinned, lastClearedTime, cached, lastFetchTime }) => ({
        pinned,
        lastClearedTime,
        cached,
        lastFetchTime,
      }),
    },
  ),
);
