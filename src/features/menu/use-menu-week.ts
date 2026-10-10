// The week's 熱食部 dishes from the Data repo (menu-data.ts), cached like the
// other data files. A week without the file answers 404, which fails at once
// rather than after the usual retries, so the screen falls back to the day's
// image without a wait.
import { useQuery } from '@tanstack/react-query';

import { HttpError } from '@/lib/http';
import { fetchDataFile, readCachedData } from '@/lib/remote-data';

import { isMenuWeek } from './menu-data';
import { menuDataPath } from './menu-week';

const FRESH_FOR_MS = 60 * 60 * 1000;

export function useMenuWeek(week: string) {
  const path = menuDataPath(week);
  return useQuery({
    queryKey: ['data', path],
    queryFn: ({ signal }) => fetchDataFile(path, isMenuWeek, signal),
    initialData: () => readCachedData(path, isMenuWeek) ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: FRESH_FOR_MS,
    retry: (failures, error) => !(error instanceof HttpError && error.status === 404) && failures < 3,
  });
}
