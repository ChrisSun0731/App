// 美食: restaurants near 建中 on a map and in a list, with their opening
// status, name search, 正在營業 / 我的最愛 filters, favourites and a random
// pick, each restaurant opening the /restaurant modal. Layout per
// docs/design/native-ui.md, "美食 (Food)".
import { router, Stack } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useNow } from '@/features/home/use-now';
import { useFoodStore } from '@/store/food';
import { usePalette } from '@/theme/palette';
import { Embedded, EmptyState, FilterChips, ListScreen, Loading, Notice, Row, Section } from '@/ui';

import {
  FILTER_LABELS,
  filterRestaurants,
  pickRandomOpen,
  STATUS_LEGEND,
  summarize,
} from './food-view';
import { MAP_AVAILABLE } from './map-availability';
import type { Restaurant } from './opening-hours';
import RestaurantMap from './restaurant-map';
import { useRestaurants } from './use-restaurants';

const ANDROID = process.env.EXPO_OS === 'android';

/** Statuses are minute-resolution; the clock only ticks while 美食 is focused. */
const CLOCK_INTERVAL_MS = 30_000;

/** The map takes about 60% of the screen height, leaving the list's first rows in view. */
const MAP_HEIGHT_RATIO = 0.6;
const MIN_MAP_HEIGHT = 240;

