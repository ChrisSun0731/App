import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { useRefresh } from '@/hooks/use-refresh';
import { useNewsStore } from '@/store/news';

import { feedLabels, fetchSchoolNews, type NewsFeed, type NewsItem } from './rss';

const FETCH_INTERVAL = 2 * 60 * 1000;

/**
 * The latest successful round's failed feeds (failed while another loaded),
 * and which of them still show cached items. Kept apart from the query data,
 * which stays the item list, and out of the persisted news store, whose cache
 * shape stays as it is: it only describes this session's last refresh.
 */
const useLastRound = create<{ failed: readonly NewsFeed[]; carriedOver: readonly NewsFeed[] }>(() => ({
  failed: [],
  carriedOver: [],
}));

export interface PartialFailure {
  /** Names of the feeds (重要公告, 最新消息) that failed. */
  feeds: string[];
  /**
   * Whether their items on screen are the cached ones. False when nothing was
   * saved for them (a first launch, or after a reset), so none are shown.
   */
  showingCached: boolean;
}

export interface SchoolNews {
  /** The merged item list; starts from the cached list, so it works offline. */
  query: UseQueryResult<NewsItem[]>;
  /**
   * Set when the latest refresh loaded one feed but not the other. A round
   * where every feed fails is a query error instead.
   */
  partialFailure: PartialFailure | null;
  /**
   * Refetches, joining a refresh already under way (a poll, a pull) instead of
   * restarting it. For pull to refresh, which shows its own indicator.
   */
  refetch: () => Promise<unknown>;
  /**
   * The same, but sets `refreshing` until it settles: for 重新整理 and 重試,
   * which otherwise change nothing on screen during a fetch of up to ~30 s.
   */
  refresh: () => Promise<unknown>;
  refreshing: boolean;
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
      useLastRound.setState({ failed: round.failed, carriedOver: round.carriedOver });
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

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(() => refetchQuery({ cancelRefetch: false }), [refetchQuery]);
  const { refresh, refreshing } = useRefresh(refetch);

  const failed = useLastRound((state) => state.failed);
  const carriedOver = useLastRound((state) => state.carriedOver);
  // Only once this query has fetched: after 重設個人資料與設定 clears the query
  // cache, the last round's failures belong to data that is gone. (A round
  // that fails outright shows as the query error instead.)
  const partialFailure = query.isFetched && failed.length > 0
    ? { feeds: feedLabels(failed), showingCached: carriedOver.length > 0 }
    : null;

  return { query, partialFailure, refetch, refresh, refreshing };
}
