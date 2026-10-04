import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { ActionButton, Body, Card, Screen, Segment, Title } from '@/components/ui/page';
import { addDays, formatFullDate, formatMonthDay, fromDateKey, toDateKey } from '@/lib/dates';

import { defaultMenuDay, MENU_DAYS, menuImageUrl, menuWeekStart, type MenuDay } from './menu-week';

export default function MenuScreen() {
  const [week, setWeek] = useState(() => menuWeekStart(new Date()));
  const [day, setDay] = useState<MenuDay>(() => defaultMenuDay(new Date()));
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [imageRatio, setImageRatio] = useState(0.7);
  const url = menuImageUrl(week, day);
  const requestUrl = revision ? `${url}?refresh=${revision}` : url;
  const monday = fromDateKey(week);
  const selectedDate = addDays(monday, day - 1);

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setFailed(true);
      setLoading(false);
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [loading, week, day, revision]);

  const refresh = () => {
    setFailed(false);
    setLoading(true);
    setRevision(Date.now());
  };
  const chooseDay = (index: number) => {
    if (index + 1 === day) return;
    setLoading(true);
    setFailed(false);
    setDay((index + 1) as MenuDay);
  };
  const chooseWeek = (nextWeek: string) => {
    if (nextWeek === week) return;
    setLoading(true);
    setFailed(false);
    setWeek(nextWeek);
  };
  const today = () => {
    const current = new Date();
    chooseWeek(menuWeekStart(current));
    chooseDay(defaultMenuDay(current) - 1);
  };

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <Title>熱食部菜單</Title>
      <Body secondary>{formatMonthDay(monday)} — {formatMonthDay(addDays(monday, 4))}</Body>
      <Card>
        <View style={styles.actions}>
          <ActionButton label="上一週" onPress={() => chooseWeek(toDateKey(addDays(monday, -7)))} />
          <ActionButton label="本週" onPress={today} />
          <ActionButton label="下一週" onPress={() => chooseWeek(toDateKey(addDays(monday, 7)))} />
        </View>
        <Segment options={MENU_DAYS.map((item) => item.label.slice(-1))} selectedIndex={day - 1} onChange={chooseDay} />
      </Card>
      <Title>{formatFullDate(selectedDate)} {MENU_DAYS[day - 1].label}</Title>
      {loading && <Body secondary>正在讀取菜單…</Body>}
      {failed ? (
        <Card>
          <Body>這一天的菜單尚未公布，或目前無法讀取。</Body>
          <Body secondary>可以切換其他日期，或重新整理再試一次。</Body>
          <ActionButton label="重新讀取菜單" onPress={refresh} />
        </Card>
      ) : (
        <Image
          key={`${week}-${day}-${revision}`}
          source={{ uri: requestUrl }}
          style={[styles.image, { aspectRatio: imageRatio }]}
          contentFit="contain"
          cachePolicy="disk"
          accessibilityLabel={`${formatFullDate(selectedDate)}熱食部菜單`}
          onLoad={(event) => {
            const ratio = event.source.width / event.source.height;
            setImageRatio(Number.isFinite(ratio) && ratio > 0 ? ratio : 0.7);
            setLoading(false);
          }}
          onError={() => { setFailed(true); setLoading(false); }}
        />
      )}
      <ActionButton label="在瀏覽器開啟菜單" onPress={() => {
        void Linking.openURL(requestUrl).catch(() => Alert.alert('無法開啟菜單', '請稍後再試一次。'));
      }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  image: { width: '100%', borderRadius: 12 },
});
