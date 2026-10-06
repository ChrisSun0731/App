// 餐廳資訊 (/restaurant?name=, modal): one restaurant's status, address,
// favourite, map and website links, and its weekly hours with today marked.
// Opened from 美食's rows, map pins and random pick. Layout per
// docs/design/native-ui.md, "美食 (Food)".
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert, Linking } from 'react-native';

import { HeaderActions, type HeaderActionsProps } from '@/components/header-actions';
import { icons } from '@/components/icons';
import {
  addressText,
  findRestaurant,
  mapsUrl,
  summarize,
  websiteUrl,
  weeklyHours,
} from '@/features/food/food-view';
import { useRestaurants } from '@/features/food/use-restaurants';
import { useNow } from '@/features/home/use-now';
import { useFoodStore } from '@/store/food';
import { ButtonRow, EmptyState, ListScreen, Loading, Row, Section, TextBlock } from '@/ui';

const ANDROID = process.env.EXPO_OS === 'android';

/** The open status and today's mark tick while the modal is focused. */
const CLOCK_INTERVAL_MS = 30_000;

export default function RestaurantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const now = useNow(CLOCK_INTERVAL_MS);
  // The same query as 美食, so this is normally served from its cache.
  const restaurants = useRestaurants();
  const favorites = useFoodStore((state) => state.favorites);
  const toggleFavorite = useFoodStore((state) => state.toggleFavorite);
  const restaurant = findRestaurant(restaurants.data, typeof params.name === 'string' ? params.name : undefined);

  const close = () => router.back();
  // Nothing to save (favourites apply at once): iOS has 完成 on the right of
  // the page sheet, Android a close icon on the left of the full-screen modal.
  const header: HeaderActionsProps = ANDROID
    ? { left: [{ kind: 'icon', key: 'close', label: '關閉', icon: icons.close, onPress: close }] }
    : { right: [{ kind: 'text', key: 'done', label: '完成', prominent: true, onPress: close }] };

  if (!restaurant) {
    let placeholder: ReactElement;
    if (restaurants.isPending) {
      placeholder = (
        <Section>
          <Loading label="正在讀取餐廳資料…" />
        </Section>
      );
    } else if (!restaurants.data && restaurants.isError) {
      placeholder = (
        <Section plain>
          <EmptyState
            icon={icons.offline}
            title="無法讀取餐廳資料"
            description="請檢查網路後再試一次。"
            action={{ label: '重新讀取', onPress: () => void restaurants.refetch() }}
          />
        </Section>
      );
    } else {
      // An old link, or the listing changed while the modal was open.
      placeholder = (
        <Section plain>
          <EmptyState
            icon={icons.forkKnife}
            title="找不到這間餐廳"
            description="餐廳資料可能已更新，請回到美食重新選擇。"
            action={{ label: '返回美食', onPress: close }}
          />
        </Section>
      );
    }
    return (
      <>
        <HeaderActions {...header} />
        <ListScreen>{placeholder}</ListScreen>
      </>
    );
  }

  const summary = summarize(restaurant, now);
  const favorite = favorites.includes(restaurant.name);
  const website = websiteUrl(restaurant.website);

  return (
    <>
      <HeaderActions {...header} />
      <ListScreen>
        <Section plain>
          <TextBlock text={restaurant.name} size="large" selectable />
          <Row dotColor={summary.color} title={summary.statusLabel} subtitle={`今日 ${summary.todayHours}`} />
          <Row icon={icons.mapPin} title={addressText(restaurant)} titleLines={3} />
        </Section>

        <Section>
          <ButtonRow
            label={favorite ? '移除最愛' : '加入最愛'}
            icon={favorite ? icons.favoriteFilled : icons.favorite}
            onPress={() => toggleFavorite(restaurant.name)}
          />
          <ButtonRow label="在地圖開啟位置" icon={icons.map} onPress={() => void openLink(mapsUrl(restaurant.position))} />
          {website ? <ButtonRow label="餐廳網站" icon={icons.web} onPress={() => void openLink(website)} /> : null}
        </Section>

        <Section title="營業時間">
          {/* One line per range. Android's trailing detail stops at two lines
              (a third range would be cut off), so the hours go in the
              supporting text there, as Material lays out multi-line values. */}
          {weeklyHours(restaurant, now).map((day) => (
            <Row
              key={day.day}
              title={day.label}
              subtitle={ANDROID ? day.hours : undefined}
              detail={ANDROID ? undefined : day.hours}
              emphasized={day.today}
              badge={day.today ? '今天' : undefined}
            />
          ))}
        </Section>
      </ListScreen>
    </>
  );
}

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('無法開啟連結', '請稍後再試一次。');
  }
}
