import { citiesOf } from '@/features/transport/transport-view';
import { refetchYoubike, useMetroLive, useYoubikeFeeds } from '@/features/transport/use-transport-queries';
import { useTransportStore } from '@/store/transport';

import { metroLine, youbikeLine, type CommuteLine } from './commute';

/**
 * 今天 polls every minute, and only around the commute: the Taipei YouBike
 * feed is about 1 MB, which 交通's 10 s polling is fine for but a screen
 * people glance at all day is not. Other times it fetches on focus when the
 * numbers are older than STALE_MS.
 */
const COMMUTE_POLL_MS = 60_000;
const STALE_MS = 5 * 60_000;

export interface Commute {
  /** One line per followed YouBike station, then per Metro station (when configured). */
  lines: CommuteLine[];
  /** The first of each kind, for the 現在 card. */
  cardLines: CommuteLine[];
  /** Fetches now, whether live or not (pull to refresh). */
  refetch: () => Promise<unknown>;
}

/**
 * The followed stations' numbers for 今天. `enabled`: the 回家 section is on
 * (nothing is fetched otherwise). `live`: poll every minute while focused.
 */
export function useCommute({ enabled, live }: { enabled: boolean; live: boolean }): Commute {
  const youbike = useTransportStore((state) => state.youbike);
  const metro = useTransportStore((state) => state.metro);
  const cities = enabled ? citiesOf(youbike) : [];
  const polling = { poll: live, pollMs: COMMUTE_POLL_MS, staleMs: live ? COMMUTE_POLL_MS / 2 : STALE_MS };
  const feeds = useYoubikeFeeds(cities, polling);
  const metroLive = useMetroLive(enabled && metro.length > 0, polling);

  const bikes = enabled
    ? youbike.map((follow) => youbikeLine(follow, feeds[follow.city].data?.find((station) => station.sna === follow.sna)))
    : [];
  const trains = enabled && metroLive.configured ? metro.map((station) => metroLine(station, metroLive.tracks.data)) : [];
  return {
    lines: [...bikes, ...trains],
    cardLines: [...bikes.slice(0, 1), ...trains.slice(0, 1)],
    refetch: () => Promise.allSettled([refetchYoubike(feeds, cities), metroLive.refetch()]),
  };
}
