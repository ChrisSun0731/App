// 交通: live YouBike availability and Metro arrivals at the stations the user
// follows. Stations are added in the /youbike-picker and /metro-picker sheets
// and renamed in /youbike-rename. Layout per docs/design/native-ui.md,
// "交通 (Transport)".
import { router } from 'expo-router';
import { Fragment, useMemo, useRef, useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { PULL_TO_RETRY, RETRY } from '@/lib/copy';
import { useTransportStore, type FollowedYoubike } from '@/store/transport';
import { CrowdBar, EmptyState, ListScreen, MetricPills, Notice, Row, Section } from '@/ui';

import { availabilityPills } from './availability-pills';
import { confirmRemoval } from './confirm-remove';
import {
  citiesOf,
  followedStationView,
  lineMetrics,
  metroFooter,
  metroNotices,
  metroStationStatus,
  stationKey,
  trainViews,
  youbikeFooter,
} from './transport-view';
import { refetchYoubike, useMetroLive, useYoubikeFeeds } from './use-transport-queries';
import type { YoubikeStation } from './youbike';

// iOS keeps row actions in swipe actions and the long-press menu, which
// nothing on screen reveals; Android shows an overflow button on every row.
const IOS = process.env.EXPO_OS === 'ios';
const YOUBIKE_HINT = IOS ? '左滑或長按站點即可修改暱稱或移除。' : '';
const METRO_HINT = IOS ? '左滑或長按車站即可移除。' : '';

/** Footer lines, skipping the empty ones. */
const lines = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('\n') || undefined;

function openYoubikePicker() {
  router.push('/youbike-picker');
}

function openMetroPicker() {
  router.push('/metro-picker');
}

function openRename(follow: FollowedYoubike) {
  router.push({ pathname: '/youbike-rename', params: { city: follow.city, sna: follow.sna } });
}

export default function TransportScreen() {
  const followed = useTransportStore((state) => state.youbike);
  const metroStations = useTransportStore((state) => state.metro);
  const unfollowYoubike = useTransportStore((state) => state.unfollowYoubike);
  const removeMetro = useTransportStore((state) => state.removeMetro);

  // Only the cities of followed stations are fetched.
  const cities = useMemo(() => citiesOf(followed), [followed]);
  const feeds = useYoubikeFeeds(cities);
  const metro = useMetroLive(metroStations.length > 0);

  const taipeiData = feeds['臺北市'].data;
  const newTaipeiData = feeds['新北市'].data;
  const stations = useMemo(() => {
    const byKey = new Map<string, YoubikeStation>();
    for (const station of [...(taipeiData ?? []), ...(newTaipeiData ?? [])]) byKey.set(stationKey(station), station);
    return byKey;
  }, [taipeiData, newTaipeiData]);

  // The header button and pull to refresh share one round of requests.
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);
  function refresh(): Promise<void> {
    inFlight.current ??= (async () => {
      setRefreshing(true);
      try {
        await Promise.allSettled([refetchYoubike(feeds, cities), metro.refetch()]);
      } finally {
        setRefreshing(false);
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }

  const tracks = metro.tracks.data ?? [];
  const weights = metro.weights.data ?? [];
  const notices = metroNotices({
    configured: metro.configured,
    stationCount: metroStations.length,
    arrivals: { isError: metro.tracks.isError, hasData: metro.tracks.data !== undefined },
    crowdingError: metro.weights.isError,
  });

  return (
    <>
      <HeaderActions
        right={[
          {
            kind: 'icon',
            key: 'refresh',
            label: '更新交通資訊',
            icon: icons.refresh,
            // Greyed while running; iOS draws a spinner in its place, as its
            // list cannot show `refreshing` (see ListScreen below).
            busy: refreshing,
            onPress: () => void refresh(),
          },
          {
            kind: 'menu',
            key: 'add',
            label: '新增站點',
            icon: icons.add,
            actions: [
              { key: 'youbike', label: 'YouBike 站點', icon: icons.bike, onPress: openYoubikePicker },
              { key: 'metro', label: '捷運車站', icon: icons.metro, onPress: openMetroPicker },
            ],
          },
        ]}
      />
      <ListScreen
        onRefresh={refresh}
        // Shows progress for the header button too on Android (a pull shows
        // its own); iOS shows the header button's spinner instead.
        refreshing={refreshing}
        fab={{ label: '新增站點', icon: icons.add, onPress: openYoubikePicker }}>
        {followed.length === 0 ? (
          <Section title="YouBike 站點" plain>
            <EmptyState
              icon={icons.bike}
              title="尚未加入站點"
              description="新增常用站點後，即可查看可借車輛與可還車位。"
              action={{ label: '新增 YouBike 站點', onPress: openYoubikePicker }}
            />
          </Section>
        ) : (
          <Section
            title="YouBike 站點"
            footer={lines(youbikeFooter(followed.map((follow) => stations.get(stationKey(follow)))), YOUBIKE_HINT)}>
            {followed.map((follow) => {
              const station = stations.get(stationKey(follow));
              const view = followedStationView(follow, station, feeds[follow.city]);
              return (
                <Row
                  key={stationKey(follow)}
                  title={follow.nickname}
                  subtitle={view.subtitle}
                  footer={
                    view.showCounts ? (
                      <MetricPills metrics={availabilityPills(station)} />
                    ) : undefined
                  }
                  actions={[
                    { key: 'rename', label: '修改暱稱', icon: icons.edit, onPress: () => openRename(follow) },
                    {
                      key: 'remove',
                      label: '移除站點',
                      icon: icons.delete,
                      destructive: true,
                      onPress: () =>
                        confirmRemoval('移除站點', follow.nickname, () => unfollowYoubike(follow.sna, follow.city)),
                    },
                  ]}
                />
              );
            })}
          </Section>
        )}

        <Section
          title="捷運車站"
          plain={metroStations.length === 0}
          footer={
            metroStations.length
              ? lines(metroFooter(metro.configured, metro.tracks.dataUpdatedAt), METRO_HINT)
              : undefined
          }>
          {notices.notConfigured ? (
            <Notice tone="info" title="捷運即時到站資訊暫未啟用" message="你仍可管理常用車站。" />
          ) : null}
          {notices.arrivalsFailed ? (
            <Notice
              tone="error"
              title="捷運更新失敗"
              message={metro.tracks.data ? '顯示上次取得的到站資訊。' : PULL_TO_RETRY}
              // The screen's refresh, so its progress shows like the header button's.
              action={{ label: RETRY, onPress: () => void refresh() }}
            />
          ) : null}
          {notices.crowdingFailed ? (
            <Notice tone="info" title="車廂擁擠資訊目前無法更新" />
          ) : null}
          {metroStations.length === 0 ? (
            <EmptyState
              icon={icons.metro}
              title="尚未加入捷運車站"
              action={{ label: '新增捷運車站', onPress: openMetroPicker }}
            />
          ) : null}
          {metroStations.map((station) => {
            // Trains are listed only with live data; without credentials the
            // stations can still be managed.
            const trains = metro.configured ? trainViews(tracks, weights, station) : [];
            const status = metroStationStatus({
              configured: metro.configured,
              isPending: metro.tracks.isPending,
              hasData: metro.tracks.data !== undefined,
              trainCount: trains.length,
            });
            // A fragment, so the Section sees each Row (Android draws the
            // dividers between them).
            return (
              <Fragment key={station}>
                <Row
                  title={station}
                  subtitle={status}
                  icon={icons.metro}
                  footer={<MetricPills metrics={lineMetrics(station)} />}
                  actions={[
                    {
                      key: 'remove',
                      label: '移除車站',
                      icon: icons.delete,
                      destructive: true,
                      onPress: () => confirmRemoval('移除車站', station, () => removeMetro(station)),
                    },
                  ]}
                />
                {trains.map((train) => (
                  <Row
                    key={train.key}
                    title={train.title}
                    detail={train.detail}
                    dotColor={train.lineColor}
                    footer={
                      train.crowd ? (
                        <CrowdBar levels={train.crowd.levels} accessibilityLabel={train.crowd.accessibilityLabel} />
                      ) : undefined
                    }
                  />
                ))}
              </Fragment>
            );
          })}
        </Section>
      </ListScreen>
    </>
  );
}
