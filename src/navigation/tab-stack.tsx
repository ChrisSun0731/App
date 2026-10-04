import { Stack } from 'expo-router';

import { useStackScreenOptions } from './stack-options';

export function TabStack({ title }: { title: string }) {
  const options = useStackScreenOptions();
  return <Stack screenOptions={options}><Stack.Screen name="index" options={{ title }} /></Stack>;
}
