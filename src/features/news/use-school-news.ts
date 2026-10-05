import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { useNewsStore } from '@/store/news';

import { feedLabels, fetchSchoolNews, type NewsFeed, type NewsItem } from './rss';

const FETCH_INTERVAL = 2 * 60 * 1000;

/**
 * Feeds that failed in the latest successful round (while another loaded).
 * Kept apart from the query data, which stays the item list, and out of the
 * persisted news store, whose cache shape stays as it is: it only describes
 * this session's last refresh.
 */
const useLastRound = create<{ failed: readonly NewsFeed[] }>(() => ({ failed: [] }));

export interface SchoolNews {
  /** The merged item list; starts from the cached list, so it works offline. */
  query: UseQueryResult<NewsItem[]>;
  /**
   * Names of the feeds (重要公告, 最新消息) whose latest refresh failed while
   * the other feed loaded. Their items on screen are from the cache. A round
   * where every feed fails is a query error instead.
   */
  failedFeeds: string[];
}

/** Refreshes only while the screen is visible and the app is in the foreground. */
export function useSchoolNews(): SchoolNews {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(() =>
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const query = useQuery({
    queryKey: ['school-news'],
    queryFn: async ({ signal }) => {
      // The cache is passed in so a feed that fails this round keeps its items.
      const round = await fetchSchoolNews(signal, useNewsStore.getState().cached);
      useNewsStore.getState().setFetched(round.items, new Date().toISOString());
      useLastRound.setState({ failed: round.failed });
      return round.items;
    },
    enabled: focused && foreground,
    initialData: () => {
      const cached = useNewsStore.getState().cached;
      return cached.length ? cached : undefined;
    },
    initialDataUpdatedAt: () => {
      const at = useNewsStore.getState().lastFetchTime;
      return at ? new Date(at).getTime() : 0;
    },
    staleTime: FETCH_INTERVAL,
    refetchInterval: FETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const failed = useLastRound((state) => state.failed);
  // Only once this query has fetched: after 重設個人資料與設定 clears the query
  // cache, the last round's failures belong to data that is gone. (A round
  // that fails outright shows as the query error instead.)
  return { query, failedFeeds: query.isFetched ? feedLabels(failed) : [] };
}
