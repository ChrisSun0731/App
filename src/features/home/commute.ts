// 今天's 回家: one short line per followed station, for the 回家 section and,
// around commute times, the 現在 card. Pure, so it is unit-tested
// (commute.test.ts); the live data comes from the 交通 queries.
import { arrivalsAt, destinationLabel, parseCountdown, type TrackInfo } from '@/features/transport/metro';
import { stationDisplayName, type YoubikeStation } from '@/features/transport/youbike';
import type { FollowedYoubike } from '@/store/transport';

export interface CommuteLine {
  key: string;
  kind: 'youbike' | 'metro';
  /** The nickname, or the Metro station. */
  name: string;
  /** e.g. 借 30 · 還 19, or 往松山 3 分 · 往新店 6 分 */
  value: string;
  /** The card's label, e.g. YouBike · 建中東側門 */
  label: string;
}

const count = (value: number | null | undefined) => (value === null || value === undefined ? '–' : String(value));

/** 借 30 · 還 19 at a followed YouBike station; 尚無資料 until its feed has it. */
export function youbikeLine(follow: FollowedYoubike, station: YoubikeStation | undefined): CommuteLine {
  const name = follow.nickname || stationDisplayName(follow.sna);
  return {
    key: `youbike:${follow.city}:${follow.sna}`,
    kind: 'youbike',
    name,
    value: station ? `借 ${count(station.rent)} · 還 ${count(station.return)}` : '尚無資料',
    label: `YouBike · ${name}`,
  };
}

/** A countdown in whole minutes (3 分), 進站 when arriving; null when the feed has no time. */
export function shortCountdown(countDown: string): string | null {
  const value = parseCountdown(countDown);
  if (value.kind === 'arriving') return '進站';
  if (value.kind === 'closed') return '已收班';
  if (value.kind === 'time') return value.minutes === 0 ? '即將進站' : `${value.minutes} 分`;
  return null;
}

/** The next two trains at a Metro station: 往松山 3 分 · 往新店 6 分. */
export function metroLine(station: string, tracks: readonly TrackInfo[] | undefined): CommuteLine {
  let value = '尚無資料';
  if (tracks) {
    const trains = arrivalsAt([...tracks], station)
      .map((train) => ({ destination: destinationLabel(train.DestinationName), countdown: shortCountdown(train.CountDown) }))
      .filter((train): train is { destination: string; countdown: string } => train.countdown !== null)
      .slice(0, 2);
    value = trains.length ? trains.map((train) => `往${train.destination} ${train.countdown}`).join(' · ') : '暫無列車資訊';
  }
  return { key: `metro:${station}`, kind: 'metro', name: station, value, label: `捷運 · ${station}` };
}
