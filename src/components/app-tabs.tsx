import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { TABS } from '@/features/registry';
import { usePalette } from '@/theme/palette';

export default function AppTabs() {
  const palette = usePalette();
  return (
    <NativeTabs
      tintColor={palette.tint as string} backgroundColor={palette.background}
      indicatorColor={palette.tintContainer as string} disableTransparentOnScrollEdge
      // Android's bar labels only the selected tab when there are more than three.
      labelVisibilityMode="labeled">
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