export default function FoodScreen() {
  const now = useNow(CLOCK_INTERVAL_MS);
  const palette = usePalette();
  const { height: windowHeight } = useWindowDimensions();
  const restaurants = useRestaurants();
  const favorites = useFoodStore((state) => state.favorites);
  const toggleFavorite = useFoodStore((state) => state.toggleFavorite);
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [view, setView] = useState<'map' | 'list'>(MAP_AVAILABLE ? 'map' : 'list');
  // The restaurant last opened, so the map pans to it behind the modal.
  const [selected, setSelected] = useState<Restaurant | null>(null);

  const data = restaurants.data;
  const filtered = filterRestaurants(data ?? [], { query, openOnly, favoritesOnly }, favorites, now);
  const filtering = openOnly || favoritesOnly;
  const refresh = () => restaurants.refetch();

  function openDetail(restaurant: Restaurant) {
    setSelected(restaurant);
    router.push({ pathname: '/restaurant', params: { name: restaurant.name } });
  }

  function chooseRandom() {
    // From what the list shows (search and filters apply), open ones only.
    const choice = pickRandomOpen(filtered, now);
    if (!choice) {
      Alert.alert('目前沒有營業中的餐廳', '調整篩選條件後再試一次。');
      return;
    }
    openDetail(choice);
  }

  function toggleFilter(key: string) {
    if (key === 'open') setOpenOnly((on) => !on);
    else if (key === 'favorites') setFavoritesOnly((on) => !on);
  }

  function clearFilters() {
    setOpenOnly(false);
    setFavoritesOnly(false);
  }

  const header: HeaderItem[] = [];
  if (MAP_AVAILABLE) {
    header.push({
      kind: 'icon',
      key: 'view',
      label: view === 'map' ? '顯示列表' : '顯示地圖',
      icon: view === 'map' ? icons.list : icons.map,
      onPress: () => setView((current) => (current === 'map' ? 'list' : 'map')),
    });
  }
  header.push({
    kind: 'icon',
    key: 'random',
    label: '隨機選擇營業中的餐廳',
    icon: icons.shuffle,
    disabled: !filtered.length,
    onPress: chooseRandom,
  });
  // One filter control per platform: an iOS menu with checkmarks, and on
  // Android the Material filter chips at the top of the list (a second copy
  // in the top app bar's menu would only repeat them).
  if (!ANDROID) {
    header.push({
      kind: 'menu',
      key: 'filter',
      label: filtering ? '篩選（已套用）' : '篩選',
      icon: filtering ? icons.filterActive : icons.filter,
      actions: [
        { key: 'open', label: FILTER_LABELS.open, selected: openOnly, onPress: () => toggleFilter('open') },
        {
          key: 'favorites',
          label: FILTER_LABELS.favorites,
          selected: favoritesOnly,
          onPress: () => toggleFilter('favorites'),
        },
      ],
    });
  }

  let listSection: ReactElement;
  if (data && filtered.length > 0) {
    listSection = (
      <Section title={`${filtered.length} 間餐廳`}>
        {filtered.map((restaurant) => {
          const summary = summarize(restaurant, now);
          const favorite = favorites.includes(restaurant.name);
          return (
            <Row
              key={restaurant.name}
              title={restaurant.name}
              subtitle={summary.subtitle}
              dotColor={summary.color}
              accessory="chevron"
              accessibilityLabel={[restaurant.name, favorite ? FILTER_LABELS.favorites : null, summary.subtitle]
                .filter(Boolean)
                .join('，')}
              toggle={{
                label: favorite ? '移除最愛' : '加入最愛',
                icon: icons.favorite,
                activeIcon: icons.favoriteFilled,
                active: favorite,
                onPress: () => toggleFavorite(restaurant.name),
              }}
              onPress={() => openDetail(restaurant)}
            />
          );
        })}
      </Section>
    );
  } else if (data) {
    listSection = (
      <Section plain>
        <EmptyState
          icon={icons.forkKnife}
          title="沒有符合條件的餐廳。"
          description="試試其他關鍵字，或關閉篩選條件。"
          // The search text lives in the native search bar; the filters are
          // the part that is easy to forget when they sit in a menu.
          action={filtering ? { label: '關閉篩選條件', onPress: clearFilters } : undefined}
        />
      </Section>
    );
  } else if (restaurants.isError) {
    listSection = (
      <Section plain>
        <EmptyState
          icon={icons.offline}
          title="無法讀取餐廳資料"
          description="請檢查網路後再試一次。"
          action={{ label: '重新讀取', onPress: () => void refresh() }}
        />
      </Section>
    );
  } else {
    listSection = (
      <Section>
        <Loading label="正在讀取餐廳資料…" />
      </Section>
    );
  }

  return (
    <>
      <Stack.SearchBar
        placeholder="搜尋餐廳"
        // The SwiftUI list inside the Host does not drive UIKit's
        // hide-on-scroll, which could leave the bar unreachable.
        hideWhenScrolling={false}
        // Results filter as you type, so keep them visible and tappable.
        obscureBackground={false}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        // iOS clears the field on 取消 without a change event; Android
        // clears it when the search view collapses.
        onCancelButtonPress={() => setQuery('')}
        onClose={() => setQuery('')}
        // Android's search view takes the top app bar's colours, like the
        // HeaderActions icons beside it (iOS draws system colours itself).
        {...(ANDROID
          ? { textColor: palette.text, hintTextColor: palette.textSecondary, headerIconColor: palette.textSecondary }
          : null)}
      />
      <HeaderActions right={header} />
      <ListScreen onRefresh={refresh}>
        {/* Cached restaurants stay on screen when a refresh fails. */}
        {data && restaurants.isError ? (
          <Section>
            <Notice
              tone="error"
              title="無法更新餐廳資料"
              message="先顯示上次儲存的內容。"
              action={{ label: '重新讀取', onPress: () => void refresh() }}
            />
          </Section>
        ) : null}

        {ANDROID ? (
          <Section plain>
            <FilterChips
              options={[
                { key: 'open', label: FILTER_LABELS.open, selected: openOnly },
                { key: 'favorites', label: FILTER_LABELS.favorites, selected: favoritesOnly },
              ]}
              onToggle={toggleFilter}
            />
          </Section>
        ) : null}

        {view === 'map' ? (
          <Section footer={STATUS_LEGEND}>
            <Embedded height={Math.max(MIN_MAP_HEIGHT, Math.round(windowHeight * MAP_HEIGHT_RATIO))}>
              <RestaurantMap restaurants={filtered} selected={selected} now={now} onSelect={openDetail} />
            </Embedded>
          </Section>
        ) : null}

        {listSection}
      </ListScreen>
    </>
  );
}
