import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useNewsStore } from '@/store/news';

import { fetchSchoolNews } from './rss';

const FETCH_INTERVAL = 2 * 60 * 1000;

/** Refreshes only while the screen is visible and the app is in the foreground. */
export function useSchoolNews() {
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

  return useQuery({
    queryKey: ['school-news'],
    queryFn: async ({ signal }) => {
      // The cache is passed in so a feed that fails this round keeps its items.
      const items = await fetchSchoolNews(signal, useNewsStore.getState().cached);
      useNewsStore.getState().setFetched(items, new Date().toISOString());
      return items;
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
}
