import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { ActionButton, Body, Card, Field, Screen, Segment, Title } from '@/components/ui/page';
import { type FollowedYoubike, useTransportStore } from '@/store/transport';

import StationMap from './map-picker';
import {
  arrivalsAt, carCrowdedness, CROWD_COLORS, CROWD_LABELS, crowdLevel, destinationLabel,
  fetchCarWeights, fetchTrackInfo, hasMetroCredentials, parseCountdown, trainLineColor,
} from './metro';
import { linesOfStation, METRO_LINES, METRO_LINE_COLORS, METRO_LINE_NAMES, stationsOnLine } from './metro-lines';
import {
  availabilityLevel, CITIES, CK_COORDINATE, fetchStations, nearestStations, stationDisplayName,
  type City, type YoubikeStation,
} from './youbike';

const POLL_MS = 10_000;
const EMPTY_STATIONS: YoubikeStation[] = [];

function useStations(city: City, enabled: boolean) {
  return useQuery({
    queryKey: ['transport', 'youbike', city],
    queryFn: ({ signal }) => fetchStations(city, signal),
    enabled,
    staleTime: 5000,
    refetchInterval: enabled ? POLL_MS : false,
  });
}

function timeLabel(timestamp: number | Date) {
  return new Date(timestamp).toLocaleTimeString('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function countdownLabel(countDown: string) {
  const value = parseCountdown(countDown);
  if (value.kind === 'arriving') return '列車進站';
  if (value.kind === 'closed') return '營運時間已過';
  if (value.kind === 'time') return `${value.minutes} 分 ${String(value.seconds).padStart(2, '0')} 秒`;
  return '暫無到站時間';
}

function Availability({ rent, docks }: { rent: number | null; docks: number | null }) {
  return (
    <View style={styles.row}>
      {[{ label: '可借', count: rent }, { label: '可還', count: docks }].map(({ label, count }) => (
        <View key={label} style={styles.metric}>
          <View style={[styles.dot, { backgroundColor: availabilityColor(count) }]} />
          <Body>{label} {count ?? '未知'}</Body>
        </View>
      ))}
    </View>
  );
}

function availabilityColor(count: number | null) {
  const level = availabilityLevel(count);
  return { none: '#C62828', low: '#EF6C00', ok: '#238545', unknown: '#777777' }[level];
}

export default function TransportScreen() {
  const focused = useIsFocused();
  const store = useTransportStore();
  const [picker, setPicker] = useState<'youbike' | 'metro' | null>(null);
  const [city, setCity] = useState<City>('臺北市');
  const [mode, setMode] = useState(0);
  const [search, setSearch] = useState('');
  const [point, setPoint] = useState(CK_COORDINATE);
  const [lineIndex, setLineIndex] = useState(0);
  const [metroSearch, setMetroSearch] = useState('');
  const [editing, setEditing] = useState<FollowedYoubike | null>(null);
  const [nickname, setNickname] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const loadTaipei = store.youbike.some((s) => s.city === '臺北市') || (picker === 'youbike' && (city === '臺北市' || mode === 1));
  const loadNewTaipei = store.youbike.some((s) => s.city === '新北市') || (picker === 'youbike' && (city === '新北市' || mode === 1));
  const taipei = useStations('臺北市', focused && loadTaipei);
  const newTaipei = useStations('新北市', focused && loadNewTaipei);
  const metroConfigured = hasMetroCredentials();
  const metroEnabled = focused && metroConfigured && store.metro.length > 0;
  const tracks = useQuery({
    queryKey: ['transport', 'metro', 'arrivals'],
    queryFn: ({ signal }) => fetchTrackInfo(signal),
    enabled: metroEnabled,
    staleTime: 5000,
    refetchInterval: metroEnabled ? POLL_MS : false,
  });
  const weights = useQuery({
    queryKey: ['transport', 'metro', 'crowding'],
    queryFn: ({ signal }) => fetchCarWeights(signal),
    enabled: metroEnabled,
    staleTime: 5000,
    refetchInterval: metroEnabled ? POLL_MS : false,
  });
  const taipeiData = taipei.data ?? EMPTY_STATIONS;
  const newTaipeiData = newTaipei.data ?? EMPTY_STATIONS;
  const stationLookup = useMemo(() => new Map(
    [...taipeiData, ...newTaipeiData].map((station) => [`${station.city}:${station.sna}`, station]),
  ), [taipeiData, newTaipeiData]);
  const cityQuery = city === '臺北市' ? taipei : newTaipei;
  const searchResults = (cityQuery.data ?? EMPTY_STATIONS).filter((station) =>
    `${stationDisplayName(station.sna)} ${station.area}`.includes(search.trim()),
  );
  const nearby = useMemo(() => nearestStations(
    [...taipeiData, ...newTaipeiData], point.latitude, point.longitude,
  ), [taipeiData, newTaipeiData, point]);
  const followed = (station: YoubikeStation) => store.youbike.some((s) => s.city === station.city && s.sna === station.sna);
  const selectedLine = METRO_LINES[lineIndex];
  const metroOptions = stationsOnLine(selectedLine).filter((station) => station.includes(metroSearch.trim()));

  async function refresh() {
    if (!focused || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        ...(loadTaipei ? [taipei.refetch()] : []),
        ...(loadNewTaipei ? [newTaipei.refetch()] : []),
        ...(metroEnabled ? [tracks.refetch(), weights.refetch()] : []),
      ]);
    } finally { setRefreshing(false); }
  }

  const addYoubike = (station: YoubikeStation) => store.followYoubike(station.sna, stationDisplayName(station.sna), station.city);

  return (
    <>
      <HeaderActions right={[
        { kind: 'icon', key: 'refresh', label: '更新交通資訊', icon: icons.refresh, onPress: () => { void refresh(); }, disabled: refreshing },
        { kind: 'menu', key: 'add', label: '新增站點', icon: icons.add, actions: [
          { key: 'youbike', label: 'YouBike 站點', icon: icons.bike, onPress: () => setPicker('youbike') },
          { key: 'metro', label: '捷運車站', icon: icons.metro, onPress: () => setPicker('metro') },
        ] },
      ]} />
      <Screen refreshing={refreshing} onRefresh={() => { void refresh(); }}>
        <Card>
          <Title>交通</Title>
          <Body secondary>查看常用站點的即時資訊，約每 10 秒更新。</Body>
          <ActionButton label="新增 YouBike 站點" onPress={() => setPicker('youbike')} />
          <ActionButton label="新增捷運車站" onPress={() => setPicker('metro')} />
        </Card>

        {picker === 'youbike' ? (
          <Card>
            <Title>新增 YouBike 站點</Title>
            <Segment options={['搜尋站點', '附近九站']} selectedIndex={mode} onChange={setMode} />
            {mode === 0 ? (
              <>
                <Segment options={[...CITIES]} selectedIndex={CITIES.indexOf(city)} onChange={(index) => { setCity(CITIES[index]); setSearch(''); }} />
                <Field label="搜尋站名或行政區" value={search} onChangeText={setSearch} />
                {cityQuery.isPending ? <Body secondary>正在載入站點…</Body> : null}
                {cityQuery.isError ? <Body secondary>無法更新 {city} 站點。請下拉重試。</Body> : null}
                {!cityQuery.isPending && !searchResults.length ? <Body secondary>找不到符合的站點。</Body> : null}
                {searchResults.slice(0, 30).map((station) => (
                  <View key={`${station.city}:${station.sna}`} style={styles.result}>
                    <Body>{stationDisplayName(station.sna)}</Body>
                    <Body secondary>{station.area}</Body>
                    <Availability rent={station.rent} docks={station.return} />
                    <ActionButton label={followed(station) ? '已加入' : '加入站點'} disabled={followed(station)} onPress={() => addYoubike(station)} />
                  </View>
                ))}
                {searchResults.length > 30 ? <Body secondary>顯示前 30 個結果，請輸入站名或行政區縮小範圍。</Body> : null}
              </>
            ) : (
              <>
                <Body secondary>點選地圖選擇搜尋位置。初始位置為建中，搜尋涵蓋臺北市與新北市。</Body>
                <StationMap point={point} stations={nearby} onSelect={setPoint} />
                {taipei.isPending || newTaipei.isPending ? <Body secondary>正在搜尋附近站點…</Body> : null}
                {taipei.isError || newTaipei.isError ? <Body secondary>部分縣市資料無法更新，結果可能不完整。請下拉重試。</Body> : null}
                {nearby.map((station, index) => (
                  <View key={`${station.city}:${station.sna}`} style={styles.result}>
                    <Body>{index + 1}. {stationDisplayName(station.sna)}</Body>
                    <Body secondary>{station.city} · {Math.round(station.distanceKm * 1000)} 公尺</Body>
                    <Availability rent={station.rent} docks={station.return} />
                    <ActionButton label={followed(station) ? '已加入' : '加入站點'} disabled={followed(station)} onPress={() => addYoubike(station)} />
                  </View>
                ))}
              </>
            )}
            <ActionButton label="完成" onPress={() => setPicker(null)} />
          </Card>
        ) : null}

        {picker === 'metro' ? (
          <Card>
            <Title>新增捷運車站</Title>
            <Segment options={[...METRO_LINES]} selectedIndex={lineIndex} onChange={setLineIndex} />
            <Body>{METRO_LINE_NAMES[selectedLine]}</Body>
            <Field label="搜尋車站" value={metroSearch} onChangeText={setMetroSearch} />
            {metroOptions.map((station) => (
              <ActionButton key={station} label={store.metro.includes(station) ? `${station}（已加入）` : station}
                disabled={store.metro.includes(station)} onPress={() => store.addMetro(station)} />
            ))}
            {!metroOptions.length ? <Body secondary>此路線沒有符合的車站。</Body> : null}
            <ActionButton label="完成" onPress={() => setPicker(null)} />
          </Card>
        ) : null}

        {editing ? (
          <Card>
            <Title>修改站點暱稱</Title>
            <Body secondary>{stationDisplayName(editing.sna)}</Body>
            <Field label="暱稱" value={nickname} onChangeText={setNickname} />
            <ActionButton label="儲存" onPress={() => { store.renameYoubike(editing.sna, nickname, editing.city); setEditing(null); }} />
            <ActionButton label="取消" onPress={() => setEditing(null)} />
          </Card>
        ) : null}

        <Title>YouBike 站點</Title>
        {!store.youbike.length ? <Card><Body secondary>尚未加入站點。新增常用站點後，即可查看可借車輛與可還車位。</Body></Card> : null}
        {store.youbike.map((follow) => {
          const station = stationLookup.get(`${follow.city}:${follow.sna}`);
          const query = follow.city === '臺北市' ? taipei : newTaipei;
          return (
            <Card key={`${follow.city}:${follow.sna}`}>
              <Title>{follow.nickname}</Title>
              <Body secondary>{follow.city} · {stationDisplayName(follow.sna)}</Body>
              {query.isPending ? <Body secondary>正在載入即時資訊…</Body> : (
                <>
                  <Availability rent={station?.rent ?? null} docks={station?.return ?? null} />
                  {query.isError ? <Body secondary>更新失敗，{station ? '顯示上次取得的資訊。' : '請下拉重試。'}</Body> : null}
                  {!query.isError && !station ? <Body secondary>此站點目前沒有回報資料。</Body> : null}
                  {station?.updatedAt ? <Body secondary>站點更新：{timeLabel(station.updatedAt)}</Body> : null}
                </>
              )}
              <ActionButton label="修改暱稱" onPress={() => { setEditing(follow); setNickname(follow.nickname); }} />
              <ActionButton label="移除站點" destructive onPress={() => store.unfollowYoubike(follow.sna, follow.city)} />
            </Card>
          );
        })}

        <Title>捷運車站</Title>
        {!metroConfigured ? <Card><Body secondary>捷運即時到站資訊暫未啟用。你仍可管理常用車站。</Body></Card> : null}
        {tracks.isError ? <Card><Body secondary>捷運更新失敗，{tracks.data ? '顯示上次取得的到站資訊。' : '請下拉重試。'}</Body></Card> : null}
        {weights.isError && tracks.data ? <Body secondary>車廂擁擠資訊目前無法更新。</Body> : null}
        {metroConfigured && tracks.dataUpdatedAt ? <Body secondary>到站資訊更新：{timeLabel(tracks.dataUpdatedAt)}</Body> : null}
        {!store.metro.length ? <Card><Body secondary>尚未加入捷運車站。</Body></Card> : null}
        {store.metro.map((station) => {
          const trains = arrivalsAt(tracks.data ?? [], station);
          return (
            <Card key={station}>
              <Title>{station}</Title>
              <View style={styles.row}>
                {linesOfStation(station).map((line) => <View key={line} style={styles.metric}>
                  <View style={[styles.dot, { backgroundColor: METRO_LINE_COLORS[line] }]} />
                  <Body secondary>{line}</Body>
                </View>)}
              </View>
              {metroConfigured && tracks.isPending && !tracks.isError ? <Body secondary>正在載入到站資訊…</Body> : null}
              {metroConfigured && tracks.data && !trains.length ? <Body secondary>此站目前沒有到站資訊。</Body> : null}
              {metroConfigured ? trains.map((train, index) => {
                const crowd = carCrowdedness(weights.data ?? [], train.TrainNumber);
                return (
                  <View key={`${train.TrainNumber}:${train.DestinationName}:${index}`} style={[styles.train, { borderLeftColor: trainLineColor(train.DestinationName, station, train.TrainNumber) ?? '#777777' }]}>
                    <Body>往 {destinationLabel(train.DestinationName)} · {countdownLabel(train.CountDown)}</Body>
                    {crowd.length ? (
                      <View accessible style={styles.row} accessibilityLabel={`車廂擁擠程度，前車廂起：${crowd.map((level) => Number.isFinite(level) ? CROWD_LABELS[crowdLevel(level)] : '未知').join('、')}`}>
                        {crowd.map((level, index) => <View key={index} style={[styles.car, { backgroundColor: Number.isFinite(level) ? CROWD_COLORS[crowdLevel(level)] : '#777777' }]} />)}
                      </View>
                    ) : null}
                  </View>
                );
              }) : null}
              <ActionButton label="移除車站" destructive onPress={() => store.removeMetro(station)} />
            </Card>
          );
        })}
        {metroConfigured ? <Body secondary>車廂擁擠：綠色低、黃色中、橘色高、深橘色極高（前車廂起）。</Body> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  result: { gap: 6, paddingVertical: 10 },
  train: { paddingLeft: 12, borderLeftWidth: 4, gap: 8, paddingVertical: 8 },
  car: { width: 22, height: 12, borderRadius: 3 },
});
