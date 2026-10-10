import { Tabs } from 'expo-router';

import { TABS } from '@/features/registry';
import { usePalette } from '@/theme/palette';

export default function AppTabs() {
  const palette = usePalette();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.tint as string }}>
    {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />)}
  </Tabs>;
}
