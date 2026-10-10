import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/navigation/stack-options';

// 設定 is a sheet over 今天, opened from its header. It has its own stack so
// 關於 pushes inside the sheet instead of under it.
export default function SettingsLayout() {
  const options = useStackScreenOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: '設定' }} />
      <Stack.Screen name="about" options={{ title: '關於 CK APP' }} />
    </Stack>
  );
}
