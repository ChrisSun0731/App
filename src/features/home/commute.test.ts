import { describe, expect, jest, test } from '@jest/globals';

import { COUNTDOWN_ARRIVING, type TrackInfo } from '@/features/transport/metro';
import type { YoubikeStation } from '@/features/transport/youbike';

import { metroLine, shortCountdown, youbikeLine } from './commute';

// metro.ts reads the Metro API credentials from the app config.
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

const FOLLOW = { sna: 'YouBike2.0_泉州寧波西街口', nickname: '建中東側門', city: '臺北市' as const };
const STATION: YoubikeStation = {
  sna: FOLLOW.sna,
  city: '臺北市',
  area: '中正區',
  rent: 30,
  return: 19,
  latitude: 25.0309,
  longitude: 121.5143,
  updatedAt: null,
};

describe('YouBike lines', () => {
  test('bikes to rent and docks to return, under the nickname', () => {
    expect(youbikeLine(FOLLOW, STATION)).toMatchObject({ name: '建中東側門', value: '借 30 · 還 19', label: 'YouBike · 建中東側門' });
    expect(youbikeLine({ ...FOLLOW, nickname: '' }, STATION).name).toBe('泉州寧波西街口');
  });

  test('says so until the feed has the station, and marks counts it did not report', () => {
    expect(youbikeLine(FOLLOW, undefined).value).toBe('尚無資料');
    expect(youbikeLine(FOLLOW, { ...STATION, return: null }).value).toBe('借 30 · 還 –');
  });
});

describe('Metro lines', () => {
  const train = (destination: string, countDown: string, station = '小南門站'): TrackInfo => ({
    StationName: station,
    DestinationName: destination,
    CountDown: countDown,
    TrainNumber: '',
  });

  test('countdowns in whole minutes', () => {
    expect(shortCountdown('2:35')).toBe('2 分');
    expect(shortCountdown('0:20')).toBe('即將進站');
    expect(shortCountdown(COUNTDOWN_ARRIVING)).toBe('進站');
    expect(shortCountdown('?')).toBeNull();
  });

  test('the next two trains at the station, skipping ones without a time', () => {
    const tracks = [
      train('松山站', '3:05'),
      train('新店站', '?'),
      train('新店站', '6:10'),
      train('台電大樓站', '9:00'),
      train('松山站', '1:00', '西門站'),
    ];
    expect(metroLine('小南門', tracks)).toMatchObject({ name: '小南門', value: '往松山 3 分 · 往新店 6 分', label: '捷運 · 小南門' });
    expect(metroLine('小南門', []).value).toBe('暫無列車資訊');
    expect(metroLine('小南門', undefined).value).toBe('尚無資料');
  });
});
