import { Host, Picker } from '@expo/ui';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { ActionButton, Body, Card, Screen, Title, Toggle } from '@/components/ui/page';
import { FEATURES, MAX_FEATURE_TABS } from '@/features/registry';
import { useTimetables } from '@/features/schedule/use-timetables';
import { useConfirmedPicker } from '@/hooks/use-confirmed-picker';
import { queryClient } from '@/lib/query-client';
import { useFoodStore } from '@/store/food';
import { useNewsStore } from '@/store/news';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore, visibleTabs } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import { useTransportStore } from '@/store/transport';
import { BRAND } from '@/theme/palette';

export default function SettingsScreen() {
  const settings = useSettingsStore();
  const timetable = useTimetables();
  const userClass = useScheduleStore((state) => state.userClass);
  const count = visibleTabs(settings.toolbar).length;
  const classPicker = useConfirmedPicker();
  function changeClass(id: string) {
    if (id === userClass) return;
    const rows = timetable.data?.byClass[id];
    // The native picker has already moved to `id`; put it back.
    if (!rows) { classPicker.resync(); return; }
    classPicker.confirm(`更改為 ${id} 班？`, '更改班級會取代自訂科目、備註及顏色。',
      { text: '更改', onPress: () => useScheduleStore.getState().setClass(id, rows) });
  }
  function clearData() {
    Alert.alert('重設個人資料與設定？', '自訂課表、活動、待辦、釘選、收藏、追蹤車站及設定會刪除，無法復原。', [
      { text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: () => {
        void queryClient.cancelQueries();
        useScheduleStore.getState().reset(); useTodoStore.getState().reset(); useNewsStore.getState().reset();
        useFoodStore.getState().reset(); useTransportStore.getState().reset(); useSettingsStore.getState().reset();
        queryClient.clear();
        router.dismissAll(); router.replace('/');
      } },
    ]);
  }
  return <Screen>
    <Card><Title>我的班級</Title><Body secondary>班級用於匯入課表。</Body>
      {timetable.data ? <Host key={classPicker.pickerKey} matchContents={{ vertical: true }} seedColor={BRAND}>
        <Picker selectedValue={userClass} onValueChange={changeClass}>
          {Array.from(new Set([userClass, ...timetable.data.classIds])).sort().map((id) => <Picker.Item key={id} label={`${id} 班`} value={id} />)}
        </Picker>
      </Host> : <><Body>{timetable.isError ? '無法載入班級列表。' : '正在載入班級…'}</Body>
        <ActionButton label="重新載入" onPress={() => { void timetable.refetch(); }} /></>}
    </Card>
    <Card><Title>首頁顯示項目</Title>
      <Toggle label="目前課程" value={settings.homeWidgets.schedule} onChange={(value) => settings.setHomeWidget('schedule', value)} />
      <Toggle label="今日待辦事項" value={settings.homeWidgets.todo} onChange={(value) => settings.setHomeWidget('todo', value)} />
      <Toggle label="釘選校網內容" value={settings.homeWidgets.news} onChange={(value) => settings.setHomeWidget('news', value)} />
    </Card>
    <Card><Title>自訂工具列</Title><Body secondary>除了首頁，最多顯示 {MAX_FEATURE_TABS} 個功能。其他功能可由首頁開啟。</Body>
      {settings.toolbar.map((item, index) => <View key={item.id} style={{ gap: 8 }}>
        <Toggle label={FEATURES[item.id].title} value={item.visible} disabled={!item.visible && count >= MAX_FEATURE_TABS}
          onChange={(value) => settings.setToolbarVisible(item.id, value)} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton label={`上移 ${FEATURES[item.id].tabLabel}`} disabled={index === 0} onPress={() => settings.moveToolbarItem(index, index - 1)} />
          <ActionButton label={`下移 ${FEATURES[item.id].tabLabel}`} disabled={index === settings.toolbar.length - 1} onPress={() => settings.moveToolbarItem(index, index + 1)} />
        </View>
      </View>)}
    </Card>
    <Card><Title>個人資料</Title><Body secondary>重設個人資料與設定。下載的校務資料及網站登入狀態會保留。</Body><ActionButton label="重設個人資料與設定" destructive onPress={clearData} /></Card>
  </Screen>;
}
