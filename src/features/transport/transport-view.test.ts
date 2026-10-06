import { describe, expect, jest, test } from '@jest/globals';

import type { CarWeight, TrackInfo } from './metro';
import { METRO_LINE_COLORS } from './metro-lines';
import {
  availabilityMetrics,
  citiesOf,
  countdownLabel,
  CROWD_LEGEND,
  crowdView,
  followedStationView,
  lineMetrics,
  metroFooter,
  metroNotices,
  metroStationStatus,
  nearbySubtitle,
  SEARCH_LIMIT,
  searchMetroStations,
  searchStations,
  stationKey,
  taipeiTime,
  trainViews,
  UNKNOWN_COLOR,
  youbikeFooter,
} from './transport-view';
import type { YoubikeStation } from './youbike';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

function station(patch: Partial<YoubikeStation> = {}): YoubikeStation {
  return {
    sna: 'YouBike2.0_植物園',
    city: '臺北市',
    area: '中正區',
    rent: 5,
    return: 2,
    latitude: 25.03,
    longitude: 121.51,
    updatedAt: new Date('2026-10-04T01:39:03Z'),
    ...patch,
  };
}

const LOADED = { isPending: false, isError: false };

describe('times', () => {
  test('prints Taipei time with a 00 hour at midnight, whatever the phone zone', () => {
    expect(taipeiTime(new Date('2026-10-04T01:39:03Z'))).toBe('09:39:03');
    expect(taipeiTime(Date.UTC(2026, 9, 3, 16, 0, 5))).toBe('00:00:05');
  });
});

describe('YouBike rows', () => {
  test('keys stations by city and name, and fetches only the followed cities', () => {
    expect(stationKey({ city: '新北市', sna: 'YouBike2.0_A' })).toBe('新北市:YouBike2.0_A');
    expect(citiesOf([])).toEqual([]);
    expect(citiesOf([{ city: '新北市' }, { city: '新北市' }])).toEqual(['新北市']);
    expect(citiesOf([{ city: '新北市' }, { city: '臺北市' }])).toEqual(['臺北市', '新北市']);
  });

  test('labels counts with availability colours and says 未知 for missing ones', () => {
    expect(availabilityMetrics(station({ rent: 0, return: 2 }))).toEqual([
      { key: 'rent', label: '可借 0', color: '#C62828' },
      { key: 'dock', label: '可還 2', color: '#EF6C00' },
    ]);
    expect(availabilityMetrics(station({ rent: 9, return: null })).map((metric) => [metric.label, metric.color])).toEqual([
      ['可借 9', '#238545'],
      ['可還 未知', UNKNOWN_COLOR],
    ]);
    expect(availabilityMetrics(undefined).map((metric) => metric.label)).toEqual(['可借 未知', '可還 未知']);
  });

  test('shows loading, stale, failed and unreported states with the station report time', () => {
    const follow = { city: '臺北市' as const, sna: 'YouBike2.0_植物園' };
    expect(followedStationView(follow, undefined, { isPending: true, isError: false })).toEqual({
      subtitle: '臺北市 · 植物園\n正在載入即時資訊…',
      showCounts: false,
    });
    expect(followedStationView(follow, station(), LOADED)).toEqual({
      subtitle: '臺北市 · 植物園\n站點更新 09:39:03',
      showCounts: true,
    });
    expect(followedStationView(follow, station(), { isPending: false, isError: true }).subtitle)
      .toBe('臺北市 · 植物園\n更新失敗，顯示上次取得的資訊。\n站點更新 09:39:03');
    expect(followedStationView(follow, undefined, { isPending: false, isError: true }).subtitle)
      .toBe('臺北市 · 植物園\n更新失敗，下拉可重試。');
    expect(followedStationView(follow, undefined, LOADED)).toEqual({
      subtitle: '臺北市 · 植物園\n此站點目前沒有回報資料。',
      showCounts: true,
    });
    expect(followedStationView(follow, station({ updatedAt: null }), LOADED).subtitle).toBe('臺北市 · 植物園');
  });

  test('footer names the newest report among followed stations', () => {
    expect(youbikeFooter([])).toBe('約每 10 秒更新');
    expect(youbikeFooter([undefined, station({ updatedAt: null })])).toBe('約每 10 秒更新');
    expect(youbikeFooter([
      station({ updatedAt: new Date('2026-10-04T01:39:03Z') }),
      undefined,
      station({ updatedAt: new Date('2026-10-04T01:40:10Z') }),
    ])).toBe('約每 10 秒更新 · 站點更新 09:40:10');
  });
});

describe('YouBike picker', () => {
  test('matches names or districts, lists everything for an empty query and caps the results', () => {
    const stations = [
      station({ sna: 'YouBike2.0_植物園', area: '中正區' }),
      station({ sna: 'YouBike2.0_大安森林公園', area: '大安區' }),
      ...Array.from({ length: SEARCH_LIMIT + 5 }, (_, index) => station({ sna: `YouBike2.0_站${index}`, area: '萬華區' })),
    ];
    expect(searchStations(stations, ' 植物 ').results.map((item) => item.sna)).toEqual(['YouBike2.0_植物園']);
    expect(searchStations(stations, '大安區').results.map((item) => item.sna)).toEqual(['YouBike2.0_大安森林公園']);
    // The "YouBike2.0_" prefix is not part of the searchable name.
    expect(searchStations(stations, 'YouBike').total).toBe(0);
    const all = searchStations(stations, '');
    expect(all.total).toBe(SEARCH_LIMIT + 7);
    expect(all.results).toHaveLength(SEARCH_LIMIT);
  });

  test('shows distance in whole metres', () => {
    expect(nearbySubtitle({ ...station({ city: '新北市' }), distanceKm: 0.1234 })).toBe('新北市 · 123 公尺');
  });
});

