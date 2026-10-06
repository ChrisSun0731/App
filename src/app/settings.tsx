import { router } from 'expo-router';
import { Alert } from 'react-native';

import { icons } from '@/components/icons';
import { FEATURES, MAX_FEATURE_TABS } from '@/features/registry';
import { useTimetables } from '@/features/schedule/use-timetables';
import { confirmPickerChange } from '@/hooks/use-confirmed-picker';
import { queryClient } from '@/lib/query-client';
import { useFoodStore } from '@/store/food';
import { useNewsStore } from '@/store/news';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore, visibleTabs, type HomeWidgets } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import { useTransportStore } from '@/store/transport';
import {
  ButtonRow,
  ListScreen,
  Loading,
  Notice,
  PickerRow,
  Section,
  ToggleRow,
  type RowAction,
} from '@/ui';

const HOME_WIDGETS: readonly { key: keyof HomeWidgets; label: string }[] = [
  { key: 'schedule', label: '目前課程' },
  { key: 'todo', label: '今日待辦事項' },
  { key: 'news', label: '釘選校網內容' },
];

// iOS keeps 上移/下移 in each row's long-press menu, which nothing on screen
// reveals; Android shows an overflow button on every row.
const TOOLBAR_FOOTER = `除了首頁，最多顯示 ${MAX_FEATURE_TABS} 個功能。其他功能可由首頁開啟。${
  process.env.EXPO_OS === 'ios' ? '長按功能可調整順序。' : ''
}`;

export default function SettingsScreen() {
  const settings = useSettingsStore();
  const timetable = useTimetables();
  const userClass = useScheduleStore((state) => state.userClass);
  const shownTabs = visibleTabs(settings.toolbar).length;

  const classOptions = timetable.data
    ? Array.from(new Set([userClass, ...timetable.data.classIds])).sort().map((id) => ({ label: `${id} 班`, value: id }))
    : null;

  function changeClass(id: string) {
    if (id === userClass) return;
    const rows = timetable.data?.byClass[id];
    // Nothing to switch to. PickerRow always shows `value`, so leaving
    // userClass alone puts the picker back on it.
    if (!rows) return;
    confirmPickerChange(
      `更改為 ${id} 班？`,
      '更改班級會取代自訂科目、備註及顏色。',
      { text: '更改', onPress: () => useScheduleStore.getState().setClass(id, rows) },
      // Declined: userClass is unchanged and PickerRow snaps back to it.
      () => {},
    );
  }

  function reloadClasses() {
    void timetable.refetch();
  }

  // The labels name the feature, as the old buttons did: TalkBack reads only
  // the item text, and every row's overflow button sounds the same.
  function moveActions(index: number): RowAction[] {
    const { tabLabel } = FEATURES[settings.toolbar[index].id];
    const actions: RowAction[] = [];
    if (index > 0) {
      actions.push({
        key: 'up',
        label: `上移 ${tabLabel}`,
        icon: icons.moveUp,
        onPress: () => settings.moveToolbarItem(index, index - 1),
      });
    }
    if (index < settings.toolbar.length - 1) {
      actions.push({
        key: 'down',
        label: `下移 ${tabLabel}`,
        icon: icons.moveDown,
        onPress: () => settings.moveToolbarItem(index, index + 1),
      });
    }
    return actions;
  }

  // Pull to refresh retries a class list that failed or went stale. It is
  // passed from the first render: the iOS kit rebuilds the List when
  // `refreshable` first appears.
  return (
    <ListScreen onRefresh={() => timetable.refetch()}>
      <Section title="我的班級" footer="班級用於匯入課表。">
        {classOptions ? (
          <PickerRow label="班級" value={userClass} options={classOptions} onChange={changeClass} />
        ) : timetable.isError ? (
          <Notice tone="error" title="無法載入班級列表。" action={{ label: '重新載入', onPress: reloadClasses }} />
        ) : (
          <>
            <Loading label="正在載入班級…" />
            {/* A paused (offline) load would otherwise spin with no way to retry. */}
            <ButtonRow label="重新載入" onPress={reloadClasses} />
          </>
        )}
      </Section>

      <Section title="首頁顯示項目">
        {HOME_WIDGETS.map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            value={settings.homeWidgets[key]}
            onValueChange={(value) => settings.setHomeWidget(key, value)}
          />
        ))}
      </Section>

      <Section title="自訂工具列" footer={TOOLBAR_FOOTER}>
        {settings.toolbar.map((item, index) => (
          <ToggleRow
            key={item.id}
            label={FEATURES[item.id].title}
            value={item.visible}
            // Greyed out at the limit rather than refused with an alert: a
            // refused SwiftUI Toggle can stay drawn on (ToggleView only redraws
            // when its private @State changes). The store enforces the limit
            // too. The kit drops a disabled row's 上移/下移 for now; the order
            // of hidden features does not change the tab bar.
            disabled={!item.visible && shownTabs >= MAX_FEATURE_TABS}
            onValueChange={(visible) => settings.setToolbarVisible(item.id, visible)}
            actions={moveActions(index)}
          />
        ))}
      </Section>

      <Section title="個人資料" footer="重設個人資料與設定。下載的校務資料及網站登入狀態會保留。">
        <ButtonRow label="重設個人資料與設定" role="destructive" onPress={confirmReset} />
      </Section>
    </ListScreen>
  );
}

function confirmReset() {
  Alert.alert('重設個人資料與設定？', '自訂課表、活動、待辦、釘選、收藏、追蹤車站及設定會刪除，無法復原。', [
    { text: '取消', style: 'cancel' },
    { text: '清除', style: 'destructive', onPress: resetEverything },
  ]);
}

/**
 * Puts every store back to its initial state. The six resets run together in
 * one task on purpose: that is how the legacy import
 * (features/legacy-import/session.ts) recognises "start over" and gives up an
 * import still owed, so the previous app's data cannot arrive afterwards.
 */
function resetEverything() {
  void queryClient.cancelQueries();
  useScheduleStore.getState().reset();
  useTodoStore.getState().reset();
  useNewsStore.getState().reset();
  useFoodStore.getState().reset();
  useTransportStore.getState().reset();
  useSettingsStore.getState().reset();
  queryClient.clear();
  router.dismissAll();
  router.replace('/');
}
