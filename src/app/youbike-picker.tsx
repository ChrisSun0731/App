// /youbike-picker (modal): follow YouBike stations, found by name or 行政區
// in one city (header search field), or as the nine nearest to a point picked
// on the map. Tapping a station follows it at once and removal stays on 交通,
// so the header only has 完成. Layout per docs/design/native-ui.md,
// "交通 (Transport)".
import { router, Stack } from 'expo-router';
import { useCallback, useMemo, useState, type ComponentProps } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { doneHeader } from '@/features/todo/editor-header';
import { availabilityPills } from '@/features/transport/availability-pills';
import StationMap, { STATION_MAP_HINT, stationMapAvailable } from '@/features/transport/map-picker';
import type { MapPoint } from '@/features/transport/map-picker.types';
import { nearbySubtitle, SEARCH_LIMIT, searchStations, stationKey } from '@/features/transport/transport-view';
import { refetchYoubike, useYoubikeFeeds } from '@/features/transport/use-transport-queries';
import {
  CITIES,
  CK_COORDINATE,
  nearestStations,
  stationDisplayName,
  type City,
  type YoubikeStation,
} from '@/features/transport/youbike';
import { useTransportStore } from '@/store/transport';
import {
  Embedded,
  ListScreen,
  Loading,
  MetricPills,
  Notice,
  PickerRow,
  Row,
  Section,
  TextBlock,
  type ChoiceOption,
} from '@/ui';

type Mode = 'search' | 'nearby';
type SearchTextHandler = NonNullable<ComponentProps<typeof Stack.SearchBar>['onChangeText']>;

const MODE_OPTIONS: readonly ChoiceOption<Mode>[] = [
  { label: '搜尋站點', value: 'search' },
  { label: '附近九站', value: 'nearby' },
];
const CITY_OPTIONS: readonly ChoiceOption<City>[] = CITIES.map((city) => ({ label: city, value: city }));
const EMPTY: YoubikeStation[] = [];
const MAP_HEIGHT = 290;

function close() {
  router.back();
}

export default function YoubikePicker() {
  const followed = useTransportStore((state) => state.youbike);
  const followYoubike = useTransportStore((state) => state.followYoubike);
  const [mode, setMode] = useState<Mode>('search');
  const [city, setCity] = useState<City>('臺北市');
  const [query, setQuery] = useState('');
  const [point, setPoint] = useState<MapPoint>(CK_COORDINATE);

  // Searching needs the chosen city only; the nearest stations may be in either.
  const cities = useMemo(() => (mode === 'nearby' ? CITIES : [city]), [mode, city]);
  const feeds = useYoubikeFeeds(cities);
  const taipeiData = feeds['臺北市'].data;
  const newTaipeiData = feeds['新北市'].data;
  const nearby = useMemo(
    () => nearestStations([...(taipeiData ?? EMPTY), ...(newTaipeiData ?? EMPTY)], point.latitude, point.longitude),
    [taipeiData, newTaipeiData, point],
  );
  const followedKeys = useMemo(() => new Set(followed.map(stationKey)), [followed]);

  // Stable, so the header search options are not registered again on every render.
  const onSearchText = useCallback<SearchTextHandler>((event) => setQuery(event.nativeEvent.text), []);
  const clearSearch = useCallback(() => setQuery(''), []);

  function changeMode(next: Mode) {
    // The header search field is removed in 附近九站 and comes back empty.
    if (next !== 'search') setQuery('');
    setMode(next);
  }

  /** A result row: tap follows the station; followed ones are checked. */
  function stationRow(station: YoubikeStation, title: string, subtitle: string) {
    const added = followedKeys.has(stationKey(station));
    return (
      <Row
        key={stationKey(station)}
        title={title}
        subtitle={subtitle}
        footer={<MetricPills metrics={availabilityPills(station)} />}
        accessory={added ? 'checkmark' : 'none'}
        onPress={
          added ? undefined : () => followYoubike(station.sna, stationDisplayName(station.sna), station.city)
        }
      />
    );
  }

  const feed = feeds[city];
  const search = searchStations(feed.data ?? EMPTY, query);
  const nearbyPending = feeds['臺北市'].isPending || feeds['新北市'].isPending;
  const nearbyError = feeds['臺北市'].isError || feeds['新北市'].isError;

  return (
    <>
      <HeaderActions {...doneHeader(close)} />
      {mode === 'search' ? (
        <Stack.SearchBar
          placeholder="搜尋站名或行政區"
          autoCapitalize="none"
          // The sheet's List does not drive UIKit's scroll-to-reveal, so the
          // field stays visible instead of hiding under the bar.
          hideWhenScrolling={false}
          onChangeText={onSearchText}
          onCancelButtonPress={clearSearch}
          onClose={clearSearch}
        />
      ) : null}
      <ListScreen onRefresh={() => refetchYoubike(feeds, cities)}>
        <Section plain>
          <PickerRow label="新增方式" variant="segmented" value={mode} options={MODE_OPTIONS} onChange={changeMode} />
          {mode === 'search' ? (
            <PickerRow label="城市" variant="segmented" value={city} options={CITY_OPTIONS} onChange={setCity} />
          ) : null}
        </Section>

        {mode === 'search' ? (
          <Section
            title={city}
            footer={search.total > SEARCH_LIMIT ? '顯示前 30 個結果，請輸入站名或行政區縮小範圍。' : undefined}>
            {feed.isError ? (
              <Notice
                tone="error"
                title={`無法更新 ${city} 站點`}
                message="請下拉重試。"
                action={{ label: '重試', onPress: () => void feed.refetch() }}
              />
            ) : null}
            {feed.isPending ? <Loading label="正在載入站點…" /> : null}
            {feed.data && search.results.length === 0 ? <TextBlock text="找不到符合的站點。" secondary /> : null}
            {search.results.map((station) => stationRow(station, stationDisplayName(station.sna), station.area))}
          </Section>
        ) : (
          <>
            <Section title="搜尋位置" footer={stationMapAvailable ? STATION_MAP_HINT : undefined}>
              {stationMapAvailable ? (
                <Embedded height={MAP_HEIGHT}>
                  <StationMap point={point} stations={nearby} onSelect={setPoint} />
                </Embedded>
              ) : (
                <Notice
                  tone="info"
                  title="地圖暫時無法使用"
                  message="下方仍可查看建中附近的站點，或切換「搜尋站點」。"
                />
              )}
            </Section>
            <Section title="附近九站">
              {nearbyError ? (
                <Notice
                  tone="error"
                  title="部分縣市資料無法更新"
                  message="結果可能不完整。請下拉重試。"
                  action={{ label: '重試', onPress: () => void refetchYoubike(feeds, CITIES) }}
                />
              ) : null}
              {nearbyPending ? <Loading label="正在搜尋附近站點…" /> : null}
              {nearby.map((station, index) =>
                stationRow(station, `${index + 1}. ${stationDisplayName(station.sna)}`, nearbySubtitle(station)),
              )}
            </Section>
          </>
        )}
      </ListScreen>
    </>
  );
}
