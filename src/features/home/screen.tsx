// 首頁: today at a glance (date, class, the current or next period), every
// feature as a tile, and the widgets chosen in 設定 (目前課程, 今日待辦事項,
// 釘選校網內容). Layout per docs/design/native-ui.md, "首頁 (Home)".
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { FEATURES, HOME_GRID_ORDER, type FeatureId } from '@/features/registry';
import { useTimetables } from '@/features/schedule/use-timetables';
import { openWebsite } from '@/lib/open-link';
import { openFeature } from '@/navigation/feature-link';
import { useNewsStore } from '@/store/news';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import {
  ButtonRow,
  CheckRow,
  ListScreen,
  Loading,
  Notice,
  Row,
  Section,
  TextBlock,
  TileGrid,
  type IconValue,
} from '@/ui';

import {
  formatPeriodOverline,
  formatPeriodTitle,
  formatPinnedDate,
  formatTodayTitle,
  getTodayPeriod,
  todosDueOn,
} from './today';
import { useNow } from './use-now';
import { useTimetableAutofill } from './use-timetable-autofill';

const FEATURE_ICONS: Record<FeatureId, IconValue> = {
  promo: icons.store,
  souvenir: icons.bag,
  todo: icons.calendar,
  transport: icons.walk,
  menu: icons.forkKnife,
  food: icons.takeout,
  news: icons.newspaper,
  schedule: icons.book,
  help: icons.help,
};

// Static, so the grid's props stay the same object across the clock's re-renders.
const FEATURE_TILES = HOME_GRID_ORDER.map((id) => ({
  key: id,
  title: FEATURES[id].title,
  icon: FEATURE_ICONS[id],
  onPress: () => openFeature(id),
}));

/** Minute-resolution UI; the clock only ticks while 首頁 is focused. */
const CLOCK_INTERVAL_MS = 30_000;

export default function HomeScreen() {
  const now = useNow(CLOCK_INTERVAL_MS);
  const widgets = useSettingsStore((state) => state.homeWidgets);
  const timetable = useTimetables();
  const userClass = useScheduleStore((state) => state.userClass);
  const rows = useScheduleStore((state) => state.rows);
  const todos = useTodoStore((state) => state.todos);
  const completeTodo = useTodoStore((state) => state.completeTodo);
  const pinned = useNewsStore((state) => state.pinned);

  useTimetableAutofill(timetable.data?.byClass);

  const todayTodos = todosDueOn(todos, now);
  const period = timetable.data
    ? getTodayPeriod(timetable.data.periods, rows, now, timetable.data.semesterStart)
    : null;

  // The 目前課程 widget's row. The bell times come with the class timetables,
  // so until those load there is no way to tell which period it is.
  let periodRow: ReactElement;
  if (period) {
    periodRow = (
      <Row
        title={formatPeriodTitle(period)}
        overline={formatPeriodOverline(period.period)}
        subtitle={period.note || undefined}
        badge={period.status === 'current' ? '目前' : '下一節'}
        emphasized={period.status === 'current'}
        accessory="chevron"
        onPress={() => openFeature('schedule')}
      />
    );
  } else if (!timetable.data && timetable.isError) {
    periodRow = (
      <Notice
        tone="error"
        title="課表目前無法載入"
        message="請連線後重試。"
        action={{ label: '重試', onPress: () => void timetable.refetch() }}
      />
    );
  } else if (!timetable.data) {
    periodRow = <Loading label="正在載入課表…" />;
  } else {
    periodRow = <Row title="目前沒有上課" accessory="chevron" onPress={() => openFeature('schedule')} />;
  }

  return (
    <>
      <HeaderActions
        right={[
          { kind: 'icon', key: 'settings', label: '設定', icon: icons.settings, onPress: () => router.push('/settings') },
          { kind: 'icon', key: 'about', label: '關於', icon: icons.info, onPress: () => router.push('/about') },
        ]}
      />
      {/*
        Pull to refresh reloads the bell times and class timetables (the only
        remote data here). onRefresh from the first render: the iOS List is
        rebuilt if it appears later.
      */}
      <ListScreen onRefresh={() => timetable.refetch()}>
        <Section title="今天">
          <Row title={formatTodayTitle(now)} subtitle={`${userClass} 班`} />
          {widgets.schedule ? periodRow : null}
        </Section>

        <Section title="功能">
          <TileGrid tiles={FEATURE_TILES} />
        </Section>

        {widgets.todo ? (
          <Section title="今日待辦事項">
            {todayTodos.length > 0 ? (
              todayTodos.map((todo) => (
                // Checking a todo completes it, which removes it (as on 行事曆).
                <CheckRow
                  key={todo.id}
                  title={todo.title}
                  subtitle={todo.category?.name}
                  checked={false}
                  onCheckedChange={(checked) => {
                    if (checked) completeTodo(todo.id);
                  }}
                  onPress={() => router.push({ pathname: '/todo-editor', params: { id: todo.id } })}
                />
              ))
            ) : (
              <TextBlock text="今天沒有待辦事項" secondary />
            )}
            <ButtonRow label="查看行事曆" icon={icons.calendar} onPress={() => openFeature('todo')} />
          </Section>
        ) : null}

        {widgets.news ? (
          <Section title="釘選校網內容">
            {pinned.length > 0 ? (
              pinned.map((item) => (
                <Row
                  key={item.title}
                  title={item.title}
                  titleLines={3}
                  subtitle={formatPinnedDate(item.pubDate)}
                  accessory="external"
                  onPress={() => void openWebsite(item.link)}
                />
              ))
            ) : (
              <TextBlock text="尚無釘選內容" secondary />
            )}
            <ButtonRow label="查看校網" icon={icons.newspaper} onPress={() => openFeature('news')} />
          </Section>
        ) : null}
      </ListScreen>
    </>
  );
}
