import { useState } from 'react';

import { createPendingTracker } from '@/lib/pending-tracker';

/**
 * A refresh started from a button (重試, 重新整理). React Query keeps a failed
 * query's error until a fetch succeeds, so an error notice would sit unchanged
 * through the whole retry (up to ~17 s with the 8 s timeout and one retry), as
 * if the tap had done nothing. `refreshing` stays true until the task
 * settles, so the screen can show a `Loading` row in the notice's place;
 * overlapping taps keep it up until the last one settles.
 *
 * `task` should join a fetch already running rather than restart it (React
 * Query's `refetch({ cancelRefetch: false })`), or each impatient tap cancels
 * the request and a slow network never finishes. Pull to refresh calls the
 * plain task instead: it draws its own indicator.
 */
export function useRefresh(task: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const [track] = useState(() => createPendingTracker(setRefreshing));
  const refresh = () => track(task);
  return { refresh, refreshing };
}
