import { BottomSheet, RNHostView } from '@expo/ui';
import Constants from 'expo-constants';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton, Body, Card, Field, Screen, Segment, Title, Toggle } from '@/components/ui/page';
import { useFoodStore } from '@/store/food';
import { usePalette } from '@/theme/palette';

import {
  DAY_LABELS, DISPLAY_DAY_ORDER, dayKeyOf, getOpenStatus, hoursLines, isOpenNow,
  STATUS_LABELS, type Restaurant,
} from './opening-hours';
import RestaurantMap from './restaurant-map';
import { useRestaurants } from './use-restaurants';

export default function FoodScreen() {
  const palette = usePalette();
  const restaurants = useRestaurants();
  const favorites = useFoodStore((state) => state.favorites);
  const toggleFavorite = useFoodStore((state) => state.toggleFavorite);
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [view, setView] = useState(() => Platform.OS === 'ios' ||
    (Platform.OS === 'android' && Constants.expoConfig?.extra?.googleMapsConfigured === true) ? 0 : 1);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [now, setNow] = useState(() => new Date());
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return;
    const frame = requestAnimationFrame(() => setNow(new Date()));
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') setNow(new Date());
    }, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => { cancelAnimationFrame(frame); clearInterval(timer); subscription.remove(); };
  }, [focused]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (restaurants.data ?? []).filter((restaurant) =>
      (!query || restaurant.name.toLocaleLowerCase().includes(query)) &&
      (!openOnly || isOpenNow(restaurant.openingHours, now)) &&
      (!favoritesOnly || favorites.includes(restaurant.name)),
    );
  }, [restaurants.data, search, openOnly, favoritesOnly, favorites, now]);

  const chooseRestaurant = () => {
    const open = filtered.filter((restaurant) => isOpenNow(restaurant.openingHours, now));
    if (!open.length) {
      Alert.alert('目前沒有營業中的餐廳', '調整篩選條件後再試一次。');
      return;
    }
    setSelected(open[Math.floor(Math.random() * open.length)]);
  };

  return (
    <>
      <Screen refreshing={restaurants.isFetching} onRefresh={() => { void restaurants.refetch(); }}>
        <Title>美食</Title>
        <Body secondary>查看建中附近餐廳，找到今天想吃的料理。</Body>
        <Card>
          <Field label="搜尋餐廳" value={search} onChangeText={setSearch} />
          <Toggle label="正在營業" value={openOnly} onChange={setOpenOnly} />
          <Toggle label="我的最愛" value={favoritesOnly} onChange={setFavoritesOnly} />
          <Segment options={['地圖', '列表']} selectedIndex={view} onChange={setView} />
          <ActionButton label="隨機選擇營業中的餐廳" onPress={chooseRestaurant} disabled={!filtered.length} />
        </Card>
        {restaurants.isPending && <Body secondary>正在讀取餐廳資料…</Body>}
        {restaurants.isError && (
          <Card>
            <Body>{restaurants.data ? '無法更新餐廳資料，先顯示上次儲存的內容。' : '無法讀取餐廳資料，請檢查網路後再試一次。'}</Body>
            <ActionButton label="重新讀取" onPress={() => { void restaurants.refetch(); }} />
          </Card>
        )}
        {view === 0 && <RestaurantMap restaurants={filtered} selected={selected} now={now} onSelect={setSelected} />}
        {view === 0 && <Body secondary>綠色：營業中　橘色：即將打烊　藍色：即將開業　灰色：已打烊</Body>}
        <Body secondary>{filtered.length} 間餐廳</Body>
        {!restaurants.isPending && !filtered.length && (
          <Card><Body>沒有符合條件的餐廳。</Body><Body secondary>試試其他關鍵字，或關閉篩選條件。</Body></Card>
        )}
        {view === 1 && filtered.map((restaurant) => (
          <Card key={restaurant.name}>
            <Title>{restaurant.name}</Title>
            <Body>{STATUS_LABELS[getOpenStatus(restaurant.openingHours, now)]}</Body>
            <Body secondary>今日營業：{hoursLines(restaurant.openingHours[dayKeyOf(now)]).join('、')}</Body>
            <View style={styles.actions}>
              <ActionButton label="詳細資訊" onPress={() => setSelected(restaurant)} />
              <ActionButton label={favorites.includes(restaurant.name) ? '移除最愛' : '加入最愛'} onPress={() => toggleFavorite(restaurant.name)} />
            </View>
          </Card>
        ))}
      </Screen>
      <BottomSheet isPresented={selected !== null} onDismiss={() => setSelected(null)} snapPoints={['full']} containerColor={palette.surface}>
        <RNHostView>
          <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
          {selected && (
            <>
              <Title>{selected.name}</Title>
              <Body>{STATUS_LABELS[getOpenStatus(selected.openingHours, now)]}</Body>
              <Body secondary>{typeof selected.address === 'string' ? selected.address : `位置：${selected.position[0]}, ${selected.position[1]}`}</Body>
              <ActionButton label={favorites.includes(selected.name) ? '移除最愛' : '加入最愛'} onPress={() => toggleFavorite(selected.name)} />
              <ActionButton label="在地圖開啟位置" onPress={() => {
                const [latitude, longitude] = selected.position;
                void openLink(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
              }} />
              {typeof selected.website === 'string' && /^https?:\/\//i.test(selected.website) && (
                <ActionButton label="餐廳網站" onPress={() => { void openLink(selected.website!); }} />
              )}
              <Title>營業時間</Title>
              {DISPLAY_DAY_ORDER.map((day) => (
                <View key={day} style={[styles.hours, day === dayKeyOf(now) && { backgroundColor: palette.tintContainer }]}>
                  <Body>{DAY_LABELS[day]}{day === dayKeyOf(now) ? '（今天）' : ''}</Body>
                  <Body>{hoursLines(selected.openingHours[day]).join('\n')}</Body>
                </View>
              ))}
              <ActionButton label="關閉" onPress={() => setSelected(null)} />
            </>
          )}
          </ScrollView>
        </RNHostView>
      </BottomSheet>
    </>
  );
}

async function openLink(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('無法開啟連結', '請稍後再試一次。'); }
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  details: { flex: 1 },
  detailsContent: { gap: 12, paddingTop: 12, paddingBottom: 32 },
  hours: { gap: 4, padding: 12, borderRadius: 12 },
});
