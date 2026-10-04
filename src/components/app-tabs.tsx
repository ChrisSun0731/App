import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { FEATURES } from '@/features/registry';
import { useSettingsStore } from '@/store/settings';
import { usePalette } from '@/theme/palette';

export default function AppTabs() {
  const toolbar = useSettingsStore((state) => state.toolbar);
  const palette = usePalette();
  return (
    <NativeTabs key={toolbar.map((item) => `${item.id}:${item.visible}`).join(',')}
      tintColor={palette.tint as string} backgroundColor={palette.background}
      indicatorColor={palette.tintContainer as string} disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>首頁</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      {toolbar.map((item) => (
        <NativeTabs.Trigger key={item.id} name={item.id} hidden={!item.visible}>
          <NativeTabs.Trigger.Label>{FEATURES[item.id].tabLabel}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={FEATURES[item.id].sf} md={FEATURES[item.id].md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
