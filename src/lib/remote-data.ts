// Every data set the app reads -- class schedules, restaurant listings, the
// term 行事曆, cafeteria menus -- lives in the companion Data repo, so
// correcting it never needs an app release.
//
// The cost of that is a network dependency, which a local cache covers: each
// successful fetch is stored, screens render the cached copy immediately, and
// a failed refresh keeps showing it. Only a first-ever launch with no
// connectivity comes up empty.
import { useQuery } from '@tanstack/react-query';

import { getJson } from '@/lib/http';
import { readJson, writeJson } from '@/lib/storage';

export const DATA_BASE = 'https://raw.githubusercontent.com/CKApp-Dev/Data/main';

const CACHE_PREFIX = 'dataCache:';
const TIMEOUT_MS = 8000;

/** How long a fetched data file counts as fresh before it is refetched. */
const FRESH_FOR_MS = 60 * 60 * 1000;

export type Validator<T> = (data: unknown) => data is T;

export function dataUrl(path: string): string {
  return `${DATA_BASE}/${path}`;
}

export function readCachedData<T>(path: string, isValid: Validator<T>): T | null {
  const cached = readJson<unknown>(CACHE_PREFIX + path);
  return cached !== null && isValid(cached) ? cached : null;
}

/**
 * Fetches a JSON file from the Data repo and caches it.
 *
 * raw.githubusercontent answers a missing path with an error page rather than
 * JSON, so the payload is shape-checked before it is trusted or cached.
 */
export async function fetchDataFile<T>(
  path: string,
  isValid: Validator<T>,
  signal?: AbortSignal,
): Promise<T> {
  const data = await getJson(dataUrl(path), { timeoutMs: TIMEOUT_MS, signal });
  if (!isValid(data)) {
    throw new Error(`[data] ${path}: unexpected payload shape`);
  }
  writeJson(CACHE_PREFIX + path, data);
  return data;
}

/**
 * Query for a Data repo file. Starts from the cached copy (treated as stale so
 * it is refreshed on first use) and falls back to it if the refresh fails.
 */
export function useDataFile<T>(path: string, isValid: Validator<T>) {
  return useQuery({
    queryKey: ['data', path],
    queryFn: ({ signal }) => fetchDataFile(path, isValid, signal),
    initialData: () => readCachedData(path, isValid) ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: FRESH_FOR_MS,
  });
}