describe('Metro', () => {
  test('filters a line by name in route order', () => {
    expect(searchMetroStations(['西門', '北門', '中山'], ' 門')).toEqual(['西門', '北門']);
    expect(searchMetroStations(['西門'], '')).toEqual(['西門']);
  });

  test('labels countdowns, arrivals and closed service', () => {
    expect(countdownLabel('2:03')).toBe('2 分 05 秒');
    expect(countdownLabel('列車進站')).toBe('列車進站');
    expect(countdownLabel('營運時間已過')).toBe('營運時間已過');
    expect(countdownLabel('--')).toBe('暫無到站時間');
  });

  test('names the lines of an interchange with their colours', () => {
    expect(lineMetrics('中正紀念堂')).toEqual([
      { key: 'R', label: '淡水信義線', color: METRO_LINE_COLORS.R },
      { key: 'G', label: '松山新店線', color: METRO_LINE_COLORS.G },
    ]);
  });

  test('summarises crowding in words, front car first, with unknown cars in grey', () => {
    expect(crowdView([])).toBeNull();
    const view = crowdView([1, 2, 3, 4, Number.NaN]);
    expect(view?.levels.map((level) => level.color)).toEqual(['#8BC34A', '#FFCA28', '#FFA726', '#BF360C', UNKNOWN_COLOR]);
    expect(view?.accessibilityLabel).toBe('車廂擁擠程度，前車廂起：低、中、高、極高、未知');
  });

  test('lists trains at a station with line colour, countdown and crowding', () => {
    const tracks: TrackInfo[] = [
      { StationName: '西門站', DestinationName: '南港展覽館站', CountDown: '0:58', TrainNumber: '101' },
      { StationName: '西門站', DestinationName: '新店站', CountDown: '列車進站', TrainNumber: '' },
      { StationName: '台北車站', DestinationName: '淡水站', CountDown: '1:00', TrainNumber: '7' },
    ];
    const weights: CarWeight[] = [
      { TrainNumber: '101', Cart1L: '1', Cart2L: '2', Cart3L: '1', Cart4L: '1', Cart5L: '3', Cart6L: '4' },
    ];
    const trains = trainViews(tracks, weights, '西門');
    expect(trains.map(({ title, detail, lineColor }) => ({ title, detail, lineColor }))).toEqual([
      { title: '往 南港展覽館', detail: '1 分 00 秒', lineColor: METRO_LINE_COLORS.BL },
      { title: '往 新店', detail: '列車進站', lineColor: METRO_LINE_COLORS.G },
    ]);
    expect(trains[0].crowd?.levels).toHaveLength(6);
    expect(trains[1].crowd).toBeNull();
    expect(new Set(trains.map((train) => train.key)).size).toBe(2);
    expect(trainViews(tracks, weights, '台北車站').map((train) => train.title)).toEqual(['往 淡水']);
  });

  test('station status covers loading and no trains, and stays quiet without credentials', () => {
    const base = { configured: true, isPending: false, hasData: true, trainCount: 0 };
    expect(metroStationStatus({ ...base, isPending: true, hasData: false })).toBe('正在載入到站資訊…');
    expect(metroStationStatus(base)).toBe('此站目前沒有到站資訊。');
    expect(metroStationStatus({ ...base, trainCount: 2 })).toBeUndefined();
    // A failed first load is explained once for the whole section.
    expect(metroStationStatus({ ...base, hasData: false })).toBeUndefined();
    expect(metroStationStatus({ ...base, configured: false, isPending: true })).toBeUndefined();
  });

  test('footer carries the legend and the fetch time only when live data is enabled', () => {
    expect(metroFooter(false, Date.now())).toBeUndefined();
    expect(metroFooter(true, 0)).toBe(CROWD_LEGEND);
    expect(metroFooter(true, Date.UTC(2026, 9, 4, 1, 39, 3))).toBe(`${CROWD_LEGEND}\n到站資訊更新 09:39:03`);
  });

  test('notices report failures only while stations are followed, and crowding only beside arrivals', () => {
    const base = { configured: true, stationCount: 2, arrivals: { isError: false, hasData: true }, crowdingError: false };
    const quiet = { notConfigured: false, arrivalsFailed: false, crowdingFailed: false };
    expect(metroNotices(base)).toEqual(quiet);
    expect(metroNotices({ ...base, arrivals: { isError: true, hasData: false } })).toEqual({ ...quiet, arrivalsFailed: true });
    expect(metroNotices({ ...base, crowdingError: true })).toEqual({ ...quiet, crowdingFailed: true });
    expect(metroNotices({ ...base, crowdingError: true, arrivals: { isError: true, hasData: false } })).toEqual({
      ...quiet,
      arrivalsFailed: true,
    });
    // After the last station is removed the queries stop, but their errors stay.
    expect(metroNotices({ ...base, stationCount: 0, arrivals: { isError: true, hasData: true }, crowdingError: true })).toEqual(
      quiet,
    );
    expect(metroNotices({ ...base, configured: false, arrivals: { isError: true, hasData: false } })).toEqual({
      ...quiet,
      notConfigured: true,
    });
  });
});
