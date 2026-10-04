import { Button, Column, Host, Icon, Text as NativeText } from '@expo/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { ActionButton, Body, Card, Screen, Title, Toggle } from '@/components/ui/page';
import { FEATURES, HOME_GRID_ORDER, type FeatureId } from '@/features/registry';
import { getCurrentPeriod, getWeekParity, subjectFor, WEEKDAYS } from '@/features/schedule/timetable';
import { useTimetables } from '@/features/schedule/use-timetables';
import { formatFullDate, toDateKey } from '@/lib/dates';
import { openWebsite } from '@/lib/open-link';
import { openFeature } from '@/navigation/feature-link';
import { useNewsStore } from '@/store/news';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import { BRAND } from '@/theme/palette';

const FEATURE_ICONS: Record<FeatureId, typeof icons.home> = {
  promo: icons.store, souvenir: icons.bag, todo: icons.calendar, transport: icons.walk,
  menu: icons.forkKnife, food: icons.takeout, news: icons.newspaper, schedule: icons.book, help: icons.help,
};

export default function HomeScreen() {
  const [now, setNow] = useState(new Date());
  const widgets = useSettingsStore((state) => state.homeWidgets);
  const timetable = useTimetables();
  const schedule = useScheduleStore();
  const { rows, userClass, resetRows } = schedule;
  const todos = useTodoStore((state) => state.todos);
  const completeTodo = useTodoStore((state) => state.completeTodo);
  const pinned = useNewsStore((state) => state.pinned);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (rows.length === 0 && timetable.data?.byClass[userClass]) {
      resetRows(timetable.data.byClass[userClass]);
    }
  }, [rows.length, userClass, resetRows, timetable.data]);
  const period = now.getDay() >= 1 && now.getDay() <= 5 && timetable.data
    ? getCurrentPeriod(timetable.data.periods, now) : null;
  const current = period ? schedule.rows.find((row) => row.name === period)?.[WEEKDAYS[now.getDay() - 1]] : undefined;
  const todayTodos = todos.filter((todo) => todo.date === toDateKey(now));
  return <>
    <HeaderActions right={[
      { kind: 'icon', key: 'settings', label: '設定', icon: icons.settings, onPress: () => router.push('/settings') },
      { kind: 'icon', key: 'about', label: '關於', icon: icons.info, onPress: () => router.push('/about') },
    ]} />
    <Screen>
      <Card><Title>你的建中日常</Title><Body secondary>{formatFullDate(now)} · {schedule.userClass} 班</Body></Card>
      <View style={styles.grid}>
        {HOME_GRID_ORDER.map((id) => <View key={id} style={styles.tile}>
          <Host matchContents={{ vertical: true }} seedColor={BRAND}>
            <Button variant="outlined" onPress={() => openFeature(id)} style={{ paddingVertical: 16, borderRadius: 16 }}>
              <Column alignment="center" spacing={8}>
                <Icon name={FEATURE_ICONS[id]} size={28} />
                <NativeText textStyle={{ fontSize: 15, textAlign: 'center' }}>{FEATURES[id].title}</NativeText>
              </Column>
            </Button>
          </Host>
        </View>)}
      </View>
      {widgets.schedule ? <Card>
        <Title>目前課程</Title>
        <Body>{current ? subjectFor(current, getWeekParity(timetable.data?.semesterStart ?? null, now)) || '本節沒有課程' : timetable.isPending && !schedule.rows.length ? '正在載入課表…' : timetable.isError && !schedule.rows.length ? '課表目前無法載入，請連線後重試。' : '目前沒有上課'}</Body>
        {current?.note ? <Body secondary>{current.note}</Body> : null}
        <ActionButton label="查看課表" onPress={() => openFeature('schedule')} />
      </Card> : null}
      {widgets.todo ? <Card>
        <Title>今日待辦事項</Title>
        {todayTodos.length ? todayTodos.map((todo) => <Toggle key={todo.id} label={todo.title} value={false}
          onChange={(value) => { if (value) completeTodo(todo.id); }} />) : <Body secondary>今天沒有待辦事項</Body>}
        <ActionButton label="查看行事曆" onPress={() => openFeature('todo')} />
      </Card> : null}
      {widgets.news ? <Card>
        <Title>釘選校網內容</Title>
        {pinned.length ? pinned.map((item) => <View key={item.title} style={{ gap: 8 }}>
          <Body>{item.title}</Body><ActionButton label="閱讀公告" onPress={() => { void openWebsite(item.link); }} />
        </View>) : <Body secondary>尚無釘選內容</Body>}
        <ActionButton label="查看校網" onPress={() => openFeature('news')} />
      </Card> : null}
    </Screen>
  </>;
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '30%', flexGrow: 1, minWidth: 96 } });
