import { Tabs } from 'expo-router';

import { FEATURES } from '@/features/registry';
import { useSettingsStore } from '@/store/settings';
import { usePalette } from '@/theme/palette';

export default function AppTabs() {
  const toolbar = useSettingsStore((state) => state.toolbar);
  const palette = usePalette();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.tint as string }}>
    <Tabs.Screen name="home" options={{ title: '首頁' }} />
    {toolbar.map((item) => <Tabs.Screen key={item.id} name={item.id}
      options={{ title: FEATURES[item.id].tabLabel, href: item.visible ? undefined : null }} />)}
  </Tabs>;
}
